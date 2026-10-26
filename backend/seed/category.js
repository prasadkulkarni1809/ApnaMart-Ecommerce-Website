const mongoose = require("mongoose");
const categoryModel = require("../models/category-model");

const categories = [
  {
    name: "Fashion",
    description: "Clothing, footwear and fashion accessories",
  },
  {
    name: "Electronics",
    description: "Mobiles, laptops, headphones and electronic products",
  },
  {
    name: "Home & Kitchen",
    description: "Furniture, kitchen products and home essentials",
  },
  {
    name: "Beauty & Personal Care",
    description: "Skincare, haircare and personal care products",
  },
  {
    name: "Sports & Fitness",
    description: "Sports equipment and fitness products",
  },
  {
    name: "Books",
    description: "Books and educational materials",
  },
  {
    name: "Toys & Games",
    description: "Toys, games and entertainment products",
  },
  {
    name: "Grocery",
    description: "Food, beverages and daily-use products",
  },
  {
    name: "Automotive",
    description: "Car, bike and automotive accessories",
  },
];

async function seedCategories() {
  try {
    await mongoose.connect("mongodb://localhost:27017/ecommerce");

    await categoryModel.deleteMany({});

    await categoryModel.insertMany(categories);

    console.log("✅ Categories inserted successfully");

    process.exit();
  } catch (error) {
    console.error("❌ CATEGORY SEED ERROR:", error);
    process.exit(1);
  }
}

seedCategories();
