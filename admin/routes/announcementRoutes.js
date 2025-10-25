const express = require("express");
const router = express.Router();
const {
  getAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  toggleStatus
} = require("../controllers/announcementController");

const { protect, admin } = require("../../middleware/authMiddleware");

// Protect all routes
router.use(protect); // Verify JWT & set req.user
router.use(admin);   // Must be admin

// CRUD routes
router.get("/", getAnnouncements);
router.post("/", createAnnouncement);
router.put("/:id", updateAnnouncement);
router.delete("/:id", deleteAnnouncement);
router.patch("/:id/toggle-status", toggleStatus);

module.exports = router;
