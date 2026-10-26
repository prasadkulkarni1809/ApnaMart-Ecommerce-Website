const express = require("express");
const router = express.Router();
const crypto = require("crypto");

const isLoggedIn = require("../middlewares/isLoggedin");
const isAdmin = require("../middlewares/isAdmin");
const productModel = require("../models/product-model");
const userModel = require("../models/user-models");
const orderModel = require("../models/order-models");
const categoryModel = require("../models/category-model");
const razorpay = require("../config/razorpay");
const { ensureSellerFulfillments, DELIVERY_UPDATES } = require("../utils/orderFulfillment");

async function releaseReservedStock(order) {
  const updatedOrder = await orderModel.findOneAndUpdate(
    { _id: order._id, inventoryReserved: true },
    { $set: { inventoryReserved: false, paymentStatus: "FAILED" } },
    { new: true }
  );

  if (!updatedOrder) return false;

  await Promise.all(
    updatedOrder.items.map((item) =>
      productModel.updateOne(
        { _id: item.product },
        { $inc: { stock: item.quantity } }
      )
    )
  );
  return true;
}

function maskSignature(signature) {
  if (!signature) return "<missing>";
  if (signature.length <= 12) return `${signature.slice(0, 3)}… (${signature.length} chars)`;
  return `${signature.slice(0, 6)}…${signature.slice(-4)} (${signature.length} chars)`;
}

// =====================
// HOME
// =====================
// React is the only customer-facing storefront. Keep the legacy EJS views
// available for existing routes, but never expose the old EJS login page.
router.get("/", (req, res) => {
  const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
  res.redirect(`${clientUrl.replace(/\/$/, "")}/products`);
});

// =====================
// SHOP
// =====================

router.get("/shop", isLoggedIn, async (req, res) => {
  try {
    const { sort, collection, filter } = req.query;

const cartCount = (req.user.cart || []).reduce(
  (sum, item) => sum + (item.quantity || 0),
  0
);
    let query = {};
    if (collection === "discount" || filter === "discount") {
      query.discount = { $gt: 0 };
    }

    let productsQuery = productModel.find(query);

    if (sort === "price_low") productsQuery.sort({ price: 1 });
    if (sort === "price_high") productsQuery.sort({ price: -1 });

    const products = await productsQuery;

    res.render("shop", {
      products,
      sort,
      cartCount,
      showLogout: false,
    });
  } catch (err) {
    console.error("SHOP ERROR:", err);
    res.redirect("/");
  }
});

// =====================
// ADD TO CART
// =====================
router.get("/addtocart/:productid", isLoggedIn, async (req, res) => {
  try {
    const user = await userModel.findById(req.user._id);
    const productId = req.params.productid;

    const cartItem = user.cart.find(
      item => item.product && item.product.toString() === productId
    );

    if (cartItem) {
      cartItem.quantity += 1;
    } else {
      user.cart.push({ product: productId, quantity: 1 });
    }

    await user.save();
    req.flash("success", "Product added to cart");
    res.redirect("/shop");
  } catch (err) {
    console.error("ADD TO CART ERROR:", err);
    res.redirect("/shop");
  }
});

// =====================
// CART
// =====================
router.get("/cart", isLoggedIn, async (req, res) => {
  try {
    const user = await userModel
      .findById(req.user._id)
      .populate("cart.product");

    const safeCart = user.cart.filter(
      item => item.product && item.product._id
    );

    if (safeCart.length !== user.cart.length) {
      user.cart = safeCart;
      await user.save();
    }

    const cartItems = safeCart.map(item => ({
      _id: item.product._id,
      name: item.product.name,
      price: item.product.price,
      discount: item.product.discount || 0,
      image: item.product.image,
      quantity: item.quantity,
    }));

    let mrp = 0;
    let discount = 0;

    cartItems.forEach(i => {
      mrp += i.price * i.quantity;
      discount += (i.price * i.discount / 100) * i.quantity;
    });

    const totals = {
      mrp,
      discount,
      platformFee: 20,
      final: Math.round(mrp - discount + 20),
    };

    res.render("cart", { cartItems, totals, showLogout: false });
  } catch (err) {
    console.error("CART ERROR:", err);
    res.redirect("/shop");
  }
});

// =====================
// CART ACTIONS
// =====================
router.get("/cart/increase/:productid", isLoggedIn, async (req, res) => {
  const user = await userModel.findById(req.user._id);
  const item = user.cart.find(
    i => i.product.toString() === req.params.productid
  );
  if (item) item.quantity++;
  await user.save();
  res.redirect("/cart");
});

