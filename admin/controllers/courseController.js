// admin/controllers/courseController.js
const Course = require("../../models/Course");
const slugify = require("slugify");
const fs = require("fs");
const path = require("path");

/**
 * @desc    Get all courses (admin view)
 * @route   GET /api/admin/courses
 * @access  Private/Admin
 */
exports.getAllCourses = async (req, res) => {
  try {
    const { type, search } = req.query;
    const query = {};

    if (type) {
      query.type = type;
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    const courses = await Course.find(query).sort({ createdAt: -1 });

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
 * @desc    Get single course by ID
 * @route   GET /api/admin/courses/:id
 * @access  Private/Admin
 */
exports.getCourseById = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    res.status(200).json({
      success: true,
      data: course,
    });
  } catch (error) {
    console.error("Get course by ID error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching course",
      error: error.message,
    });
  }
};

/**
 * @desc    Create new course
 * @route   POST /api/admin/courses
 * @access  Private/Admin
 */
exports.createCourse = async (req, res) => {
  try {
    const {
      title,
      description,
      type,
      price,
      category,
      instructor,
      level,
      totalDuration,
      videoUrl, // For single video courses
      videoTitle, // For single video courses
      videoDuration, // For single video courses
    } = req.body;

    // Generate slug from title
    const slug = slugify(title, { lower: true, strict: true });

    // Check if slug already exists
    const existingCourse = await Course.findOne({ slug });
    if (existingCourse) {
      return res.status(400).json({
        success: false,
        message: "Course with this title already exists",
      });
    }

    // Handle thumbnail upload
    let thumbnailPath = "";
    if (req.file) {
      thumbnailPath = `/uploads/thumbnails/${req.file.filename}`;
    }

    // Prepare course data
    const courseData = {
      title,
      slug,
      description,
      type,
      price: parseFloat(price) || 0,
      category: category || "",
      instructor: instructor || "",
      level: level || "beginner",
      totalDuration: totalDuration || "0 hours",
      thumbnail: thumbnailPath,
      isActive: true,
      videos: [],
    };

    // If single video, add it to videos array
    if (type === "single" && videoUrl) {
      courseData.videos = [
        {
          title: videoTitle || title,
          url: videoUrl,
          duration: videoDuration || "0:00",
          order: 0,
        },
      ];
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
 * @desc    Update course
 * @route   PUT /api/admin/courses/:id
 * @access  Private/Admin
 */
exports.updateCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    const updateData = { ...req.body };

    // Update slug if title changed
    if (updateData.title && updateData.title !== course.title) {
      updateData.slug = slugify(updateData.title, { lower: true, strict: true });

      // Check if new slug already exists
      const existingCourse = await Course.findOne({
        slug: updateData.slug,
        _id: { $ne: course._id },
      });
      if (existingCourse) {
        return res.status(400).json({
          success: false,
          message: "Course with this title already exists",
        });
      }
    }

    // Handle thumbnail upload
    if (req.file) {
      // Delete old thumbnail
      if (course.thumbnail) {
        const oldPath = path.join(__dirname, "../../", course.thumbnail);
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }
      updateData.thumbnail = `/uploads/thumbnails/${req.file.filename}`;
    }

    // Update course
    const updatedCourse = await Course.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: "Course updated successfully",
      data: updatedCourse,
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
 * @desc    Delete course
 * @route   DELETE /api/admin/courses/:id
 * @access  Private/Admin
 */
exports.deleteCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    // Delete thumbnail file
    if (course.thumbnail) {
      const thumbnailPath = path.join(__dirname, "../../", course.thumbnail);
      if (fs.existsSync(thumbnailPath)) {
        fs.unlinkSync(thumbnailPath);
      }
    }

    // Delete video files (for uploaded videos, not URLs)
    if (course.videos && course.videos.length > 0) {
      course.videos.forEach((video) => {
        if (video.url && video.url.startsWith("/uploads/videos/")) {
          const videoPath = path.join(__dirname, "../../", video.url);
          if (fs.existsSync(videoPath)) {
            fs.unlinkSync(videoPath);
          }
        }
      });
    }

    await Course.findByIdAndDelete(req.params.id);

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

/**
 * @desc    Add video to pack
 * @route   POST /api/admin/courses/:id/videos
 * @access  Private/Admin
 */
exports.addVideoToPack = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    if (course.type !== "pack") {
      return res.status(400).json({
        success: false,
        message: "Can only add videos to pack courses",
      });
    }

    const { title, url, duration } = req.body;
    let videoUrl = url;

    // If file uploaded, use file path
    if (req.file) {
      videoUrl = `/uploads/videos/${req.file.filename}`;
    }

    if (!videoUrl) {
      return res.status(400).json({
        success: false,
        message: "Video URL or file is required",
      });
    }

    // Add video to course
    const newVideo = {
      title: title || `Video ${course.videos.length + 1}`,
      url: videoUrl,
      duration: duration || "0:00",
      order: course.videos.length,
    };

    course.videos.push(newVideo);
    await course.save();

    res.status(201).json({
      success: true,
      message: "Video added successfully",
      data: course,
    });
  } catch (error) {
    console.error("Add video error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while adding video",
      error: error.message,
    });
  }
};

