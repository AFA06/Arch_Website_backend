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
  image: { type: String, default: null },
  
  // Email change verification
  emailChangeRequest: {
    newEmail: { type: String },
    verificationCode: { type: String },
    expiresAt: { type: Date }
  },

  // Course access - Store course IDs as ObjectId references
  purchasedCourses: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course'
  }],
  
  // Course progress tracking
  courseProgress: [{
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true
    },
    completedVideos: [{
      type: String, // Video IDs
      default: []
    }],
    lastWatchedVideo: {
      type: String,
      default: null
    },
    progressPercentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    lastAccessed: {
      type: Date,
      default: Date.now
    }
  }]
}, { timestamps: true });

// Method to check if user has access to a course
userSchema.methods.hasCourseAccess = function(courseId) {
  return this.purchasedCourses.some(
    course => course.toString() === courseId.toString()
  );
};

module.exports = mongoose.model('User', userSchema);
