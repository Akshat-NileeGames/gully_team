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
            required: true,
        },
        bookingDate: {
            type: Date,
            required: true,
        },
        timeSlot: {
            startTime: {
                type: String,
                required: true,
            },
            endTime: {
                type: String,
                required: true,
            },
        },
        duration: {
            type: Number, // in hours
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
            enum: ["confirmed", "cancelled", "completed", "no-show"],
            default: "confirmed",
        },
        specialRequests: {
            type: String,
        },
        cancellationReason: {
            type: String,
        },
        refundAmount: {
            type: Number,
            default: 0,
        },
    },
    { timestamps: true },
)

export default mongoose.model("Booking", bookingSchema)
