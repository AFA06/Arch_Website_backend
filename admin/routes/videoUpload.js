const express = require("express");
const router = express.Router();
const videoController = require("../controllers/videoController");
const { verifyAdminToken } = require("../../middleware/auth");
const multer = require("multer");

const upload = multer({ dest: "uploads/" });

// Confirm that controller functions exist
console.log("uploadVideo:", typeof videoController.uploadVideo);
console.log("getAllVideos:", typeof videoController.getAllVideos);
console.log("getVideosByCategory:", typeof videoController.getVideosByCategory);

// Routes
router.post("/upload", verifyAdminToken, upload.single("file"), videoController.uploadVideo);
router.get("/", verifyAdminToken, videoController.getAllVideos);
router.get("/category/:slug", verifyAdminToken, videoController.getVideosByCategory);

module.exports = router;
