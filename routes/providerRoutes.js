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



//Todo:Not Used
router.get("/getAllGrounds", ProviderController.getAllGrounds)
//Todo:Not Used
router.post("/bookVenue", validateUser, ProviderController.bookVenue)
//Todo:Not Used
router.post("/checkMultipleDateAvailability", ProviderController.checkMultipleDateAvailability)
//Todo:Not Used
router.post("/checkSlotConflicts", validateUser, ProviderController.checkSlotConflicts)
//Todo:Not Used
router.post("/getbookedSlots", ProviderController.getBookedSlots)
//Todo:Not used
router.get("/analytics/time-slots/:venueId", validateUser, ProviderController.getTimeSlotAnalytics)
//Todo:Not used
router.get("/analytics/bookings/:venueId", validateUser, ProviderController.getBookingAnalytics)
//Todo:Not used
router.get("/dashboard/:venueId", validateUser, ProviderController.getDashboardAnalytics)
//Todo:Not used
router.get("/revenue/:venueId", validateUser, ProviderController.getRevenueAnalytics)
//Todo:Not used
router.get("/sports/:venueId", validateUser, ProviderController.getSportsAnalytics)
//Todo:Not used
router.get("/performance/:venueId", validateUser, ProviderController.getPerformanceAnalytics)

//TODO:Not Used
router.get("/getAllIndividuals", ProviderController.getAllIndividuals)

//TODO:Since Some Feature are not in these build these api can be used in future if there is an change in app feature
// ==================== INDIVIDUAL BOOKING ROUTES ====================
router.post("/bookIndividual", validateUser, ProviderController.bookIndividual)
router.get("/individualAvailableSlots", ProviderController.getIndividualAvailableSlots)
router.get("/individualBookings", validateUser, ProviderController.getIndividualBookings)





// ==================== NEARBY ROUTES ====================
// router.post("/getNearbyVenue", validateUser, ProviderController.getNearbyVenues)
// router.post("/getNearbyindividuals", validateUser, ProviderController.getNearbyIndividuals)

// ==================== SEARCH ROUTES ====================
//Todo:Not Used
router.post("/venues", ProviderController.searchVenues)
//Todo:Not Used
router.post("/individuals", ProviderController.searchIndividuals)

export default router
