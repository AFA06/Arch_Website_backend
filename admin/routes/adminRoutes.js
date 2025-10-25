const express = require("express");
const {
  getAnnouncements,
  createAnnouncement,
  toggleAnnouncementStatus,
  deleteAnnouncement,
} = require("../controllers/announcementController");
const { protect, verifyAdmin } = require("../../middleware/authMiddleware");

const router = express.Router();

// Public route
router.get("/", getAnnouncements);

// Admin-only routes
router.patch("/toggle/:id", protect, verifyAdmin, toggleAnnouncementStatus);
router.delete("/:id", protect, verifyAdmin, deleteAnnouncement);

module.exports = router;
