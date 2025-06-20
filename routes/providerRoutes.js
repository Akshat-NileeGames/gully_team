import express from "express";
const router = express.Router();;
import { ProviderController } from "../controllers/index.js";
import validateUser from "../middlewares/validateUser.js";

//#region Individual Api Route
router.post("/createIndividualService", validateUser, ProviderController.createIndividual);

router.get("/getUserRegisterService", validateUser, ProviderController.getUserRegisterService);
router.get("/", ProviderController.getAllIndividuals);
router.get("/:id", ProviderController.getIndividualById);
router.put("/:id", validateUser, ProviderController.updateIndividual);
router.delete("/:id", validateUser, ProviderController.deleteIndividual);;




//#region Ground Api Route 
router.post("/createGroundService", validateUser, ProviderController.createGround);
router.get("/getGroundById/:id", ProviderController.getGroundById);


// router.get("/", validateUser, ProviderController.getUserBookings);
// router.get("/:id", validateUser, ProviderController.getBookingById);
// router.put("/:id/cancel", validateUser, ProviderController.cancelBooking);
// router.put("/:id/payment-status", validateUser, ProviderController.updatePaymentStatus);
// router.post("/", validateUser, ProviderController.createGround);
// router.get("/", ProviderController.getAllGrounds);

// router.put("/:id", validateUser, ProviderController.updateGround);
// router.delete("/:id", validateUser, ProviderController.deleteGround);

// // Booking routes
// router.post("/book", validateUser, ProviderController.bookGround);
// router.get("/available-slots", ProviderController.getAvailablevenue_timeslots);


// // Booking routes
// router.post("/book", validateUser, ProviderController.bookIndividual);

export default router;
