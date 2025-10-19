// admin/routes/courses.js
const express = require("express");
const router = express.Router();
const courseController = require("../controllers/courseController");
const { uploadThumbnail, uploadVideo } = require("../../middleware/upload");
const requireAuth = require("../../middleware/requireAuth");

// All routes require authentication
router.use(requireAuth);

// Get all courses (for admin)
router.get("/", courseController.getAllCourses);

// Get single course by ID
router.get("/:id", courseController.getCourseById);

// Create new course
router.post("/", uploadThumbnail, courseController.createCourse);

// Update course
router.put("/:id", uploadThumbnail, courseController.updateCourse);

// Delete course
router.delete("/:id", courseController.deleteCourse);

// Add video to pack
router.post("/:id/videos", uploadVideo, courseController.addVideoToPack);

// Update video in pack
router.put("/:id/videos/:videoId", courseController.updateVideoInPack);

// Delete video from pack
router.delete("/:id/videos/:videoId", courseController.deleteVideoFromPack);

// Reorder videos in pack
router.put("/:id/videos-order", courseController.reorderVideos);

module.exports = router;

