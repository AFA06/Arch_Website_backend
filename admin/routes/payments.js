const express = require("express");
const router = express.Router();
const paymentController = require("../controllers/paymentController");
const { adminAuth } = require("../../middleware/adminAuth");

// Get all payments with filtering and pagination
router.get("/", adminAuth, paymentController.getAllPayments);

// Get payment statistics
router.get("/stats", adminAuth, paymentController.getPaymentStats);

// Get available months for filtering
router.get("/months", adminAuth, paymentController.getAvailableMonths);

module.exports = router;
