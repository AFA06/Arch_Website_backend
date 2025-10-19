const User = require("../../models/User");
const Course = require("../../models/Course");
const Payment = require("../../models/Payment");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");

const formatUser = (user) => ({
  id: user._id,
  name: `${user.name} ${user.surname || ""}`.trim(),
  email: user.email,
  purchasedCourses: user.purchasedCourses || [],
  status: user.status,
  joinDate: user.createdAt,
});

// ✅ Get users
exports.getUsers = async (req, res) => {
  try {
    const { search, status, plan } = req.query;
    const query = { isAdmin: false };

    if (search) {
      const regex = new RegExp(search, "i");
      query.$or = [{ name: regex }, { surname: regex }, { email: regex }];
    }

    if (status) query.status = status;
    if (plan === "premium") {
      query.purchasedCourses = { $exists: true, $ne: [] };
    } else if (plan === "free") {
      query.purchasedCourses = { $eq: [] };
    }

    const users = await User.find(query).sort({ createdAt: -1 });
    res.json(users.map(formatUser));
  } catch (err) {
    console.error("❌ Error fetching users:", err);
    res.status(500).json({ error: "Failed to fetch users" });
  }
};

// ✅ Add user
exports.addUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Hash the password before saving
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      role: role || "user", // default to "user" if not provided
    });

    await newUser.save();

    // Return success and the plain password so admin can send it to the user
    res.status(201).json({
      message: "User added successfully",
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
      },
      plainPassword: password, // ⚠️ Admin should share this with the user
    });
  } catch (error) {
    console.error("❌ Error adding user:", error);
    res.status(500).json({ message: "Error adding user" });
  }
};

// ✅ Grant course access & create payment
exports.grantCourseAccess = async (req, res) => {
  try {
    const userId = req.params.id;
    const { courseId } = req.body;

    if (!courseId) {
      return res.status(400).json({ 
        success: false,
        error: "Course ID is required" 
      });
    }

    // Validate courseId
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      return res.status(400).json({ 
        success: false,
        error: "Invalid course ID" 
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ 
        success: false,
        error: "User not found" 
      });
    }

    // Find course by ID
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ 
        success: false,
        error: "Course not found" 
      });
    }

    // Check if user already has this course
    const hasAccess = user.hasCourseAccess(courseId);
    if (hasAccess) {
      return res.status(400).json({
        success: false,
        error: "User already has access to this course",
      });
    }

    // Grant access
    user.purchasedCourses.push(courseId);

    // Initialize progress tracking
    user.courseProgress.push({
      courseId: courseId,
      completedVideos: [],
      progressPercentage: 0,
      lastAccessed: new Date(),
    });

    await user.save();

    // Increment students enrolled count
    course.studentsEnrolled += 1;
    await course.save();

    // Create payment record
    const newPayment = new Payment({
      userId: user._id,
      userName: `${user.name} ${user.surname || ""}`.trim(),
      userEmail: user.email,
      courseSlug: course.slug,
      courseTitle: course.title,
      amount: course.price,
      method: "Telegram",
      status: "completed",
      date: new Date(),
    });

    await newPayment.save();

    return res.json({
      success: true,
      message: `Course "${course.title}" assigned to ${user.name} successfully`,
      data: {
        userId: user._id,
        courseId: course._id,
        courseName: course.title,
      },
    });
  } catch (err) {
    console.error("❌ grantCourseAccess error:", err);
    return res.status(500).json({ 
      success: false,
      error: "Server error while granting course access" 
    });
  }
};


// ✅ Remove course access
exports.removeCourseAccess = async (req, res) => {
  try {
    const { id } = req.params;
    const { courseId } = req.body;

    if (!courseId) {
      return res.status(400).json({ 
        success: false,
        error: "Course ID is required" 
      });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ 
        success: false,
        error: "User not found" 
      });
    }

    // Remove course from purchasedCourses
    user.purchasedCourses = user.purchasedCourses.filter(
      (cId) => cId.toString() !== courseId.toString()
    );

    // Remove course progress
    user.courseProgress = user.courseProgress.filter(
      (progress) => progress.courseId.toString() !== courseId.toString()
    );

    await user.save();

    res.json({ 
      success: true,
      message: "Course access removed successfully",
      data: {
        userId: user._id,
        purchasedCourses: user.purchasedCourses,
      }
    });
  } catch (err) {
    console.error("❌ Remove course error:", err);
    res.status(500).json({ 
      success: false,
      error: "Server error while removing course access" 
    });
  }
};

// ✅ Toggle user status
exports.toggleStatus = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user || user.isAdmin) {
      return res.status(404).json({ error: "User not found" });
    }

    user.status = user.status === "active" ? "suspended" : "active";
    await user.save();
    res.json(formatUser(user));
  } catch (err) {
    console.error("❌ Error toggling status:", err);
    res.status(500).json({ error: "Failed to toggle status" });
  }
};

// ✅ Delete user
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user || user.isAdmin) {
      return res.status(404).json({ error: "User not found" });
    }

    await User.findByIdAndDelete(req.params.id);
    res.json({ message: "User deleted" });
  } catch (err) {
    console.error("❌ Error deleting user:", err);
    res.status(500).json({ error: "Failed to delete user" });
  }
};

// ✅ Get all available courses for assignment
exports.getAvailableCourses = async (req, res) => {
  try {
    const courses = await Course.find({ isActive: true })
      .select("_id title slug type price thumbnail")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: courses,
    });
  } catch (err) {
    console.error("❌ Error fetching courses:", err);
    res.status(500).json({ 
      success: false,
      error: "Failed to fetch courses" 
    });
  }
};
