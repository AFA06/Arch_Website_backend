const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  surname: { type: String, required: true, trim: true },
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

  // ✅ Tracks specific purchased course slugs
  purchasedCourses: {
    type: [String], // e.g., ['3d-design', 'direction']
    default: [],
  },
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
