// admin/routes/videoCategories.js

const express = require("express");
const multer = require("multer");
const axios = require("axios");
const Category = require("../../models/Category");

const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({ storage });

// POST /api/admin/video-categories
router.post("/", upload.single("image"), async (req, res) => {
  try {
    const { title, description, price } = req.body;
    const imageFile = req.file;

    if (!title || !description || !price || !imageFile) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Check if category already exists
    const existing = await Category.findOne({ title });
    if (existing) {
      return res.status(400).json({ message: "Category already exists" });
    }

    // Upload image to BunnyCDN
    const imageName = Date.now() + "-" + imageFile.originalname;
    const bunnyUrl = `https://storage.bunnycdn.com/${process.env.BUNNY_STORAGE_ZONE}/categories/${imageName}`;

    await axios.put(bunnyUrl, imageFile.buffer, {
      headers: {
        AccessKey: process.env.BUNNY_API_KEY,
        "Content-Type": "application/octet-stream",
      },
    });

    const imageCdnUrl = `https://${process.env.BUNNY_STREAM_PULL_ZONE}/categories/${imageName}`;

    // Save to DB
    const category = await Category.create({
      title,
      description,
      price,
      thumbnailUrl: imageCdnUrl,
    });

    res.status(201).json({ category });
  } catch (err) {
    console.error("Category creation error:", err);
    res.status(500).json({ message: "Failed to create category" });
  }
});

// GET /api/admin/video-categories
router.get("/", async (req, res) => {
  try {
    const categories = await Category.find().sort({ createdAt: -1 });
    res.status(200).json({ categories });
  } catch (err) {
    console.error("Error fetching categories:", err);
    res.status(500).json({ message: "Failed to fetch categories" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const deletedCategory = await Category.findByIdAndDelete(id);
    if (!deletedCategory) {
      return res.status(404).json({ message: "Category not found" });
    }

    res.status(200).json({ message: "Category deleted successfully" });
  } catch (err) {
    console.error("Error deleting category:", err);
    res.status(500).json({ message: "Failed to delete category" });
  }
});

module.exports = router;
