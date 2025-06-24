import CustomErrorHandler from "../helpers/CustomErrorHandler.js"
import { ProviderServices } from "../services/index.js"
import Joi from "joi"

const ProviderController = {


    // Create Ground with multiple sports support
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
            return next(CustomErrorHandler.validationError("Failed to Validate request:", error))
        }

        try {
            const result = await ProviderServices.createGround(req.body)
            return res.status(200).json({
                success: true,
                message: "Ground created successfully",
                data: result,
            })
        } catch (error) {
            return next(CustomErrorHandler.validationError("Failed to create ground:", error))
        }
    },

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
            return next(CustomErrorHandler.validationError("Failed to get grounds:", error))
        }
    },

    async getGroundById(req, res, next) {
        const validation = Joi.object({
            id: Joi.string().required(),
        })

        const { error } = validation.validate(req.params)
        if (error) {
            return next(CustomErrorHandler.validationError("Failed to Validate request:", error))
        }

        try {
            const result = await ProviderServices.getGroundById(req.params)
            return res.json({
                success: true,
                message: "Ground retrieved successfully",
                data: result,
            })
        } catch (error) {
            return next(CustomErrorHandler.validationError("Failed to get ground:", error))
        }
    },

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

    // ==================== GROUND BOOKING SERVICES ====================

    // Book Ground with sport specification
    async bookGround(req, res, next) {
        const bookingValidation = Joi.object({
            groundId: Joi.string().required(),
            sport: Joi.string().required(),
            bookingDate: Joi.date().min("now").optional(),
            bookingDates: Joi.array()
                .items(
                    Joi.object({
                        date: Joi.date().required(),
                        timeSlots: Joi.array()
                            .items(
                                Joi.object({
                                    startTime: Joi.string().required(),
                                    endTime: Joi.string().required(),
                                }),
                            )
                            .required(),
                    }),
                )
                .optional(),
            timeSlot: Joi.object({
                startTime: Joi.string().required(),
                endTime: Joi.string().required(),
            }).optional(),
            timeSlots: Joi.array()
                .items(
                    Joi.object({
                        startTime: Joi.string().required(),
                        endTime: Joi.string().required(),
                    }),
                )
                .optional(),
            paymentMethod: Joi.string().valid("Cash", "UPI", "Credit Card", "Debit Card", "Bank Transfer").required(),
            specialRequests: Joi.string().optional(),
            bookingPattern: Joi.string().valid("single", "multiple_slots", "full_day", "week_booking").default("single"),
        })

        const { error } = bookingValidation.validate(req.body)
        if (error) {
            return next(CustomErrorHandler.validationError("Failed to Validate request:", error))
        }

        try {
            const userInfo = global.user;
            console.log(userInfo)
            const result = await ProviderServices.bookGround(req.body,userInfo.userId)
            return res.status(200).json({
                success: true,
                message: "Ground booked successfully",
                data: result,
            })
        } catch (error) {
            return next(CustomErrorHandler.validationError("Failed to book ground:", error))
        }
    },

    // Get available slots for specific sport
    async getAvailableSlots(req, res, next) {
        const validation = Joi.object({
            groundId: Joi.string().required(),
            sport: Joi.string().required(),
            date: Joi.date().required(),
        })

        const { error } = validation.validate(req.query)
        if (error) {
            return next(CustomErrorHandler.validationError("Failed to Validate request:", error))
        }

        try {
            const { groundId, sport, date } = req.query
            const result = await ProviderServices.getAvailableSlots(groundId, sport, date)
            return res.json({
                success: true,
                message: "Available slots retrieved successfully",
                data: result,
            })
        } catch (error) {
            return next(CustomErrorHandler.validationError("Failed to get available slots:", error))
        }
    },

    // Get booked slots for specific sport and date
    async getBookedSlots(req, res, next) {
        const validation = Joi.object({
            groundId: Joi.string().required(),
            sport: Joi.string().required(),
            date: Joi.date().required(),
        })

        const { error } = validation.validate(req.query)
        if (error) {
            return next(CustomErrorHandler.validationError("Failed to Validate request:", error))
        }

        try {
            const { groundId, sport, date } = req.query
            const result = await ProviderServices.getBookedSlots(groundId, sport, date)
            return res.json({
                success: true,
                message: "Booked slots retrieved successfully",
                data: result,
            })
        } catch (error) {
            return next(CustomErrorHandler.validationError("Failed to get booked slots:", error))
        }
    },

    // Get ground bookings with filters
    async getGroundBookings(req, res, next) {
        const validation = Joi.object({
            groundId: Joi.string().required(),
            startDate: Joi.date().optional(),
            endDate: Joi.date().optional(),
            sport: Joi.string().optional(),
            status: Joi.string().valid("pending", "confirmed", "cancelled", "completed").optional(),
            page: Joi.number().min(1).default(1),
            limit: Joi.number().min(1).max(100).default(10),
        })

        const { error } = validation.validate(req.query)
        if (error) {
            return next(CustomErrorHandler.validationError("Failed to Validate request:", error))
        }

        try {
            const result = await ProviderServices.getGroundBookings(req.query)
            return res.json({
                success: true,
                message: "Ground bookings retrieved successfully",
                data: result,
            })
        } catch (error) {
            return next(CustomErrorHandler.validationError("Failed to get ground bookings:", error))
        }
    },

    // Check slot availability for multiple dates (week booking)
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
            return next(CustomErrorHandler.validationError("Failed to Validate request:", error))
        }

        try {
            const result = await ProviderServices.checkMultipleDateAvailability(req.body)
            return res.json({
                success: true,
                message: "Availability checked successfully",
                data: result,
            })
        } catch (error) {
            return next(CustomErrorHandler.validationError("Failed to check availability:", error))
        }
    },

    // ==================== INDIVIDUAL SERVICES ====================

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
            return next(CustomErrorHandler.validationError("Failed to Validate request:", error))
        }

        try {
            const result = await ProviderServices.createIndividual(req.body)
            return res.status(200).json({
                success: true,
                message: "Individual service created successfully",
                data: result,
            })
        } catch (error) {
            return next(CustomErrorHandler.validationError("Failed to create individual service:", error))
        }
    },

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
            return next(CustomErrorHandler.validationError("Failed to get individuals:", error))
        }
    },

    async getIndividualById(req, res, next) {
        const validation = Joi.object({
            id: Joi.string().required(),
        })

        const { error } = validation.validate(req.params)
        if (error) {
            return next(CustomErrorHandler.validationError("Failed to Validate request:", error))
        }

        try {
            const result = await ProviderServices.getIndividualById(req.params)
            return res.json({
                success: true,
                message: "Individual retrieved successfully",
                data: result,
            })
        } catch (error) {
            return next(CustomErrorHandler.validationError("Failed to get individual:", error))
        }
    },

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

    // ==================== INDIVIDUAL BOOKING SERVICES ====================

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
            return next(CustomErrorHandler.validationError("Failed to Validate request:", error))
        }

        try {
            const result = await ProviderServices.bookIndividual(req.body, req.user.id)
            return res.status(200).json({
                success: true,
                message: "Individual service booked successfully",
                data: result,
            })
        } catch (error) {
            return next(CustomErrorHandler.validationError("Failed to book individual service:", error))
        }
    },

    async getIndividualAvailableSlots(req, res, next) {
        const validation = Joi.object({
            individualId: Joi.string().required(),
            date: Joi.date().min("now").required(),
        })

        const { error } = validation.validate(req.query)
        if (error) {
            return next(CustomErrorHandler.validationError("Failed to Validate request:", error))
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
            return next(CustomErrorHandler.validationError("Failed to get available slots:", error))
        }
    },

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
            return next(CustomErrorHandler.validationError("Failed to Validate request:", error))
        }

        try {
            const result = await ProviderServices.getIndividualBookings(req.query)
            return res.json({
                success: true,
                message: "Individual bookings retrieved successfully",
                data: result,
            })
        } catch (error) {
            return next(CustomErrorHandler.validationError("Failed to get individual bookings:", error))
        }
    },

    // ==================== COMMON BOOKING SERVICES ====================

    async getUserBookings(req, res, next) {
        const validation = Joi.object({
            bookingType: Joi.string().valid("ground", "individual").optional(),
            status: Joi.string().valid("pending", "confirmed", "cancelled", "completed").optional(),
            page: Joi.number().min(1).default(1),
            limit: Joi.number().min(1).max(100).default(10),
        })

        const { error } = validation.validate(req.query)
        if (error) {
            return next(CustomErrorHandler.validationError("Failed to Validate request:", error))
        }

        try {
            const result = await ProviderServices.getUserBookings(req.query, req.user.id)
            return res.json({
                success: true,
                message: "User bookings retrieved successfully",
                data: result,
            })
        } catch (error) {
            return next(CustomErrorHandler.validationError("Failed to get user bookings:", error))
        }
    },

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
            return next(CustomErrorHandler.validationError("Failed to Validate request:", error))
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
            return next(CustomErrorHandler.validationError("Failed to cancel booking:", error))
        }
    },
    //#region GetServiceType
    async GetServiceType(req, res, next) {
        try {
            const result = await ProviderServices.GetServiceType();
            return res.json({
                success: true,
                message: "Service Type Retrieved Successfully",
                data: { service_type: result }
            })
        } catch (error) {
            console.log("Unable to fetch service type:", error);
        }
    },
    //#endregion
}

export default ProviderController
