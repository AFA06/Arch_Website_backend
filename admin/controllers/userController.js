const User = require("../../models/User");
const Course = require("../../models/Course");
const Payment = require("../../models/Payment");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");

const formatUser = (user) => {
  // Filter out expired courses
  const now = new Date();
  const activeCourses = user.purchasedCourses.filter(purchase =>
    purchase.courseId && purchase.expiresAt > now
  );

  return {
    id: user._id,
    name: user.name || "",
    surname: user.surname || "",
    email: user.email,
    purchasedCourses: activeCourses.map(purchase => purchase.courseId.toString()),
    status: user.status,
    createdAt: user.createdAt,
  };
};

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
    const { name, surname, email, password, role } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: "User already exists" });
    }

    // Hash the password before saving
    const hashedPassword = await bcrypt.hash(password, 10);

    // ✅ TASK 2: Save both name AND surname
    const newUser = new User({
      name,
      surname: surname || "", // Include surname field
      email,
      password: hashedPassword,
      role: role || "user", // default to "user" if not provided
      isAdmin: false,
      status: "active",
      purchasedCourses: [],
      courseProgress: [],
    });

    await newUser.save();

    // Return success with formatted user data
    res.status(201).json({
      message: "User added successfully",
      user: formatUser(newUser),
      plainPassword: password, // ⚠️ Admin should share this with the user
    });
  } catch (error) {
    console.error("❌ Error adding user:", error);
    res.status(500).json({ error: "Error adding user" });
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
        error: "User already has active access to this course",
      });
    }

    // Calculate expiration date based on course access duration
    const assignedAt = new Date();
    const accessDurationMonths = course.accessDuration || 12;
    const expiresAt = new Date(assignedAt);
    expiresAt.setMonth(expiresAt.getMonth() + accessDurationMonths);

    // Grant access with duration info
    user.purchasedCourses.push({
      courseId: courseId,
      assignedAt: assignedAt,
      accessDuration: accessDurationMonths,
      expiresAt: expiresAt
    });

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

    // Remove course from purchasedCourses (new format)
    const initialCourseCount = user.purchasedCourses.length;
    user.purchasedCourses = user.purchasedCourses.filter(
      (purchase) => purchase.courseId.toString() !== courseId.toString()
    );

    // Remove course progress
    user.courseProgress = user.courseProgress.filter(
      (progress) => progress.courseId.toString() !== courseId.toString()
    );

    // Decrement course enrollment count
    const course = await Course.findById(courseId);
    if (course) {
      course.studentsEnrolled = Math.max(0, course.studentsEnrolled - 1);
      await course.save();
    }

    await user.save();

    res.json({
      success: true,
      message: "Course access removed successfully",
      data: {
        userId: user._id,
        coursesRemoved: initialCourseCount - user.purchasedCourses.length,
        purchasedCourses: formatUser(user).purchasedCourses,
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

    const newStatus = user.status === "active" ? "suspended" : "active";

    // Update only the status field
    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { status: newStatus },
      { new: true, runValidators: false }
    );

    res.json(formatUser(updatedUser));
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
