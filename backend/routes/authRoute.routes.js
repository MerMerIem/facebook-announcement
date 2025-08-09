import { Router } from "express";
import { verifyCredintials } from "../middlewares/validateInputsMiddleware.js";
import { verfyToken, isAuthorized } from "../middlewares/authMiddleware.js";
import { login, logout, checkLogin, register, updateProfile } from "../controllers/authController.controller.js";
const router = Router();

router.post("/login", verifyCredintials, login);
router.post("/register", verifyCredintials, register);
router.get("/me", checkLogin);
router.delete("/logout", logout);
router.post("/profile", verfyToken(), isAuthorized, updateProfile);

export default router;
