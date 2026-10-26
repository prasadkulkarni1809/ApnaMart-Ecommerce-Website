const mongoose = require("mongoose");

const productSchema = mongoose.Schema({

  images: [String],

  name: String,

  stock: {
    type: Number,
    default: 0,
    min: 0
  },

  sku: {
    type: String,
    unique: true,
    trim: true
  },

  description: {
    type: String,
    default: ""
  },

  discount: {
    type: Number,
    default: 0
  },

  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "owner",
    required: true
  },

  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "category",
    required: true
  },

  bgcolor: {
    type: String,
    default: "#FDF6EC"
  },

  panelcolor: {
    type: String,
    default: "#0F172A"
  },

  textcolor: {
    type: String,
    default: "#FFFFFF"
  },

  price: Number

});

module.exports = mongoose.model("product", productSchema);
