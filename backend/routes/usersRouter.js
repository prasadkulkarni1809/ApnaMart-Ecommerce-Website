

const express = require('express');
const router = express.Router();
const bcrypt = require("bcrypt");

const {generateToken}  = require("../utils/generateToken")
const {registerUser,loginUser}= require("../controllers/authController");
const isLoggedIn = require("../middlewares/isLoggedin");
const userModel = require("../models/user-models");
const orderModel = require("../models/order-models");



router.post("/register",registerUser);
router.post("/login",loginUser);

router.put("/api/account/password", isLoggedIn, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (typeof currentPassword !== "string" || typeof newPassword !== "string" || !currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Current and new password are required",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 6 characters",
      });
    }

    const user = await userModel.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    return res.json({ success: true, message: "Password changed successfully" });
  } catch (error) {
    console.error("CHANGE PASSWORD ERROR:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to change password",
    });
  }
});

router.get("/account", isLoggedIn, async function (req, res) {
  try {
    const user = await userModel.findById(req.user._id);
const orders = await orderModel
  .find({ user: req.user._id })
  .populate("items.product")
  .sort({ createdAt: -1 });



    res.render("myaccount", {
      user,
      cartCount: user.cart.length,
      ordersCount: user.orders.length,
      orders,
      ordersCount: orders.length,
      showLogout: true   
    });
  } catch (err) {
    console.error("ACCOUNT ERROR:", err);
    res.redirect("/shop");
  }
});


router.get("/logout", (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
  res.clearCookie("token", {
    httpOnly: true,
    sameSite: "lax",
    path: "/users",
  });
  


  req.flash("success", "Logged out successfully");
  res.redirect("/");
  

  
});



module.exports= router;

