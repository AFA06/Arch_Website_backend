const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  userName: { type: String },
  userEmail: { type: String },       // ✅ FIXED: use userEmail and correct type
  courseSlug: { type: String },
  courseTitle: { type: String },
  amount: { type: Number },
  method: { type: String, default: "Telegram" },
  status: { type: String, default: "completed" },
  date: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Payment", paymentSchema);
