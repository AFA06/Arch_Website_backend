const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();

// Import Routes
const videoRoutes = require("./admin/routes/videoUpload");
const publicVideoRoutes = require("./admin/routes/publicVideos");
const websiteAuthRoutes = require("./website/routes/auth");
const adminUserRoutes = require("./admin/routes/users");
const adminLoginRoutes = require("./admin/routes/auth"); // Admin login route
const adminVideoCategoryRoutes = require("./admin/routes/videoCategories");
const paymentsRoutes = require("./admin/routes/payments"); // ✅ Correct path



const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// ✅ Route Mounts

// Public Website
app.use("/api/videos", publicVideoRoutes);
app.use("/api/auth", websiteAuthRoutes); // Website auth (if used)

// Admin Panel
app.use("/api/admin/videos", videoRoutes);
app.use("/api/admin/users", adminUserRoutes);
app.use("/api/admin/auth", adminLoginRoutes); // ✅ Admin login route on separate path
app.use("/api/admin/video-categories", adminVideoCategoryRoutes);
app.use("/api/admin/payments", paymentsRoutes);


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
