const bcrypt = require("bcrypt");
const userModel = require("../models/user-models");
const ownerModel = require("../models/owner-model");
const generateToken = require("../utils/generateToken");
const resolveOwnerRole = require("../utils/resolveOwnerRole");

const isReactRequest = (req) => req.get("X-Client") === "react";

function setAuthCookie(res, token) {
  res.clearCookie("token", { path: "/users" });

  const isProduction = process.env.NODE_ENV === "production";

  res.cookie("token", token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    path: "/",
  });
}

function authError(req, res, status, message) {
  if (isReactRequest(req)) {
    return res.status(status).json({ success: false, message });
  }
  req.flash("error", message);
  return res.redirect("/");
}

module.exports.registerUser = async (req, res) => {
  try {
    const fullname = String(req.body.fullname || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");

    if (!fullname || !email || !password) {
      return authError(req, res, 400, "Please complete all fields.");
    }
    if (password.length < 8) {
      return authError(req, res, 400, "Password must be at least 8 characters.");
    }
    const [existingUser, existingOwner] = await Promise.all([
      userModel.findOne({ email }).collation({ locale: "en", strength: 2 }),
      ownerModel.findOne({ email }).collation({ locale: "en", strength: 2 }),
    ]);
    if (existingUser || existingOwner) {
      return authError(req, res, 409, "An account with this email already exists. Please login.");
    }

    const user = await userModel.create({
      fullname,
      email,
      password: await bcrypt.hash(password, 10),
    });
    setAuthCookie(res, generateToken(user));

    if (isReactRequest(req)) {
      return res.status(201).json({
        success: true,
        message: "Account created successfully.",
        user: { id: user._id, fullname: user.fullname, email: user.email, role: "user" },
      });
    }
    return res.redirect("/shop");
  } catch (error) {
    console.error("REGISTER ERROR:", error.message);
    return authError(req, res, 500, "Unable to create your account right now.");
  }
};

module.exports.loginUser = async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");
    if (!email || !password) {
      return authError(req, res, 400, "Enter your email and password.");
    }

    const user = await userModel.findOne({ email }).collation({ locale: "en", strength: 2 });
    if (user && await bcrypt.compare(password, user.password)) {
      setAuthCookie(res, generateToken(user));
      if (isReactRequest(req)) {
        return res.json({
          success: true,
          message: "Login successful.",
          user: { id: user._id, fullname: user.fullname, email: user.email, role: "user" },
        });
      }
      return res.redirect("/shop");
    }

    const owner = await ownerModel.findOne({ email }).collation({ locale: "en", strength: 2 }).lean();
    if (owner) {
      const ownerRole = resolveOwnerRole(owner);
      const ownerPassword = String(owner.password || "");
      const isMatch = ownerPassword.startsWith("$2")
        ? await bcrypt.compare(password, ownerPassword)
        : password === ownerPassword;
      if (isMatch && ownerRole) {
        setAuthCookie(res, generateToken(owner));
        if (isReactRequest(req)) {
          return res.json({
            success: true,
            message: "Login successful.",
            user: { id: owner._id, fullname: owner.fullname || "Store owner", email: owner.email, role: ownerRole },
          });
        }
        return res.redirect(ownerRole === "admin" ? "/owners/admin" : "/seller");
      }
    }

    return authError(req, res, 401, "Email or password is incorrect.");
  } catch (error) {
    console.error("LOGIN ERROR:", error.message);
    return authError(req, res, 500, "Unable to login right now. Please try again.");
  }
};
