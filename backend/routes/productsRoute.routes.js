import { Router } from "express";
import multer from "multer";
import storage from "../utils/storage.js"; // path to your Cloudinary storage config
import { verfyToken, isAuthorized } from "../middlewares/authMiddleware.js";
import {
  verifyName,
  validateDiscountDates,
  validateNumber,
  verifyId,
} from "../middlewares/validateInputsMiddleware.js";
import {
  addProduct,
  modifyProduct,
  deleteProduct,
  removeProductDiscount,
  searchProduct,
  getAllProducts,
  getProductById,
  removeProductDiscountPercentage,
} from "../controllers/productsController.controller.js";
import { uploadImages } from "../middlewares/uploadImages.middleware.js";

const router = Router();

// 🔼 This enables file upload handling via Cloudinary
const upload = multer({ storage });

// Add `upload.single('image')` before the other middlewares
router.post(
  "/add",
  verfyToken(),
  isAuthorized,
  uploadImages,
  verifyName,
  validateNumber,
  validateDiscountDates,
  addProduct
);

router.post(
  "/modify/:id",
  verfyToken(),
  isAuthorized,
  verifyId,
  uploadImages,
  validateNumber,
  validateDiscountDates,
  modifyProduct
);

router.delete(
  "/delete/:id",
  verfyToken(),
  isAuthorized,
  verifyId,
  deleteProduct
);
router.post("/remove/:id", verfyToken(), isAuthorized, removeProductDiscount);
router.get("/search", verfyToken(true), searchProduct);
router.get("/getAll", verfyToken(true), getAllProducts);
router.get("/get/:id", verfyToken(true), verifyId, getProductById);
router.delete(
  "/removeDiscount/:id",
  verfyToken(),
  isAuthorized,
  verifyId,
  removeProductDiscountPercentage
);

export default router;
