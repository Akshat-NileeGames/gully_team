import express from "express";

const router = express.Router();

import { adminController } from "../controllers/index.js"
import { adminOtherController } from "../controllers/index.js"
import { adminUserController } from "../controllers/index.js"
import { adminTournamentController } from "../controllers/index.js"
import { ShopController } from "../controllers/index.js"

import validateAdmin from "../middlewares/validateAdmin.js"
import accessUser from "../middlewares/accessUser.js"

router.post("/login", adminController.adminLogin);

router.post("/forgot-password", adminController.sendMailForgotPassword);

router.post("/reset-password/:token", adminController.resetPassword);


router.post("/update/:Id", adminController.update);
router.get("/getupdate", adminController.getupdate);

router.post("/dashboard", adminController.dashboard);


// ***********************    Admin Content Route     ****************************
router.get("/getContent/:contentName", adminOtherController.getContent);

router.post("/updateContent/:contentName", adminOtherController.updateContent);

// ***********************    Admin HelpDesk Route     ****************************
router.post("/getHelpdesk/:page/:pageSize", validateAdmin, accessUser("Helpdesk"), adminOtherController.getHelpdesk);

router.get("/getHelpdeskById/:helpdeskId", validateAdmin, accessUser("Helpdesk"), adminOtherController.getHelpdeskById);

router.post("/updateHelpdesk/:helpdeskId", validateAdmin, accessUser("Helpdesk"), adminOtherController.updateHelpdesk);


// ***********************    Admin Notification  Route     ****************************

router.post("/getNotification/:page/:pageSize", validateAdmin, accessUser("Notification"), adminOtherController.getNotification);

router.get("/getNotificationById/:Id", validateAdmin, accessUser("Notification"), adminOtherController.getNotificationById);

router.post("/addNotification", validateAdmin, accessUser("Notification"), adminOtherController.addNotification);

router.post("/updateNotification/:NotificationId", validateAdmin, accessUser("Notification"), adminOtherController.updateNotification);

// ***********************    Admin User Route     ****************************


// User Releated Functionality

router.post("/getAllUser/:page/:pageSize", validateAdmin, accessUser("Users"), adminUserController.getAllUser);

router.post("/editUserStatus/:userId", validateAdmin, accessUser("Users"), adminUserController.editUserStatus);

// ***********************    SubAdmin  Route     ****************************

// SubAdmin Releated Functionality

router.post("/addSubAdmin", validateAdmin, accessUser("subAdmin"), adminUserController.addSubAdmin);

router.post("/editSubAdmin/:userId", validateAdmin, accessUser("subAdmin"), adminUserController.editSubAdmin);

router.post("/getSubAdminById/:userId", validateAdmin, accessUser("subAdmin"), adminUserController.getSubAdminById);

router.post("/getAllSubAdmin/:page/:pageSize", validateAdmin, accessUser("subAdmin"), adminUserController.getAllSubAdmin);

// ***********************    Tournament  Route     ****************************

router.get("/getAllTournament/:page/:pageSize", validateAdmin, accessUser("Organizer"), adminTournamentController.getAllTournament);

router.get("/getAllTournamentLive/:page/:pageSize", validateAdmin, accessUser("Organizer"), adminTournamentController.getAllTournamentLive);

router.get("/getTournamentById/:Id", validateAdmin, accessUser("Organizer"), adminTournamentController.getTournamentById);

router.post("/updateTournamentById/:Id", validateAdmin, accessUser("Organizer"), adminTournamentController.updateTournamentById);

router.get("/getMatchesByTournamentId/:TournamentId", validateAdmin, accessUser("Organizer"), adminTournamentController.getMatchesByTournamentId);

router.get("/getMatchesHistoryByTournamentId/:TournamentId", validateAdmin, accessUser("Organizer"), adminTournamentController.getMatchesHistoryByTournamentId);

// ***********************    Banner   Route     ****************************

router.post("/addBanner", adminOtherController.addBanner);

router.post("/updateBanner/:BannerId", adminOtherController.updateBanner);

router.post("/getBanner/:page/:pageSize", adminOtherController.getBanner);

router.get("/getBannerById/:BannerId", adminOtherController.getBannerById);


// ***********************    Package Route     ****************************


router.post('/packages/create', adminOtherController.createPackage);

// Route to get all packages
router.get('/packages', adminOtherController.getPackages);

// Route to update a package by ID
router.post('/editpackages/:id', adminOtherController.updatePackage);

// Route to delete a package by ID
router.delete('/deletepackages/:id', adminOtherController.deletePackage);



// ***********************    Coupon   Route     ****************************

router.post("/addCoupon", adminOtherController.addCoupon);

// router.post("/updateBanner/:BannerId", adminOtherController.updateBanner);

router.get("/getCoupon/:page/:pageSize", adminOtherController.getCoupon);

router.get("/getCouponById/:Id", adminOtherController.getCouponById);

router.post("/updateCoupon/:Id", adminOtherController.updateCoupon);

// ***********************    entryFees     ****************************

router.post("/addEntryFees", adminOtherController.addEntryFees);

router.post("/updateEntryFees/:EntryFeesId", adminOtherController.updateEntryFees);

router.get("/getallEntryFees", adminOtherController.getallEntryFees);

router.get("/getEntryFeesById/:EntryFeesId", adminOtherController.getEntryFeesById);


router.get("/transaction/:page/:pageSize", adminOtherController.getAllTransaction);
router.get("/transactionById/:Id", adminOtherController.getAllTransactionById);


// ***********************    Shop      ****************************
// router.post("/addCategory",validateAdmin,)
export default router;
