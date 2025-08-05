import mongoose from "mongoose"

const venueSchema = new mongoose.Schema(
  {
    venueImages: [
      {
        type: String,
        required: true,
      },
    ],
    venue_name: {
      type: String,
      required: true,
    },
    venue_contact: {
      type: String,
      required: true,
    },
    venue_description: {
      type: String,
      required: true,
    },
    venue_address: {
      type: String,
      required: true,
    },
    locationHistory: {
      point: {
        type: {
          type: String,
          enum: ["Point"],
          default: "Point",
          required: false,
        },
        coordinates: {
          type: [Number],
          required: true,
        },
        selectLocation: String,
      },
    },
    venue_type: {
      type: String,
      enum: ["Open Venue", "Turf", "Stadium"],
      default: "Turf",
    },
    venue_timeslots: {
      Monday: {
        isOpen: Boolean,
        openTime: String,
        closeTime: String,
      },
      Tuesday: {
        isOpen: Boolean,
        openTime: String,
        closeTime: String,
      },
      Wednesday: {
        isOpen: Boolean,
        openTime: String,
        closeTime: String,
      },
      Thursday: {
        isOpen: Boolean,
        openTime: String,
        closeTime: String,
      },
      Friday: {
        isOpen: Boolean,
        openTime: String,
        closeTime: String,
      },
      Saturday: {
        isOpen: Boolean,
        openTime: String,
        closeTime: String,
      },
      Sunday: {
        isOpen: Boolean,
        openTime: String,
        closeTime: String,
      },
    },
    venue_sports: [
      {
        type: String,
        required: true,
      },
    ],

    sportPricing: [
      {
        sport: {
          type: String,
          required: true,
        },
        perHourCharge: {
          type: Number,
          required: true,
        },
        sports_playable_area: {
          type: Number,
          required: true,
          default: 0,
        },
        venue_surfacetype: {
          type: String,
          enum: [
            "PVC",
            "SYNTHETIC_PVC",
            "EIGHT_LAYERED_ACRYLIC_SURFACE",
            "WOODEN",
            "NATURAL_GRASS_LANE",
            "ARTIFICIAL_GRASS_LANE",
            "HARD_COURT",
            "NATURAL_GRASS_TURF",
            "ARTIFICIAL_ICE",
            "ARTIFICIAL_TURF_INFILL",
            "CANVAS",
            "CARPET",
            "CLAY",
            "COMPOSITE_DECKING",
            "CONCRETE",
            "DIRT",
            "FOAM",
            "HYBRID_TURF",
            "ICE",
            "POLYURETHANE",
            "RUBBER",
            "SAND",
            "SYNTHETIC_ICE",
            "SYNTHETIC_RUBBER_TRACK",
            "TABLE_TOP",
            "TATAMI",
            "TILE",
            "VINYL",
          ],
          default: "PVC",
        },
      },
    ],
    upiId: {
      type: String,
      required: true,
    },
    venuefacilities: {
      isWaterAvailable: { type: Boolean, default: false },
      isParkingAvailable: { type: Boolean, default: false },
      isEquipmentProvided: { type: Boolean, default: false },
      isWashroomAvailable: { type: Boolean, default: false },
      isChangingRoomAvailable: { type: Boolean, default: false },
      isFloodlightAvailable: { type: Boolean, default: false },
      isSeatingLoungeAvailable: { type: Boolean, default: false },
      isFirstAidAvailable: { type: Boolean, default: false },
      isWalkingTrackAvailable: { type: Boolean, default: false },
    },
    venue_rules: [
      {
        type: String,
      },
    ],
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    isSubscriptionPurchased: {
      type: Boolean,
      default: false,
    },
    packageRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Package",
    },
    subscriptionExpiry: {
      type: Date,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    totalBookings: {
      type: Number,
      default: 0,
    },
    totalAmout: {
      type: Number,
      default: 0,
    },
    amountNeedToPay: {
      type: Number,
      default: 0,
    },
    // New field to track total amount paid to venue
    totalAmountPaid: {
      type: Number,
      default: 0,
    },
    // Track payout history
    payoutHistory: [
      {
        amount: Number,
        paidAt: Date,
        payoutId: String,
        razorpayPayoutId: String,
        status: String,
      },
    ],
    razorpay_fund_account_id: {
      type: String,
      default: "",
    },
    razorpaycontactId: {
      type: String,
      default: "",
    },
  },
  { timestamps: true },
)

venueSchema.index({ "locationHistory.point": "2dsphere" })
export default mongoose.model("Venue", venueSchema)
