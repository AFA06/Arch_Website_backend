// backend/models/Announcement.js
const mongoose = require("mongoose");

const announcementSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  expiryDate: { type: Date },
  status: { type: String, enum: ["active", "inactive"], default: "active" },
  createdDate: { type: Date, default: Date.now },
  audience: {
    type: String,
    enum: ["all", "premium", "free", "notLoggedIn"],
    default: "all",
  },
});

module.exports = mongoose.model("Announcement", announcementSchema);
