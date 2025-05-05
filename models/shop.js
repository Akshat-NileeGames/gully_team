import mongoose from "mongoose";

const shopSchema = new mongoose.Schema({
    shopImage: {
        type: [String],
        required: true,
    },
    shopName: {
        type: String,
        required: true,
    },
    shopDescription: {
        type: String,
        required: true,
    },
    shopAddress: {
        type: String,
        required: true,
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
            selectLocation: String,
        },
    },
    shopContact: {
        type: String,
        required: true,
    },
    shopEmail: {
        type: String,
        required: true,
    },
    shoplink: {
        type: String,
        required: false,
    },
    shopTiming: {
        Monday: {
            isOpen: Boolean,
            openTime: String,
            closeTime: String,
        },
        Tuesday: {
            isOpen: Boolean,
            openTime: String,
            closeTime: String,
        },
        Wednesday: {
            isOpen: Boolean,
            openTime: String,
            closeTime: String,
        },
        Thursday: {
            isOpen: Boolean,
            openTime: String,
            closeTime: String,
        },
        Friday: {
            isOpen: Boolean,
            openTime: String,
            closeTime: String,
        },
        Saturday: {
            isOpen: Boolean,
            openTime: String,
            closeTime: String,
        },
        Sunday: {
            isOpen: Boolean,
            openTime: String,
            closeTime: String,
        },
    },
    LicenseNumber: {
        type: String,
        required: false,
    },
    GstNumber: {
        type: String,
        required: false
    },
    ownerName: {
        type: String,
        required: true,
    },
    ownerPhoneNumber: {
        type: String,
        required: true,
    },
    ownerEmail: {
        type: String,
        required: true,
    },
    ownerAddress: {
        type: String,
        required: true,
    },
    ownerAddharImages: [
        {
            aadharFrontSide: {
                type: String,
                required: true
            },
            aadharBackSide: {
                type: String,
                required: true
            }
        }
    ],
    ownerPanNumber: {
        type: String,
        required: true,
    },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    packageStartDate: { type: Date },
    packageEndDate: { type: Date },
    isSubscriptionPurchased: {
        type: Boolean,
        default: false
    },

    packageId: { type: mongoose.Schema.Types.ObjectId, ref: "Package" },
    AdditionalPackages: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Package"
    }],
    joinedAt: {
        type: Date,
        required: true,
    }

}, {
    timestamps: true
});

shopSchema.index({ "locationHistory.point": "2dsphere" });
export default mongoose.model('Shop', shopSchema);