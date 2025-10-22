const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const User = require('../../models/User');
const { protect: authMiddleware } = require('../../middleware/authMiddleware');

// Configure multer for avatar upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads/avatars';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'avatar-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    // Support popular image formats
    const allowedMimeTypes = [
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/webp',
      'image/svg+xml',
      'image/heic',
      'image/heif'
    ];
    
    const allowedExtensions = /\.(jpg|jpeg|png|webp|svg|heic|heif)$/i;
    
    const isValidMimeType = allowedMimeTypes.includes(file.mimetype);
    const isValidExtension = allowedExtensions.test(file.originalname);
    
    if (isValidMimeType && isValidExtension) {
      return cb(null, true);
    } else {
      cb(new Error('Only JPG, PNG, WEBP, SVG, HEIC, and HEIF images are allowed'));
    }
  }
});

/**
 * @route   POST /api/user/profile/update
 * @desc    Update user profile (name, surname, avatar)
 * @access  Private
 */
router.post('/profile/update', authMiddleware, upload.single('avatar'), async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, surname } = req.body;

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Update fields
    if (name) user.name = name.trim();
    if (surname !== undefined) user.surname = surname.trim();

    // Handle avatar upload
    if (req.file) {
      // Delete old avatar if exists
      if (user.image && user.image.startsWith('/uploads/avatars/')) {
        const oldPath = path.join(__dirname, '../../', user.image);
        if (fs.existsSync(oldPath)) {
          try {
            fs.unlinkSync(oldPath);
          } catch (error) {
            console.warn('Could not delete old avatar:', error.message);
          }
        }
      }
      
      // Store the full URL for the image
      const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 5050}`;
      user.image = `${baseUrl}/uploads/avatars/${req.file.filename}`;
    }

    await user.save();

    // Return updated user (without password)
    const updatedUser = {
      id: user._id,
      name: user.name,
      surname: user.surname,
      email: user.email,
      image: user.image, // This now contains the full URL
      isAdmin: user.isAdmin
    };

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: updatedUser
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to update profile' 
    });
  }
});

/**
 * @route   POST /api/user/email/request-change
 * @desc    Request email change with verification code
 * @access  Private
 */
router.post('/email/request-change', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { newEmail, currentPassword } = req.body;

    if (!newEmail || !currentPassword) {
      return res.status(400).json({ 
        success: false, 
        message: 'New email and current password are required' 
      });
    }

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ 
        success: false, 
        message: 'Current password is incorrect' 
      });
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email: newEmail.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({ 
        success: false, 
        message: 'Email already in use' 
      });
    }

    // Generate verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store in temporary field (you should add these fields to User model)
    user.emailChangeRequest = {
      newEmail: newEmail.toLowerCase(),
      verificationCode: verificationCode,
      expiresAt: Date.now() + 15 * 60 * 1000 // 15 minutes
    };
    await user.save();

    // TODO: Send verification code via email
    // For development, log to console
    console.log(`Email verification code for ${newEmail}: ${verificationCode}`);

    const requestId = user._id.toString() + '-' + Date.now();

    res.status(200).json({
      success: true,
      requestId: requestId,
      message: `Verification code sent to ${newEmail}. Check your email.`
    });
  } catch (error) {
    console.error('Email change request error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to request email change' 
    });
  }
});

/**
 * @route   POST /api/user/email/confirm-change
 * @desc    Confirm email change with verification code
 * @access  Private
 */
router.post('/email/confirm-change', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ 
        success: false, 
        message: 'Verification code is required' 
      });
    }

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Check if email change request exists
    if (!user.emailChangeRequest || !user.emailChangeRequest.verificationCode) {
      return res.status(400).json({ 
        success: false, 
        message: 'No email change request found' 
      });
    }

    // Check if expired
    if (user.emailChangeRequest.expiresAt < Date.now()) {
      user.emailChangeRequest = undefined;
      await user.save();
      return res.status(400).json({ 
        success: false, 
        message: 'Verification code expired. Please request a new one.' 
      });
    }

    // Verify code
    if (user.emailChangeRequest.verificationCode !== code) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid verification code' 
      });
    }

    // Update email
    user.email = user.emailChangeRequest.newEmail;
    user.emailChangeRequest = undefined;
    await user.save();

    // Return updated user
    const updatedUser = {
      id: user._id,
      name: user.name,
      surname: user.surname,
      email: user.email,
      image: user.image,
      isAdmin: user.isAdmin
    };

    res.status(200).json({
      success: true,
      message: 'Email updated successfully',
      data: updatedUser
    });
  } catch (error) {
    console.error('Email confirm error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to confirm email change' 
    });
  }
});

/**
 * @route   POST /api/user/password/change
 * @desc    Change user password
 * @access  Private
 */
router.post('/password/change', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ 
        success: false, 
        message: 'Current password and new password are required' 
      });
    }

    // Password validation
    if (newPassword.length < 8) {
      return res.status(400).json({ 
        success: false, 
        message: 'New password must be at least 8 characters long' 
      });
    }

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ 
        success: false, 
        message: 'Current password is incorrect' 
      });
    }

    // Hash and update new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to change password' 
    });
  }
});

module.exports = router;

