const express = require("express");
const router = express.Router();

const isLoggedIn = require("../middlewares/isLoggedin");
const userModel = require("../models/user-models");
const orderModel = require("../models/order-models");
const resolveOwnerRole = require("../utils/resolveOwnerRole");

router.use(isLoggedIn);

router.get("/me", (req, res) => {
  const account = req.owner || req.user;
  res.json({
    success: true,
    user: {
      id: account._id,
      fullname: account.fullname || "",
      email: account.email || "",
      role: req.owner ? resolveOwnerRole(req.owner) : "customer",
    },
  });
});

router.post("/logout", (req, res) => {
  res.clearCookie("token", { httpOnly: true, sameSite: "lax", path: "/" });
  res.clearCookie("token", { httpOnly: true, sameSite: "lax", path: "/users" });
  res.json({ success: true, message: "Logged out successfully." });
});

router.get("/", async (req, res) => {
  try {
    const user = await userModel.findById(req.user._id).select(
      "fullname email contact picture addresses"
    );

    if (!user) {
      return res.status(404).json({ success: false, message: "Account not found" });
    }

    const orders = await orderModel
      .find({ user: user._id })
      .populate("items.product", "name images")
      .populate("sellerFulfillments.seller", "fullname")
      .sort({ createdAt: -1 })
      .lean();

    const orderItems = orders.map((order) => ({
      _id: order._id,
      createdAt: order.createdAt,
      amount: order.amount,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      status: order.status,
      exchangeRequested: Boolean(order.exchangeRequested),
      exchangeReason: order.exchangeReason || "",
      exchangeStatus: order.exchangeStatus || "NONE",
      deliveryUpdate: order.deliveryUpdate,
      trackingNumber: order.trackingNumber,
      courierPartner: order.courierPartner,
      expectedDeliveryDate: order.expectedDeliveryDate,
      sellerFulfillments: (order.sellerFulfillments || []).map((fulfillment) => ({
        seller: fulfillment.seller?._id || fulfillment.seller,
        sellerName: fulfillment.seller?.fullname || "Seller",
        status: fulfillment.status,
        readyAt: fulfillment.readyAt,
        shippedAt: fulfillment.shippedAt,
        expectedDeliveryDate: fulfillment.expectedDeliveryDate,
        courierPartner: fulfillment.courierPartner || "",
        trackingNumber: fulfillment.trackingNumber || "",
      })),
      items: (order.items || []).map((item) => ({
        productId: item.product?._id || null,
        name: item.name || item.product?.name || "Product",
        image: item.image || item.product?.images?.[0] || "",
        quantity: item.quantity,
        price: item.price,
      })),
    }));

    res.json({
      success: true,
      profile: {
        fullname: user.fullname || "",
        email: user.email || "",
        contact: user.contact || "",
        picture: user.picture || "",
      },
      addresses: user.addresses || [],
      orders: orderItems,
      summary: {
        totalOrders: orderItems.filter((order) => order.paymentStatus !== "FAILED").length,
        activeOrders: orderItems.filter((order) =>
          ["PLACED", "ACCEPTED", "PACKED", "READY_TO_DISPATCH", "SHIPPED", "OUT_FOR_DELIVERY"].includes(order.status) &&
          order.paymentStatus !== "FAILED"
        ).length,
        deliveredOrders: orderItems.filter((order) => order.status === "DELIVERED").length,
        cancelledOrders: orderItems.filter((order) => ["CANCELLED", "REJECTED"].includes(order.status)).length,
        totalSpent: orderItems.reduce((total, order) => {
          const cancelled = ["CANCELLED", "REJECTED"].includes(order.status);
          const refunded = order.paymentStatus === "REFUNDED";
          const paid = order.paymentStatus === "PAID" ||
            (order.paymentMethod === "COD" && order.status === "DELIVERED");
          return !cancelled && !refunded && paid ? total + (order.amount || 0) : total;
        }, 0),
      },
    });
  } catch (error) {
    console.error("GET ACCOUNT API ERROR:", error);
    res.status(500).json({ success: false, message: "Failed to load your account" });
  }
});

