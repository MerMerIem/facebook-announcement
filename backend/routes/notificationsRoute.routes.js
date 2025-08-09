import { Router } from "express";
import { updateNotificationStatus, getUnreadNotifications, deleteNotification, markAllNotificationsAsRead } from "../controllers/notificationsController.controller.js";
import { verfyToken } from "../middlewares/authMiddleware.js";

const router = Router();

router.put("/status/:id", verfyToken, updateNotificationStatus);
router.get("/getUnread", verfyToken(), getUnreadNotifications);
router.delete("/delete/:id", verfyToken, deleteNotification);
router.post("/markAllAsRead", verfyToken(), markAllNotificationsAsRead);

export default router;