import express from "express";
const router = express.Router();
import { PromotionalbannerController } from "../controllers/index.js";
import validateUser from '../middlewares/validateUser.js';

router.post('/createbanner', validateUser, PromotionalbannerController.createBanner);
// router.get('/getbanner/:id',validateUser, bannerController.getBanner);
router.get('/getbanner', validateUser, PromotionalbannerController.getmybanner);

router.post('/updatebanner/:id', validateUser, PromotionalbannerController.editBanner);
// router.delete('/deletebanner/:id',validateUser, bannerController.deleteBanner);
router.post('/getBannersNearby', validateUser, PromotionalbannerController.getBannersNearby);

// // POST route to get tournaments for the logged-in user within the specified date range
// router.post('/gettournaments', bannerController.getTournaments);

// // GET route to get shops for the logged-in user
// router.get('/getshops', bannerController.getShops);

export default router;

