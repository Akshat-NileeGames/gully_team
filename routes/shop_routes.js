import express from "express";
const router = express.Router();
import { ShopController } from "../controllers/index.js";
import validateUser from "../middlewares/validateUser.js";

router.post("/registerShop", validateUser, ShopController.addShop);
router.get("/getMyShop", validateUser, ShopController.getMyShop);
router.post("/getNearbyShop",validateUser ,ShopController.GetNearbyShop);
router.post("/addProduct", validateUser,ShopController.AddProduct);
router.get("/getShopProduct/:shopId",validateUser,ShopController.getShopProduct);
router.post("/ChangedProductStatus", validateUser,ShopController.setProductActiveStatus);
router.post("/addCategory", validateUser,ShopController.addCategory);
export default router;