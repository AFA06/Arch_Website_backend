// scripts/createSamplePayments.js
const mongoose = require('mongoose');
const Payment = require('../models/Payment');
const User = require('../models/User');
require('dotenv').config();

async function createSamplePayments() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Get all users
    const users = await User.find({ isAdmin: false }).limit(5);

    if (users.length === 0) {
      console.log('❌ No users found. Please create some users first.');
      return;
    }

    // Sample courses
    const courses = [
      { slug: 'react-basics', title: 'React Basics', price: 1000 },
      { slug: 'advanced-js', title: 'Advanced JavaScript', price: 2000 },
      { slug: 'node-backend', title: 'Node.js Backend', price: 1500 },
      { slug: 'design-systems', title: 'Design Systems', price: 1200 },
      { slug: 'mobile-dev', title: 'Mobile Development', price: 1800 }
    ];

    // Create sample payments
    const samplePayments = [];
    const now = new Date();

    for (let i = 0; i < 20; i++) {
      const randomUser = users[Math.floor(Math.random() * users.length)];
      const randomCourse = courses[Math.floor(Math.random() * courses.length)];
      const randomDays = Math.floor(Math.random() * 30); // Random days in the past 30 days

      const paymentDate = new Date(now);
      paymentDate.setDate(paymentDate.getDate() - randomDays);

      const payment = new Payment({
        userId: randomUser._id,
        userName: `${randomUser.name} ${randomUser.surname || ''}`.trim(),
        userEmail: randomUser.email,
        courseSlug: randomCourse.slug,
        courseTitle: randomCourse.title,
        amount: randomCourse.price,
        method: Math.random() > 0.5 ? 'Telegram' : 'Admin Grant',
        status: 'completed',
        date: paymentDate
      });

      samplePayments.push(payment);
    }

    // Insert payments
    await Payment.insertMany(samplePayments);
    console.log(`✅ Created ${samplePayments.length} sample payments`);

    // Note: User purchased courses will be updated separately if needed
    console.log('✅ Sample payments created successfully');

  } catch (error) {
    console.error('❌ Error creating sample payments:', error);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
}

createSamplePayments();