router.get("/cart/decrease/:productid", isLoggedIn, async (req, res) => {
  const user = await userModel.findById(req.user._id);
  const item = user.cart.find(
    i => i.product.toString() === req.params.productid
  );

  if (item) {
    item.quantity--;
    if (item.quantity <= 0) {
      user.cart = user.cart.filter(
        i => i.product.toString() !== req.params.productid
      );
    }
    await user.save();
  }
  res.redirect("/cart");
});

router.get("/cart/remove/:productid", isLoggedIn, async (req, res) => {
  const user = await userModel.findById(req.user._id);
  user.cart = user.cart.filter(
    item => item.product.toString() !== req.params.productid
  );
  await user.save();
  res.redirect("/cart");
});

// =====================
// CHECKOUT PAGE
// =====================
router.get("/checkout", isLoggedIn, async (req, res) => {
  const user = await userModel
    .findById(req.user._id)
    .populate("cart.product");

  if (!user.cart.length) {
    req.flash("error", "Cart is empty");
    return res.redirect("/shop");
  }

  let subtotal = 0;
  user.cart.forEach(i => {
    subtotal += i.product.price * i.quantity;
  });

  const totals = {
    subtotal,
    platformFee: 20,
    final: subtotal + 20,
  };

  res.render("checkout", {
    cart: user.cart,
    totals,
    showLogout: false,
  });
});

// =====================
// PLACE ORDER
// =====================
router.post("/checkout", isLoggedIn, async (req, res) => {
  const isReactRequest = req.headers["x-client"] === "react";
  const checkoutError = (status, message, redirect = "/checkout") => {
    req.flash("error", message);
    if (isReactRequest) {
      return res.status(status).json({ success: false, message });
    }
    return res.redirect(redirect);
  };

  try {
    const { address, city, pincode, phone, paymentMethod } = req.body;
    console.info("CHECKOUT START:", {
      userId: req.user?._id?.toString(),
      paymentMethod,
      itemCount: req.user?.cart?.length,
    });

    if (
      !address?.trim() ||
      !city?.trim() ||
      !pincode?.trim() ||
      !phone?.trim() ||
      !["COD", "ONLINE"].includes(paymentMethod)
    ) {
      return checkoutError(400, "Enter valid delivery and payment details.");
    }

    const user = await userModel
      .findById(req.user._id)
      .populate("cart.product");

    if (!user?.cart?.length) {
      return checkoutError(400, "Your cart is empty.", "/cart");
    }

    let subtotal = 0;
    const items = [];
    for (const cartItem of user.cart) {
      const product = cartItem.product;
      const quantity = Number(cartItem.quantity);

      if (!product || !Number.isInteger(quantity) || quantity < 1) {
        return checkoutError(400, "Your cart contains an invalid item.", "/cart");
      }

      if (product.stock < quantity) {
        return checkoutError(
          409,
          `Only ${product.stock} units of ${product.name} are available.`,
          "/cart"
        );
      }

      subtotal += product.price * quantity;
      items.push({
        product: product._id,
        seller: product.seller,
        name: product.name || "Product",
        image: product.images?.[0] || "",
        quantity,
        price: product.price,
      });
    }

    // Reserve each line atomically so two checkouts cannot oversell the same stock.
    const reserved = [];
    for (const item of items) {
      const product = await productModel.findOneAndUpdate(
        { _id: item.product, stock: { $gte: item.quantity } },
        { $inc: { stock: -item.quantity } },
        { new: true }
      );

      if (!product) {
        await Promise.all(
          reserved.map((reservedItem) =>
            productModel.updateOne(
              { _id: reservedItem.product },
              { $inc: { stock: reservedItem.quantity } }
            )
          )
        );
        return checkoutError(
          409,
          "Stock changed while checking out. Please review your cart.",
          "/cart"
        );
      }

      reserved.push(item);
    }

    let order;
    try {
      order = await orderModel.create({
        user: user._id,
        items,
        sellerFulfillments: [...new Set(items.map((item) => String(item.seller)))].map((sellerId) => ({
          seller: sellerId,
          status: "PLACED",
        })),
        address: address.trim(),
        city: city.trim(),
        pincode: pincode.trim(),
        phone: phone.trim(),
        paymentMethod,
        amount: subtotal + 20,
        paymentStatus: paymentMethod === "COD" ? "PENDING" : "CREATED",
        inventoryReserved: paymentMethod === "ONLINE",
      });
    } catch (createError) {
      await Promise.all(
        reserved.map((item) =>
          productModel.updateOne(
            { _id: item.product },
            { $inc: { stock: item.quantity } }
          )
        )
      );
      throw createError;
    }

    console.info("CHECKOUT ORDER CREATED:", {
      orderId: order._id.toString(),
      paymentMethod: order.paymentMethod,
      amount: order.amount,
      paymentStatus: order.paymentStatus,
      inventoryReserved: order.inventoryReserved,
    });

    if (paymentMethod === "COD") {
      user.cart = [];
      await user.save();
      if (isReactRequest) {
        return res.status(201).json({
          success: true,
          orderId: order._id,
          paymentRequired: false,
          message: "Order placed successfully",
        });
      }
      return res.redirect("/orders/success");
    }

    if (isReactRequest) {
      return res.status(201).json({
        success: true,
        orderId: order._id,
        paymentRequired: true,
        paymentUrl: `/orders/pay/${order._id}`,
        message: "Order created. Continue to payment.",
      });
    }

    res.redirect(`/orders/pay/${order._id}`);
  } catch (err) {
    console.error("CHECKOUT ERROR:", err);
    if (isReactRequest) {
      return res.status(500).json({
        success: false,
        message: "Unable to place your order.",
      });
    }
    res.redirect("/checkout");
  }
});

