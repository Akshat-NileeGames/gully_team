import mongoose from "mongoose"

const bookingSchema = new mongoose.Schema(
  {
    bookingType: {
      type: String,
      enum: ["ground", "individual"],
      required: true,
    },
    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "bookingType",
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    // For ground bookings - specify which sport
    sport: {
      type: String,
      required: function () {
        return this.bookingType === "ground"
      },
    },
    bookingDate: {
      type: Date,
      required: true,
    },
    // Support for multiple date bookings (week/month bookings)
    bookingDates: [
      {
        date: Date,
        timeSlots: [
          {
            startTime: String,
            endTime: String,
          },
        ],
      },
    ],
    timeSlot: {
      startTime: {
        type: String,
        required: function () {
          return !this.bookingDates || this.bookingDates.length === 0
        },
      },
      endTime: {
        type: String,
        required: function () {
          return !this.bookingDates || this.bookingDates.length === 0
        },
      },
    },
    // Multiple time slots for single day
    timeSlots: [
      {
        startTime: String,
        endTime: String,
      },
    ],
    duration: {
      type: Number, // in hours
      required: true,
    },
    totalAmount: {
      type: Number,
      required: true,
    },
    bookingStatus: {
      type: String,
      enum: ["pending", "confirmed", "cancelled", "completed"],
      default: "pending",
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "completed", "failed", "refunded"],
      default: "pending",
    },
    paymentMethod: {
      type: String,
      enum: ["Cash", "UPI", "Credit Card", "Debit Card", "Bank Transfer"],
      required: true,
    },
    specialRequests: String,
    cancellationReason: String,
    refundAmount: Number,
    // Booking type: single, multiple_slots, full_day, week_booking
    bookingPattern: {
      type: String,
      enum: ["single", "multiple_slots", "full_day", "week_booking"],
      default: "single",
    },
  },
  { timestamps: true },
)

// Compound index for efficient queries
bookingSchema.index({ serviceId: 1, bookingDate: 1, sport: 1 })
bookingSchema.index({ userId: 1, bookingStatus: 1 })
bookingSchema.index({ bookingDate: 1, bookingStatus: 1 })

export default mongoose.model("Booking", bookingSchema)
