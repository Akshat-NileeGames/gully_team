import mongoose from "mongoose";
import ImageUploader from '../helpers/ImageUploader.js';

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
    shopLocation: {
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
    businessLicenseNumber: {
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
    ownerContact: {
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
    ownerIdentificationNumber: {
        type: String,
        required: true,
    },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    packageId: { type: mongoose.Schema.Types.ObjectId, ref: "Package" },
    AdditionalPackage: { type: mongoose.Schema.Types.ObjectId, ref: "Package" },
});
shopSchema.index({ "locationHistory.point": "2dsphere" });
export default mongoose.model('Shop', shopSchema);