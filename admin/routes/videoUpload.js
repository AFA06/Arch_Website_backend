// routes/videoRoutes.js

const express = require("express");
const multer = require("multer");
const {
  uploadVideoToBunny,
  getAllVideos,
  deleteVideo,
} = require("../controllers/videoController");

const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({ storage });

router.post(
  "/upload",
  upload.fields([
    { name: "video", maxCount: 1 },
    { name: "categoryImage", maxCount: 1 },
  ]),
  uploadVideoToBunny
);

router.get("/", getAllVideos);
router.delete("/:id", deleteVideo);

module.exports = router;
