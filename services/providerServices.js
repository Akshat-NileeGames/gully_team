import { Venue, Booking, User, Package, Individual, Category, Payout } from "../models/index.js"
import CustomErrorHandler from "../helpers/CustomErrorHandler.js"
import { DateTime } from "luxon"
import mongoose from "mongoose"
import ImageUploader from '../helpers/ImageUploader.js';
import { RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET } from "../config/index.js";
import axios from "axios";

function isBase64Image(str) {
  return /^data:image\/[a-zA-Z]+;base64,/.test(str);
}
const ProviderServices = {

  async createVenue(data) {
    try {
      const userInfo = global.user
      const packageInfo = await Package.findById(data.packageRef)
      if (!packageInfo) throw CustomErrorHandler.notFound("Package not found")

      const user = await User.findById(userInfo.userId)
      if (!user) throw CustomErrorHandler.notFound("User not found")
      if (data.sportPricing && data.sportPricing.length > 0) {
        const providedSports = data.sportPricing.map((sp) => sp.sport)
        const missingPricing = data.venue_sports.filter((sport) => !providedSports.includes(sport))
        if (missingPricing.length > 0) {
          throw CustomErrorHandler.badRequest(`Pricing missing for sports: ${missingPricing.join(", ")}`)
        }
      }

      let venueImages = [];

      // console.log(data.venueImages);
      if (Array.isArray(data.venueImages) && data.venueImages.length > 0) {
        for (const image of data.venueImages) {
          try {
            const uploadedUrl = await ImageUploader.Upload(image, "VenueImage");

            if (!uploadedUrl) {
              throw new Error("Image upload failed or returned empty URL.");
            }

            venueImages.push(uploadedUrl);
          } catch (uploadError) {
            console.error(`Image upload failed:${uploadError}`);
            throw CustomErrorHandler.serverError("Failed to upload one or more venue images.");
          }
        }
      } else {
        throw CustomErrorHandler.badRequest("Shop images are required.");
      }

      const venue = new Venue({
        venue_name: data.venue_name,
        venue_description: data.venue_description,
        venue_address: data.venue_address,
        venue_contact: data.venue_contact,
        venue_type: data.venue_type,
        venue_sports: data.venue_sports,
        sportPricing: data.sportPricing || [],
        upiId: data.upiId,
        venuefacilities: data.venuefacilities,
        venue_rules: data.venue_rules || [],
        venueImages: venueImages,
        venue_timeslots: data.venue_timeslots,
        locationHistory: {
          point: {
            type: "Point",
            coordinates: [Number.parseFloat(data.longitude), Number.parseFloat(data.latitude)],
            selectLocation: data.selectLocation,
          },
        },
        userId: userInfo.userId,
        packageRef: data.packageRef,
        isSubscriptionPurchased: true,
        subscriptionExpiry: DateTime.now().plus({ month: packageInfo.duration }).toJSDate(),
      })

      await venue.save()
      return venue
    } catch (error) {
      console.log("Failed to create Venue:", error)
      throw error
    }
  },

  async editVenue(data) {
    try {
      const { venueId, ...fieldsToUpdate } = data;
      const userInfo = global.user

      const user = await User.findById(userInfo.userId)
      if (!user) throw CustomErrorHandler.notFound("User not found")
      if (fieldsToUpdate.sportPricing && fieldsToUpdate.sportPricing.length > 0) {
        const providedSports = fieldsToUpdate.sportPricing.map((sp) => sp.sport)
        const missingPricing = fieldsToUpdate.venue_sports.filter((sport) => !providedSports.includes(sport))
        if (missingPricing.length > 0) {
          throw CustomErrorHandler.badRequest(`Pricing missing for sports: ${missingPricing.join(", ")}`)
        }
      }
      if (fieldsToUpdate.venueImages && Array.isArray(fieldsToUpdate.venueImages)) {
        const processedImages = [];
        for (let img of fieldsToUpdate.venueImages) {
          if (isBase64Image(img)) {
            const uploadedUrl = await ImageUploader.Upload(img, "VenueImage");
            processedImages.push(uploadedUrl);
          } else {
            processedImages.push(img);
          }
        }
        fieldsToUpdate.venueImages = processedImages;
      }
      await Venue.findByIdAndUpdate(
        venueId,
        { $set: fieldsToUpdate },
        { new: true }
      );

      const venue = await Venue.findById(venueId, {
        updatedAt: 0,
        createdAt: 0,
        __v: 0,
      });
      await this.editContactOnRazorPay(venue, venue.razorpaycontactId)
      return venue
    } catch (error) {
      console.log("Failed to create Venue:", error)
      throw error
    }
  },

  async editContactOnRazorPay(venue, contactId) {
    try {
      const endpoint = `https://api.razorpay.com/v1/contacts/${contactId}`;

      const auth = {
        username: RAZORPAY_KEY_ID,
        password: RAZORPAY_KEY_SECRET
      };

      const headers = {
        'Content-Type': 'application/json'
      };

      const payload = {
        name: venue.venue_name || `Venue_${venue._id}`,
        contact: venue.venue_contact || "0000000000",
        type: "vendor",
        reference_id: "test",
        notes: {
          source: "Venue Registration Update",
          venueId: venue._id.toString()
        }
      };

      const contactResponse = await axios.patch(endpoint, payload, { auth, headers });
      console.log("✅ Razorpay contact updated:", contactResponse.data.id);
      await Venue.findByIdAndUpdate(venue._id, {
        razorpaycontactId: contactResponse.data.id
      });

      return true;
    } catch (error) {
      console.error("❌ Failed to update Razorpay contact:", error.response?.data || error.message);
      throw new Error("Could not update contact on Razorpay");
    }
  },

  async getAllGrounds(filters) {
    try {
      const { page, limit, search, sportsCategory, location, radius } = filters
      const query = { isActive: true, isSubscriptionPurchased: true }

      if (search) {
        query.$or = [
          { venue_name: { $regex: search, $options: "i" } },
          { venue_description: { $regex: search, $options: "i" } },
          { venue_address: { $regex: search, $options: "i" } },
        ]
      }

      if (sportsCategory) {
        query.venue_sports = { $in: [sportsCategory] }
      }

      if (location && location.coordinates) {
        query["locationHistory.point"] = {
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
      const venues = await Venue.find(query)
        .populate("userId", "name email")
        .populate("packageRef")
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })

      const total = await Venue.countDocuments(query)

      return {
        venues,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: limit,
        },
      }
    } catch (error) {
      console.log("Failed to get all grounds:", error)
      throw error
    }
  },

  async getVenueById(data) {
    try {
      if (!data.id.match(/^[0-9a-fA-F]{24}$/)) {
        throw CustomErrorHandler.badRequest("Invalid Venue ID format")
      }

      const venue = await Venue.findById(data.id).populate("packageRef")

      if (!venue) {
        throw CustomErrorHandler.notFound("Venue not found")
      }

      return venue
    } catch (error) {
      console.log("Failed to get Venue by id:", error)
      throw error
    }
  },

  async getUserGroundRegisteredGround() {
    try {
      const userInfo = global.user
      const user = await User.findById(userInfo.userId)
      if (!user) throw CustomErrorHandler.notFound("User not found")

      const grounds = await Venue.find({
        userId: userInfo.userId,
      }).populate("packageRef")

      return grounds
    } catch (error) {
      console.log("Failed to get user grounds:", error)
      throw error
    }
  },


  async lockSlots({ venueId, sport, date, startTime, endTime, playableArea, userId, sessionId }) {
    try {
      const venue = await Venue.findById(venueId)
      if (!venue) {
        throw CustomErrorHandler.notFound("Venue not found")
      }

      if (!venue.venue_sports.map((s) => s.toLowerCase()).includes(sport.toLowerCase())) {
        throw CustomErrorHandler.badRequest(`Venue does not support ${sport}`)
      }
      const selectedSlots = [
        {
          startTime,
          endTime,
          playableArea,
        },
      ]

      const queryDate = new Date(date + "T00:00:00.000Z")
      const startOfDay = new Date(queryDate)
      startOfDay.setUTCHours(0, 0, 0, 0)
      const endOfDay = new Date(queryDate)
      endOfDay.setUTCHours(23, 59, 59, 999)
      var isAlreadyLocked = false;
      const existingBooking = await Booking.findOne({
        venueId,
        sport: sport,
        $or: [
          { bookingStatus: { $in: ["confirmed", "pending", "completed"] } },
          {
            isLocked: true,
            lockedUntil: { $gt: new Date() },
            userId: { $ne: userId },
          },
        ],
        scheduledDates: {
          $elemMatch: {
            date: startOfDay,
            timeSlots: {
              $elemMatch: {
                startTime: startTime,
                endTime: endTime,
                playableArea: playableArea,
              },
            },
          },
        },
      })

      if (existingBooking) {
        isAlreadyLocked = true;
        return {
          message: CustomErrorHandler.badRequest(
            `Slot ${startTime} - ${endTime} on playable area ${playableArea} is not available`,
          ),
          isAlreadyLocked: isAlreadyLocked
        }
      }

      const lockedUntil = new Date(Date.now() + 10 * 60 * 1000)
      const booking = await Booking.findOne({
        sessionId,
        userId,
        isLocked: true,
        isPaymentConfirm: false,
      })

      if (booking) {
        booking.lockedUntil = lockedUntil

        let dateMatched = false
        for (const sched of booking.scheduledDates) {
          if (sched.date.toISOString().split("T")[0] === date) {
            const existingSlots = sched.timeSlots
            const newSlots = selectedSlots.filter(
              (newSlot) =>
                !existingSlots.some(
                  (existing) =>
                    existing.startTime === newSlot.startTime &&
                    existing.endTime === newSlot.endTime &&
                    existing.playableArea === newSlot.playableArea,
                ),
            )
            sched.timeSlots.push(...newSlots)
            dateMatched = true
            break
          }
        }

        if (!dateMatched) {
          booking.scheduledDates.push({
            date: queryDate,
            timeSlots: selectedSlots,
          })
        }

        await booking.save()
        return {
          bookingId: booking._id,
          lockedSlots: selectedSlots,
          lockedUntil,
          sessionId,
          isAlreadyLocked,
          message: `${selectedSlots.length} slots added and locked to existing session`,
        }
      }

      const newBooking = new Booking({
        venueId,
        userId,
        sport,
        bookingPattern: "single_slots",
        scheduledDates: [
          {
            date: queryDate,
            timeSlots: selectedSlots,
          },
        ],
        durationInHours: 1,
        baseAmount: 0,
        processingFee: 0,
        convenienceFee: 0,
        gstamount: 0,
        totalAmount: 0,
        paymentStatus: "pending",
        bookingStatus: "pending",
        isLocked: true,
        lockedUntil,
        sessionId,
        isPaymentConfirm: false,
      })

      await newBooking.save()

      return {
        bookingId: newBooking._id,
        lockedSlots: selectedSlots,
        lockedUntil,
        sessionId,
        message: `${selectedSlots.length} slots locked successfully for 10 minutes`,
      }
    } catch (error) {
      console.log("Failed to lock slots:", error)
      throw error
    }
  },

  async releaseLockedSlots({ venueId, sport, date, userId, startTime, endTime, playableArea, sessionId }) {
    try {

      const booking = await Booking.findOne({
        venueId: venueId,
        sport: sport,
        sessionId: sessionId,
        userId: userId,
        isLocked: true,
        isPaymentConfirm: false,
      })

      if (!booking) {
        return CustomErrorHandler.notFound("No locked booking found for this session");
      }

      const scheduledDateEntry = booking.scheduledDates.find(
        (sched) => sched.date.toISOString().split("T")[0] === date,
      )

      if (!scheduledDateEntry) {
        throw CustomErrorHandler.notFound("No scheduled date entry found for the given date")
      }

      scheduledDateEntry.timeSlots = scheduledDateEntry.timeSlots.filter(
        (slot) =>
          !(
            slot.startTime === startTime &&
            slot.endTime === endTime &&
            slot.playableArea === playableArea
          )
      )
      if (scheduledDateEntry.timeSlots.length === 0) {
        booking.scheduledDates = booking.scheduledDates.filter(
          (sched) => sched.date.toISOString().split("T")[0] !== date,
        )
      }

      if (booking.scheduledDates.length === 0) {
        await Booking.findByIdAndDelete(booking._id)
        console.log(`Deleted booking ${booking._id} as no slots remain`)
        return {
          releasedCount: 1,
          message: "Booking deleted as no slots remain",
        }
      }

      await booking.save()

      console.log(`Released 1 slot for booking ${booking._id}`)

      return {
        releasedCount: 1,
        message: `Released 1 locked slot`,
      }
    } catch (error) {
      console.log("Failed to release locked slot:", error)
      throw error
    }
  },

  async releaseMultipleSlots({ venueId, sport, userId, sessionId }) {
    try {

      const booking = await Booking.findOne({
        venueId: venueId,
        sport: sport,
        sessionId: sessionId,
        userId: userId,
        isLocked: true,
        isPaymentConfirm: false,
      })

      if (!booking) {
        return CustomErrorHandler.notFound("No locked booking found for this session")
      }

      await Booking.findByIdAndDelete(booking._id);
      return true
    } catch (error) {
      console.log("Failed to release locked slot:", error)
      throw error
    }
  },
  async reserveMultipleSlots({ venueId, sport, date, playableArea, userId, sessionId }) {
    try {
      const venue = await Venue.findById(venueId)
      if (!venue) {
        throw CustomErrorHandler.notFound("Venue not found")
      }

      if (!venue.venue_sports.map((s) => s.toLowerCase()).includes(sport.toLowerCase())) {
        throw CustomErrorHandler.badRequest(`Venue does not support ${sport}`)
      }

      const reservedUntil = new Date(Date.now() + 10 * 60 * 1000)
      const scheduledDates = []

      for (const dateString of date) {
        const queryDate = new Date(dateString + "T00:00:00.000Z")
        const requestedDate = DateTime.fromJSDate(queryDate)
        const dayName = requestedDate.toFormat("cccc")
        const dayTiming = venue.venue_timeslots[dayName]

        if (!dayTiming || !dayTiming.isOpen) {
          continue
        }
        const allSlots = this.generateTimeSlots(dayTiming.openTime, dayTiming.closeTime)

        const startOfDay = new Date(queryDate)
        startOfDay.setUTCHours(0, 0, 0, 0)
        const endOfDay = new Date(queryDate)
        endOfDay.setUTCHours(23, 59, 59, 999)

        const existingBookings = await Booking.find({
          venueId,
          sport: new RegExp(`^${sport}$`, "i"),
          $or: [
            { bookingStatus: { $in: ["confirmed", "pending", "completed"] } },
            {
              isLocked: true,
              lockedUntil: { $gt: new Date() },
              userId: { $ne: userId },
            },
          ],
          "scheduledDates.date": { $gte: startOfDay, $lte: endOfDay },
        })

        const bookedSlots = new Set()
        existingBookings.forEach((booking) => {
          booking.scheduledDates.forEach((dateSlot) => {
            dateSlot.timeSlots.forEach((slot) => {
              if (slot.playableArea === playableArea) {
                bookedSlots.add(`${slot.startTime}-${slot.endTime}`)
              }
            })
          })
        })
        const availableSlots = allSlots
          .filter((slot) => !bookedSlots.has(`${slot.startTime}-${slot.endTime}`))
          .map((slot) => ({
            startTime: slot.startTime,
            endTime: slot.endTime,
            playableArea,
          }))

        if (availableSlots.length > 0) {
          scheduledDates.push({
            date: queryDate,
            timeSlots: availableSlots,
          })
        }
      }

      if (scheduledDates.length === 0) {
        throw CustomErrorHandler.badRequest("No available slots found for the selected dates")
      }
      const reservationBooking = new Booking({
        venueId,
        userId,
        sport,
        bookingPattern: "multiple_dates",
        scheduledDates,
        durationInHours: scheduledDates.reduce((total, dateSlot) => total + dateSlot.timeSlots.length, 0),
        baseAmount: 0,
        processingFee: 0,
        convenienceFee: 0,
        gstamount: 0,
        totalAmount: 0,
        paymentStatus: "pending",
        bookingStatus: "pending",
        isLocked: true,
        reservedUntil,
        sessionId: sessionId,
        isPaymentConfirm: false,
      });

      await reservationBooking.save()

      return {
        bookingId: reservationBooking._id,
        reservedSlots: scheduledDates,
        reservedUntil,
        sessionId,
        message: `${scheduledDates.length} date(s) with available slots reserved successfully for 5 minutes`,
      }
    } catch (error) {
      console.log("Failed to reserve multiple slots:", error)
      throw error
    }
  },
  async confirmPayment({ venueId, sport, sessionId, razorpayPaymentId, userId, durationInHours, totalAmount, convenienceFee, processingFee, gstamount, baseAmount }) {
    try {
      const lockedBooking = await Booking.findOne({
        venueId: venueId,
        sessionId: sessionId,
        sport: sport,
        lockedBy: userId,
        isLocked: true,
        isPaymentConfirm: false,
      })

      if (lockedBooking.length === 0) {
        throw CustomErrorHandler.badRequest("No locked slots found for confirmation")
      }


      lockedBooking.isPaymentConfirm = true;
      lockedBooking.isLocked = true;
      lockedBooking.bookingStatus = "confirmed";
      lockedBooking.lockedUntil = undefined;
      lockedBooking.paymentStatus = "successful";
      lockedBooking.razorpayPaymentId = razorpayPaymentId;
      lockedBooking.durationInHours = durationInHours;
      lockedBooking.baseAmount = baseAmount;
      lockedBooking.totalAmount = totalAmount;
      lockedBooking.processingFee = processingFee;
      lockedBooking.convenienceFee = convenienceFee;
      lockedBooking.gstamount = gstamount;
      await Venue.findByIdAndUpdate(venueId, {
        $inc: {
          totalBookings: 1,
          amountNeedToPay: baseAmount,
          totalAmount: baseAmount,
        },
      });

      await lockedBooking.save();
      const updatedBookings = Booking.findById(lockedBooking._id);
      return updatedBookings;
    } catch (error) {
      console.log("Failed to confirm payment:", error)
      throw error
    }
  },

  // MARK: - Modified existing methods

  async bookVenue(bookingData) {
    try {
      const {
        venueId,
        sport,
        bookingPattern,
        scheduledDates,
        durationInHours,
        totalamount,
        paymentStatus,
        bookingStatus,
        userId,
        paymentId,
        razorpayPaymentId,
        razorpaySignature,
        isPaymentConfirm = false,
      } = bookingData

      const venue = await Venue.findById(venueId)
      if (!venue) throw CustomErrorHandler.notFound("Venue not found")

      if (!venue.venue_sports.includes(sport)) {
        throw CustomErrorHandler.badRequest(`Venue does not support ${sport}`)
      }

      // For time-sensitive bookings, check if slots are locked by this user
      if (isPaymentConfirm) {
        // This is a confirmed payment, proceed with booking
        for (const dateSlot of scheduledDates) {
          const bookingDay = DateTime.fromJSDate(new Date(dateSlot.date)).toFormat("cccc")
          const dayTiming = venue.venue_timeslots[bookingDay]

          if (!dayTiming || !dayTiming.isOpen) {
            throw CustomErrorHandler.badRequest(`Venue is closed on ${bookingDay}`)
          }
        }
      } else {
        // Regular booking flow - check availability
        for (const dateSlot of scheduledDates) {
          const bookingDay = DateTime.fromJSDate(new Date(dateSlot.date)).toFormat("cccc")
          const dayTiming = venue.venue_timeslots[bookingDay]

          if (!dayTiming || !dayTiming.isOpen) {
            throw CustomErrorHandler.badRequest(`Venue is closed on ${bookingDay}`)
          }

          // Validate each time slot with playable area
          for (const slot of dateSlot.timeSlots) {
            const isAvailable = await this.checkSlotAvailabilityWithPlayableArea(venueId, sport, dateSlot.date, slot)

            if (!isAvailable) {
              throw CustomErrorHandler.badRequest(
                `Slot ${slot.startTime} - ${slot.endTime} on playable area ${slot.playableArea} is unavailable on ${dateSlot.date}`,
              )
            }
          }
        }
      }

      const booking = new Booking({
        venueId,
        userId,
        sport,
        bookingPattern: bookingPattern || "single_slots",
        scheduledDates,
        durationInHours: durationInHours,
        totalAmount: totalamount,
        paymentStatus: paymentStatus || "pending",
        bookingStatus: bookingStatus || "pending",
        paymentId,
        razorpayPaymentId,
        razorpaySignature,
        isPaymentConfirm,
        isLocked: false,
      })

      await booking.save()
      await Venue.findByIdAndUpdate(venueId, {
        $inc: {
          totalBookings: 1,
          amountNeedToPay: totalamount,
          totalAmount: totalamount,
        },
      })

      return await booking.populate("venueId userId")
    } catch (error) {
      console.log("Failed to book venue:", error)
      throw error
    }
  },

  // async bookVenue(bookingData) {
  //   try {
  //     const {
  //       venueId,
  //       sport,
  //       bookingPattern,
  //       scheduledDates,
  //       durationInHours,
  //       totalamount,
  //       paymentStatus,
  //       bookingStatus,
  //       isMultiDay = false,
  //       multiDayStartDate,
  //       multiDayEndDate,
  //       isFullDay = false,
  //     } = bookingData

  //     const userInfo = global.user
  //     const venue = await Venue.findById(venueId)
  //     if (!venue) throw CustomErrorHandler.notFound("Venue not found")

  //     if (!venue.venue_sports.includes(sport)) {
  //       throw CustomErrorHandler.badRequest(`Venue does not support ${sport}`)
  //     }

  //     // Enhanced validation for multi-day and full-day bookings
  //     if (isMultiDay && (!multiDayStartDate || !multiDayEndDate)) {
  //       throw CustomErrorHandler.badRequest("Multi-day bookings require start and end dates")
  //     }

  //     // Calculate total days for multi-day bookings
  //     let totalDays = 1
  //     if (isMultiDay) {
  //       const startDate = new Date(multiDayStartDate)
  //       const endDate = new Date(multiDayEndDate)
  //       totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1
  //     }

  //     // Validate availability for all dates
  //     for (const dateSlot of scheduledDates) {
  //       const bookingDay = DateTime.fromJSDate(new Date(dateSlot.date)).toFormat("cccc")
  //       const dayTiming = venue.venue_timeslots[bookingDay]

  //       if (!dayTiming || !dayTiming.isOpen) {
  //         throw CustomErrorHandler.badRequest(`Venue is closed on ${bookingDay}`)
  //       }

  //       // For full-day bookings, check entire day availability
  //       if (dateSlot.isFullDay || isFullDay) {
  //         const isFullDayAvailable = await this.checkFullDayAvailability(venueId, sport, dateSlot.date)
  //         if (!isFullDayAvailable) {
  //           throw CustomErrorHandler.badRequest(`Full day booking not available on ${dateSlot.date}`)
  //         }
  //       } else {
  //         // Check individual time slots
  //         for (const slot of dateSlot.timeSlots || []) {
  //           const isAvailable = await this.checkGroundSlotAvailability(venueId, sport, dateSlot.date, slot)
  //           if (!isAvailable) {
  //             throw CustomErrorHandler.badRequest(
  //               `Slot ${slot.startTime} - ${slot.endTime} is unavailable on ${dateSlot.date}`,
  //             )
  //           }
  //         }
  //       }
  //     }

  //     // Calculate pricing with multi-day discounts
  //     const pricingBreakdown = this.calculateMultiDayPricing(venue, sport, totalDays, totalamount, isFullDay)

  //     const booking = new Booking({
  //       venueId,
  //       sport,
  //       bookingPattern: bookingPattern || "single_slots",
  //       scheduledDates: scheduledDates.map((dateSlot) => ({
  //         ...dateSlot,
  //         isFullDay: dateSlot.isFullDay || isFullDay,
  //       })),
  //       isMultiDay,
  //       multiDayStartDate: isMultiDay ? new Date(multiDayStartDate) : undefined,
  //       multiDayEndDate: isMultiDay ? new Date(multiDayEndDate) : undefined,
  //       totalDays,
  //       durationInHours,
  //       totalAmount: pricingBreakdown.finalAmount,
  //       dailyRate: pricingBreakdown.dailyRate,
  //       pricingBreakdown,
  //       paymentStatus: paymentStatus || "pending",
  //       bookingStatus: bookingStatus || "pending",
  //       userId: userInfo.userId,
  //     })

  //     await booking.save()

  //     // Update venue statistics
  //     await Venue.findByIdAndUpdate(venueId, {
  //       $inc: {
  //         totalBookings: 1,
  //         amountNeedToPay: pricingBreakdown.finalAmount,
  //         totalAmount: pricingBreakdown.finalAmount,
  //       },
  //     })

  //     return await booking.populate("venueId userId")
  //   } catch (error) {
  //     console.log("Failed to book venue:", error)
  //     throw error
  //   }
  // },
  levenshteinDistance(str1, str2) {
    const matrix = []
    const len1 = str1.length
    const len2 = str2.length

    if (len1 === 0) return len2
    if (len2 === 0) return len1

    // Initialize matrix
    for (let i = 0; i <= len1; i++) {
      matrix[i] = [i]
    }
    for (let j = 0; j <= len2; j++) {
      matrix[0][j] = j
    }

    // Fill matrix
    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1, // deletion
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j - 1] + cost, // substitution
        )
      }
    }

    return matrix[len1][len2]
  },

  fuzzySearch(query, text, threshold = 3) {
    const queryLower = query.toLowerCase()
    const textLower = text.toLowerCase()

    // Exact match
    if (textLower.includes(queryLower)) return true

    // Fuzzy match using Levenshtein distance
    const words = textLower.split(" ")
    for (const word of words) {
      if (this.levenshteinDistance(queryLower, word) <= threshold) {
        return true
      }
    }

    return false
  },

  async getNearbyVenues(filters) {
    try {
      const { latitude, longitude, page } = filters
      const limit = 10;
      const MAX_DISTANCE_METERS = 15 * 1000;
      const skip = (page - 1) * limit
      const userLocation = {
        type: "Point",
        coordinates: [longitude, latitude]
      };
      //TODO:Need to remove these comment below
      console.log("The current location:", userLocation);
      // Find shops with expired subscriptions within the defined radius
      const expiredvenue = await Venue.find({
        "locationHistory.point": {
          $near: {
            $geometry: userLocation,
            $maxDistance: MAX_DISTANCE_METERS
          }
        },
        subscriptionExpiry: { $lt: new Date() },
        isSubscriptionPurchased: true
      }).select('_id');

      if (expiredvenue.length > 0) {
        const expiredvenueIds = expiredvenue.map(Venue => Venue._id);
        await Venue.updateMany(
          { _id: { $in: expiredvenueIds } },
          { $set: { isSubscriptionPurchased: false } }
        );
      }
      const nearbyVenue = await Venue.aggregate([
        {
          $geoNear: {
            near: userLocation,
            distanceField: "distance",
            spherical: true,
            maxDistance: MAX_DISTANCE_METERS
          }
        },
        {
          $addFields: {
            distanceInKm: { $divide: ["$distance", 1000] }
          }
        },
        {
          $match: {
            distanceInKm: { $lte: 15 },
            isSubscriptionPurchased: true
          }
        },
        {
          $lookup: {
            from: "packages",
            localField: "packageRef",
            foreignField: "_id",
            as: "packageRef"
          },
        },

        {
          $unwind: {
            path: "$packageRef",
            preserveNullAndEmptyArrays: true
          }
        },
        { $skip: skip },
        { $limit: limit }

      ]);
      return nearbyVenue;
    } catch (error) {
      console.log(`Failed to get nearby venues:${error}`)
      throw error
    }
  },

  async getNearbyIndividuals(filters) {
    try {
      const { latitude, longitude, page } = filters
      const limit = 10;
      const MAX_DISTANCE_METERS = 100 * 1000;
      const skip = (page - 1) * limit
      const userLocation = {
        type: "Point",
        coordinates: [longitude, latitude]
      };
      const expiredindividualPackage = await Individual.find({
        "locationHistory.point": {
          $near: {
            $geometry: userLocation,
            $maxDistance: MAX_DISTANCE_METERS
          }
        },
        subscriptionExpiry: { $lt: new Date() },
        hasActiveSubscription: true
      }).select('_id');

      if (expiredindividualPackage.length > 0) {
        const expiredindividualPackageIds = expiredindividualPackage.map(Venue => Venue._id);
        await Individual.updateMany(
          { _id: { $in: expiredindividualPackageIds } },
          { $set: { hasActiveSubscription: false } }
        );
      }
      const nearbyIndividual = await Individual.aggregate([
        {
          $geoNear: {
            near: userLocation,
            distanceField: "distance",
            spherical: true,
            maxDistance: MAX_DISTANCE_METERS
          }
        },
        {
          $addFields: {
            distanceInKm: { $divide: ["$distance", 1000] }
          }
        },
        {
          $match: {
            distanceInKm: { $lte: 100 },
            hasActiveSubscription: true
          }
        },
        {
          $lookup: {
            from: "packages",
            localField: "packageRef",
            foreignField: "_id",
            as: "packageRef"
          },
        },

        {
          $unwind: {
            path: "$packageRef",
            preserveNullAndEmptyArrays: true
          }
        },
        { $skip: skip },
        { $limit: limit }

      ]);
      return nearbyIndividual;
    } catch (error) {
      console.log("Failed to get nearby individuals:", error)
      throw error
    }
  },
  levenshteinDistance(str1, str2) {
    const matrix = []
    const len1 = str1.length
    const len2 = str2.length

    if (len1 === 0) return len2
    if (len2 === 0) return len1

    // Initialize matrix
    for (let i = 0; i <= len1; i++) {
      matrix[i] = [i]
    }
    for (let j = 0; j <= len2; j++) {
      matrix[0][j] = j
    }

    // Fill matrix
    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1, // deletion
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j - 1] + cost, // substitution
        )
      }
    }

    return matrix[len1][len2]
  },
  fuzzySearch(query, text, threshold = 3) {
    const queryLower = query.toLowerCase()
    const textLower = text.toLowerCase()

    // Exact match
    if (textLower.includes(queryLower)) return true

    // Fuzzy match using Levenshtein distance
    const words = textLower.split(" ")
    for (const word of words) {
      if (this.levenshteinDistance(queryLower, word) <= threshold) {
        return true
      }
    }

    return false
  },

  async searchVenues(filters) {
    try {
      const { query, latitude, longitude, page, radius, sport, venueType, priceRange } = filters
      const MAX_DISTANCE_METERS = Math.min(radius * 1000, 15000) // Max 15km
      const limit = 10;
      const userLocation = {
        type: "Point",
        coordinates: [longitude, latitude],
      }

      // Build aggregation pipeline
      const pipeline = [
        // Geospatial search first for performance
        {
          $geoNear: {
            near: userLocation,
            distanceField: "distance",
            spherical: true,
            maxDistance: MAX_DISTANCE_METERS,
            query: {
              isActive: true,
              isSubscriptionPurchased: true,
            },
          },
        },
        // Add calculated fields
        {
          $addFields: {
            distanceInKm: { $divide: ["$distance", 1000] },
            searchableText: {
              $concat: [
                "$venue_name",
                " ",
                "$venue_description",
                " ",
                "$venue_address",
                " ",
                {
                  $reduce: {
                    input: "$venue_sports",
                    initialValue: "",
                    in: { $concat: ["$$value", " ", "$$this"] },
                  },
                },
              ],
            },
          },
        },
        // Apply filters
        {
          $match: {
            $and: [
              // Text search using regex for better performance
              {
                $or: [
                  { venue_name: { $regex: query, $options: "i" } },
                  { venue_description: { $regex: query, $options: "i" } },
                  { venue_address: { $regex: query, $options: "i" } },
                  { venue_sports: { $in: [new RegExp(query, "i")] } },
                ],
              },
              // Additional filters
              ...(sport ? [{ venue_sports: { $in: [sport] } }] : []),
              ...(venueType ? [{ venue_type: venueType }] : []),
              ...(priceRange?.min !== undefined ? [{ perHourCharge: { $gte: priceRange.min } }] : []),
              ...(priceRange?.max !== undefined ? [{ perHourCharge: { $lte: priceRange.max } }] : []),
            ],
          },
        },
        // Lookup package information
        {
          $lookup: {
            from: "packages",
            localField: "packageRef",
            foreignField: "_id",
            as: "packageRef",
          },
        },
        {
          $unwind: {
            path: "$packageRef",
            preserveNullAndEmptyArrays: true,
          },
        },
        // Lookup user information
        // {
        //   $lookup: {
        //     from: "users",
        //     localField: "userId",
        //     foreignField: "_id",
        //     as: "userId",
        //     pipeline: [{ $project: { name: 1, email: 1 } }],
        //   },
        // },
        // {
        //   $unwind: {
        //     path: "$userInfo",
        //     preserveNullAndEmptyArrays: true,
        //   },
        // },
        // Add search score
        {
          $addFields: {
            searchScore: {
              $add: [
                // Text relevance score
                {
                  $cond: [{ $regexMatch: { input: "$venue_name", regex: query, options: "i" } }, 40, 0],
                },
                {
                  $cond: [{ $regexMatch: { input: "$venue_description", regex: query, options: "i" } }, 20, 0],
                },
                // Distance score (closer = higher score)
                { $subtract: [30, { $multiply: ["$distanceInKm", 2] }] },
                // Booking popularity score
                { $min: [20, { $multiply: ["$totalBookings", 0.1] }] },
                // Active subscription bonus
                { $cond: ["$isSubscriptionPurchased", 10, 0] },
              ],
            },
          },
        },
        // Sort by search score and distance
        {
          $sort: {
            searchScore: -1,
            distanceInKm: 1,
            totalBookings: -1,
          },
        },
        // Pagination
        { $skip: (page - 1) * limit },
        { $limit: limit },
        // Final projection
        {
          $project: {
            venue_name: 1,
            venue_description: 1,
            venue_address: 1,
            venue_contact: 1,
            venue_type: 1,
            venue_surfacetype: 1,
            venue_sports: 1,
            sportPricing: 1,
            perHourCharge: 1,
            upiId: 1,
            venuefacilities: 1,
            venue_rules: 1,
            venueImages: 1,
            venue_timeslots: 1,
            locationHistory: 1,
            totalBookings: 1,
            isActive: 1,
            isSubscriptionPurchased: 1,
            subscriptionExpiry: 1,
            packageRef: 1,
            userId: 1,
            // distance: 1,
            // distanceInKm: 1,
            // searchScore: 1,
          },
        },
      ]

      const venues = await Venue.aggregate(pipeline)

      // Get total count for pagination
      const countPipeline = [
        {
          $geoNear: {
            near: userLocation,
            distanceField: "distance",
            spherical: true,
            maxDistance: MAX_DISTANCE_METERS,
            query: {
              isActive: true,
              isSubscriptionPurchased: true,
            },
          },
        },
        {
          $match: {
            $and: [
              {
                $or: [
                  { venue_name: { $regex: query, $options: "i" } },
                  { venue_description: { $regex: query, $options: "i" } },
                  { venue_address: { $regex: query, $options: "i" } },
                  { venue_sports: { $in: [new RegExp(query, "i")] } },
                ],
              },
              ...(sport ? [{ venue_sports: { $in: [sport] } }] : []),
              ...(venueType ? [{ venue_type: venueType }] : []),
              ...(priceRange?.min !== undefined ? [{ perHourCharge: { $gte: priceRange.min } }] : []),
              ...(priceRange?.max !== undefined ? [{ perHourCharge: { $lte: priceRange.max } }] : []),
            ],
          },
        },
        { $count: "total" },
      ]

      const countResult = await Venue.aggregate(countPipeline)
      const total = countResult[0]?.total || 0

      return {
        venues,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: limit,
          hasMore: page < Math.ceil(total / limit),
        },
        searchQuery: query,
        searchRadius: radius,
        userLocation: { latitude, longitude },
      }
    } catch (error) {
      console.log("Failed to search venues:", error)
      throw error
    }
  },

  async searchIndividuals(filters) {
    try {
      const { query, latitude, longitude, page, radius, sport, serviceType, experienceRange, ageGroup } = filters
      const MAX_DISTANCE_METERS = Math.min(radius * 1000, 15000) // Max 15km
      const limit = 10;
      const userLocation = {
        type: "Point",
        coordinates: [longitude, latitude],
      }

      // Build aggregation pipeline
      const pipeline = [
        // Geospatial search first
        {
          $geoNear: {
            near: userLocation,
            distanceField: "distance",
            spherical: true,
            maxDistance: MAX_DISTANCE_METERS,
            query: {
              hasActiveSubscription: true,
            },
          },
        },
        // Add calculated fields
        {
          $addFields: {
            distanceInKm: { $divide: ["$distance", 1000] },
            searchableText: {
              $concat: [
                "$fullName",
                " ",
                "$bio",
                " ",
                {
                  $reduce: {
                    input: "$sportsCategories",
                    initialValue: "",
                    in: { $concat: ["$$value", " ", "$$this"] },
                  },
                },
                " ",
                {
                  $reduce: {
                    input: "$selectedServiceTypes",
                    initialValue: "",
                    in: { $concat: ["$$value", " ", "$$this"] },
                  },
                },
              ],
            },
          },
        },
        // Apply filters
        {
          $match: {
            $and: [
              // Text search
              {
                $or: [
                  { fullName: { $regex: query, $options: "i" } },
                  { bio: { $regex: query, $options: "i" } },
                  { sportsCategories: { $in: [new RegExp(query, "i")] } },
                  { selectedServiceTypes: { $in: [new RegExp(query, "i")] } },
                ],
              },
              // Additional filters
              ...(sport ? [{ sportsCategories: { $in: [sport] } }] : []),
              ...(serviceType === "one_on_one" ? [{ "serviceOptions.providesOneOnOne": true }] : []),
              ...(serviceType === "team_service" ? [{ "serviceOptions.providesTeamService": true }] : []),
              ...(serviceType === "online_service" ? [{ "serviceOptions.providesOnlineService": true }] : []),
              ...(experienceRange?.min !== undefined ? [{ yearOfExperience: { $gte: experienceRange.min } }] : []),
              ...(experienceRange?.max !== undefined ? [{ yearOfExperience: { $lte: experienceRange.max } }] : []),
              ...(ageGroup ? [{ supportedAgeGroups: { $in: [ageGroup] } }] : []),
            ],
          },
        },
        // Lookup package information
        {
          $lookup: {
            from: "packages",
            localField: "packageRef",
            foreignField: "_id",
            as: "packageRef",
          },
        },
        {
          $unwind: {
            path: "$packageRef",
            preserveNullAndEmptyArrays: true,
          },
        },
        // Lookup user information
        // {
        //   $lookup: {
        //     from: "users",
        //     localField: "userId",
        //     foreignField: "_id",
        //     as: "userInfo",
        //     pipeline: [{ $project: { name: 1, email: 1 } }],
        //   },
        // },
        // {
        //   $unwind: {
        //     path: "$userInfo",
        //     preserveNullAndEmptyArrays: true,
        //   },
        // },
        // Add search score
        {
          $addFields: {
            searchScore: {
              $add: [
                // Text relevance score
                {
                  $cond: [{ $regexMatch: { input: "$fullName", regex: query, options: "i" } }, 40, 0],
                },
                {
                  $cond: [{ $regexMatch: { input: "$bio", regex: query, options: "i" } }, 20, 0],
                },
                // Distance score
                { $subtract: [30, { $multiply: ["$distanceInKm", 2] }] },
                // Experience score
                { $min: [15, { $multiply: ["$yearOfExperience", 0.5] }] },
                // Active subscription bonus
                { $cond: ["$hasActiveSubscription", 10, 0] },
                // Service variety bonus
                {
                  $add: [
                    { $cond: ["$serviceOptions.providesOneOnOne", 3, 0] },
                    { $cond: ["$serviceOptions.providesTeamService", 3, 0] },
                    { $cond: ["$serviceOptions.providesOnlineService", 2, 0] },
                  ],
                },
              ],
            },
          },
        },
        // Sort by search score and experience
        {
          $sort: {
            searchScore: -1,
            yearOfExperience: -1,
            distanceInKm: 1,
          },
        },
        // Pagination
        { $skip: (page - 1) * limit },
        { $limit: limit },
      ]

      const individuals = await Individual.aggregate(pipeline)

      // Get total count
      const countPipeline = [
        {
          $geoNear: {
            near: userLocation,
            distanceField: "distance",
            spherical: true,
            maxDistance: MAX_DISTANCE_METERS,
            query: {
              hasActiveSubscription: true,
            },
          },
        },
        {
          $match: {
            $and: [
              {
                $or: [
                  { fullName: { $regex: query, $options: "i" } },
                  { bio: { $regex: query, $options: "i" } },
                  { sportsCategories: { $in: [new RegExp(query, "i")] } },
                  { selectedServiceTypes: { $in: [new RegExp(query, "i")] } },
                ],
              },
              ...(sport ? [{ sportsCategories: { $in: [sport] } }] : []),
              ...(serviceType === "one_on_one" ? [{ "serviceOptions.providesOneOnOne": true }] : []),
              ...(serviceType === "team_service" ? [{ "serviceOptions.providesTeamService": true }] : []),
              ...(serviceType === "online_service" ? [{ "serviceOptions.providesOnlineService": true }] : []),
              ...(experienceRange?.min !== undefined ? [{ yearOfExperience: { $gte: experienceRange.min } }] : []),
              ...(experienceRange?.max !== undefined ? [{ yearOfExperience: { $lte: experienceRange.max } }] : []),
              ...(ageGroup ? [{ supportedAgeGroups: { $in: [ageGroup] } }] : []),
            ],
          },
        },
        { $count: "total" },
      ]

      const countResult = await Individual.aggregate(countPipeline)
      const total = countResult[0]?.total || 0

      return {
        individuals,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: limit,
          hasMore: page < Math.ceil(total / limit),
        },
        searchQuery: query,
        searchRadius: radius,
        userLocation: { latitude, longitude },
      }
    } catch (error) {
      console.log("Failed to search individuals:", error)
      throw error
    }
  },
  async getTodayBookings(data) {
    try {
      const { venueId, sport = "all" } = data;

      // Check if Venue exists
      const isGroundExists = await Venue.findById(venueId);
      if (!isGroundExists) {
        return CustomErrorHandler.notFound("Venue Not Found");
      }

      // Today's date range
      const today = new Date();
      const startOfToday = new Date(today.setHours(0, 0, 0, 0));
      const endOfToday = new Date(today.setHours(23, 59, 59, 999));

      // Build query
      const matchQuery = {
        venueId: mongoose.Types.ObjectId(venueId),
        "scheduledDates.date": { $gte: startOfToday, $lte: endOfToday },
      };

      if (sport !== "all") {
        matchQuery.sport = new RegExp(`^${sport}$`, "i");
      }

      const bookings = await Booking.find(matchQuery)
        .populate({
          path: "venueId",
          populate: { path: "packageRef" },
        }).
        populate("userId")
        .sort({ createdAt: -1 });

      // Compute stats
      const totalRevenue = bookings
        .filter(b => b.paymentStatus === "successful")
        .reduce((sum, b) => sum + b.totalAmount, 0);

      const statusBreakdown = bookings.reduce((acc, b) => {
        acc[b.bookingStatus] = (acc[b.bookingStatus] || 0) + 1;
        return acc;
      }, {});

      const sportBreakdown = bookings.reduce((acc, b) => {
        acc[b.sport] = (acc[b.sport] || 0) + 1;
        return acc;
      }, {});

      return {
        bookings,
        statistics: {
          totalBookings: bookings.length,
          totalRevenue,
          statusBreakdown,
          sportBreakdown,
          date: new Date().toISOString().split("T")[0],
        },
        filters: { sport },
      };
    } catch (error) {
      console.error("Failed to get today's bookings:", error);
      throw error;
    }
  },
  async getUpcomingBookings(data) {
    try {
      const { venueId, sport = 'all', page = 1 } = data;
      const limit = 10
      const isGroundExists = await Venue.findById(venueId);
      if (!isGroundExists) {
        return CustomErrorHandler.notFound("Venue Not Found");
      }
      const now = new Date()
      const skip = (page - 1) * limit

      const matchQuery = {
        venueId: mongoose.Types.ObjectId(venueId),
        "scheduledDates.date": { $gt: now },
        bookingStatus: { $in: ["confirmed", "pending"] },
      }

      // Add sport filter if provided
      if (sport && sport !== "all") {
        matchQuery.sport = new RegExp(`^${sport}$`, "i")
      }

      const total = await Booking.countDocuments(matchQuery)

      const bookings = await Booking.find(matchQuery)
        .populate({
          path: "venueId",
          populate: { path: "packageRef" },
        })
        .populate("userId")
        .sort({ "scheduledDates.date": 1 })
        .skip(skip)
        .limit(limit)

      // Group bookings by date for better organization
      const bookingsByDate = bookings.reduce((acc, booking) => {
        if (booking.scheduledDates && booking.scheduledDates.length > 0) {
          const dateKey = booking.scheduledDates[0].date.toISOString().split("T")[0]
          if (!acc[dateKey]) {
            acc[dateKey] = []
          }
          acc[dateKey].push(booking)
        }
        return acc
      }, {})

      // Calculate statistics
      const totalRevenue = bookings
        .filter((booking) => booking.paymentStatus === "successful")
        .reduce((sum, booking) => sum + booking.totalAmount, 0)

      const statusBreakdown = bookings.reduce((acc, booking) => {
        acc[booking.bookingStatus] = (acc[booking.bookingStatus] || 0) + 1
        return acc
      }, {})

      return {
        bookings,
        bookingsByDate,
        statistics: {
          totalBookings: bookings.length,
          totalRevenue,
          statusBreakdown,
        },
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: limit,
          hasMore: page < Math.ceil(total / limit),
        },
        filters: {
          sport: sport || "all",
        },
      }
    } catch (error) {
      console.error("Failed to get upcoming bookings:", error)
      throw error
    }
  },
  async getPastBooking(data) {
    try {
      const { venueId, sport = "all", page = 1 } = data;
      const limit = 10;
      const skip = (page - 1) * limit;

      // Validate Venue
      const groundExists = await Venue.findById(venueId);
      if (!groundExists) {
        throw CustomErrorHandler.notFound("Venue Not Found");
      }

      // Date logic
      const now = new Date();
      const startOfToday = new Date(now.setHours(0, 0, 0, 0));

      // Build query for past bookings
      const matchQuery = {
        venueId: mongoose.Types.ObjectId(venueId),
        scheduledDates: {
          $elemMatch: {
            date: { $lt: startOfToday }
          }
        },
      };

      if (sport && sport.toLowerCase() !== "all") {
        matchQuery.sport = new RegExp(`^${sport}$`, "i");
      }

      // Count total
      const total = await Booking.countDocuments(matchQuery);

      // Fetch bookings
      const bookings = await Booking.find(matchQuery)
        .populate({
          path: "venueId",
          populate: { path: "packageRef" },
        })
        .populate("userId")
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

      // If no bookings
      if (!bookings || bookings.length === 0) {
        return {
          bookings: [],
          statistics: {
            totalBookings: 0,
            totalRevenue: 0,
            averageBookingValue: 0,
            monthlyBreakdown: {},
            sportBreakdown: {},
          },
          pagination: {
            currentPage: page,
            totalPages: 0,
            totalItems: 0,
            itemsPerPage: limit,
            hasMore: false,
          },
          filters: { sport },
        };
      }

      // Stats
      const successfulBookings = bookings.filter(b => b.paymentStatus === "successful");
      const totalRevenue = successfulBookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
      const averageBookingValue = bookings.length ? totalRevenue / bookings.length : 0;

      // Monthly Breakdown
      const monthlyBreakdown = {};
      for (const booking of bookings) {
        const monthKey = booking.updatedAt.toISOString().substring(0, 7);
        if (!monthlyBreakdown[monthKey]) {
          monthlyBreakdown[monthKey] = { count: 0, revenue: 0 };
        }
        monthlyBreakdown[monthKey].count++;
        if (booking.paymentStatus === "successful") {
          monthlyBreakdown[monthKey].revenue += booking.totalAmount || 0;
        }
      }

      // Sport Breakdown
      const sportBreakdown = {};
      for (const booking of bookings) {
        const key = booking.sport || "unknown";
        if (!sportBreakdown[key]) {
          sportBreakdown[key] = { count: 0, revenue: 0 };
        }
        sportBreakdown[key].count++;
        if (booking.paymentStatus === "successful") {
          sportBreakdown[key].revenue += booking.totalAmount || 0;
        }
      }

      return {
        bookings,
        statistics: {
          totalBookings: bookings.length,
          totalRevenue,
          averageBookingValue,
          monthlyBreakdown,
          sportBreakdown,
        },
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: limit,
          hasMore: page < Math.ceil(total / limit),
        },
        filters: { sport },
      };

    } catch (error) {
      console.error("Error fetching past bookings:", error);
      throw CustomErrorHandler.serverError("Failed to fetch past bookings.");
    }
  },

  async combinedSearch(filters) {
    try {
      const { query, latitude, longitude, limit, radius } = filters

      // Search venues with smaller limit for combined results
      const venueResults = await this.searchVenues({
        query,
        latitude,
        longitude,
        page: 1,
        limit: Math.ceil(limit / 2),
        radius,
      });
      console.log(venueResults);

      // Search individuals with smaller limit for combined results
      const individualResults = await this.searchIndividuals({
        query,
        latitude,
        longitude,
        page: 1,
        limit: Math.ceil(limit / 2),
        radius,
      })

      // Combine and sort by search score
      const combinedResults = [
        ...venueResults.venues.map((v) => ({ ...v, type: "venue" })),
        ...individualResults.individuals.map((i) => ({ ...i, type: "individual" })),
      ].sort((a, b) => (b.searchScore || 0) - (a.searchScore || 0))

      return {
        venues: venueResults.venues,
        individuals: individualResults.individuals,
        combined: combinedResults,
        totalVenues: venueResults.pagination.totalItems,
        totalIndividuals: individualResults.pagination.totalItems,
        searchQuery: query,
        searchRadius: radius,
        userLocation: { latitude, longitude },
      }
    } catch (error) {
      console.log("Failed to perform combined search:", error)
      throw error
    }
  },

  async getIndividualProfile(individualId) {
    try {
      if (!individualId.match(/^[0-9a-fA-F]{24}$/)) {
        throw CustomErrorHandler.badRequest("Invalid individual ID format")
      }

      const individual = await Individual.findById(individualId).populate("userId", "name email").populate("packageRef")

      if (!individual) {
        throw CustomErrorHandler.notFound("Individual not found")
      }

      return individual
    } catch (error) {
      console.log("Failed to get individual profile:", error)
      throw error
    }
  },

  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371 // Radius of the Earth in kilometers
    const dLat = this.deg2rad(lat2 - lat1)
    const dLon = this.deg2rad(lon2 - lon1)
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    const distance = R * c // Distance in kilometers
    return distance
  },

  deg2rad(deg) {
    return deg * (Math.PI / 180)
  },
  async GetNearByVenue(data) {
    const { latitude, longitude, page } = data;
    const MAX_DISTANCE_METERS = 15 * 1000;
    const limit = 10;
    const skip = (page - 1) * limit
    const userLocation = {
      type: "Point",
      coordinates: [longitude, latitude]
    };

    //TODO:Need to remove these comment below
    // Find Venue with expired subscriptions within the defined radius
    const expiredGround = await Venue.find({
      "locationHistory.point": {
        $near: {
          $geometry: userLocation,
          $maxDistance: MAX_DISTANCE_METERS
        }
      },
      subscriptionExpiry: { $lt: new Date() },
      isSubscriptionPurchased: true
    }).select('_id');

    // Update the subscription status of expired shops
    if (expiredGround.length > 0) {
      const expiredGroundIds = expiredGround.map(Venue => Venue._id);
      await Venue.updateMany(
        { _id: { $in: expiredGroundIds } },
        { $set: { isSubscriptionPurchased: false } }
      );
    }
    console.log("The current location:", userLocation);
    const venue = await Venue.aggregate([
      {
        $geoNear: {
          near: userLocation,
          distanceField: "distance",
          spherical: true,
          maxDistance: MAX_DISTANCE_METERS
        }
      }
      ,
      {
        $addFields: {
          distanceInKm: { $divide: ["$distance", 1000] }
        }
      },
      {
        $match: {
          distanceInKm: { $lte: 15 },
          isSubscriptionPurchased: true
        }
      },
      {
        $lookup: {
          from: "packages",
          localField: "packageRef",
          foreignField: "_id",
          as: "packageRef"
        },
      },

      {
        $unwind: {
          path: "$packageRef",
          preserveNullAndEmptyArrays: true
        }
      },
    ]);
    return venue;
  },
  // Add this new method to ProviderServices
  async checkSlotConflicts({ venueId, sport, date, playableArea, selectedSlots }) {
    try {
      const venue = await Venue.findById(venueId)
      if (!venue) {
        throw CustomErrorHandler.notFound("Venue not found")
      }

      if (!venue.venue_sports.map((s) => s.toLowerCase()).includes(sport.toLowerCase())) {
        throw CustomErrorHandler.badRequest(`Venue does not support ${sport}`)
      }

      // Parse the date in yyyy-MM-dd format
      const queryDate = new Date(date + "T00:00:00.000Z")
      const startOfDay = new Date(queryDate)
      startOfDay.setUTCHours(0, 0, 0, 0)
      const endOfDay = new Date(queryDate)
      endOfDay.setUTCHours(23, 59, 59, 999)

      console.log(
        `Checking conflicts for venue: ${venueId}, sport: ${sport}, date: ${date}, playableArea: ${playableArea}`,
      )

      // Find existing bookings for the specific date, sport, and playable area
      const existingBookings = await Booking.find({
        venueId: venueId,
        sport: new RegExp(`^${sport}$`, "i"),
        bookingStatus: { $in: ["confirmed", "pending", "completed"] },
        "scheduledDates.date": { $gte: startOfDay, $lte: endOfDay },
      }).lean()

      console.log(`Found ${existingBookings.length} existing bookings for the date range`)

      const conflictingSlots = []
      const availableSlots = []

      // Check each selected slot for conflicts
      for (const selectedSlot of selectedSlots) {
        let hasConflict = false

        // Normalize selected slot times for robust comparison
        const normalizedSelectedStartTime = selectedSlot.startTime.trim().toUpperCase()
        const normalizedSelectedEndTime = selectedSlot.endTime.trim().toUpperCase()

        // Check against all existing bookings
        for (const booking of existingBookings) {
          for (const dateSlot of booking.scheduledDates) {
            const bookingDate = new Date(dateSlot.date)

            // Check if the booking date matches our query date
            // This comparison correctly handles MongoDB's $date objects
            if (bookingDate >= startOfDay && bookingDate <= endOfDay) {
              for (const timeSlot of dateSlot.timeSlots) {
                // Normalize booked slot times for robust comparison
                const normalizedBookingStartTime = timeSlot.startTime.trim().toUpperCase()
                const normalizedBookingEndTime = timeSlot.endTime.trim().toUpperCase()

                // Check if playable area matches and time slots overlap
                if (
                  timeSlot.playableArea === selectedSlot.playableArea &&
                  normalizedBookingStartTime === normalizedSelectedStartTime &&
                  normalizedBookingEndTime === normalizedSelectedEndTime
                ) {
                  hasConflict = true
                  conflictingSlots.push({
                    startTime: selectedSlot.startTime,
                    endTime: selectedSlot.endTime,
                    playableArea: selectedSlot.playableArea,
                    bookingId: booking._id,
                    conflictReason: "Slot already booked",
                  })
                  break // Found conflict for this selectedSlot, move to next selectedSlot
                }
              }
              if (hasConflict) break // Found conflict for this selectedSlot, move to next selectedSlot
            }
          }
          if (hasConflict) break // Found conflict for this selectedSlot, move to next selectedSlot
        }

        if (!hasConflict) {
          availableSlots.push(selectedSlot)
        }
      }

      console.log(`Conflict check results: ${conflictingSlots.length} conflicts, ${availableSlots.length} available`)

      return {
        hasConflicts: conflictingSlots.length > 0,
        conflictingSlots,
        availableSlots,
        totalChecked: selectedSlots.length,
        date,
        playableArea,
        sport,
      }
    } catch (error) {
      console.log("Failed to check slot conflicts:", error)
      throw error
    }
  },
  async getAvailableSlots({ venueId, sport, date, playableArea, userId }) {
    try {
      const venue = await Venue.findById(venueId)
      if (!venue) {
        throw CustomErrorHandler.notFound("Venue not found")
      }

      if (!venue.venue_sports.map((s) => s.toLowerCase()).includes(sport.toLowerCase())) {
        throw CustomErrorHandler.badRequest(`Venue does not support ${sport}`)
      }

      const requestedDate = DateTime.fromISO(date)
      const bookingDay = requestedDate.toFormat("cccc")
      const dayTiming = venue.venue_timeslots[bookingDay]

      if (!dayTiming || !dayTiming.isOpen) {
        return {
          availableSlots: [],
          bookedSlots: [],
          lockedSlots: [],
          totalSlots: 0,
          sport,
          date,
          playableArea,
          pricing: this.getSportPrice(venue, sport),
          message: `Venue is closed on ${bookingDay}`,
        }
      }

      // Generate all potential slots for the day
      const allSlots = this.generateTimeSlots(dayTiming.openTime, dayTiming.closeTime)

      // Apply time-based filtering for current date
      const currentDate = DateTime.now()
      const isToday = requestedDate.hasSame(currentDate, "day")
      let filteredSlots = allSlots

      if (isToday) {
        const currentTime = currentDate.toFormat("h:mm a")
        filteredSlots = allSlots.filter((slot) => {
          const slotStartTime = DateTime.fromFormat(slot.startTime, "h:mm a")
          const currentDateTime = DateTime.fromFormat(currentTime, "h:mm a")
          return slotStartTime >= currentDateTime
        })
      }

      const queryDate = new Date(date)
      const start = new Date(queryDate.setHours(0, 0, 0, 0))
      const end = new Date(queryDate.setHours(23, 59, 59, 999))

      // Get both confirmed bookings and locked slots
      const existingBookings = await Booking.find({
        venueId: venueId,
        sport: sport,
        $or: [
          { bookingStatus: { $in: ["confirmed", "pending", "completed"] } },
          // {
          //   isLocked: true,
          //   lockedUntil: { $gt: new Date() },
          //   isPaymentConfirm: false,
          // },
        ],
        "scheduledDates.date": { $gte: start, $lte: end },
      }).lean()

      // Extract booked and locked slots
      const bookedSlotsForPlayableArea = new Set()
      const lockedSlotsForPlayableArea = new Set()
      const userLockedSlots = new Set()

      existingBookings.forEach((booking) => {
        booking.scheduledDates.forEach((dateSlot) => {
          const slotDate = DateTime.fromJSDate(dateSlot.date)
          if (slotDate >= DateTime.fromJSDate(start) && slotDate <= DateTime.fromJSDate(end)) {
            dateSlot.timeSlots.forEach((slot) => {
              if (slot.playableArea === playableArea) {
                const slotKey = `${slot.startTime}-${slot.endTime}`

                if (booking.isLocked && !booking.isPaymentConfirm) {
                  lockedSlotsForPlayableArea.add(slotKey)
                  if (userId && booking.lockedBy?.toString() === userId) {
                    userLockedSlots.add(slotKey)
                  }
                } else {
                  bookedSlotsForPlayableArea.add(slotKey)
                }
              }
            })
          }
        })
      })

      // Filter available slots
      const availableSlots = filteredSlots
        .filter((slot) => {
          const slotKey = `${slot.startTime}-${slot.endTime}`
          const isBooked = bookedSlotsForPlayableArea.has(slotKey)
          // const isLockedByOther = lockedSlotsForPlayableArea.has(slotKey) && !userLockedSlots.has(slotKey)

          return !isBooked
        })
        .map((slot) => ({
          startTime: slot.startTime,
          endTime: slot.endTime,
          playableArea: playableArea,
          isLockedByUser: userLockedSlots.has(`${slot.startTime}-${slot.endTime}`),
        }))
      const response = {
        availableSlots,
        bookedSlots: Array.from(bookedSlotsForPlayableArea),
        lockedSlots: Array.from(lockedSlotsForPlayableArea),
        userLockedSlots: Array.from(userLockedSlots),
        totalSlots: allSlots.length,
        sport,
        date,
        playableArea,
        pricing: this.getSportPrice(venue, sport),
      }

      if (isToday) {
        response.message = `Showing slots from ${currentDate.toFormat("h:mm a")} onwards for today`
        response.currentTime = currentDate.toFormat("h:mm a")
        response.timeFilteringApplied = true
      }

      return response
    } catch (error) {
      console.log("Failed to get available slots:", error)
      throw error
    }
  },

  async checkSlotAvailabilityWithPlayableArea(venueId, sport, date, timeSlot) {
    const { startTime, endTime, playableArea } = timeSlot
    const normalizedDate = new Date(new Date(date).toISOString().split("T")[0])

    const booking = await Booking.findOne({
      venueId,
      sport,
      $or: [
        { bookingStatus: { $in: ["confirmed", "pending", "completed"] } },
        {
          isLocked: true,
          lockedUntil: { $gt: new Date() },
          isPaymentConfirm: false,
        },
      ],
      scheduledDates: {
        $elemMatch: {
          date: normalizedDate,
          timeSlots: {
            $elemMatch: {
              playableArea: playableArea,
              startTime: startTime,
              endTime: endTime,
            },
          },
        },
      },
    })

    return !booking
  },

  // async getBookedSlots(data) {
  //   try {
  //     const { venueId, sport, date, playableArea } = data;

  //     const isGroundExist = await Venue.findById(venueId);
  //     if (!isGroundExist) {
  //       throw CustomErrorHandler.notFound("Venue Not Found");
  //     }

  //     const queryDate = new Date(date);
  //     const startOfDay = new Date(queryDate);
  //     startOfDay.setHours(0, 0, 0, 0);
  //     const endOfDay = new Date(queryDate);
  //     endOfDay.setHours(23, 59, 59, 999);

  //     console.log(
  //       `Getting booked slots for venue: ${venueId}, sport: ${sport}, date: ${date}, playableArea: ${playableArea}`
  //     );

  //     const bookings = await Booking.find({
  //       venueId: venueId,
  //       sport: new RegExp(`^${sport}$`, "i"),
  //       bookingStatus: { $in: ["confirmed", "pending", "completed"] },
  //       "scheduledDates.date": { $gte: startOfDay, $lte: endOfDay },
  //     }).lean();

  //     console.log(`Found ${bookings.length} bookings for the date range`);

  //     const conflictingTimeSlots = [];

  //     bookings.forEach((booking) => {
  //       if (booking.scheduledDates && booking.scheduledDates.length) {
  //         booking.scheduledDates.forEach((dateEntry) => {
  //           const entryDate = new Date(dateEntry.date);
  //           if (
  //             entryDate >= startOfDay &&
  //             entryDate <= endOfDay &&
  //             Array.isArray(dateEntry.timeSlots)
  //           ) {
  //             dateEntry.timeSlots.forEach((slot) => {
  //               if (slot.playableArea === playableArea) {
  //                 conflictingTimeSlots.push({
  //                   startTime: slot.startTime,
  //                   endTime: slot.endTime,
  //                   playableArea: slot.playableArea,
  //                 });
  //               }
  //             });
  //           }
  //         });
  //       }
  //     });

  //     console.log(`Total conflicting time slots: ${conflictingTimeSlots.length}`);

  //     return [
  //       {
  //         date: new Date(date).toISOString(),
  //         endDate: null,
  //         isFullDay: false,
  //         timeSlots: conflictingTimeSlots,
  //       },
  //     ];
  //   } catch (error) {
  //     console.error("Failed to get booked slots:", error);
  //     throw error;
  //   }
  // },

  async getBookedSlots(data) {
    try {
      const { venueId, sport, date, playableArea } = data
      const isGroundExist = await Venue.findById(venueId)
      if (!isGroundExist) return CustomErrorHandler.notFound("Venue Not Found")

      const queryDate = new Date(date)
      const startOfDay = new Date(queryDate)
      startOfDay.setHours(0, 0, 0, 0)
      const endOfDay = new Date(queryDate)
      endOfDay.setHours(23, 59, 59, 999)


      const bookings = await Booking.find({
        venueId: venueId,
        sport: new RegExp(`^${sport}$`, "i"),
        bookingStatus: { $in: ["confirmed", "pending", "completed"] },
        "scheduledDates.date": { $gte: startOfDay, $lte: endOfDay },
      }).lean()

      // console.log(`Found ${bookings.length} bookings for the date range`)

      const bookedSlots = []

      bookings.forEach((booking) => {
        if (booking.scheduledDates && booking.scheduledDates.length) {
          booking.scheduledDates.forEach((dateEntry) => {
            const entryDate = new Date(dateEntry.date)
            if (entryDate >= startOfDay && entryDate <= endOfDay && dateEntry.timeSlots && dateEntry.timeSlots.length) {
              dateEntry.timeSlots.forEach((slot) => {
                if (slot.playableArea === playableArea) {
                  bookedSlots.push({
                    startTime: slot.startTime,
                    endTime: slot.endTime,
                    playableArea: slot.playableArea,
                    bookingId: booking._id,
                    userId: booking.userId,
                    status: booking.bookingStatus,
                  })
                  // console.log(`Added booked slot: ${slot.startTime}-${slot.endTime} for playable area ${playableArea}`)
                } else {
                  console.log(
                    `Skipped slot ${slot.startTime}-${slot.endTime} for different playable area ${slot.playableArea}`,
                  )
                }
              })
            }
          })
        }
      })

      // console.log(`Total booked slots for playable area ${playableArea}: ${bookedSlots.length}`)

      return bookedSlots;
    } catch (error) {
      console.log("Failed to get booked slots:", error)
      throw error
    }
  },

  //#region Previous to get SLots 
  // async checkMultipleSlots(data) {
  //   try {
  //     const { venueId, sport, date, playableArea } = data;

  //     // Validate venue
  //     const venue = await Venue.findById(venueId);
  //     if (!venue) {
  //       throw CustomErrorHandler.notFound("Venue not found");
  //     }

  //     if (!venue.venue_sports.includes(sport)) {
  //       throw CustomErrorHandler.badRequest(`Venue does not support ${sport}`);
  //     }

  //     const conflictingDateSlots = [];

  //     // Get all bookings for the venue and sport
  //     const existingBookings = await Booking.find({
  //       venueId: venueId,
  //       sport: sport,
  //       bookingStatus: { $in: ["confirmed", "pending"] },
  //     });

  //     for (const dateString of date) {
  //       const conflictingTimeSlots = [];
  //       const requestedDateStr = dateString.split('T')[0];
  //       for (const booking of existingBookings) {
  //         for (const scheduledDate of booking.scheduledDates) {
  //           const bookingDateStr = scheduledDate.date.toISOString().split('T')[0];
  //           if (bookingDateStr === requestedDateStr) {
  //             for (const timeSlot of scheduledDate.timeSlots) {
  //               if (timeSlot.playableArea === playableArea) {
  //                 conflictingTimeSlots.push({
  //                   startTime: timeSlot.startTime,
  //                   endTime: timeSlot.endTime,
  //                   playableArea: timeSlot.playableArea,
  //                 });
  //               }
  //             }
  //           }
  //         }
  //       }
  //       if (conflictingTimeSlots.length > 0) {
  //         conflictingDateSlots.push({
  //           date: requestedDateStr,
  //           endDate: null,
  //           isFullDay: false,
  //           timeSlots: conflictingTimeSlots,
  //         });
  //       }
  //     }
  //     return conflictingDateSlots;
  //   } catch (error) {
  //     console.error("Failed to get conflicting date slots:", error);
  //     throw error;
  //   }
  // },

  //#region new to get slots with avaialble slots
  // async checkMultipleSlots(data) {
  //   try {
  //     const { venueId, sport, date, playableArea } = data;

  //     // Validate venue
  //     const venue = await Venue.findById(venueId);
  //     if (!venue) {
  //       throw CustomErrorHandler.notFound("Venue not found");
  //     }

  //     if (!venue.venue_sports.includes(sport)) {
  //       throw CustomErrorHandler.badRequest(`Venue does not support ${sport}`);
  //     }

  //     const conflictingDateSlots = [];
  //     const availableSlotsByDate = [];

  //     // Get all bookings for the venue and sport
  //     const existingBookings = await Booking.find({
  //       venueId: venueId,
  //       sport: sport,
  //       bookingStatus: { $in: ["confirmed", "pending"] },
  //     });

  //     for (const dateString of date) {
  //       const requestedDate = DateTime.fromISO(dateString);
  //       const requestedDateStr = requestedDate.toISODate(); // YYYY-MM-DD format
  //       const dayName = requestedDate.toFormat("cccc");
  //       const dayTiming = venue.venue_timeslots[dayName];

  //       // Initialize time slots containers
  //       const conflictingTimeSlots = [];
  //       const bookedSlotsSet = new Set();

  //       // Handle unavailable days (venue closed)
  //       if (!dayTiming || !dayTiming.isOpen) {
  //         availableSlotsByDate.push({
  //           date: requestedDate.toISO(),
  //           endDate: null,
  //           isFullDay: false,
  //           timeSlots: [],
  //         });

  //         continue; // Skip to next date
  //       }

  //       // Generate all possible slots
  //       const allSlots = this.generateTimeSlots(dayTiming.openTime, dayTiming.closeTime);

  //       for (const booking of existingBookings) {
  //         for (const scheduledDate of booking.scheduledDates) {
  //           const bookingDateStr = scheduledDate.date.toISOString().split('T')[0];

  //           if (bookingDateStr === requestedDateStr) {
  //             for (const timeSlot of scheduledDate.timeSlots) {
  //               if (timeSlot.playableArea === playableArea) {
  //                 const slotKey = `${timeSlot.startTime}-${timeSlot.endTime}`;
  //                 bookedSlotsSet.add(slotKey);

  //                 conflictingTimeSlots.push({
  //                   startTime: timeSlot.startTime,
  //                   endTime: timeSlot.endTime,
  //                   playableArea: timeSlot.playableArea,
  //                 });
  //               }
  //             }
  //           }
  //         }
  //       }

  //       // Filter available slots
  //       const availableTimeSlots = allSlots
  //         .filter((slot) => !bookedSlotsSet.has(`${slot.startTime}-${slot.endTime}`))
  //         .map((slot) => ({
  //           startTime: slot.startTime,
  //           endTime: slot.endTime,
  //           playableArea: playableArea,
  //         }));

  //       // Push conflicting slots if found
  //       if (conflictingTimeSlots.length > 0) {
  //         conflictingDateSlots.push({
  //           date: requestedDateStr,
  //           endDate: null,
  //           isFullDay: false,
  //           timeSlots: conflictingTimeSlots,
  //         });
  //       }

  //       // Push available slots
  //       availableSlotsByDate.push({
  //         date: requestedDate.toISO(),
  //         endDate: null,
  //         isFullDay: false,
  //         timeSlots: availableTimeSlots,
  //       });
  //     }

  //     return {
  //       conflictingDateSlots,
  //       availableSlotsByDate,
  //     };
  //   } catch (error) {
  //     console.error("Failed to get conflicting and available slots:", error);
  //     throw error;
  //   }
  // },

  async checkMultipleSlots(data) {
    try {
      const { venueId, sport, date, playableArea } = data;

      const venue = await Venue.findById(venueId);
      if (!venue) {
        throw CustomErrorHandler.notFound("Venue not found");
      }

      if (!venue.venue_sports.map((s) => s.toLowerCase()).includes(sport.toLowerCase())) {
        throw CustomErrorHandler.badRequest(`Venue does not support ${sport}`);
      }

      const conflictingDateSlots = [];
      const availableSlotsByDate = [];

      // Fetch all existing bookings once for performance
      const existingBookings = await Booking.find({
        venueId,
        sport: new RegExp(`^${sport}$`, "i"),
        bookingStatus: { $in: ["confirmed", "pending", "completed"] },
      }).lean();

      for (const dateString of date) {
        const requestedDate = DateTime.fromISO(dateString);
        const requestedDateStr = requestedDate.toISODate();
        const dayName = requestedDate.toFormat("cccc");
        const dayTiming = venue.venue_timeslots[dayName];

        const bookedSlotsSet = new Set();
        const conflictingTimeSlots = [];

        // If venue is closed, just skip
        if (!dayTiming || !dayTiming.isOpen) {
          availableSlotsByDate.push({
            date: requestedDate.toISO(),
            endDate: null,
            isFullDay: false,
            timeSlots: [],
          });
          continue;
        }

        // Step 1: Generate all possible slots
        const allSlots = this.generateTimeSlots(dayTiming.openTime, dayTiming.closeTime);

        // Step 2: If the requested date is today, filter out past slots
        const currentDate = DateTime.now();
        let filteredSlots = allSlots;
        if (requestedDate.hasSame(currentDate, "day")) {
          const currentTime = currentDate.toFormat("h:mm a");
          filteredSlots = allSlots.filter((slot) => {
            const slotStartTime = DateTime.fromFormat(slot.startTime, "h:mm a");
            const currentSlotTime = DateTime.fromFormat(currentTime, "h:mm a");
            return slotStartTime >= currentSlotTime;
          });
        }

        // Step 3: Check for conflicts with existing bookings
        for (const booking of existingBookings) {
          for (const scheduledDate of booking.scheduledDates) {
            const bookingDateStr = new Date(scheduledDate.date).toISOString().split("T")[0];
            if (bookingDateStr === requestedDateStr) {
              for (const timeSlot of scheduledDate.timeSlots) {
                const slotKey = `${timeSlot.startTime}-${timeSlot.endTime}`;
                if (timeSlot.playableArea === playableArea) {
                  bookedSlotsSet.add(slotKey);
                  conflictingTimeSlots.push({
                    startTime: timeSlot.startTime,
                    endTime: timeSlot.endTime,
                    playableArea: timeSlot.playableArea,
                  });
                }
              }
            }
          }
        }

        // Step 4: Filter available slots
        const availableTimeSlots = filteredSlots
          .filter((slot) => !bookedSlotsSet.has(`${slot.startTime}-${slot.endTime}`))
          .map((slot) => ({
            startTime: slot.startTime,
            endTime: slot.endTime,
            playableArea,
          }));

        // Step 5: Push both booked and available slots
        if (conflictingTimeSlots.length > 0) {
          conflictingDateSlots.push({
            date: requestedDateStr,
            endDate: null,
            isFullDay: false,
            timeSlots: conflictingTimeSlots,
          });
        }

        availableSlotsByDate.push({
          date: requestedDate.toISODate(),
          endDate: null,
          isFullDay: false,
          timeSlots: availableTimeSlots,
        });
      }

      return {
        bookedSlots: conflictingDateSlots,
        availableSlots: availableSlotsByDate,
      };
    } catch (error) {
      console.error("Failed to get conflicting and available slots:", error);
      throw error;
    }
  },
  async checkSlotAvailabilityWithPlayableArea(venueId, sport, date, timeSlot) {
    const { startTime, endTime, playableArea } = timeSlot;
    const normalizedDate = new Date(new Date(date).toISOString().split('T')[0]);

    // console.log(
    //   `Checking availability for slot: ${startTime}-${endTime} on playable area ${playableArea}, date: ${normalizedDate.toISOString()}`
    // );

    const booking = await Booking.findOne({
      venueId,
      sport,
      bookingStatus: { $in: ["confirmed", "pending"] },
      scheduledDates: {
        $elemMatch: {
          date: normalizedDate,
          timeSlots: {
            $elemMatch: {
              playableArea: playableArea,
              startTime: startTime,
              endTime: endTime,
            },
          },
        },
      },
    });

    const isAvailable = !booking;
    // console.log(
    //   `Slot ${startTime}-${endTime} on playable area ${playableArea} is ${isAvailable ? "available" : "booked"}`
    // );

    return isAvailable;
  }
  ,
  async getGroundBookings(data) {
    try {
      const { venueId, startDate, endDate, sport, status, paymentStatus, page = 1, limit = 10 } = data

      const matchQuery = {
        venueId: venueId,
      }

      if (sport) {
        matchQuery.sport = new RegExp(`^${sport}$`, "i")
      }

      if (status) {
        matchQuery.bookingStatus = status
      }

      if (paymentStatus) {
        matchQuery.paymentStatus = paymentStatus
      }

      if (startDate || endDate) {
        const dateFilter = {}
        if (startDate) dateFilter.$gte = new Date(startDate)
        if (endDate) dateFilter.$lte = new Date(endDate)
        matchQuery["scheduledDates.date"] = dateFilter
      }

      const skip = (page - 1) * limit
      const total = await Booking.countDocuments(matchQuery)

      const bookings = await Booking.find(matchQuery)
        .populate({
          path: "venueId",
          populate: {
            path: "packageRef",
          },
        })
        // .populate("userId", "name email phone")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)

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
      console.error("Failed to get Venue bookings:", error)
      throw error
    }
  },
  async checkMultipleDateAvailability(data) {
    try {
      const { venueId, sport, startDate, endDate, timeSlots } = data

      if (!venueId.match(/^[0-9a-fA-F]{24}$/)) {
        throw CustomErrorHandler.badRequest("Invalid Venue ID format")
      }

      const venue = await Venue.findById(venueId)
      if (!venue) {
        throw CustomErrorHandler.notFound("Venue not found")
      }

      if (!venue.venue_sports.includes(sport)) {
        throw CustomErrorHandler.badRequest(`Venue does not support ${sport}`)
      }

      const availability = []
      const currentDate = DateTime.fromJSDate(new Date(startDate))
      const endDateTime = DateTime.fromJSDate(new Date(endDate))

      let date = currentDate
      while (date <= endDateTime) {
        const dayName = date.toFormat("cccc")
        const dayTiming = Venue.venue_timeslots[dayName]

        if (!dayTiming || !dayTiming.isOpen) {
          availability.push({
            date: date.toJSDate(),
            available: false,
            reason: "Venue closed",
          })
        } else {
          const dayAvailability = {
            date: date.toJSDate(),
            available: true,
            slots: [],
          }

          for (const slot of timeSlots) {
            const isAvailable = await this.checkGroundSlotAvailability(venueId, sport, date.toJSDate(), slot)
            dayAvailability.slots.push({
              ...slot,
              available: isAvailable,
            })

            if (!isAvailable) {
              dayAvailability.available = false
            }
          }

          availability.push(dayAvailability)
        }

        date = date.plus({ days: 1 })
      }

      return {
        availability,
        sport,
        totalDays: availability.length,
        fullyAvailableDays: availability.filter((day) => day.available).length,
      }
    } catch (error) {
      console.log("Failed to check multiple date availability:", error)
      throw error
    }
  },


  async getDashboardAnalytics(venueId) {
    try {
      const today = new Date()
      const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate())
      const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59)

      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59)

      // Today's bookings
      const todayBookings = await Booking.countDocuments({
        venueId: venueId,
        "scheduledDates.date": { $gte: startOfToday, $lte: endOfToday },
      })

      // Today's revenue
      const todayRevenueResult = await Booking.aggregate([
        {
          $match: {
            venueId: mongoose.Types.ObjectId(venueId),
            "scheduledDates.date": { $gte: startOfToday, $lte: endOfToday },
            paymentStatus: "successful",
          }
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: "$totalAmount" }
          }
        }
      ])

      const todayRevenue = todayRevenueResult.length > 0 ? todayRevenueResult[0].totalRevenue : 0

      // Monthly revenue
      const monthlyRevenueResult = await Booking.aggregate([
        {
          $match: {
            venueId: mongoose.Types.ObjectId(venueId),
            "scheduledDates.date": { $gte: startOfMonth, $lte: endOfMonth },
            paymentStatus: "successful",
          }
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: "$totalAmount" }
          }
        }
      ])

      const monthlyRevenue = monthlyRevenueResult.length > 0 ? monthlyRevenueResult[0].totalRevenue : 0

      // Booking status distribution
      const statusStats = await Booking.aggregate([
        { $match: { venueId: mongoose.Types.ObjectId(venueId) } },
        { $group: { _id: "$bookingStatus", count: { $sum: 1 } } }
      ])

      // Payment status distribution
      const paymentStats = await Booking.aggregate([
        { $match: { venueId: mongoose.Types.ObjectId(venueId) } },
        { $group: { _id: "$paymentStatus", count: { $sum: 1 } } }
      ])

      // Sport-wise bookings
      const sportStats = await Booking.aggregate([
        { $match: { venueId: mongoose.Types.ObjectId(venueId) } },
        { $group: { _id: "$sport", count: { $sum: 1 }, revenue: { $sum: "$totalAmount" } } }
      ])

      return {
        todayBookings,
        todayRevenue,
        monthlyRevenue,
        statusStats: statusStats.reduce((acc, stat) => {
          acc[stat._id] = stat.count
          return acc
        }, {}),
        paymentStats: paymentStats.reduce((acc, stat) => {
          acc[stat._id] = stat.count
          return acc
        }, {}),
        sportStats: sportStats.reduce((acc, stat) => {
          acc[stat._id] = { count: stat.count, revenue: stat.revenue }
          return acc
        }, {}),
      }
    } catch (error) {
      console.log("Failed to get dashboard analytics:", error)
      throw error
    }
  },

  async getRevenueAnalytics(venueId, period = "month") {
    try {
      if (!venueId.match(/^[0-9a-fA-F]{24}$/)) {
        throw CustomErrorHandler.badRequest("Invalid Venue ID format")
      }

      const today = new Date()
      let startDate, groupBy

      switch (period) {
        case "week":
          startDate = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
          groupBy = { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }
          break
        case "month":
          startDate = new Date(today.getFullYear(), today.getMonth(), 1)
          groupBy = { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }
          break
        case "quarter":
          startDate = new Date(today.getFullYear(), Math.floor(today.getMonth() / 3) * 3, 1)
          groupBy = { $dateToString: { format: "%Y-%m", date: "$createdAt" } }
          break
        case "year":
          startDate = new Date(today.getFullYear(), 0, 1)
          groupBy = { $dateToString: { format: "%Y-%m", date: "$createdAt" } }
          break
        default:
          startDate = new Date(today.getFullYear(), today.getMonth(), 1)
          groupBy = { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }
      }

      const revenueData = await Booking.aggregate([
        {
          $match: {
            venueId: mongoose.Types.ObjectId(venueId),
            createdAt: { $gte: startDate },
            paymentStatus: "successful",
          }
        },
        {
          $group: {
            _id: groupBy,
            revenue: { $sum: "$totalAmount" },
            bookings: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ])

      return {
        period,
        data: revenueData,
        totalRevenue: revenueData.reduce((sum, item) => sum + item.revenue, 0),
        totalBookings: revenueData.reduce((sum, item) => sum + item.bookings, 0),
      }
    } catch (error) {
      console.log("Failed to get revenue analytics:", error)
      throw error
    }
  },

  async getSportsAnalytics(venueId) {
    try {
      if (!venueId.match(/^[0-9a-fA-F]{24}$/)) {
        throw CustomErrorHandler.badRequest("Invalid Venue ID format")
      }

      const sportAnalytics = await Booking.aggregate([
        { $match: { venueId: mongoose.Types.ObjectId(venueId) } },
        {
          $group: {
            _id: "$sport",
            totalBookings: { $sum: 1 },
            totalRevenue: { $sum: "$totalAmount" },
            avgBookingValue: { $avg: "$totalAmount" },
            confirmedBookings: {
              $sum: { $cond: [{ $eq: ["$bookingStatus", "confirmed"] }, 1, 0] }
            },
            cancelledBookings: {
              $sum: { $cond: [{ $eq: ["$bookingStatus", "cancelled"] }, 1, 0] }
            },
          }
        },
        { $sort: { totalRevenue: -1 } }
      ])

      return {
        sports: sportAnalytics,
        totalSports: sportAnalytics.length,
      }
    } catch (error) {
      console.log("Failed to get sports analytics:", error)
      throw error
    }
  },



  async createIndividual(data) {
    try {
      const userInfo = global.user
      const packageInfo = await Package.findById(data.packageRef)
      if (!packageInfo) throw CustomErrorHandler.notFound("Package not found")

      const user = await User.findById(userInfo.userId)
      if (!user) throw CustomErrorHandler.notFound("User not found")
      const processedEducation = (data.education || []).map((edu) => ({
        degree: edu.degree,
        field: edu.field,
        institution: edu.institution,
        startDate: edu.startDate,
        endDate: edu.endDate || null,
        isCurrently: edu.isCurrently || false,
      }))
      const processedExperience = (data.experience || []).map((exp) => ({
        title: exp.title,
        organization: exp.organization,
        startDate: exp.startDate,
        endDate: exp.endDate || null,
        isCurrently: exp.isCurrently || false,
        description: exp.description || "",
      }))

      const processedCertificates = (data.certificates || []).map((cert) => ({
        name: cert.name,
        issuedBy: cert.issuedBy,
        issueDate: cert.issueDate,
      }))
      let serviceImages = [];
      let profileImages = '';
      if (Array.isArray(data.serviceImageUrls) && data.serviceImageUrls.length > 0) {
        for (const image of data.serviceImageUrls) {
          try {
            const uploadedUrl = await ImageUploader.Upload(image, "IndividualServiceImage");

            if (!uploadedUrl) {
              throw new Error("Image upload failed or returned empty URL.");
            }

            serviceImages.push(uploadedUrl);
          } catch (uploadError) {
            console.error(`Image upload failed:${uploadError}`);
            throw CustomErrorHandler.serverError("Failed to upload one or more venue images.");
          }
        }
      } else {
        throw CustomErrorHandler.badRequest("Shop images are required.");
      }
      if (data.profileImageUrl && data.profileImageUrl != null) {
        try {
          const uploadedUrl = await ImageUploader.Upload(data.profileImageUrl, "IndividualProfileImage");
          if (!uploadedUrl) {
            throw new Error("Image upload failed or returned empty URL.");
          }
          profileImages = uploadedUrl;
        } catch (error) {
          console.error(`Image upload failed:${error}`);
          throw CustomErrorHandler.serverError("Failed to upload one or more Individual images.");
        }
      }
      const individual = new Individual({
        profileImageUrl: profileImages,
        fullName: data.fullName,
        bio: data.bio,
        phoneNumber: data.phoneNumber,
        email: data.email,
        panNumber: data.panNumber,
        yearOfExperience: data.yearOfExperience,
        sportsCategories: data.sportsCategories,
        selectedServiceTypes: data.selectedServiceTypes,
        serviceImageUrls: serviceImages,
        serviceOptions: data.serviceOptions,
        availableDays: data.availableDays,
        supportedAgeGroups: data.supportedAgeGroups,
        education: processedEducation,
        experience: processedExperience,
        certificates: processedCertificates,
        userId: userInfo.userId,
        locationHistory: {
          point: {
            type: "Point",
            coordinates: [Number.parseFloat(data.longitude), Number.parseFloat(data.latitude)],
            selectLocation: data.selectLocation,
          },
        },
        hasActiveSubscription: true,
        packageRef: data.packageRef,
        subscriptionExpiry: DateTime.now().plus({ days: packageInfo.duration }).toJSDate(),
      })

      await individual.save()
      return individual;
    } catch (error) {
      console.log("Failed to create individual:", error)
      throw error
    }
  },
  async editIndividualService(data) {
    try {
      const { serviceId, ...fieldsToUpdate } = data
      const userInfo = global.user
      const user = await User.findById(userInfo.userId)
      if (!user) throw CustomErrorHandler.notFound("User not found")

      // Process education data
      if (fieldsToUpdate.education) {
        fieldsToUpdate.education = fieldsToUpdate.education.map((edu) => ({
          degree: edu.degree,
          field: edu.field,
          institution: edu.institution,
          startDate: edu.startDate,
          endDate: edu.endDate || null,
          isCurrently: edu.isCurrently || false,
        }))
      }

      // Process experience data
      if (fieldsToUpdate.experience) {
        fieldsToUpdate.experience = fieldsToUpdate.experience.map((exp) => ({
          title: exp.title,
          organization: exp.organization,
          startDate: exp.startDate,
          endDate: exp.endDate || null,
          isCurrently: exp.isCurrently || false,
          description: exp.description || "",
        }))
      }

      // Process certificates data
      if (fieldsToUpdate.certificates) {
        fieldsToUpdate.certificates = fieldsToUpdate.certificates.map((cert) => ({
          name: cert.name,
          issuedBy: cert.issuedBy,
          issueDate: cert.issueDate,
        }))
      }

      // Handle service images
      if (fieldsToUpdate.serviceImageUrls && Array.isArray(fieldsToUpdate.serviceImageUrls)) {
        const processedImages = []
        for (const img of fieldsToUpdate.serviceImageUrls) {
          if (isBase64Image(img)) {
            const uploadedUrl = await ImageUploader.Upload(img, "IndividualServiceImage")
            processedImages.push(uploadedUrl)
          } else {
            processedImages.push(img)
          }
        }
        fieldsToUpdate.serviceImageUrls = processedImages
      }

      // Handle profile image
      if (fieldsToUpdate.profileImageUrl && isBase64Image(fieldsToUpdate.profileImageUrl)) {
        try {
          const uploadedUrl = await ImageUploader.Upload(fieldsToUpdate.profileImageUrl, "IndividualProfileImage")
          if (!uploadedUrl) {
            throw new Error("Profile image upload failed or returned empty URL.")
          }
          fieldsToUpdate.profileImageUrl = uploadedUrl
        } catch (error) {
          console.error(`Profile image upload failed: ${error}`)
          throw CustomErrorHandler.serverError("Failed to upload profile image.")
        }
      }

      // Update location history if coordinates are provided
      if (fieldsToUpdate.longitude && fieldsToUpdate.latitude) {
        fieldsToUpdate.locationHistory = {
          point: {
            type: "Point",
            coordinates: [Number.parseFloat(fieldsToUpdate.longitude), Number.parseFloat(fieldsToUpdate.latitude)],
            selectLocation: fieldsToUpdate.selectLocation,
          },
        }

        // Remove individual coordinate fields as they're now in locationHistory
        delete fieldsToUpdate.longitude
        delete fieldsToUpdate.latitude
        delete fieldsToUpdate.selectLocation
      }

      await Individual.findByIdAndUpdate(serviceId, { $set: fieldsToUpdate }, { new: true })

      const individual = await Individual.findById(serviceId, {
        updatedAt: 0,
        createdAt: 0,
        __v: 0,
      })

      return individual
    } catch (error) {
      console.log("Failed to update individual service:", error)
      throw error
    }
  },

  async getAllIndividuals(filters) {
    try {
      const { page, limit, search, sportsCategory, location, radius } = filters
      const query = { isActive: true, hasActiveSubscription: true }

      if (search) {
        query.$or = [{ fullName: { $regex: search, $options: "i" } }, { bio: { $regex: search, $options: "i" } }]
      }

      if (sportsCategory) {
        query.sportsCategories = { $in: [sportsCategory] }
      }

      if (location && location.coordinates) {
        query["location.coordinates"] = {
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
        .populate("packageRef")
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
      console.log("Failed to get all individuals:", error)
      throw error
    }
  },

  async getIndividualById(data) {
    try {
      if (!data.id.match(/^[0-9a-fA-F]{24}$/)) {
        throw CustomErrorHandler.badRequest("Invalid individual ID format")
      }

      const individual = await Individual.findById(data.id).populate("packageRef")

      if (!individual) {
        throw CustomErrorHandler.notFound("Individual not found")
      }

      return individual
    } catch (error) {
      console.log("Failed to get individual by id:", error)
      throw error
    }
  },

  async getUserIndividualRegisteredGround() {
    try {
      const userInfo = global.user
      const user = await User.findById(userInfo.userId)
      if (!user) throw CustomErrorHandler.notFound("User not found")

      const individuals = await Individual.find({
        userId: userInfo.userId,
      }).populate("packageRef")

      return individuals
    } catch (error) {
      console.log("Failed to get user individuals:", error)
      throw error
    }
  },


  async bookIndividual(bookingData, userId) {
    try {
      const { individualId, serviceType, bookingDate, timeSlot, duration, paymentMethod, specialRequests, teamSize } =
        bookingData

      if (!individualId.match(/^[0-9a-fA-F]{24}$/)) {
        throw CustomErrorHandler.badRequest("Invalid individual ID format")
      }

      const individual = await Individual.findById(individualId)
      if (!individual) {
        throw CustomErrorHandler.notFound("Individual not found")
      }

      // Check if individual provides the requested service type
      if (serviceType === "one_on_one" && !individual.serviceOptions.providesOneOnOne) {
        throw CustomErrorHandler.badRequest("Individual does not provide one-on-one service")
      }
      if (serviceType === "team_service" && !individual.serviceOptions.providesTeamService) {
        throw CustomErrorHandler.badRequest("Individual does not provide team service")
      }
      if (serviceType === "online_service" && !individual.serviceOptions.providesOnlineService) {
        throw CustomErrorHandler.badRequest("Individual does not provide online service")
      }

      // Check availability
      const bookingDay = DateTime.fromJSDate(new Date(bookingDate)).toFormat("cccc")
      const dayAvailability = individual.availability[bookingDay]

      if (!dayAvailability || !dayAvailability.isAvailable) {
        throw CustomErrorHandler.badRequest("Individual is not available on this day")
      }

      const isAvailable = await this.checkIndividualSlotAvailability(individualId, bookingDate, timeSlot)
      if (!isAvailable) {
        throw CustomErrorHandler.badRequest("Time slot is not available")
      }

      const totalAmount = duration * individual.hourlyRate

      const booking = new Booking({
        bookingType: "individual",
        serviceId: individualId,
        userId,
        serviceType,
        bookingDate: new Date(bookingDate),
        timeSlot,
        duration,
        totalAmount,
        paymentMethod,
        specialRequests,
        teamSize,
      })

      await booking.save()

      return await booking.populate("serviceId userId")
    } catch (error) {
      console.log("Failed to book individual:", error)
      throw error
    }
  },

  async getIndividualAvailableSlots(individualId, date) {
    try {
      if (!individualId.match(/^[0-9a-fA-F]{24}$/)) {
        throw CustomErrorHandler.badRequest("Invalid individual ID format")
      }

      const individual = await Individual.findById(individualId)
      if (!individual) {
        throw CustomErrorHandler.notFound("Individual not found")
      }

      const bookingDay = DateTime.fromJSDate(new Date(date)).toFormat("cccc")
      const dayAvailability = individual.availability[bookingDay]

      if (!dayAvailability || !dayAvailability.isAvailable) {
        return {
          availableSlots: [],
          bookedSlots: [],
          totalSlots: 0,
          date,
          pricing: individual.hourlyRate,
          message: "Individual is not available on this day",
        }
      }

      const allSlots = this.generateTimeSlots(dayAvailability.startTime, dayAvailability.endTime)

      const existingBookings = await Booking.find({
        serviceId: individualId,
        bookingDate: new Date(date),
        bookingStatus: { $in: ["confirmed", "pending"] },
      })

      const bookedSlots = new Set()
      existingBookings.forEach((booking) => {
        if (booking.timeSlot) {
          bookedSlots.add(`${booking.timeSlot.startTime}-${booking.timeSlot.endTime}`)
        }
      })

      const availableSlots = allSlots.filter((slot) => !bookedSlots.has(`${slot.startTime}-${slot.endTime}`))

      return {
        availableSlots,
        bookedSlots: Array.from(bookedSlots),
        totalSlots: allSlots.length,
        date,
        pricing: individual.hourlyRate,
      }
    } catch (error) {
      console.log("Failed to get individual available slots:", error)
      throw error
    }
  },

  async getIndividualBookings(filters) {
    try {
      const { individualId, startDate, endDate, status, page, limit } = filters

      if (!individualId.match(/^[0-9a-fA-F]{24}$/)) {
        throw CustomErrorHandler.badRequest("Invalid individual ID format")
      }

      const query = { serviceId: individualId, bookingType: "individual" }

      if (status) query.bookingStatus = status

      if (startDate || endDate) {
        query.bookingDate = {}
        if (startDate) query.bookingDate.$gte = new Date(startDate)
        if (endDate) query.bookingDate.$lte = new Date(endDate)
      }

      const skip = (page - 1) * limit
      const bookings = await Booking.find(query)
        .populate("userId", "name email phone")
        .populate("serviceId", "fullName phoneNumber")
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
      console.log("Failed to get individual bookings:", error)
      throw error
    }
  },


  async getUserBookings(data) {
    try {
      const { page = 1 } = data;
      const userInfo = global.user;
      const limit = 10
      const skip = (page - 1) * limit;


      //       const query = {
      //  userId: userInfo.userId
      //       };
      // if (status) {
      //   query.bookingStatus = status;
      // }

      const bookings = await Booking.find({
        userId: userInfo.userId,
        paymentStatus: "successful",
        bookingStatus: "confirmed"
      })
        .populate({
          path: "venueId",
          populate: {
            path: "packageRef",
          }
        })
        .populate('userId')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 });

      return bookings;
    } catch (error) {
      console.error("Failed to get user bookings:", error);
      throw error;
    }
  },

  async cancelBooking(bookingId, cancellationReason, userId) {
    try {
      if (!bookingId.match(/^[0-9a-fA-F]{24}$/)) {
        throw CustomErrorHandler.badRequest("Invalid booking ID format")
      }

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

      booking.bookingStatus = "cancelled"
      booking.cancellationReason = cancellationReason
      await booking.save()

      return booking
    } catch (error) {
      console.log("Failed to cancel booking:", error)
      throw error
    }
  },
  async checkGroundSlotAvailability(venueId, sport, date, timeSlot) {
    const { startTime, endTime } = timeSlot;
    const booking = await Booking.findOne({
      venueId,
      sport,
      bookingDate: new Date(date),
      bookingStatus: { $in: ["confirmed"] },
      scheduledDates: {
        $elemMatch: {
          date: new Date(date),
          timeSlots: {
            $elemMatch: {
              startTime: { $lt: endTime },
              endTime: { $gt: startTime }
            }
          }
        }
      }
    });

    return !booking;
  },
  async checkFullDaySlotAvailability(venueId, sport, date) {
    const booking = await Booking.findOne({
      venueId,
      sport,
      bookingDate: new Date(date),
      bookingStatus: { $in: ["confirmed"] },
      scheduledDates: {
        $elemMatch: {
          date: new Date(date),
          timeSlots: { $exists: true, $not: { $size: 0 } }
        }
      }
    });

    return !booking;
  },

  async checkIndividualSlotAvailability(individualId, date, timeSlot) {
    const booking = await Booking.findOne({
      serviceId: individualId,
      bookingDate: new Date(date),
      "timeSlot.startTime": timeSlot.startTime,
      "timeSlot.endTime": timeSlot.endTime,
      bookingStatus: { $in: ["confirmed", "pending"] },
    })

    return !booking
  },

  generateTimeSlots(openTime, closeTime) {
    const slots = []
    const start = DateTime.fromFormat(openTime, "h:mm a")
    const end = DateTime.fromFormat(closeTime, "h:mm a")

    let current = start
    while (current < end) {
      const slotEnd = current.plus({ hours: 1 })
      if (slotEnd <= end) {
        slots.push({
          startTime: current.toFormat("h:mm a"),
          endTime: slotEnd.toFormat("h:mm a"),
        })
      }
      current = slotEnd
    }

    return slots
  },

  calculateDuration(startTime, endTime) {
    let start = DateTime.fromFormat(startTime, "h:mm a")
    let end = DateTime.fromFormat(endTime, "h:mm a")

    // fallback if first parse fails
    if (!start.isValid) start = DateTime.fromFormat(startTime, "hh:mm a")
    if (!end.isValid) end = DateTime.fromFormat(endTime, "hh:mm a")

    if (!start.isValid || !end.isValid) {
      throw new Error(`Invalid time format: ${startTime} - ${endTime}`)
    }

    return end.diff(start, "hours").hours
  },

  getSportPrice(Venue, sport) {
    const sportPricing = Venue.sportPricing.find((sp) => sp.sport === sport)
    return sportPricing ? sportPricing.perHourCharge : Venue.perHourCharge
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

  //#region  New Changes API
  async getDashboardAnalytics({ venueId, sport, period = "month", startDate, endDate }) {
    try {

      const venue = await Venue.findById(venueId)
      if (!venue) {
        throw CustomErrorHandler.notFound("Venue not found")
      }

      const dateRange = this.getDateRange(period, startDate, endDate)
      const matchQuery = {
        venueId: mongoose.Types.ObjectId(venueId),
        createdAt: { $gte: dateRange.start, $lte: dateRange.end },
      }

      if (sport && sport !== 'all') {
        matchQuery.sport = new RegExp(`^${sport}$`, "i")
      }

      // Key Performance Indicators
      const [
        totalBookings,
        totalRevenue,
        avgBookingValue,
        bookingTrends,
        revenueByStatus,
        topTimeSlots,
        sportPerformance
      ] = await Promise.all([
        // Total bookings
        Booking.countDocuments(matchQuery),

        // Total revenue
        Booking.aggregate([
          { $match: { ...matchQuery, paymentStatus: "successful" } },
          { $group: { _id: null, total: { $sum: "$totalAmount" } } }
        ]).then(result => result[0]?.total || 0),

        // Average booking value
        Booking.aggregate([
          { $match: matchQuery },
          { $group: { _id: null, avg: { $avg: "$totalAmount" } } }
        ]).then(result => result[0]?.avg || 0),

        // Booking trends (daily for last 30 days)
        Booking.aggregate([
          { $match: matchQuery },
          {
            $group: {
              _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
              bookings: { $sum: 1 },
              revenue: { $sum: { $cond: [{ $eq: ["$paymentStatus", "successful"] }, "$totalAmount", 0] } }
            }
          },
          { $sort: { _id: 1 } }
        ]),

        // Revenue by payment status
        Booking.aggregate([
          { $match: matchQuery },
          {
            $group: {
              _id: "$paymentStatus",
              count: { $sum: 1 },
              amount: { $sum: "$totalAmount" }
            }
          }
        ]),

        // Top time slots
        this.getPopularTimeSlots(venueId, sport, dateRange),

        // Sport performance
        Booking.aggregate([
          { $match: { venueId: mongoose.Types.ObjectId(venueId), createdAt: { $gte: dateRange.start, $lte: dateRange.end } } },
          {
            $group: {
              _id: "$sport",
              bookings: { $sum: 1 },
              revenue: { $sum: { $cond: [{ $eq: ["$paymentStatus", "successful"] }, "$totalAmount", 0] } },
              avgValue: { $avg: "$totalAmount" }
            }
          },
          { $sort: { revenue: -1 } }
        ])
      ])

      // Calculate growth rates
      const previousPeriod = this.getPreviousDateRange(period, dateRange)
      const previousStats = await Promise.all([
        Booking.countDocuments({
          venueId: mongoose.Types.ObjectId(venueId),
          createdAt: { $gte: previousPeriod.start, $lte: previousPeriod.end },
          ...(sport && sport !== 'all' ? { sport: new RegExp(`^${sport}$`, "i") } : {})
        }),
        Booking.aggregate([
          {
            $match: {
              venueId: mongoose.Types.ObjectId(venueId),
              createdAt: { $gte: previousPeriod.start, $lte: previousPeriod.end },
              paymentStatus: "successful",
              ...(sport && sport !== 'all' ? { sport: new RegExp(`^${sport}$`, "i") } : {})
            }
          },
          { $group: { _id: null, total: { $sum: "$totalAmount" } } }
        ]).then(result => result[0]?.total || 0)
      ])

      const bookingGrowth = previousStats[0] > 0 ? ((totalBookings - previousStats[0]) / previousStats[0]) * 100 : 0
      const revenueGrowth = previousStats[1] > 0 ? ((totalRevenue - previousStats[1]) / previousStats[1]) * 100 : 0

      return {
        overview: {
          totalBookings,
          totalRevenue,
          avgBookingValue: Math.round(avgBookingValue),
          bookingGrowth: Math.round(bookingGrowth * 100) / 100,
          revenueGrowth: Math.round(revenueGrowth * 100) / 100,
        },
        trends: {
          bookingTrends,
          revenueByStatus,
        },
        insights: {
          topTimeSlots,
          sportPerformance,
        },
        period,
        dateRange: {
          start: dateRange.start,
          end: dateRange.end,
        },
        filters: {
          sport: sport || 'all',
        }
      }
    } catch (error) {
      console.log("Failed to get dashboard analytics:", error)
      throw error
    }
  },

  async getRevenueAnalytics({ venueId, period = "month", sport, comparison = false }) {
    try {
      if (!venueId.match(/^[0-9a-fA-F]{24}$/)) {
        throw CustomErrorHandler.badRequest("Invalid Venue ID format")
      }

      const dateRange = this.getDateRange(period)
      const matchQuery = {
        venueId: mongoose.Types.ObjectId(venueId),
        createdAt: { $gte: dateRange.start, $lte: dateRange.end },
        paymentStatus: "successful"
      }

      if (sport && sport !== 'all') {
        matchQuery.sport = new RegExp(`^${sport}$`, "i")
      }

      let groupBy
      switch (period) {
        case "week":
          groupBy = { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }
          break
        case "month":
          groupBy = { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }
          break
        case "quarter":
        case "year":
          groupBy = { $dateToString: { format: "%Y-%m", date: "$createdAt" } }
          break
        default:
          groupBy = { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }
      }

      const revenueData = await Booking.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: groupBy,
            revenue: { $sum: "$totalAmount" },
            bookings: { $sum: 1 },
            avgBookingValue: { $avg: "$totalAmount" }
          }
        },
        { $sort: { _id: 1 } }
      ])

      // Revenue by sport breakdown
      const sportRevenue = await Booking.aggregate([
        {
          $match: {
            venueId: mongoose.Types.ObjectId(venueId),
            createdAt: { $gte: dateRange.start, $lte: dateRange.end },
            paymentStatus: "successful"
          }
        },
        {
          $group: {
            _id: "$sport",
            revenue: { $sum: "$totalAmount" },
            bookings: { $sum: 1 },
            percentage: { $sum: "$totalAmount" }
          }
        },
        { $sort: { revenue: -1 } }
      ])

      // Calculate total for percentages
      const totalRevenue = sportRevenue.reduce((sum, item) => sum + item.revenue, 0)
      sportRevenue.forEach(item => {
        item.percentage = totalRevenue > 0 ? (item.revenue / totalRevenue) * 100 : 0
      })

      let comparisonData = null
      if (comparison) {
        const previousPeriod = this.getPreviousDateRange(period, dateRange)
        comparisonData = await Booking.aggregate([
          {
            $match: {
              venueId: mongoose.Types.ObjectId(venueId),
              createdAt: { $gte: previousPeriod.start, $lte: previousPeriod.end },
              paymentStatus: "successful",
              ...(sport && sport !== 'all' ? { sport: new RegExp(`^${sport}$`, "i") } : {})
            }
          },
          {
            $group: {
              _id: groupBy,
              revenue: { $sum: "$totalAmount" },
              bookings: { $sum: 1 }
            }
          },
          { $sort: { _id: 1 } }
        ])
      }

      return {
        period,
        data: revenueData,
        sportBreakdown: sportRevenue,
        comparison: comparisonData,
        summary: {
          totalRevenue: revenueData.reduce((sum, item) => sum + item.revenue, 0),
          totalBookings: revenueData.reduce((sum, item) => sum + item.bookings, 0),
          avgBookingValue: revenueData.length > 0
            ? revenueData.reduce((sum, item) => sum + item.avgBookingValue, 0) / revenueData.length
            : 0,
          peakRevenueDay: revenueData.reduce((max, item) => item.revenue > max.revenue ? item : max, { revenue: 0 })
        }
      }
    } catch (error) {
      console.log("Failed to get revenue analytics:", error)
      throw error
    }
  },

  async getSportsAnalytics({ venueId, period = "month" }) {
    try {
      if (!venueId.match(/^[0-9a-fA-F]{24}$/)) {
        throw CustomErrorHandler.badRequest("Invalid Venue ID format")
      }

      const dateRange = this.getDateRange(period)

      const sportsData = await Booking.aggregate([
        {
          $match: {
            venueId: mongoose.Types.ObjectId(venueId),
            createdAt: { $gte: dateRange.start, $lte: dateRange.end }
          }
        },
        {
          $group: {
            _id: "$sport",
            totalBookings: { $sum: 1 },
            totalRevenue: { $sum: { $cond: [{ $eq: ["$paymentStatus", "successful"] }, "$totalAmount", 0] } },
            avgBookingValue: { $avg: "$totalAmount" },
            confirmedBookings: { $sum: { $cond: [{ $eq: ["$bookingStatus", "confirmed"] }, 1, 0] } },
            cancelledBookings: { $sum: { $cond: [{ $eq: ["$bookingStatus", "cancelled"] }, 1, 0] } },
            pendingBookings: { $sum: { $cond: [{ $eq: ["$bookingStatus", "pending"] }, 1, 0] } },
            completedBookings: { $sum: { $cond: [{ $eq: ["$bookingStatus", "completed"] }, 1, 0] } },
          }
        },
        { $sort: { totalRevenue: -1 } }
      ])

      // Calculate performance metrics
      const totalBookings = sportsData.reduce((sum, sport) => sum + sport.totalBookings, 0)
      const totalRevenue = sportsData.reduce((sum, sport) => sum + sport.totalRevenue, 0)

      const enhancedSportsData = sportsData.map(sport => ({
        ...sport,
        bookingShare: totalBookings > 0 ? (sport.totalBookings / totalBookings) * 100 : 0,
        revenueShare: totalRevenue > 0 ? (sport.totalRevenue / totalRevenue) * 100 : 0,
        conversionRate: sport.totalBookings > 0 ? (sport.confirmedBookings / sport.totalBookings) * 100 : 0,
        cancellationRate: sport.totalBookings > 0 ? (sport.cancelledBookings / sport.totalBookings) * 100 : 0,
      }))

      // Sport trends over time
      const sportTrends = await Booking.aggregate([
        {
          $match: {
            venueId: mongoose.Types.ObjectId(venueId),
            createdAt: { $gte: dateRange.start, $lte: dateRange.end }
          }
        },
        {
          $group: {
            _id: {
              sport: "$sport",
              date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }
            },
            bookings: { $sum: 1 },
            revenue: { $sum: { $cond: [{ $eq: ["$paymentStatus", "successful"] }, "$totalAmount", 0] } }
          }
        },
        { $sort: { "_id.date": 1, "_id.sport": 1 } }
      ])

      return {
        sports: enhancedSportsData,
        trends: sportTrends,
        summary: {
          totalSports: sportsData.length,
          mostPopularSport: sportsData[0]?._id || null,
          highestRevenueSport: sportsData.reduce((max, sport) =>
            sport.totalRevenue > max.totalRevenue ? sport : max, { totalRevenue: 0 }
          ),
          avgBookingsPerSport: sportsData.length > 0 ? totalBookings / sportsData.length : 0,
        },
        period,
        dateRange
      }
    } catch (error) {
      console.log("Failed to get sports analytics:", error)
      throw error
    }
  },

  async getTimeSlotAnalytics({ venueId, sport, period = "month" }) {
    try {
      if (!venueId.match(/^[0-9a-fA-F]{24}$/)) {
        throw CustomErrorHandler.badRequest("Invalid Venue ID format")
      }

      const dateRange = this.getDateRange(period)
      const matchQuery = {
        venueId: mongoose.Types.ObjectId(venueId),
        createdAt: { $gte: dateRange.start, $lte: dateRange.end }
      }

      if (sport && sport !== 'all') {
        matchQuery.sport = new RegExp(`^${sport}$`, "i")
      }

      // Get time slot popularity
      const timeSlotData = await Booking.aggregate([
        { $match: matchQuery },
        { $unwind: "$scheduledDates" },
        { $unwind: "$scheduledDates.timeSlots" },
        {
          $group: {
            _id: {
              startTime: "$scheduledDates.timeSlots.startTime",
              endTime: "$scheduledDates.timeSlots.endTime"
            },
            bookings: { $sum: 1 },
            revenue: { $sum: { $cond: [{ $eq: ["$paymentStatus", "successful"] }, "$totalAmount", 0] } },
            sports: { $addToSet: "$sport" }
          }
        },
        {
          $project: {
            timeSlot: { $concat: ["$_id.startTime", " - ", "$_id.endTime"] },
            bookings: 1,
            revenue: 1,
            sports: 1,
            avgRevenuePerBooking: { $divide: ["$revenue", "$bookings"] }
          }
        },
        { $sort: { bookings: -1 } }
      ])

      // Peak hours analysis
      const hourlyData = await Booking.aggregate([
        { $match: matchQuery },
        { $unwind: "$scheduledDates" },
        { $unwind: "$scheduledDates.timeSlots" },
        {
          $addFields: {
            hour: {
              $toInt: {
                $substr: ["$scheduledDates.timeSlots.startTime", 0, 2]
              }
            }
          }
        },
        {
          $group: {
            _id: "$hour",
            bookings: { $sum: 1 },
            revenue: { $sum: { $cond: [{ $eq: ["$paymentStatus", "successful"] }, "$totalAmount", 0] } }
          }
        },
        { $sort: { _id: 1 } }
      ])

      // Day of week analysis
      const dayOfWeekData = await Booking.aggregate([
        { $match: matchQuery },
        { $unwind: "$scheduledDates" },
        {
          $group: {
            _id: { $dayOfWeek: "$scheduledDates.date" },
            bookings: { $sum: 1 },
            revenue: { $sum: { $cond: [{ $eq: ["$paymentStatus", "successful"] }, "$totalAmount", 0] } }
          }
        },
        {
          $project: {
            dayName: {
              $switch: {
                branches: [
                  { case: { $eq: ["$_id", 1] }, then: "Sunday" },
                  { case: { $eq: ["$_id", 2] }, then: "Monday" },
                  { case: { $eq: ["$_id", 3] }, then: "Tuesday" },
                  { case: { $eq: ["$_id", 4] }, then: "Wednesday" },
                  { case: { $eq: ["$_id", 5] }, then: "Thursday" },
                  { case: { $eq: ["$_id", 6] }, then: "Friday" },
                  { case: { $eq: ["$_id", 7] }, then: "Saturday" }
                ],
                default: "Unknown"
              }
            },
            bookings: 1,
            revenue: 1
          }
        },
        { $sort: { _id: 1 } }
      ])

      return {
        timeSlots: timeSlotData,
        hourlyAnalysis: hourlyData,
        dayOfWeekAnalysis: dayOfWeekData,
        insights: {
          peakTimeSlot: timeSlotData[0] || null,
          peakHour: hourlyData.reduce((max, hour) => hour.bookings > max.bookings ? hour : max, { bookings: 0 }),
          peakDay: dayOfWeekData.reduce((max, day) => day.bookings > max.bookings ? day : max, { bookings: 0 }),
          totalUniqueTimeSlots: timeSlotData.length,
        },
        period,
        filters: { sport: sport || 'all' }
      }
    } catch (error) {
      console.log("Failed to get time slot analytics:", error)
      throw error
    }
  },

  async getBookingAnalytics({ venueId, sport, period = "month" }) {
    try {
      if (!venueId.match(/^[0-9a-fA-F]{24}$/)) {
        throw CustomErrorHandler.badRequest("Invalid Venue ID format")
      }

      const dateRange = this.getDateRange(period)
      const matchQuery = {
        venueId: mongoose.Types.ObjectId(venueId),
        createdAt: { $gte: dateRange.start, $lte: dateRange.end }
      }

      if (sport && sport !== 'all') {
        matchQuery.sport = new RegExp(`^${sport}$`, "i")
      }

      // Booking status distribution
      const statusDistribution = await Booking.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: "$bookingStatus",
            count: { $sum: 1 },
            revenue: { $sum: { $cond: [{ $eq: ["$paymentStatus", "successful"] }, "$totalAmount", 0] } }
          }
        }
      ])

      // Payment status distribution
      const paymentDistribution = await Booking.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: "$paymentStatus",
            count: { $sum: 1 },
            amount: { $sum: "$totalAmount" }
          }
        }
      ])

      // Booking patterns
      const bookingPatterns = await Booking.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: "$bookingPattern",
            count: { $sum: 1 },
            avgDuration: { $avg: "$durationInHours" },
            avgAmount: { $avg: "$totalAmount" }
          }
        }
      ])

      // Customer retention (repeat bookings)
      const customerRetention = await Booking.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: "$userId",
            bookingCount: { $sum: 1 },
            totalSpent: { $sum: { $cond: [{ $eq: ["$paymentStatus", "successful"] }, "$totalAmount", 0] } },
            firstBooking: { $min: "$createdAt" },
            lastBooking: { $max: "$createdAt" }
          }
        },
        {
          $group: {
            _id: null,
            totalCustomers: { $sum: 1 },
            repeatCustomers: { $sum: { $cond: [{ $gt: ["$bookingCount", 1] }, 1, 0] } },
            avgBookingsPerCustomer: { $avg: "$bookingCount" },
            avgSpentPerCustomer: { $avg: "$totalSpent" }
          }
        }
      ])

      const retention = customerRetention[0] || {
        totalCustomers: 0,
        repeatCustomers: 0,
        avgBookingsPerCustomer: 0,
        avgSpentPerCustomer: 0
      }

      return {
        statusDistribution,
        paymentDistribution,
        bookingPatterns,
        customerInsights: {
          ...retention,
          retentionRate: retention.totalCustomers > 0 ? (retention.repeatCustomers / retention.totalCustomers) * 100 : 0
        },
        period,
        filters: { sport: sport || 'all' }
      }
    } catch (error) {
      console.log("Failed to get booking analytics:", error)
      throw error
    }
  },

  async getPerformanceAnalytics({ venueId, sport }) {
    try {
      if (!venueId.match(/^[0-9a-fA-F]{24}$/)) {
        throw CustomErrorHandler.badRequest("Invalid Venue ID format")
      }

      const venue = await Venue.findById(venueId)
      if (!venue) {
        throw CustomErrorHandler.notFound("Venue not found")
      }

      const matchQuery = { venueId: mongoose.Types.ObjectId(venueId) }
      if (sport && sport !== 'all') {
        matchQuery.sport = new RegExp(`^${sport}$`, "i")
      }

      // Overall performance metrics
      const [
        totalBookings,
        totalRevenue,
        avgRating,
        utilizationRate,
        monthlyGrowth
      ] = await Promise.all([
        Booking.countDocuments(matchQuery),

        Booking.aggregate([
          { $match: { ...matchQuery, paymentStatus: "successful" } },
          { $group: { _id: null, total: { $sum: "$totalAmount" } } }
        ]).then(result => result[0]?.total || 0),

        // Mock rating - you might have a separate ratings collection
        Promise.resolve(4.2),

        // Calculate utilization rate
        this.calculateUtilizationRate(venueId, sport),

        // Monthly growth
        this.calculateMonthlyGrowth(venueId, sport)
      ])

      // Performance benchmarks
      const benchmarks = {
        bookingTarget: 100, // Monthly target
        revenueTarget: 50000, // Monthly target
        utilizationTarget: 70, // Percentage
        ratingTarget: 4.0
      }

      const performance = {
        bookingPerformance: totalBookings / benchmarks.bookingTarget * 100,
        revenuePerformance: totalRevenue / benchmarks.revenueTarget * 100,
        utilizationPerformance: utilizationRate / benchmarks.utilizationTarget * 100,
        ratingPerformance: avgRating / benchmarks.ratingTarget * 100
      }

      return {
        metrics: {
          totalBookings,
          totalRevenue,
          avgRating,
          utilizationRate,
          monthlyGrowth
        },
        benchmarks,
        performance,
        overallScore: Object.values(performance).reduce((sum, score) => sum + score, 0) / 4,
        recommendations: this.generateRecommendations(performance, utilizationRate, monthlyGrowth)
      }
    } catch (error) {
      console.log("Failed to get performance analytics:", error)
      throw error
    }
  },

  // Helper methods
  getDateRange(period, startDate, endDate) {
    const now = new Date()

    if (startDate && endDate) {
      return {
        start: new Date(startDate),
        end: new Date(endDate)
      }
    }

    switch (period) {
      case "week":
        return {
          start: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
          end: now
        }
      case "month":
        return {
          start: new Date(now.getFullYear(), now.getMonth(), 1),
          end: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
        }
      case "quarter":
        const quarterStart = Math.floor(now.getMonth() / 3) * 3
        return {
          start: new Date(now.getFullYear(), quarterStart, 1),
          end: new Date(now.getFullYear(), quarterStart + 3, 0, 23, 59, 59)
        }
      case "year":
        return {
          start: new Date(now.getFullYear(), 0, 1),
          end: new Date(now.getFullYear(), 11, 31, 23, 59, 59)
        }
      default:
        return {
          start: new Date(now.getFullYear(), now.getMonth(), 1),
          end: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
        }
    }
  },

  getPreviousDateRange(period, currentRange) {
    const duration = currentRange.end.getTime() - currentRange.start.getTime()
    return {
      start: new Date(currentRange.start.getTime() - duration),
      end: new Date(currentRange.end.getTime() - duration)
    }
  },

  async getPopularTimeSlots(venueId, sport, dateRange) {
    const matchQuery = {
      venueId: mongoose.Types.ObjectId(venueId),
      createdAt: { $gte: dateRange.start, $lte: dateRange.end }
    }

    if (sport && sport !== 'all') {
      matchQuery.sport = new RegExp(`^${sport}$`, "i")
    }

    return await Booking.aggregate([
      { $match: matchQuery },
      { $unwind: "$scheduledDates" },
      { $unwind: "$scheduledDates.timeSlots" },
      {
        $group: {
          _id: {
            startTime: "$scheduledDates.timeSlots.startTime",
            endTime: "$scheduledDates.timeSlots.endTime"
          },
          bookings: { $sum: 1 },
          revenue: { $sum: { $cond: [{ $eq: ["$paymentStatus", "successful"] }, "$totalAmount", 0] } }
        }
      },
      {
        $project: {
          timeSlot: { $concat: ["$_id.startTime", "-", "$_id.endTime"] },
          bookings: 1,
          revenue: 1
        }
      },
      { $sort: { bookings: -1 } },
      { $limit: 10 }
    ])
  },

  async calculateUtilizationRate(venueId, sport) {
    // This is a simplified calculation
    // You might want to implement more sophisticated logic based on your business rules
    const totalSlots = 12 // Assuming 12 hours of operation per day
    const daysInMonth = 30
    const totalAvailableSlots = totalSlots * daysInMonth

    const bookedSlots = await Booking.aggregate([
      {
        $match: {
          venueId: mongoose.Types.ObjectId(venueId),
          createdAt: { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
          ...(sport && sport !== 'all' ? { sport: new RegExp(`^${sport}$`, "i") } : {})
        }
      },
      { $unwind: "$scheduledDates" },
      { $unwind: "$scheduledDates.timeSlots" },
      { $count: "totalBookedSlots" }
    ])

    const bookedSlotsCount = bookedSlots[0]?.totalBookedSlots || 0
    return Math.round((bookedSlotsCount / totalAvailableSlots) * 100)
  },

  async calculateMonthlyGrowth(venueId, sport) {
    const currentMonth = new Date()
    const previousMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)
    const currentMonthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)

    const [currentBookings, previousBookings] = await Promise.all([
      Booking.countDocuments({
        venueId: mongoose.Types.ObjectId(venueId),
        createdAt: { $gte: currentMonthStart },
        ...(sport && sport !== 'all' ? { sport: new RegExp(`^${sport}$`, "i") } : {})
      }),
      Booking.countDocuments({
        venueId: mongoose.Types.ObjectId(venueId),
        createdAt: {
          $gte: previousMonth,
          $lt: currentMonthStart
        },
        ...(sport && sport !== 'all' ? { sport: new RegExp(`^${sport}$`, "i") } : {})
      })
    ])

    if (previousBookings === 0) return currentBookings > 0 ? 100 : 0
    return Math.round(((currentBookings - previousBookings) / previousBookings) * 100)
  },

  generateRecommendations(performance, utilizationRate, monthlyGrowth) {
    const recommendations = []

    if (performance.bookingPerformance < 80) {
      recommendations.push({
        type: "booking",
        priority: "high",
        message: "Consider promotional campaigns to increase bookings",
        action: "Create discount offers for off-peak hours"
      })
    }

    if (utilizationRate < 50) {
      recommendations.push({
        type: "utilization",
        priority: "medium",
        message: "Low utilization rate detected",
        action: "Optimize pricing strategy and improve marketing"
      })
    }

    if (monthlyGrowth < 0) {
      recommendations.push({
        type: "growth",
        priority: "high",
        message: "Negative growth trend",
        action: "Review customer feedback and improve service quality"
      })
    }

    if (performance.revenuePerformance < 70) {
      recommendations.push({
        type: "revenue",
        priority: "medium",
        message: "Revenue below target",
        action: "Consider premium services or dynamic pricing"
      })
    }

    return recommendations
  },

  //#region new filter changes

  async getNearbyVenues(filters) {
    try {
      const {
        latitude,
        longitude,
        page = 1,
        radius = 25,
        sport = 'all',
        venueType = 'all',
        surfaceTypes = [],
        facilities = {},
        priceRange = {}
      } = filters

      const limit = 10;
      const MAX_DISTANCE_METERS = Math.min(radius * 1000, 100000); // Max 100km
      const skip = (page - 1) * limit;
      const userLocation = {
        type: "Point",
        coordinates: [longitude, latitude]
      };

      // Handle expired subscriptions first
      const expiredGround = await Venue.find({
        "locationHistory.point": {
          $near: {
            $geometry: userLocation,
            $maxDistance: MAX_DISTANCE_METERS
          }
        },
        subscriptionExpiry: { $lt: new Date() },
        isSubscriptionPurchased: true
      }).select('_id');

      if (expiredGround.length > 0) {
        const expiredGroundIds = expiredGround.map(Venue => Venue._id);
        await Venue.updateMany(
          { _id: { $in: expiredGroundIds } },
          { $set: { isSubscriptionPurchased: false } }
        );
      }

      // Build aggregation pipeline
      const pipeline = [
        {
          $geoNear: {
            near: userLocation,
            distanceField: "distance",
            spherical: true,
            maxDistance: MAX_DISTANCE_METERS,
            query: {
              isActive: true,
              isSubscriptionPurchased: true,
            }
          }
        },
        {
          $addFields: {
            distanceInKm: { $divide: ["$distance", 1000] },
            lowestPrice: {
              $min: {
                $map: {
                  input: "$sportPricing",
                  as: "pricing",
                  in: "$$pricing.perHourCharge"
                }
              }
            }
          }
        },
        {
          $match: {
            $and: [
              { distanceInKm: { $lte: radius } },
              // Sport filter
              ...(sport !== 'all' ? [{ venue_sports: sport }] : []),
              // Venue type filter
              ...(venueType !== 'all' ? [{ venue_type: venueType }] : []),
              // Surface types filter (multi-select)
              ...(surfaceTypes.length > 0 ? [{ venue_surfacetype: { $in: surfaceTypes } }] : []),
              // Price range filter
              ...(priceRange.min !== undefined ? [{
                $or: [
                  { perHourCharge: { $gte: priceRange.min } },
                  { lowestPrice: { $gte: priceRange.min } }
                ]
              }] : []),
              ...(priceRange.max !== undefined ? [{
                $or: [
                  { perHourCharge: { $lte: priceRange.max } },
                  { lowestPrice: { $lte: priceRange.max } }
                ]
              }] : []),
              // Facilities filter
              ...this.buildFacilitiesFilter(facilities),
            ]
          }
        },
        {
          $lookup: {
            from: "packages",
            localField: "packageRef",
            foreignField: "_id",
            as: "packageRef"
          }
        },
        {
          $unwind: {
            path: "$packageRef",
            preserveNullAndEmptyArrays: true
          }
        },
        // Add popularity score for better sorting
        {
          $addFields: {
            popularityScore: {
              $add: [
                // Distance score (closer = higher score)
                { $subtract: [50, { $multiply: ["$distanceInKm", 2] }] },
                // Booking count score
                { $min: [30, { $multiply: [{ $ifNull: ["$totalBookings", 0] }, 0.1] }] },
                // Active subscription bonus
                { $cond: ["$isSubscriptionPurchased", 15, 0] },
                // Facilities count bonus
                { $multiply: [this.countActiveFacilities(), 1] },
                // Sports variety bonus
                { $multiply: [{ $size: { $ifNull: ["$venue_sports", []] } }, 0.5] }
              ]
            }
          }
        },
        // Sort by popularity and distance
        {
          $sort: {
            popularityScore: -1,
            distanceInKm: 1,
            totalBookings: -1
          }
        },
        { $skip: skip },
        { $limit: limit }
      ];

      const venues = await Venue.aggregate(pipeline);

      // Get total count for pagination
      const countPipeline = [...pipeline.slice(0, -2), { $count: "total" }];
      const countResult = await Venue.aggregate(countPipeline);
      const total = countResult[0]?.total || 0;

      return {
        venues,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: limit,
          hasMore: page < Math.ceil(total / limit),
        },
        appliedFilters: {
          sport,
          venueType,
          surfaceTypes,
          facilities,
          priceRange,
          radius,
        },
        userLocation: { latitude, longitude },
      };
    } catch (error) {
      console.log(`Failed to get nearby venues with filters: ${error}`);
      throw error;
    }
  },

  // ==================== ENHANCED NEARBY INDIVIDUALS ====================
  async getNearbyIndividuals(filters) {
    try {
      const {
        latitude,
        longitude,
        page = 1,
        radius = 25,
        sports = [],
        serviceType = 'all',
        ageGroup = 'all',
        experienceRange = {}
      } = filters

      const limit = 10;
      const MAX_DISTANCE_METERS = Math.min(radius * 1000, 100000);
      const skip = (page - 1) * limit;
      const userLocation = {
        type: "Point",
        coordinates: [longitude, latitude]
      };

      // Handle expired subscriptions
      const expiredIndividuals = await Individual.find({
        "locationHistory.point": {
          $near: {
            $geometry: userLocation,
            $maxDistance: MAX_DISTANCE_METERS
          }
        },
        subscriptionExpiry: { $lt: new Date() },
        hasActiveSubscription: true
      }).select('_id');

      if (expiredIndividuals.length > 0) {
        const expiredIndividualIds = expiredIndividuals.map(individual => individual._id);
        await Individual.updateMany(
          { _id: { $in: expiredIndividualIds } },
          { $set: { hasActiveSubscription: false } }
        );
      }

      const pipeline = [
        {
          $geoNear: {
            near: userLocation,
            distanceField: "distance",
            spherical: true,
            maxDistance: MAX_DISTANCE_METERS,
            query: {
              hasActiveSubscription: true,
            }
          }
        },
        {
          $addFields: {
            distanceInKm: { $divide: ["$distance", 1000] }
          }
        },
        {
          $match: {
            $and: [
              { distanceInKm: { $lte: radius } },
              // Sports filter (multi-select)
              ...(sports.length > 0 ? [{ sportsCategories: { $in: sports } }] : []),
              // Service type filter
              ...this.buildServiceTypeFilter(serviceType),
              // Age group filter
              ...(ageGroup !== 'all' ? [{ supportedAgeGroups: ageGroup }] : []),
              // Experience range filter
              ...(experienceRange.min !== undefined ? [{ yearOfExperience: { $gte: experienceRange.min } }] : []),
              ...(experienceRange.max !== undefined ? [{ yearOfExperience: { $lte: experienceRange.max } }] : []),
            ]
          }
        },
        {
          $lookup: {
            from: "packages",
            localField: "packageRef",
            foreignField: "_id",
            as: "packageRef"
          }
        },
        {
          $unwind: {
            path: "$packageRef",
            preserveNullAndEmptyArrays: true
          }
        },
        // Add popularity score
        {
          $addFields: {
            popularityScore: {
              $add: [
                // Distance score
                { $subtract: [40, { $multiply: ["$distanceInKm", 1.5] }] },
                // Experience score
                { $min: [25, { $multiply: [{ $ifNull: ["$yearOfExperience", 0] }, 1] }] },
                // Active subscription bonus
                { $cond: ["$hasActiveSubscription", 15, 0] },
                // Service variety bonus
                {
                  $add: [
                    { $cond: [{ $ifNull: ["$serviceOptions.providesOneOnOne", false] }, 5, 0] },
                    { $cond: [{ $ifNull: ["$serviceOptions.providesTeamService", false] }, 5, 0] },
                    { $cond: [{ $ifNull: ["$serviceOptions.providesOnlineService", false] }, 3, 0] },
                  ]
                },
                // Sports variety bonus
                { $multiply: [{ $size: { $ifNull: ["$sportsCategories", []] } }, 1] }
              ]
            }
          }
        },
        {
          $sort: {
            popularityScore: -1,
            yearOfExperience: -1,
            distanceInKm: 1
          }
        },
        { $skip: skip },
        { $limit: limit }
      ];

      const individuals = await Individual.aggregate(pipeline);

      // Get total count
      const countPipeline = [...pipeline.slice(0, -2), { $count: "total" }];
      const countResult = await Individual.aggregate(countPipeline);
      const total = countResult[0]?.total || 0;

      return {
        individuals,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: limit,
          hasMore: page < Math.ceil(total / limit),
        },
        appliedFilters: {
          sports,
          serviceType,
          ageGroup,
          experienceRange,
          radius,
        },
        userLocation: { latitude, longitude },
      };
    } catch (error) {
      console.log("Failed to get nearby individuals with filters:", error);
      throw error;
    }
  },

  // ==================== ENHANCED VENUE SEARCH ====================
  async searchVenuesWithFilters(filters) {
    try {
      const {
        query,
        latitude,
        longitude,
        page = 1,
        radius = 25,
        sport = 'all',
        venueType = 'all',
        surfaceTypes = [],
        facilities = {},
        priceRange = {}
      } = filters

      const MAX_DISTANCE_METERS = Math.min(radius * 1000, 100000);
      const limit = 10;
      const skip = (page - 1) * limit;
      const userLocation = {
        type: "Point",
        coordinates: [longitude, latitude],
      };

      // Build search regex for better performance
      const searchRegex = new RegExp(query.split(' ').join('|'), 'i');

      const pipeline = [
        {
          $geoNear: {
            near: userLocation,
            distanceField: "distance",
            spherical: true,
            maxDistance: MAX_DISTANCE_METERS,
            query: {
              isActive: true,
              isSubscriptionPurchased: true,
            },
          },
        },
        {
          $addFields: {
            distanceInKm: { $divide: ["$distance", 1000] },
            lowestPrice: {
              $min: {
                $map: {
                  input: "$sportPricing",
                  as: "pricing",
                  in: "$$pricing.perHourCharge"
                }
              }
            },
            // Create searchable text field
            searchableText: {
              $concat: [
                { $ifNull: ["$venue_name", ""] },
                " ",
                { $ifNull: ["$venue_description", ""] },
                " ",
                { $ifNull: ["$venue_address", ""] },
                " ",
                {
                  $reduce: {
                    input: { $ifNull: ["$venue_sports", []] },
                    initialValue: "",
                    in: { $concat: ["$$value", " ", "$$this"] },
                  },
                },
              ],
            },
          },
        },
        {
          $match: {
            $and: [
              { distanceInKm: { $lte: radius } },
              // Text search filter
              {
                $or: [
                  { venue_name: { $regex: searchRegex } },
                  { venue_description: { $regex: searchRegex } },
                  { venue_address: { $regex: searchRegex } },
                  { venue_sports: { $in: [searchRegex] } },
                  { searchableText: { $regex: searchRegex } },
                ],
              },
              // Additional filters
              ...(sport !== 'all' ? [{ venue_sports: sport }] : []),
              ...(venueType !== 'all' ? [{ venue_type: venueType }] : []),
              ...(surfaceTypes.length > 0 ? [{ venue_surfacetype: { $in: surfaceTypes } }] : []),
              ...(priceRange.min !== undefined ? [{
                $or: [
                  { perHourCharge: { $gte: priceRange.min } },
                  { lowestPrice: { $gte: priceRange.min } }
                ]
              }] : []),
              ...(priceRange.max !== undefined ? [{
                $or: [
                  { perHourCharge: { $lte: priceRange.max } },
                  { lowestPrice: { $lte: priceRange.max } }
                ]
              }] : []),
              ...this.buildFacilitiesFilter(facilities),
            ],
          },
        },
        {
          $lookup: {
            from: "packages",
            localField: "packageRef",
            foreignField: "_id",
            as: "packageRef",
          },
        },
        {
          $unwind: {
            path: "$packageRef",
            preserveNullAndEmptyArrays: true,
          },
        },
        // Add comprehensive search score
        {
          $addFields: {
            searchScore: {
              $add: [
                // Text relevance scores
                {
                  $cond: [
                    { $regexMatch: { input: "$venue_name", regex: searchRegex } },
                    50, 0
                  ],
                },
                {
                  $cond: [
                    { $regexMatch: { input: "$venue_description", regex: searchRegex } },
                    30, 0
                  ],
                },
                {
                  $cond: [
                    { $regexMatch: { input: "$venue_address", regex: searchRegex } },
                    20, 0
                  ],
                },
                // Sports match bonus
                {
                  $cond: [
                    {
                      $gt: [
                        { $size: { $setIntersection: ["$venue_sports", [searchRegex]] } },
                        0
                      ]
                    },
                    25, 0
                  ],
                },
                // Distance score (closer = higher)
                { $subtract: [40, { $multiply: ["$distanceInKm", 2] }] },
                // Popularity score
                { $min: [20, { $multiply: [{ $ifNull: ["$totalBookings", 0] }, 0.1] }] },
                // Active subscription bonus
                { $cond: ["$isSubscriptionPurchased", 10, 0] },
                // Facilities bonus
                { $multiply: [this.countActiveFacilities(), 1] },
              ],
            },
          },
        },
        // Sort by search relevance
        {
          $sort: {
            searchScore: -1,
            distanceInKm: 1,
            totalBookings: -1,
          },
        },
        { $skip: skip },
        { $limit: limit },
      ];

      const venues = await Venue.aggregate(pipeline);

      // Get total count
      const countPipeline = [...pipeline.slice(0, -2), { $count: "total" }];
      const countResult = await Venue.aggregate(countPipeline);
      const total = countResult[0]?.total || 0;

      return {
        venues,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: limit,
          hasMore: page < Math.ceil(total / limit),
        },
        searchQuery: query,
        searchRadius: radius,
        userLocation: { latitude, longitude },
        appliedFilters: {
          sport,
          venueType,
          surfaceTypes,
          facilities,
          priceRange,
        },
      };
    } catch (error) {
      console.log("Failed to search venues with filters:", error);
      throw error;
    }
  },

  // ==================== ENHANCED INDIVIDUAL SEARCH ====================
  async searchIndividualsWithFilters(filters) {
    try {
      const {
        query,
        latitude,
        longitude,
        page = 1,
        radius = 25,
        sports = [],
        serviceType = 'all',
        ageGroup = 'all',
        experienceRange = {}
      } = filters

      const MAX_DISTANCE_METERS = Math.min(radius * 1000, 100000);
      const limit = 10;
      const skip = (page - 1) * limit;
      const userLocation = {
        type: "Point",
        coordinates: [longitude, latitude],
      };

      const searchRegex = new RegExp(query.split(' ').join('|'), 'i');

      const pipeline = [
        {
          $geoNear: {
            near: userLocation,
            distanceField: "distance",
            spherical: true,
            maxDistance: MAX_DISTANCE_METERS,
            query: {
              hasActiveSubscription: true,
            },
          },
        },
        {
          $addFields: {
            distanceInKm: { $divide: ["$distance", 1000] },
            searchableText: {
              $concat: [
                { $ifNull: ["$fullName", ""] },
                " ",
                { $ifNull: ["$bio", ""] },
                " ",
                {
                  $reduce: {
                    input: { $ifNull: ["$sportsCategories", []] },
                    initialValue: "",
                    in: { $concat: ["$$value", " ", "$$this"] },
                  },
                },
                " ",
                {
                  $reduce: {
                    input: { $ifNull: ["$supportedAgeGroups", []] },
                    initialValue: "",
                    in: { $concat: ["$$value", " ", "$$this"] },
                  },
                },
              ],
            },
          },
        },
        {
          $match: {
            $and: [
              { distanceInKm: { $lte: radius } },
              // Text search filter
              {
                $or: [
                  { fullName: { $regex: searchRegex } },
                  { bio: { $regex: searchRegex } },
                  { sportsCategories: { $in: [searchRegex] } },
                  { supportedAgeGroups: { $in: [searchRegex] } },
                  { searchableText: { $regex: searchRegex } },
                ],
              },
              // Additional filters
              ...(sports.length > 0 ? [{ sportsCategories: { $in: sports } }] : []),
              ...this.buildServiceTypeFilter(serviceType),
              ...(ageGroup !== 'all' ? [{ supportedAgeGroups: ageGroup }] : []),
              ...(experienceRange.min !== undefined ? [{ yearOfExperience: { $gte: experienceRange.min } }] : []),
              ...(experienceRange.max !== undefined ? [{ yearOfExperience: { $lte: experienceRange.max } }] : []),
            ],
          },
        },
        {
          $lookup: {
            from: "packages",
            localField: "packageRef",
            foreignField: "_id",
            as: "packageRef",
          },
        },
        {
          $unwind: {
            path: "$packageRef",
            preserveNullAndEmptyArrays: true,
          },
        },
        // Add search score
        {
          $addFields: {
            searchScore: {
              $add: [
                // Name match (highest priority)
                {
                  $cond: [
                    { $regexMatch: { input: "$fullName", regex: searchRegex } },
                    60, 0
                  ],
                },
                // Bio match
                {
                  $cond: [
                    { $regexMatch: { input: "$bio", regex: searchRegex } },
                    30, 0
                  ],
                },
                // Sports match
                {
                  $cond: [
                    {
                      $gt: [
                        { $size: { $setIntersection: ["$sportsCategories", [searchRegex]] } },
                        0
                      ]
                    },
                    40, 0
                  ],
                },
                // Age group match
                {
                  $cond: [
                    {
                      $gt: [
                        { $size: { $setIntersection: ["$supportedAgeGroups", [searchRegex]] } },
                        0
                      ]
                    },
                    20, 0
                  ],
                },
                // Distance score
                { $subtract: [30, { $multiply: ["$distanceInKm", 1.5] }] },
                // Experience score
                { $min: [20, { $multiply: [{ $ifNull: ["$yearOfExperience", 0] }, 0.8] }] },
                // Active subscription bonus
                { $cond: ["$hasActiveSubscription", 10, 0] },
                // Service variety bonus
                {
                  $add: [
                    { $cond: [{ $ifNull: ["$serviceOptions.providesOneOnOne", false] }, 3, 0] },
                    { $cond: [{ $ifNull: ["$serviceOptions.providesTeamService", false] }, 3, 0] },
                    { $cond: [{ $ifNull: ["$serviceOptions.providesOnlineService", false] }, 2, 0] },
                  ]
                },
              ],
            },
          },
        },
        {
          $sort: {
            searchScore: -1,
            yearOfExperience: -1,
            distanceInKm: 1,
          },
        },
        { $skip: skip },
        { $limit: limit },
      ];

      const individuals = await Individual.aggregate(pipeline);

      // Get total count
      const countPipeline = [...pipeline.slice(0, -2), { $count: "total" }];
      const countResult = await Individual.aggregate(countPipeline);
      const total = countResult[0]?.total || 0;

      return {
        individuals,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: limit,
          hasMore: page < Math.ceil(total / limit),
        },
        searchQuery: query,
        searchRadius: radius,
        userLocation: { latitude, longitude },
        appliedFilters: {
          sports,
          serviceType,
          ageGroup,
          experienceRange,
        },
      };
    } catch (error) {
      console.log("Failed to search individuals with filters:", error);
      throw error;
    }
  },

  // ==================== HELPER METHODS ====================
  buildFacilitiesFilter(facilities) {
    const filters = [];
    Object.entries(facilities).forEach(([key, value]) => {
      if (value === true) {
        filters.push({ [`venuefacilities.${key}`]: true });
      }
    });
    return filters;
  },

  buildServiceTypeFilter(serviceType) {
    if (serviceType === 'all') return [];

    switch (serviceType) {
      case 'one_on_one':
        return [{ "serviceOptions.providesOneOnOne": true }];
      case 'team_service':
        return [{ "serviceOptions.providesTeamService": true }];
      case 'online_service':
        return [{ "serviceOptions.providesOnlineService": true }];
      default:
        return [];
    }
  },

  countActiveFacilities() {
    return {
      $add: [
        { $cond: [{ $ifNull: ["$venuefacilities.isWaterAvailable", false] }, 1, 0] },
        { $cond: [{ $ifNull: ["$venuefacilities.isParkingAvailable", false] }, 1, 0] },
        { $cond: [{ $ifNull: ["$venuefacilities.isEquipmentProvided", false] }, 1, 0] },
        { $cond: [{ $ifNull: ["$venuefacilities.isWashroomAvailable", false] }, 1, 0] },
        { $cond: [{ $ifNull: ["$venuefacilities.isChangingRoomAvailable", false] }, 1, 0] },
        { $cond: [{ $ifNull: ["$venuefacilities.isFloodlightAvailable", false] }, 1, 0] },
        { $cond: [{ $ifNull: ["$venuefacilities.isSeatingLoungeAvailable", false] }, 1, 0] },
        { $cond: [{ $ifNull: ["$venuefacilities.isFirstAidAvailable", false] }, 1, 0] },
        { $cond: [{ $ifNull: ["$venuefacilities.isWalkingTrackAvailable", false] }, 1, 0] },
      ]
    };
  },

  // ==================== COMBINED SEARCH ====================
  async combinedSearchWithFilters(filters) {
    try {
      const { query, latitude, longitude, page = 1, radius = 25 } = filters;

      // Run both searches in parallel
      const [venueResults, individualResults] = await Promise.all([
        this.searchVenuesWithFilters({
          ...filters,
          page: 1, // Get first page for combined results
        }),
        this.searchIndividualsWithFilters({
          ...filters,
          page: 1, // Get first page for combined results
        })
      ]);

      // Combine and sort results by search score
      const combinedResults = [
        ...venueResults.venues.map(venue => ({ ...venue, type: 'venue' })),
        ...individualResults.individuals.map(individual => ({ ...individual, type: 'individual' }))
      ].sort((a, b) => (b.searchScore || 0) - (a.searchScore || 0));

      // Apply pagination to combined results
      const limit = 10;
      const skip = (page - 1) * limit;
      const paginatedResults = combinedResults.slice(skip, skip + limit);

      return {
        results: paginatedResults,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(combinedResults.length / limit),
          totalItems: combinedResults.length,
          itemsPerPage: limit,
          hasMore: page < Math.ceil(combinedResults.length / limit),
        },
        searchQuery: query,
        searchRadius: radius,
        userLocation: { latitude, longitude },
        summary: {
          totalVenues: venueResults.venues.length,
          totalIndividuals: individualResults.individuals.length,
          totalResults: combinedResults.length,
        },
      };
    } catch (error) {
      console.log("Failed to perform combined search:", error);
      throw error;
    }
  },
}

export default ProviderServices
