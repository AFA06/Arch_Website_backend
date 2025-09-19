const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  surname: { type: String, trim: true }, // ✅ now optional
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: { type: String, required: true },
  isAdmin: { type: Boolean, default: false },
  status: {
    type: String,
    enum: ["active", "suspended"],
    default: "active",
  },
  resetCode: { type: String, default: null },
  resetCodeExpiry: { type: Date, default: null },

  purchasedCourses: {
    type: [String],
    default: [],
  },
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
