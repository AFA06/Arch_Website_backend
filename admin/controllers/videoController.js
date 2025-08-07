// controllers/videoController.js

const Video = require("../../models/Video");
const Category = require("../../models/Category");
const axios = require("axios");

const uploadVideoToBunny = async (req, res) => {
  try {
    const {
      title,
      description,
      access,
      duration,
      instructor,
      thumbnail,
      price,
      isPreview,
      categorySlug, // we still receive slug from frontend
    } = req.body;

    const videoFile = req.files?.video?.[0];

    if (!videoFile) {
      return res.status(400).json({ message: "No video uploaded" });
    }

    // ✅ 1. Upload video to BunnyCDN
    const videoName = videoFile.originalname;
    const videoUploadUrl = `https://storage.bunnycdn.com/${process.env.BUNNY_STORAGE_ZONE}/${videoName}`;

    await axios.put(videoUploadUrl, videoFile.buffer, {
      headers: {
        AccessKey: process.env.BUNNY_API_KEY,
        "Content-Type": "application/octet-stream",
      },
    });

    const videoUrl = `https://${process.env.BUNNY_STREAM_PULL_ZONE}/${videoName}`;

    // ✅ 2. Get category by slug
    const category = await Category.findOne({ slug: categorySlug });
    if (!category) {
      return res.status(400).json({ message: "Invalid category selected" });
    }

    // ✅ 3. Save video (store category._id)
    const video = await Video.create({
      title,
      description,
      access,
      category: category._id, // ← store as ObjectId reference
      duration,
      instructor,
      thumbnail,
      price,
      isPreview: isPreview === "true" || isPreview === true,
      videoUrl,
    });

    res.status(201).json({ video });
  } catch (error) {
    console.error("Upload error:", error.response?.data || error.message);
    res.status(500).json({ message: "Video upload failed" });
  }
};

const getAllVideos = async (req, res) => {
  try {
    const videos = await Video.find()
      .sort({ createdAt: -1 })
      .populate("category"); // ✅ optional: populate category data

    res.status(200).json({ videos });
  } catch (error) {
    res.status(500).json({ message: "Fetching videos failed" });
  }
};

const deleteVideo = async (req, res) => {
  try {
    await Video.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Delete failed" });
  }
};

module.exports = {
  uploadVideoToBunny,
  getAllVideos,
  deleteVideo,
};
