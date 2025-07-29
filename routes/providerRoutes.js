import express from "express"
const router = express.Router()
import { ProviderController } from "../controllers/index.js"
import validateUser from "../middlewares/validateUser.js"



router.post("/createVenue", validateUser, ProviderController.createVenue)

// ==================== Venue ROUTES ====================
router.get("/getUserGroundRegisteredGround", validateUser, ProviderController.getUserGroundRegisteredGround)
// router.post("/getNearbyVenue", validateUser, ProviderController.GetNearByVenue)
router.get("/getVenueById/:id", ProviderController.getVenueById)
router.get("/getAllGrounds", ProviderController.getAllGrounds)

// ==================== Venue BOOKING ROUTES ====================
router.post("/bookVenue", validateUser, ProviderController.bookVenue)
// router.post("/checkGroundSlotAvailability", validateUser, ProviderController.checkGroundSlotAvailability)
router.post("/checkMultipleDateAvailability", ProviderController.checkMultipleDateAvailability)
router.post("/availableSlots", ProviderController.getAvailableSlots)
router.post("/checkSlotConflicts", validateUser, ProviderController.checkSlotConflicts)
router.post("/getbookedSlots", ProviderController.getBookedSlots)
router.post("/checkMultipleSlots", ProviderController.checkMultipleSlots)
router.post("/groundBookings", validateUser, ProviderController.getGroundBookings)
router.post("/bookings/today", validateUser, ProviderController.getTodayBookings)
router.post("/bookings/upcoming", validateUser, ProviderController.getUpcomingBookings)
router.post("/bookings/past", validateUser, ProviderController.getPastBooking)
// ==================== ANALYTICS ROUTES ====================
router.get("/analytics/dashboard/:venueId", validateUser, ProviderController.getDashboardAnalytics)
router.get("/analytics/revenue/:venueId", validateUser, ProviderController.getRevenueAnalytics)
router.get("/analytics/sports/:venueId", validateUser, ProviderController.getSportsAnalytics)

router.get("/dashboard/:venueId", validateUser, ProviderController.getDashboardAnalytics)
router.get("/revenue/:venueId", validateUser, ProviderController.getRevenueAnalytics)
router.get("/sports/:venueId", validateUser, ProviderController.getSportsAnalytics)
router.get("/time-slots/:venueId", validateUser, ProviderController.getTimeSlotAnalytics)
router.get("/bookings/:venueId", validateUser, ProviderController.getBookingAnalytics)
router.get("/performance/:venueId", validateUser, ProviderController.getPerformanceAnalytics)
// ==================== INDIVIDUAL ROUTES ====================
router.post("/createIndividualService", validateUser, ProviderController.createIndividual)
router.get("/getUserIndividualRegisteredService", validateUser, ProviderController.getUserIndividualRegisteredGround)
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
// router.post("/getNearbyVenue", validateUser, ProviderController.getNearbyVenues)
// router.post("/getNearbyindividuals", validateUser, ProviderController.getNearbyIndividuals)

// ==================== SEARCH ROUTES ====================
router.post("/venues", ProviderController.searchVenues)
router.post("/individuals", ProviderController.searchIndividuals)
router.post("/combinedSearch", ProviderController.combinedSearch)

// ==================== INDIVIDUAL PROFILE ====================
router.get("/individual/:id", ProviderController.getIndividualProfile)


// Enhanced nearby routes with advanced filters
router.post("/getNearbyVenues", validateUser, ProviderController.getNearbyVenues)
router.post("/getNearbyindividuals", validateUser, ProviderController.getNearbyIndividuals,
)

// Enhanced search routes with advanced filters
router.post("/searchVenues", ProviderController.searchVenuesWithFilters)
router.post("/searchIndividuals", ProviderController.searchIndividualsWithFilters)

router.post("/lockSlots", validateUser, ProviderController.lockSlots)
router.post("/releaseLockedSlots", validateUser, ProviderController.releaseLockedSlots)
router.post("/releaseMultipleSlots", validateUser, ProviderController.releaseMultipleSlots)
router.post("/confirmPayment", validateUser, ProviderController.confirmPayment)
router.post("/reserveMultipleSlots", validateUser, ProviderController.reserveMultipleSlots)
export default router
