const express = require("express");
const router = express.Router();
const Category = require("../../models/Category"); // ✅ fixed import

// GET all categories
router.get("/categories", async (req, res) => {
  try {
    const categories = await Category.find().sort({ createdAt: -1 });
    res.status(200).json({ categories });
  } catch (err) {
    console.error("Error fetching categories:", err);
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

module.exports = router;
