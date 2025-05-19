import express from "express";
const router = express.Router();
import { ShopController } from "../controllers/index.js";
import validateUser from "../middlewares/validateUser.js";

router.post("/registerShop", validateUser, ShopController.addShop);
router.post("/getShop", validateUser, ShopController.getShop);
router.get("/getMyShop", validateUser, ShopController.getMyShop);
router.post("/getNearbyShop", validateUser, ShopController.GetNearbyShop);
router.post("/addProduct", validateUser, ShopController.AddProduct);
router.post("/getProduct", validateUser, ShopController.getProduct);
router.get("/getShopProduct/:shopId/:page", validateUser, ShopController.getShopProduct);
router.post("/ChangedProductStatus", validateUser, ShopController.setProductActiveStatus);
router.post("/addCategory", validateUser, ShopController.addCategory);
router.get("/getcategory", validateUser, ShopController.getCategory);
router.get("/getsubcategory/:category", validateUser, ShopController.getSubCategory);
router.get("/getSportsBrand", validateUser, ShopController.getBrand);
router.post("/UpdateshopSubscriptionStatus", validateUser, ShopController.updateSubscriptionStatus);
router.post("/additionalPackage", validateUser, ShopController.addExtensionPackage);
router.get("/search/:querytext", validateUser, ShopController.search);
router.post("/setProductDiscount", validateUser, ShopController.setProductDiscount);
router.post("/getSimilarProduct", validateUser, ShopController.getSimilarProduct);
router.post("/getSimilarShopProduct", validateUser, ShopController.getSimilarShopProduct);
router.post("/editShop", validateUser, ShopController.EditShop);
router.post("/editProduct", validateUser, ShopController.EditProduct);

router.post("/getFilterProduct", ShopController.getFilterProduct);

router.get("/getShopAnalytics/:shopId", validateUser, ShopController.getShopAnalytics);
router.get("/getProductViewAnalytics/:shopId/:timeRange", validateUser, ShopController.getProductViewAnalytics);
router.get("/getVisitorAnalytics/:shopId/:timeRange", validateUser, ShopController.getVisitorAnalytics);
router.get("/getDailyVisitors/:shopId/:days", validateUser, ShopController.getDailyVisitors);

router.post("/recordProductView", validateUser, ShopController.recordProductView);
router.post("/recordShopVisit", validateUser, ShopController.recordShopVisit);
export default router;