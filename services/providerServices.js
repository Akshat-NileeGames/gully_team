import { Ground, Booking, User, Package, Individual, Category } from "../models/index.js"
import CustomErrorHandler from "../helpers/CustomErrorHandler.js"
import { DateTime } from "luxon"
import mongoose from "mongoose"

const ProviderServices = {
  async createVenue(data) {
    try {
      console.log("These api is called");
      const userInfo = global.user
      const packageInfo = await Package.findById(data.packageRef)
      if (!packageInfo) throw CustomErrorHandler.notFound("Package not found")

      const user = await User.findById(userInfo.userId)
      if (!user) throw CustomErrorHandler.notFound("User not found")
      console.log(packageInfo);
      // Validate sport pricing if provided
      if (data.sportPricing && data.sportPricing.length > 0) {
        const providedSports = data.sportPricing.map((sp) => sp.sport)
        const missingPricing = data.venue_sports.filter((sport) => !providedSports.includes(sport))

        if (missingPricing.length > 0) {
          throw CustomErrorHandler.badRequest(`Pricing missing for sports: ${missingPricing.join(", ")}`)
        }
      }
      console.log(DateTime.now().plus({ month: packageInfo.duration }).toJSDate());

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
        subscriptionExpiry: DateTime.now().plus({ month: packageInfo.duration }).toJSDate(),
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
      } = bookingData;
      const userInfo = global.user
      const ground = await Ground.findById(venueId);
      if (!ground) throw CustomErrorHandler.notFound("Venue not found ");

      if (!ground.venue_sports.includes(sport)) throw CustomErrorHandler.badRequest(`Venue does not support ${sport}`);

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
        }
      }
      const booking = new Booking({
        venueId,
        sport,
        bookingPattern: bookingPattern || "single_slots",
        scheduledDates,
        durationInHours: durationInHours,
        totalAmount: totalamount,
        paymentStatus: paymentStatus || "Pending",
        bookingStatus: bookingStatus || "Pending",
        userId: userInfo.userId,
      });

      await booking.save();
      await Ground.findByIdAndUpdate(venueId, { $inc: { totalBookings: 1 } });

      return await booking.populate("venueId userId");
    } catch (error) {
      console.log("Failed to book venue:", error);
      throw error;
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
      //TODO:Need to remove these comment below
      console.log("The current location:", userLocation);
      // Find shops with expired subscriptions within the defined radius
      const expiredGround = await Ground.find({
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
        const expiredGroundIds = expiredGround.map(ground => ground._id);
        await Ground.updateMany(
          { _id: { $in: expiredGroundIds } },
          { $set: { isSubscriptionPurchased: false } }
        );
      }
      const nearbyVenue = await Ground.aggregate([
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
        const expiredindividualPackageIds = expiredindividualPackage.map(ground => ground._id);
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
            paymentMethods: 1,
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

      const venues = await Ground.aggregate(pipeline)

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

      const countResult = await Ground.aggregate(countPipeline)
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
      const { groundId, sport = "all" } = data;

      // Check if ground exists
      const isGroundExists = await Ground.findById(groundId);
      if (!isGroundExists) {
        return CustomErrorHandler.notFound("Ground Not Found");
      }

      // Today's date range
      const today = new Date();
      const startOfToday = new Date(today.setHours(0, 0, 0, 0));
      const endOfToday = new Date(today.setHours(23, 59, 59, 999));

      // Build query
      const matchQuery = {
        venueId: mongoose.Types.ObjectId(groundId),
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
      const { groundId, sport = 'all', page = 1 } = data;
      const limit = 10
      const isGroundExists = await Ground.findById(groundId);
      if (!isGroundExists) {
        return CustomErrorHandler.notFound("Ground Not Found");
      }
      const now = new Date()
      const skip = (page - 1) * limit

      const matchQuery = {
        venueId: mongoose.Types.ObjectId(groundId),
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
      const { groundId, sport = "all", page = 1 } = data;
      const limit = 10;
      const skip = (page - 1) * limit;

      // Validate ground
      const groundExists = await Ground.findById(groundId);
      if (!groundExists) {
        throw CustomErrorHandler.notFound("Ground Not Found");
      }

      // Date logic
      const now = new Date();
      const startOfToday = new Date(now.setHours(0, 0, 0, 0));

      // Build query for past bookings
      const matchQuery = {
        venueId: mongoose.Types.ObjectId(groundId),
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
    // Find Ground with expired subscriptions within the defined radius
    const expiredGround = await Ground.find({
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
      const expiredGroundIds = expiredGround.map(ground => ground._id);
      await Ground.updateMany(
        { _id: { $in: expiredGroundIds } },
        { $set: { isSubscriptionPurchased: false } }
      );
    }
    console.log("The current location:", userLocation);
    const ground = await Ground.aggregate([
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
    console.log(ground);
    return ground;
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
  async getGroundBookings(data) {
    try {
      const { groundId, startDate, endDate, sport, status, paymentStatus, page = 1, limit = 10 } = data

      const matchQuery = {
        venueId: groundId,
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
      console.error("Failed to get ground bookings:", error)
      throw error
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


  async getDashboardAnalytics(groundId) {
    try {
      const today = new Date()
      const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate())
      const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59)

      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59)

      // Today's bookings
      const todayBookings = await Booking.countDocuments({
        venueId: groundId,
        "scheduledDates.date": { $gte: startOfToday, $lte: endOfToday },
      })

      // Today's revenue
      const todayRevenueResult = await Booking.aggregate([
        {
          $match: {
            venueId: mongoose.Types.ObjectId(groundId),
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
            venueId: mongoose.Types.ObjectId(groundId),
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
        { $match: { venueId: mongoose.Types.ObjectId(groundId) } },
        { $group: { _id: "$bookingStatus", count: { $sum: 1 } } }
      ])

      // Payment status distribution
      const paymentStats = await Booking.aggregate([
        { $match: { venueId: mongoose.Types.ObjectId(groundId) } },
        { $group: { _id: "$paymentStatus", count: { $sum: 1 } } }
      ])

      // Sport-wise bookings
      const sportStats = await Booking.aggregate([
        { $match: { venueId: mongoose.Types.ObjectId(groundId) } },
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

  async getRevenueAnalytics(groundId, period = "month") {
    try {
      if (!groundId.match(/^[0-9a-fA-F]{24}$/)) {
        throw CustomErrorHandler.badRequest("Invalid ground ID format")
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
            venueId: mongoose.Types.ObjectId(groundId),
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

  async getSportsAnalytics(groundId) {
    try {
      if (!groundId.match(/^[0-9a-fA-F]{24}$/)) {
        throw CustomErrorHandler.badRequest("Invalid ground ID format")
      }

      const sportAnalytics = await Booking.aggregate([
        { $match: { venueId: mongoose.Types.ObjectId(groundId) } },
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

      // Process experience data
      const processedExperience = (data.experience || []).map((exp) => ({
        title: exp.title,
        organization: exp.organization,
        startDate: exp.startDate,
        endDate: exp.endDate || null,
        isCurrently: exp.isCurrently || false,
        description: exp.description || "",
      }))

      // Process certificates data
      const processedCertificates = (data.certificates || []).map((cert) => ({
        name: cert.name,
        issuedBy: cert.issuedBy,
        issueDate: cert.issueDate,
      }))

      const individual = new Individual({
        profileImageUrl: data.profileImageUrl || "",
        fullName: data.fullName,
        bio: data.bio,
        phoneNumber: data.phoneNumber,
        email: data.email,
        panNumber: data.panNumber,
        yearOfExperience: data.yearOfExperience,
        sportsCategories: data.sportsCategories,
        selectedServiceTypes: data.selectedServiceTypes,
        serviceImageUrls: data.serviceImageUrls,
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
        userId: userInfo.userId
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

  //#region  New Changes API
  async getDashboardAnalytics({ groundId, sport, period = "month", startDate, endDate }) {
    try {

      const ground = await Ground.findById(groundId)
      if (!ground) {
        throw CustomErrorHandler.notFound("Ground not found")
      }

      const dateRange = this.getDateRange(period, startDate, endDate)
      const matchQuery = {
        venueId: mongoose.Types.ObjectId(groundId),
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
        this.getPopularTimeSlots(groundId, sport, dateRange),

        // Sport performance
        Booking.aggregate([
          { $match: { venueId: mongoose.Types.ObjectId(groundId), createdAt: { $gte: dateRange.start, $lte: dateRange.end } } },
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
          venueId: mongoose.Types.ObjectId(groundId),
          createdAt: { $gte: previousPeriod.start, $lte: previousPeriod.end },
          ...(sport && sport !== 'all' ? { sport: new RegExp(`^${sport}$`, "i") } : {})
        }),
        Booking.aggregate([
          {
            $match: {
              venueId: mongoose.Types.ObjectId(groundId),
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

  async getRevenueAnalytics({ groundId, period = "month", sport, comparison = false }) {
    try {
      if (!groundId.match(/^[0-9a-fA-F]{24}$/)) {
        throw CustomErrorHandler.badRequest("Invalid ground ID format")
      }

      const dateRange = this.getDateRange(period)
      const matchQuery = {
        venueId: mongoose.Types.ObjectId(groundId),
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
            venueId: mongoose.Types.ObjectId(groundId),
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
              venueId: mongoose.Types.ObjectId(groundId),
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

  async getSportsAnalytics({ groundId, period = "month" }) {
    try {
      if (!groundId.match(/^[0-9a-fA-F]{24}$/)) {
        throw CustomErrorHandler.badRequest("Invalid ground ID format")
      }

      const dateRange = this.getDateRange(period)

      const sportsData = await Booking.aggregate([
        {
          $match: {
            venueId: mongoose.Types.ObjectId(groundId),
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
            venueId: mongoose.Types.ObjectId(groundId),
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

  async getTimeSlotAnalytics({ groundId, sport, period = "month" }) {
    try {
      if (!groundId.match(/^[0-9a-fA-F]{24}$/)) {
        throw CustomErrorHandler.badRequest("Invalid ground ID format")
      }

      const dateRange = this.getDateRange(period)
      const matchQuery = {
        venueId: mongoose.Types.ObjectId(groundId),
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

  async getBookingAnalytics({ groundId, sport, period = "month" }) {
    try {
      if (!groundId.match(/^[0-9a-fA-F]{24}$/)) {
        throw CustomErrorHandler.badRequest("Invalid ground ID format")
      }

      const dateRange = this.getDateRange(period)
      const matchQuery = {
        venueId: mongoose.Types.ObjectId(groundId),
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

  async getPerformanceAnalytics({ groundId, sport }) {
    try {
      if (!groundId.match(/^[0-9a-fA-F]{24}$/)) {
        throw CustomErrorHandler.badRequest("Invalid ground ID format")
      }

      const ground = await Ground.findById(groundId)
      if (!ground) {
        throw CustomErrorHandler.notFound("Ground not found")
      }

      const matchQuery = { venueId: mongoose.Types.ObjectId(groundId) }
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
        this.calculateUtilizationRate(groundId, sport),

        // Monthly growth
        this.calculateMonthlyGrowth(groundId, sport)
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

  async getPopularTimeSlots(groundId, sport, dateRange) {
    const matchQuery = {
      venueId: mongoose.Types.ObjectId(groundId),
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

  async calculateUtilizationRate(groundId, sport) {
    // This is a simplified calculation
    // You might want to implement more sophisticated logic based on your business rules
    const totalSlots = 12 // Assuming 12 hours of operation per day
    const daysInMonth = 30
    const totalAvailableSlots = totalSlots * daysInMonth

    const bookedSlots = await Booking.aggregate([
      {
        $match: {
          venueId: mongoose.Types.ObjectId(groundId),
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

  async calculateMonthlyGrowth(groundId, sport) {
    const currentMonth = new Date()
    const previousMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)
    const currentMonthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)

    const [currentBookings, previousBookings] = await Promise.all([
      Booking.countDocuments({
        venueId: mongoose.Types.ObjectId(groundId),
        createdAt: { $gte: currentMonthStart },
        ...(sport && sport !== 'all' ? { sport: new RegExp(`^${sport}$`, "i") } : {})
      }),
      Booking.countDocuments({
        venueId: mongoose.Types.ObjectId(groundId),
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
  }


}

export default ProviderServices
