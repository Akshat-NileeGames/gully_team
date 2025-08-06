import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      required: true,
      unique: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    tournamentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tournament",
      required: false,
    },
    bannerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PromotionalBanner",
      required: false,
    },
    venueId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Venue",
      required: false,
    },
    individualId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Individual",
      required: false,
    },
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: false,
    },
    paymentfor: {
      type: String,
      required: false,
      enum: ['tournament', 'banner', 'sponser', 'individual', 'venue', 'booking', 'Shop', 'individual-subscription-Renew', 'venue-subscription-Renew']
    },
    razorpay_paymentId: {
      type: String,
      required: true,
    },
    baseAmount: {
      type: Number,
      required: true,
      min: 0,
      default: 0
    },
    processingFee: {
      type: Number,
      required: true,
      min: 0,
      default: 0
    },
    convenienceFee: {
      type: Number,
      required: true,
      min: 0,
      default: 0
    },
    gstamount: {
      type: Number,
      required: true,
      min: 0,
      default: 0
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
      default: 0
    },
    paymentStatus: {
      type: String,
      enum: ["Pending", "Successful", "Failed"],
      default: "Pending",
    },
    paymentMode: {
      type: String,
      enum: ["Card", "UPI", "Net Banking", "Wallet"],
      required: true,
    },
    transactionId: {
      type: String,
      required: true,
    },
    paymentDate: {
      type: Date,
      default: Date.now,
    },
    receipt: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Payment", paymentSchema);
