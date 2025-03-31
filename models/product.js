import mongoose from 'mongoose';
const Product = new mongoose.Schema({
    productsImage: [{ type: String, required: true, maxLength: 3 }],
    productName: { type: String, required: true },
    productsDescription: { type: String, required: true },
    productsPrice: { type: Number, required: true },
    productsQuantity: { type: Number, required: true },
    productCategory: { type: String, required: true },
    productBrand: { type: String, required: true },
}, { timestamps: true });

export default mongoose.model('Product', Product);