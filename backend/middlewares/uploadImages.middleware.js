import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";

dotenv.config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Use memory storage (files stored in memory, not disk)
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Modified upload middleware
const uploadImages = async (req, res, next) => {
  const uploadMultiple = upload.array("images");

  uploadMultiple(req, res, async (err) => {
    if (err) {
      // Handle Multer errors (e.g., file size limits, invalid field names)
      return res.status(400).json({ error: err.message });
    }

    if (!req.files || req.files.length === 0) {
      req.uploadedImages = []; // Ensure req.uploadedImages is an empty array if no new files
      return next(); // Proceed to modifyProduct
    }

    try {
      // Get main_image_index from request body and convert to number
      const mainImageIndex = parseInt(req.body.main_image_index, 10) || 0;

      // Upload each file to Cloudinary
      const uploadPromises = req.files.map((file) => {
        return new Promise((resolve, reject) => {
          cloudinary.uploader
            .upload_stream({ resource_type: "image" }, (error, result) => {
              if (error) reject(error);
              else resolve(result);
            })
            .end(file.buffer);
        });
      });

      // Wait for all uploads to complete
      const results = await Promise.all(uploadPromises);

      // Add URLs and is_main flag to request
      req.uploadedImages = results.map((result, index) => ({
        url: result.secure_url,
        public_id: result.public_id,
        is_main: index === mainImageIndex ? 1 : 0,
      }));

      next(); // Proceed to modifyProduct with uploaded image URLs
    } catch (error) {
      console.error("Cloudinary upload error:", error);
      return res.status(500).json({
        error: "Upload failed",
        message: error.message,
        details: error,
      });
    }
  });
};

export { uploadImages };
