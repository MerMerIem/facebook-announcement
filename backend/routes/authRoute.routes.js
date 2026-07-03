import { Router } from 'express';
import { verifyCredintials } from '../middlewares/validateInputsMiddleware.js';
import { verfyToken, isAuthorized } from '../middlewares/authMiddleware.js';
import {
    login,
    logout,
    checkLogin,
    register,
    updateProfile,
} from '../controllers/authController.controller.js';
const router = Router();

//for dev disable verifyCredintials middleware to test login and register without validation
router.post('/login', login);
router.post('/register', verifyCredintials, register);
router.get('/me', checkLogin);
router.delete('/logout', logout);
router.post('/profile', verfyToken(), isAuthorized, updateProfile);

export default router;
