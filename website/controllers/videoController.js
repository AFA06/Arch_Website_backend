import Video from '../models/Video.js';

export const getVideos = async (req, res) => {
  try {
    const videos = await Video.find().sort({ createdAt: -1 });
    res.json(videos);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch videos' });
  }
};

export const uploadVideo = async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const { title, description } = req.body;

  const video = new Video({
    title,
    description,
    videoUrl: `/uploads/${req.file.filename}`
  });

  try {
    await video.save();
    res.status(201).json(video);
  } catch (err) {
    res.status(500).json({ error: 'Upload failed' });
  }
};