// =====================
// RAZORPAY PAYMENT
// =====================
router.get("/orders/pay/:orderId", isLoggedIn, async (req, res) => {
  let order;
  try {
    console.info("RAZORPAY ORDER CREATION START:", {
      orderId: req.params.orderId,
      userId: req.user?._id?.toString(),
    });
    order = await orderModel.findOne({
      _id: req.params.orderId,
      user: req.user._id,
      paymentMethod: "ONLINE",
      paymentStatus: "CREATED",
    });
    if (!order) {
      console.warn("RAZORPAY ORDER CREATION ABORTED: eligible order not found");
      return res.redirect("/account");
    }

    const amountPaise = Math.round(order.amount * 100);
    console.info("RAZORPAY ORDER CREATE REQUEST:", {
      orderId: order._id.toString(),
      amountPaise,
      currency: "INR",
      keyIdConfigured: Boolean(process.env.RAZORPAY_KEY_ID),
      keyMode: process.env.RAZORPAY_KEY_ID?.startsWith("rzp_test_") ? "test" : "non-test",
      keySecretConfigured: Boolean(process.env.RAZORPAY_KEY_SECRET),
    });
    const razorpayOrder = await razorpay.orders.create({
      amount: amountPaise,
      currency: "INR",
      receipt: order._id.toString(),
    });

    console.info("RAZORPAY ORDER CREATE SUCCEEDED:", {
      orderId: order._id.toString(),
      razorpayOrderId: razorpayOrder.id,
      amountPaise: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      status: razorpayOrder.status,
    });

    order.razorpay = { orderId: razorpayOrder.id };
    await order.save();

    res.render("razorpay", {
      order,
      razorpayKey: process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) {
    console.error("RAZORPAY ORDER CREATE FAILED:", {
      orderId: order?._id?.toString() || req.params.orderId,
      statusCode: err.statusCode,
      code: err.error?.code || err.code,
      description: err.error?.description || err.message,
    });
    if (order) {
      const released = await releaseReservedStock(order).catch((releaseError) => {
        console.error("RAZORPAY ORDER CREATE STOCK RELEASE ERROR:", releaseError.message);
        return false;
      });
      console.info("RAZORPAY ORDER CREATE FAILURE STOCK RELEASE:", {
        orderId: order._id.toString(),
        released,
      });
    }
    res.redirect("/cart");
  }
});

// =====================
// PAYMENT VERIFY
// =====================
router.post("/payment/verify", isLoggedIn, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    console.log("RAZORPAY CALLBACK RECEIVED BY BACKEND:", {
      userId: req.user?._id?.toString(),
      hasAuthCookie: Boolean(req.cookies?.token),
      response: {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature: maskSignature(razorpay_signature),
      },
    });
    console.log("PAYMENT VERIFY REQUEST REACHED:", req.originalUrl);

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      console.warn("PAYMENT VERIFY REJECTED: missing payment fields");
      return res.status(400).json({ success: false, message: "Missing payment details" });
    }

    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expected = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");
    const expectedBuffer = Buffer.from(expected);
    const receivedBuffer = Buffer.from(razorpay_signature);
    const signatureMismatch =
      expectedBuffer.length !== receivedBuffer.length ||
      !crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
    console.info("PAYMENT VERIFY SIGNATURE RESULT:", {
      expectedSignature: maskSignature(expected),
      receivedSignature: maskSignature(razorpay_signature),
      matches: !signatureMismatch,
    });
    if (signatureMismatch) {
      console.warn("PAYMENT VERIFY REJECTED: signature mismatch");
      return res.status(400).json({ success: false, message: "Invalid payment signature" });
    }

    const order = await orderModel.findOne({
      "razorpay.orderId": razorpay_order_id,
      user: req.user._id,
      paymentMethod: "ONLINE",
    });
    console.info("PAYMENT VERIFY ORDER LOOKUP:", {
      found: Boolean(order),
      orderId: order?._id?.toString(),
      paymentStatus: order?.paymentStatus,
      inventoryReserved: order?.inventoryReserved,
    });
    if (!order) {
      console.warn("PAYMENT VERIFY REJECTED: order not found for authenticated user", {
        razorpay_order_id,
        userId: req.user?._id?.toString(),
      });
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    if (order.paymentStatus !== "PAID") {
      order.paymentStatus = "PAID";
      order.inventoryReserved = false;
      order.razorpay.paymentId = razorpay_payment_id;
      order.razorpay.signature = razorpay_signature;
      await order.save();
    }

    const cartUpdate = await userModel.updateOne(
      { _id: order.user },
      { $set: { cart: [] } }
    );
    const savedOrder = await orderModel.findById(order._id).select("paymentStatus inventoryReserved").lean();
    console.log("PAYMENT VERIFY FINAL STATE:", {
      orderId: order._id.toString(),
      paymentStatus: savedOrder?.paymentStatus,
      inventoryReserved: savedOrder?.inventoryReserved,
      cartCleared: cartUpdate.modifiedCount === 1,
    });
    res.json({ success: true });
  } catch (err) {
    console.error("PAYMENT VERIFY ERROR:", err);
    res.status(500).json({ success: false, message: "Failed to verify payment" });
  }
});

