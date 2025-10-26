// backend/middleware/roleAuth.js
const roleAuth = (allowedRoles = []) => {
  return (req, res, next) => {
    try {
      // Check if user is authenticated and is admin
      if (!req.user || !req.user.isAdmin) {
        return res.status(403).json({
          success: false,
          message: "Admin access required",
        });
      }

      // If no specific roles required, allow any admin
      if (allowedRoles.length === 0) {
        return next();
      }

      // Check if user's role is in allowed roles
      if (!allowedRoles.includes(req.user.adminRole)) {
        return res.status(403).json({
          success: false,
          message: "Insufficient permissions for this operation",
        });
      }

      next();
    } catch (error) {
      console.error("Role auth middleware error:", error);
      return res.status(500).json({
        success: false,
        message: "Authorization error",
      });
    }
  };
};

// Specific middleware for different access levels
const mainAdminOnly = roleAuth(['main']);
const companyAdminOnly = roleAuth(['company']);
const anyAdmin = roleAuth([]);

module.exports = {
  roleAuth,
  mainAdminOnly,
  companyAdminOnly,
  anyAdmin
};
