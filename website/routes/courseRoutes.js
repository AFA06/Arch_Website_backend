// backend/website/routes/courseRoutes.js
const express = require("express");
const router = express.Router();
const Course = require("../../models/Course");
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
router.get("/categories", async (req, res) => {
  try {
    // Get unique categories from courses
    const categories = await Course.distinct("category", { category: { $exists: true, $ne: null } });
    
    // Format categories for frontend
    const formattedCategories = categories.map(category => ({
      _id: category,
      name: category,
      slug: category.toLowerCase().replace(/\s+/g, '-')
    }));

    res.status(200).json({
      success: true,
      data: formattedCategories
    });
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch categories"
    });
  }
});

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