router.post("/payment/failure", isLoggedIn, async (req, res) => {
  try {
    console.log("PAYMENT FAILURE REQUEST:", {
      userId: req.user?._id?.toString(),
      hasAuthCookie: Boolean(req.cookies?.token),
      orderId: req.body.orderId,
      source: req.body.source || "unspecified",
      reason: req.body.reason || "unspecified",
      failure: req.body.failure || null,
    });

    const order = await orderModel.findOne({
      _id: req.body.orderId,
      user: req.user._id,
      paymentMethod: "ONLINE",
      paymentStatus: "CREATED",
    });
    console.info("PAYMENT FAILURE ORDER LOOKUP:", {
      found: Boolean(order),
      orderId: order?._id?.toString(),
      paymentStatus: order?.paymentStatus,
      inventoryReserved: order?.inventoryReserved,
    });

    if (order) {
      const released = await releaseReservedStock(order);
      console.log("PAYMENT FAILURE ORDER/STOCK RESULT:", {
        orderId: order._id.toString(),
        paymentStatusBeforeRelease: order.paymentStatus,
        inventoryReservedBeforeRelease: order.inventoryReserved,
        released,
      });
    } else {
      console.log("PAYMENT FAILURE: no pending reserved order found");
    }
    res.json({ success: true });
  } catch (err) {
    console.error("PAYMENT FAILURE HANDLER ERROR:", err);
    res.status(500).json({ success: false });
  }
});

// =====================
// SUCCESS PAGE
// =====================
router.get("/orders/success", isLoggedIn, (req, res) => {
  res.render("order-success");
});

router.get("/api/admin/products", isLoggedIn, isAdmin, async (req, res) => {
  try {
    const products = await productModel
      .find()
      .populate("category", "name")
      .sort({ name: 1 });
    return res.json({ success: true, products });
  } catch (error) {
    console.error("ADMIN PRODUCTS ERROR:", error.message);
    return res.status(500).json({ success: false, message: "Failed to fetch products" });
  }
});

router.delete("/api/admin/products/:productId", isLoggedIn, isAdmin, async (req, res) => {
  try {
    const deletedProduct = await productModel.findOneAndDelete({
      _id: req.params.productId,
    });
    if (!deletedProduct) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }
    return res.json({ success: true, message: "Product deleted" });
  } catch (error) {
    console.error("ADMIN PRODUCT DELETE ERROR:", error.message);
    return res.status(500).json({ success: false, message: "Failed to delete product" });
  }
});

router.get("/api/admin/orders", isLoggedIn, isAdmin, async (req, res) => {
  try {
    const orders = await orderModel
      .find()
      .populate("user", "fullname email")
      .populate("items.product", "name images price")
      .populate("items.seller", "fullname email")
      .populate("sellerFulfillments.seller", "fullname email")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: orders.length,
      orders,
    });
  } catch (error) {
    console.error("ADMIN ORDERS ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch orders",
    });
  }
});

