import { Ground, Booking, User, Package, Individual } from "../models/index.js"
import CustomErrorHandler from "../helpers/CustomErrorHandler.js"
import { DateTime } from "luxon"
import mongoose from "mongoose"
const ProviderServices = {
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
      const { query, latitude, longitude, page, limit, radius, sport, venueType, priceRange } = filters
      const MAX_DISTANCE_METERS = Math.min(radius * 1000, 15000) // Max 15km

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
      const { query, latitude, longitude, page, limit, radius, sport, serviceType, experienceRange, ageGroup } = filters
      const MAX_DISTANCE_METERS = Math.min(radius * 1000, 15000) // Max 15km

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

  async combinedSearch(filters) {
    try {
      const { query, latitude, longitude, page, limit, radius } = filters

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
      if (!groundId.match(/^[0-9a-fA-F]{24}$/)) {
        throw CustomErrorHandler.badRequest("Invalid ground ID format")
      }

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
        locationHistory: {
          point: {
            type: "Point",
            coordinates: [Number.parseFloat(data.longitude), Number.parseFloat(data.latitude)],
            selectLocation: data.selectLocation,
          },
        },
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
}

export default ProviderServices
