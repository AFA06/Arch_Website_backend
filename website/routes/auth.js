const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const rateLimit = require('express-rate-limit');

const User = require('../../models/User');
const JWT_SECRET = process.env.JWT_SECRET;

// ✅ Rate limiter
const resetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Juda ko‘p so‘rovlar. Iltimos, keyinroq urinib ko‘ring.',
});

// ✅ Nodemailer setup
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ✅ Signup
router.post('/signup', async (req, res) => {
  const { name, surname, email, password, gender } = req.body;

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(409).json({ message: 'Email ro‘yxatdan o‘tgan' });

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      name,
      surname,
      email,
      password: hashedPassword,
      gender,
    });

    await newUser.save();
    res.status(201).json({ message: 'Foydalanuvchi muvaffaqiyatli ro‘yxatdan o‘tdi' });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ message: 'Ro‘yxatdan o‘tishda server xatosi' });
  }
});

// ✅ Login (Updated to return user object)
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user)
      return res.status(401).json({ message: 'Email yoki parol noto‘g‘ri' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(401).json({ message: 'Email yoki parol noto‘g‘ri' });

    const token = jwt.sign(
      { userId: user._id, email: user.email, isAdmin: user.isAdmin },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // ✅ Return user object with token
    res.status(200).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        surname: user.surname,
        email: user.email,
        isAdmin: user.isAdmin,
      },
      message: 'Kirish muvaffaqiyatli amalga oshirildi',
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Kirishda server xatosi' });
  }
});

// ✅ Send Reset Code
router.post('/send-reset-code', resetLimiter, async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user)
      return res.status(404).json({ message: 'Foydalanuvchi topilmadi' });

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    user.resetCode = code;
    user.resetCodeExpiry = Date.now() + 15 * 60 * 1000;
    await user.save();

    const mailOptions = {
      from: `"Architecture Site" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Parolni tiklash kodi',
      text: `Salom!\n\nParolni tiklash kodingiz: ${code}\n\nKod 15 daqiqada tugaydi. Agar bu siz bo‘lmasangiz, bu xabarni e’tiborsiz qoldiring.\n\nHurmat bilan,\nArchitecture Team`,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error('Email send error:', error);
        return res.status(500).json({ message: 'Email yuborishda xatolik yuz berdi' });
      }
      res.status(200).json({ message: `Kod ${email} manziliga yuborildi` });
    });
  } catch (err) {
    console.error('Send reset code error:', err);
    res.status(500).json({ message: 'Kod yuborishda server xatosi' });
  }
});

// ✅ Verify Reset Code
router.post('/verify-reset-code', async (req, res) => {
  const { email, code } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user || user.resetCode !== code) {
      return res.status(400).json({ message: 'Noto‘g‘ri kod. Qayta urinib ko‘ring.' });
    }

    if (user.resetCodeExpiry < Date.now()) {
      return res.status(400).json({ message: 'Kod muddati tugagan. Yangi kod so‘rashingiz mumkin.' });
    }

    res.status(200).json({ message: 'Kod tasdiqlandi' });
  } catch (err) {
    console.error('Verify code error:', err);
    res.status(500).json({ message: 'Serverda xatolik yuz berdi' });
  }
});

// ✅ Reset Password
router.post('/reset-password', async (req, res) => {
  const { email, code, newPassword } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user || user.resetCode !== code) {
      return res.status(400).json({ message: 'Kod noto‘g‘ri. Qayta urinib ko‘ring.' });
    }

    if (user.resetCodeExpiry < Date.now()) {
      return res.status(400).json({ message: 'Kod muddati tugagan. Yangi kod so‘rashingiz mumkin.' });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.resetCode = undefined;
    user.resetCodeExpiry = undefined;
    await user.save();

    res.status(200).json({ message: 'Parol muvaffaqiyatli tiklandi' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ message: 'Parolni tiklashda server xatosi' });
  }
});

module.exports = router;