router.put(
  "/api/admin/orders/:orderId/status",
  isLoggedIn,
  isAdmin,
  async (req, res) => {
    try {
      const { status: newStatus } = req.body;

      const allowedTransitions = {
        SHIPPED: ["OUT_FOR_DELIVERY"],
        OUT_FOR_DELIVERY: ["DELIVERED"],
      };

      const validStatuses = [
        "OUT_FOR_DELIVERY",
        "DELIVERED",
      ];

      if (!validStatuses.includes(newStatus)) {
        return res.status(400).json({
          success: false,
          message: "Invalid order status",
        });
      }

      const order = await orderModel.findById(req.params.orderId);

      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Order not found",
        });
      }

      const allowedNextStatuses = allowedTransitions[order.status] || [];

      if (!allowedNextStatuses.includes(newStatus)) {
        return res.status(400).json({
          success: false,
          message: `Cannot change order from ${order.status} to ${newStatus}`,
        });
      }

      if (
        order.paymentMethod === "ONLINE" &&
        order.paymentStatus !== "PAID"
      ) {
        return res.status(400).json({
          success: false,
          message: "Online payment must be completed before fulfillment",
        });
      }

      ensureSellerFulfillments(order);
      if (order.sellerFulfillments.some((entry) => entry.status !== order.status)) {
        return res.status(409).json({ success: false, message: "Seller fulfillment records are out of sync. Refresh before advancing delivery tracking." });
      }
      if (newStatus === "OUT_FOR_DELIVERY" && order.sellerFulfillments.some((entry) => entry.status !== "SHIPPED")) {
        return res.status(409).json({ success: false, message: "Every seller's items must be shipped before platform delivery tracking can advance" });
      }
      order.status = newStatus;
      order.deliveryUpdate = DELIVERY_UPDATES[newStatus];
      for (const fulfillment of order.sellerFulfillments) {
        fulfillment.status = newStatus;
        if (newStatus === "OUT_FOR_DELIVERY") fulfillment.outForDeliveryAt = new Date();
        if (newStatus === "DELIVERED") fulfillment.deliveredAt = new Date();
      }
      let updatedOrder;
      try {
        updatedOrder = await order.save();
      } catch (error) {
        if (error.name === "VersionError") return res.status(409).json({ success: false, message: "Order status changed. Refresh and try again." });
        throw error;
      }
      await updatedOrder.populate("sellerFulfillments.seller", "fullname email");

      return res.status(200).json({
        success: true,
        message: `Order updated to ${newStatus}`,
        order: updatedOrder,
      });
    } catch (error) {
      console.error("ADMIN UPDATE ORDER STATUS ERROR:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to update order status",
      });
    }
  }
);

router.put(
  "/api/admin/orders/:orderId/exchange",
  isLoggedIn,
  isAdmin,
  async (req, res) => {
    try {
      const { decision } = req.body;

      if (!["APPROVED", "REJECTED"].includes(decision)) {
        return res.status(400).json({
          success: false,
          message: "Decision must be APPROVED or REJECTED",
        });
      }

      const order = await orderModel.findOneAndUpdate(
        {
          _id: req.params.orderId,
          status: "DELIVERED",
          exchangeStatus: "REQUESTED",
          exchangeRequested: true,
        },
        {
          $set: {
            exchangeStatus: decision,
          },
        },
        {
          new: true,
          runValidators: true,
        }
      );

      if (!order) {
        return res.status(409).json({
          success: false,
          message:
            "Order not found, not delivered, or exchange request already processed.",
        });
      }

      return res.status(200).json({
        success: true,
        message: `Exchange request ${decision.toLowerCase()} successfully`,
        order,
      });
    } catch (error) {
      console.error("ADMIN EXCHANGE DECISION ERROR:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to process exchange request",
      });
    }
  }
);

router.put("/api/orders/:orderId/cancel", isLoggedIn, async (req, res) => {
  try {
    const reason = typeof req.body?.reason === "string" ? req.body.reason.trim() : "";
    const order = await orderModel.findOneAndUpdate(
      {
        _id: req.params.orderId,
        user: req.user._id,
        status: { $in: ["PLACED", "ACCEPTED", "PACKED"] },
        paymentStatus: { $in: ["PENDING", "PAID"] },
      },
      {
        $set: {
          status: "CANCELLED",
          cancellationReason: reason || "Cancelled by customer",
          deliveryUpdate: "Order Cancelled",
          "sellerFulfillments.$[].status": "CANCELLED",
        },
        $inc: { __v: 1 },
      },
      { new: true }
    );

    if (!order) {
      const existingOrder = await orderModel.findOne({
        _id: req.params.orderId,
        user: req.user._id,
      }).select("_id");
      if (!existingOrder) {
        return res.status(404).json({ success: false, message: "Order not found" });
      }
      return res.status(400).json({
        success: false,
        message: "This order cannot be cancelled now",
      });
    }

    // The atomic status change above claims the cancellation. A retry or a
    // concurrent request can no longer restore the same order's stock twice.
    await Promise.all(
      order.items.map((item) =>
        productModel.updateOne(
          { _id: item.product },
          { $inc: { stock: item.quantity } }
        )
      )
    );

    return res.json({
      success: true,
      message: "Order cancelled successfully",
      order,
    });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(404).json({ success: false, message: "Order not found" });
    }
    console.error("CANCEL ORDER ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to cancel order",
    });
  }
});

