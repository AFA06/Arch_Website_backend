// backend/models/Course.js
const mongoose = require("mongoose");

const courseSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Course title is required"],
      trim: true,
    },
    slug: {
      type: String,
      required: [true, "Course slug is required"],
      unique: true,
      trim: true,
      lowercase: true,
    },
    description: {
      type: String,
      required: [true, "Course description is required"],
      trim: true,
    },
    type: {
      type: String,
      enum: ["single", "pack"],
      required: [true, "Course type is required"],
      default: "single",
    },
    thumbnail: {
      type: String,
      required: [true, "Course thumbnail is required"],
    },
    videos: [
      {
        title: {
          type: String,
          required: true,
        },
        url: {
          type: String,
          required: true,
        },
        duration: {
          type: String,
          default: "0:00",
        },
        order: {
          type: Number,
          default: 0,
        },
      },
    ],
    price: {
      type: Number,
      required: [true, "Course price is required"],
      min: 0,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    category: {
      type: String,
      trim: true,
    },
    instructor: {
      type: String,
      trim: true,
    },
    totalDuration: {
      type: String,
      default: "0 hours",
    },
    level: {
      type: String,
      enum: ["beginner", "intermediate", "advanced"],
      default: "beginner",
    },
    studentsEnrolled: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
courseSchema.index({ slug: 1 });
courseSchema.index({ type: 1 });
courseSchema.index({ isActive: 1 });

// Virtual for video count
courseSchema.virtual("videoCount").get(function () {
  return this.videos ? this.videos.length : 0;
});

// Ensure virtuals are included in JSON
courseSchema.set("toJSON", { virtuals: true });
courseSchema.set("toObject", { virtuals: true });

const Course = mongoose.model("Course", courseSchema);

module.exports = Course;

