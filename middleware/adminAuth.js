// backend/middleware/adminAuth.js
const jwt = require("jsonwebtoken");

/**
 * Admin authentication middleware - for admin panel routes
 * Uses dummy admin credentials, no database lookup required
 */
const adminAuth = async (req, res, next) => {
  let token;

  // Check for token in headers
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      // Get token from header (format: "Bearer TOKEN")
      token = req.headers.authorization.split(" ")[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key");

      // Check if it's an admin token
      if (decoded.isAdmin === true) {
        // Set admin user object with role information
        req.user = {
          id: decoded.id,
          email: decoded.email,
          isAdmin: true,
          adminRole: decoded.adminRole || 'main', // default to 'main' for backward compatibility
          companyId: decoded.companyId || null
        };
        next();
      } else {
        return res.status(403).json({
          success: false,
          message: "Not authorized as admin",
        });
      }
    } catch (error) {
      console.error("Admin auth middleware error:", error);
      return res.status(401).json({
        success: false,
        message: "Not authorized, token failed",
      });
    }
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Not authorized, no token",
    });
  }
};

module.exports = { adminAuth };
