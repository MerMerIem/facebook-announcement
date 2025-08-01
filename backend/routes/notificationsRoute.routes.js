import { Router } from "express";
import { updateNotificationStatus, getAllNotifications, deleteNotification } from "../controllers/notificationsController.controller.js";
import { verfyToken } from "../middlewares/authMiddleware.js";

const router = Router();

router.put("/status/:id", verfyToken, updateNotificationStatus);
router.get("/getAll", verfyToken, getAllNotifications);
router.delete("/delete/:id", verfyToken, deleteNotification);

export default router;