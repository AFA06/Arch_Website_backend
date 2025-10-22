const express = require('express');
const router = express.Router();
const User = require('../../models/User');
const Course = require('../../models/Course');
const Payment = require('../../models/Payment');
const { adminAuth } = require('../../middleware/adminAuth');

/**
 * @route   GET /api/admin/dashboard/stats
 * @desc    Get dashboard statistics
 * @access  Private/Admin
 */
router.get('/stats', adminAuth, async (req, res) => {
  try {
    // Get total users
    const totalUsers = await User.countDocuments();
    
    // Get premium users (users with purchased courses)
    const premiumUsers = await User.countDocuments({
      purchasedCourses: { $exists: true, $not: { $size: 0 } }
    });
    
    // Get total courses/videos
    const totalVideos = await Course.countDocuments();
    
    // Get monthly revenue (current month)
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthlyRevenue = await Payment.aggregate([
      {
        $match: {
          status: 'completed',
          createdAt: { $gte: startOfMonth }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' }
        }
      }
    ]);
    
    // Get previous month's revenue for comparison
    const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfPrevMonth = startOfMonth;
    const prevMonthRevenue = await Payment.aggregate([
      {
        $match: {
          status: 'completed',
          createdAt: { $gte: startOfPrevMonth, $lt: endOfPrevMonth }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' }
        }
      }
    ]);
    
    // Calculate revenue change percentage
    const currentRevenue = monthlyRevenue[0]?.total || 0;
    const previousRevenue = prevMonthRevenue[0]?.total || 0;
    const revenueChange = previousRevenue > 0 
      ? Math.round(((currentRevenue - previousRevenue) / previousRevenue) * 100)
      : 0;
    
    // Get user registration counts by month (last 12 months)
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    
    const userRegistrations = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: oneYearAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ]);
    
    // Format registration data for chart
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const registrationData = months.map((month, index) => {
      const data = userRegistrations.find(r => r._id.month === index + 1);
      return {
        month: month,
        users: data ? data.count : 0
      };
    });
    
    // Get revenue by month (last 12 months)
    const revenueByMonth = await Payment.aggregate([
      {
        $match: {
          status: 'completed',
          createdAt: { $gte: oneYearAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          revenue: { $sum: '$amount' }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ]);
    
    // Format revenue data for chart
    const revenueData = months.map((month, index) => {
      const data = revenueByMonth.find(r => r._id.month === index + 1);
      return {
        month: month,
        revenue: data ? data.revenue : 0
      };
    });
    
    // Calculate user growth percentage (current month vs previous month)
    const usersThisMonth = await User.countDocuments({
      createdAt: { $gte: startOfMonth }
    });
    const usersPrevMonth = await User.countDocuments({
      createdAt: { $gte: startOfPrevMonth, $lt: endOfPrevMonth }
    });
    const userGrowth = usersPrevMonth > 0
      ? Math.round(((usersThisMonth - usersPrevMonth) / usersPrevMonth) * 100)
      : 0;
    
    // Calculate premium user growth
    const premiumUsersThisMonth = await User.countDocuments({
      purchasedCourses: { $exists: true, $not: { $size: 0 } },
      updatedAt: { $gte: startOfMonth }
    });
    const premiumUsersPrevMonth = await User.countDocuments({
      purchasedCourses: { $exists: true, $not: { $size: 0 } },
      updatedAt: { $gte: startOfPrevMonth, $lt: endOfPrevMonth }
    });
    const premiumGrowth = premiumUsersPrevMonth > 0
      ? Math.round(((premiumUsersThisMonth - premiumUsersPrevMonth) / premiumUsersPrevMonth) * 100)
      : 0;
    
    // Calculate video growth (this week)
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const videosThisWeek = await Course.countDocuments({
      createdAt: { $gte: oneWeekAgo }
    });
    
    res.status(200).json({
      success: true,
      data: {
        stats: {
          totalUsers: {
            value: totalUsers,
            change: `${userGrowth > 0 ? '+' : ''}${userGrowth}% from last month`,
            trend: userGrowth >= 0 ? 'up' : 'down'
          },
          premiumUsers: {
            value: premiumUsers,
            change: `${premiumGrowth > 0 ? '+' : ''}${premiumGrowth}% from last month`,
            trend: premiumGrowth >= 0 ? 'up' : 'down'
          },
          totalVideos: {
            value: totalVideos,
            change: `+${videosThisWeek} new this week`,
            trend: 'up'
          },
          monthlyRevenue: {
            value: currentRevenue,
            change: `${revenueChange > 0 ? '+' : ''}${revenueChange}% from last month`,
            trend: revenueChange >= 0 ? 'up' : 'down'
          }
        },
        charts: {
          userRegistrations: registrationData,
          revenue: revenueData
        }
      }
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard statistics'
    });
  }
});

module.exports = router;

