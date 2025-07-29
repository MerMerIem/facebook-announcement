import { CloudinaryStorage } from 'multer-storage-cloudinary';
import cloudinary from './cloudinary.js';

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'uploads', // Optional: change folder name
    allowed_formats: ['jpg', 'jpeg', 'png'],
  },
});

export default storage;