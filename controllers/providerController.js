import CustomErrorHandler from "../helpers/CustomErrorHandler.js"
import { ProviderServices } from "../services/index.js"
import Joi from "joi"

const ProviderController = {

    //#region Create Ground
    async createGround(req, res, next) {
        const venueValidation = Joi.object({
            venue_name: Joi.string().required(),
            venue_description: Joi.string().required(),
            venue_address: Joi.string().required(),
            venue_contact: Joi.string()
                .pattern(/^[0-9]{10}$/)
                .required(),
            venue_type: Joi.string().valid("Open Ground", "Turf", "Stadium").required(),
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
            packageRef: Joi.string().required(),
        })

        const { error } = venueValidation.validate(req.body)
        if (error) {
            return next(CustomErrorHandler.badRequest("Failed to Validate request:", error))
        }

        try {
            const result = await ProviderServices.createGround(req.body)
            return res.status(200).json({
                success: true,
                message: "Ground created successfully",
                data: result,
            })
        } catch (error) {
            return next(CustomErrorHandler.badRequest("Failed to create ground:", error))
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
    //#region GetGroundById
    async getGroundById(req, res, next) {
        const validation = Joi.object({
            id: Joi.string().required(),
        })

        const { error } = validation.validate(req.params)
        if (error) {
            return next(CustomErrorHandler.badRequest("Failed to Validate request:", error))
        }

        try {
            const result = await ProviderServices.getGroundById(req.params)
            return res.json({
                success: true,
                message: "Ground retrieved successfully",
                data: result,
            })
        } catch (error) {
            return next(CustomErrorHandler.badRequest("Failed to get ground:", error))
        }
    },
    //#endregion

    //#region getUserGroundRegisteredGround
    async getUserGroundRegisteredGround(req, res, next) {
        try {
            const result = await ProviderServices.getUserGroundRegisteredGround()
            return res.status(200).json({
                success: true,
                message: "User Ground Fetched successfully",
                data: { ground: result },
            })
        } catch (error) {
            return next(CustomErrorHandler.badRequest("Something went Wrong", error))
        }
    },
    //#endregion

    //#region Book Ground 
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

    async getNearbyVenues(req, res, next) {
        const validation = Joi.object({
            latitude: Joi.number().required(),
            longitude: Joi.number().required(),
            page: Joi.number().min(1).optional(),
        })

        const { error } = validation.validate(req.body)
        if (error) {
            return next(CustomErrorHandler.badRequest("Failed to validate request:", error))
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

    // ==================== SEARCH VENUES ====================
    async searchVenues(req, res, next) {
        const validation = Joi.object({
            query: Joi.string().min(1).required(),
            latitude: Joi.number().min(-90).max(90).optional(),
            longitude: Joi.number().min(-180).max(180).optional(),
            page: Joi.number().min(1).default(1),
            limit: Joi.number().min(1).max(50).default(10),
            radius: Joi.number().min(1).max(100).default(25), // in kilometers
            sport: Joi.string().optional(),
            venueType: Joi.string().valid("Open Ground", "Turf", "Stadium").optional(),
            priceRange: Joi.object({
                min: Joi.number().min(0).optional(),
                max: Joi.number().min(0).optional(),
            }).optional(),
        })

        const { error } = validation.validate(req.body)
        if (error) {
            return next(CustomErrorHandler.badRequest("Failed to validate request:", error))
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

    // ==================== SEARCH INDIVIDUALS ====================
    async searchIndividuals(req, res, next) {
        const validation = Joi.object({
            query: Joi.string().min(1).required(),
            latitude: Joi.number().min(-90).max(90).optional(),
            longitude: Joi.number().min(-180).max(180).optional(),
            page: Joi.number().min(1).default(1),
            limit: Joi.number().min(1).max(50).default(10),
            radius: Joi.number().min(1).max(100).default(25), // in kilometers
            sport: Joi.string().optional(),
            serviceType: Joi.string().valid("one_on_one", "team_service", "online_service").optional(),
            experienceRange: Joi.object({
                min: Joi.number().min(0).optional(),
                max: Joi.number().min(0).optional(),
            }).optional(),
            ageGroup: Joi.string().optional(),
        })

        const { error } = validation.validate(req.body)
        if (error) {
            return next(CustomErrorHandler.badRequest("Failed to validate request:", error))
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

    // ==================== COMBINED SEARCH ====================
    async combinedSearch(req, res, next) {
        const validation = Joi.object({
            query: Joi.string().min(1).required(),
            latitude: Joi.number().min(-90).max(90).optional(),
            longitude: Joi.number().min(-180).max(180).optional(),
            page: Joi.number().min(1).default(1),
            limit: Joi.number().min(1).max(50).default(10),
            radius: Joi.number().min(1).max(100).default(25), // in kilometers
        })

        const { error } = validation.validate(req.body)
        if (error) {
            return next(CustomErrorHandler.badRequest("Failed to validate request:", error))
        }

        try {
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

    // ==================== GET INDIVIDUAL PROFILE ====================
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




    //#region Get Available Slots
    async getAvailableSlots(req, res, next) {
        const validation = Joi.object({
            groundId: Joi.string().required(),
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
            groundId: Joi.string().required(),
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
            groundId: Joi.string().required(),
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
                message: "Ground bookings retrieved successfully",
                data: result,
            })
        } catch (error) {
            return next(CustomErrorHandler.badRequest("Failed to get ground bookings:", error))
        }
    },
    //#endregion 

    //#region checkMultipleDateAvailability
    async checkMultipleDateAvailability(req, res, next) {
        const validation = Joi.object({
            groundId: Joi.string().required(),
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
            groundId: Joi.string().required(),
        })

        const { error } = validation.validate(req.params)
        if (error) {
            return next(CustomErrorHandler.badRequest("Failed to Validate request:", error))
        }

        try {
            const result = await ProviderServices.getDashboardAnalytics(req.params.groundId)
            return res.json({
                success: true,
                message: "Dashboard analytics retrieved successfully",
                data: result,
            })
        } catch (error) {
            return next(CustomErrorHandler.badRequest("Failed to get dashboard analytics:", error))
        }
    },
    //#endregion 

    //#region getRevenueAnalytics
    async getRevenueAnalytics(req, res, next) {
        const validation = Joi.object({
            groundId: Joi.string().required(),
            period: Joi.string().valid("week", "month", "quarter", "year").default("month"),
        })

        const { error } = validation.validate({ ...req.params, ...req.query })
        if (error) {
            return next(CustomErrorHandler.badRequest("Failed to Validate request:", error))
        }

        try {
            const result = await ProviderServices.getRevenueAnalytics(req.params.groundId, req.query.period)
            return res.json({
                success: true,
                message: "Revenue analytics retrieved successfully",
                data: result,
            })
        } catch (error) {
            return next(CustomErrorHandler.badRequest("Failed to get revenue analytics:", error))
        }
    },
    //#endregion

    //#region getSportsAnalytics
    async getSportsAnalytics(req, res, next) {
        const validation = Joi.object({
            groundId: Joi.string().required(),
        })

        const { error } = validation.validate(req.params)
        if (error) {
            return next(CustomErrorHandler.badRequest("Failed to Validate request:", error))
        }

        try {
            const result = await ProviderServices.getSportsAnalytics(req.params.groundId)
            return res.json({
                success: true,
                message: "Sports analytics retrieved successfully",
                data: result,
            })
        } catch (error) {
            return next(CustomErrorHandler.badRequest("Failed to get sports analytics:", error))
        }
    },
    //#endregion

    //#region CreateIndividual
    async createIndividual(req, res, next) {
        const individualValidation = Joi.object({
            fullName: Joi.string().required(),
            bio: Joi.string().required(),
            phoneNumber: Joi.string()
                .pattern(/^[0-9]{10}$/)
                .required(),
            email: Joi.string().email().required(),
            yearOfExperience: Joi.number().min(0).required(),
            sportsCategories: Joi.array().items(Joi.string()).min(1).required(),
            certifications: Joi.array().items(Joi.string()).optional(),
            profileImageUrl: Joi.string().optional(),
            hourlyRate: Joi.number().min(0).required(),
            serviceOptions: Joi.object({
                providesOneOnOne: Joi.boolean().default(false),
                providesTeamService: Joi.boolean().default(false),
                providesOnlineService: Joi.boolean().default(false),
            }).required(),
            availability: Joi.object({
                Monday: Joi.object({
                    isAvailable: Joi.boolean().required(),
                    startTime: Joi.string().optional(),
                    endTime: Joi.string().optional(),
                }),
                Tuesday: Joi.object({
                    isAvailable: Joi.boolean().required(),
                    startTime: Joi.string().optional(),
                    endTime: Joi.string().optional(),
                }),
                Wednesday: Joi.object({
                    isAvailable: Joi.boolean().required(),
                    startTime: Joi.string().optional(),
                    endTime: Joi.string().optional(),
                }),
                Thursday: Joi.object({
                    isAvailable: Joi.boolean().required(),
                    startTime: Joi.string().optional(),
                    endTime: Joi.string().optional(),
                }),
                Friday: Joi.object({
                    isAvailable: Joi.boolean().required(),
                    startTime: Joi.string().optional(),
                    endTime: Joi.string().optional(),
                }),
                Saturday: Joi.object({
                    isAvailable: Joi.boolean().required(),
                    startTime: Joi.string().optional(),
                    endTime: Joi.string().optional(),
                }),
                Sunday: Joi.object({
                    isAvailable: Joi.boolean().required(),
                    startTime: Joi.string().optional(),
                    endTime: Joi.string().optional(),
                }),
            }).required(),
            location: Joi.object({
                address: Joi.string().required(),
                city: Joi.string().required(),
                state: Joi.string().required(),
                coordinates: Joi.object({
                    latitude: Joi.number().required(),
                    longitude: Joi.number().required(),
                }).required(),
            }).required(),
            packageRef: Joi.string().required(),
        })

        const { error } = individualValidation.validate(req.body)
        if (error) {
            return next(CustomErrorHandler.badRequest("Failed to Validate request:", error))
        }

        try {
            const result = await ProviderServices.createIndividual(req.body)
            return res.status(200).json({
                success: true,
                message: "Individual service created successfully",
                data: result,
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
            // bookingType: Joi.string().valid("ground", "individual").optional(),
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
}
//#endregion

export default ProviderController
