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
      categoryName, // from form input
    } = req.body;

    const videoFile = req.files?.video?.[0];
    const categoryImageFile = req.files?.categoryImage?.[0];

    if (!videoFile) return res.status(400).json({ message: "No video uploaded" });

    // 1. Upload video to BunnyCDN
    const videoName = videoFile.originalname;
    const videoUploadUrl = `https://storage.bunnycdn.com/${process.env.BUNNY_STORAGE_ZONE}/${videoName}`;

    await axios.put(videoUploadUrl, videoFile.buffer, {
      headers: {
        AccessKey: process.env.BUNNY_API_KEY,
        "Content-Type": "application/octet-stream",
      },
    });

    const videoUrl = `https://${process.env.BUNNY_STREAM_PULL_ZONE}/${videoName}`;

    // 2. Handle category
    let category = await Category.findOne({ name: categoryName });

    if (!category) {
      // Create new category with uploaded image
      if (!categoryImageFile) {
        return res.status(400).json({ message: "Category image required for new category" });
      }

      const imageName = categoryImageFile.originalname;
      const categoryUploadUrl = `https://storage.bunnycdn.com/${process.env.BUNNY_STORAGE_ZONE}/categories/${imageName}`;

      await axios.put(categoryUploadUrl, categoryImageFile.buffer, {
        headers: {
          AccessKey: process.env.BUNNY_API_KEY,
          "Content-Type": "application/octet-stream",
        },
      });

      const imageCdnUrl = `https://${process.env.BUNNY_STREAM_PULL_ZONE}/categories/${imageName}`;

      category = await Category.create({
        name: categoryName,
        image: imageCdnUrl,
      });
    }

    // 3. Save video
    const video = await Video.create({
      title,
      description,
      access,
      category: category.name,
      duration,
      instructor,
      thumbnail,
      price,
      isPreview: isPreview === "true",
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
    const videos = await Video.find().sort({ createdAt: -1 });
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
