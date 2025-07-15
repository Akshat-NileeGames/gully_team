import mongoose from "mongoose"

const payoutSchema = new mongoose.Schema(
  {
    razorpayPayoutId: {
      type: String,
      unique: true,
      sparse: true,
    },
    fundAccountId: {
      type: String,
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    venueId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Venue",
      required: true,
    },
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      sparse: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 100,
    },
    currency: {
      type: String,
      default: "INR",
      enum: ["INR"],
    },
    mode: {
      type: String,
      default: "UPI",
      enum: ["UPI", "NEFT", "RTGS", "IMPS"],
    },
    purpose: {
      type: String,
      enum: ["refund", "cashback", "payout", "salary", "utility bill", "vendor bill"],
      required: true,
    },
    referenceId: {
      type: String,
      maxlength: 40,
      required: true,
      unique: true,
    },
    narration: {
      type: String,
      maxlength: 30,
    },
    notes: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    fees: {
      type: Number,
      default: 0,
    },
    tax: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ["queued", "pending", "rejected", "processing", "processed", "cancelled", "reversed", "failed"],
      default: "queued",
    },
    utr: {
      type: String,
      sparse: true,
    },
    batchId: {
      type: String,
      sparse: true,
    },
    statusDetails: {
      description: String,
      source: String,
      reason: String,
    },
    feeType: {
      type: String,
      sparse: true,
    },
    processedAt: {
      type: Date,
    },
    lastSyncAt: {
      type: Date,
    },
    razorpayResponse: {
      type: mongoose.Schema.Types.Mixed,
    },
    retryCount: {
      type: Number,
      default: 0,
    },
    maxRetries: {
      type: Number,
      default: 5,
    },
    lastRetryAt: {
      type: Date,
    },
    failureReason: {
      type: String,
    },
    idempotencyKey: {
      type: String,
      unique: true,
      required: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
)

payoutSchema.index({ userId: 1, createdAt: -1 })
payoutSchema.index({ venueId: 1, createdAt: -1 })
payoutSchema.index({ status: 1, createdAt: -1 })
payoutSchema.index({ razorpayPayoutId: 1 })
payoutSchema.index({ referenceId: 1 })
payoutSchema.index({ idempotencyKey: 1 })
payoutSchema.index({ retryCount: 1, status: 1 })
payoutSchema.index({ lastSyncAt: 1, status: 1 })

export default mongoose.model("Payout", payoutSchema)
