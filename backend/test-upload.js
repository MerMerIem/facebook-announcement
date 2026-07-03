import cloudinary from './utils/cloudinary.js';

cloudinary.uploader.upload(
  'https://res.cloudinary.com/demo/image/upload/sample.jpg',
  { timeout: 60000 },
  (error, result) => {
    if (error) {
      console.error('FAILED:', error);
    } else {
      console.log('SUCCESS:', result.secure_url);
    }
  }
);