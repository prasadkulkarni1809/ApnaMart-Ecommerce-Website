const jwt = require("jsonwebtoken");

const userModel = require("../models/user-models");
const ownerModel = require("../models/owner-model");
const resolveOwnerRole = require("../utils/resolveOwnerRole");

module.exports = async function isLoggedIn(req, res, next) {
  const isReactRequest = req.headers["x-client"] === "react";
  try {
    const token = req.cookies.token;

    if (!token) {
      if (isReactRequest) {
        return res.status(401).json({
          success: false,
          message: "Please login before continuing.",
        });
      }
      req.flash("error", "Please login first");
      return res.redirect("/");
    }

    // ✅ verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // =====================
    // 🔍 Check USER first
    // =====================
    let user = await userModel
      .findById(decoded._id)
      .select("-password")
      .lean();

    if (user) {
      if (!user.cart) user.cart = [];
      req.user = user;
      req.role = "customer";
      return next();
    }

    // =====================
    // 🔥 If not user → check OWNER
    // =====================
    let owner = await ownerModel
      .findById(decoded._id)
      .select("-password")
      .lean();

    if (owner) {
      const role = resolveOwnerRole(owner);
      if (!role) {
        if (isReactRequest) {
          return res.status(403).json({ success: false, message: "This account does not have an active role." });
        }
        req.flash("error", "This account does not have an active role.");
        return res.redirect("/");
      }
      req.owner = owner;
      req.user = owner;
      req.role = role;
      if (role === "seller") req.seller = owner;
      return next();
    }

    // ❌ Neither found
    if (isReactRequest) {
      return res.status(401).json({ success: false, message: "Please login before continuing." });
    }
    req.flash("error", "User not found");
    return res.redirect("/");

  } catch (err) {
    console.error("AUTH ERROR:", err.message);
    if (isReactRequest) {
      return res.status(401).json({
        success: false,
        message: "Your login session has expired. Please login again.",
      });
    }
    req.flash("error", "Session expired. Please login again.");
    return res.redirect("/");
  }
};
