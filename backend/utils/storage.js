import cloudinary from './cloudinary.js';
import pkg from 'multer-storage-cloudinary';

const storage = new pkg.CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'uploads',
        allowed_formats: ['jpg', 'jpeg', 'png'],
    },
});

export default storage;
