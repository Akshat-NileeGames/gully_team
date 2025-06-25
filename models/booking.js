import mongoose from "mongoose"

const bookingSchema = new mongoose.Schema(
  {
    venueType: {
      type: String,
      enum: ["Open Ground", "Turf", "Stadium"],
      required: true,
    },
    venueId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Ground",
      required: true,
    },
    sport: {
      type: String,
      required: true,
    },
    bookingPattern: {
      type: String,
      enum: ["single", "multiple_slots", "full_day", "week_booking"],
      default: "single",
    },
    singleSlot: {
      startTime: { type: String },
      endTime: { type: String },
    },
    multipleSlots: [
      {
        startTime: String,
        endTime: String,
      },
    ],
    scheduledDates: [
      {
        date: { type: Date, required: true },
        timeSlots: [
          {
            startTime: { type: String, required: true },
            endTime: { type: String, required: true },
          },
        ],
      },
    ],
    durationInHours: {
      type: Number,
      required: true,
    },
    totalAmount: {
      type: Number,
      required: true,
    },
    paymentMethod: {
      type: String,
      enum: ["Cash", "UPI", "Credit Card", "Debit Card", "Bank Transfer"],
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "completed", "failed", "refunded"],
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
    specialRequests: {
      type: String,
    },
    cancellationReason: {
      type: String,
    },
    refundAmount: {
      type: Number,
    },
  },
  { timestamps: true },
)

bookingSchema.index({ venueId: 1, "scheduledDates.date": 1, sport: 1 })
bookingSchema.index({ userId: 1, bookingStatus: 1 })
bookingSchema.index({ "scheduledDates.date": 1, bookingStatus: 1 })

export default mongoose.model("Booking", bookingSchema)
