  const express = require("express");
  const router = express.Router();
  const bcrypt = require("bcrypt");

  const isLoggedIn = require("../middlewares/isLoggedin");
  const isAdmin = require("../middlewares/isAdmin");

  const ownerModel = require("../models/owner-model");
  const productModel = require("../models/product-model");
  const categoryModel = require("../models/category-model");
  const orderModel = require("../models/order-models");
  const userModel = require("../models/user-models");


  // GET: Logged-in seller's profile
  router.get("/profile", isLoggedIn, async (req, res) => {
    try {
      if (req.role !== "seller" || !req.seller) {
        return res.status(403).json({
          success: false,
          message: "Seller access required.",
        });
      }

      const seller = await ownerModel
        .findById(req.seller._id)
        .select(
          "fullname email phone storeName storeDescription businessAddress city state pincode storeLogo profileCompleted profileCompletedAt"
        )
        .lean();

      if (!seller) {
        return res.status(404).json({
          success: false,
          message: "Seller not found.",
        });
      }

      return res.status(200).json({
        success: true,
        profile: seller,
      });
    } catch (error) {
      console.error("GET SELLER PROFILE ERROR:", error);

      return res.status(500).json({
        success: false,
        message: "Unable to fetch seller profile.",
      });
    }
  });


  // PUT: Create or update logged-in seller's profile
  router.put("/profile", isLoggedIn, async (req, res) => {
    try {
      if (req.role !== "seller" || !req.seller) {
        return res.status(403).json({
          success: false,
          message: "Seller access required.",
        });
      }

      const {
        phone,
        storeName,
        storeDescription,
        businessAddress,
        city,
        state,
        pincode,
      } = req.body;

      const requiredFields = {
        phone,
        storeName,
        businessAddress,
        city,
        state,
        pincode,
      };

      const missingFields = Object.entries(requiredFields)
        .filter(([, value]) => !String(value || "").trim())
        .map(([key]) => key);

      if (missingFields.length > 0) {
        return res.status(400).json({
          success: false,
          message: "Please complete all required profile fields.",
          missingFields,
        });
      }

      if (!/^\d{10}$/.test(String(phone).trim())) {
        return res.status(400).json({
          success: false,
          message: "Enter a valid 10-digit phone number.",
        });
      }

      if (!/^\d{6}$/.test(String(pincode).trim())) {
        return res.status(400).json({
          success: false,
          message: "Enter a valid 6-digit pincode.",
        });
      }

      const seller = await ownerModel.findByIdAndUpdate(
        req.seller._id,
        {
          $set: {
            phone: String(phone).trim(),
            storeName: String(storeName).trim(),
            storeDescription: String(storeDescription || "").trim(),
            businessAddress: String(businessAddress).trim(),
            city: String(city).trim(),
            state: String(state).trim(),
            pincode: String(pincode).trim(),
            profileCompleted: true,
            profileCompletedAt: new Date(),
          },
        },
        {
          new: true,
          runValidators: true,
        }
      ).select(
        "fullname email phone storeName storeDescription businessAddress city state pincode storeLogo profileCompleted profileCompletedAt"
      );

      if (!seller) {
        return res.status(404).json({
          success: false,
          message: "Seller not found.",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Seller profile saved successfully.",
        profile: seller,
      });
    } catch (error) {
      console.error("UPDATE SELLER PROFILE ERROR:", error);

      return res.status(500).json({
        success: false,
        message: "Unable to save seller profile.",
      });
    }
  });

  // ===============================
  // Seller registration
  // ===============================
  router.post("/create", async (req, res) => {
    try {
      const fullname = String(req.body.fullname || "").trim();
      const email = String(req.body.email || "").trim().toLowerCase();
      const password = String(req.body.password || "");

      if (fullname.length < 3 || !email || !password) {
        return res.status(400).json({ success: false, message: "Enter your full name, email, and password." });
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ success: false, message: "Enter a valid email address." });
      }
      if (password.length < 8) {
        return res.status(400).json({ success: false, message: "Password must be at least 8 characters." });
      }
      const [existingUser, existingOwner] = await Promise.all([
        userModel.findOne({ email }).collation({ locale: "en", strength: 2 }),
        ownerModel.findOne({ email }).collation({ locale: "en", strength: 2 }),
      ]);
      if (existingUser || existingOwner) {
        return res.status(409).json({ success: false, message: "An account with this email already exists. Please login." });
      }

      const newOwner = await ownerModel.create({
        fullname,
        email,
        password: await bcrypt.hash(password, 10),
        role: "seller",
      }); 

      return res.status(201).json({
        success: true,
        message: "Seller account created successfully. You can now log in.",
        owner: { id: newOwner._id, fullname: newOwner.fullname, email: newOwner.email, role: "seller" },
      });

    } catch (err) {
      console.error("SELLER REGISTRATION ERROR:", err.message);
      if (err.code === 11000) {
        return res.status(409).json({ success: false, message: "An account with this email already exists. Please login." });
      }
      return res.status(500).json({ success: false, message: "Unable to create your seller account right now." });
    }
  });


  // ===============================
  // 📊 ADMIN DASHBOARD (MAIN PAGE)
  // ===============================
