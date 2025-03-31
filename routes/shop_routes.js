import express from "express";
const router = express.Router();
import { ShopController } from "../controllers/index.js";
import validateUser from "../middlewares/validateUser.js";

router.post("/registerShop", validateUser, ShopController.addShop);
router.get("/getMyShop", validateUser, ShopController.getMyShop);
router.post("/getNearbyShop", ShopController.GetNearbyShop);
export default router;