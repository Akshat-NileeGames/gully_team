import { Category, Package, User, Booking, Individual, Ground } from '../models/index.js';
import ImageUploader from '../helpers/ImageUploader.js';
import { DateTime } from "luxon";
import CustomErrorHandler from '../helpers/CustomErrorHandler.js';
import nodemailer from "nodemailer";
import mongoose from "mongoose"
import { FAST_SMS_KEY, SENDER_ID, MESSAGE_ID } from "../config/index.js";
import axios from "axios";
import crypto from "crypto";
const ProviderServices = {


    async createIndividual(data) {
        try {
            const userInfo = global.user;
            const packageInfo = await Package.findById(data.packageRef)
            if (!packageInfo) throw CustomErrorHandler.notFound("Package not found");
            const user = await User.findById(userInfo.userId);
            if (!user) throw CustomErrorHandler.notFound("User not found");

            const serviceImages = [];
            const profileImage = '';
            const newindividual = new Individual({
                fullName: data.fullName,
                email: data.email,
                phoneNumber: data.phoneNumber,
                bio: data.bio,
                panNumber: data.panNumber,
                profileImageUrl: profileImage,
                serviceImageUrls: serviceImages,
                serviceOptions: data.serviceOptions,
                sportsCategories: data.sportsCategories,
                selectedServiceTypes: data.selectedServiceTypes,
                availableDays: data.availableDays,
                supportedAgeGroups: data.supportedAgeGroups,
                yearOfExperience: data.yearOfExperience,
                education: data.education,
                experience: data.experience,
                certificates: data.certificates,
                locationHistory: {
                    point: {
                        type: "Point",
                        coordinates: [parseFloat(data.longitude), parseFloat(data.latitude)],
                        selectLocation: data.selectLocation,
                    },
                },
                hasActiveSubscription: false,
                packageRef: data.packageRef,
                subscriptionExpiry: data.subscriptionExpiry,
                userId: userInfo.userId

            });
            await newindividual.save();
            return newindividual;
        } catch (error) {
            console.log("Failed to perform Operation:", error);
        }
    },

    async getAllIndividuals(filters) {
        try {
            const { page, limit, search, sportsCategory, location, radius, serviceType } = filters
            const query = { isActive: true, isSubscriptionPurchased: true }
            if (search) {
                query.$or = [{ name: { $regex: search, $options: "i" } }, { aboutMe: { $regex: search, $options: "i" } }]
            }
            if (sportsCategory) {
                query.sportsCategories = { $in: [sportsCategory] }
            }
            if (serviceType) {
                switch (serviceType) {
                    case "oneOnOne":
                        query["serviceTypes.providesOneOnOne"] = true
                        break
                    case "team":
                        query["serviceTypes.providesTeamService"] = true
                        break
                    case "online":
                        query["serviceTypes.providesOnlineService"] = true
                        break
                }
            }
            if (location && location.coordinates) {
                query.location = {
                    $near: {
                        $geometry: {
                            type: "Point",
                            coordinates: location.coordinates,
                        },
                        $maxDistance: radius * 1000,
                    },
                }
            }

            const skip = (page - 1) * limit
            const individuals = await Individual.find(query)
                .populate("userId", "name email")
                .populate("packageId")
                .skip(skip)
                .limit(limit)
                .sort({ createdAt: -1 })

            const total = await Individual.countDocuments(query)

            return {
                individuals,
                pagination: {
                    currentPage: page,
                    totalPages: Math.ceil(total / limit),
                    totalItems: total,
                    itemsPerPage: limit,
                },
            }
        } catch (error) {
            console.log("Failed to perform Operation:", error);
        }
    },

    async getIndividualById(individualId) {
        try {
            const individual = await Individual.findById(individualId)
                .populate("userId", "name email phone")
                .populate("packageId")

            if (!individual) {
                throw CustomErrorHandler.notFound("Individual service not found")
            }

            return individual
        } catch (error) {
            console.log("Failed to perform Operation:", error);
        }
    },

    async updateIndividual(individualId, updateData, userId) {
        try {
            const individual = await Individual.findOne({ _id: individualId, userId })
            if (!individual) {
                throw CustomErrorHandler.notFound("Individual service not found or unauthorized")
            }

            const updatedIndividual = await Individual.findByIdAndUpdate(individualId, updateData, {
                new: true,
                runValidators: true,
            }).populate("userId packageId")

            return updatedIndividual
        } catch (error) {
            console.log("Failed to perform Operation:", error);
        }
    },

    async deleteIndividual(individualId, userId) {
        try {
            const individual = await Individual.findOne({ _id: individualId, userId })
            if (!individual) {
                throw CustomErrorHandler.notFound("Individual service not found or unauthorized")
            }

            // Check for active bookings
            const activeBookings = await Booking.countDocuments({
                serviceId: individualId,
                bookingType: "individual",
                bookingStatus: "confirmed",
                bookingDate: { $gte: new Date() },
            })

            if (activeBookings > 0) {
                throw CustomErrorHandler.badRequest("Cannot delete service with active bookings")
            }

            await Individual.findByIdAndDelete(individualId)
        } catch (error) {
            console.log("Failed to perform Operation:", error);
        }
    },

    async bookIndividual(bookingData, userId) {
        try {
            const { individualId, bookingDate, timeSlot, serviceType, paymentMethod, specialRequests } = bookingData

            const individual = await Individual.findById(individualId)
            if (!individual) {
                throw CustomErrorHandler.notFound("Individual service not found")
            }

            // Check if individual provides the requested service type
            const serviceTypeMap = {
                oneOnOne: "providesOneOnOne",
                team: "providesTeamService",
                online: "providesOnlineService",
            }

            if (!individual.serviceTypes[serviceTypeMap[serviceType]]) {
                throw CustomErrorHandler.badRequest("This service type is not provided")
            }

            // Check if individual is available on the booking date
            const bookingDay = DateTime.fromJSDate(new Date(bookingDate)).toFormat("cccc")
            if (!individual.serviceDays.includes(bookingDay)) {
                throw CustomErrorHandler.badRequest("Individual is not available on this day")
            }

            // Check if time slot is available
            const isSlotAvailable = await this.checkTimeSlotAvailability(individualId, bookingDate, timeSlot)
            if (!isSlotAvailable) {
                throw CustomErrorHandler.badRequest("Time slot is not available")
            }

            // Calculate duration and amount
            const duration = this.calculateDuration(timeSlot.startTime, timeSlot.endTime)
            const hourlyRate = individual.hourlyRate || 500 // Default rate
            const totalAmount = duration * hourlyRate

            // Create booking
            const booking = new Booking({
                bookingType: "individual",
                serviceId: individualId,
                userId,
                bookingDate: new Date(bookingDate),
                timeSlot,
                duration,
                totalAmount,
                paymentMethod,
                specialRequests,
            })

            await booking.save()

            // Update individual's total bookings
            await Individual.findByIdAndUpdate(individualId, { $inc: { totalBookings: 1 } })

            return await booking.populate("serviceId userId")
        } catch (error) {
            console.log("Failed to perform Operation:", error);
        }
    },

    // Helper methods
    async checkTimeSlotAvailability(individualId, date, timeSlot) {
        const booking = await Booking.findOne({
            serviceId: individualId,
            bookingType: "individual",
            bookingDate: new Date(date),
            "timeSlot.startTime": timeSlot.startTime,
            "timeSlot.endTime": timeSlot.endTime,
            bookingStatus: "confirmed",
        })

        return !booking
    },

    calculateDuration(startTime, endTime) {
        const start = DateTime.fromFormat(startTime, "HH:mm")
        const end = DateTime.fromFormat(endTime, "HH:mm")
        return end.diff(start, "hours").hours
    },
    async createGround(data, userId) {
        try {
            const userInfo = global.user;
            const packageInfo = await Package.findById(data.packageId)
            if (!packageInfo) throw CustomErrorHandler.notFound("Package not found");
            
            const user = await User.findById(userInfo.userId);
            if (!user) throw CustomErrorHandler.notFound("User not found");
            const timeSlots = this.generateTimeSlots(data.openTime, data.closeTime)
            const ground = new Ground({
                groundName: data.groundName,
                groundDescription: data.groundDescription,
                groundAddress: data.groundAddress,
                groundContact: data.groundContact,
                groundEmail: data.groundEmail,
                groundType: data.groundType,
                surfaceType: data.surfaceType,
                groundOpenDays: data.groundOpenDays,
                openTime: data.openTime,
                closeTime: data.closeTime,
                sportsCategories: data.sportsCategories,
                paymentMethods: data.paymentMethods,
                upiId: data.upiId,
                facilities: data.facilities,
                groundImages: data.groundImages,
                timeSlots: timeSlots,
                location: {
                    type: "Point",
                    coordinates: data.location.coordinates,
                    address: data.location.address
                },
                userId: userInfo.userId,
                packageId: data.packageId,
                isSubscriptionPurchased: true,
                subscriptionExpiry: DateTime.now().plus({ days: packageInfo.duration }).toJSDate()
            })
            await ground.save()

            return ground;
        } catch (error) {
            console.log("Failed to perform Operation:", error);
        }
    },

    async getAllGrounds(filters) {
        try {
            const { page, limit, search, sportsCategory, location, radius } = filters
            const query = { isActive: true, isSubscriptionPurchased: true }

            // Search filter
            if (search) {
                query.$or = [
                    { groundName: { $regex: search, $options: "i" } },
                    { groundDescription: { $regex: search, $options: "i" } },
                    { groundAddress: { $regex: search, $options: "i" } },
                ]
            }

            // Sports category filter
            if (sportsCategory) {
                query.sportsCategories = { $in: [sportsCategory] }
            }

            // Location-based filter
            if (location && location.coordinates) {
                query.location = {
                    $near: {
                        $geometry: {
                            type: "Point",
                            coordinates: location.coordinates,
                        },
                        $maxDistance: radius * 1000, // Convert km to meters
                    },
                }
            }

            const skip = (page - 1) * limit
            const grounds = await Ground.find(query)
                .populate("userId", "name email")
                .populate("packageId")
                .skip(skip)
                .limit(limit)
                .sort({ createdAt: -1 })

            const total = await Ground.countDocuments(query)

            return {
                grounds,
                pagination: {
                    currentPage: page,
                    totalPages: Math.ceil(total / limit),
                    totalItems: total,
                    itemsPerPage: limit,
                },
            }
        } catch (error) {
            console.log("Failed to perform Operation:", error);
        }
    },

    async getGroundById(groundId) {
        try {
            const ground = await Ground.findById(groundId).populate("userId", "name email phone").populate("packageId")

            if (!ground) {
                throw CustomErrorHandler.notFound("Ground not found")
            }

            return ground
        } catch (error) {
            console.log("Failed to perform Operation:", error);
        }
    },

    async updateGround(groundId, updateData, userId) {
        try {
            const ground = await Ground.findOne({ _id: groundId, userId })
            if (!ground) {
                throw CustomErrorHandler.notFound("Ground not found or unauthorized")
            }

            // If updating time slots, regenerate them
            if (updateData.openTime || updateData.closeTime) {
                const openTime = updateData.openTime || ground.openTime
                const closeTime = updateData.closeTime || ground.closeTime
                updateData.timeSlots = this.generateTimeSlots(openTime, closeTime)
            }

            const updatedGround = await Ground.findByIdAndUpdate(groundId, updateData, {
                new: true,
                runValidators: true,
            }).populate("userId packageId")

            return updatedGround
        } catch (error) {
            console.log("Failed to perform Operation:", error);
        }
    },

    async deleteGround(groundId, userId) {
        try {
            const ground = await Ground.findOne({ _id: groundId, userId })
            if (!ground) {
                throw CustomErrorHandler.notFound("Ground not found or unauthorized")
            }

            // Check for active bookings
            const activeBookings = await Booking.countDocuments({
                serviceId: groundId,
                bookingType: "ground",
                bookingStatus: "confirmed",
                bookingDate: { $gte: new Date() },
            })

            if (activeBookings > 0) {
                throw CustomErrorHandler.badRequest("Cannot delete ground with active bookings")
            }

            await Ground.findByIdAndDelete(groundId)
        } catch (error) {
            console.log("Failed to perform Operation:", error);
        }
    },

    async bookGround(bookingData, userId) {
        try {
            const { groundId, bookingDate, timeSlot, paymentMethod, specialRequests } = bookingData

            const ground = await Ground.findById(groundId)
            if (!ground) {
                throw CustomErrorHandler.notFound("Ground not found")
            }

            // Check if ground is available on the booking date
            const bookingDay = DateTime.fromJSDate(new Date(bookingDate)).toFormat("cccc")
            if (!ground.groundOpenDays.includes(bookingDay)) {
                throw CustomErrorHandler.badRequest("Ground is not available on this day")
            }

            // Check if time slot is available
            const isSlotAvailable = await this.checkTimeSlotAvailability(groundId, bookingDate, timeSlot)
            if (!isSlotAvailable) {
                throw CustomErrorHandler.badRequest("Time slot is not available")
            }

            // Calculate duration and amount (you can implement pricing logic here)
            const duration = this.calculateDuration(timeSlot.startTime, timeSlot.endTime)
            const totalAmount = duration * 100 // Example pricing: ₹100 per hour

            // Create booking
            const booking = new Booking({
                bookingType: "ground",
                serviceId: groundId,
                userId,
                bookingDate: new Date(bookingDate),
                timeSlot,
                duration,
                totalAmount,
                paymentMethod,
                specialRequests,
            })

            await booking.save()

            // Update ground's total bookings
            await Ground.findByIdAndUpdate(groundId, { $inc: { totalBookings: 1 } })

            return await booking.populate("serviceId userId")
        } catch (error) {
            console.log("Failed to perform Operation:", error);
        }
    },

    async getAvailableTimeSlots(groundId, date) {
        try {
            const ground = await Ground.findById(groundId)
            if (!ground) {
                throw CustomErrorHandler.notFound("Ground not found")
            }

            // Get existing bookings for the date
            const existingBookings = await Booking.find({
                serviceId: groundId,
                bookingType: "ground",
                bookingDate: new Date(date),
                bookingStatus: "confirmed",
            })

            // Filter out booked time slots
            const availableSlots = ground.timeSlots.filter((slot) => {
                return !existingBookings.some(
                    (booking) => booking.timeSlot.startTime === slot.startTime && booking.timeSlot.endTime === slot.endTime,
                )
            })

            return availableSlots
        } catch (error) {
            console.log("Failed to perform Operation:", error);
        }
    },

    // Helper methods
    generateTimeSlots(openTime, closeTime) {
        const slots = []
        const start = DateTime.fromFormat(openTime, "HH:mm")
        const end = DateTime.fromFormat(closeTime, "HH:mm")

        let current = start
        while (current < end) {
            const slotEnd = current.plus({ hours: 1 })
            if (slotEnd <= end) {
                slots.push({
                    startTime: current.toFormat("HH:mm"),
                    endTime: slotEnd.toFormat("HH:mm"),
                    isBooked: false,
                })
            }
            current = slotEnd
        }

        return slots
    },

    async checkTimeSlotAvailability(groundId, date, timeSlot) {
        const booking = await Booking.findOne({
            serviceId: groundId,
            bookingType: "ground",
            bookingDate: new Date(date),
            "timeSlot.startTime": timeSlot.startTime,
            "timeSlot.endTime": timeSlot.endTime,
            bookingStatus: "confirmed",
        })

        return !booking
    },

    calculateDuration(startTime, endTime) {
        const start = DateTime.fromFormat(startTime, "HH:mm")
        const end = DateTime.fromFormat(endTime, "HH:mm")
        return end.diff(start, "hours").hours
    },

    async GetServiceType() {
        try {
            const categories = await Category.find(
                { categoryFor: "service_type" },
                {
                    createdAt: 0,
                    updatedAt: 0,
                    __v: 0
                }
            );
            console.log(categories);
            if (categories) {
                return categories[0].categoryItem;
            } else {
                console.log("Found nothing");
                return [];
            }
        } catch (error) {
            console.error("Error in getting service type:", error);
            return [];
        }
    },

    async getUserBookings(userId, filters) {
        try {
            const { page, limit, status, type } = filters
            const query = { userId }

            if (status) {
                query.bookingStatus = status
            }

            if (type) {
                query.bookingType = type
            }

            const skip = (page - 1) * limit
            const bookings = await Booking.find(query)
                .populate({
                    path: "serviceId",
                    populate: {
                        path: "userId",
                        select: "name email phone",
                    },
                })
                .skip(skip)
                .limit(limit)
                .sort({ createdAt: -1 })

            const total = await Booking.countDocuments(query)

            return {
                bookings,
                pagination: {
                    currentPage: page,
                    totalPages: Math.ceil(total / limit),
                    totalItems: total,
                    itemsPerPage: limit,
                },
            }
        } catch (error) {
            console.log("Failed to perform Operation:", error);
        }
    },

    async getBookingById(bookingId, userId) {
        try {
            const booking = await Booking.findOne({ _id: bookingId, userId }).populate({
                path: "serviceId",
                populate: {
                    path: "userId",
                    select: "name email phone",
                },
            })

            if (!booking) {
                throw CustomErrorHandler.notFound("Booking not found")
            }

            return booking
        } catch (error) {
            console.log("Failed to perform Operation:", error);
        }
    },

    async cancelBooking(bookingId, cancellationReason, userId) {
        try {
            const booking = await Booking.findOne({ _id: bookingId, userId })
            if (!booking) {
                throw CustomErrorHandler.notFound("Booking not found")
            }

            if (booking.bookingStatus === "cancelled") {
                throw CustomErrorHandler.badRequest("Booking is already cancelled")
            }

            if (booking.bookingStatus === "completed") {
                throw CustomErrorHandler.badRequest("Cannot cancel completed booking")
            }

            // Check if booking can be cancelled (e.g., at least 24 hours before)
            const bookingDateTime = new Date(booking.bookingDate)
            const now = new Date()
            const timeDiff = bookingDateTime.getTime() - now.getTime()
            const hoursDiff = timeDiff / (1000 * 3600)

            if (hoursDiff < 24) {
                throw CustomErrorHandler.badRequest("Booking can only be cancelled at least 24 hours in advance")
            }

            // Calculate refund amount (example: 80% refund)
            const refundAmount = booking.totalAmount * 0.8

            const updatedBooking = await Booking.findByIdAndUpdate(
                bookingId,
                {
                    bookingStatus: "cancelled",
                    cancellationReason,
                    refundAmount,
                    paymentStatus: "refunded",
                },
                { new: true },
            ).populate("serviceId")

            return updatedBooking
        } catch (error) {
            console.log("Failed to perform Operation:", error);
        }
    },

    async updatePaymentStatus(bookingId, paymentStatus) {
        try {
            const booking = await Booking.findByIdAndUpdate(bookingId, { paymentStatus }, { new: true }).populate("serviceId")

            if (!booking) {
                throw CustomErrorHandler.notFound("Booking not found")
            }

            return booking
        } catch (error) {
            console.log("Failed to perform Operation:", error);
        }
    },
}
export default ProviderServices;