router.put("/profile", async (req, res) => {
  try {
    const fullname = String(req.body.fullname || "").trim();
    const contact = String(req.body.contact || "").trim();

    if (!fullname) {
      return res.status(400).json({ success: false, message: "Name is required" });
    }

    const user = await userModel.findByIdAndUpdate(
      req.user._id,
      { $set: { fullname, contact } },
      { new: true, runValidators: true }
    ).select("fullname email contact picture");

    res.json({ success: true, profile: user });
  } catch (error) {
    console.error("UPDATE ACCOUNT PROFILE ERROR:", error);
    res.status(500).json({ success: false, message: "Failed to update your profile" });
  }
});

function readAddress(body) {
  return {
    label: String(body.label || "Home").trim(),
    name: String(body.name || "").trim(),
    phone: String(body.phone || "").trim(),
    address: String(body.address || "").trim(),
    city: String(body.city || "").trim(),
    state: String(body.state || "").trim(),
    pincode: String(body.pincode || "").trim(),
    isDefault: body.isDefault === true,
  };
}

function addressIsComplete(address) {
  return address.name && address.phone && address.address && address.city && address.pincode;
}

router.post("/addresses", async (req, res) => {
  try {
    const address = readAddress(req.body);
    if (!addressIsComplete(address)) {
      return res.status(400).json({
        success: false,
        message: "Name, phone, street address, city, and pincode are required",
      });
    }

    const user = await userModel.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: "Account not found" });
    }

    if (address.isDefault || !user.addresses.length) {
      user.addresses.forEach((savedAddress) => {
        savedAddress.isDefault = false;
      });
      address.isDefault = true;
    }

    user.addresses.push(address);
    await user.save();

    res.status(201).json({
      success: true,
      addresses: user.addresses,
      message: "Address saved",
    });
  } catch (error) {
    console.error("SAVE ACCOUNT ADDRESS ERROR:", error);
    res.status(500).json({ success: false, message: "Failed to save address" });
  }
});

router.put("/addresses/:addressId", async (req, res) => {
  try {
    const address = readAddress(req.body);
    if (!addressIsComplete(address)) {
      return res.status(400).json({
        success: false,
        message: "Name, phone, street address, city, and pincode are required",
      });
    }

    const user = await userModel.findById(req.user._id);
    const savedAddress = user?.addresses.id(req.params.addressId);
    if (!savedAddress) {
      return res.status(404).json({ success: false, message: "Address not found" });
    }

    if (address.isDefault) {
      user.addresses.forEach((item) => {
        item.isDefault = false;
      });
    }
    Object.assign(savedAddress, address);
    if (!user.addresses.some((item) => item.isDefault) && user.addresses.length) {
      user.addresses[0].isDefault = true;
    }
    await user.save();

    res.json({ success: true, addresses: user.addresses, message: "Address updated" });
  } catch (error) {
    console.error("UPDATE ACCOUNT ADDRESS ERROR:", error);
    res.status(500).json({ success: false, message: "Failed to update address" });
  }
});

router.put("/addresses/:addressId/default", async (req, res) => {
  try {
    const user = await userModel.findById(req.user._id);
    const selectedAddress = user?.addresses.id(req.params.addressId);
    if (!selectedAddress) {
      return res.status(404).json({ success: false, message: "Address not found" });
    }

    user.addresses.forEach((address) => {
      address.isDefault = address._id.equals(selectedAddress._id);
    });
    await user.save();

    res.json({ success: true, addresses: user.addresses, message: "Default address updated" });
  } catch (error) {
    console.error("SET DEFAULT ADDRESS ERROR:", error);
    res.status(500).json({ success: false, message: "Failed to set default address" });
  }
});

router.delete("/addresses/:addressId", async (req, res) => {
  try {
    const user = await userModel.findById(req.user._id);
    const index = user?.addresses.findIndex(
      (address) => address._id.toString() === req.params.addressId
    ) ?? -1;

    if (index < 0) {
      return res.status(404).json({ success: false, message: "Address not found" });
    }

    const removedDefault = user.addresses[index].isDefault;
    user.addresses.splice(index, 1);
    if (removedDefault && user.addresses.length) {
      user.addresses[0].isDefault = true;
    }
    await user.save();

    res.json({ success: true, addresses: user.addresses, message: "Address removed" });
  } catch (error) {
    console.error("DELETE ACCOUNT ADDRESS ERROR:", error);
    res.status(500).json({ success: false, message: "Failed to remove address" });
  }
});

module.exports = router;
