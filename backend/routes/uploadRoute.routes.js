import express from 'express';
import multer from 'multer';
import storage from '../utils/storage.js'; // adjust path

const upload = multer({ storage });
const router = express.Router();

router.post('/', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No image uploaded' });
  }

  // The image URL is in req.file.path
  res.status(200).json({
    message: 'Image uploaded successfully',
    url: req.file.path,
  });
});

export default router;