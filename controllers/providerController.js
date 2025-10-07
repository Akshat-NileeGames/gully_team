import CustomErrorHandler from "../helpers/CustomErrorHandler.js"
import { ProviderServices } from "../services/index.js"
import Joi from "joi"

/**
 * @file providerController.js
 * @description Controller for venue and individual service provider operations.
 * Handles venue registration, booking management, analytics, and individual service provider functionality.
 * This controller acts as the interface between HTTP requests and business logic services.
 *
 * Key Features:
 * - Venue creation and management (CRUD operations)
 * - Booking system with slot locking/releasing mechanisms
 * - Real-time availability checking and reservation system
 * - Analytics and dashboard data for venue owners
 * - Individual service provider registration and management
 * - Location-based search with filtering capabilities
 * - Payment confirmation and booking lifecycle management
 */

/*
    Developer notes (conventions used across this controller) - EXPANDED:

    - Async handlers:
        * Declared `async` because they perform I/O (service calls, DB operations).
        * Always use try/catch. In catch block forward errors to Express via `next(CustomErrorHandler.*)` so centralized error middleware can handle logging/formatting.
        * Return responses or call `next(...)` so the request lifecycle ends predictably.
        * Avoid side-effects in controllers — keep them thin: validate -> call service -> format response.

    - Joi validation:
        * Use `const { error, value } = schema.validate(req.<source>)`.
        * `error` is a Joi Error object. For user-friendly messages prefer `error.details.map(d => d.message).join(', ')`.
        * When returning validation errors, forward them via `next(CustomErrorHandler.badRequest(...))` so middleware applies consistent HTTP codes and body shape.
        * Example: `if (error) return next(CustomErrorHandler.badRequest(error.details.map(e => e.message).join(', ')))`.

    - CustomErrorHandler (usage conventions):
        * Common methods: `badRequest(message, err?)`, `validationError(message)`, `serverError(message, err?)`.
        * Prefer `next(CustomErrorHandler.badRequest(...))` for validation/runtime errors inside handlers so the error handling middleware can send the response.
        * Note: Some handlers in this file call `return CustomErrorHandler.validationError(...)` directly (legacy pattern). This returns an error object — to integrate with Express middleware you should `return next(CustomErrorHandler.validationError(...))`.
        * Keep error messages concise and include only necessary debug info. Avoid leaking internal details.

    - Retrieving user context:
        * Preferred: `req.user` (set by auth middleware).
        * Legacy: `global.user` is still used in some flows (lock/release/reserve slots). Treat global as legacy; migrate to `req.user` when refactoring.
        * Always validate presence of userId before using it.

    - Response shape:
        * Standard success response: `{ success: true, message: string, data: any }`.
        * Standard error handling is delegated to centralized middleware via `next(CustomErrorHandler.*)`.
*/

/**
 * ProviderController
 *
 * Main controller object containing all venue and individual service provider related endpoints.
 * Each method handles a specific business operation following the pattern:
 * 1. Input validation using Joi schemas
 * 2. Delegate business logic to ProviderServices
 * 3. Return standardized response format
 *
 * Note:
 *  - Each handler follows the pattern: validate -> call ProviderServices -> return standardized response.
 *  - Validation failures must use CustomErrorHandler to keep error responses consistent.
 */
