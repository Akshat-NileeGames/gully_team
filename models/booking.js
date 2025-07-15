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
      enum: ["single_slots", "multiple_slots", "full_day_booking", "week_booking"],
      default: "single_slots",
    },
    scheduledDates: [
      {
        date: {
          type: Date,
          required: true
        },
        timeSlots: [
          {
            startTime: {
              type: String,
              required: true
            },
            endTime: {
              type: String,
              required: true
            },
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
      default: 0
    },
  },
  { timestamps: true },
)

bookingSchema.index({ venueId: 1, "scheduledDates.date": 1, sport: 1 })
bookingSchema.index({ userId: 1, bookingStatus: 1 })
bookingSchema.index({ "scheduledDates.date": 1, bookingStatus: 1 })

export default mongoose.model("Booking", bookingSchema)
