import mongoose from 'mongoose';
const category = new mongoose.Schema({
  categoryFor: { type: String, required: true, unique: false },
  categoryItem:[
    {
        type:String,
        required: true
    }
  ],
  
}, { timestamps: true });

export default mongoose.model('Category', category);