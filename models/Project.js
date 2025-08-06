const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  name: String,
  email: String,
  filePath: String,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Project', projectSchema);
