const Review = require('../../models/Review');

// Create a new review
exports.createReview = async (req, res) => {
  try {
    const { rating, feedback } = req.body;

    const newReview = new Review({
      name: 'Guest User', // you can integrate auth later
      rating,
      feedback
    });

    const savedReview = await newReview.save();
    // Log the action (optional, can be integrated later)
    res.status(201).json(savedReview);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create review' });
  }
};

// Get all reviews
exports.getAllReviews = async (req, res) => {
  try {
    const reviews = await Review.find().sort({ date: -1 });
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
};

// Get average rating
exports.getAverageRating = async (req, res) => {
  try {
    const reviews = await Review.find();
    const avgRating =
      reviews.reduce((sum, r) => sum + r.rating, 0) / (reviews.length || 1);
    res.json(avgRating);
  } catch (err) {
    res.status(500).json({ error: 'Failed to calculate average rating' });
  }
};

// Get review by ID
exports.getReviewById = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    review ? res.json(review) : res.status(404).json({ message: 'Not found' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// Update review
exports.updateReview = async (req, res) => {
  try {
    const { name, rating, feedback } = req.body;
    const updated = await Review.findByIdAndUpdate(
      req.params.id,
      { name, rating, feedback },
      { new: true }
    );
    updated
      ? res.json(updated)
      : res.status(404).json({ message: 'Review not found' });
  } catch (err) {
    res.status(500).json({ error: 'Update failed' });
  }
};

// Delete review
exports.deleteReview = async (req, res) => {
  try {
    await Review.findByIdAndDelete(req.params.id);
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: 'Delete failed' });
  }
};
