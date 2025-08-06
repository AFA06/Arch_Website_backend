// admin/routes/users.js
const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const requireAuth = require("../../middleware/requireAuth");

// Test route
router.get("/test", (req, res) => res.send("✅ Admin Users Route is Working!"));

// ✅ Protected admin routes
router.get("/", requireAuth, userController.getUsers);
router.post("/:id/grant-course", requireAuth, userController.grantCourseAccess);
router.post("/:id/remove-course", requireAuth, userController.removeCourseAccess);



// ✅ Optional auth (add `requireAuth` if needed)
router.post("/", userController.addUser);
router.put("/:id/status", userController.toggleStatus);
router.put("/:id/premium", userController.togglePremium);
router.delete("/:id", userController.deleteUser);

module.exports = router;
