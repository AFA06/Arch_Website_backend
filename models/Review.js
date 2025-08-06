const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  name: { type: String, required: true },
  rating: { type: Number, required: true },
  feedback: { type: String, required: true },
  date: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Review', reviewSchema);
