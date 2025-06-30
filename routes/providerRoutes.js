import express from "express"
const router = express.Router()
import { ProviderController } from "../controllers/index.js"
import validateUser from "../middlewares/validateUser.js"

// ==================== GROUND ROUTES ====================
router.get("/getUserGroundRegisteredGround", validateUser, ProviderController.getUserGroundRegisteredGround)
// router.post("/getNearbyVenue", validateUser, ProviderController.GetNearByVenue)
router.get("/getGroundById/:id", ProviderController.getGroundById)
router.get("/getAllGrounds", ProviderController.getAllGrounds)

// ==================== GROUND BOOKING ROUTES ====================
router.post("/bookVenue", validateUser, ProviderController.bookVenue)
router.post("/checkMultipleDateAvailability", ProviderController.checkMultipleDateAvailability)
router.post("/availableSlots", ProviderController.getAvailableSlots)
router.post("/getbookedSlots", ProviderController.getBookedSlots)
router.post("/groundBookings", validateUser, ProviderController.getGroundBookings)

// ==================== ANALYTICS ROUTES ====================
router.get("/analytics/dashboard/:groundId", validateUser, ProviderController.getDashboardAnalytics)
router.get("/analytics/revenue/:groundId", validateUser, ProviderController.getRevenueAnalytics)
router.get("/analytics/sports/:groundId", validateUser, ProviderController.getSportsAnalytics)
// ==================== INDIVIDUAL ROUTES ====================
router.post("/createIndividualService", validateUser, ProviderController.createIndividual)
router.get("/getUserIndividualRegisteredGround", validateUser, ProviderController.getUserIndividualRegisteredGround)
router.get("/getIndividualById/:id", ProviderController.getIndividualById)
router.get("/getAllIndividuals", ProviderController.getAllIndividuals)

//TODO:Since Some Feature are not in these build these api can be used in future if there is an change in app feature
// ==================== INDIVIDUAL BOOKING ROUTES ====================
router.post("/bookIndividual", validateUser, ProviderController.bookIndividual)
router.get("/individualAvailableSlots", ProviderController.getIndividualAvailableSlots)
router.get("/individualBookings", validateUser, ProviderController.getIndividualBookings)

// ==================== COMMON BOOKING ROUTES ====================
router.get("/getUserBookings/:page", validateUser, ProviderController.getUserBookings)
router.put("/cancelBooking/:bookingId", validateUser, ProviderController.cancelBooking)



// ==================== NEARBY ROUTES ====================
router.post("/getNearbyVenue", validateUser, ProviderController.getNearbyVenues)
router.post("/getNearbyindividuals", validateUser, ProviderController.getNearbyIndividuals)

// ==================== SEARCH ROUTES ====================
router.post("/venues", ProviderController.searchVenues)
router.post("/individuals", ProviderController.searchIndividuals)
router.post("/combined", ProviderController.combinedSearch)

// ==================== INDIVIDUAL PROFILE ====================
router.get("/individual/:id", ProviderController.getIndividualProfile)
export default router
