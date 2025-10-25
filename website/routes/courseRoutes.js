// backend/website/routes/courseRoutes.js
const express = require("express");
const router = express.Router();
const Course = require("../../models/Course");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
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

// Upload middleware for course creation
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, "../uploads");

    if (file.fieldname === "thumbnail") {
      const thumbnailsDir = path.join(uploadDir, "thumbnails");
      if (!fs.existsSync(thumbnailsDir)) {
        fs.mkdirSync(thumbnailsDir, { recursive: true });
      }
      cb(null, thumbnailsDir);
    } else if (file.fieldname === "video") {
      const videosDir = path.join(uploadDir, "videos");
      if (!fs.existsSync(videosDir)) {
        fs.mkdirSync(videosDir, { recursive: true });
      }
      cb(null, videosDir);
    }
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: file => {
      if (file.fieldname === "thumbnail") return 5 * 1024 * 1024; // 5MB for thumbnails
      if (file.fieldname === "video") return 500 * 1024 * 1024; // 500MB for videos
    }
  },
  fileFilter: (req, file, cb) => {
    if (file.fieldname === "thumbnail") {
      const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error("Only image files are allowed for thumbnails (jpeg, jpg, png, webp)"), false);
      }
    } else if (file.fieldname === "video") {
      const allowedTypes = ["video/mp4", "video/webm", "video/ogg", "video/quicktime"];
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error("Only video files are allowed (mp4, webm, ogg, mov)"), false);
      }
    }
  }
}).fields([
  { name: "thumbnail", maxCount: 1 },
  { name: "video", maxCount: 1 }
]);

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
router.post("/", protect, admin, upload, createCourse);
router.put("/:id", protect, admin, updateCourse);
router.delete("/:id", protect, admin, deleteCourse);
router.post("/assign", protect, admin, assignCourseToUser);

module.exports = router;

