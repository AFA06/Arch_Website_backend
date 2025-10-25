// scripts/createUserPayments.js
const mongoose = require('mongoose');
const Payment = require('../models/Payment');
const User = require('../models/User');
require('dotenv').config();

async function createUserPayments() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Get regular users (not admin) including the new test user
    const users = await User.find({ isAdmin: false });

    if (users.length === 0) {
      console.log('❌ No regular users found. Please create some users first.');
      return;
    }

    // Sample courses with proper ObjectIds (using string IDs for now since we don't have actual courses)
    const courses = [
      { slug: 'react-basics', title: 'React Basics Course', price: 1000 },
      { slug: 'advanced-js', title: 'Advanced JavaScript', price: 2000 },
      { slug: 'node-backend', title: 'Node.js Backend Development', price: 1500 },
      { slug: 'design-systems', title: 'Design Systems & UI/UX', price: 1200 },
      { slug: 'mobile-dev', title: 'Mobile App Development', price: 1800 }
    ];

    // Create sample payments for each user
    const samplePayments = [];
    const now = new Date();

    for (const user of users) {
      // Create 2-4 payments per user
      const paymentCount = Math.floor(Math.random() * 3) + 2;

      for (let i = 0; i < paymentCount; i++) {
        const randomCourse = courses[Math.floor(Math.random() * courses.length)];
        const randomDays = Math.floor(Math.random() * 60); // Random days in the past 60 days

        const paymentDate = new Date(now);
        paymentDate.setDate(paymentDate.getDate() - randomDays);

        const payment = new Payment({
          userId: user._id,
          userName: `${user.name} ${user.surname || ''}`.trim(),
          userEmail: user.email,
          courseSlug: randomCourse.slug,
          courseTitle: randomCourse.title,
          amount: randomCourse.price,
          method: Math.random() > 0.5 ? 'Telegram' : 'Admin Grant',
          status: 'completed',
          date: paymentDate
        });

        samplePayments.push(payment);
      }
    }

    // Insert payments
    await Payment.insertMany(samplePayments);
    console.log(`✅ Created ${samplePayments.length} sample payments for ${users.length} users`);

    // Note: User purchased courses will be updated separately if needed
    console.log('✅ Sample payments created for users');

  } catch (error) {
    console.error('❌ Error creating user payments:', error);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
}

createUserPayments();
