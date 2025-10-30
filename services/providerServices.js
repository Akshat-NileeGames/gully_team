
/**
 * @file providerServices.js
 * @description Service layer for venue and individual service provider operations.
 * Contains all business logic for venue management, booking system, analytics,
 * and individual service provider functionality.
/**
 * ProviderServices Object
 *
 * Contains all service methods for provider-related operations.
 * Each method handles specific business logic and database interactions.
 *
 * Service Method Categories:
 * 1. Venue Management (create, edit, retrieve)
 * 2. Booking System (slots, reservations, payments)
 * 3. Search & Discovery (location-based, filtered)
 * 4. Analytics & Reporting (dashboard, revenue, sports)
 * 5. Individual Services (coaches, trainers)
 * 6. Subscription Management
 */


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
  /**
   * @function createVenue
   * @description Handles the registration of a venue on the platform. 
   * Requires complete venue data, including venue name, sports, and pricing.
   * Validates user, package, and sports pricing. Uploads images and saves the venue to the database.
   * 
   * @param {Object} data - Data required to create a venue (name, sports, pricing, images, etc.)
   * @returns {Promise<Object>} The registered venue data
   * @throws {Error} Throws various errors related to missing user, package, pricing, or image upload failure.
   */
  async createVenue(data) {
    try {
      /**
       * Retrieve user information from a global context (token-based authentication).
       * Throws an error if the user is not found.
       */
      const userInfo = global.user;
      const user = await User.findById(userInfo.userId);
      if (!user) throw CustomErrorHandler.notFound("User not found");

      /**
       * Fetch the selected package using the provided package ID.
       * Throws an error if the package does not exist.
       */
      const packageInfo = await Package.findById(data.packageRef);
      if (!packageInfo) throw CustomErrorHandler.notFound("Package not found");

      /**
       * Validate that sport pricing is provided for all selected sports.
       * If any selected sport is missing pricing, throws an error listing the missing sports.
       */
      if (data.sportPricing && data.sportPricing.length > 0) {
        const providedSports = data.sportPricing.map((sp) => sp.sport);
        const missingPricing = data.venue_sports.filter((sport) => !providedSports.includes(sport));
        if (missingPricing.length > 0) {
          throw CustomErrorHandler.badRequest(`Pricing missing for sports: ${missingPricing.join(", ")}`);
        }
      }

      /**
       * Upload venue images to AWS and collect their URLs.
       * Throws an error if any image upload fails or if no images are provided.
       */
      let venueImages = [];
      if (Array.isArray(data.venueImages) && data.venueImages.length > 0) {
        for (const image of data.venueImages) {
          try {
            const uploadedUrl = await ImageUploader.Upload(image, "VenueImage");

            if (!uploadedUrl) {
              throw new Error("Image upload failed or returned empty URL.");
            }

            venueImages.push(uploadedUrl);
          } catch (uploadError) {
            console.error(`Image upload failed: ${uploadError}`);
            throw CustomErrorHandler.serverError("Failed to upload one or more venue images.");
          }
        }
      } else {
        throw CustomErrorHandler.badRequest("Venue images are required.");
      }

      /**
       * Create a new venue document with the provided and processed data.
       * Includes location coordinates, user reference, package info, and subscription expiry.
       */
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
            coordinates: [
              Number.parseFloat(data.longitude),
              Number.parseFloat(data.latitude)
            ],
            selectLocation: data.selectLocation,
          },
        },
        userId: userInfo.userId,
        packageRef: data.packageRef,
        isSubscriptionPurchased: true,
        subscriptionExpiry: DateTime.now().plus({ month: packageInfo.duration }).toJSDate(),
      });

      await venue.save();
      return venue;
    } catch (error) {
      console.log("Failed to create venue:", error);
      throw error;
    }
  },

  /**
 * @function editVenue
 * @description Updates an existing venue with new data. 
 * Validates user, ensures all selected sports have pricing, processes images, 
 * and updates the venue document. Also syncs venue contact info with Razorpay.
 * 
 * @param {Object} data - Data to update the venue (must include venueId)
 * @param {string} data.venueId - ID of the venue to update
 * @returns {Promise<Object>} The updated venue data (excluding timestamps and version)
 * @throws {Error} Throws errors if user not found, pricing is incomplete, or image upload fails
 */
  async editVenue(data) {
    try {
      const { venueId, ...fieldsToUpdate } = data;
      const userInfo = global.user;

      /**
       * Validate that the user exists.
       */
      const user = await User.findById(userInfo.userId);
      if (!user) throw CustomErrorHandler.notFound("User not found");

      /**
       * If sports and pricing are being updated, ensure that pricing is provided for each selected sport.
       */
      if (fieldsToUpdate.sportPricing && fieldsToUpdate.sportPricing.length > 0) {
        const providedSports = fieldsToUpdate.sportPricing.map((sp) => sp.sport);
        const missingPricing = fieldsToUpdate.venue_sports.filter(
          (sport) => !providedSports.includes(sport)
        );
        if (missingPricing.length > 0) {
          throw CustomErrorHandler.badRequest(`Pricing missing for sports: ${missingPricing.join(", ")}`);
        }
      }

      /**
       * If venueImages are provided, upload new base64 images and keep already uploaded URLs.
       */
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

      /**
       * Update the venue document with new data.
       */
      await Venue.findByIdAndUpdate(
        venueId,
        { $set: fieldsToUpdate },
        { new: true }
      );

      /**
       * Retrieve the updated venue without timestamps and internal fields.
       */
      const venue = await Venue.findById(venueId, {
        updatedAt: 0,
        createdAt: 0,
        __v: 0,
      });

      /**
       * Update the contact info on Razorpay if necessary.
       */
      await this.editContactOnRazorPay(venue, venue.razorpaycontactId);

      return venue;
    } catch (error) {
      console.log("Failed to edit venue:", error);
      throw error;
    }
  },

  /**
 * @function updateVenueSubscriptionStatus
 * @description Updates the subscription status of a venue by marking it as purchased 
 * and setting the subscription expiry based on the selected package's duration.
 * 
 * @param {Object} data - Data required to update the subscription status
 * @param {string} data.venueId - ID of the venue to update
 * @param {string} data.packageId - ID of the selected subscription package
 * 
 * @returns {Promise<Object>} The updated venue document with the new subscription status
 * @throws {Error} Throws an error if the venue or package is not found, or if update fails
 */
  async updateVenueSubscriptionStatus(data) {
    try {
      const { venueId, packageId } = data;
      console.log(venueId);
      /**
       * Find the venue by ID and throw an error if not found.
       */
      const venue = await Venue.findById(venueId);
      if (!venue) throw CustomErrorHandler.notFound("Venue not found");

      /**
       * Retrieve the package info using the provided package ID.
       * Throws an error if the package is not found.
       */
      const packageInfo = await Package.findById(packageId);
      if (!packageInfo) throw CustomErrorHandler.notFound("Package not found");

      /**
       * Update the venue's subscription fields.
       */
      const updatedVenue = await Venue.findByIdAndUpdate(
        venueId,
        {
          isSubscriptionPurchased: true,
          subscriptionExpiry: DateTime.now().plus({ month: packageInfo.duration }).toJSDate(),
          updatedAt: new Date()
        },
        { new: true }
      );

      return updatedVenue;
    } catch (error) {
      throw new Error(`Failed to update venue subscription: ${error.message}`);
    }
  },

  /**
  * @function updateIndividualSubscriptionStatus
  * @description Updates the subscription status of an individual user.
  * Sets `hasActiveSubscription` to true and updates the subscription expiry date
  * based on the duration of the selected package.
  * 
  * @param {Object} data - Required data to update the individual's subscription
  * @param {string} data.individualId - ID of the individual to update
  * @param {string} data.packageId - ID of the package to apply
  * 
  * @returns {Promise<Object>} The updated individual document with subscription details
  * @throws {Error} Throws an error if the individual or package is not found, or update fails
  */
  async updateIndividualSubscriptionStatus(data) {
    try {
      const { individualId, packageId } = data;

      /**
       * Find the individual by ID.
       * Throws an error if not found.
       */
      const individual = await Individual.findById(individualId);
      if (!individual) throw CustomErrorHandler.notFound("Individual not found");

      /**
       * Fetch package info by ID.
       * Throws an error if the package is not found.
       */
      const packageInfo = await Package.findById(packageId);
      if (!packageInfo) throw CustomErrorHandler.notFound("Package not found");

      /**
       * Update the individual's subscription fields.
       */
      const updatedIndividual = await Individual.findByIdAndUpdate(
        individualId,
        {
          hasActiveSubscription: true,
          subscriptionExpiry: DateTime.now().plus({ month: packageInfo.duration }).toJSDate(),
          updatedAt: new Date()
        },
        { new: true }
      );

      return updatedIndividual;
    } catch (error) {
      throw new Error(`Failed to update individual subscription: ${error.message}`);
    }
  },


  /**
   * @function editContactOnRazorPay
   * @description Updates the contact information of a venue on Razorpay using the given contact ID.
   * Updates local venue document with the new Razorpay contact ID.
   * 
   * @param {Object} venue - Venue object containing updated contact info
   * @param {string} contactId - Existing Razorpay contact ID to update
   * 
   * @returns {Promise<boolean>} Returns true if update is successful
   * @throws {Error} Throws error if Razorpay update fails
   */
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

      console.log("Razorpay contact updated:", contactResponse.data.id);

      await Venue.findByIdAndUpdate(venue._id, {
        razorpaycontactId: contactResponse.data.id
      });

      return true;
    } catch (error) {
      console.error("Failed to update Razorpay contact:", error.response?.data || error.message);
      throw new Error("Could not update contact on Razorpay");
    }
  },



  /**
 * @function getVenueById
 * @description Retrieves a venue by its ID and populates its package reference.
 * Validates ID format before querying.
 * 
 * @param {Object} data
 * @param {string} data.id - Venue ID to fetch
 * 
 * @returns {Promise<Object>} The venue document
 * @throws {Error} Throws error if ID is invalid or venue not found
 */
  async getVenueById(data) {
    try {
      if (!data.id.match(/^[0-9a-fA-F]{24}$/)) {
        throw CustomErrorHandler.badRequest("Invalid Venue ID format");
      }

      const venue = await Venue.findById(data.id).populate("packageRef");

      if (!venue) {
        throw CustomErrorHandler.notFound("Venue not found");
      }

      return venue;
    } catch (error) {
      console.log("Failed to get venue by ID:", error);
      throw error;
    }
  },


  /**
 * @function getUserGroundRegisteredGround
 * @description Retrieves all venues (grounds) registered by the currently authenticated user.
 * 
 * @returns {Promise<Array>} Array of venue documents owned by the user
 * @throws {Error} Throws error if user is not found or query fails
 */
  async getUserGroundRegisteredGround() {
    try {
      const userInfo = global.user;

      const user = await User.findById(userInfo.userId);
      if (!user) throw CustomErrorHandler.notFound("User not found");
      const grounds = await Venue.find({
        userId: userInfo.userId
      }).populate("packageRef");

      return grounds;
    } catch (error) {
      console.log("Failed to get user grounds:", error);
      throw error;
    }
  },


  /**
   * @function lockSlots
   * @description Locks a slot temporarily for a venue to prevent double booking during the checkout process.
   * Supports locking new slots or appending to an existing in-progress booking session.
   * 
   * @param {Object} params
   * @param {string} params.venueId - ID of the venue
   * @param {string} params.sport - Sport being booked
   * @param {string} params.date - Booking date (YYYY-MM-DD)
   * @param {string} params.startTime - Start time of the slot (e.g. "10:00")
   * @param {string} params.endTime - End time of the slot (e.g. "11:00")
   * @param {string} params.playableArea - Playable area or court name
   * @param {string} params.userId - ID of the user making the booking
   * @param {string} params.sessionId - Temporary session ID to track locked slots
   * 
   * @returns {Promise<Object>} Slot lock result, including booking ID and lock status
   * @throws {Error} Throws error if validation fails or locking process encounters an issue
   */
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
  /**
     * @function releaseLockedSlots
     * @description Releases a previously locked slot from a booking session. 
     * If no more slots remain after removal, the entire booking document is deleted.
     * 
     * @param {Object} params
     * @param {string} params.venueId - Venue ID
     * @param {string} params.sport - Sport type
     * @param {string} params.date - Booking date (YYYY-MM-DD)
     * @param {string} params.userId - User ID who owns the lock
     * @param {string} params.startTime - Start time of the slot
     * @param {string} params.endTime - End time of the slot
     * @param {string} params.playableArea - The area/court to release
     * @param {string} params.sessionId - Booking session identifier
     * 
     * @returns {Promise<Object>} Result containing released count and message
     * @throws {Error} Throws error if no matching booking or slot is found
     */
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
      const venueResults = await this.searchVenuesWithFilters({
        query,
        latitude,
        longitude,
        page: 1,
        limit: Math.ceil(limit / 2),
        radius,
      });

      const individualResults = await this.searchIndividualsWithFilters({
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

      const allSlots = this.generateTimeSlots(dayTiming.openTime, dayTiming.closeTime)
      const currentDate = DateTime.now()
      const isToday = requestedDate.hasSame(currentDate, "day")
      let filteredSlots = allSlots

      if (isToday) {
        const currentTime = currentDate.toFormat("HH:mm")
        filteredSlots = allSlots.filter((slot) => {
          const slotStartTime = DateTime.fromFormat(slot.startTime, "HH:mm")
          const currentDateTime = DateTime.fromFormat(currentTime, "HH:mm")
          return slotStartTime >= currentDateTime
        })
      }

      const queryDate = new Date(date)
      const start = new Date(queryDate.setHours(0, 0, 0, 0))
      const end = new Date(queryDate.setHours(23, 59, 59, 999))

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

      const availableSlots = filteredSlots
        .filter((slot) => {
          const slotKey = `${slot.startTime}-${slot.endTime}`
          const isBooked = bookedSlotsForPlayableArea.has(slotKey)

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
        response.message = `Showing slots from ${currentDate.toFormat("HH:mm")} onwards for today`
        response.currentTime = currentDate.toFormat("HH:mm")
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
          const currentTime = currentDate.toFormat("HH:mm");
          filteredSlots = allSlots.filter((slot) => {
            const slotStartTime = DateTime.fromFormat(slot.startTime, "HH:mm");
            const currentSlotTime = DateTime.fromFormat(currentTime, "HH:mm");
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
        try {
          const uploadPromises = data.serviceImageUrls.map((image) =>
            ImageUploader.Upload(image, "IndividualServiceImage")
          );

          const uploadedUrls = await Promise.all(uploadPromises);
          const serviceImages = uploadedUrls.filter(Boolean);

          if (serviceImages.length === 0) {
            throw new Error("No images uploaded successfully.");
          }
          console.log(`Uploaded ${serviceImages.length} images successfully`);
        } catch (error) {
          console.error("Image upload failed:", error);
          throw CustomErrorHandler.serverError("Failed to upload one or more images.");
        }
      } else {
        throw CustomErrorHandler.badRequest("Service images are required.");
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

  // generateTimeSlots(openTime, closeTime) {
  //   const slots = []
  //   let start = DateTime.fromFormat(openTime, "HH:mm")
  //   let end = DateTime.fromFormat(closeTime, "HH:mm")
  //   if (end <= start) {
  //     end = end.plus({ days: 1 })
  //   }

  //   let current = start
  //   while (current < end) {
  //     const slotEnd = current.plus({ hours: 1 })
  //     if (slotEnd <= end) {
  //       slots.push({
  //         startTime: current.toFormat("HH:mm"),
  //         endTime: slotEnd.toFormat("HH:mm"),
  //       })
  //     }
  //     current = slotEnd
  //   }

  //   return slots
  // },
  // generateTimeSlots(openTime, closeTime, durationInMinutes = 60) {
  //   const slots = []
  //   let start = DateTime.fromFormat(openTime, "HH:mm")
  //   let end = DateTime.fromFormat(closeTime, "HH:mm")

  //   if (end <= start) {
  //     end = end.plus({ days: 1 })
  //   }

  //   let current = start
  //   while (current < end) {
  //     const slotEnd = current.plus({ minutes: durationInMinutes })

  //     if (slotEnd <= end) {
  //       slots.push({
  //         startTime: current.toFormat("HH:mm"),
  //         endTime: slotEnd.toFormat("HH:mm"),
  //       })
  //     } else {
  //       // Optional: Add partial slot if there's at least 30 minutes remaining
  //       const remainingMinutes = end.diff(current, "minutes").toObject().minutes
  //       if (remainingMinutes >= 30) {
  //         slots.push({
  //           startTime: current.toFormat("HH:mm"),
  //           endTime: end.toFormat("HH:mm"),
  //           isPartial: true, // Optional flag to indicate it's not full duration
  //         })
  //       }
  //       break
  //     }

  //     current = slotEnd
  //   }

  //   return slots
  // },
  generateTimeSlots(openTime, closeTime, durationInMinutes = 60) {
    const slots = []
    let start = DateTime.fromFormat(openTime, "HH:mm")
    let end = DateTime.fromFormat(closeTime, "HH:mm")

    // Handle overnight (e.g. 22:00 to 01:00)
    if (end <= start) {
      end = end.plus({ days: 1 })
    }

    let current = start
    while (current < end) {
      const slotEnd = current.plus({ minutes: durationInMinutes })

      // If full duration fits, push normal slot
      if (slotEnd <= end) {
        slots.push({
          startTime: current.toFormat("HH:mm"),
          endTime: slotEnd.toFormat("HH:mm"),
          isPartial: false,
        })
        current = slotEnd
      } else {
        // Remaining time (partial slot)
        slots.push({
          startTime: current.toFormat("HH:mm"),
          endTime: end.toFormat("HH:mm"),
          isPartial: true,
        })
        break
      }
    }

    return slots
  },

  calculateDuration(startTime, endTime) {
    let start = DateTime.fromFormat(startTime, "HH:mm")
    let end = DateTime.fromFormat(endTime, "HH:mm")

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
