// backend/website/controllers/courseController.js
const Course = require("../../models/Course");
const User = require("../../models/User");
const mongoose = require("mongoose");

/**
 * @desc    Get logged-in user's purchased courses
 * @route   GET /api/courses/my-courses
 * @access  Private
 */
const getMyCourses = async (req, res) => {
  try {
    const userId = req.user._id;

    // Find user and populate purchased courses
    const user = await User.findById(userId).populate({
      path: "purchasedCourses",
      match: { isActive: true }, // Only return active courses
      select: "title slug description type thumbnail videos price totalDuration category",
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Enhance courses with progress information
    const coursesWithProgress = user.purchasedCourses.map((course) => {
      const courseProgress = user.courseProgress.find(
        (progress) => progress.courseId.toString() === course._id.toString()
      );

      return {
        id: course._id,
        title: course.title,
        slug: course.slug,
        type: course.type,
        thumbnail: course.thumbnail,
        videoCount: course.videos ? course.videos.length : 0,
        duration: course.totalDuration,
        progress: courseProgress ? courseProgress.progressPercentage : 0,
        lastAccessed: courseProgress ? courseProgress.lastAccessed : null,
        description: course.description,
        category: course.category,
      };
    });

    // Sort by last accessed (most recent first)
    coursesWithProgress.sort((a, b) => {
      if (!a.lastAccessed && !b.lastAccessed) return 0;
      if (!a.lastAccessed) return 1;
      if (!b.lastAccessed) return -1;
      return new Date(b.lastAccessed) - new Date(a.lastAccessed);
    });

    res.status(200).json({
      success: true,
      count: coursesWithProgress.length,
      data: coursesWithProgress,
    });
  } catch (error) {
    console.error("Get my courses error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching courses",
      error: error.message,
    });
  }
};

/**
 * @desc    Get course details by slug
 * @route   GET /api/courses/:slug
 * @access  Private
 */
const getCourseBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const userId = req.user._id;

    // Find the course by slug
    const course = await Course.findOne({ slug, isActive: true });

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    // Check if user has access to this course
    const user = await User.findById(userId);
    const hasAccess = user.hasCourseAccess(course._id);

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: "You do not have access to this course",
      });
    }

    // Get user's progress for this course
    const courseProgress = user.courseProgress.find(
      (progress) => progress.courseId.toString() === course._id.toString()
    );

    // Prepare course data
    const courseData = {
      id: course._id,
      title: course.title,
      slug: course.slug,
      description: course.description,
      type: course.type,
      thumbnail: course.thumbnail,
      category: course.category,
      instructor: course.instructor,
      level: course.level,
      totalDuration: course.totalDuration,
      videos: course.videos.map((video, index) => ({
        id: video._id,
        title: video.title,
        url: video.url,
        duration: video.duration,
        order: video.order || index,
        isCompleted: courseProgress
          ? courseProgress.completedVideos.includes(video._id.toString())
          : false,
      })),
      progress: {
        percentage: courseProgress ? courseProgress.progressPercentage : 0,
        completedVideos: courseProgress ? courseProgress.completedVideos : [],
        lastWatchedVideo: courseProgress ? courseProgress.lastWatchedVideo : null,
        lastAccessed: courseProgress ? courseProgress.lastAccessed : null,
      },
    };

    // Update last accessed time
    await User.findOneAndUpdate(
      { _id: userId, "courseProgress.courseId": course._id },
      { $set: { "courseProgress.$.lastAccessed": new Date() } }
    );

    res.status(200).json({
      success: true,
      data: courseData,
    });
  } catch (error) {
    console.error("Get course by slug error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching course",
      error: error.message,
    });
  }
};

/**
 * @desc    Get all courses (public/admin)
 * @route   GET /api/courses
 * @access  Public/Private
 */
const getAllCourses = async (req, res) => {
  try {
    const { category, type, search } = req.query;

    // Build query
    const query = { isActive: true };

    if (category) {
      query.category = category;
    }

    if (type) {
      query.type = type;
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    const courses = await Course.find(query)
      .select("-videos.url") // Don't expose video URLs publicly
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: courses.length,
      data: courses,
    });
  } catch (error) {
    console.error("Get all courses error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching courses",
      error: error.message,
    });
  }
};

/**
 * @desc    Assign course to user (admin only)
 * @route   POST /api/courses/assign
 * @access  Private/Admin
 */
