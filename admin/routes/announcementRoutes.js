// backend/admin/routes/announcementRoutes.js
const express = require("express");
const {
  getAnnouncements,
  createAnnouncement,
  toggleAnnouncementStatus,
  deleteAnnouncement,
  markAllAsRead,
} = require("../controllers/announcementController");
const { protect, verifyAdmin } = require("../../middleware/authMiddleware");

const router = express.Router();

router.get("/", protect, getAnnouncements);
router.post("/", protect, verifyAdmin, createAnnouncement);
router.patch("/toggle/:id", protect, verifyAdmin, toggleAnnouncementStatus);
router.delete("/:id", protect, verifyAdmin, deleteAnnouncement);
router.put("/mark-all-read", protect, markAllAsRead); // ✅ new route

module.exports = router;
