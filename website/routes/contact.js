// backend/website/routes/contact.js
const express = require("express");
const nodemailer = require("nodemailer");

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const { name, email, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({ error: "All fields are required" });
    }

    // ✅ Gmail transporter
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER, // from .env
        pass: process.env.EMAIL_PASS, // app password from Gmail
      },
    });

    // ✅ Email content
    const mailOptions = {
      from: `"Website Contact" <${process.env.EMAIL_USER}>`,
      to: "architectsnex@gmail.com", // receiver email
      subject: "📩 New Contact Form Submission",
      html: `
        <h2>New Contact Request</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Message:</strong></p>
        <p>${message}</p>
      `,
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({ success: true, message: "Message sent successfully!" });
  } catch (err) {
    console.error("❌ Contact form error:", err);
    res.status(500).json({ error: "Something went wrong. Please try again later." });
  }
});

module.exports = router;
