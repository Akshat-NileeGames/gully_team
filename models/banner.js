import mongoose from "mongoose";

// Define the banner schema
const bannerSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  imageUrl: {
    type: String,
    required: true
  },
  link: {
    type: String,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
});
bannerSchema.set('timestamps', true);
// Create the Banner model
export default mongoose.model('Banner', bannerSchema);