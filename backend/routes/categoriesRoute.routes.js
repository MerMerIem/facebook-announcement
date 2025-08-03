import { Router } from "express";
import { verfyToken, isAuthorized } from "../middlewares/authMiddleware.js";
import {
  verifyId,
  verifyName,
} from "../middlewares/validateInputsMiddleware.js";
import {
  addCategory,
  getAllCategories,
  getCategoryById,
  modifyCategory,
  deleteCategory,
} from "../controllers/categoriesController.controller.js";

const router = Router();

router.post("/add", verfyToken(), isAuthorized, verifyName, addCategory);
router.get("/getAll", getAllCategories);
router.get("/get/:id", verifyId, getCategoryById);
router.post(
  "/modify/:id",
  verfyToken(),
  verifyId,
  isAuthorized,
  verifyName,
  modifyCategory
);
router.delete(
  "/delete/:id",
  verfyToken(),
  verifyId,
  isAuthorized,
  deleteCategory
);

export default router;
