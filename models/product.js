import mongoose from 'mongoose';
const Product = new mongoose.Schema({
    productsImage: [{
        type: String,
        required: true
    }],
    productName: {
        type: String,
        required: true
    },
    productsDescription: {
        type: String,
        required: true
    },
    productsPrice: {
        type: Number,
        required: true
    },
    productCategory: {
        type: String,
        required: true
    },
    productBrand: {
        type: String,
        required: true
    },
    shopId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Shop"
    },
    isActive: {
        type: Boolean,
        default: true,
    },

}, { timestamps: true });

export default mongoose.model('Product', Product);