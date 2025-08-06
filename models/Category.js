// models/Category.js

const mongoose = require("mongoose");

const CategorySchema = new mongoose.Schema({
  title: { type: String, required: true, unique: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  thumbnailUrl: { type: String, required: true },
}, { timestamps: true });

module.exports = mongoose.model("Category", CategorySchema);