router.get("/admin", isLoggedIn, isAdmin, async (req, res) => {
  try {
    // Dashboard Counts
    const totalProducts = await productModel.countDocuments();

    const totalOrders = await orderModel.countDocuments();

    const totalUsers = await userModel.countDocuments();

    // Latest 5 Orders
  const recentOrders = await orderModel
  .find()
  .sort({ createdAt: -1 })
  .limit(5)
  .populate("user")
  .populate("items.product");
    // Revenue
    const orders = await orderModel.find({
      status: {
        $in: ["PLACED", "PACKED", "SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED"]
      }
    });

    let totalRevenue = 0;

    orders.forEach(order => {
      order.items.forEach(item => {
        if (item.seller) {
          totalRevenue += item.price * item.quantity;
        }
      });
    });

    // Render Dashboard
    res.render("admin/dashboard", {
      user: req.user,
      totalProducts,
      totalOrders,
      totalUsers,
      totalRevenue,
      recentOrders,
      ownerId: req.user._id
    });
    // console.log(recentOrders[0].items);

  } catch (err) {
    console.error(err);
    res.status(500).send("Dashboard Error");
  }
});

  // ===============================
  // 📦 ADMIN → ALL PRODUCTS PAGE
  // ===============================
  router.get("/admin/products", isLoggedIn, isAdmin, async (req, res) => {
    try {
      const products = await productModel.find().populate("category", "name");

      res.render("admin/products", { products });

    } catch (err) {
      res.send(err.message);
    }
  });


  // ===============================
  // ➕ ADMIN → CREATE PRODUCT PAGE
  // ===============================
  router.get("/admin/create", isLoggedIn, isAdmin, async (req, res) => {
    try {
      const categories = await categoryModel.find({
        active: true
      });

      res.render("createproducts", {
        categories
      });

    } catch (err) {
      console.error("CREATE PRODUCT PAGE ERROR:", err);
      res.status(500).send("Failed to load categories");
    }
  });


  // ===============================
  // ❌ DELETE PRODUCT
  // ===============================
  router.post("/admin/delete/:id", isLoggedIn, isAdmin, async (req, res) => {
    try {
      await productModel.findByIdAndDelete(req.params.id);
      res.redirect("/owners/admin/products");
    } catch (err) {
      res.send(err.message);
    }
  });

