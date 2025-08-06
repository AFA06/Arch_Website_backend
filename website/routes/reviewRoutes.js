const express = require('express');
const router = express.Router();
const Review = require('../../models/Review'); // Make sure the path is correct

// POST a new review
router.post('/', async (req, res) => {
  try {
    const { name, rating, feedback } = req.body;

    const newReview = new Review({
      name,
      rating,
      feedback,
      date: new Date()
    });

    await newReview.save();
    res.status(201).json({ message: 'Review submitted successfully' });
  } catch (err) {
    console.error('Error saving review:', err);
    res.status(500).json({ message: 'Failed to submit review' });
  }
});

module.exports = router;
