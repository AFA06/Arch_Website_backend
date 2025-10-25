const express = require("express");
const {
  getAnnouncements,
  createAnnouncement,
  toggleAnnouncementStatus,
  deleteAnnouncement,
} = require("../controllers/announcementController");
const { protect, verifyAdmin } = require("../../middleware/authMiddleware");

const router = express.Router();

router.get("/", getAnnouncements);
router.post("/", protect, verifyAdmin, createAnnouncement);
router.patch("/toggle/:id", protect, verifyAdmin, toggleAnnouncementStatus);
router.delete("/:id", protect, verifyAdmin, deleteAnnouncement);

module.exports = router;
