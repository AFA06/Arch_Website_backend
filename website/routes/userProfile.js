const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const nodemailer = require('nodemailer');
const User = require('../../models/User');
const { protect: authMiddleware } = require('../../middleware/authMiddleware');

// Email transporter setup (same as auth.js)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

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
 * @route   GET /api/user/profile
 * @desc    Get user profile
 * @access  Private
 */
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    // Find user and populate purchased courses
    const user = await User.findById(userId).populate({
      path: 'purchasedCourses.courseId',
      select: 'title slug category type'
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Return updated user (without password) with active courses only
    const now = new Date();
    const activeCourses = user.purchasedCourses.filter(purchase =>
      purchase.courseId && purchase.expiresAt > now
    );

    const userData = {
      id: user._id,
      name: user.name,
      surname: user.surname,
      email: user.email,
      image: user.image,
      isAdmin: user.isAdmin,
      purchasedCourses: activeCourses.map(purchase => purchase.courseId._id.toString())
    };

    res.status(200).json({
      success: true,
      data: userData
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch profile'
    });
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

    // Build update object with only the fields we want to update
    const updateFields = {};

    if (name) updateFields.name = name.trim();
    if (surname !== undefined) updateFields.surname = surname.trim();

    // Handle avatar upload
    if (req.file) {
      // Delete old avatar if exists
      const user = await User.findById(userId);
      if (user && user.image && user.image.startsWith('/uploads/avatars/')) {
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
      updateFields.image = `${baseUrl}/uploads/avatars/${req.file.filename}`;
    }

    // Use findByIdAndUpdate to only update specific fields and avoid validation issues
    const user = await User.findByIdAndUpdate(
      userId,
      updateFields,
      {
        new: true, // Return updated document
        runValidators: false, // Skip validation for partial updates
        select: 'name surname email image isAdmin' // Only select fields we care about
      }
    );

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

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

    // Store in temporary field
    const emailChangeRequest = {
      newEmail: newEmail.toLowerCase(),
      verificationCode: verificationCode,
      expiresAt: Date.now() + 15 * 60 * 1000 // 15 minutes
    };

    // Update only the emailChangeRequest field
    await User.findByIdAndUpdate(userId, {
      emailChangeRequest: emailChangeRequest
    }, { runValidators: false });

    // Send verification code via email
    const mailOptions = {
      from: `"Architecture Academy" <${process.env.EMAIL_USER}>`,
      to: newEmail.toLowerCase(),
      subject: 'Email Change Verification Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Architecture Academy</h1>
            <p style="color: #e8e8e8; margin: 10px 0 0 0;">Email Change Verification</p>
          </div>

          <div style="background: #f8f9fa; padding: 30px; border: 1px solid #dee2e6; border-radius: 0 0 10px 10px;">
            <h2 style="color: #333; margin: 0 0 20px 0;">Verify Your New Email Address</h2>

            <p style="color: #666; line-height: 1.6; margin: 0 0 20px 0;">
              Hello <strong>${user.name}</strong>,
            </p>

            <p style="color: #666; line-height: 1.6; margin: 0 0 25px 0;">
              You have requested to change your email address to <strong>${newEmail}</strong>.
              Please use the verification code below to complete this process:
            </p>

            <div style="background: #667eea; color: white; padding: 20px; border-radius: 8px; text-align: center; margin: 25px 0;">
              <h1 style="margin: 0; font-size: 32px; letter-spacing: 3px; font-family: 'Courier New', monospace;">
                ${verificationCode}
              </h1>
            </div>

            <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 5px; padding: 15px; margin: 20px 0;">
              <p style="color: #856404; margin: 0; font-size: 14px;">
                <strong>Security Note:</strong> This code will expire in 15 minutes. If you didn't request this change, please ignore this email.
              </p>
            </div>

            <p style="color: #666; line-height: 1.6; margin: 20px 0 0 0;">
              Best regards,<br>
              <strong>The Architecture Academy Team</strong>
            </p>
          </div>
        </div>
      `,
      text: `Hello ${user.name},

You have requested to change your email address to ${newEmail}.

Please use the following verification code to complete this process:

Verification Code: ${verificationCode}

This code will expire in 15 minutes. If you didn't request this change, please ignore this email.

Best regards,
The Architecture Academy Team`
    };

    // Send email
    try {
      await transporter.sendMail(mailOptions);
    } catch (emailError) {
      console.error('Email send error:', emailError);
      // Clear the request if email fails
      await User.findByIdAndUpdate(userId, {
        emailChangeRequest: undefined
      }, { runValidators: false });
      return res.status(500).json({
        success: false,
        message: 'Failed to send verification email. Please try again.'
      });
    }

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
      await User.findByIdAndUpdate(userId, {
        emailChangeRequest: undefined
      }, { runValidators: false });
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

    // Update email and clear request
    await User.findByIdAndUpdate(userId, {
      email: user.emailChangeRequest.newEmail,
      emailChangeRequest: undefined
    }, { runValidators: false });

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

    // Update only the password field
    await User.findByIdAndUpdate(userId, {
      password: hashedPassword
    }, { runValidators: false });

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

