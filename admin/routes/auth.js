// admin/routes/auth.js
const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const router = express.Router();
const User = require("../../models/User");

// ✅ Static Main Admin Credentials
const MAIN_ADMIN = {
  name: "Abdulazim",
  email: "abdukarimovabdulazimxon001@gmail.com",
  password: "TopomisanIshonvur$Topib12KorchiYellowgrass123$",
  isAdmin: true
};

// ✅ Auto-initialize main admin account on server start
const initializeMainAdmin = async () => {
  try {
    const existingAdmin = await User.findOne({ email: MAIN_ADMIN.email });
    
    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash(MAIN_ADMIN.password, 10);
      
      const newAdmin = new User({
        name: MAIN_ADMIN.name,
        surname: "",
        email: MAIN_ADMIN.email,
        password: hashedPassword,
        isAdmin: true,
        status: "active",
        purchasedCourses: [],
        courseProgress: [],
      });
      
      await newAdmin.save();
      console.log("✅ Main admin account created successfully");
    } else {
      console.log("✅ Main admin account already exists");
    }
  } catch (error) {
    console.error("❌ Error initializing main admin:", error);
  }
};

// Initialize admin on module load
initializeMainAdmin();

// POST /api/admin/auth/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find admin user in database
    const admin = await User.findOne({ email, isAdmin: true });

    if (!admin) {
      return res.status(401).json({ 
        success: false,
        message: "Invalid credentials" 
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, admin.password);

    if (!isPasswordValid) {
      return res.status(401).json({ 
        success: false,
        message: "Invalid credentials" 
      });
    }

    // Create JWT token
    const token = jwt.sign(
      { 
        id: admin._id,
        email: admin.email, 
        isAdmin: true 
      }, 
      process.env.JWT_SECRET || "your-secret-key", 
      {
        expiresIn: "24h",
      }
    );

    return res.json({ 
      success: true,
      token,
      user: {
        id: admin._id,
        email: admin.email,
        name: admin.name,
        isAdmin: true
      }
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ 
      success: false,
      message: "Server error during login" 
    });
  }
});

module.exports = router;
