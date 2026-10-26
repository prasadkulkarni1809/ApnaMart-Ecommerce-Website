const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();
const isLoggedIn = require("../middlewares/isLoggedin");
const isSeller = require("../middlewares/isSeller");
const productModel = require("../models/product-model");
const orderModel = require("../models/order-models");
const {
  ensureSellerFulfillments,
  getSellerFulfillment,
  syncAggregateOrderStatus,
} = require("../utils/orderFulfillment");

const sellerOrderQuery = (sellerId, extraFilter = {}) => orderModel
  .find({ "items.seller": sellerId, ...extraFilter })
  .populate("user", "fullname email")
  .populate("items.product", "name images price stock")
  .sort({ createdAt: -1 });

function serializeSellerOrder(order, sellerId) {
  const sellerIdString = String(sellerId);
  const items = order.items
    .filter((item) => String(item.seller?._id || item.seller) === sellerIdString)
    .map((item) => ({
      _id: item._id,
      product: item.product && typeof item.product === "object" ? {
        _id: item.product._id,
        name: item.product.name,
        images: item.product.images || [],
        price: item.product.price,
        stock: item.product.stock,
      } : null,
      name: item.name,
      image: item.image,
      quantity: item.quantity,
      price: item.price,
    }));
  const amount = items.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0);

  return {
    _id: order._id,
    createdAt: order.createdAt,
    status: order.status,
    sellerFulfillment: (() => {
      const fulfillment = getSellerFulfillment(order, sellerId);
      return {
        status: fulfillment.status,
        acceptedAt: fulfillment.acceptedAt || null,
        packedAt: fulfillment.packedAt || null,
        readyAt: fulfillment.readyAt || null,
        shippedAt: fulfillment.shippedAt || null,
        expectedDeliveryDate: fulfillment.expectedDeliveryDate || null,
        securePackingConfirmed: Boolean(fulfillment.securePackingConfirmed),
        shippingLabelAttached: Boolean(fulfillment.shippingLabelAttached),
        courierPartner: fulfillment.courierPartner || "",
        trackingNumber: fulfillment.trackingNumber || "",
      };
    })(),
    deliveryUpdate: order.deliveryUpdate,
    trackingNumber: order.trackingNumber,
    courierPartner: order.courierPartner,
    expectedDeliveryDate: order.expectedDeliveryDate,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    amount,
    address: order.address,
    city: order.city,
    pincode: order.pincode,
    phone: order.phone,
    user: order.user ? { _id: order.user._id, fullname: order.user.fullname, email: order.user.email } : null,
    items,
    exchangeRequested: Boolean(order.exchangeRequested),
    exchangeReason: order.exchangeReason || "",
    exchangeStatus: order.exchangeStatus || "NONE",
  };
}

router.get("/products", isLoggedIn, isSeller, async (req, res) => {
  try {
    const products = await productModel
      .find({ seller: req.seller._id })
      .populate("category", "name")
      .sort({ name: 1 });
    return res.json({ success: true, products });
  } catch (error) {
    console.error("SELLER PRODUCTS ERROR:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch your products" });
  }
});

router.get("/orders", isLoggedIn, isSeller, async (req, res) => {
  try {
    const orders = await sellerOrderQuery(req.seller._id);
    return res.json({ success: true, orders: orders.map((order) => serializeSellerOrder(order, req.seller._id)) });
  } catch (error) {
    console.error("SELLER ORDERS ERROR:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch your orders" });
  }
});

router.get("/ready-to-dispatch", isLoggedIn, isSeller, async (req, res) => {
  try {
    const orders = await sellerOrderQuery(req.seller._id);
    const readyOrders = orders
      .map((order) => serializeSellerOrder(order, req.seller._id))
      .filter((order) => order.sellerFulfillment.status === "READY_TO_DISPATCH");
    return res.json({ success: true, orders: readyOrders });
  } catch (error) {
    console.error("SELLER READY QUEUE ERROR:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch ready-to-dispatch orders" });
  }
});

