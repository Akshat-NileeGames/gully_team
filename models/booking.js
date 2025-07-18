import mongoose from "mongoose"

const bookingSchema = new mongoose.Schema(
  {
    venueId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Venue",
      required: true,
    },
    sport: {
      type: String,
      required: true,
    },
    bookingPattern: {
      type: String,
      enum: ["single_slots", "multiple_slots", "full_day_booking", "multi_day_booking", "week_booking"],
      default: "single_slots",
    },
    scheduledDates: [
      {
        date: {
          type: Date,
          required: true,
        },
        endDate: {
          type: Date,
          required: false,
        },
        isFullDay: {
          type: Boolean,
          default: false,
        },

        timeSlots: [
          {
            startTime: {
              type: String,
              required: function () {
                return !this.parent().isFullDay
              },
            },
            endTime: {
              type: String,
              required: function () {
                return !this.parent().isFullDay
              },
            },
          },
        ],
      },
    ],
    isMultiDay: {
      type: Boolean,
      default: false,
    },
    multiDayStartDate: {
      type: Date,
      required: function () {
        return this.isMultiDay
      },
    },
    multiDayEndDate: {
      type: Date,
      required: function () {
        return this.isMultiDay
      },
    },
    totalDays: {
      type: Number,
      default: 1,
    },
    durationInHours: {
      type: Number,
      required: true,
    },
    totalAmount: {
      type: Number,
      required: true,
    },
    dailyRate: {
      type: Number,
      required: function () {
        return this.isMultiDay || this.bookingPattern === "full_day_booking"
      },
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "successful", "failed", "refunded"],
      default: "pending",
    },
    bookingStatus: {
      type: String,
      enum: ["pending", "confirmed", "cancelled", "completed"],
      default: "pending",
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    cancellationReason: {
      type: String,
    },
    refundAmount: {
      type: Number,
      default: 0,
    },
    // Pricing breakdown for multi-day bookings
    pricingBreakdown: {
      basePrice: Number,
      multiDayDiscount: Number,
      totalBeforeDiscount: Number,
      discountAmount: Number,
      finalAmount: Number,
    },
  },
  { timestamps: true },
)

bookingSchema.index({ venueId: 1, "scheduledDates.date": 1, sport: 1 })
bookingSchema.index({ userId: 1, bookingStatus: 1 })
bookingSchema.index({ "scheduledDates.date": 1, bookingStatus: 1 })
bookingSchema.index({ isMultiDay: 1, multiDayStartDate: 1, multiDayEndDate: 1 })

export default mongoose.model("Booking", bookingSchema)