router.put("/api/orders/:orderId/exchange", isLoggedIn, async (req, res) => {
  try {
    const reason = typeof req.body?.reason === "string" ? req.body.reason.trim() : "";
    if (!reason) {
      return res.status(400).json({
        success: false,
        message: "Please provide an exchange reason",
      });
    }
    if (reason.length > 500) {
      return res.status(400).json({
        success: false,
        message: "Exchange reason must be 500 characters or fewer",
      });
    }

    const order = await orderModel.findOne({
      _id: req.params.orderId,
      user: req.user._id,
    }).select("_id status exchangeRequested exchangeStatus");

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    if (order.status !== "DELIVERED") {
      return res.status(400).json({
        success: false,
        message: "Exchange can only be requested for delivered orders",
      });
    }

    if (order.exchangeRequested || (order.exchangeStatus && order.exchangeStatus !== "NONE")) {
      return res.status(400).json({ success: false, message: "Exchange request already exists" });
    }

    // Conditional update makes exchange requests idempotent under concurrent submissions.
    const updatedOrder = await orderModel.findOneAndUpdate(
      {
        _id: order._id,
        user: req.user._id,
        status: "DELIVERED",
        exchangeRequested: { $ne: true },
        exchangeStatus: { $in: ["NONE", null] },
      },
      {
        $set: {
          exchangeRequested: true,
          exchangeReason: reason,
          exchangeStatus: "REQUESTED",
        },
      },
      { new: true }
    );

    if (!updatedOrder) {
      return res.status(400).json({ success: false, message: "Exchange request already exists" });
    }

    return res.json({
      success: true,
      message: "Exchange request submitted successfully",
      order: updatedOrder,
    });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(404).json({ success: false, message: "Order not found" });
    }
    console.error("EXCHANGE REQUEST ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to submit exchange request",
    });
  }
});

router.post("/api/cart/add/:productid", isLoggedIn, async (req, res) => {
  try {
    const user = await userModel.findById(req.user._id);
    const productId = req.params.productid;
    const quantity = req.body.quantity === undefined
      ? 1
      : Number(req.body.quantity);
    const product = await productModel.findById(productId);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    if (!Number.isInteger(quantity) || quantity < 1) {
      return res.status(400).json({
        success: false,
        message: "Quantity must be a positive whole number",
      });
    }

    const cartItem = user.cart.find(
      item =>
        item.product &&
        item.product.toString() === productId
    );

    const existingQuantity = cartItem ? cartItem.quantity : 0;
    if (existingQuantity + quantity > product.stock) {
      return res.status(400).json({
        success: false,
        message: "Requested quantity exceeds available stock",
      });
    }

    if (cartItem) {
      cartItem.quantity += quantity;
    } else {
      user.cart.push({
        product: productId,
        quantity,
      });
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: "Product added to cart",
    });
  } catch (err) {
    console.error("ADD TO CART API ERROR:", err);

    res.status(500).json({
      success: false,
      message: "Failed to add product to cart",
    });
  }
});

// =====================
// ADD TO CART API
// =====================
router.post("/api/cart/add", isLoggedIn, async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    const requestedQuantity = Number(quantity);

    if (!productId || !requestedQuantity || requestedQuantity < 1) {
      return res.status(400).json({
        success: false,
        message: "Invalid product or quantity",
      });
    }

    const product = await productModel.findById(productId);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    if (product.stock <= 0) {
      return res.status(400).json({
        success: false,
        message: "Product is out of stock",
      });
    }

    const user = await userModel.findById(req.user._id);
    const cartItem = user.cart.find(
      item =>
        item.product &&
        item.product.toString() === productId
    );

    if (cartItem) {
      const newQuantity = cartItem.quantity + requestedQuantity;

      if (newQuantity > product.stock) {
        return res.status(400).json({
          success: false,
          message: `Only ${product.stock} units available`,
        });
      }

      cartItem.quantity = newQuantity;
    } else {
      if (requestedQuantity > product.stock) {
        return res.status(400).json({
          success: false,
          message: `Only ${product.stock} units available`,
        });
      }

      user.cart.push({
        product: productId,
        quantity: requestedQuantity,
      });
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: "Product added to cart",
      cartCount: user.cart.reduce(
        (total, item) => total + item.quantity,
        0
      ),
    });
  } catch (err) {
    console.error("ADD TO CART API ERROR:", err);

    res.status(500).json({
      success: false,
      message: "Failed to add product to cart",
    });
  }
});

