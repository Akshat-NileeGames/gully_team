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
    productSubCategory: {
        type: String,
        required: true
    },
    productBrand: {
        type: String,
        required: true
    },
    productDiscount: {
        discountedvalue: {
            type: Number,
            required: false,
            default: 0,
        },
        discounttype: {
            type: String,
            enum: ['percent', 'fixed']
        },
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