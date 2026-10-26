const express = require("express");
const router = express.Router();

const upload = require("../config/multer-config");
const productModel = require("../models/product-model");
const isLoggedIn = require("../middlewares/isLoggedin");
const isSellerOrAdmin = require("../middlewares/isSellerOrAdmin");

router.post(
  "/create",
  isLoggedIn,
  isSellerOrAdmin,
  upload.array("images", 6),

  async function (req, res) {
    console.log("🔥 POST /products/create REACHED");

    try {

      const {
        name,
        price,
        discount,
        category,
        stock,
        sku,
        bgcolor,
        panelcolor,
        textcolor,
      } = req.body;

      // Missing images
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          message: "At least one product image is required",
        });
      }

      // Required fields
      if (!name || !price || !category) {
        return res.status(400).json({
          success: false,
          message: "Product name, price and category are required",
        });
      }

      const images = req.files.map((file) => {
        return (
          `data:${file.mimetype};base64,` +
          file.buffer.toString("base64")
        );
      });

      const createdProduct = await productModel.create({
        name,
        price,
        discount,
        stock: stock === "" || stock === undefined ? 0 : Number(stock),
        sku: sku || undefined,
        category,
        bgcolor,
        panelcolor,
        textcolor,
        images,
        seller: req.owner._id
      });

      return res.status(201).json({
        success: true,
        message: "Product created successfully",
      });

    } catch (err) {

      console.error("CREATE PRODUCT ERROR:", err);

      return res.status(500).json({
        success: false,
        message: "Something went wrong while creating product",
      });
    }
  }
);

module.exports = router;
