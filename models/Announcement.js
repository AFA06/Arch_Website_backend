const mongoose = require("mongoose");

const announcementSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  status: { type: String, enum: ["active", "inactive"], default: "active" },
  createdDate: { type: Date, default: Date.now },
  expiryDate: { type: Date }
});

module.exports = mongoose.model("Announcement", announcementSchema);
