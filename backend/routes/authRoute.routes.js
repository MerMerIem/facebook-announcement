import { Router } from "express";
import { verifyCredintials } from "../middlewares/validateInputsMiddleware.js";
import { login, logout, checkLogin, register } from "../controllers/authController.controller.js";
const router = Router();

router.post("/login", verifyCredintials, login);
router.post("/register", verifyCredintials, register);
router.get("/me", checkLogin);
router.delete("/logout", logout);

export default router;
