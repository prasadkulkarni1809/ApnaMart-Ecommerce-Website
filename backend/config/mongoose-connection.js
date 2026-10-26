const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const dbURI =
      process.env.MONGO_URI || "mongodb://localhost:27017/ecommerce";

    console.log("Connecting to:", dbURI);

    await mongoose.connect(dbURI);

    console.log("MongoDB Connected Successfully 🚀");
  } catch (error) {
    console.error("MongoDB Connection Error ❌:", error);
  }
};

module.exports = connectDB;