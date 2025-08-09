const axios = require("axios");
const Video = require("../../models/Video");
const VideoCategory = require("../../models/Category");
const fs = require("fs");
const path = require("path");

exports.uploadVideo = async (req, res) => {
  console.log("Received upload request");
  try {
    const { title, description = "", categoryId } = req.body;
    const videoFile = req.file;

    if (!title || !categoryId || !videoFile) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const category = await VideoCategory.findById(categoryId);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    const videoBuffer = fs.readFileSync(videoFile.path);
    const ext = path.extname(videoFile.originalname) || ".mp4";
    const safeTitle = title.replace(/\s+/g, "-").replace(/[^a-zA-Z0-9-_]/g, "");
    const fileName = `${Date.now()}-${safeTitle}${ext}`;

    const storageZone = process.env.BUNNY_STORAGE_ZONE; // e.g., 'architect-videos'
    const storageDirectory = process.env.BUNNY_STORAGE_DIRECTORY || ""; // optional folder inside storage zone
    const directoryPath = storageDirectory ? `${storageDirectory}/` : "";

    const uploadUrl = `https://storage.bunnycdn.com/${storageZone}/${directoryPath}${fileName}`;

    console.log("Uploading video to Bunny.net:", uploadUrl);

    await axios.put(uploadUrl, videoBuffer, {
      headers: {
        AccessKey: process.env.BUNNY_API_KEY,
        "Content-Type": videoFile.mimetype || "video/mp4",
        "Content-Length": videoBuffer.length,
      },
    });

    const cdnUrlBase = process.env.BUNNY_CDN_URL; // e.g., 'architect-videos.b-cdn.net'
    const cdnDirectory = storageDirectory ? `${storageDirectory}/` : "";
    const videoUrl = `https://${cdnUrlBase}/${cdnDirectory}${fileName}`;

    const newVideo = await Video.create({
  title,
  description,
  category: category._id,
  videoUrl,
});


    fs.unlink(videoFile.path, (err) => {
      if (err) console.error("Failed to delete temp video file:", err);
      else console.log("Temp video file deleted");
    });

    console.log("Video upload succeeded");
    res.status(201).json({
      message: "Video uploaded successfully",
      video: newVideo,
    });
  } catch (error) {
    console.error("Video upload error:", error.message || error);
    res.status(500).json({ message: "Server error", error: error.message || error });
  }
};

exports.getAllVideos = async (req, res) => {
  try {
    const videos = await Video.find();
    res.json(videos);
  } catch (error) {
    console.error("getAllVideos error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getVideosByCategory = async (req, res) => {
  try {
    const categorySlug = req.params.slug;

    // Find the category document by slug
    const category = await VideoCategory.findOne({ slug: categorySlug });
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    // Find videos with this category _id
    const videos = await Video.find({ category: category._id });

    res.json(videos);
  } catch (error) {
    console.error("getVideosByCategory error:", error);
    res.status(500).json({ message: "Server error" });
  }
};
