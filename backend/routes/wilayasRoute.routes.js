import { Router } from "express";
import { verifyWilaya } from "../middlewares/validateInputsMiddleware.js";
import { verfyToken, isAuthorized } from "../middlewares/authMiddleware.js";
import {
  addWilaya,
  modifyWilayaDeliveryPrice,
  deleteWilayaDeliveryPrice,
  getWilayas,
} from "../controllers/wilayasController.controller.js";

const router = Router();

router.post("/", verifyWilaya, addWilaya);
router.post(
  "/modify/:id",
  verfyToken(),
  isAuthorized,
  modifyWilayaDeliveryPrice
);
router.delete(
  "/delete",
  verifyWilaya,
  verfyToken(),
  isAuthorized,
  deleteWilayaDeliveryPrice
);
router.get("/get", getWilayas);

export default router;
