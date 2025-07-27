import { Router } from "express";
import { verfyToken, isAuthorized } from "../middlewares/authMiddleware.js";
import {verifyId, verifyName} from "../middlewares/validateInputsMiddleware.js";
import { addSubCategory, getAllSubCategories,getSubCategoryById, 
    modifySubCategory, deleteSubCategory } from "../controllers/subcategoriesController.controller.js";

const router = Router();

router.post("/add", verfyToken, isAuthorized, verifyName, addSubCategory);
router.get("/getAll", getAllSubCategories);
router.get("/get/:id", verifyId, getSubCategoryById);
router.put("/modify/:id", verfyToken, isAuthorized, verifyId, verifyName, modifySubCategory);
router.delete("/delete/:id", verfyToken, isAuthorized, verifyId, deleteSubCategory);

export default router;