  const mongoose = require("mongoose");

  const ownerSchema = mongoose.Schema({
    fullname: {
      type: String,
      minLength: 3,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
    },
    password: String,
    role: {
      type: String,
      enum: ["admin", "seller"],
      default: "seller",
    },
    products: {
      type: Array,
      default: [],
    },
    picture: String,
    gstin: String,
    phone: {
      type: String,
      trim: true,
      default: "",
    },
    storeName: {
      type: String,
      trim: true,
      default: "",
    },
    storeDescription: {
      type: String,
      trim: true,
      default: "",
    },
    businessAddress: {
      type: String,
      trim: true,
      default: "",
    },
    city: {
      type: String,
      trim: true,
      default: "",
    },
    state: {
      type: String,
      trim: true,
      default: "",
    },
    pincode: {
      type: String,
      trim: true,
      default: "",
    },
    profileCompleted: {
      type: Boolean,
      default: false,
    },
    profileCompletedAt: {
      type: Date,
      default: null,
    },
    storeLogo: {
      type: String,
      default: "",
    },
  });

  module.exports = mongoose.model("owner", ownerSchema);
