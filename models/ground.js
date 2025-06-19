import mongoose from 'mongoose';

const timeSlotSchema = new mongoose.Schema({
    startTime: {
        type: String,
        required: true
    },
    endTime: {
        type: String,
        required: true
    },
    isBooked: {
        type: Boolean,
        default: false
    },
    bookedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null
    },
    bookingDate: {
        type: Date,
        default: null
    }
});

const groundSchema = new mongoose.Schema({
    groundName: {
        type: String,
        required: true
    },
    groundDescription: {
        type: String,
        required: true,
    },
    groundAddress: {
        type: String,
        required: true,
    },
    groundContact: {
        type: String,
        required: true,
    },
    groundEmail: {
        type: String,
        required: true,
    },
    groundType: {
        type: String,
        enum: ['Open Ground', 'Truf', 'Stadium'],
        default: 'Truf'
    },
    surfaceType: {
        type: String,
        enum: ['PVC', 'Synthetic PVC', '8 Layered Acrylic Surface', 'Wooden', 'Natural Grass Lane', 'Artificial Grass Lane', 'Hard Court', 'Natural Grass Turf'],
        default: 'PVC'
    },
    groundOpenDays: [{
        type: String,
        required: true,
    }],
    openTime: {
        type: String,
        required: true
    },
    closeTime: {
        type: String,
        required: true
    },
    timeSlots: [timeSlotSchema],
    sportsCategories: [{
        type: String,
        required: true
    }],
    paymentMethods: [{
        type: String,
        enum: ['Cash', 'UPI', 'Credit Card', 'Debit Card', 'Bank Transfer']
    }],
    upiId: {
        type: String,
        required: true
    },
    facilities: {
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
    groundImages: [{
        type: String,
        required: true
    }],
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    location: {
        type: {
            type: String,
            enum: ["Point"],
            default: "Point",
        },
        coordinates: {
            type: [Number],
            required: true,
        },
        address: String,
    },
    isSubscriptionPurchased: {
        type: Boolean,
        default: false
    },
    packageId: {
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
    rating: {
        type: Number,
        default: 0,
        min: 0,
        max: 5
    },
    totalBookings: {
        type: Number,
        default: 0
    }
}, { timestamps: true });

groundSchema.index({ location: "2dsphere" });

export default mongoose.model('Ground', groundSchema);
