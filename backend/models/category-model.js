const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },

  image: {
    type: String,
  },

  description: {
    type: String,
  },

  active: {
    type: Boolean,
    default: true,
  },
});

module.exports = mongoose.model("category", categorySchema);