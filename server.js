// server.js
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();

// Import Routes
const adminCategoryRoutes = require("./admin/routes/adminRoutes");
const videoRoutes = require("./admin/routes/videoUpload");
const publicVideoRoutes = require("./admin/routes/publicVideos");
const websiteAuthRoutes = require("./website/routes/auth");
const userProfileRoutes = require("./website/routes/userProfile");
const adminUserRoutes = require("./admin/routes/users");
const adminLoginRoutes = require("./admin/routes/auth");
const adminVideoCategoryRoutes = require("./admin/routes/videoCategories");
const paymentsRoutes = require("./admin/routes/payments");
const contactRoutes = require("./website/routes/contact");
const courseRoutes = require("./website/routes/courseRoutes");
const adminCourseRoutes = require("./admin/routes/courses"); // Admin course management
const adminDashboardRoutes = require("./admin/routes/dashboard");
const announcementRoutes = require("./admin/routes/announcementRoutes");

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Serve static files (uploads)
app.use("/uploads", express.static("uploads"));

// ✅ Route Mounts

// Public Website
app.use("/api/videos", publicVideoRoutes);
app.use("/api/auth", websiteAuthRoutes);
app.use("/api/user", userProfileRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/courses", courseRoutes);

// Admin Panel
app.use("/api/admin", adminCategoryRoutes);
app.use("/api/admin/videos", videoRoutes);
app.use("/api/admin/users", adminUserRoutes);
app.use("/api/admin/auth", adminLoginRoutes);
app.use("/api/admin/video-categories", adminVideoCategoryRoutes);
app.use("/api/admin/payments", paymentsRoutes);
app.use("/api/admin/courses", adminCourseRoutes); // Admin course management
app.use("/api/admin/dashboard", adminDashboardRoutes);
app.use("/api/admin/announcements", announcementRoutes);


// Health Check
app.get("/ping", (req, res) => res.send("pong"));

// MongoDB Connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// Start Server
const PORT = process.env.PORT || 5050;
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
