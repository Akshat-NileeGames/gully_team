import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      required: true,
      unique: true, // Ensure no duplicate payment records
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
    paymentfor: {
      type: String,
      required: false,
      enum: ['tournament', 'banner', 'Sponsor']
    },
    amountPaid: {
      type: Number,
      required: true,
      min: 0,
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
