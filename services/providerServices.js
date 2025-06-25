import { Ground, Booking, User, Package, Individual } from "../models/index.js"
import CustomErrorHandler from "../helpers/CustomErrorHandler.js"
import { DateTime } from "luxon"

const ProviderServices = {
  // ==================== GROUND SERVICES ====================

  async createGround(data) {
    try {
      const userInfo = global.user
      const packageInfo = await Package.findById(data.packageRef)
      if (!packageInfo) throw CustomErrorHandler.notFound("Package not found")

      const user = await User.findById(userInfo.userId)
      if (!user) throw CustomErrorHandler.notFound("User not found")

      // Validate sport pricing if provided
      if (data.sportPricing && data.sportPricing.length > 0) {
        const providedSports = data.sportPricing.map((sp) => sp.sport)
        const missingPricing = data.venue_sports.filter((sport) => !providedSports.includes(sport))

        if (missingPricing.length > 0) {
          throw CustomErrorHandler.badRequest(`Pricing missing for sports: ${missingPricing.join(", ")}`)
        }
      }

      const ground = new Ground({
        venue_name: data.venue_name,
        venue_description: data.venue_description,
        venue_address: data.venue_address,
        venue_contact: data.venue_contact,
        venue_type: data.venue_type,
        venue_surfacetype: data.venue_surfacetype,
        venue_sports: data.venue_sports,
        sportPricing: data.sportPricing || [],
        paymentMethods: data.paymentMethods,
        upiId: data.upiId,
        perHourCharge: data.perHourCharge,
        venuefacilities: data.venuefacilities,
        venue_rules: data.venue_rules || [],
        venueImages: data.venueImages,
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
        subscriptionExpiry: DateTime.now().plus({ days: packageInfo.duration }).toJSDate(),
      })

      await ground.save()
      return ground
    } catch (error) {
      console.log("Failed to create ground:", error)
      throw error
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
      const grounds = await Ground.find(query)
        .populate("userId", "name email")
        .populate("packageRef")
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
      console.log("Failed to get all grounds:", error)
      throw error
    }
  },

  async getGroundById(data) {
    try {
      if (!data.id.match(/^[0-9a-fA-F]{24}$/)) {
        throw CustomErrorHandler.badRequest("Invalid ground ID format")
      }

      const ground = await Ground.findById(data.id).populate("packageRef")

      if (!ground) {
        throw CustomErrorHandler.notFound("Ground not found")
      }

      return ground
    } catch (error) {
      console.log("Failed to get ground by id:", error)
      throw error
    }
  },

  async getUserGroundRegisteredGround() {
    try {
      const userInfo = global.user
      const user = await User.findById(userInfo.userId)
      if (!user) throw CustomErrorHandler.notFound("User not found")

      const grounds = await Ground.find({
        userId: userInfo.userId,
      }).populate("packageRef")

      return grounds
    } catch (error) {
      console.log("Failed to get user grounds:", error)
      throw error
    }
  },

  // ==================== GROUND BOOKING SERVICES ====================

  async bookGround(bookingData, userId) {
    try {
      const {
        venueId,
        venueType,
        sport,
        scheduledDates,
        paymentMethod,
        specialRequests,
        bookingPattern,
      } = bookingData;

      if (!venueId.match(/^[0-9a-fA-F]{24}$/)) {
        throw CustomErrorHandler.badRequest("Invalid venue ID format");
      }

      const ground = await Ground.findById(venueId);
      if (!ground) {
        throw CustomErrorHandler.notFound("Venue not found");
      }

      if (!ground.venue_sports.includes(sport)) {
        throw CustomErrorHandler.badRequest(`Venue does not support ${sport}`);
      }

      let totalDuration = 0;
      for (const dateSlot of scheduledDates) {
        const bookingDay = DateTime.fromJSDate(new Date(dateSlot.date)).toFormat("cccc");
        const dayTiming = ground.venue_timeslots[bookingDay];

        if (!dayTiming || !dayTiming.isOpen) {
          throw CustomErrorHandler.badRequest(`Venue is closed on ${bookingDay}`);
        }

        for (const slot of dateSlot.timeSlots) {
          const isAvailable = await this.checkGroundSlotAvailability(venueId, sport, dateSlot.date, slot);
          if (!isAvailable) {
            throw CustomErrorHandler.badRequest(
              `Slot ${slot.startTime} - ${slot.endTime} is unavailable on ${dateSlot.date}`
            );
          }
          totalDuration += this.calculateDuration(slot.startTime, slot.endTime);
        }
      }

      const pricePerHour = this.getSportPrice(ground, sport);
      const totalAmount = totalDuration * pricePerHour;

      const booking = new Booking({
        venueType,
        venueId,
        userId,
        sport,
        scheduledDates,
        durationInHours: totalDuration,
        totalAmount,
        paymentMethod,
        specialRequests,
        bookingPattern: bookingPattern || "single",
      });

      await booking.save();
      await Ground.findByIdAndUpdate(venueId, { $inc: { totalBookings: 1 } });

      return await booking.populate("venueId userId");
    } catch (error) {
      console.log("Failed to book venue:", error);
      throw error;
    }
  },

  async getAvailableSlots({ groundId, sport, date }) {
    try {
      const venue = await Ground.findById(groundId);
      if (!venue) {
        throw CustomErrorHandler.notFound("Venue not found");
      }

      if (!venue.venue_sports.map(s => s.toLowerCase()).includes(sport.toLowerCase())) {
        throw CustomErrorHandler.badRequest(`Venue does not support ${sport}`);
      }

      // Check if venue is open
      const bookingDay = DateTime.fromJSDate(new Date(date)).toFormat("cccc");
      const dayTiming = venue.venue_timeslots[bookingDay];
      if (!dayTiming || !dayTiming.isOpen) {
        return {
          availableSlots: [],
          bookedSlots: [],
          totalSlots: 0,
          sport,
          date,
          pricing: this.getSportPrice(venue, sport),
          message: `Venue is closed on ${bookingDay}`,
        };
      }

      // Generate all potential slots
      const allSlots = this.generateTimeSlots(dayTiming.openTime, dayTiming.closeTime);

      // Fetch existing bookings for that date
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);

      const existingBookings = await Booking.find({
        venueId: groundId,
        sport: new RegExp(`^${sport}$`, 'i'),
        bookingStatus: { $in: ["confirmed", "pending", "completed"] },
        "scheduledDates.date": { $gte: start, $lte: end },
      });

      // Flatten booked slots
      const bookedSlots = new Set();
      existingBookings.forEach(bk => {
        bk.scheduledDates.forEach(ds => {
          const dsDate = new Date(ds.date);
          if (dsDate >= start && dsDate <= end) {
            ds.timeSlots.forEach(slot => {
              bookedSlots.add(`${slot.startTime}-${slot.endTime}`);
            });
          }
        });
      });

      const availableSlots = allSlots.filter(slot => {
        return !bookedSlots.has(`${slot.startTime}-${slot.endTime}`);
      });

      return {
        availableSlots,
        bookedSlots: Array.from(bookedSlots),
        totalSlots: allSlots.length,
        sport,
        date,
        pricing: this.getSportPrice(venue, sport),
      };
    } catch (error) {
      console.log("Failed to get available slots:", error);
      throw error;
    }
  },

  async getBookedSlots(data) {
    try {
      const { groundId, sport, date } = data;
      const isGroundExist = await Ground.findById(groundId);
      if (!isGroundExist) return CustomErrorHandler.notFound("Venue Not Found");

      const queryDate = new Date(date);
      const startOfDay = new Date(queryDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(queryDate);
      endOfDay.setHours(23, 59, 59, 999);

      const bookings = await Booking.find({
        venueId: groundId,
        sport: new RegExp(`^${sport}$`, 'i'),
        bookingStatus: { $in: ["confirmed", "pending", "completed"] },
        $or: [
          { bookingDate: { $gte: startOfDay, $lte: endOfDay } },
          { "scheduledDates.date": { $gte: startOfDay, $lte: endOfDay } },
        ],
      });

      const bookedSlots = [];

      bookings.forEach((booking) => {
        if (booking.scheduledDates && booking.scheduledDates.length) {
          booking.scheduledDates.forEach((dateEntry) => {
            const entryDate = new Date(dateEntry.date);
            if (entryDate >= startOfDay && entryDate <= endOfDay && dateEntry.timeSlots && dateEntry.timeSlots.length) {
              dateEntry.timeSlots.forEach((slot) => {
                bookedSlots.push({
                  startTime: slot.startTime,
                  endTime: slot.endTime,
                  bookingId: booking._id,
                  userId: booking.userId,
                  status: booking.bookingStatus,
                });
              });
            }
          });
        }
      });

      return {
        bookedSlots,
        sport,
        date: queryDate,
        totalBookings: bookings.length,
      };
    } catch (error) {
      console.log("Failed to get booked slots:", error);
      throw error;
    }
  },
  async getGroundBookings(filters) {
    try {
      const {
        groundId,
        startDate,
        endDate,
        sport,
        status,
        page = 1,
        limit = 10,
      } = filters;

      if (!groundId.match(/^[0-9a-fA-F]{24}$/)) {
        throw CustomErrorHandler.badRequest("Invalid ground ID format");
      }

      const matchQuery = {
        venueId: groundId,
      };

      if (sport) {
        matchQuery.sport = new RegExp(`^${sport}$`, 'i'); // Case-insensitive match
      }

      if (status) {
        matchQuery.bookingStatus = status;
      }

      if (startDate || endDate) {
        const dateFilter = {};
        if (startDate) dateFilter.$gte = new Date(startDate);
        if (endDate) dateFilter.$lte = new Date(endDate);
        matchQuery["scheduledDates.date"] = dateFilter;
      }

      const skip = (page - 1) * limit;

      const bookings = await Booking.find(matchQuery)
        .populate("userId", "name email phone")
        .populate("venueId", "venue_name venue_address")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const total = await Booking.countDocuments(matchQuery);
      console.log(bookings);
      return {
        bookings,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: limit,
        },
      };
    } catch (error) {
      console.error("Failed to get ground bookings:", error);
      throw error;
    }
  },

  async checkMultipleDateAvailability(data) {
    try {
      const { groundId, sport, startDate, endDate, timeSlots } = data

      if (!groundId.match(/^[0-9a-fA-F]{24}$/)) {
        throw CustomErrorHandler.badRequest("Invalid ground ID format")
      }

      const ground = await Ground.findById(groundId)
      if (!ground) {
        throw CustomErrorHandler.notFound("Ground not found")
      }

      if (!ground.venue_sports.includes(sport)) {
        throw CustomErrorHandler.badRequest(`Ground does not support ${sport}`)
      }

      const availability = []
      const currentDate = DateTime.fromJSDate(new Date(startDate))
      const endDateTime = DateTime.fromJSDate(new Date(endDate))

      let date = currentDate
      while (date <= endDateTime) {
        const dayName = date.toFormat("cccc")
        const dayTiming = ground.venue_timeslots[dayName]

        if (!dayTiming || !dayTiming.isOpen) {
          availability.push({
            date: date.toJSDate(),
            available: false,
            reason: "Ground closed",
          })
        } else {
          const dayAvailability = {
            date: date.toJSDate(),
            available: true,
            slots: [],
          }

          for (const slot of timeSlots) {
            const isAvailable = await this.checkGroundSlotAvailability(groundId, sport, date.toJSDate(), slot)
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

  // ==================== INDIVIDUAL SERVICES ====================

  async createIndividual(data) {
    try {
      const userInfo = global.user
      const packageInfo = await Package.findById(data.packageRef)
      if (!packageInfo) throw CustomErrorHandler.notFound("Package not found")

      const user = await User.findById(userInfo.userId)
      if (!user) throw CustomErrorHandler.notFound("User not found")

      const individual = new Individual({
        fullName: data.fullName,
        bio: data.bio,
        phoneNumber: data.phoneNumber,
        email: data.email,
        yearOfExperience: data.yearOfExperience,
        sportsCategories: data.sportsCategories,
        certifications: data.certifications || [],
        profileImageUrl: data.profileImageUrl || "",
        hourlyRate: data.hourlyRate,
        serviceOptions: data.serviceOptions,
        availability: data.availability,
        location: data.location,
        userId: userInfo.userId,
        packageRef: data.packageRef,
        hasActiveSubscription: true,
        subscriptionExpiry: DateTime.now().plus({ days: packageInfo.duration }).toJSDate(),
      })

      await individual.save()
      return individual
    } catch (error) {
      console.log("Failed to create individual:", error)
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

  // ==================== INDIVIDUAL BOOKING SERVICES ====================

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

  // ==================== COMMON BOOKING SERVICES ====================

  async getUserBookings(filters, userId) {
    try {
      const { bookingType, status, page, limit } = filters
      const query = { userId }

      if (bookingType) query.bookingType = bookingType
      if (status) query.bookingStatus = status

      const skip = (page - 1) * limit
      const bookings = await Booking.find(query).populate("serviceId").skip(skip).limit(limit).sort({ createdAt: -1 })

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
      console.log("Failed to get user bookings:", error)
      throw error
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

  // ==================== HELPER METHODS ====================

  async checkGroundSlotAvailability(groundId, sport, date, timeSlot) {
    const booking = await Booking.findOne({
      serviceId: groundId,
      sport,
      bookingDate: new Date(date),
      $or: [
        {
          "timeSlot.startTime": timeSlot.startTime,
          "timeSlot.endTime": timeSlot.endTime,
        },
        {
          timeSlots: {
            $elemMatch: {
              startTime: timeSlot.startTime,
              endTime: timeSlot.endTime,
            },
          },
        },
      ],
      bookingStatus: { $in: ["confirmed", "pending"] },
    })

    return !booking
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

  getSportPrice(ground, sport) {
    const sportPricing = ground.sportPricing.find((sp) => sp.sport === sport)
    return sportPricing ? sportPricing.perHourCharge : ground.perHourCharge
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
}

export default ProviderServices
