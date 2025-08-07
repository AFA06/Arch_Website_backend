const User = require("../../models/User");
const Category = require("../../models/Category");
const Payment = require("../../models/Payment");

const validCourseSlugs = [
  "3d-design",
  "figma",
  "direction",
  "web-dev",
  "animation",
  "branding"
];


const formatUser = (user) => ({
  id: user._id,
  name: `${user.name} ${user.surname}`,
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
    const { name, surname, email, password } = req.body;

    if (!name || !surname || !email || !password) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ error: "Email already exists" });

    const newUser = new User({
      name,
      surname,
      email,
      password,
      isAdmin: false,
      status: "active",
      purchasedCourses: [],
    });

    await newUser.save();
    res.status(201).json(formatUser(newUser));
  } catch (err) {
    console.error("❌ Error adding user:", err);
    res.status(500).json({ error: "Failed to add user" });
  }
};

// ✅ Grant course access & create payment
exports.grantCourseAccess = async (req, res) => {
  try {
    const userId = req.params.id;
    const { courseSlug } = req.body;

    if (!courseSlug || typeof courseSlug !== "string") {
      return res.status(400).json({ error: "Course slug must be a valid string" });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    // 🔥 Find course by slug (not title)
    const course = await Category.findOne({ slug: courseSlug });
    if (!course) return res.status(404).json({ error: "Course not found in Category" });

    // Grant access if not already granted
    if (!Array.isArray(user.purchasedCourses)) {
      user.purchasedCourses = [];
    }

    let accessGranted = false;
    if (!user.purchasedCourses.includes(courseSlug)) {
      user.purchasedCourses.push(courseSlug);
      await user.save();
      accessGranted = true;

      // Create payment record
      const newPayment = new Payment({
        userId: user._id,
        userName: `${user.name} ${user.surname}`,
        userEmail: user.email,
        courseSlug,
        courseTitle: course.title,
        amount: course.price,
        method: "Telegram",
        status: "completed",
        date: new Date(),
      });

      await newPayment.save();
    }

    return res.json({
      message: accessGranted
        ? `✅ Access to '${courseSlug}' granted and payment recorded.`
        : `ℹ️ User already has access to '${courseSlug}'.`,
    });
  } catch (err) {
    console.error("❌ grantCourseAccess error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};


// ✅ Remove course access
exports.removeCourseAccess = async (req, res) => {
  try {
    const { id } = req.params;
    const { courseSlug } = req.body;

    if (!courseSlug) {
      return res.status(400).json({ error: "Course slug is required" });
    }

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ error: "User not found" });

    user.purchasedCourses = user.purchasedCourses.filter(slug => slug !== courseSlug);
    await user.save();

    res.json({ message: "Course access removed", purchasedCourses: user.purchasedCourses });
  } catch (err) {
    console.error("❌ Remove course error:", err);
    res.status(500).json({ error: "Server error while removing course access" });
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

// ✅ Toggle all course access (premium)
exports.togglePremium = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user || user.isAdmin) {
      return res.status(404).json({ error: "User not found" });
    }

    if (user.purchasedCourses.length === validCourseSlugs.length) {
      user.purchasedCourses = [];
    } else {
      user.purchasedCourses = validCourseSlugs;
    }

    await user.save();
    res.json(formatUser(user));
  } catch (err) {
    console.error("❌ Error toggling premium:", err);
    res.status(500).json({ error: "Failed to toggle premium" });
  }
};
