import mongoose from "mongoose";
import autopopulate from "mongoose-autopopulate";

const orderHistorySchema = new mongoose.Schema({

  orderId: {
    type: String,
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    autopopulate: {
      select: "phoneNumber email fullName ",
    },
  },

  tournamentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Tournament",
    autopopulate: {
      select: "tournamentName tournamentStartDateTime tournamentEndDateTime ",
    },
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
  shopId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Shop",
    required: false,
  },
  PackageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Package",
    required: false,
  },
  razorpay_paymentId: {
    type: String,
    required: true,
  },
  ordertype: {
    type: String,
    required: true,
    enum: ['tournament', 'banner', 'sponser', 'individual', 'venue', 'booking', 'Shop', 'individual-subscription-Renew','venue-subscription-Renew']
  },
  baseAmount: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  processingFee: {
    type: Number,
    min: 0,
    default: 0
  },
  convenienceFee: {
    type: Number,
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
  currency: { type: String, required: true },

  receipt: { type: String, required: true },

  status: { type: String, enum: ["Pending", "Successful", "Failed"], default: "Pending" },

  createdAt: { type: Date, default: Date.now },
});

orderHistorySchema.set("timestamps", true);
orderHistorySchema.plugin(autopopulate);
export default mongoose.model("OrderHistory", orderHistorySchema);
