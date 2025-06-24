import express from "express"
const router = express.Router()
import { ProviderController } from "../controllers/index.js"
import validateUser from "../middlewares/validateUser.js"

// ==================== GROUND ROUTES ====================
router.post("/createGroundService", validateUser, ProviderController.createGround)
router.get("/getUserGroundRegisteredGround", validateUser, ProviderController.getUserGroundRegisteredGround)
router.get("/getGroundById/:id", ProviderController.getGroundById)
router.get("/getAllGrounds", ProviderController.getAllGrounds)

// ==================== GROUND BOOKING ROUTES ====================
router.post("/bookGround", validateUser, ProviderController.bookGround)
router.post("/checkMultipleDateAvailability", ProviderController.checkMultipleDateAvailability)
router.get("/availableSlots", ProviderController.getAvailableSlots)
router.get("/bookedSlots", ProviderController.getBookedSlots)
router.get("/groundBookings", validateUser, ProviderController.getGroundBookings)

// ==================== INDIVIDUAL ROUTES ====================
router.post("/createIndividualService", validateUser, ProviderController.createIndividual)
router.get("/getUserIndividualRegisteredGround", validateUser, ProviderController.getUserIndividualRegisteredGround)
router.get("/getIndividualById/:id", ProviderController.getIndividualById)
router.get("/getAllIndividuals", ProviderController.getAllIndividuals)

// ==================== INDIVIDUAL BOOKING ROUTES ====================
router.post("/bookIndividual", validateUser, ProviderController.bookIndividual)
router.get("/individualAvailableSlots", ProviderController.getIndividualAvailableSlots)
router.get("/individualBookings", validateUser, ProviderController.getIndividualBookings)

// ==================== COMMON BOOKING ROUTES ====================
router.get("/getUserBookings", validateUser, ProviderController.getUserBookings)
router.put("/cancelBooking/:bookingId", validateUser, ProviderController.cancelBooking)

export default router
