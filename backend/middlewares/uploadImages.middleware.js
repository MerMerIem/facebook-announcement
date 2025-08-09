import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = multer.memoryStorage();
const upload = multer({ storage });

const uploadImages = async (req, res, next) => {
  const uploadMultiple = upload.any(); // Accept any field name

  uploadMultiple(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }

    if (!req.files || req.files.length === 0) {
      req.uploadedImages = [];
      req.variantUploadedImages = {};
      return next();
    }

    try {
      const mainImageIndex = parseInt(req.body.main_image_index, 10) || 0;

      // Separate files into product images & variant images
      const productImages = req.files.filter(
        (file) => file.fieldname === "images"
      );
      const variantImages = req.files.filter((file) =>
        file.fieldname.startsWith("variant_images_")
      );

      // Upload product images
      const productResults = await Promise.all(
        productImages.map(
          (file, index) =>
            new Promise((resolve, reject) => {
              cloudinary.uploader
                .upload_stream({ resource_type: "image" }, (error, result) => {
                  if (error) reject(error);
                  else
                    resolve({
                      url: result.secure_url,
                      public_id: result.public_id,
                      is_main: index === mainImageIndex ? 1 : 0,
                    });
                })
                .end(file.buffer);
            })
        )
      );

      // Upload variant images grouped by variant index
      const variantResultsGrouped = {};
      for (const file of variantImages) {
        const variantIndex = parseInt(file.fieldname.split("_")[2], 10) || 0;

        const result = await new Promise((resolve, reject) => {
          cloudinary.uploader
            .upload_stream({ resource_type: "image" }, (error, result) => {
              if (error) reject(error);
              else resolve(result);
            })
            .end(file.buffer);
        });

        if (!variantResultsGrouped[variantIndex]) {
          variantResultsGrouped[variantIndex] = [];
        }
        variantResultsGrouped[variantIndex].push({
          url: result.secure_url,
          public_id: result.public_id,
        });
      }

      req.uploadedImages = productResults; // original product images
      req.variantUploadedImages = variantResultsGrouped; // new grouped variant images

      next();
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
