import express from "express";
const router = express.Router();;
import { ProviderController } from "../controllers/index.js";
import validateUser from "../middlewares/validateUser.js";

router.post("/createIndividualService", validateUser, ProviderController.createIndividual);
router.post("/createGroundService", validateUser, ProviderController.createGround);
router.get("/", ProviderController.getAllIndividuals);
router.get("/:id", ProviderController.getIndividualById);
router.put("/:id", validateUser, ProviderController.updateIndividual);
router.delete("/:id", validateUser, ProviderController.deleteIndividual);;


router.get("/", validateUser, ProviderController.getUserBookings);
router.get("/:id", validateUser, ProviderController.getBookingById);
router.put("/:id/cancel", validateUser, ProviderController.cancelBooking);
router.put("/:id/payment-status", validateUser, ProviderController.updatePaymentStatus);
router.post("/", validateUser, ProviderController.createGround);
router.get("/", ProviderController.getAllGrounds);
router.get("/:id", ProviderController.getGroundById);
router.put("/:id", validateUser, ProviderController.updateGround);
router.delete("/:id", validateUser, ProviderController.deleteGround);

// Booking routes
router.post("/book", validateUser, ProviderController.bookGround);
router.get("/available-slots", ProviderController.getAvailableTimeSlots);


// Booking routes
router.post("/book", validateUser, ProviderController.bookIndividual);

export default router;
