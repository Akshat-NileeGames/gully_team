import mongoose from 'mongoose';

const groundSchema = new mongoose.Schema({
    venueImages: [{
        type: String,
        required: true,
    }],
    venue_name: {
        type: String,
        required: true
    },
    venue_contact: {
        type: String,
        required: true,
    },
    venue_description: {
        type: String,
        required: true,
    },
    venue_address: {
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
    venue_type: {
        type: String,
        enum: ['Open Ground', 'Truf', 'Stadium'],
        default: 'Truf'
    },
    venue_surfacetype: {
        type: String,
        enum: ['PVC', 'Synthetic PVC', '8 Layered Acrylic Surface', 'Wooden', 'Natural Grass Lane', 'Artificial Grass Lane', 'Hard Court', 'Natural Grass Turf'],
        default: 'PVC'
    },
    venue_timeslots: {
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
    venue_sport: {
        type: String,
        required: true
    },
    paymentMethods: [{
        type: String,
        enum: ['Cash', 'UPI', 'Credit Card', 'Debit Card', 'Bank Transfer']
    }],
    upiId: {
        type: String,
        required: true
    },
    venuefacilities: {
        isWaterAvailable: { type: Boolean, default: false },
        isParkingAvailable: { type: Boolean, default: false },
        isEquipmentProvided: { type: Boolean, default: false },
        isWashroomAvailable: { type: Boolean, default: false },
        isChangingRoomAvailable: { type: Boolean, default: false },
        isFloodlightAvailable: { type: Boolean, default: false },
        isSeatingLoungeAvailable: { type: Boolean, default: false },
        isFirstAidAvailable: { type: Boolean, default: false },
        isWalkingTrackAvailable: { type: Boolean, default: false }
    },

    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },

    isSubscriptionPurchased: {
        type: Boolean,
        default: false
    },
    packageRef: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Package"
    },
    subscriptionExpiry: {
        type: Date
    },
    isActive: {
        type: Boolean,
        default: true
    },
    totalBookings: {
        type: Number,
        default: 0
    }
}, { timestamps: true });

groundSchema.index({ "locationHistory.point": "2dsphere" });
export default mongoose.model('Ground', groundSchema);