const ProviderController = {
  /**
   * @function createVenue
   * @description Creates a new sports venue with comprehensive validation and image upload
   * @route POST /api/provider/createVenue
   * @access Private (requires authentication)
   *
   * @param {Object} req - Express request object containing venue data
   * @param {string} req.body.venue_name - Name of the venue
   * @param {string} req.body.venue_description - Detailed description of the venue
   * @param {string} req.body.venue_address - Physical address of the venue
   * @param {string} req.body.venue_contact - 10-digit contact number
   * @param {string} req.body.venue_type - Type: "Open Venue", "Turf", or "Stadium"
   * @param {Object} req.body.venue_timeslots - Weekly schedule with open/close times
   * @param {Array<string>} req.body.venue_sports - List of supported sports
   * @param {Array<Object>} req.body.sportPricing - Pricing details per sport
   * @param {string} req.body.upiId - UPI ID for payments
   * @param {Object} req.body.venuefacilities - Available facilities (parking, washroom, etc.)
   * @param {Array<string>} req.body.venue_rules - Venue rules and regulations
   * @param {Array<string>} req.body.venueImages - Base64 encoded images (1-5 images)
   * @param {string} req.body.selectLocation - Location name
   * @param {number} req.body.longitude - GPS longitude coordinate
   * @param {number} req.body.latitude - GPS latitude coordinate
   * @param {string} req.body.packageRef - Reference to subscription package
   *
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   *
   * @returns {Object} JSON response with success status and created venue data
   * @throws {ValidationError} When required fields are missing or invalid
   * @throws {ServerError} When venue creation fails
   */
  //#region Create Venue
  async createVenue(req, res, next) {
    // This schema ensures all required venue data is present and properly formatted
    const venueValidation = Joi.object({
      venue_name: Joi.string().required(),
      venue_description: Joi.string().required(),
      venue_address: Joi.string().required(),
      venue_contact: Joi.string()
        .pattern(/^[0-9]{10}$/) // Validates exactly 10 digits
        .required(),
      venue_type: Joi.string().valid("Open Venue", "Turf", "Stadium").required(),
      // Weekly schedule validation - each day has open status and optional times
      venue_timeslots: Joi.object()
        .keys({
          Monday: Joi.object({
            isOpen: Joi.boolean().required(),
            openTime: Joi.string().optional(),
            closeTime: Joi.string().optional(),
          }),
          Tuesday: Joi.object({
            isOpen: Joi.boolean().required(),
            openTime: Joi.string().optional(),
            closeTime: Joi.string().optional(),
          }),
          Wednesday: Joi.object({
            isOpen: Joi.boolean().required(),
            openTime: Joi.string().optional(),
            closeTime: Joi.string().optional(),
          }),
          Thursday: Joi.object({
            isOpen: Joi.boolean().required(),
            openTime: Joi.string().optional(),
            closeTime: Joi.string().optional(),
          }),
          Friday: Joi.object({
            isOpen: Joi.boolean().required(),
            openTime: Joi.string().optional(),
            closeTime: Joi.string().optional(),
          }),
          Saturday: Joi.object({
            isOpen: Joi.boolean().required(),
            openTime: Joi.string().optional(),
            closeTime: Joi.string().optional(),
          }),
          Sunday: Joi.object({
            isOpen: Joi.boolean().required(),
            openTime: Joi.string().optional(),
            closeTime: Joi.string().optional(),
          }),
        })
        .required(),
      venue_sports: Joi.array().items(Joi.string()).min(1).required(), // At least one sport required
      // Sport-specific pricing configuration
      sportPricing: Joi.array()
        .items(
          Joi.object({
            sport: Joi.string().required(),
            perHourCharge: Joi.number().min(0).required(), // Non-negative pricing
            sports_playable_area: Joi.number().min(0).required(), // Area in square units
            venue_surfacetype: Joi.string().required(), // Surface material type
          }),
        )
        .optional(),
      upiId: Joi.string()
        .pattern(/^[\w.-]+@[\w]+$/) // Basic UPI ID format validation
        .required(),
      // Venue facilities as boolean flags
      venuefacilities: Joi.object({
        isWaterAvailable: Joi.boolean(),
        isParkingAvailable: Joi.boolean(),
        isEquipmentProvided: Joi.boolean(),
        isWashroomAvailable: Joi.boolean(),
        isChangingRoomAvailable: Joi.boolean(),
        isFloodlightAvailable: Joi.boolean(),
        isSeatingLoungeAvailable: Joi.boolean(),
        isFirstAidAvailable: Joi.boolean(),
        isWalkingTrackAvailable: Joi.boolean(),
      }),
      venue_rules: Joi.array().items(Joi.string()).optional(), // Optional rules list
      venueImages: Joi.array().items(Joi.string()).min(1).max(5).required(), // 1-5 images required
      selectLocation: Joi.string().required(), // Location name for display
      longitude: Joi.number().required(), // GPS coordinates for mapping
      latitude: Joi.number().required(),
      packageRef: Joi.string().required(), // Reference to subscription package
    })

    // Validate incoming request data against schema
    const { error } = venueValidation.validate(req.body)
    if (error) {
      // Forward validation errors to centralized error handler
      return next(CustomErrorHandler.badRequest(`Failed to Validate request:${error}`))
    }

    try {
      // Delegate venue creation to service layer
      const result = await ProviderServices.createVenue(req.body)
      // Return standardized success response
      return res.status(200).json({
        success: true,
        message: "Venue created successfully",
        data: result,
      })
    } catch (error) {
      // Forward service layer errors to error handling middleware
      return next(CustomErrorHandler.badRequest("Failed to create Venue:", error))
    }
  },

  /**
   * @function editVenue
   * @description Updates existing venue information with partial data
   * @route POST /api/provider/editVenue
   * @access Private (requires authentication)
   *
   * @param {Object} req - Express request object
   * @param {string} req.body.venueId - ID of venue to update (required)
   * @param {...} req.body - Any venue fields to update (all optional except venueId)
   *
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   *
   * @returns {Object} JSON response with updated venue data
   * @throws {ValidationError} When venueId is missing or data is invalid
   * @throws {NotFoundError} When venue doesn't exist
   */
  //#endregion

  //#region Edit Venue
  async editVenue(req, res, next) {
    // This allows partial updates while maintaining data integrity
    const venueValidation = Joi.object({
      venueId: Joi.string().required(), // Only required field for updates
      venue_name: Joi.string().optional(),
      venue_description: Joi.string().optional(),
      venue_address: Joi.string().optional(),
      venue_contact: Joi.string()
        .pattern(/^[0-9]{10}$/)
        .optional(),
      venue_type: Joi.string().valid("Open Venue", "Turf", "Stadium").optional(),
      // Same timeslot structure as create, but optional
      venue_timeslots: Joi.object()
        .keys({
          Monday: Joi.object({
            isOpen: Joi.boolean().required(),
            openTime: Joi.string().optional(),
            closeTime: Joi.string().optional(),
          }),
          Tuesday: Joi.object({
            isOpen: Joi.boolean().required(),
            openTime: Joi.string().optional(),
            closeTime: Joi.string().optional(),
          }),
          Wednesday: Joi.object({
            isOpen: Joi.boolean().required(),
            openTime: Joi.string().optional(),
            closeTime: Joi.string().optional(),
          }),
          Thursday: Joi.object({
            isOpen: Joi.boolean().required(),
            openTime: Joi.string().optional(),
            closeTime: Joi.string().optional(),
          }),
          Friday: Joi.object({
            isOpen: Joi.boolean().required(),
            openTime: Joi.string().optional(),
            closeTime: Joi.string().optional(),
          }),
          Saturday: Joi.object({
            isOpen: Joi.boolean().required(),
            openTime: Joi.string().optional(),
            closeTime: Joi.string().optional(),
          }),
          Sunday: Joi.object({
            isOpen: Joi.boolean().required(),
            openTime: Joi.string().optional(),
            closeTime: Joi.string().optional(),
          }),
        })
        .optional(),
      venue_sports: Joi.array().items(Joi.string()).min(1).optional(),
      sportPricing: Joi.array()
        .items(
          Joi.object({
            sport: Joi.string().required(),
            perHourCharge: Joi.number().min(0).required(),
            sports_playable_area: Joi.number().min(0).required(),
            venue_surfacetype: Joi.string().required(),
          }),
        )
        .optional(),
      upiId: Joi.string()
        .pattern(/^[\w.-]+@[\w]+$/)
        .optional(),
      venuefacilities: Joi.object({
        isWaterAvailable: Joi.boolean(),
        isParkingAvailable: Joi.boolean(),
        isEquipmentProvided: Joi.boolean(),
        isWashroomAvailable: Joi.boolean(),
        isChangingRoomAvailable: Joi.boolean(),
        isFloodlightAvailable: Joi.boolean(),
        isSeatingLoungeAvailable: Joi.boolean(),
        isFirstAidAvailable: Joi.boolean(),
        isWalkingTrackAvailable: Joi.boolean(),
      }),
      venue_rules: Joi.array().items(Joi.string()).optional(),
      venueImages: Joi.array().items(Joi.string()).min(1).max(5).optional(),
      selectLocation: Joi.string().optional(),
      longitude: Joi.number().optional(),
      latitude: Joi.number().optional(),
    })

    // Validate request data
    const { error } = venueValidation.validate(req.body)
    if (error) {
      return next(CustomErrorHandler.badRequest(`Failed to Validate request:${error}`))
    }

    try {
      // Service handles update logic; controllers simply await and return the result
      const result = await ProviderServices.editVenue(req.body)
      return res.status(200).json({
        success: true,
        message: "Venue created successfully", // Note: Message says "created" but this is an update operation
        data: result,
      })
    } catch (error) {
      return next(CustomErrorHandler.badRequest("Failed to create Venue:", error))
    }
  },

  /**
   * @function updateVenueSubscriptionStatus
   * @description Updates the subscription status for a venue
   * @route POST /api/provider/subscription/updateVenueSubscription
   * @access Private (requires authentication)
   *
   * @param {Object} req - Express request object
   * @param {string} req.body.venueId - ID of the venue to update
   * @param {string} req.body.packageId - ID of the new subscription package
   *
   * @param {Object} res - Express response object
   *
   * @returns {Object} JSON response with updated subscription data
   * @throws {ValidationError} When required fields are missing
   */
  //#endregion

  async updateVenueSubscriptionStatus(req, res) {
    // Note: Current implementation returns CustomErrorHandler.validationError(...) directly on validation failure.
    // For consistent Express flow consider `return next(CustomErrorHandler.validationError(...))` so it is handled
    // by your centralized error middleware. This comment documents the difference for future maintainers.
    try {
      const venueSubscription = Joi.object({
        venueId: Joi.string().required(),
        packageId: Joi.string().required(),
      })
      const { error } = venueSubscription.validate(req.body)
      if (error) {
        return CustomErrorHandler.validationError(`Failed to validate request:${error}`)
      }

      // Update subscription through service layer
      const result = await ProviderServices.updateVenueSubscriptionStatus(req.body)
      return res.status(200).json({
        success: true,
        message: "Venue Subscription Updated Successfully",
        data: result,
      })
    } catch (error) {
      console.error("Update venue subscription status error:", error)
    }
  },

  /**
   * @function updateIndividualSubscriptionStatus
   * @description Updates the subscription status for an individual service provider
   * @route POST /api/provider/subscription/updateIndividualSubscription
   * @access Private (requires authentication)
   *
   * @param {Object} req - Express request object
   * @param {string} req.body.individualId - ID of the individual to update
   * @param {string} req.body.packageId - ID of the new subscription package
   *
   * @param {Object} res - Express response object
   *
   * @returns {Object} JSON response with updated subscription data
   */
  async updateIndividualSubscriptionStatus(req, res) {
    // Note: Same as updateVenueSubscriptionStatus — this handler returns CustomErrorHandler.validationError(...) directly.
    // To maintain consistency with other handlers, consider forwarding via `next(...)`. The current code retains existing behavior.
    try {
      const venueSubscription = Joi.object({
        individualId: Joi.string().required(),
        packageId: Joi.string().required(),
      })
      const { error } = venueSubscription.validate(req.body)
      if (error) {
        return CustomErrorHandler.validationError(`Failed to validate request:${error}`)
      }

      // Update individual subscription through service layer
      const result = await ProviderServices.updateIndividualSubscriptionStatus(req.body)
      return res.status(200).json({
        success: true,
        message: "Individual Subscription Updated Successfully",
        data: result,
      })
    } catch (error) {
      console.error("Update venue subscription status error:", error)
    }
  },

  /**
   * @function getVenueById
   * @description Retrieves detailed information about a specific venue
   * @route GET /api/provider/getVenueById/:id
   * @access Public
   *
   * @param {Object} req - Express request object
   * @param {string} req.params.id - Venue ID to retrieve
   *
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   *
   * @returns {Object} JSON response with venue details
   * @throws {ValidationError} When venue ID is invalid
   * @throws {NotFoundError} When venue doesn't exist
   */
  //#region getVenueById
  async getVenueById(req, res, next) {
    const validation = Joi.object({
      id: Joi.string().required(),
    })

    const { error } = validation.validate(req.params)
    if (error) {
      return next(CustomErrorHandler.badRequest("Failed to Validate request:", error))
    }

    try {
      // Retrieve venue details from service layer
      const result = await ProviderServices.getVenueById(req.params)
      return res.json({
        success: true,
        message: "Venue retrieved successfully",
        data: result,
      })
    } catch (error) {
      return next(CustomErrorHandler.badRequest("Failed to get venue:", error))
    }
  },
  //#endregion

  /**
   * @function getUserGroundRegisteredGround
   * @description Retrieves all venues registered by the current authenticated user
   * @route GET /api/provider/getUserVenueRegisteredGround
   * @access Private (requires authentication)
   *
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   *
   * @returns {Object} JSON response with user's registered venues
   * @throws {ServerError} When retrieval fails
   */
  //#region getUserGroundRegisteredGround
  async getUserGroundRegisteredGround(req, res, next) {
    try {
      // Get all venues registered by current user
      const result = await ProviderServices.getUserGroundRegisteredGround()
      return res.status(200).json({
        success: true,
        message: "User Venue Fetched successfully",
        data: { Venue: result },
      })
    } catch (error) {
      return next(CustomErrorHandler.badRequest("Something went Wrong", error))
    }
  },
  //#endregion

  /**
   * @function getAvailableSlots
   * @description Retrieves available time slots for a specific venue, sport, and date
   * @route POST /api/provider/availableSlots
   * @access Public
   *
   * @param {Object} req - Express request object
   * @param {string} req.body.venueId - ID of the venue
   * @param {string} req.body.sport - Sport type to check availability for
   * @param {Date} req.body.date - Date to check availability
   * @param {number} req.body.playableArea - Required playable area size
   * @param {string} [req.user.id] - Optional user ID from auth middleware
   *
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   *
   * @returns {Object} JSON response with available time slots
   * @throws {ValidationError} When required parameters are missing
   */
  //#region Get Available Slots
  async getAvailableSlots(req, res, next) {
    const validation = Joi.object({
      venueId: Joi.string().required(),
      sport: Joi.string().required(),
      date: Joi.date().required(), // Date for which to check availability
      playableArea: Joi.number().min(1).required(), // Minimum area requirement
    })

    const { error } = validation.validate(req.body)
    if (error) {
      return next(CustomErrorHandler.badRequest(`Failed to Validate request: ${error}`))
    }

    try {
      // Pass optional userId to service when available (req.user set by auth middleware)
      const result = await ProviderServices.getAvailableSlots({
        ...req.body,
        userId: req.user?.id, // Optional user context for personalized results
      })

      // Services may return a message property; prefer that when present
      return res.json({
        success: true,
        message: result.message || "Available slots retrieved successfully",
        data: result,
      })
    } catch (error) {
      console.error("Error in getAvailableSlots:", error)
      return next(CustomErrorHandler.badRequest("Failed to get available slots:", error))
    }
  },
  //#endregion

  /**
   * @function combinedSearch
   * @description Performs a combined search across venues and individuals based on location and query
   * @route POST /api/provider/combinedSearch
   * @access Public
   *
   * @param {Object} req - Express request object
   * @param {string} req.body.query - Search query string
   * @param {number} req.body.latitude - User's latitude (-90 to 90)
   * @param {number} req.body.longitude - User's longitude (-180 to 180)
   * @param {number} [req.body.page=1] - Page number for pagination
   * @param {number} [req.body.limit=10] - Results per page (max 50)
   * @param {number} [req.body.radius=15] - Search radius in kilometers (max 50)
   *
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   *
   * @returns {Object} JSON response with combined search results
   * @throws {ValidationError} When location coordinates are invalid
   */
  //#region combinedSearch
  async combinedSearch(req, res, next) {
    const validation = Joi.object({
      query: Joi.string().min(1).required(), // Non-empty search query
      latitude: Joi.number().min(-90).max(90).required(), // Valid latitude range
      longitude: Joi.number().min(-180).max(180).required(), // Valid longitude range
      page: Joi.number().min(1).default(1), // Pagination support
      limit: Joi.number().min(1).max(50).default(10), // Limit results per page
      radius: Joi.number().min(1).max(50).default(15), // Search radius in km
    })

    const { error } = validation.validate(req.body)
    if (error) {
      return next(
        CustomErrorHandler.badRequest(
          "Location coordinates are required for search. Please enable location services.",
          error,
        ),
      )
    }

    try {
      // Perform combined search through service layer
      const result = await ProviderServices.combinedSearch(req.body)
      return res.json({
        success: true,
        message: "Combined search completed successfully",
        data: result,
      })
    } catch (error) {
      return next(CustomErrorHandler.badRequest("Failed to perform combined search:", error))
    }
  },
  //#endregion

  /**
   * @function getIndividualProfile
   * @description Retrieves detailed profile information for an individual service provider
   * @route GET /api/provider/individual/:id
   * @access Public
   *
   * @param {Object} req - Express request object
   * @param {string} req.params.id - Individual service provider ID
   *
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   *
   * @returns {Object} JSON response with individual profile data
   * @throws {ValidationError} When ID parameter is missing
   * @throws {NotFoundError} When individual doesn't exist
   */
  //#region getIndividualProfile
  async getIndividualProfile(req, res, next) {
    const validation = Joi.object({
      id: Joi.string().required(),
    })

    const { error } = validation.validate(req.params)
    if (error) {
      return next(CustomErrorHandler.badRequest("Failed to validate request:", error))
    }

    try {
      // Retrieve individual profile from service layer
      const result = await ProviderServices.getIndividualProfile(req.params.id)
      return res.json({
        success: true,
        message: "Individual profile retrieved successfully",
        data: result,
      })
    } catch (error) {
      return next(CustomErrorHandler.badRequest("Failed to get individual profile:", error))
    }
  },
  //#endregion

  async checkMultipleSlots(req, res, next) {
    const validation = Joi.object({
      venueId: Joi.string().required(),
      sport: Joi.string().required(),
      date: Joi.array().items(Joi.date()).min(1).required(),
      playableArea: Joi.number().min(1).required(),
    })

    const { error } = validation.validate(req.body)
    if (error) {
      return next(CustomErrorHandler.badRequest(`Failed to validate request:${error}`))
    }
    try {
      const result = await ProviderServices.checkMultipleSlots(req.body)

      return res.json({
        success: true,
        message: "Booked slots retrieved successfully",
        data: result,
      })
    } catch (error) {
      return next(CustomErrorHandler.badRequest(`Failed to get booked slots: ${error}`))
    }
  },

  /**
   * @function getGroundBookings
   * @description Retrieves bookings for a specific venue with filtering and pagination
   * @route POST /api/provider/groundBookings
   * @access Private (requires authentication)
   *
   * @param {Object} req - Express request object
   * @param {string} req.body.venueId - ID of the venue to get bookings for
   * @param {Date} [req.body.startDate] - Filter bookings from this date
   * @param {Date} [req.body.endDate] - Filter bookings until this date
   * @param {string} [req.body.sport] - Filter by specific sport
   * @param {string} [req.body.status] - Filter by booking status (pending/confirmed/cancelled/completed)
   * @param {string} [req.body.paymentStatus] - Filter by payment status (pending/successful/failed/refunded)
   * @param {number} [req.body.page=1] - Page number for pagination
   * @param {number} [req.body.limit=10] - Results per page (max 50)
   *
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   *
   * @returns {Object} JSON response with filtered booking data
   * @throws {ValidationError} When venueId is missing or filters are invalid
   */
  //#region getGroundBookings
  async getGroundBookings(req, res, next) {
    const validation = Joi.object({
      venueId: Joi.string().required(), // Required venue identifier
      startDate: Joi.date().optional(), // Optional date range filtering
      endDate: Joi.date().optional(),
      sport: Joi.string().optional(), // Optional sport filtering
      status: Joi.string().valid("pending", "confirmed", "cancelled", "completed").optional(), // Booking status filter
      paymentStatus: Joi.string().valid("pending", "successful", "failed", "refunded").optional(), // Payment status filter
      page: Joi.number().min(1).default(1), // Pagination support
      limit: Joi.number().min(1).max(50).default(10), // Results per page limit
    })

    const { error } = validation.validate(req.body)
    if (error) {
      return next(CustomErrorHandler.badRequest("Failed to Validate request:", error))
    }

    try {
      // Retrieve filtered bookings from service layer
      const result = await ProviderServices.getGroundBookings(req.body)
      return res.json({
        success: true,
        message: "Venue bookings retrieved successfully",
        data: result,
      })
    } catch (error) {
      return next(CustomErrorHandler.badRequest("Failed to get Venue bookings:", error))
    }
  },
  //#endregion
  /**
   * @function getTodayBookings
   * @description Retrieves all bookings scheduled for today for a specific venue
   * @route POST /api/provider/bookings/today
   * @access Private (requires authentication)
   *
   * @param {Object} req - Express request object
   * @param {string} req.body.venueId - ID of the venue
   * @param {string} [req.body.sport] - Optional sport filter
   *
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   *
   * @returns {Object} JSON response with today's bookings
   * @throws {ValidationError} When venueId is missing
   */
  //#region Get Today's Bookings
  async getTodayBookings(req, res, next) {
    const validation = Joi.object({
      venueId: Joi.string().required(),
      sport: Joi.string().optional(), // Optional sport filtering
    })

    const { error } = validation.validate(req.body)
    if (error) {
      return next(CustomErrorHandler.badRequest(`Failed to Validate request:${error}`))
    }

    try {
      // Get today's bookings from service layer
      const result = await ProviderServices.getTodayBookings(req.body)
      return res.json({
        success: true,
        message: "Today's bookings retrieved successfully",
        data: { todaysBookingDetails: result },
      })
    } catch (error) {
      return next(CustomErrorHandler.badRequest("Failed to get today's bookings:", error))
    }
  },
  //#endregion

  /**
   * @function getUpcomingBookings
   * @description Retrieves future bookings for a venue with pagination
   * @route POST /api/provider/bookings/upcoming
   * @access Private (requires authentication)
   *
   * @param {Object} req - Express request object
   * @param {string} req.body.venueId - ID of the venue
   * @param {string} [req.body.sport] - Optional sport filter
   * @param {number} [req.body.page=1] - Page number for pagination
   *
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   *
   * @returns {Object} JSON response with upcoming bookings
   */
  //#region Get Upcoming Bookings
  async getUpcomingBookings(req, res, next) {
    const validation = Joi.object({
      venueId: Joi.string().required(),
      sport: Joi.string().optional(),
      page: Joi.number().min(1).default(1), // Pagination support
    })

    const { error } = validation.validate(req.body)
    if (error) {
      return next(CustomErrorHandler.badRequest("Failed to Validate request:", error))
    }

    try {
      // Get upcoming bookings from service layer
      const result = await ProviderServices.getUpcomingBookings(req.body)
      return res.json({
        success: true,
        message: "Upcoming bookings retrieved successfully",
        data: { upcomingBookings: result },
      })
    } catch (error) {
      return next(CustomErrorHandler.badRequest("Failed to get upcoming bookings:", error))
    }
  },
  //#endregion

  /**
   * @function getPastBooking
   * @description Retrieves completed/past bookings for a venue with pagination
   * @route POST /api/provider/bookings/past
   * @access Private (requires authentication)
   *
   * @param {Object} req - Express request object
   * @param {string} req.body.venueId - ID of the venue
   * @param {string} [req.body.sport] - Optional sport filter
   * @param {number} [req.body.page=1] - Page number for pagination
   *
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   *
   * @returns {Object} JSON response with past bookings
   */
  //#region Get Past Bookings
  async getPastBooking(req, res, next) {
    const validation = Joi.object({
      venueId: Joi.string().required(),
      sport: Joi.string().optional(),
      page: Joi.number().min(1).default(1),
    })

    const { error } = validation.validate(req.body)
    if (error) {
      return next(CustomErrorHandler.badRequest("Failed to Validate request:", error))
    }

    try {
      // Get past bookings from service layer
      const result = await ProviderServices.getPastBooking(req.body)
      return res.json({
        success: true,
        message: "Past bookings retrieved successfully",
        data: { PastBookings: result },
      })
    } catch (error) {
      return next(CustomErrorHandler.badRequest("Failed to get completed bookings:", error))
    }
  },
  //#endregion

  /**
   * @function getDashboardAnalytics
   * @description Retrieves comprehensive analytics data for venue dashboard
   * @route GET /api/provider/analytics/dashboard/:venueId
   * @access Private (requires authentication)
   *
   * @param {Object} req - Express request object
   * @param {string} req.params.venueId - ID of the venue
   * @param {string} [req.query.sport] - Optional sport filter
   * @param {string} [req.query.period=month] - Time period (week/month/quarter/year)
   * @param {Date} [req.query.startDate] - Custom start date
   * @param {Date} [req.query.endDate] - Custom end date
   *
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   *
   * @returns {Object} JSON response with analytics data (bookings, revenue, trends)
   * @throws {ValidationError} When venueId is missing or period is invalid
   */
  //#region getDashBoardAnalytics
  async getDashboardAnalytics(req, res, next) {
    const validation = Joi.object({
      venueId: Joi.string().required(),
      sport: Joi.string().optional(),
      period: Joi.string().valid("week", "month", "quarter", "year").default("month"), // Time period options
      startDate: Joi.date().optional(), // Custom date range
      endDate: Joi.date().optional(),
    })

    const { error } = validation.validate({ ...req.params, ...req.query })
    if (error) {
      return next(CustomErrorHandler.badRequest(`Failed to validate request:${error}`))
    }

    try {
      // Get comprehensive analytics from service layer
      const result = await ProviderServices.getDashboardAnalytics({
        venueId: req.params.venueId,
        sport: req.query.sport,
        period: req.query.period,
        startDate: req.query.startDate,
        endDate: req.query.endDate,
      })

      return res.json({
        success: true,
        message: "Dashboard analytics retrieved successfully",
        data: result,
      })
    } catch (error) {
      return next(CustomErrorHandler.serverError("Failed to get dashboard analytics:", error))
      throw error // Note: This throw is unreachable after return
    }
  },

  /**
   * @function getRevenueAnalytics
   * @description Retrieves detailed revenue analytics with comparison options
   * @route GET /api/provider/analytics/revenue/:venueId
   * @access Private (requires authentication)
   *
   * @param {Object} req - Express request object
   * @param {string} req.params.venueId - ID of the venue
   * @param {string} [req.query.period=year] - Time period for analysis
   * @param {string} [req.query.sport] - Optional sport filter
   * @param {boolean} [req.query.comparison=false] - Include period-over-period comparison
   *
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   *
   * @returns {Object} JSON response with revenue analytics and trends
   */
  async getRevenueAnalytics(req, res, next) {
    const validation = Joi.object({
      venueId: Joi.string().required(),
      period: Joi.string().valid("week", "month", "quarter", "year").default("year"),
      sport: Joi.string().optional(),
      comparison: Joi.boolean().default(false), // Enable/disable comparison data
    })

    const { error } = validation.validate({ ...req.params, ...req.query })
    if (error) {
      return next(CustomErrorHandler.badRequest("Failed to validate request:", error))
    }

    try {
      // Get revenue analytics with optional comparison
      const result = await ProviderServices.getRevenueAnalytics({
        venueId: req.params.venueId,
        period: req.query.period,
        sport: req.query.sport,
        comparison: req.query.comparison === "true", // Convert string to boolean
      })

      return res.json({
        success: true,
        message: "Revenue analytics retrieved successfully",
        data: result,
      })
    } catch (error) {
      return next(CustomErrorHandler.badRequest("Failed to get revenue analytics:", error))
    }
  },

  /**
   * @function getSportsAnalytics
   * @description Retrieves analytics data broken down by sports
   * @route GET /api/provider/analytics/sports/:venueId
   * @access Private (requires authentication)
   *
   * @param {Object} req - Express request object
   * @param {string} req.params.venueId - ID of the venue
   * @param {string} [req.query.period=month] - Time period for analysis
   *
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   *
   * @returns {Object} JSON response with sports-specific analytics
   */
  async getSportsAnalytics(req, res, next) {
    const validation = Joi.object({
      venueId: Joi.string().required(),
      period: Joi.string().valid("week", "month", "quarter", "year").default("month"),
    })

    const { error } = validation.validate({ ...req.params, ...req.query })
    if (error) {
      return next(CustomErrorHandler.badRequest("Failed to validate request:", error))
    }

    try {
      // Get sports-specific analytics
      const result = await ProviderServices.getSportsAnalytics({
        venueId: req.params.venueId,
        period: req.query.period,
      })

      return res.json({
        success: true,
        message: "Sports analytics retrieved successfully",
        data: result,
      })
    } catch (error) {
      return next(CustomErrorHandler.badRequest("Failed to get sports analytics:", error))
    }
  },

  /**
   * @function createIndividual
   * @description Creates a new individual service provider profile with comprehensive validation
   * @route POST /api/provider/createIndividualService
   * @access Private (requires authentication)
   *
   * @param {Object} req - Express request object containing individual service provider data
   * @param {string} req.body.profileImageUrl - Base64 encoded profile image
   * @param {string} req.body.fullName - Full name of the service provider
   * @param {string} req.body.bio - Professional biography/description
   * @param {string} req.body.phoneNumber - 10-digit contact number
   * @param {string} req.body.email - Email address
   * @param {string} req.body.panNumber - PAN card number (format: AAAAA9999A)
   * @param {number} req.body.yearOfExperience - Years of professional experience
   * @param {Array<string>} req.body.sportsCategories - List of sports expertise
   * @param {Array<string>} req.body.selectedServiceTypes - Types of services offered
   * @param {Array<string>} req.body.serviceImageUrls - Base64 encoded service images
   * @param {Object} req.body.serviceOptions - Service delivery options (one-on-one, team, online)
   * @param {Array<string>} req.body.availableDays - Days of the week available
   * @param {Array<string>} req.body.supportedAgeGroups - Age groups served
   * @param {Array<Object>} [req.body.education] - Educational background
   * @param {Array<Object>} [req.body.experience] - Professional experience details
   * @param {Array<Object>} [req.body.certificates] - Professional certifications
   * @param {string} req.body.selectLocation - Location name
   * @param {number} req.body.longitude - GPS longitude
   * @param {number} req.body.latitude - GPS latitude
   * @param {string} req.body.packageRef - Subscription package reference
   *
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   *
   * @returns {Object} JSON response with created individual service provider data
   * @throws {ValidationError} When required fields are missing or invalid
   */
  //#region CreateIndividual
  async createIndividual(req, res, next) {
    const individualValidation = Joi.object({
      profileImageUrl: Joi.string().required(), // Base64 encoded profile image
      fullName: Joi.string().required(),
      bio: Joi.string().required(), // Professional description
      phoneNumber: Joi.string()
        .pattern(/^[0-9]{10}$/) // Exactly 10 digits
        .required(),
      email: Joi.string().email().required(),
      panNumber: Joi.string()
        .pattern(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/) // Standard PAN format
        .required(),
      yearOfExperience: Joi.number().min(0).required(), // Non-negative experience
      sportsCategories: Joi.array().items(Joi.string()).min(1).required(), // At least one sport
      selectedServiceTypes: Joi.array().items(Joi.string()).min(1).required(), // At least one service type
      serviceImageUrls: Joi.array().items(Joi.string()).min(1).required(), // At least one service image
      // Service delivery options
      serviceOptions: Joi.object({
        providesOneOnOne: Joi.boolean().default(false),
        providesTeamService: Joi.boolean().default(false),
        providesOnlineService: Joi.boolean().default(false),
      }).required(),
      availableDays: Joi.array().items(Joi.string()).required(), // Days of availability
      supportedAgeGroups: Joi.array().items(Joi.string()).min(1).required(), // Age groups served
      // Optional educational background
      education: Joi.array()
        .items(
          Joi.object({
            degree: Joi.string().required(),
            field: Joi.string().required(),
            institution: Joi.string().required(),
            startDate: Joi.string().required(),
            endDate: Joi.string().optional().allow(null), // Can be null for ongoing
            isCurrently: Joi.boolean().default(false), // Currently studying flag
          }),
        )
        .optional(),
      // Optional professional experience
      experience: Joi.array()
        .items(
          Joi.object({
            title: Joi.string().required(),
            organization: Joi.string().required(),
            startDate: Joi.string().required(),
            endDate: Joi.string().optional().allow(null), // Can be null for current job
            isCurrently: Joi.boolean().default(false), // Currently working flag
            description: Joi.string().optional(),
          }),
        )
        .optional(),
      // Optional certifications
      certificates: Joi.array()
        .items(
          Joi.object({
            name: Joi.string().required(),
            issuedBy: Joi.string().required(),
            issueDate: Joi.string().required(),
          }),
        )
        .optional(),
      selectLocation: Joi.string().required(), // Location name
      longitude: Joi.number().required(), // GPS coordinates
      latitude: Joi.number().required(),
      packageRef: Joi.string().required(), // Subscription package
    })

    const { error } = individualValidation.validate(req.body)
    if (error) {
      return next(
        CustomErrorHandler.badRequest(`Failed to Validate request: ${error.details.map((e) => e.message).join(", ")}`),
      )
    }

    try {
      // Create individual service provider through service layer
      const result = await ProviderServices.createIndividual(req.body)
      return res.status(200).json({
        success: true,
        message: "Individual service created successfully",
        data: { individual: result },
      })
    } catch (error) {
      return next(CustomErrorHandler.badRequest("Failed to create individual service:", error))
    }
  },
  //#endregion

  /**
   * @function editIndividualService
   * @description Updates existing individual service provider information
   * @route POST /api/provider/editIndividualService
   * @access Private (requires authentication)
   *
   * @param {Object} req - Express request object
   * @param {string} req.body.serviceId - ID of service to update (required)
   * @param {...} req.body - Any individual service fields to update (all optional except serviceId)
   *
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   *
   * @returns {Object} JSON response with updated individual service data
   */
  //#region editIndividualService
  async editIndividualService(req, res, next) {
    const individualValidation = Joi.object({
      serviceId: Joi.string().required(), // Only required field for updates
      profileImageUrl: Joi.string().optional(),
      fullName: Joi.string().optional(),
      bio: Joi.string().optional(),
      phoneNumber: Joi.string()
        .pattern(/^[0-9]{10}$/)
        .optional(),
      email: Joi.string().email().optional(),
      panNumber: Joi.string()
        .pattern(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/)
        .optional(),
      yearOfExperience: Joi.number().min(0).optional(),
      sportsCategories: Joi.array().items(Joi.string()).min(1).optional(),
      selectedServiceTypes: Joi.array().items(Joi.string()).min(1).optional(),
      serviceImageUrls: Joi.array().items(Joi.string()).min(1).optional(),
      serviceOptions: Joi.object({
        providesOneOnOne: Joi.boolean().default(false),
        providesTeamService: Joi.boolean().default(false),
        providesOnlineService: Joi.boolean().default(false),
      }).optional(),
      availableDays: Joi.array().items(Joi.string()).optional(),
      supportedAgeGroups: Joi.array().items(Joi.string()).min(1).optional(),
      // Same structure as create but all optional
      education: Joi.array()
        .items(
          Joi.object({
            degree: Joi.string().required(),
            field: Joi.string().required(),
            institution: Joi.string().required(),
            startDate: Joi.string().required(),
            endDate: Joi.string().optional().allow(null),
            isCurrently: Joi.boolean().default(false),
          }),
        )
        .optional(),
      experience: Joi.array()
        .items(
          Joi.object({
            title: Joi.string().required(),
            organization: Joi.string().required(),
            startDate: Joi.string().required(),
            endDate: Joi.string().optional().allow(null),
            isCurrently: Joi.boolean().default(false),
            description: Joi.string().optional(),
          }),
        )
        .optional(),
      certificates: Joi.array()
        .items(
          Joi.object({
            name: Joi.string().required(),
            issuedBy: Joi.string().required(),
            issueDate: Joi.string().required(),
          }),
        )
        .optional(),
      selectLocation: Joi.string().optional(),
      longitude: Joi.number().optional(),
      latitude: Joi.number().optional(),
    })

    const { error } = individualValidation.validate(req.body)
    if (error) {
      return next(
        CustomErrorHandler.badRequest(`Failed to Validate request: ${error.details.map((e) => e.message).join(", ")}`),
      )
    }

    try {
      // Update individual service through service layer
      const result = await ProviderServices.editIndividualService(req.body)
      return res.status(200).json({
        success: true,
        message: "Individual service updated successfully",
        data: { individual: result },
      })
    } catch (error) {
      return next(CustomErrorHandler.badRequest("Failed to update individual service:", error))
    }
  },

  /**
   * @function getIndividualById
   * @description Retrieves detailed information about a specific individual service provider
   * @route GET /api/provider/getIndividualById/:id
   * @access Public
   *
   * @param {Object} req - Express request object
   * @param {string} req.params.id - Individual service provider ID
   *
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   *
   * @returns {Object} JSON response with individual service provider details
   */
  //#region getIndividualById
  async getIndividualById(req, res, next) {
    const validation = Joi.object({
      id: Joi.string().required(),
    })

    const { error } = validation.validate(req.params)
    if (error) {
      return next(CustomErrorHandler.badRequest("Failed to Validate request:", error))
    }

    try {
      // Retrieve individual details from service layer
      const result = await ProviderServices.getIndividualById(req.params)
      return res.json({
        success: true,
        message: "Individual retrieved successfully",
        data: result,
      })
    } catch (error) {
      return next(CustomErrorHandler.badRequest("Failed to get individual:", error))
    }
  },
  //#endregion

  /**
   * @function getUserIndividualRegisteredGround
   * @description Retrieves all individual services registered by the current authenticated user
   * @route GET /api/provider/getUserIndividualRegisteredService
   * @access Private (requires authentication)
   *
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   *
   * @returns {Object} JSON response with user's registered individual services
   */
  //#region getUserIndividualRegisterGround
  async getUserIndividualRegisteredGround(req, res, next) {
    try {
      // Get all individual services registered by current user
      const result = await ProviderServices.getUserIndividualRegisteredGround()
      return res.status(200).json({
        success: true,
        message: "User Individual Data Fetched successfully",
        data: { individual: result },
      })
    } catch (error) {
      return next(CustomErrorHandler.badRequest("Something went Wrong", error))
    }
  },
  //#endregion

  /**
   * @function lockSlots
   * @description Temporarily locks time slots for a user during the booking process
   * @route POST /api/provider/lockSlots
   * @access Private (requires authentication)
   *
   * This function implements a slot locking mechanism to prevent double bookings
   * during the payment process. Slots are locked for 10 minutes to allow users
   * to complete their payment without losing their selected time slots.
   *
   * @param {Object} req - Express request object
   * @param {string} req.body.venueId - ID of the venue
   * @param {string} req.body.sport - Sport type for the booking
   * @param {string} req.body.date - Date in YYYY-MM-DD format
   * @param {string} req.body.startTime - Start time of the slot
   * @param {string} req.body.endTime - End time of the slot
   * @param {number} req.body.playableArea - Required playable area size
   * @param {string} req.body.sessionId - Unique session identifier for the booking
   *
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   *
   * @returns {Object} JSON response with lock status and details
   * @throws {ValidationError} When required parameters are missing or invalid
   * @throws {ConflictError} When slots are already booked or locked by another user
   */
  //#region Lock Slots
  async lockSlots(req, res, next) {
    const validation = Joi.object({
      venueId: Joi.string().required(),
      sport: Joi.string().required(),
      date: Joi.string()
        .pattern(/^\d{4}-\d{2}-\d{2}$/) // YYYY-MM-DD format validation
        .required(),
      startTime: Joi.string().required(), // Time format (e.g., "09:00")
      endTime: Joi.string().required(), // Time format (e.g., "10:00")
      playableArea: Joi.number().min(1).required(), // Minimum area requirement
      sessionId: Joi.string().required(), // Unique session for tracking
    })

    const { error } = validation.validate(req.body)
    if (error) {
      return next(CustomErrorHandler.badRequest(`Failed to validate request: ${error}`))
    }

    try {
      // Legacy flow uses global.user — capture user context for service call
      // Note: Consider migrating to req.user for consistency
      const userInfo = global.user
      const result = await ProviderServices.lockSlots({
        ...req.body,
        userId: userInfo.userId, // Pass user context to service layer
      })
      return res.json({
        success: true,
        message: "Slots locked successfully",
        data: result,
      })
    } catch (error) {
      return next(CustomErrorHandler.badRequest(`Failed to lock slots: ${error}`))
    }
  },
  //#endregion

  /**
   * @function releaseLockedSlots
   * @description Releases previously locked time slots, making them available again
   * @route POST /api/provider/releaseLockedSlots
   * @access Private (requires authentication)
   *
   * This function allows users to release slots they have locked but decided not to book.
   * It's typically called when a user cancels their booking process or when the lock expires.
   *
   * @param {Object} req - Express request object
   * @param {string} req.body.venueId - ID of the venue
   * @param {string} req.body.sport - Sport type
   * @param {string} req.body.date - Date in YYYY-MM-DD format
   * @param {string} req.body.startTime - Start time of the slot to release
   * @param {string} req.body.endTime - End time of the slot to release
   * @param {number} req.body.playableArea - Playable area size
   * @param {string} req.body.sessionId - Session identifier used during locking
   *
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   *
   * @returns {Object} JSON response confirming slot release
   * @throws {ValidationError} When parameters don't match locked slot
   * @throws {NotFoundError} When no locked slots found for the session
   */
  //#region ReleaseLockedSlots
  async releaseLockedSlots(req, res, next) {
    const validation = Joi.object({
      venueId: Joi.string().required(),
      sport: Joi.string().allow(null).required(),
      date: Joi.string()
        .pattern(/^\d{4}-\d{2}-\d{2}$/) // Same date format as locking
        .required(),
      startTime: Joi.string().required(),
      endTime: Joi.string().required(),
      playableArea: Joi.number().min(1).required(),
      sessionId: Joi.string().required(), // Must match the locking session
    })

    const { error } = validation.validate(req.body)
    if (error) {
      return next(CustomErrorHandler.badRequest(`Failed to validate request: ${error}`))
    }

    try {
      // Use global.user for consistency with lockSlots
      const userInfo = global.user
      const result = await ProviderServices.releaseLockedSlots({
        ...req.body,
        userId: userInfo.userId, // Ensure user can only release their own locks
      })

      return res.json({
        success: true,
        message: "Locked slots released successfully",
        data: result,
      })
    } catch (error) {
      return next(CustomErrorHandler.badRequest("Failed to release locked slots:", error))
    }
  },

  /**
   * @function releaseMultipleSlots
   * @description Releases all locked slots for a specific session and venue
   * @route POST /api/provider/releaseMultipleSlots
   * @access Private (requires authentication)
   *
   * This is a bulk operation to release all slots locked under a specific session.
   * Useful when a user wants to cancel their entire booking session at once.
   *
   * @param {Object} req - Express request object
   * @param {string} req.body.venueId - ID of the venue
   * @param {string} req.body.sport - Sport type
   * @param {string} req.body.sessionId - Session identifier to release all slots for
   *
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   *
   * @returns {Object} JSON response confirming bulk slot release
   */
  //#region releaseMultipleSlots
  async releaseMultipleSlots(req, res, next) {
    const validation = Joi.object({
      venueId: Joi.string().required(),
      sport: Joi.string().required(),
      sessionId: Joi.string().required(), // Key identifier for bulk release
    })

    const { error } = validation.validate(req.body)
    if (error) {
      return next(CustomErrorHandler.badRequest(`Failed to validate request: ${error}`))
    }

    try {
      const userInfo = global.user
      const result = await ProviderServices.releaseMultipleSlots({
        ...req.body,
        userId: userInfo.userId,
      })

      return res.json({
        success: true,
        message: "Locked slots released successfully",
        data: result,
      })
    } catch (error) {
      return next(CustomErrorHandler.badRequest("Failed to release locked slots:", error))
    }
  },

  /**
   * @function reserveMultipleSlots
   * @description Reserves multiple time slots across different dates for a venue
   * @route POST /api/provider/reserveMultipleSlots
   * @access Private (requires authentication)
   *
   * This function allows users to reserve the same time slot across multiple dates,
   * useful for recurring bookings or bulk reservations.
   *
   * @param {Object} req - Express request object
   * @param {string} req.body.venueId - ID of the venue
   * @param {string} req.body.sport - Sport type
   * @param {Array<string>} req.body.date - Array of dates in YYYY-MM-DD format
   * @param {number} req.body.playableArea - Required playable area size
   * @param {string} req.body.sessionId - Session identifier for tracking
   *
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   *
   * @returns {Object} JSON response with reservation details
   * @throws {ValidationError} When date array is empty or invalid
   */
  async reserveMultipleSlots(req, res, next) {
    const validation = Joi.object({
      venueId: Joi.string().required(),
      sport: Joi.string().required(),
      date: Joi.array()
        .items(Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/)) // Array of valid dates
        .min(1) // At least one date required
        .required(),
      playableArea: Joi.number().min(1).required(),
      sessionId: Joi.string().required(),
    })

    const { error } = validation.validate(req.body)
    if (error) {
      return next(CustomErrorHandler.badRequest(`Failed to validate request: ${error}`))
    }

    try {
      const userInfo = global.user
      const result = await ProviderServices.reserveMultipleSlots({
        ...req.body,
        userId: userInfo.userId,
      })

      return res.json({
        success: true,
        message: "Multiple slots reserved successfully",
        data: result,
      })
    } catch (error) {
      return next(CustomErrorHandler.badRequest(`Failed to reserve multiple slots: ${error}`))
    }
  },
  //#endregion

  /**
   * @function Confirm Payment
   */
  //#region Confirm Payment
  async confirmPayment(req, res, next) {
    const validation = Joi.object({
      venueId: Joi.string().required(),
      sport: Joi.string().required(),
      sessionId: Joi.string().required(),
      razorpayPaymentId: Joi.string().required(),
      durationInHours: Joi.number().required(),
      baseAmount: Joi.number().required(),
      totalAmount: Joi.number().required(),
      processingFee: Joi.number().required(),
      convenienceFee: Joi.number().required(),
      gstamount: Joi.number().required(),
    })

    const { error } = validation.validate(req.body)
    if (error) {
      return next(CustomErrorHandler.badRequest(`Failed to validate request: ${error}`))
    }

    try {
      const userInfo = global.user
      const result = await ProviderServices.confirmPayment({
        ...req.body,
        userId: userInfo.userId,
      })

      return res.json({
        success: true,
        message: "Payment confirmed and booking finalized",
        data: { updatedbooking: result },
      })
    } catch (error) {
      return next(CustomErrorHandler.badRequest("Failed to confirm payment:", error))
    }
  },
  //#endregion
  /**
   * @function getUserBookings
   * @description Retrieves all bookings made by the current authenticated user
   * @route GET /api/provider/getUserBookings/:page
   * @access Private (requires authentication)
   *
   * @param {Object} req - Express request object
   * @param {number} [req.params.page=1] - Page number for pagination
   *
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   *
   * @returns {Object} JSON response with user's booking history
   */
  //#region getUserBookings
  async getUserBookings(req, res, next) {
    const validation = Joi.object({
      page: Joi.number().min(1).default(1), // Page number validation
    })

    const { error } = validation.validate(req.params)
    if (error) return next(CustomErrorHandler.badRequest(`Failed to Validate request:${error}`))

    try {
      // Get user's booking history from service layer
      const result = await ProviderServices.getUserBookings(req.params)
      return res.json({
        success: true,
        message: "User bookings retrieved successfully",
        data: { bookings: result },
      })
    } catch (error) {
      return next(CustomErrorHandler.badRequest("Failed to get user bookings:", error))
    }
  },

  /**
   * @function cancelBooking
   * @description Cancels an existing booking with a reason
   * @route PUT /api/provider/cancelBooking/:bookingId
   * @access Private (requires authentication)
   *
   * @param {Object} req - Express request object
   * @param {string} req.params.bookingId - ID of booking to cancel
   * @param {string} req.body.cancellationReason - Reason for cancellation
   * @param {string} req.user.id - User ID from auth middleware
   *
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   *
   * @returns {Object} JSON response confirming cancellation
   * @throws {ValidationError} When bookingId or reason is missing
   * @throws {NotFoundError} When booking doesn't exist or doesn't belong to user
   */
  //#region cancelBooking
  async cancelBooking(req, res, next) {
    const validation = Joi.object({
      bookingId: Joi.string().required(), // From URL params
      cancellationReason: Joi.string().required(), // From request body
    })

    const { error } = validation.validate({
      bookingId: req.params.bookingId,
      cancellationReason: req.body.cancellationReason,
    })

    if (error) {
      return next(CustomErrorHandler.badRequest("Failed to Validate request:", error))
    }

    try {
      // Cancel booking with user verification
      const result = await ProviderServices.cancelBooking(
        req.params.bookingId,
        req.body.cancellationReason,
        req.user.id, // Ensure user can only cancel their own bookings
      )
      return res.json({
        success: true,
        message: "Booking cancelled successfully",
        data: result,
      })
    } catch (error) {
      return next(CustomErrorHandler.badRequest("Failed to cancel booking:", error))
    }
  },
  //#endregion

  /**
   * @function GetServiceType
   * @description Retrieves all available service types for individual providers
   * @route GET /api/provider/serviceTypes (implied)
   * @access Public
   *
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   *
   * @returns {Object} JSON response with available service types
   */
  //#region GetServicetype
  async GetServiceType(req, res, next) {
    try {
      // Get service types from service layer
      const result = await ProviderServices.GetServiceType()
      return res.json({
        success: true,
        message: "Service Type Retrieved Successfully",
        data: { service_type: result },
      })
    } catch (error) {
      console.log("Unable to fetch service type:", error)
    }
  },

  /**
   * @function getNearbyVenues
   * @description Retrieves venues near a specific location with filtering options
   * @route POST /api/provider/getNearbyVenues
   * @access Private (requires authentication)
   *
   * @param {Object} req - Express request object
   * @param {number} req.body.latitude - User's latitude coordinate
   * @param {number} req.body.longitude - User's longitude coordinate
   * @param {number} [req.body.page=1] - Page number for pagination
   * @param {number} [req.body.radius=25] - Search radius in kilometers (max 100)
   * @param {string} [req.body.sport=all] - Filter by specific sport
   * @param {string} [req.body.venueType=all] - Filter by venue type
   * @param {Array<string>} [req.body.surfaceTypes=[]] - Filter by surface types
   * @param {Object} [req.body.priceRange={}] - Filter by price range
   *
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   *
   * @returns {Object} JSON response with nearby venues matching filters
   * @throws {ValidationError} When coordinates are invalid or out of range
   */
  //#region getNearbyVenue
  async getNearbyVenues(req, res, next) {
    const validation = Joi.object({
      latitude: Joi.number().required(), // GPS coordinates required
      longitude: Joi.number().required(),
      page: Joi.number().min(1).default(1), // Pagination support
      radius: Joi.number().min(1).max(100).default(25), // Search radius limits
      sport: Joi.string().default("all"), // Sport filter
      venueType: Joi.string().valid("all", "Open Venue", "Turf", "Stadium").default("all"), // Venue type filter
      // Surface type filtering with predefined options
      surfaceTypes: Joi.array()
        .items(
          Joi.string().valid(
            "PVC",
            "Synthetic PVC",
            "8 Layered Acrylic Surface",
            "Wooden",
            "Natural Grass Lane",
            "Artificial Grass Lane",
            "Hard Court",
            "Natural Grass Turf",
          ),
        )
        .default([]),
      // Price range filtering
      priceRange: Joi.object({
        min: Joi.number().min(0).optional(), // Minimum price filter
        max: Joi.number().min(0).optional(), // Maximum price filter
      }).default({}),
    })

    const { error } = validation.validate(req.body)
    if (error) {
      return next(CustomErrorHandler.badRequest(`Validation failed:${error}`))
    }

    try {
      // Get nearby venues with applied filters
      const result = await ProviderServices.getNearbyVenues(req.body)
      return res.json({
        success: true,
        message: "Nearby venues with filters retrieved successfully",
        data: result,
      })
    } catch (error) {
      return next(CustomErrorHandler.badRequest("Failed to get nearby venues:", error))
    }
  },

  /**
   * @function getNearbyIndividuals
   * @description Retrieves individual service providers near a specific location
   * @route POST /api/provider/getNearbyindividuals
   * @access Private (requires authentication)
   *
   * @param {Object} req - Express request object
   * @param {number} req.body.latitude - User's latitude coordinate
   * @param {number} req.body.longitude - User's longitude coordinate
   * @param {number} [req.body.page=1] - Page number for pagination
   * @param {number} [req.body.radius=25] - Search radius in kilometers
   * @param {Array<string>} [req.body.sports=[]] - Filter by sports expertise
   * @param {string} [req.body.serviceType=all] - Filter by service delivery type
   * @param {string} [req.body.ageGroup=all] - Filter by supported age groups
   * @param {Object} [req.body.experienceRange={}] - Filter by years of experience
   *
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   *
   * @returns {Object} JSON response with nearby individual service providers
   */
  //#region getNearbyIndividuals
  async getNearbyIndividuals(req, res, next) {
    const validation = Joi.object({
      latitude: Joi.number().required(),
      longitude: Joi.number().required(),
      page: Joi.number().min(1).default(1),
      radius: Joi.number().min(1).max(100).default(25),
      sports: Joi.array().items(Joi.string()).default([]), // Sports expertise filter
      serviceType: Joi.string().valid("all", "one_on_one", "team_service", "online_service").default("all"), // Service delivery type
      ageGroup: Joi.string().default("all"), // Age group specialization
      // Experience range filtering
      experienceRange: Joi.object({
        min: Joi.number().min(0).optional(),
        max: Joi.number().min(0).optional(),
      }).default({}),
    })

    const { error } = validation.validate(req.body)
    if (error) {
      return next(CustomErrorHandler.badRequest("Validation failed:", error))
    }

    try {
      // Get nearby individuals with applied filters
      const result = await ProviderServices.getNearbyIndividuals(req.body)
      return res.json({
        success: true,
        message: "Nearby individuals with filters retrieved successfully",
        data: result,
      })
    } catch (error) {
      return next(CustomErrorHandler.badRequest("Failed to get nearby individuals:", error))
    }
  },

  /**
   * @function searchVenuesWithFilters
   * @description Searches venues by query string with location and filter options
   * @route POST /api/provider/searchVenues
   * @access Public
   *
   * @param {Object} req - Express request object
   * @param {string} req.body.query - Search query string (venue name, location, etc.)
   * @param {number} req.body.latitude - User's latitude for distance calculation
   * @param {number} req.body.longitude - User's longitude for distance calculation
   * @param {number} [req.body.page=1] - Page number for pagination
   * @param {number} [req.body.radius=25] - Search radius in kilometers
   * @param {string} [req.body.sport=all] - Sport filter
   * @param {string} [req.body.venueType=all] - Venue type filter
   * @param {Array<string>} [req.body.surfaceTypes=[]] - Surface type filters
   * @param {Object} [req.body.facilities={}] - Facility availability filters
   * @param {Object} [req.body.priceRange={}] - Price range filters
   *
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   *
   * @returns {Object} JSON response with search results
   */
  //#region searchVenuesWithFilters
  async searchVenuesWithFilters(req, res, next) {
    const validation = Joi.object({
      query: Joi.string().min(1).required(), // Search query required
      latitude: Joi.number().required(), // Location context required
      longitude: Joi.number().required(),
      page: Joi.number().min(1).default(1),
      radius: Joi.number().min(1).max(100).default(25),
      sport: Joi.string().default("all"),
      venueType: Joi.string().valid("all", "Open Venue", "Turf", "Stadium").default("all"),
      surfaceTypes: Joi.array()
        .items(
          Joi.string().valid(
            "PVC",
            "Synthetic PVC",
            "8 Layered Acrylic Surface",
            "Wooden",
            "Natural Grass Lane",
            "Artificial Grass Lane",
            "Hard Court",
            "Natural Grass Turf",
          ),
        )
        .default([]),
      // Facility-based filtering
      facilities: Joi.object({
        isWaterAvailable: Joi.boolean().optional(),
        isParkingAvailable: Joi.boolean().optional(),
        isEquipmentProvided: Joi.boolean().optional(),
        isWashroomAvailable: Joi.boolean().optional(),
        isChangingRoomAvailable: Joi.boolean().optional(),
        isFloodlightAvailable: Joi.boolean().optional(),
        isSeatingLoungeAvailable: Joi.boolean().optional(),
        isFirstAidAvailable: Joi.boolean().optional(),
        isWalkingTrackAvailable: Joi.boolean().optional(),
      }).default({}),
      priceRange: Joi.object({
        min: Joi.number().min(0).optional(),
        max: Joi.number().min(0).optional(),
      }).default({}),
    })

    const { error } = validation.validate(req.body)
    if (error) {
      return next(CustomErrorHandler.badRequest("Validation failed:", error))
    }

    try {
      // Perform venue search with filters
      const result = await ProviderServices.searchVenuesWithFilters(req.body)
      return res.json({
        success: true,
        message: "Venue search with filters completed successfully",
        data: result,
      })
    } catch (error) {
      return next(CustomErrorHandler.badRequest("Failed to search venues:", error))
    }
  },

  /**
   * @function searchIndividualsWithFilters
   * @description Searches individual service providers by query with filters
   * @route POST /api/provider/searchIndividuals
   * @access Public
   *
   * @param {Object} req - Express request object
   * @param {string} req.body.query - Search query (name, expertise, etc.)
   * @param {number} req.body.latitude - User's latitude
   * @param {number} req.body.longitude - User's longitude
   * @param {number} [req.body.page=1] - Page number
   * @param {number} [req.body.radius=25] - Search radius
   * @param {Array<string>} [req.body.sports=[]] - Sports filter
   * @param {string} [req.body.serviceType=all] - Service type filter
   * @param {string} [req.body.ageGroup=all] - Age group filter
   * @param {Object} [req.body.experienceRange={}] - Experience range filter
   *
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   *
   * @returns {Object} JSON response with individual search results
   */
  //#region searchIndividualsWithFilters
  async searchIndividualsWithFilters(req, res, next) {
    const validation = Joi.object({
      query: Joi.string().min(1).required(),
      latitude: Joi.number().required(),
      longitude: Joi.number().required(),
      page: Joi.number().min(1).default(1),
      radius: Joi.number().min(1).max(100).default(25),
      sports: Joi.array().items(Joi.string()).default([]),
      serviceType: Joi.string().valid("all", "one_on_one", "team_service", "online_service").default("all"),
      ageGroup: Joi.string().default("all"),
      experienceRange: Joi.object({
        min: Joi.number().min(0).optional(),
        max: Joi.number().min(0).optional(),
      }).default({}),
    })

    const { error } = validation.validate(req.body)
    if (error) {
      return next(CustomErrorHandler.badRequest("Validation failed:", error))
    }

    try {
      // Perform individual search with filters
      const result = await ProviderServices.searchIndividualsWithFilters(req.body)
      return res.json({
        success: true,
        message: "Individual search with filters completed successfully",
        data: result,
      })
    } catch (error) {
      return next(CustomErrorHandler.badRequest("Failed to search individuals:", error))
    }
  },

  /**
   * @function combinedSearchWithFilters
   * @description Performs combined search across both venues and individuals
   * @route POST /api/provider/combinedSearchWithFilters (implied)
   * @access Public
   *
   * @param {Object} req - Express request object
   * @param {string} req.body.query - Search query string
   * @param {number} req.body.latitude - User's latitude
   * @param {number} req.body.longitude - User's longitude
   * @param {number} [req.body.page=1] - Page number
   * @param {number} [req.body.radius=25] - Search radius
   *
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   *
   * @returns {Object} JSON response with combined search results
   */
  //#region combinedSearchWithFilters
  async combinedSearchWithFilters(req, res, next) {
    const validation = Joi.object({
      query: Joi.string().min(1).required(),
      latitude: Joi.number().required(),
      longitude: Joi.number().required(),
      page: Joi.number().min(1).default(1),
      radius: Joi.number().min(1).max(100).default(25),
    })

    const { error } = validation.validate(req.body)
    if (error) {
      return next(CustomErrorHandler.badRequest("Validation failed:", error))
    }

    try {
      // Perform combined search across venues and individuals
      const result = await ProviderServices.combinedSearchWithFilters(req.body)
      return res.json({
        success: true,
        message: "Combined search completed successfully",
        data: result,
      })
    } catch (error) {
      return next(CustomErrorHandler.badRequest("Failed to perform combined search:", error))
    }
  },
  //#endregion

  // ==================== BACKWARD COMPATIBILITY METHODS ====================
  // The following methods provide backward compatibility for legacy API endpoints
  // They transform legacy request formats to new standardized formats

  /**
   * @function getNearbyVenue (Legacy)
   * @description Legacy endpoint for nearby venue search - transforms to new format
   * @deprecated Use getNearbyVenues instead
   */
  async getNearbyVenue(req, res, next) {
    try {
      const enhancedRequest = {
        latitude: req.body.latitude,
        longitude: req.body.longitude,
        page: req.body.page || 1,
        radius: req.body.radius || 25,
        sport: req.body.sport || "all",
        venueType: req.body.venueType || "all",
        surfaceTypes: req.body.surfaceTypes || [],
        facilities: req.body.facilities || {},
        priceRange: req.body.priceRange || {},
      }

      // Use new service method with transformed request
      const result = await ProviderServices.getNearbyVenues(enhancedRequest)

      return res.json({
        success: true,
        message: "Nearby venues retrieved successfully",
        data: result,
      })
    } catch (error) {
      return next(CustomErrorHandler.badRequest("Failed to get nearby venues:", error))
    }
  },

  /**
   * @function getNearbyindividuals (Legacy)
   * @description Legacy endpoint for nearby individuals - transforms to new format
   * @deprecated Use getNearbyIndividuals instead
   */
  async getNearbyindividuals(req, res, next) {
    try {
      const enhancedRequest = {
        latitude: req.body.latitude,
        longitude: req.body.longitude,
        page: req.body.page || 1,
        radius: req.body.radius || 25,
        sports: req.body.sports || [],
        serviceType: req.body.serviceType || "all",
        ageGroup: req.body.ageGroup || "all",
        experienceRange: req.body.experienceRange || {},
      }

      const result = await ProviderServices.getNearbyIndividuals(enhancedRequest)

      return res.json({
        success: true,
        message: "Nearby individuals retrieved successfully",
        data: result,
      })
    } catch (error) {
      return next(CustomErrorHandler.badRequest("Failed to get nearby individuals:", error))
    }
  },

  /**
   * @function venues (Legacy)
   * @description Legacy venue search endpoint - transforms to new format
   * @deprecated Use searchVenuesWithFilters instead
   */
  async venues(req, res, next) {
    try {
      const enhancedRequest = {
        query: req.body.query,
        latitude: req.body.latitude,
        longitude: req.body.longitude,
        page: req.body.page || 1,
        radius: req.body.radius || 25,
        sport: req.body.sport || "all",
        venueType: req.body.venueType || "all",
        surfaceTypes: req.body.surfaceTypes || [],
        facilities: req.body.facilities || {},
        priceRange: req.body.priceRange || {},
      }

      const result = await ProviderServices.searchVenuesWithFilters(enhancedRequest)

      return res.json({
        success: true,
        message: "Venue search completed successfully",
        data: result,
      })
    } catch (error) {
      return next(CustomErrorHandler.badRequest("Failed to search venues:", error))
    }
  },

  /**
   * @function individuals (Legacy)
   * @description Legacy individual search endpoint - transforms to new format
   * @deprecated Use searchIndividualsWithFilters instead
   */
  async individuals(req, res, next) {
    try {
      const enhancedRequest = {
        query: req.body.query,
        latitude: req.body.latitude,
        longitude: req.body.longitude,
        page: req.body.page || 1,
        radius: req.body.radius || 25,
        sports: req.body.sports || [],
        serviceType: req.body.serviceType || "all",
        ageGroup: req.body.ageGroup || "all",
        experienceRange: req.body.experienceRange || {},
      }

      const result = await ProviderServices.searchIndividualsWithFilters(enhancedRequest)

      return res.json({
        success: true,
        message: "Individual search completed successfully",
        data: result,
      })
    } catch (error) {
      return next(CustomErrorHandler.badRequest("Failed to search individuals:", error))
    }
  },

  /**
   * @function combined (Legacy)
   * @description Legacy combined search endpoint
   * @deprecated Use combinedSearchWithFilters instead
   */
  async combined(req, res, next) {
    try {
      // Use new combined search service directly
      const result = await ProviderServices.combinedSearchWithFilters(req.body)

      return res.json({
        success: true,
        message: "Combined search completed successfully",
        data: result,
      })
    } catch (error) {
      return next(CustomErrorHandler.badRequest("Failed to perform combined search:", error))
    }
  },
  //#endregion
}

// Export the controller for use in routes
export default ProviderController
