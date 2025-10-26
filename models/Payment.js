const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  userName: { type: String },
  userEmail: { type: String, required: true },       // ✅ FIXED: use userEmail and correct type
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
  courseSlug: { type: String, required: true },
  courseTitle: { type: String, required: true },
  amount: { type: Number, required: true },
  companyShare: { type: Number, default: 0 }, // Company portion for company-owned courses
  platformShare: { type: Number, default: 0 }, // Platform portion
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", default: null },
  assignedByAdminId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  method: { type: String, default: "Telegram" },
  status: { type: String, default: "completed" },
  date: { type: Date, default: Date.now },
}, { timestamps: true });

// Index for faster queries
paymentSchema.index({ date: 1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ userEmail: 1 });
paymentSchema.index({ courseSlug: 1 });
paymentSchema.index({ companyId: 1 });
paymentSchema.index({ assignedByAdminId: 1 });

module.exports = mongoose.model("Payment", paymentSchema);