const assignCourseToUser = async (req, res) => {
  try {
    const { userId, courseId } = req.body;

    // Validate IDs
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid course ID",
      });
    }

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check if course exists
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    // Check if user already has this course
    if (user.hasCourseAccess(courseId)) {
      return res.status(400).json({
        success: false,
        message: "User already has access to this course",
      });
    }

    // Add course to user's purchased courses
    user.purchasedCourses.push(courseId);

    // Initialize progress tracking
    user.courseProgress.push({
      courseId: courseId,
      completedVideos: [],
      progressPercentage: 0,
      lastAccessed: new Date(),
    });

    // Increment students enrolled count
    course.studentsEnrolled += 1;

    await user.save();
    await course.save();

    res.status(200).json({
      success: true,
      message: "Course assigned to user successfully",
      data: {
        userId: user._id,
        courseId: course._id,
        courseName: course.title,
      },
    });
  } catch (error) {
    console.error("Assign course error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while assigning course",
      error: error.message,
    });
  }
};

/**
 * @desc    Update course progress
 * @route   PUT /api/courses/:slug/progress
 * @access  Private
 */
const updateCourseProgress = async (req, res) => {
  try {
    const { slug } = req.params;
    const { videoId, isCompleted } = req.body;
    const userId = req.user._id;

    // Find the course
    const course = await Course.findOne({ slug });
    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    // Check if user has access
    const user = await User.findById(userId);
    if (!user.hasCourseAccess(course._id)) {
      return res.status(403).json({
        success: false,
        message: "You do not have access to this course",
      });
    }

    // Find or create progress entry
    let progressIndex = user.courseProgress.findIndex(
      (progress) => progress.courseId.toString() === course._id.toString()
    );

    if (progressIndex === -1) {
      // Create new progress entry
      user.courseProgress.push({
        courseId: course._id,
        completedVideos: [],
        progressPercentage: 0,
        lastAccessed: new Date(),
      });
      progressIndex = user.courseProgress.length - 1;
    }

    const progress = user.courseProgress[progressIndex];

    // Update completed videos
    if (isCompleted) {
      if (!progress.completedVideos.includes(videoId)) {
        progress.completedVideos.push(videoId);
      }
    } else {
      progress.completedVideos = progress.completedVideos.filter(
        (id) => id !== videoId
      );
    }

    // Update last watched video
    progress.lastWatchedVideo = videoId;

    // Calculate progress percentage
    const totalVideos = course.videos.length;
    const completedCount = progress.completedVideos.length;
    progress.progressPercentage = Math.round((completedCount / totalVideos) * 100);

    // Update last accessed
    progress.lastAccessed = new Date();

    await user.save();

    res.status(200).json({
      success: true,
      message: "Progress updated successfully",
      data: {
        progressPercentage: progress.progressPercentage,
        completedVideos: progress.completedVideos.length,
        totalVideos: totalVideos,
      },
    });
  } catch (error) {
    console.error("Update progress error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while updating progress",
      error: error.message,
    });
  }
};

/**
 * @desc    Create new course (admin only)
 * @route   POST /api/courses
 * @access  Private/Admin
 */
const createCourse = async (req, res) => {
  try {
    const courseData = req.body;

    // Check if slug already exists
    const existingCourse = await Course.findOne({ slug: courseData.slug });
    if (existingCourse) {
      return res.status(400).json({
        success: false,
        message: "Course with this slug already exists",
      });
    }

    const course = await Course.create(courseData);

    res.status(201).json({
      success: true,
      message: "Course created successfully",
      data: course,
    });
  } catch (error) {
    console.error("Create course error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while creating course",
      error: error.message,
    });
  }
};

/**
 * @desc    Update course (admin only)
 * @route   PUT /api/courses/:id
 * @access  Private/Admin
 */
const updateCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const course = await Course.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Course updated successfully",
      data: course,
    });
  } catch (error) {
    console.error("Update course error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while updating course",
      error: error.message,
    });
  }
};

/**
 * @desc    Delete course (admin only)
 * @route   DELETE /api/courses/:id
 * @access  Private/Admin
 */
const deleteCourse = async (req, res) => {
  try {
    const { id } = req.params;

    const course = await Course.findByIdAndDelete(id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Course deleted successfully",
    });
  } catch (error) {
    console.error("Delete course error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while deleting course",
      error: error.message,
    });
  }
};

module.exports = {
  getMyCourses,
  getCourseBySlug,
  getAllCourses,
  assignCourseToUser,
  updateCourseProgress,
  createCourse,
  updateCourse,
  deleteCourse,
};