router.put("/orders/:orderId/fulfillment", isLoggedIn, isSeller, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status: nextStatus } = req.body || {};
    if (!mongoose.isValidObjectId(orderId)) {
      return res.status(400).json({ success: false, message: "Invalid order reference" });
    }

    const transitions = {
      PLACED: "ACCEPTED",
      ACCEPTED: "PACKED",
      PACKED: "READY_TO_DISPATCH",
      READY_TO_DISPATCH: "SHIPPED",
    };
    const order = await orderModel.findOne({ _id: orderId, "items.seller": req.seller._id });
    if (!order) return res.status(404).json({ success: false, message: "Order not found for your products" });
    if (["CANCELLED", "REJECTED"].includes(order.status)) {
      return res.status(409).json({ success: false, message: `A ${order.status.toLowerCase()} order cannot be fulfilled` });
    }
    if (order.paymentMethod === "ONLINE" && order.paymentStatus !== "PAID") {
      return res.status(409).json({ success: false, message: "Online payment must be completed before fulfillment" });
    }

    ensureSellerFulfillments(order);
    const fulfillment = order.sellerFulfillments.find((entry) => String(entry.seller) === String(req.seller._id));
    if (!fulfillment) return res.status(404).json({ success: false, message: "Your fulfillment record was not found" });
    if (transitions[fulfillment.status] !== nextStatus) {
      return res.status(409).json({
        success: false,
        message: `Cannot move your items from ${fulfillment.status} to ${nextStatus || "that status"}. ${transitions[fulfillment.status] ? `Next status: ${transitions[fulfillment.status]}.` : "No further seller transition is available."}`,
      });
    }

    if (nextStatus === "READY_TO_DISPATCH" &&
      (req.body.securePackingConfirmed !== true || req.body.shippingLabelAttached !== true)) {
      return res.status(400).json({ success: false, message: "Confirm secure packing and that the shipping label is attached" });
    }
    if (nextStatus === "SHIPPED" && req.body.courierHandoverConfirmed !== true) {
      return res.status(400).json({ success: false, message: "Confirm the parcel has been handed to the courier before marking it shipped" });
    }

    const optionalText = (value, field) => {
      if (value === undefined || value === null || value === "") return "";
      if (typeof value !== "string" || value.trim().length > 100) throw new Error(`${field} must be 100 characters or fewer`);
      return value.trim();
    };
    fulfillment.status = nextStatus;
    const now = new Date();
    if (nextStatus === "ACCEPTED") fulfillment.acceptedAt = now;
    if (nextStatus === "PACKED") fulfillment.packedAt = now;
    if (nextStatus === "READY_TO_DISPATCH") {
      fulfillment.readyAt = now;
      fulfillment.securePackingConfirmed = true;
      fulfillment.shippingLabelAttached = true;
      fulfillment.courierPartner = optionalText(req.body.courierPartner, "Courier partner");
      fulfillment.trackingNumber = optionalText(req.body.trackingNumber, "Tracking number");
    }
    if (nextStatus === "SHIPPED") {
      fulfillment.shippedAt = now;
      fulfillment.courierHandoverAt = now;
      // This is an estimate from the handover date; there is no live courier ETA integration.
      fulfillment.expectedDeliveryDate = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);
      if (req.body.courierPartner !== undefined) fulfillment.courierPartner = optionalText(req.body.courierPartner, "Courier partner");
      if (req.body.trackingNumber !== undefined) fulfillment.trackingNumber = optionalText(req.body.trackingNumber, "Tracking number");
      const sellerCount = order.sellerFulfillments.length;
      if (sellerCount === 1) {
        order.courierPartner = fulfillment.courierPartner;
        order.trackingNumber = fulfillment.trackingNumber;
        order.expectedDeliveryDate = fulfillment.expectedDeliveryDate;
      } else if (order.sellerFulfillments.every((entry) => entry.status === "SHIPPED")) {
        order.expectedDeliveryDate = new Date(Math.max(...order.sellerFulfillments.map((entry) => new Date(entry.expectedDeliveryDate).getTime())));
      }
    }
    syncAggregateOrderStatus(order);
    try {
      await order.save();
    } catch (error) {
      if (error.name === "VersionError") {
        return res.status(409).json({ success: false, message: "This order changed during your update. Refresh and try again." });
      }
      throw error;
    }
    await order.populate([{ path: "user", select: "fullname email" }, { path: "items.product", select: "name images price stock" }]);
    return res.json({
      success: true,
      message: `Your items are now ${nextStatus.replaceAll("_", " ")}`,
      order: serializeSellerOrder(order, req.seller._id),
    });
  } catch (error) {
    if (/must be 100 characters/.test(error.message)) {
      return res.status(400).json({ success: false, message: error.message });
    }
    console.error("SELLER FULFILLMENT UPDATE ERROR:", error);
    return res.status(500).json({ success: false, message: "Failed to update your order fulfillment" });
  }
});

router.get("/exchange-requests", isLoggedIn, isSeller, async (req, res) => {
  try {
    const orders = await sellerOrderQuery(req.seller._id, { exchangeStatus: "REQUESTED", exchangeRequested: true });
    return res.json({ success: true, requests: orders.map((order) => serializeSellerOrder(order, req.seller._id)) });
  } catch (error) {
    console.error("SELLER EXCHANGE REQUESTS ERROR:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch exchange requests" });
  }
});

module.exports = router;
