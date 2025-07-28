import mongoose from "mongoose"

const timeSlotSchema = new mongoose.Schema({
  startTime: {
    type: String,
    required: true,
  },
  endTime: {
    type: String,
    required: true,
  },
  playableArea: {
    type: Number,
    required: true,
    min: 1,
  },
})

const scheduledDateSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
  },
  timeSlots: [timeSlotSchema],
})

const bookingSchema = new mongoose.Schema(
  {
    venueId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Venue",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    sport: {
      type: String,
      required: true,
    },
    bookingPattern: {
      type: String,
      enum: ["single_slots", "multiple_slots", "multiple_dates"],
      default: "single_slots",
    },
    scheduledDates: [scheduledDateSchema],
    durationInHours: {
      type: Number,
      required: true,
      min: 0.5,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
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
    // Time-sensitive booking fields
    isLocked: {
      type: Boolean,
      default: false,
    },
    lockedUntil: {
      type: Date,
      required: function () {
        return this.isLocked
      },
    },
    isPaymentConfirm: {
      type: Boolean,
      default: false,
    },
    sessionId: {
      type: String,
      required: function () {
        return this.isLocked
      },
    },
    // Existing fields
    cancellationReason: {
      type: String,
    },
    paymentId: {
      type: String,
    },
    razorpayOrderId: {
      type: String,
    },
    razorpayPaymentId: {
      type: String,
    },
    razorpaySignature: {
      type: String,
    },
  },
  {
    timestamps: true,
  },
)

// Existing indexes
bookingSchema.index({ venueId: 1, "scheduledDates.date": 1 })
bookingSchema.index({ userId: 1, createdAt: -1 })
bookingSchema.index({ bookingStatus: 1 })
bookingSchema.index({ paymentStatus: 1 })
bookingSchema.index({
  venueId: 1,
  sport: 1,
  bookingStatus: 1,
  "scheduledDates.date": 1,
  "scheduledDates.timeSlots.playableArea": 1,
})

// New indexes for time-sensitive booking
bookingSchema.index({ isLocked: 1, lockedUntil: 1, lockedBy: 1 })
bookingSchema.index({ sessionId: 1 })
bookingSchema.index({ lockedUntil: 1 }, { expireAfterSeconds: 0 })

const Booking = mongoose.model("Booking", bookingSchema)

export default Booking
