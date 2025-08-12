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
  addProductVariants,
  editVariants,
  deleteVariant,
  getVariants,
  removeProductDiscountPercentage,
} from "../controllers/productsController.controller.js";
import { uploadImages } from "../middlewares/uploadImages.middleware.js";

const router = Router();

// 🔼 This enables file upload handling via Cloudinary
const upload = multer({ storage });

// ===== MOST SPECIFIC ROUTES FIRST =====

// Variant routes (most specific)
router.post(
  "/add/variant",
  verfyToken(),
  isAuthorized,
  uploadImages,
  validateNumber,
  validateDiscountDates,
  addProductVariants
);

router.post(
  "/modify/variant/:id",
  verfyToken(),
  isAuthorized,
  verifyId,
  uploadImages,
  validateNumber,
  validateDiscountDates,
  editVariants
);

router.delete(
  "/removeVariant/:id",
  verfyToken(),
  isAuthorized,
  verifyId,
  deleteVariant
);

// Discount removal route (specific)
router.delete(
  "/removeDiscount/:id",
  verfyToken(),
  isAuthorized,
  verifyId,
  removeProductDiscountPercentage
);

// ===== GENERAL ROUTES AFTER =====

// Product CRUD routes
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

// Get routes
router.get("/getvariant/:productId", verfyToken(), isAuthorized, getVariants);

router.get("/search", verfyToken(true), searchProduct);
router.get("/getAll", verfyToken(true), getAllProducts);
router.get("/get/:id", verfyToken(true), verifyId, getProductById);

// This route should be last among POST /remove routes
router.post("/remove/:id", verfyToken(), isAuthorized, removeProductDiscount);

export default router;
