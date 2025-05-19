import mongoose from "mongoose";

const shopVisitSchema = new mongoose.Schema({
    shopId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Shop",
        required: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: false 
    },
    visitedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});
export default mongoose.model('ShopVisit', shopVisitSchema);