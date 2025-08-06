const express = require("express");
const Video = require("../../models/Video"); // ✅ Corrected path

const router = express.Router();

// GET /api/videos
router.get("/", async (req, res) => {
  try {
    const videos = await Video.find().sort({ createdAt: -1 });
    res.status(200).json({ videos });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch videos" });
  }
});

module.exports = router;
