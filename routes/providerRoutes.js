import express from "express"
const router = express.Router()
import { ProviderController } from "../controllers/index.js"
import validateUser from "../middlewares/validateUser.js"


// ==================== Venue ROUTES ====================
router.post("/createVenue", validateUser, ProviderController.createVenue)
router.post("/editVenue", validateUser, ProviderController.editVenue)
router.post("/subscription/updateVenueSubscription", validateUser, ProviderController.updateVenueSubscriptionStatus)
router.post("/availableSlots", ProviderController.getAvailableSlots)
router.post("/bookings/today", validateUser, ProviderController.getTodayBookings)
router.post("/bookings/upcoming", validateUser, ProviderController.getUpcomingBookings)
router.post("/bookings/past", validateUser, ProviderController.getPastBooking)
router.post("/lockSlots", validateUser, ProviderController.lockSlots)
router.post("/checkMultipleSlots", ProviderController.checkMultipleSlots)
router.post("/confirmPayment", validateUser, ProviderController.confirmPayment)
router.post("/reserveMultipleSlots", validateUser, ProviderController.reserveMultipleSlots)
router.post("/releaseLockedSlots", validateUser, ProviderController.releaseLockedSlots)
router.post("/releaseMultipleSlots", validateUser, ProviderController.releaseMultipleSlots)
router.post("/groundBookings", validateUser, ProviderController.getGroundBookings)

router.post("/getNearbyVenues", validateUser, ProviderController.getNearbyVenues)


router.get("/getUserVenueRegisteredGround", validateUser, ProviderController.getUserGroundRegisteredGround)

router.get("/getVenueById/:id", ProviderController.getVenueById)

router.post("/searchVenues", ProviderController.searchVenuesWithFilters)


// ==================== ANALYTICS ROUTES ====================
router.get("/analytics/dashboard/:venueId", validateUser, ProviderController.getDashboardAnalytics)
router.get("/analytics/revenue/:venueId", validateUser, ProviderController.getRevenueAnalytics)
router.get("/analytics/sports/:venueId", validateUser, ProviderController.getSportsAnalytics)
//Todo:to add in api doc


// ==================== INDIVIDUAL ROUTES ====================
router.post("/createIndividualService", validateUser, ProviderController.createIndividual)
router.post("/editIndividualService", validateUser, ProviderController.editIndividualService)
router.get("/getUserIndividualRegisteredService", validateUser, ProviderController.getUserIndividualRegisteredGround)
router.post("/subscription/updateIndividualSubscription", validateUser, ProviderController.updateIndividualSubscriptionStatus)
router.get("/getIndividualById/:id", ProviderController.getIndividualById)
router.post("/getNearbyindividuals", validateUser, ProviderController.getNearbyIndividuals,
)
router.post("/searchIndividuals", ProviderController.searchIndividualsWithFilters)
// router.get("/individual/:id", ProviderController.getIndividualProfile)
// ==================== COMMON BOOKING ROUTES ====================
router.get("/getUserBookings/:page", validateUser, ProviderController.getUserBookings)
//TODO: Not Used Right Now but can be used in future
router.put("/cancelBooking/:bookingId", validateUser, ProviderController.cancelBooking)


router.post("/combinedSearch", ProviderController.combinedSearch)


export default router
