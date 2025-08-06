// admin/routes/auth.js
const express = require("express");
const jwt = require("jsonwebtoken");
const router = express.Router();

// Dummy admin credentials
const ADMIN_EMAIL = "admin@videoadmin.com";
const ADMIN_PASSWORD = "admin123";

// POST /api/admin/auth/login
router.post("/login", (req, res) => {
  const { email, password } = req.body;

  if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
    const token = jwt.sign({ email, role: "admin" }, process.env.JWT_SECRET, {
      expiresIn: "2h",
    });

    return res.json({ token });
  } else {
    return res.status(401).json({ message: "Invalid credentials" });
  }
});

module.exports = router;
