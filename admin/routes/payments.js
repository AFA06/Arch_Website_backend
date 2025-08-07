const express = require("express");
const router = express.Router();
const requireAuth = require("../../middleware/requireAuth");
const Payment = require("../../models/Payment");

router.get("/", requireAuth, async (req, res) => {
  try {
    const payments = await Payment.find().sort({ date: -1 });

    const formattedPayments = payments.map((payment) => ({
      _id: payment._id,
      userName: payment.userName,
      email: payment.userEmail,     // ✅ mapped to match frontend
      amount: payment.amount,
      currency: "UZS",              // ✅ hardcoded for frontend
      method: payment.method,
      status: payment.status,
      date: payment.date,
      courseSlug: payment.courseSlug,
    }));

    res.json(formattedPayments);
  } catch (err) {
    console.error("Error fetching payments:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
