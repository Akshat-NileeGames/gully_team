import mongoose from 'mongoose';
const businessHoursSchema  = new mongoose.Schema({
  day: {
    type: String,
    required: true,
    enum: [
        'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
    ], 
},
    isOpen: {
        type: Boolean,
        required: true,
      },
      openTime: {
        type: String,
        required: false,
      },
      closeTime: {
        type: String,
        required: false,
      },
    });

export default mongoose.model('BusinessHours', businessHoursSchema );