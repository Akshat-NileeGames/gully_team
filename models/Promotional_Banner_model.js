import mongoose from "mongoose";

const Promotional_Banner_model = new mongoose.Schema(
  {
    banner_title: {
      type: String,
      required: true
    },
    banner_image: {
      type: String,
      required: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    bannerforsports: {
      type: String,
      enum: ['cricket', 'football', 'others'],
      default: 'cricket',
      required: true,
    },
    bannerlocationaddress: {
      type: String,
      required: true
    },
    locationHistory: {
      point: {
        type: {
          type: String,
          enum: ["Point"],
          default: "Point",
          required: false,
        },
        coordinates: {
          type: [Number],
          required: true,
        },
      },
    },
    packageId: { type: mongoose.Schema.Types.ObjectId, ref: "Package" },

    paymentid: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Bannerpayment",
    },

    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  }
);

Promotional_Banner_model.index({ "locationHistory.point": "2dsphere" });
export default mongoose.model("PromotionalBanner", Promotional_Banner_model);
