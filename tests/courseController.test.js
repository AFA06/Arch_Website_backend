const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const courseController = require('../admin/controllers/courseController');
const Course = require('../models/Course');
const User = require('../models/User');

// Create a test app
const app = express();
app.use(express.json());
app.delete('/api/admin/courses/:id', courseController.deleteCourse);

// Mock authentication middleware
app.use((req, res, next) => {
  req.user = { id: new mongoose.Types.ObjectId(), isAdmin: true };
  next();
});

describe('Course Controller - Delete Course', () => {
  let testCourse;
  let testUser;

  beforeEach(async () => {
    // Create a test course
    testCourse = new Course({
      title: 'Test Course',
      slug: 'test-course',
      description: 'Test description',
      type: 'single',
      price: 1000,
      thumbnail: 'test-thumbnail.jpg',
      isActive: true,
      accessDuration: 12,
      videos: []
    });
    await testCourse.save();

    // Create a test user with the course
    testUser = new User({
      name: 'Test',
      surname: 'User',
      email: 'test@example.com',
      password: 'hashedpassword',
      isAdmin: false,
      purchasedCourses: [{
        courseId: testCourse._id,
        assignedAt: new Date(),
        accessDuration: 12,
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
      }],
      courseProgress: [{
        courseId: testCourse._id,
        completedVideos: [],
        progressPercentage: 0,
        lastAccessed: new Date()
      }]
    });
    await testUser.save();
  });

  afterEach(async () => {
    await Course.deleteMany({});
    await User.deleteMany({});
  });

  it('should delete course and remove from all users', async () => {
    const response = await request(app)
      .delete(`/api/admin/courses/${testCourse._id}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.message).toContain('deleted successfully');
    expect(response.body.data.courseTitle).toBe('Test Course');
    expect(response.body.data.usersAffected).toBe(1);

    // Verify course is deleted
    const deletedCourse = await Course.findById(testCourse._id);
    expect(deletedCourse).toBeNull();

    // Verify course is removed from user
    const updatedUser = await User.findById(testUser._id);
    expect(updatedUser.purchasedCourses).toHaveLength(0);
    expect(updatedUser.courseProgress).toHaveLength(0);
  });

  it('should return 404 for non-existent course', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const response = await request(app)
      .delete(`/api/admin/courses/${fakeId}`)
      .expect(404);

    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Course not found');
  });

  it('should handle database errors gracefully', async () => {
    // Mock Course.findById to throw an error
    const originalFindById = Course.findById;
    Course.findById = jest.fn().mockRejectedValue(new Error('Database error'));

    const response = await request(app)
      .delete(`/api/admin/courses/${testCourse._id}`)
      .expect(500);

    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain('Server error');

    // Restore original method
    Course.findById = originalFindById;
  });

  it('should return statistics about deleted files', async () => {
    const response = await request(app)
      .delete(`/api/admin/courses/${testCourse._id}`)
      .expect(200);

    expect(response.body.data.filesDeleted).toBeDefined();
    expect(typeof response.body.data.filesDeleted.thumbnail).toBe('boolean');
    expect(typeof response.body.data.filesDeleted.videos).toBe('number');
  });
});
