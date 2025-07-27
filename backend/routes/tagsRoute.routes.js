import { Router } from "express";
import { verfyToken, isAuthorized } from "../middlewares/authMiddleware.js";
import {verifyId, verifyName} from "../middlewares/validateInputsMiddleware.js";
import { addTag, getAllTags, modifyTag, deleteTag } from "../controllers/tagsController.controller.js";

const router = Router();

router.post("/add", verfyToken, isAuthorized, verifyName, addTag);
router.get("/getAll", verfyToken, isAuthorized, getAllTags);
router.post("/modify/:id", verfyToken, verifyId, isAuthorized, verifyName, modifyTag);
router.delete("/delete/:id", verfyToken, verifyId, isAuthorized, deleteTag);

export default router;