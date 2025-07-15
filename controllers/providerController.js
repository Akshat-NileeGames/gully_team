import CustomErrorHandler from "../helpers/CustomErrorHandler.js"
import { ProviderServices } from "../services/index.js"
import Joi from "joi"

const ProviderController = {

    //#region Create Venue
    async createVenue(req, res, next) {
        const venueValidation = Joi.object({
            venue_name: Joi.string().required(),
            venue_description: Joi.string().required(),
            venue_address: Joi.string().required(),
            venue_contact: Joi.string()
                .pattern(/^[0-9]{10}$/)
                .required(),
            venue_type: Joi.string().valid("Open Venue", "Turf", "Stadium").required(),
            venue_surfacetype: Joi.string()
                .valid(
                    "PVC",
                    "Synthetic PVC",
                    "8 Layered Acrylic Surface",
                    "Wooden",
                    "Natural Grass Lane",
                    "Artificial Grass Lane",
                    "Hard Court",
                    "Natural Grass Turf",
                )
                .required(),
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
            venue_sports: Joi.array().items(Joi.string()).min(1).required(),
            sportPricing: Joi.array()
                .items(
                    Joi.object({
                        sport: Joi.string().required(),
                        perHourCharge: Joi.number().min(0).required(),
                    }),
                )
                .optional(),
            perHourCharge: Joi.number().min(0).required(),
            paymentMethods: Joi.array()
                .items(Joi.string().valid("Cash", "UPI", "Credit Card", "Debit Card", "Bank Transfer"))
                .min(1)
                .required(),
            upiId: Joi.string()
                .pattern(/^[\w.-]+@[\w]+$/)
                .required(),
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
            venueImages: Joi.array().items(Joi.string()).min(1).max(5).required(),
            selectLocation: Joi.string().required(),
            longitude: Joi.number().required(),
            latitude: Joi.number().required(),
            // subscriptionExpiry: Joi.date().iso().required(),
            packageRef: Joi.string().required(),
        })

        const { error } = venueValidation.validate(req.body)
        if (error) {
            return next(CustomErrorHandler.badRequest(`Failed to Validate request:${error}`))
        }

        try {
            const result = await ProviderServices.createVenue(req.body)
            return res.status(200).json({
                success: true,
                message: "Venue created successfully",
                data: result,
            })
        } catch (error) {
            return next(CustomErrorHandler.badRequest("Failed to create Venue:", error))
        }
    },
    //#endregion
    //#region GetAllGrounds
    async getAllGrounds(req, res, next) {
        try {
            const { page = 1, limit = 10, search, sportsCategory, location, radius = 10 } = req.query
            const result = await ProviderServices.getAllGrounds({
                page: Number.parseInt(page),
                limit: Number.parseInt(limit),
                search,
                sportsCategory,
                location: location ? JSON.parse(location) : null,
                radius: Number.parseFloat(radius),
            })

            return res.json({
                success: true,
                message: "Grounds retrieved successfully",
                data: result,
            })
        } catch (error) {
            return next(CustomErrorHandler.badRequest("Failed to get grounds:", error))
        }
    },
    //#endregion
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
            const result = await ProviderServices.getVenueById(req.params)
            return res.json({
                success: true,
                message: "Venue retrieved successfully",
                data: result,
            })
        } catch (error) {
            return next(CustomErrorHandler.badRequest("Failed to get Venue:", error))
        }
    },
    //#endregion

    //#region getUserGroundRegisteredGround
    async getUserGroundRegisteredGround(req, res, next) {
        try {
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

    //#region Book Venue 
    async bookVenue(req, res, next) {
        const bookingValidation = Joi.object({
            venueId: Joi.string().required(),
            sport: Joi.string().required(),
            bookingPattern: Joi.string().optional(),
            scheduledDates: Joi.array().items(
                Joi.object({
                    date: Joi.date().required(),
                    timeSlots: Joi.array().items(
                        Joi.object({ startTime: Joi.string().required(), endTime: Joi.string().required() }),).required(),
                })).min(1).required(),
            durationInHours: Joi.number().required(),
            totalamount: Joi.number().required(),
            paymentStatus: Joi.string().optional(),
            bookingStatus: Joi.string().optional(),
        });

        const { error } = bookingValidation.validate(req.body)
        if (error) {
            return next(CustomErrorHandler.badRequest(`Failed to Validate request:${error}`));
        }
        try {
            const result = await ProviderServices.bookVenue(req.body)
            return res.status(200).json({
                success: true,
                message: "Venue booked successfully",
                data: result,
            })
        } catch (error) {
            return next(CustomErrorHandler.badRequest(`Failed to book venue:${error}`))
        }
    },
    //#endregion

    //#region getnearbyVenu
    async getNearbyVenues(req, res, next) {
        const validation = Joi.object({
            latitude: Joi.number().required(),
            longitude: Joi.number().required(),
            page: Joi.number().min(1).optional(),
        })

        const { error } = validation.validate(req.body)
        if (error) {
            return next(CustomErrorHandler.badRequest(`Failed to validate request:${error}`,))
        }

        try {
            const result = await ProviderServices.getNearbyVenues(req.body)
            return res.json({
                success: true,
                message: "Nearby venues retrieved successfully",
                data: { venues: result },
            })
        } catch (error) {
            console.log(`The error is:${error}`);
            return next(CustomErrorHandler.badRequest("Failed to get nearby venues:", error))
        }
    },
    //#endregion

    //#region GetNearbyIndividuals
    async getNearbyIndividuals(req, res, next) {
        const validation = Joi.object({
            latitude: Joi.number().required(),
            longitude: Joi.number().required(),
            page: Joi.number().optional(),
        })

        const { error } = validation.validate(req.body)
        if (error) {
            return next(CustomErrorHandler.badRequest("Failed to validate request:", error))
        }

        try {
            const result = await ProviderServices.getNearbyIndividuals(req.body)
            return res.json({
                success: true,
                message: "Nearby individuals retrieved successfully",
                data: { individuals: result },
            })
        } catch (error) {
            return next(CustomErrorHandler.badRequest("Failed to get nearby individuals:", error))
        }
    },
    //#endregion 
    //#region Search venue
    async searchVenues(req, res, next) {
        const validation = Joi.object({
            query: Joi.string().min(1).required(),
            latitude: Joi.number().required(),
            longitude: Joi.number().required(),
            page: Joi.number().min(1).default(1),
            radius: Joi.number().default(15),
            sport: Joi.string().allow('').optional(),
            venueType: Joi.string().valid("Open Venue", "Turf", "Stadium").optional(),
            priceRange: Joi.object({
                min: Joi.number().min(0).optional(),
                max: Joi.number().min(0).optional(),
            }).optional(),
        })
        const { error } = validation.validate(req.body)
        if (error) {
            return next(CustomErrorHandler.badRequest(error))
        }
        try {
            const result = await ProviderServices.searchVenues(req.body)
            return res.json({
                success: true,
                message: "Venues search completed successfully",
                data: result,
            })
        } catch (error) {
            return next(CustomErrorHandler.badRequest("Failed to search venues:", error))
        }
    },
    //#endregion 
    //#region searchIndividual
    async searchIndividuals(req, res, next) {
        const validation = Joi.object({
            query: Joi.string().min(1).required(),
            latitude: Joi.number().required(),
            longitude: Joi.number().required(),
            page: Joi.number().min(1).default(1),
            radius: Joi.number().min(1).max(15).default(15),
            sport: Joi.string().allow('').optional(),
            serviceType: Joi.string().valid("one_on_one", "team_service", "online_service").optional(),
            experienceRange: Joi.object({
                min: Joi.number().min(0).optional(),
                max: Joi.number().min(0).optional(),
            }).optional(),
            ageGroup: Joi.string().optional(),
        })

        const { error } = validation.validate(req.body)
        if (error) {
            return next(
                CustomErrorHandler.badRequest(
                    `Location coordinates are required for search individual. Please enable location services.:${error}`

                ),
            )
        }

        try {
            const result = await ProviderServices.searchIndividuals(req.body)
            return res.json({
                success: true,
                message: "Individuals search completed successfully",
                data: result,
            })
        } catch (error) {
            return next(CustomErrorHandler.badRequest("Failed to search individuals:", error))
        }
    },
    //#endregion 
    //#region combinedSearch
    async combinedSearch(req, res, next) {
        const validation = Joi.object({
            query: Joi.string().min(1).required(),
            latitude: Joi.number().min(-90).max(90).required(), // Made required
            longitude: Joi.number().min(-180).max(180).required(), // Made required
            page: Joi.number().min(1).default(1),
            limit: Joi.number().min(1).max(50).default(10),
            radius: Joi.number().min(1).max(15).default(15), // Max 15km
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
            const result = await ProviderServices.combinedSearch(req.body);
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
    //#region Get Available Slots
    async getAvailableSlots(req, res, next) {
        const validation = Joi.object({
            venueId: Joi.string().required(),
            sport: Joi.string().required(),
            date: Joi.date().required(),
        })

        const { error } = validation.validate(req.body)
        if (error) {
            return next(CustomErrorHandler.badRequest("Failed to Validate request:", error))
        }

        try {
            const result = await ProviderServices.getAvailableSlots(req.body)
            return res.json({
                success: true,
                message: "Available slots retrieved successfully",
                data: result,
            })
        } catch (error) {
            return next(CustomErrorHandler.badRequest("Failed to get available slots:", error))
        }
    },
    //#endregion

    //#region Get Booked Slots 
    async getBookedSlots(req, res, next) {
        const validation = Joi.object({
            venueId: Joi.string().required(),
            sport: Joi.string().required(),
            date: Joi.date().required(),
        })

        const { error } = validation.validate(req.body)
        if (error) {
            return next(CustomErrorHandler.badRequest("Failed to Validate request:", error))
        }

        try {
            const result = await ProviderServices.getBookedSlots(req.body)
            return res.json({
                success: true,
                message: "Booked slots retrieved successfully",
                data: result,
            })
        } catch (error) {
            return next(CustomErrorHandler.badRequest("Failed to get booked slots:", error))
        }
    },
    //#endregion 

    //#region getGroundBookings
    async getGroundBookings(req, res, next) {
        const validation = Joi.object({
            venueId: Joi.string().required(),
            startDate: Joi.date().optional(),
            endDate: Joi.date().optional(),
            sport: Joi.string().optional(),
            status: Joi.string().valid("pending", "confirmed", "cancelled", "completed").optional(),
            paymentStatus: Joi.string().valid("pending", "successful", "failed", "refunded").optional(),
            page: Joi.number().min(1).default(1),
            limit: Joi.number().min(1).max(50).default(10),
        })

        const { error } = validation.validate(req.body)
        if (error) {
            return next(CustomErrorHandler.badRequest("Failed to Validate request:", error))
        }

        try {
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
            sport: Joi.string().optional(),
        });
        const { error } = validation.validate(req.body)
        if (error) {
            return next(CustomErrorHandler.badRequest(`Failed to Validate request:${error}`))
        }

        try {
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
            page: Joi.number().min(1).default(1),
        })

        const { error } = validation.validate(req.body)
        if (error) {
            return next(CustomErrorHandler.badRequest("Failed to Validate request:", error))
        }

        try {
            const result = await ProviderServices.getUpcomingBookings(req.body
            )
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
    //#region checkMultipleDateAvailability
    async checkMultipleDateAvailability(req, res, next) {
        const validation = Joi.object({
            venueId: Joi.string().required(),
            sport: Joi.string().required(),
            startDate: Joi.date().min("now").required(),
            endDate: Joi.date().min(Joi.ref("startDate")).required(),
            timeSlots: Joi.array()
                .items(
                    Joi.object({
                        startTime: Joi.string().required(),
                        endTime: Joi.string().required(),
                    }),
                )
                .required(),
        })

        const { error } = validation.validate(req.body)
        if (error) {
            return next(CustomErrorHandler.badRequest("Failed to Validate request:", error))
        }

        try {
            const result = await ProviderServices.checkMultipleDateAvailability(req.body)
            return res.json({
                success: true,
                message: "Availability checked successfully",
                data: result,
            })
        } catch (error) {
            return next(CustomErrorHandler.badRequest("Failed to check availability:", error))
        }
    },
    //#endregion

    //#region getDashBoardAnalytics
    async getDashboardAnalytics(req, res, next) {
        const validation = Joi.object({
            venueId: Joi.string().required(),
            sport: Joi.string().optional(),
            period: Joi.string().valid("week", "month", "quarter", "year").default("month"),
            startDate: Joi.date().optional(),
            endDate: Joi.date().optional(),
        })

        const { error } = validation.validate({ ...req.params, ...req.query })
        if (error) {
            return next(CustomErrorHandler.badRequest("Failed to validate request:", error))
        }

        try {
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
            throw error;
        }
    },

    async getRevenueAnalytics(req, res, next) {
        const validation = Joi.object({
            venueId: Joi.string().required(),
            period: Joi.string().valid("week", "month", "quarter", "year").default("year"),
            sport: Joi.string().optional(),
            comparison: Joi.boolean().default(false),
        })

        const { error } = validation.validate({ ...req.params, ...req.query })
        if (error) {
            return next(CustomErrorHandler.badRequest("Failed to validate request:", error))
        }

        try {
            const result = await ProviderServices.getRevenueAnalytics({
                venueId: req.params.venueId,
                period: req.query.period,
                sport: req.query.sport,
                comparison: req.query.comparison === "true",
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

    async getTimeSlotAnalytics(req, res, next) {
        const validation = Joi.object({
            venueId: Joi.string().required(),
            sport: Joi.string().optional(),
            period: Joi.string().valid("week", "month", "quarter").default("month"),
        })

        const { error } = validation.validate({ ...req.params, ...req.query })
        if (error) {
            return next(CustomErrorHandler.badRequest("Failed to validate request:", error))
        }

        try {
            const result = await ProviderServices.getTimeSlotAnalytics({
                venueId: req.params.venueId,
                sport: req.query.sport,
                period: req.query.period,
            })

            return res.json({
                success: true,
                message: "Time slot analytics retrieved successfully",
                data: result,
            })
        } catch (error) {
            return next(CustomErrorHandler.badRequest("Failed to get time slot analytics:", error))
        }
    },

    async getBookingAnalytics(req, res, next) {
        const validation = Joi.object({
            venueId: Joi.string().required(),
            sport: Joi.string().optional(),
            period: Joi.string().valid("week", "month", "quarter", "year").default("month"),
        })

        const { error } = validation.validate({ ...req.params, ...req.query })
        if (error) {
            return next(CustomErrorHandler.badRequest("Failed to validate request:", error))
        }

        try {
            const result = await ProviderServices.getBookingAnalytics({
                venueId: req.params.venueId,
                sport: req.query.sport,
                period: req.query.period,
            })

            return res.json({
                success: true,
                message: "Booking analytics retrieved successfully",
                data: result,
            })
        } catch (error) {
            return next(CustomErrorHandler.badRequest("Failed to get booking analytics:", error))
        }
    },

    async getPerformanceAnalytics(req, res, next) {
        const validation = Joi.object({
            venueId: Joi.string().required(),
            sport: Joi.string().optional(),
        })

        const { error } = validation.validate({ ...req.params, ...req.query })
        if (error) {
            return next(CustomErrorHandler.badRequest("Failed to validate request:", error))
        }

        try {
            const result = await ProviderServices.getPerformanceAnalytics({
                venueId: req.params.venueId,
                sport: req.query.sport,
            })

            return res.json({
                success: true,
                message: "Performance analytics retrieved successfully",
                data: result,
            })
        } catch (error) {
            return next(CustomErrorHandler.badRequest("Failed to get performance analytics:", error))
        }
    },

    //#region CreateIndividual
    async createIndividual(req, res, next) {
        const individualValidation = Joi.object({
            profileImageUrl: Joi.string().optional(),
            fullName: Joi.string().required(),
            bio: Joi.string().required(),
            phoneNumber: Joi.string()
                .pattern(/^[0-9]{10}$/)
                .required(),
            email: Joi.string().email().required(),
            panNumber: Joi.string()
                .pattern(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/)
                .required(),
            yearOfExperience: Joi.number().min(0).required(),
            sportsCategories: Joi.array().items(Joi.string()).min(1).required(),
            selectedServiceTypes: Joi.array().items(Joi.string()).min(1).required(),
            serviceImageUrls: Joi.array().items(Joi.string()).min(1).required(),
            serviceOptions: Joi.object({
                providesOneOnOne: Joi.boolean().default(false),
                providesTeamService: Joi.boolean().default(false),
                providesOnlineService: Joi.boolean().default(false),
            }).required(),
            availableDays: Joi.array().items(Joi.string()).required(),
            supportedAgeGroups: Joi.array().items(Joi.string()).min(1).required(),
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
            selectLocation: Joi.string().required(),
            longitude: Joi.number().required(),
            latitude: Joi.number().required(),
            packageRef: Joi.string().required(),
        })

        const { error } = individualValidation.validate(req.body)
        if (error) {
            return next(
                CustomErrorHandler.badRequest(`Failed to Validate request: ${error.details.map((e) => e.message).join(", ")}`),
            )
        }

        try {
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


    //#region GetAllIndividual
    async getAllIndividuals(req, res, next) {
        try {
            const { page = 1, limit = 10, search, sportsCategory, location, radius = 10 } = req.query
            const result = await ProviderServices.getAllIndividuals({
                page: Number.parseInt(page),
                limit: Number.parseInt(limit),
                search,
                sportsCategory,
                location: location ? JSON.parse(location) : null,
                radius: Number.parseFloat(radius),
            })

            return res.json({
                success: true,
                message: "Individuals retrieved successfully",
                data: result,
            })
        } catch (error) {
            return next(CustomErrorHandler.badRequest("Failed to get individuals:", error))
        }
    },
    //#endregion

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

    //#region getUserBookings
    async getUserBookings(req, res, next) {
        const validation = Joi.object({
            // bookingType: Joi.string().valid("Venue", "individual").optional(),
            // status: Joi.string().valid("pending", "confirmed", "cancelled", "completed").optional(),
            page: Joi.number().min(1).default(1),
            // limit: Joi.number().min(1).max(100).default(10),
        });

        const { error } = validation.validate(req.params)
        if (error) return next(CustomErrorHandler.badRequest(`Failed to Validate request:${error}`));
        try {
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
    //#endregion

    //#region cancelBooking
    async cancelBooking(req, res, next) {
        const validation = Joi.object({
            bookingId: Joi.string().required(),
            cancellationReason: Joi.string().required(),
        })

        const { error } = validation.validate({
            bookingId: req.params.bookingId,
            cancellationReason: req.body.cancellationReason,
        })

        if (error) {
            return next(CustomErrorHandler.badRequest("Failed to Validate request:", error))
        }

        try {
            const result = await ProviderServices.cancelBooking(
                req.params.bookingId,
                req.body.cancellationReason,
                req.user.id,
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

    //TODO:Unsed Code if neccesaary we can use in future
    //#region Individual booking services (for future use)
    async bookIndividual(req, res, next) {
        const bookingValidation = Joi.object({
            individualId: Joi.string().required(),
            serviceType: Joi.string().valid("one_on_one", "team_service", "online_service").required(),
            bookingDate: Joi.date().min("now").required(),
            timeSlot: Joi.object({
                startTime: Joi.string().required(),
                endTime: Joi.string().required(),
            }).required(),
            duration: Joi.number().min(1).required(),
            paymentMethod: Joi.string().valid("Cash", "UPI", "Credit Card", "Debit Card", "Bank Transfer").required(),
            specialRequests: Joi.string().optional(),
            teamSize: Joi.number().min(1).optional(),
        })

        const { error } = bookingValidation.validate(req.body)
        if (error) {
            return next(CustomErrorHandler.badRequest("Failed to Validate request:", error))
        }

        try {
            const result = await ProviderServices.bookIndividual(req.body, req.user.id)
            return res.status(200).json({
                success: true,
                message: "Individual service booked successfully",
                data: result,
            })
        } catch (error) {
            return next(CustomErrorHandler.badRequest("Failed to book individual service:", error))
        }
    },
    //#endregion

    //#region getIndividualAvailableSloits (Future Use)
    async getIndividualAvailableSlots(req, res, next) {
        const validation = Joi.object({
            individualId: Joi.string().required(),
            date: Joi.date().min("now").required(),
        })

        const { error } = validation.validate(req.query)
        if (error) {
            return next(CustomErrorHandler.badRequest("Failed to Validate request:", error))
        }

        try {
            const { individualId, date } = req.query
            const result = await ProviderServices.getIndividualAvailableSlots(individualId, date)
            return res.json({
                success: true,
                message: "Available slots retrieved successfully",
                data: result,
            })
        } catch (error) {
            return next(CustomErrorHandler.badRequest("Failed to get available slots:", error))
        }
    },
    //#endregion
    //#region getIndividualBookings(Future Use)
    async getIndividualBookings(req, res, next) {
        const validation = Joi.object({
            individualId: Joi.string().required(),
            startDate: Joi.date().optional(),
            endDate: Joi.date().optional(),
            status: Joi.string().valid("pending", "confirmed", "cancelled", "completed").optional(),
            page: Joi.number().min(1).default(1),
            limit: Joi.number().min(1).max(100).default(10),
        })

        const { error } = validation.validate(req.query)
        if (error) {
            return next(CustomErrorHandler.badRequest("Failed to Validate request:", error))
        }

        try {
            const result = await ProviderServices.getIndividualBookings(req.query)
            return res.json({
                success: true,
                message: "Individual bookings retrieved successfully",
                data: result,
            })
        } catch (error) {
            return next(CustomErrorHandler.badRequest("Failed to get individual bookings:", error))
        }
    },
    //#endregion 

    //#region GetServicetype
    async GetServiceType(req, res, next) {
        try {
            console.log("These api is called");
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




    // Enhanced nearby venues with filters
    async getNearbyVenuesWithFilters(req, res, next) {
        const validation = Joi.object({
            latitude: Joi.number().required(),
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
            // facilities: Joi.array.items({
            //     isWaterAvailable: Joi.boolean().optional(),
            //     isParkingAvailable: Joi.boolean().optional(),
            //     isEquipmentProvided: Joi.boolean().optional(),
            //     isWashroomAvailable: Joi.boolean().optional(),
            //     isChangingRoomAvailable: Joi.boolean().optional(),
            //     isFloodlightAvailable: Joi.boolean().optional(),
            //     isSeatingLoungeAvailable: Joi.boolean().optional(),
            //     isFirstAidAvailable: Joi.boolean().optional(),
            //     isWalkingTrackAvailable: Joi.boolean().optional(),
            // }).default({}),
            priceRange: Joi.object({
                min: Joi.number().min(0).optional(),
                max: Joi.number().min(0).optional(),
            }).default({}),
        })
        console.log(req.body);
        const { error } = validation.validate(req.body)
        if (error) {
            return next(CustomErrorHandler.badRequest(`Validation failed:${error}`))
        }

        try {
            const result = await ProviderServices.getNearbyVenuesWithFilters(req.body)
            return res.json({
                success: true,
                message: "Nearby venues with filters retrieved successfully",
                data: result,
            })
        } catch (error) {
            return next(CustomErrorHandler.badRequest("Failed to get nearby venues:", error))
        }
    },

    // Enhanced nearby individuals with filters
    async getNearbyIndividualsWithFilters(req, res, next) {
        const validation = Joi.object({
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
            const result = await ProviderServices.getNearbyIndividualsWithFilters(req.body)
            return res.json({
                success: true,
                message: "Nearby individuals with filters retrieved successfully",
                data: result,
            })
        } catch (error) {
            return next(CustomErrorHandler.badRequest("Failed to get nearby individuals:", error))
        }
    },

    // ==================== ENHANCED SEARCH ENDPOINTS ====================

    // Enhanced venue search with filters
    async searchVenuesWithFilters(req, res, next) {
        const validation = Joi.object({
            query: Joi.string().min(1).required(),
            latitude: Joi.number().required(),
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

    // Enhanced individual search with filters
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

    // ==================== COMBINED SEARCH ====================

    // Combined search with filters
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

    // ==================== LEGACY COMPATIBILITY ====================

    // Backward compatible nearby venues (uses enhanced filtering internally)
    async getNearbyVenue(req, res, next) {
        try {
            // Transform legacy request to new format
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

            const result = await ProviderServices.getNearbyVenuesWithFilters(enhancedRequest)

            return res.json({
                success: true,
                message: "Nearby venues retrieved successfully",
                data: result,
            })
        } catch (error) {
            return next(CustomErrorHandler.badRequest("Failed to get nearby venues:", error))
        }
    },

    // Backward compatible nearby individuals
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

            const result = await ProviderServices.getNearbyIndividualsWithFilters(enhancedRequest)

            return res.json({
                success: true,
                message: "Nearby individuals retrieved successfully",
                data: result,
            })
        } catch (error) {
            return next(CustomErrorHandler.badRequest("Failed to get nearby individuals:", error))
        }
    },

    // Backward compatible venue search
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

    // Backward compatible individual search
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

    // Combined search (legacy)
    async combined(req, res, next) {
        try {
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

    //#region Payout api

    async initiatePayout(req, res, next) {
        const payoutValidation = Joi.object({
            recipientVpa: Joi.string()
                .pattern(/^[\w.-]+@[\w]+$/)
                .required()
                .messages({
                    'string.pattern.base': 'Invalid VPA format. Please provide a valid UPI ID.'
                }),
            amount: Joi.number()
                .min(1)
                .max(200000) // Max 2 lakh per transaction as per RBI guidelines
                .required()
                .messages({
                    'number.min': 'Amount must be at least ₹1',
                    'number.max': 'Amount cannot exceed ₹2,00,000 per transaction'
                }),
            purpose: Joi.string()
                .valid(
                    'refund',
                    'cashback',
                    'payout',
                    'salary',
                    'utility_bill',
                    'vendor_payments'
                )
                .required(),
            description: Joi.string().max(255).optional(),
            reference_id: Joi.string().max(40).optional(),
            venueId: Joi.string().optional(), // For tracking which Venue the payout is related to
            bookingId: Joi.string().optional(), // For refund scenarios
        })

        const { error } = payoutValidation.validate(req.body)
        if (error) {
            return next(CustomErrorHandler.badRequest(`Validation failed: ${error.details[0].message}`))
        }

        try {
            const userInfo = global.user
            const payoutData = {
                ...req.body,
                userId: userInfo.userId,
                initiatedBy: userInfo.userId
            }

            const result = await ProviderServices.initiatePayout(payoutData)

            return res.status(200).json({
                success: true,
                message: "Payout initiated successfully",
                data: result,
            })
        } catch (error) {
            console.error("Payout initiation failed:", error)
            return next(CustomErrorHandler.badRequest(`Failed to initiate payout: ${error.message}`))
        }
    },
    //#endregion

    //#region Get Payout Status
    async getPayoutStatus(req, res, next) {
        const validation = Joi.object({
            payoutId: Joi.string().required(),
        })

        const { error } = validation.validate(req.params)
        if (error) {
            return next(CustomErrorHandler.badRequest("Invalid payout ID"))
        }

        try {
            const result = await ProviderServices.getPayoutStatus(req.params.payoutId)

            return res.json({
                success: true,
                message: "Payout status retrieved successfully",
                data: result,
            })
        } catch (error) {
            return next(CustomErrorHandler.badRequest(`Failed to get payout status: ${error.message}`))
        }
    },
    //#endregion

    //#region Get Payout History
    async getPayoutHistory(req, res, next) {
        const validation = Joi.object({
            page: Joi.number().min(1).default(1),
            limit: Joi.number().min(1).max(100).default(10),
            status: Joi.string().valid('queued', 'pending', 'processed', 'cancelled', 'failed').optional(),
            venueId: Joi.string().optional(),
            startDate: Joi.date().optional(),
            endDate: Joi.date().optional(),
        })

        const { error } = validation.validate(req.query)
        if (error) {
            return next(CustomErrorHandler.badRequest("Invalid query parameters"))
        }

        try {
            const userInfo = global.user
            const filters = {
                ...req.query,
                userId: userInfo.userId
            }

            const result = await ProviderServices.getPayoutHistory(filters)

            return res.json({
                success: true,
                message: "Payout history retrieved successfully",
                data: result,
            })
        } catch (error) {
            return next(CustomErrorHandler.badRequest(`Failed to get payout history: ${error.message}`))
        }
    },
    //#endregion

    //#region Handle Payout Webhook
    async handlePayoutWebhook(req, res, next) {
        try {
            const webhookSignature = req.headers['x-razorpay-signature']
            const webhookBody = JSON.stringify(req.body)

            const result = await ProviderServices.handlePayoutWebhook(webhookBody, webhookSignature)

            return res.status(200).json({
                success: true,
                message: "Webhook processed successfully"
            })
        } catch (error) {
            console.error("Webhook processing failed:", error)
            return res.status(400).json({
                success: false,
                message: "Webhook processing failed"
            })
        }
    },
    //#endregion


}





export default ProviderController
