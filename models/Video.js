const mongoose = require("mongoose");

const videoSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },

    description: {
      type: String,
      default: "",
    },

    instructor: {
      type: String,
      default: "Unknown",
    },

    thumbnail: {
      type: String,
      default: "", // URL to thumbnail image
    },

    duration: {
      type: String,
      default: "", // e.g., "5:24"
    },

    price: {
      type: Number,
      default: 0, // 0 = free, otherwise paid
    },

    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },

    access: {
      type: String,
      enum: ["free", "premium"],
      default: "free",
    },

    videoUrl: {
      type: String,
      required: true,
    },

    isPreview: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Video", videoSchema);
