const mongoose = require("mongoose");
const slugify = require("slugify"); // ✅ install this if not already

const CategorySchema = new mongoose.Schema({
  title: { type: String, required: true, unique: true },
  slug: { type: String, required: true, unique: true }, // ✅ new field
  description: { type: String, required: true },
  price: { type: Number, required: true },
  thumbnailUrl: { type: String, required: true },
}, { timestamps: true });

// ✅ Auto-generate slug from title
CategorySchema.pre("validate", function (next) {
  if (this.title && !this.slug) {
    this.slug = slugify(this.title, { lower: true, strict: true });
  }
  next();
});

module.exports = mongoose.model("Category", CategorySchema);
