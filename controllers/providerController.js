import CustomErrorHandler from "../helpers/CustomErrorHandler.js";
import { ProviderServices } from "../services/index.js";
import Joi from "joi";
const ProviderController = {

    //#region createIndividual
    async createIndividual(req, res, next) {
        const individualValidation = Joi.object({
            fullName: Joi.string().required(),
            email: Joi.string().email().required(),
            phoneNumber: Joi.string()
                .pattern(/^[0-9]{10}$/)
                .required(),
            bio: Joi.string().required(),
            panNumber: Joi.string()
                .pattern(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/)
                .required(),
            profileImageUrl: Joi.string().optional(),
            serviceImageUrls: Joi.array().items(Joi.string()).max(10),
            serviceOptions: Joi.object({
                providesOneOnOne: Joi.boolean(),
                providesTeamService: Joi.boolean(),
                providesOnlineService: Joi.boolean(),
            }).required(),
            sportsCategories: Joi.array().items(Joi.string()).min(1).required(),
            selectedServiceTypes: Joi.array().items(Joi.string()).required(),
            availableDays: Joi.array().items(Joi.string()).min(1).required(),
            supportedAgeGroups: Joi.array().items(Joi.string()).required(),
            yearOfExperience: Joi.number().min(0).max(50).required(),
            education: Joi.array().items(
                Joi.object({
                    degree: Joi.string(),
                    institution: Joi.string(),
                    year: Joi.string(),
                    description: Joi.string(),
                }),
            ),
            experience: Joi.array().items(
                Joi.object({
                    title: Joi.string(),
                    organization: Joi.string(),
                    duration: Joi.string(),
                    description: Joi.string(),
                }),
            ),
            certificates: Joi.array().items(
                Joi.object({
                    name: Joi.string(),
                    issuedBy: Joi.string(),
                    issueDate: Joi.date(),
                    certificateUrl: Joi.string(),
                }),
            ),
            packageRef: Joi.string().required(),
            selectLocation: Joi.string().required(),
            longitude: Joi.number().required(),
            latitude: Joi.number().required(),
        })

        const { error } = individualValidation.validate(req.body)
        if (error) {
            return next(CustomErrorHandler.validationError(`Failed to Validate request:${error}`, ));
        }

        try {
            const result = await ProviderServices.createIndividual(req.body)
            return res.status(201).json({
                success: true,
                message: "Individual service created successfully",
                data: result,
            })
        } catch (error) {
            return next(CustomErrorHandler.validationError("Failed to Validate request:", error));
        }
    },
    //#endregion

    //#region Get All Individuals
    async getAllIndividuals(req, res, next) {
        try {
            const { page = 1, limit = 10, search, sportsCategory, location, radius = 10, serviceType } = req.query
            const result = await ProviderServices.getAllIndividuals({
                page: Number.parseInt(page),
                limit: Number.parseInt(limit),
                search,
                sportsCategory,
                location: location ? JSON.parse(location) : null,
                radius: Number.parseFloat(radius),
                serviceType,
            })

            return res.json({
                success: true,
                message: "Individual services retrieved successfully",
                data: result,
            })
        } catch (error) {
            return next(CustomErrorHandler.validationError("Failed to Validate request:", error));
        }
    },

    // Get Individual by ID
    async getIndividualById(req, res, next) {
        const validation = Joi.object({
            id: Joi.string().required(),
        })

        const { error } = validation.validate(req.params)
        if (error) {
            return next(CustomErrorHandler.validationError("Failed to Validate request:", error));
        }

        try {
            const result = await ProviderServices.getIndividualById(req.params.id)
            return res.json({
                success: true,
                message: "Individual service retrieved successfully",
                data: result,
            })
        } catch (error) {
            return next(CustomErrorHandler.validationError("Failed to Validate request:", error));
        }
    },

    // Update Individual
    async updateIndividual(req, res, next) {
        const validation = Joi.object({
            id: Joi.string().required(),
        })

        const { error: paramError } = validation.validate(req.params)
        if (paramError) {
            return next(paramError)
        }

        try {
            const result = await ProviderServices.updateIndividual(req.params.id, req.body, req.user.id)
            return res.json({
                success: true,
                message: "Individual service updated successfully",
                data: result,
            })
        } catch (error) {
            return next(CustomErrorHandler.validationError("Failed to Validate request:", error));
        }
    },

    // Delete Individual
    async deleteIndividual(req, res, next) {
        const validation = Joi.object({
            id: Joi.string().required(),
        })

        const { error } = validation.validate(req.params)
        if (error) {
            return next(CustomErrorHandler.validationError("Failed to Validate request:", error));
        }

        try {
            await ProviderServices.deleteIndividual(req.params.id, req.user.id)
            return res.json({
                success: true,
                message: "Individual service deleted successfully",
            })
        } catch (error) {
            return next(CustomErrorHandler.validationError("Failed to Validate request:", error));
        }
    },

    // Book Individual Service
    async bookIndividual(req, res, next) {
        const bookingValidation = Joi.object({
            individualId: Joi.string().required(),
            bookingDate: Joi.date().min("now").required(),
            timeSlot: Joi.object({
                startTime: Joi.string().required(),
                endTime: Joi.string().required(),
            }).required(),
            serviceType: Joi.string().valid("oneOnOne", "team", "online").required(),
            paymentMethod: Joi.string().valid("Cash", "UPI", "Credit Card", "Debit Card", "Bank Transfer").required(),
            specialRequests: Joi.string().optional(),
        })

        const { error } = bookingValidation.validate(req.body)
        if (error) {
            return next(CustomErrorHandler.validationError("Failed to Validate request:", error));
        }

        try {
            const result = await ProviderServices.bookIndividual(req.body, req.user.id)
            return res.status(201).json({
                success: true,
                message: "Individual service booked successfully",
                data: result,
            })
        } catch (error) {
            return next(CustomErrorHandler.validationError("Failed to Validate request:", error));
        }
    },

    //#region CreateGroundService
    async createGround(req, res, next) {
        const venuevalidation = Joi.object({
            venue_name: Joi.string().required(),
            venue_description: Joi.string().required(),
            venue_address: Joi.string().required(),
            venue_contact: Joi.string()
                .pattern(/^[0-9]{10}$/)
                .required(),
            venue_type: Joi.string().valid("Open Ground", "Truf", "Stadium").required(),
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
            venue_timeslots: Joi.object().keys({
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
            }).required(),
            venue_sport: Joi.string().required(),
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
            venueImages: Joi.array().items(Joi.string()).min(1).max(5).required(),
            selectLocation: Joi.string().required(),
            longitude: Joi.number().required(),
            latitude: Joi.number().required(),
            packageRef: Joi.string().required(),
        })

        const { error } = venuevalidation.validate(req.body)
        if (error) {
            return next(CustomErrorHandler.validationError("Failed to Validate request:", error));
        }
        try {
            const result = await ProviderServices.createGround(req.body)
            return res.status(201).json({
                success: true,
                message: "Ground created successfully",
                data: result,
            })
        } catch (error) {
            throw next(CustomErrorHandler.validationError("Failed to Validate request:", error));
        }
    },
    //#endregion

    //#region getUserRegisteredGround
    async getUserRegisterService(req, res, next) {
        try {
            const result = await ProviderServices.getUserRegisterService();
            return res.status(201).json({
                success: true,
                message: "User Ground Fetched successfully",
                data: result,
            })
        } catch (error) {
            return CustomErrorHandler.badRequest("Something went Wrong", error);
        }

    },
    //#endregion


    //#region Get All Grounds
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
            return next(CustomErrorHandler.validationError("Failed to Validate request:", error));
        }
    },
    //#endregion

    //#region Get Ground by ID
    async getGroundById(req, res, next) {
        const validation = Joi.object({
            id: Joi.string().required(),
        })

        const { error } = validation.validate(req.params)
        if (error) {
            return next(CustomErrorHandler.validationError("Failed to Validate request:", error));
        }

        try {
            const result = await ProviderServices.getGroundById(req.params)
            return res.json({
                success: true,
                message: "Ground retrieved successfully",
                data: result,
            })
        } catch (error) {
            return next(CustomErrorHandler.validationError("Failed to Validate request:", error));
        }
    },
    //#endregion
    // Update Ground
    async updateGround(req, res, next) {
        const validation = Joi.object({
            id: Joi.string().required(),
        })

        const { error: paramError } = validation.validate(req.params)
        if (paramError) {
            return next(paramError)
        }

        try {
            const result = await ProviderServices.updateGround(req.params.id, req.body, req.user.id)
            return res.json({
                success: true,
                message: "Ground updated successfully",
                data: result,
            })
        } catch (error) {
            return next(CustomErrorHandler.validationError("Failed to Validate request:", error));
        }
    },

    // Delete Ground
    async deleteGround(req, res, next) {
        const validation = Joi.object({
            id: Joi.string().required(),
        })

        const { error } = validation.validate(req.params)
        if (error) {
            return next(CustomErrorHandler.validationError("Failed to Validate request:", error));
        }

        try {
            await ProviderServices.deleteGround(req.params.id, req.user.id)
            return res.json({
                success: true,
                message: "Ground deleted successfully",
            })
        } catch (error) {
            return next(CustomErrorHandler.validationError("Failed to Validate request:", error));
        }
    },

    // Book Ground
    async bookGround(req, res, next) {
        const bookingValidation = Joi.object({
            groundId: Joi.string().required(),
            bookingDate: Joi.date().min("now").required(),
            timeSlot: Joi.object({
                startTime: Joi.string().required(),
                endTime: Joi.string().required(),
            }).required(),
            paymentMethod: Joi.string().valid("Cash", "UPI", "Credit Card", "Debit Card", "Bank Transfer").required(),
            specialRequests: Joi.string().optional(),
        })

        const { error } = bookingValidation.validate(req.body)
        if (error) {
            return next(CustomErrorHandler.validationError("Failed to Validate request:", error));
        }

        try {
            const result = await ProviderServices.bookGround(req.body, req.user.id)
            return res.status(201).json({
                success: true,
                message: "Ground booked successfully",
                data: result,
            })
        } catch (error) {
            return next(CustomErrorHandler.validationError("Failed to Validate request:", error));
        }
    },

    // Get Available Time Slots
    async getAvailablevenue_timeslots(req, res, next) {
        const validation = Joi.object({
            groundId: Joi.string().required(),
            date: Joi.date().min("now").required(),
        })

        const { error } = validation.validate(req.query)
        if (error) {
            return next(CustomErrorHandler.validationError("Failed to Validate request:", error));
        }

        try {
            const result = await ProviderServices.getAvailablevenue_timeslots(req.query.groundId, req.query.date)
            return res.json({
                success: true,
                message: "Available time slots retrieved successfully",
                data: result,
            })
        } catch (error) {
            return next(CustomErrorHandler.validationError("Failed to Validate request:", error));
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


    async getUserBookings(req, res, next) {
        try {
            const { page = 1, limit = 10, status, type } = req.query
            const result = await ProviderServices.getUserBookings(req.user.id, {
                page: Number.parseInt(page),
                limit: Number.parseInt(limit),
                status,
                type,
            })

            return res.json({
                success: true,
                message: "Bookings retrieved successfully",
                data: result,
            })
        } catch (error) {
            return next(CustomErrorHandler.validationError("Failed to Validate request:", error));
        }
    },

    // Get Booking by ID
    async getBookingById(req, res, next) {
        const validation = Joi.object({
            id: Joi.string().required(),
        })

        const { error } = validation.validate(req.params)
        if (error) {
            return next(CustomErrorHandler.validationError("Failed to Validate request:", error));
        }

        try {
            const result = await ProviderServices.getBookingById(req.params.id, req.user.id)
            return res.json({
                success: true,
                message: "Booking retrieved successfully",
                data: result,
            })
        } catch (error) {
            return next(CustomErrorHandler.validationError("Failed to Validate request:", error));
        }
    },

    // Cancel Booking
    async cancelBooking(req, res, next) {
        const validation = Joi.object({
            id: Joi.string().required(),
            cancellationReason: Joi.string().required(),
        })

        const { error } = validation.validate({ ...req.params, ...req.body })
        if (error) {
            return next(CustomErrorHandler.validationError("Failed to Validate request:", error));
        }

        try {
            const result = await ProviderServices.cancelBooking(req.params.id, req.body.cancellationReason, req.user.id)
            return res.json({
                success: true,
                message: "Booking cancelled successfully",
                data: result,
            })
        } catch (error) {
            return next(CustomErrorHandler.validationError("Failed to Validate request:", error));
        }
    },

    // Update Payment Status
    async updatePaymentStatus(req, res, next) {
        const validation = Joi.object({
            id: Joi.string().required(),
            paymentStatus: Joi.string().valid("pending", "completed", "failed", "refunded").required(),
        })

        const { error } = validation.validate({ ...req.params, ...req.body })
        if (error) {
            return next(CustomErrorHandler.validationError("Failed to Validate request:", error));
        }

        try {
            const result = await ProviderServices.updatePaymentStatus(req.params.id, req.body.paymentStatus)
            return res.json({
                success: true,
                message: "Payment status updated successfully",
                data: result,
            })
        } catch (error) {
            return next(CustomErrorHandler.validationError("Failed to Validate request:", error));
        }
    },
}
export default ProviderController;