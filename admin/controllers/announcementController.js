// backend/admin/controllers/announcementController.js
const Announcement = require("../../models/Announcement");
const NotificationStatus = require("../../models/NotificationStatus");

// --- Socket.IO instance ---
let io;
const initSocket = (serverIo) => {
  io = serverIo;
};

// --- Get announcements for the logged-in user ---
const getAnnouncements = async (req, res) => {
  try {
    const userId = req.user._id;

    const announcements = await Announcement.find({ status: "active" }).sort({ createdDate: -1 });

    // For each announcement, check if user has read it
    const statuses = await NotificationStatus.find({ userId });
    const readIds = statuses.filter((s) => s.read).map((s) => s.announcementId.toString());

    const enriched = announcements.map((a) => ({
      ...a.toObject(),
      read: readIds.includes(a._id.toString()),
    }));

    res.json({ success: true, data: enriched });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// --- Create new announcement ---
const createAnnouncement = async (req, res) => {
  try {
    const { title, content, recipients, expiryDate } = req.body;

    if (!title || !content || !recipients || recipients.length === 0) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    const announcement = await Announcement.create({
      title,
      content,
      recipients,
      expiryDate,
      status: "active",
      createdDate: new Date(),
    });

    if (io) io.emit("newNotification", announcement);

    res.status(201).json({ success: true, data: announcement });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// --- Toggle announcement status ---
const toggleAnnouncementStatus = async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id);
    if (!announcement) return res.status(404).json({ success: false, message: "Announcement not found" });

    announcement.status = announcement.status === "active" ? "inactive" : "active";
    await announcement.save();

    res.json({ success: true, data: announcement });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// --- Delete announcement ---
const deleteAnnouncement = async (req, res) => {
  try {
    const announcement = await Announcement.findByIdAndDelete(req.params.id);
    if (!announcement) return res.status(404).json({ success: false, message: "Announcement not found" });

    res.json({ success: true, data: announcement });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// --- Mark all announcements as read for the user ---
const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user._id;

    const activeAnnouncements = await Announcement.find({ status: "active" });

    // Create or update NotificationStatus for each
    for (const ann of activeAnnouncements) {
      await NotificationStatus.findOneAndUpdate(
        { userId, announcementId: ann._id },
        { read: true },
        { upsert: true }
      );
    }

    res.json({ success: true, message: "All notifications marked as read" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  getAnnouncements,
  createAnnouncement,
  toggleAnnouncementStatus,
  deleteAnnouncement,
  markAllAsRead,
  initSocket,
};
