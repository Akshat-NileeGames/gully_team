import mongoose from "mongoose";


const package_schema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    duration: {
      type: String,
      required: true,
    },
    packageFor: {
      type: String,
      required: true,
    },
    features: {
      type: [String],
      required: false,
    },
    description: {
      type: String,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    endDate: {
      type: Date,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },

    //For sponsorship
    maxMedia: {
      type: Number,
      default: 0,
    },
    maxVideos: {
      type: Number,
      default: 0,
    },
    sponsorshipDetails: {
      type: String,
      default: "",
    },

    //For shop
    MaxEditAllowed: {
      type: Number,
      default: 0
    }

  },
  {
    timestamps: true,
  }
);


export default mongoose.model("Package", package_schema);
