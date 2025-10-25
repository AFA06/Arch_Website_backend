const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const paymentController = require('../admin/controllers/paymentController');
const Payment = require('../models/Payment');

// Create a test app
const app = express();
app.use(express.json());
app.get('/api/admin/payments', paymentController.getAllPayments);
app.get('/api/admin/payments/stats', paymentController.getPaymentStats);
app.get('/api/admin/payments/months', paymentController.getAvailableMonths);

// Mock authentication middleware
app.use((req, res, next) => {
  req.user = { id: new mongoose.Types.ObjectId(), isAdmin: true };
  next();
});

describe('Payment Controller', () => {
  let testPayments;

  beforeEach(async () => {
    // Create test payments with different dates
    const now = new Date();
    const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, 15);
    const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 10);

    testPayments = [
      new Payment({
        userId: new mongoose.Types.ObjectId(),
        userName: 'John Doe',
        userEmail: 'john@example.com',
        courseSlug: 'react-basics',
        courseTitle: 'React Basics',
        amount: 1000,
        method: 'Telegram',
        status: 'completed',
        date: now
      }),
      new Payment({
        userId: new mongoose.Types.ObjectId(),
        userName: 'Jane Smith',
        userEmail: 'jane@example.com',
        courseSlug: 'advanced-js',
        courseTitle: 'Advanced JavaScript',
        amount: 2000,
        method: 'Telegram',
        status: 'completed',
        date: oneMonthAgo
      }),
      new Payment({
        userId: new mongoose.Types.ObjectId(),
        userName: 'Bob Wilson',
        userEmail: 'bob@example.com',
        courseSlug: 'node-backend',
        courseTitle: 'Node.js Backend',
        amount: 1500,
        method: 'Telegram',
        status: 'pending',
        date: twoMonthsAgo
      })
    ];

    await Payment.insertMany(testPayments);
  });

  afterEach(async () => {
    await Payment.deleteMany({});
  });

  describe('getAllPayments', () => {
    it('should return all payments with pagination', async () => {
      const response = await request(app)
        .get('/api/admin/payments')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.payments).toHaveLength(3);
      expect(response.body.data.pagination).toBeDefined();
      expect(response.body.data.pagination.totalPayments).toBe(3);
    });

    it('should filter payments by status', async () => {
      const response = await request(app)
        .get('/api/admin/payments?status=completed')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.payments).toHaveLength(2);
      expect(response.body.data.payments.every(p => p.status === 'completed')).toBe(true);
    });

    it('should filter payments by search term', async () => {
      const response = await request(app)
        .get('/api/admin/payments?search=john')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.payments).toHaveLength(1);
      expect(response.body.data.payments[0].userName).toBe('John Doe');
    });

    it('should filter payments by month', async () => {
      const now = new Date();
      const response = await request(app)
        .get(`/api/admin/payments?month=${now.getMonth() + 1}&year=${now.getFullYear()}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.payments).toHaveLength(1);
      expect(response.body.data.payments[0].userName).toBe('John Doe');
    });

    it('should paginate results', async () => {
      const response = await request(app)
        .get('/api/admin/payments?page=1&limit=2')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.payments).toHaveLength(2);
      expect(response.body.data.pagination.currentPage).toBe(1);
      expect(response.body.data.pagination.totalPages).toBe(2);
      expect(response.body.data.pagination.hasNextPage).toBe(true);
    });
  });

  describe('getPaymentStats', () => {
    it('should return payment statistics', async () => {
      const response = await request(app)
        .get('/api/admin/payments/stats')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.summary).toBeDefined();
      expect(response.body.data.summary.totalRevenue).toBe(4500); // 1000 + 2000 + 1500
      expect(response.body.data.summary.completedPayments).toBe(2);
      expect(response.body.data.summary.totalPayments).toBe(3);
      expect(response.body.data.topCourses).toBeDefined();
    });

    it('should filter stats by month', async () => {
      const now = new Date();
      const response = await request(app)
        .get(`/api/admin/payments/stats?month=${now.getMonth() + 1}&year=${now.getFullYear()}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.summary.totalRevenue).toBe(1000);
      expect(response.body.data.summary.completedPayments).toBe(1);
    });

    it('should include revenue change calculation', async () => {
      const response = await request(app)
        .get('/api/admin/payments/stats')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.summary.revenueChange).toBeDefined();
      expect(response.body.data.summary.trend).toMatch(/^(up|down)$/);
    });
  });

  describe('getAvailableMonths', () => {
    it('should return available months with payment data', async () => {
      const response = await request(app)
        .get('/api/admin/payments/months')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);

      // Check structure of first month
      const firstMonth = response.body.data[0];
      expect(firstMonth).toHaveProperty('year');
      expect(firstMonth).toHaveProperty('month');
      expect(firstMonth).toHaveProperty('monthName');
      expect(firstMonth).toHaveProperty('displayName');
      expect(firstMonth).toHaveProperty('count');
    });
  });
});