router.post("/admin/order/:id/accept", isLoggedIn, isAdmin, async (req, res) => {
  try {

    await orderModel.findByIdAndUpdate(
      req.params.id,
      {
        status: "ACCEPTED",
        deliveryUpdate: "Seller accepted your order"
      }
    );

    res.redirect("/owners/admin/orders");

  } catch (err) {
    console.log(err);
    res.redirect("/owners/admin/orders");
  }
});
router.post("/admin/order/:id/reject", isLoggedIn, isAdmin, async (req, res) => {
  try {

    await orderModel.findByIdAndUpdate(
      req.params.id,
      {
        status: "REJECTED",
        deliveryUpdate: "Order rejected by seller"
      }
    );

    res.redirect("/owners/admin/orders");

  } catch (err) {
    console.log(err);
    res.redirect("/owners/admin/orders");
  }
});

router.post("/admin/order/:id/pack", isLoggedIn, isAdmin, async (req, res) => {
  try {

    await orderModel.findByIdAndUpdate(
      req.params.id,
      {
        status: "PACKED",
        deliveryUpdate: "Your order has been packed"
      }
    );

    res.redirect("/owners/admin/orders");

  } catch (err) {
    console.log(err);
    res.redirect("/owners/admin/orders");
  }
});

router.post("/admin/order/:id/ship", isLoggedIn, isAdmin, async (req, res) => {
  try {

    await orderModel.findByIdAndUpdate(
      req.params.id,
      {
        status: "SHIPPED",
        deliveryUpdate: "Your order has been shipped"
      }
    );

    res.redirect("/owners/admin/orders");

  } catch (err) {
    console.log(err);
    res.redirect("/owners/admin/orders");
  }
});

router.post("/admin/order/:id/outfordelivery", isLoggedIn, isAdmin, async (req, res) => {
  try {

    await orderModel.findByIdAndUpdate(
      req.params.id,
      {
        status: "OUT_FOR_DELIVERY",
        deliveryUpdate: "Out for delivery"
      }
    );

    res.redirect("/owners/admin/orders");

  } catch (err) {
    console.log(err);
    res.redirect("/owners/admin/orders");
  }
});
router.post("/admin/order/:id/deliver", isLoggedIn, isAdmin, async (req, res) => {
  try {

    await orderModel.findByIdAndUpdate(
      req.params.id,
      {
        status: "DELIVERED",
        deliveryUpdate: "Order delivered successfully"
      }
    );

    res.redirect("/owners/admin/orders");

  } catch (err) {
    console.log(err);
    res.redirect("/owners/admin/orders");
  }
});

router.post("/admin/order/:id/tracking", isLoggedIn, isAdmin, async (req, res) => {
  try {

    const {
      trackingNumber,
      courierPartner
    } = req.body;

    await orderModel.findByIdAndUpdate(
      req.params.id,
      {
        trackingNumber,
        courierPartner
      }
    );

    res.redirect("/owners/admin/orders");

  } catch (err) {
    console.log(err);
    res.redirect("/owners/admin/orders");
  }
});

router.post("/admin/order/:id/exchange-approve", isLoggedIn, isAdmin, async (req, res) => {
  try {

    await orderModel.findByIdAndUpdate(
      req.params.id,
      {
        exchangeStatus: "APPROVED"
      }
    );

    res.redirect("/owners/admin/orders");

  } catch (err) {
    console.log(err);
    res.redirect("/owners/admin/orders");
  }
});
router.post("/admin/order/:id/exchange-reject", isLoggedIn, isAdmin, async (req, res) => {
  try {

    await orderModel.findByIdAndUpdate(
      req.params.id,
      {
        exchangeStatus: "REJECTED"
      }
    );

    res.redirect("/owners/admin/orders");

  } catch (err) {
    console.log(err);
    res.redirect("/owners/admin/orders");
  }
});



router.get("/admin/orders", isLoggedIn, isAdmin, async (req, res) => {
  try {

    const orders = await orderModel
      .find()
      .populate("user")
      .populate("items.product")
      .populate("items.seller", "fullname email");

    res.render("admin/orders", {
      orders
    });

  } catch (err) {
    console.log(err);
    res.send(err.message);
  }
});
  module.exports = router;
