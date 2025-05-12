import express from "express";
const router = express.Router();
import { ShopController } from "../controllers/index.js";
import validateUser from "../middlewares/validateUser.js";

router.post("/registerShop", validateUser, ShopController.addShop);
router.get("/getMyShop", validateUser, ShopController.getMyShop);
router.post("/getNearbyShop",validateUser ,ShopController.GetNearbyShop);
router.post("/addProduct", validateUser,ShopController.AddProduct);
router.get("/getShopProduct/:shopId/:page",validateUser,ShopController.getShopProduct);
router.post("/ChangedProductStatus", validateUser,ShopController.setProductActiveStatus);
router.post("/addCategory", validateUser,ShopController.addCategory);
router.get("/getcategory",validateUser,ShopController.getCategory);
router.get("/getsubcategory/:category",validateUser,ShopController.getSubCategory);
router.get("/getSportsBrand",validateUser,ShopController.getBrand);
router.post("/UpdateshopSubscriptionStatus",validateUser,ShopController.updateSubscriptionStatus);
router.post("/additionalPackage",validateUser,ShopController.addExtensionPackage);
router.get("/search/:querytext",validateUser,ShopController.search);
router.post("/setProductDiscount", validateUser, ShopController.setProductDiscount);
router.post("/getSimilarProduct", validateUser, ShopController.getSimilarProduct);
router.post("/getSimilarShopProduct", validateUser, ShopController.getSimilarShopProduct);
router.post("/editShop", validateUser, ShopController.EditShop);
router.post("/editProduct", validateUser, ShopController.EditProduct);

export default router;