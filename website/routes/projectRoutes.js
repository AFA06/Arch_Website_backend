const express = require('express');
const multer = require('multer');
const router = express.Router();
const Project = require('../../models/Project');


const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});

const upload = multer({ storage });

router.post('/upload', upload.single('file'), async (req, res) => {
  const { name, email } = req.body;
  const filePath = req.file.path;

  const newProject = new Project({ name, email, filePath });
  await newProject.save();

  res.json({ message: 'File uploaded successfully' });
});

module.exports = router;
