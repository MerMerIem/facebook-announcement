import { Router } from "express";
import { verfyToken, isAuthorized } from "../middlewares/authMiddleware.js";
import {
  verifyId,
  verifyName,
  verifyWilaya,
} from "../middlewares/validateInputsMiddleware.js";
import {
  addOrder,
  getAllOrders,
  getOrderById,
  modifyOrder,
  deleteOrder,
  getRecent,
  getTodaysOrders,
  updateOrderStatus,
} from "../controllers/ordersController.controller.js";

const router = Router();

// Client routes (no authentication needed)
router.post("/add", verifyWilaya, addOrder); // Create new order

// Admin routes (authentication required)
router.get("/getAll", verfyToken(), isAuthorized, getAllOrders); // Get all orders with pagination
router.get("/get/:id", verfyToken(), isAuthorized, verifyId, getOrderById); // Get order by ID
router.post(
  "/:id",
  verfyToken(),
  isAuthorized,
  verifyId,
  verifyWilaya,
  modifyOrder
); // Update order details
router.delete("/:id", verfyToken(), isAuthorized, verifyId, deleteOrder); // Delete order
router.patch(
  "/:id/status",
  verfyToken(),
  isAuthorized,
  verifyId,
  updateOrderStatus
); // Update order status

router.get("/getRecent", verfyToken(), isAuthorized, getRecent);
router.get("/getTodays", verfyToken(), isAuthorized, getTodaysOrders);
export default router;
