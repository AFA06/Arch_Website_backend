const Payment = require("../../models/Payment");
const Course = require("../../models/Course");
const User = require("../../models/User");

/**
 * @desc    Get all payments with filtering and pagination
 * @route   GET /api/admin/payments
 * @access  Private/Admin
 */
exports.getAllPayments = async (req, res) => {
  try {
    const { month, year, status, search, page = 1, limit = 10 } = req.query;
    const adminRole = req.user.adminRole || 'main';
    const adminCompanyId = req.user.companyId;

    // Build query object
    const query = {};

    // Apply company filter for company admins
    if (adminRole === 'company') {
      query.companyId = adminCompanyId;
    }

    // Filter by status
    if (status && status !== "all") {
      query.status = status;
    }

    // Filter by search (user name, email, course slug)
    if (search) {
      const regex = new RegExp(search, "i");
      query.$or = [
        { userName: regex },
        { userEmail: regex },
        { courseSlug: regex }
      ];
    }

    // Filter by month and year
    if (month || year) {
      const dateQuery = {};
      if (year) {
        const yearNum = parseInt(year);
        const monthNum = month ? parseInt(month) - 1 : 0;
        const endMonthNum = month ? parseInt(month) : 12;
        const endYearNum = month ? yearNum : yearNum + 1;

        dateQuery.$gte = new Date(yearNum, monthNum, 1);
        dateQuery.$lt = new Date(endYearNum, endMonthNum, 1);
      } else if (month) {
        const currentYear = new Date().getFullYear();
        dateQuery.$gte = new Date(currentYear, parseInt(month) - 1, 1);
        dateQuery.$lt = new Date(currentYear, parseInt(month), 1);
      }
      query.date = dateQuery;
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get total count for pagination
    const totalPayments = await Payment.countDocuments(query);

    // Get payments with pagination
    const payments = await Payment.find(query)
      .sort({ date: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Format payments for frontend
    const formattedPayments = payments.map((payment) => ({
      _id: payment._id,
      userName: payment.userName,
      email: payment.userEmail,
      amount: adminRole === 'company' ? payment.companyShare : payment.amount, // Company admins see their share
      currency: "UZS",
      method: payment.method,
      status: payment.status,
      date: payment.date,
      courseSlug: payment.courseSlug,
      // Add revenue sharing info for main admin
      ...(adminRole === 'main' && {
        companyShare: payment.companyShare,
        platformShare: payment.platformShare,
        totalAmount: payment.amount
      })
    }));

    // Calculate pagination info
    const totalPages = Math.ceil(totalPayments / parseInt(limit));
    const hasNextPage = parseInt(page) < totalPages;
    const hasPrevPage = parseInt(page) > 1;

    res.status(200).json({
      payments: formattedPayments,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalPayments,
        hasNextPage,
        hasPrevPage,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error("Get all payments error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching payments",
      error: error.message,
    });
  }
};

/**
 * @desc    Get payment summary statistics
 * @route   GET /api/admin/payments/stats
 * @access  Private/Admin
 */
exports.getPaymentStats = async (req, res) => {
  try {
    const { month, year } = req.query;

    // Build date filter
    let dateFilter = {};
    if (month || year) {
      const dateQuery = {};
      if (year) {
        const yearNum = parseInt(year);
        const monthNum = month ? parseInt(month) - 1 : 0;
        const endMonthNum = month ? parseInt(month) : 12;
        const endYearNum = month ? yearNum : yearNum + 1;

        dateQuery.$gte = new Date(yearNum, monthNum, 1);
        dateQuery.$lt = new Date(endYearNum, endMonthNum, 1);
      } else if (month) {
        const currentYear = new Date().getFullYear();
        dateQuery.$gte = new Date(currentYear, parseInt(month) - 1, 1);
        dateQuery.$lt = new Date(currentYear, parseInt(month), 1);
      }
      dateFilter.date = dateQuery;
    }

    // Get basic statistics
    const totalRevenue = await Payment.aggregate([
      { $match: { status: "completed", ...dateFilter } },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);

    const totalPayments = await Payment.countDocuments({ ...dateFilter });
    const completedPayments = await Payment.countDocuments({
      status: "completed",
      ...dateFilter
    });

    const uniqueUsers = await Payment.distinct("userEmail", {
      status: "completed",
      ...dateFilter
    });

    // Get top-selling courses
    const topCourses = await Payment.aggregate([
      {
        $match: {
          status: "completed",
          ...dateFilter
        }
      },
      {
        $group: {
          _id: "$courseSlug",
          courseTitle: { $first: "$courseTitle" },
          totalSales: { $sum: 1 },
          totalRevenue: { $sum: "$amount" }
        }
      },
      {
        $sort: { totalRevenue: -1 }
      },
      {
        $limit: 10
      }
    ]);

    // Get monthly comparison (current vs previous period)
    let previousPeriodFilter = {};
    if (month && year) {
      const currentMonth = parseInt(month);
      const currentYear = parseInt(year);

      if (currentMonth === 1) {
        // If January, compare with December of previous year
        previousPeriodFilter.date = {
          $gte: new Date(currentYear - 1, 11, 1),
          $lt: new Date(currentYear, 0, 1)
        };
      } else {
        // Compare with previous month of same year
        previousPeriodFilter.date = {
          $gte: new Date(currentYear, currentMonth - 2, 1),
          $lt: new Date(currentYear, currentMonth - 1, 1)
        };
      }
    }

    const previousRevenue = await Payment.aggregate([
      { $match: { status: "completed", ...previousPeriodFilter } },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);

    const revenueChange = previousRevenue[0]?.total > 0
      ? Math.round(((totalRevenue[0]?.total || 0) - previousRevenue[0].total) / previousRevenue[0].total * 100)
      : 0;

    res.status(200).json({
      summary: {
        totalRevenue: totalRevenue[0]?.total || 0,
        totalPayments,
        completedPayments,
        uniqueUsers: uniqueUsers.length,
        revenueChange: `${revenueChange > 0 ? '+' : ''}${revenueChange}%`,
        trend: revenueChange >= 0 ? 'up' : 'down'
      },
      topCourses: topCourses.map(course => ({
        slug: course._id,
        title: course.courseTitle,
        sales: course.totalSales,
        revenue: course.totalRevenue
      }))
    });
  } catch (error) {
    console.error("Get payment stats error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching payment statistics",
      error: error.message,
    });
  }
};

/**
 * @desc    Get available months for filtering (last 12 months)
 * @route   GET /api/admin/payments/months
 * @access  Private/Admin
 */
exports.getAvailableMonths = async (req, res) => {
  try {
    // Get the last 12 months with payment data
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setFullYear(twelveMonthsAgo.getFullYear() - 1);

    const monthlyData = await Payment.aggregate([
      {
        $match: {
          date: { $gte: twelveMonthsAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: "$date" },
            month: { $month: "$date" }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { "_id.year": 1, "_id.month": 1 }
      }
    ]);

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                   'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const availableMonths = monthlyData.map(data => ({
      year: data._id.year,
      month: data._id.month,
      monthName: months[data._id.month - 1],
      displayName: `${months[data._id.month - 1]} ${data._id.year}`,
      count: data.count
    }));

    res.status(200).json(availableMonths);
  } catch (error) {
    console.error("Get available months error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching available months",
      error: error.message,
    });
  }
};
