const Announcement = require("../../models/Announcement");

// Get all announcements
exports.getAnnouncements = async (req, res) => {
  try {
    const announcements = await Announcement.find().sort({ createdDate: -1 });
    res.status(200).json(announcements);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch announcements", error });
  }
};

// Create new announcement
exports.createAnnouncement = async (req, res) => {
  try {
    const { title, content, expiryDate } = req.body;
    const announcement = new Announcement({ title, content, expiryDate });
    await announcement.save();
    res.status(201).json(announcement);
  } catch (error) {
    res.status(500).json({ message: "Failed to create announcement", error });
  }
};

// Update announcement
exports.updateAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, expiryDate } = req.body;

    const announcement = await Announcement.findByIdAndUpdate(
      id,
      { title, content, expiryDate },
      { new: true }
    );

    if (!announcement) return res.status(404).json({ message: "Announcement not found" });

    res.status(200).json(announcement);
  } catch (error) {
    res.status(500).json({ message: "Failed to update announcement", error });
  }
};

// Delete announcement
exports.deleteAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    const announcement = await Announcement.findByIdAndDelete(id);

    if (!announcement) return res.status(404).json({ message: "Announcement not found" });

    res.status(200).json({ message: "Announcement deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete announcement", error });
  }
};

// Toggle announcement status
exports.toggleStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const announcement = await Announcement.findById(id);

    if (!announcement) return res.status(404).json({ message: "Announcement not found" });

    announcement.status = announcement.status === "active" ? "inactive" : "active";
    await announcement.save();

    res.status(200).json(announcement);
  } catch (error) {
    res.status(500).json({ message: "Failed to toggle status", error });
  }
};
