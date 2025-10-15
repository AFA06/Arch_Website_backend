// backend/website/routes/courseRoutes.js
const express = require("express");
const router = express.Router();
const {
  getMyCourses,
  getCourseBySlug,
  getAllCourses,
  assignCourseToUser,
  updateCourseProgress,
  createCourse,
  updateCourse,
  deleteCourse,
} = require("../controllers/courseController");
const { protect, admin } = require("../../middleware/authMiddleware");

// Public routes
router.get("/", getAllCourses);

// Protected routes (authentication required)
router.get("/my-courses", protect, getMyCourses);
router.get("/:slug", protect, getCourseBySlug);
router.put("/:slug/progress", protect, updateCourseProgress);

// Admin routes (authentication + admin role required)
router.post("/", protect, admin, createCourse);
router.put("/:id", protect, admin, updateCourse);
router.delete("/:id", protect, admin, deleteCourse);
router.post("/assign", protect, admin, assignCourseToUser);

module.exports = router;

