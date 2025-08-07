const express = require('express');
const router = express.Router();
const Video = require('../../models/Video');
const Category = require('../../models/Category');
const User = require('../../models/User');

// ✅ Existing route (can stay as-is)
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
      videos = await Video.find(filter).sort({ createdAt: -1 });
    } else {
      videos = await Video.find({ ...filter, isPreview: true }).sort({ createdAt: -1 });
    }

    res.json({ videos });
  } catch (err) {
    console.error('Video fetch error:', err);
    res.status(500).json({ message: 'Error fetching videos' });
  }
});

// ✅ NEW route: fetch by slug
router.get('/category/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const { email } = req.query;

    const category = await Category.findOne({ slug });
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    let user = null;
    if (email) {
      user = await User.findOne({ email });
    }

    const hasAccess = user && user.purchasedCourses?.includes(category.slug);

    const filter = { category: category._id };
    if (!hasAccess) {
      filter.isPreview = true;
    }

    const videos = await Video.find(filter).sort({ createdAt: -1 });

    res.json({ videos });
  } catch (err) {
    console.error('Error fetching videos by slug:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
