// backend/models/NotificationStatus.js
const mongoose = require("mongoose");

const notificationStatusSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  announcementId: { type: mongoose.Schema.Types.ObjectId, ref: "Announcement", required: true },
  read: { type: Boolean, default: false },
});

module.exports = mongoose.model("NotificationStatus", notificationStatusSchema);