// =====================
// ADD / REMOVE WISHLIST
// =====================
router.post("/api/wishlist/toggle", isLoggedIn, async (req, res) => {
  try {
    const { productId } = req.body;

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: "Product ID is required",
      });
    }

    const product = await productModel.findById(productId);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const user = await userModel.findById(req.user._id);

    if (!user.wishlist) {
      user.wishlist = [];
    }

    const existingIndex = user.wishlist.findIndex(
      id => id.toString() === productId
    );

    let wishlisted;

    if (existingIndex !== -1) {
      user.wishlist.splice(existingIndex, 1);
      wishlisted = false;
    } else {
      user.wishlist.push(productId);
      wishlisted = true;
    }

    await user.save();

    return res.status(200).json({
      success: true,
      wishlisted,
      message: wishlisted
        ? "Added to wishlist"
        : "Removed from wishlist",
      wishlistCount: user.wishlist.length,
    });
  } catch (err) {
    console.error("WISHLIST ERROR:", err);

    return res.status(500).json({
      success: false,
      message: "Failed to update wishlist",
    });
  }
});

// =====================
// WISHLIST STATUS
// =====================
router.get(
  "/api/wishlist/status/:productId",
  isLoggedIn,
  async (req, res) => {
    try {
      const user = await userModel.findById(req.user._id);

      const wishlisted = user.wishlist?.some(
        id => id.toString() === req.params.productId
      ) || false;

      res.json({
        success: true,
        wishlisted,
      });
    } catch (err) {
      console.error("WISHLIST STATUS ERROR:", err);

      res.status(500).json({
        success: false,
        message: "Failed to check wishlist",
      });
    }
  }
);

// =====================
// GET WISHLIST API
// =====================
router.get("/api/wishlist", isLoggedIn, async (req, res) => {
  try {
    const user = await userModel
      .findById(req.user._id)
      .populate("wishlist");

    const wishlistItems = (user.wishlist || [])
      .filter(product => product && product._id)
      .map(product => ({
        _id: product._id,
        name: product.name,
        price: product.price,
        discount: product.discount || 0,
        images: product.images || [],
        stock: product.stock || 0,
      }));

    res.status(200).json({
      success: true,
      wishlistItems,
    });
  } catch (error) {
    console.error("GET WISHLIST ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Failed to load wishlist",
    });
  }
});

// =====================
// GET CART API
// =====================
router.get("/api/cart", isLoggedIn, async (req, res) => {
  try {
    const user = await userModel
      .findById(req.user._id)
      .populate("cart.product");

    const safeCart = user.cart.filter(
      item => item.product && item.product._id
    );

    // Remove products that no longer exist
    if (safeCart.length !== user.cart.length) {
      user.cart = safeCart;
      await user.save();
    }

    const cartItems = safeCart.map(item => ({
      _id: item.product._id,
      name: item.product.name,
      price: item.product.price,
      discount: item.product.discount || 0,
      images: item.product.images || [],
      quantity: item.quantity,
    }));

    let mrp = 0;
    let discount = 0;

    cartItems.forEach(item => {
      mrp += item.price * item.quantity;

      discount +=
        (item.price * item.discount / 100) *
        item.quantity;
    });

    const totals = {
      mrp,
      discount,
      platformFee: 20,
      final: Math.round(mrp - discount + 20),
    };

    res.status(200).json({
      success: true,
      cartItems,
      totals,
    });
  } catch (err) {
    console.error("CART API ERROR:", err);

    res.status(500).json({
      success: false,
      message: "Failed to fetch cart",
    });
  }
});

// =====================
// INCREASE CART QUANTITY API
// =====================
router.post("/api/cart/increase/:productid", isLoggedIn, async (req, res) => {
  try {
    const user = await userModel.findById(req.user._id);

    const item = user.cart.find(
      item =>
        item.product &&
        item.product.toString() === req.params.productid
    );

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Product not found in cart",
      });
    }

    item.quantity += 1;

    await user.save();

    res.json({
      success: true,
      message: "Quantity increased",
    });
  } catch (err) {
    console.error("INCREASE CART ERROR:", err);

    res.status(500).json({
      success: false,
      message: "Failed to increase quantity",
    });
  }
});

