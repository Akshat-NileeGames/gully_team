import CustomErrorHandler from "../helpers/CustomErrorHandler.js"
import { ProviderServices } from "../services/index.js"
import Joi from "joi"
/**
 * ============================================================================
 * Controller Layer — General Structure and Conventions
 * ============================================================================
 *
 * Overview:
 * ----------
 * This controller is responsible for handling HTTP requests and responses.
 * Each handler performs the following core tasks:
 *   1. Validates incoming request data using Joi or other validators.
 *   2. Delegates core business logic to the appropriate Service layer.
 *   3. Returns standardized JSON responses or forwards errors to middleware.
 *
 * Standard Response Format:
 *   • Success → { success: true, message: string, data: any }
 *   • Errors  → Managed centrally via CustomErrorHandler + Express middleware.
 *
 * ============================================================================
 * Developer Notes (Conventions Used Across Controllers)
 * ============================================================================
 *
 * ➤ Async Handlers:
 *   - Always declared as `async` (due to I/O operations like DB/service calls).
 *   - Wrap logic in `try/catch` blocks.
 *   - On failure, forward errors using `next(CustomErrorHandler.*)` so centralized
 *     middleware handles logging, formatting, and response codes.
 *   - Always return a response or call `next()` to properly end the request lifecycle.
 *   - Keep controllers thin and side-effect free → validate → call service → respond.
 *
 * ➤ Joi Validation:
 *   - Use: `const { error, value } = schema.validate(req.<source>);`
 *   - For user-friendly messages: 
 *       `error.details.map(d => d.message).join(', ')`
 *   - Forward validation errors via:
 *       `return next(CustomErrorHandler.badRequest(error.details.map(e => e.message).join(', ')))`
 *   - Avoid sending raw Joi error objects to clients.
 *
 * ➤ CustomErrorHandler (Usage Conventions):
 *   - Common methods: `badRequest(message, err?)`, `validationError(message)`, `serverError(message, err?)`.
 *   - Prefer forwarding errors using `next(CustomErrorHandler.badRequest(...))` 
 *     instead of returning raw error objects.
 *   - Some legacy patterns call `CustomErrorHandler.validationError(...)` directly;
 *     update these to use `next(...)` for proper middleware flow.
 *   - Keep messages concise and avoid exposing internal or sensitive data.
 *
 * ➤ Retrieving User Context:
 *   - Preferred: `req.user` (set by authentication middleware).
 *   - Legacy: `global.user` may still exist in older modules (e.g., slot management).
 *   - Always validate the presence of `userId` before use.
 *   - Migrate legacy flows to `req.user` during refactors.
 *
 * ➤ Response Shape:
 *   - Success responses follow:
 *       { success: true, message: string, data: any }
 *   - All errors are propagated to centralized middleware via `next(CustomErrorHandler.*)`.
 *
 * ============================================================================
 * Purpose:
 * ----------
 * This structure ensures:
 *   • Consistency across all controller implementations.
 *   • Predictable and maintainable request handling.
 *   • Clear separation of concerns between controllers and services.
 *   • Scalable and debuggable backend architecture.
 * ============================================================================
 */

const ProviderController = {
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

  //#region Get Today's Bookings
  async getTodayBookings(req, res, next) {
    const validation = Joi.object({
      venueId: Joi.string().required(),
      sport: Joi.string().allow('').optional()
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


  //#region getDashBoardAnalytics
  async getDashboardAnalytics(req, res, next) {
    const validation = Joi.object({
      venueId: Joi.string().required(),
      sport: Joi.string().allow('').optional(),
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


  async getRevenueAnalytics(req, res, next) {
    const validation = Joi.object({
      venueId: Joi.string().required(),
      period: Joi.string().valid("week", "month", "quarter", "year").default("year"),
      sport: Joi.string().allow('').optional(),
      comparison: Joi.boolean().default(false), // Enable/disable comparison data
    })

    const { error } = validation.validate({ ...req.params, ...req.query })
    if (error) {
      return next(CustomErrorHandler.badRequest(`Failed to validate request:${error}`,))
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
            id: Joi.string().optional(),
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
            id: Joi.string().optional(),
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
            id: Joi.string().optional(),
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


  //#region ReleaseLockedSlots
  async releaseLockedSlots(req, res, next) {
    const validation = Joi.object({
      venueId: Joi.string().required(),
      sport: Joi.string().allow('').required(),
      date: Joi.string()
        .pattern(/^\d{4}-\d{2}-\d{2}$/)
        .required(),
      startTime: Joi.string().required(),
      endTime: Joi.string().required(),
      playableArea: Joi.number().min(1).required(),
      sessionId: Joi.string().required(),
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
