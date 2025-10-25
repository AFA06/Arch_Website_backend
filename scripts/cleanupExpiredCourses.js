const mongoose = require('mongoose');
const User = require('../models/User');
const Course = require('../models/Course');
require('dotenv').config();

/**
 * Script to clean up expired course access
 * Run this periodically (e.g., daily) to revoke access for expired courses
 */
async function cleanupExpiredCourses() {
  try {
    console.log('🔄 Starting cleanup of expired course access...');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('✅ Connected to MongoDB');

    const now = new Date();
    let updatedUsers = 0;
    let removedAccess = 0;

    // Find all users with purchased courses
    const users = await User.find({
      'purchasedCourses.0': { $exists: true }
    });

    console.log(`📋 Found ${users.length} users with purchased courses`);

    for (const user of users) {
      let userUpdated = false;

      // Filter out expired courses
      const activeCourses = user.purchasedCourses.filter(purchase => {
        if (purchase.expiresAt <= now) {
          console.log(`❌ Course ${purchase.courseId} access expired for user ${user.email}`);
          removedAccess++;
          return false;
        }
        return true;
      });

      // Update user if courses were removed
      if (activeCourses.length !== user.purchasedCourses.length) {
        user.purchasedCourses = activeCourses;
        await user.save();
        updatedUsers++;
        userUpdated = true;

        console.log(`🔄 Updated user ${user.email}: removed ${user.purchasedCourses.length - activeCourses.length} expired courses`);
      }

      // Also remove progress for expired courses
      if (userUpdated) {
        const activeCourseIds = activeCourses.map(p => p.courseId.toString());
        user.courseProgress = user.courseProgress.filter(progress =>
          activeCourseIds.includes(progress.courseId.toString())
        );

        await user.save();
        console.log(`🧹 Cleaned up progress for expired courses for user ${user.email}`);
      }
    }

    // Update course enrollment counts (decrement for users who lost access)
    if (removedAccess > 0) {
      const expiredCourseIds = new Set();

      for (const user of users) {
        user.purchasedCourses.forEach(purchase => {
          if (purchase.expiresAt <= now) {
            expiredCourseIds.add(purchase.courseId.toString());
          }
        });
      }

      for (const courseId of expiredCourseIds) {
        const course = await Course.findById(courseId);
        if (course) {
          course.studentsEnrolled = Math.max(0, course.studentsEnrolled - 1);
          await course.save();
          console.log(`📉 Updated enrollment count for course: ${course.title}`);
        }
      }
    }

    console.log('✅ Cleanup completed successfully');
    console.log(`📊 Summary:`);
    console.log(`   - Users updated: ${updatedUsers}`);
    console.log(`   - Access revoked: ${removedAccess} courses`);
    console.log(`   - Timestamp: ${now.toISOString()}`);

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

// Run if called directly
if (require.main === module) {
  cleanupExpiredCourses();
}

module.exports = cleanupExpiredCourses;