/**
 * @desc    Update video in pack
 * @route   PUT /api/admin/courses/:id/videos/:videoId
 * @access  Private/Admin
 */
exports.updateVideoInPack = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    const videoIndex = course.videos.findIndex(
      (v) => v._id.toString() === req.params.videoId
    );

    if (videoIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Video not found",
      });
    }

    // Update video properties
    const { title, url, duration, order } = req.body;

    if (title) course.videos[videoIndex].title = title;
    if (url) course.videos[videoIndex].url = url;
    if (duration) course.videos[videoIndex].duration = duration;
    if (order !== undefined) course.videos[videoIndex].order = order;

    await course.save();

    res.status(200).json({
      success: true,
      message: "Video updated successfully",
      data: course,
    });
  } catch (error) {
    console.error("Update video error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while updating video",
      error: error.message,
    });
  }
};

/**
 * @desc    Delete video from pack
 * @route   DELETE /api/admin/courses/:id/videos/:videoId
 * @access  Private/Admin
 */
exports.deleteVideoFromPack = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    const videoIndex = course.videos.findIndex(
      (v) => v._id.toString() === req.params.videoId
    );

    if (videoIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Video not found",
      });
    }

    // Delete video file if it's uploaded
    const video = course.videos[videoIndex];
    if (video.url && video.url.startsWith("/uploads/videos/")) {
      const videoPath = path.join(__dirname, "../../", video.url);
      if (fs.existsSync(videoPath)) {
        fs.unlinkSync(videoPath);
      }
    }

    // Remove video from array
    course.videos.splice(videoIndex, 1);

    // Reorder remaining videos
    course.videos.forEach((v, index) => {
      v.order = index;
    });

    await course.save();

    res.status(200).json({
      success: true,
      message: "Video deleted successfully",
      data: course,
    });
  } catch (error) {
    console.error("Delete video error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while deleting video",
      error: error.message,
    });
  }
};

/**
 * @desc    Reorder videos in pack
 * @route   PUT /api/admin/courses/:id/videos-order
 * @access  Private/Admin
 */
exports.reorderVideos = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    const { videoOrders } = req.body; // Array of { videoId, order }

    if (!Array.isArray(videoOrders)) {
      return res.status(400).json({
        success: false,
        message: "videoOrders must be an array",
      });
    }

    // Update video orders
    videoOrders.forEach(({ videoId, order }) => {
      const video = course.videos.find((v) => v._id.toString() === videoId);
      if (video) {
        video.order = order;
      }
    });

    // Sort videos by order
    course.videos.sort((a, b) => a.order - b.order);

    await course.save();

    res.status(200).json({
      success: true,
      message: "Videos reordered successfully",
      data: course,
    });
  } catch (error) {
    console.error("Reorder videos error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while reordering videos",
      error: error.message,
    });
  }
};

