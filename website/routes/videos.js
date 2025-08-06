const express = require('express');
const router = express.Router();
const Video = require('../../models/Video');
const User = require('../../models/User');

router.get('/', async (req, res) => {
  try {
    const { email, category } = req.query;

    const filter = {};
    if (category) filter.category = category;

    let user = null;

    if (email) {
      user = await User.findOne({ email });
    }

    let videos;

    if (user && user.purchasedCourses?.includes(category)) {
      // User has access → return all videos in this category
      videos = await Video.find(filter).sort({ createdAt: -1 });
    } else {
      // Not purchased → only return preview videos
      videos = await Video.find({ ...filter, isPreview: true }).sort({ createdAt: -1 });
    }

    res.json({ videos });
  } catch (err) {
    console.error('Video fetch error:', err);
    res.status(500).json({ message: 'Error fetching videos' });
  }
});

module.exports = router;