// =====================
// DECREASE CART QUANTITY API
// =====================
router.post("/api/cart/decrease/:productid", isLoggedIn, async (req, res) => {
  try {
    const user = await userModel.findById(req.user._id);

    const item = user.cart.find(
      item =>
        item.product &&
        item.product.toString() === req.params.productid
    );

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Product not found in cart",
      });
    }

    item.quantity -= 1;

    if (item.quantity <= 0) {
      user.cart = user.cart.filter(
        item =>
          item.product &&
          item.product.toString() !== req.params.productid
      );
    }

    await user.save();

    res.json({
      success: true,
      message: "Quantity decreased",
    });
  } catch (err) {
    console.error("DECREASE CART ERROR:", err);

    res.status(500).json({
      success: false,
      message: "Failed to decrease quantity",
    });
  }
});

// =====================
// REMOVE FROM CART API
// =====================
router.delete("/api/cart/remove/:productid", isLoggedIn, async (req, res) => {
  try {
    const user = await userModel.findById(req.user._id);

    user.cart = user.cart.filter(
      item =>
        item.product &&
        item.product.toString() !== req.params.productid
    );

    await user.save();

    res.json({
      success: true,
      message: "Product removed from cart",
    });
  } catch (err) {
    console.error("REMOVE CART ERROR:", err);

    res.status(500).json({
      success: false,
      message: "Failed to remove product",
    });
  }
});

// =====================
// GET SINGLE PRODUCT API
// =====================
router.get("/api/products/:id", async (req, res) => {
  try {
    if (!/^[a-f\d]{24}$/i.test(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID",
      });
    }

    const product = await productModel
      .findById(req.params.id)
      .populate("category", "name");

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    res.status(200).json({
      success: true,
      product: {
        _id: product._id,
        name: product.name,
        price: product.price,
        discount: product.discount || 0,
        stock: product.stock || 0,
        images: product.images || [],
        category: product.category,
      },
    });
  } catch (err) {
    console.error("PRODUCT DETAILS API ERROR:", err);

    res.status(500).json({
      success: false,
      message: "Failed to fetch product",
    });
  }
});

router.get("/api/products", async (req, res) => {
  try {
    const { sort, collection, filter } = req.query;
    const categoryId = typeof req.query.category === "string"
      ? req.query.category.trim()
      : "";
    const search = typeof req.query.search === "string"
      ? req.query.search.trim().slice(0, 80)
      : "";

    let query = {};

    if (categoryId) {
      if (!/^[a-f\d]{24}$/i.test(categoryId)) {
        return res.status(400).json({ success: false, message: "Invalid category" });
      }
      query.category = categoryId;
    }

    if (search) {
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const searchPattern = new RegExp(escapedSearch, "i");
      query.$or = [
        { name: searchPattern },
        { description: searchPattern },
        { sku: searchPattern },
      ];
    }

    // Discount filter
    if (
      collection === "discount" ||
      filter === "discount"
    ) {
      query.discount = { $gt: 0 };
    }

    let productsQuery = productModel.find(query);

    // Sorting
    if (sort === "price_low") {
      productsQuery.sort({ price: 1 });
    }

    if (sort === "price_high") {
      productsQuery.sort({ price: -1 });
    }

    const products = await productsQuery;

    const formattedProducts = products.map((product) => ({
      _id: product._id,
      name: product.name,
      price: product.price,
      discount: product.discount,
      images: product.images || [],
      category: product.category,
    }));

    res.json({
      success: true,
      products: formattedProducts,
    });

  } catch (err) {
    console.error("PRODUCT API ERROR:", err);

    res.status(500).json({
      success: false,
      message: "Failed to fetch products",
    });
  }
});


// =====================
// CATEGORIES API - REACT
// =====================


router.get("/api/admin/categories", isLoggedIn, isAdmin, async (req, res) => {
  try {
    const categories = await categoryModel.find().sort({ name: 1 });
    return res.json({ success: true, categories });
  } catch (error) {
    console.error("ADMIN CATEGORIES ERROR:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch categories" });
  }
});

router.get("/api/categories", async (req, res) => {
  try {
    const categories = await categoryModel.find({
      active: true,
    });

    res.json({
      success: true,
      categories,
    });
  } catch (err) {
    console.error("CATEGORY API ERROR:", err);

    res.status(500).json({
      success: false,
      message: "Failed to fetch categories",
    });
  }
});


module.exports = router;
