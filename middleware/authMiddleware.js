// backend/middleware/authMiddleware.js
const jwt = require("jsonwebtoken");
const User = require("../models/User");

/**
 * Protect routes - require authentication
 */
const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    try {
      token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key");

      req.user = await User.findById(decoded.id).select("-password");

      if (!req.user) {
        return res.status(401).json({ success: false, message: "User not found" });
      }

      if (req.user.status === "suspended") {
        return res.status(401).json({ success: false, message: "User account is suspended" });
      }

      next();
    } catch (error) {
      console.error("Auth middleware error:", error);
      return res.status(401).json({ success: false, message: "Not authorized, token failed" });
    }
  } else {
    return res.status(401).json({ success: false, message: "Not authorized, no token" });
  }
};

/**
 * Admin authorization middleware
 */
const verifyAdmin = (req, res, next) => {
  if (req.user && req.user.isAdmin === true) {
    next();
  } else {
    res.status(403).json({ success: false, message: "Not authorized as admin" });
  }
};

/**
 * Optional auth - doesn't fail if no token, just sets req.user if available
 */
const optionalAuth = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    try {
      token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key");
      req.user = await User.findById(decoded.id).select("-password");
    } catch (error) {
      req.user = null;
    }
  }

  next();
};

// ✅ Export with alias for admin to preserve old routes
module.exports = { protect, verifyAdmin, admin: verifyAdmin, optionalAuth };
