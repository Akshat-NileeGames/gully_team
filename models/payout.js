import mongoose from "mongoose"

const payoutSchema = new mongoose.Schema(
    {
        razorpayPayoutId: {
            type: String,
            unique: true,
            sparse: true
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        groundId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Ground",
            optional: true,
        },
        bookingId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Booking",
            optional: true,
        },
        recipientVpa: {
            type: String,
            required: true,
        },
        amount: {
            type: Number,
            required: true,
        },
        currency: {
            type: String,
            default: "INR",
        },
        purpose: {
            type: String,
            enum: ['refund', 'cashback', 'payout', 'salary', 'utility_bill', 'vendor_payments'],
            required: true,
        },
        description: {
            type: String,
            maxlength: 255,
        },
        reference_id: {
            type: String,
            maxlength: 40,
        },
        status: {
            type: String,
            enum: ['queued', 'pending', 'processed', 'cancelled', 'failed'],
            default: 'queued',
        },
        failureReason: {
            type: String,
        },
        processedAt: {
            type: Date,
        },
        razorpayResponse: {
            type: mongoose.Schema.Types.Mixed,
        },
        webhookData: {
            type: mongoose.Schema.Types.Mixed,
        },
        retryCount: {
            type: Number,
            default: 0,
        },
        maxRetries: {
            type: Number,
            default: 3,
        },
    },
    { 
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true }
    }
)

// Indexes for better query performance
payoutSchema.index({ userId: 1, createdAt: -1 })
payoutSchema.index({ status: 1, createdAt: -1 })
payoutSchema.index({ razorpayPayoutId: 1 })
payoutSchema.index({ groundId: 1, createdAt: -1 })

export default mongoose.model("Payout", payoutSchema)