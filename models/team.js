import mongoose from "mongoose";
import autopopulate from "mongoose-autopopulate";
const teamSchema = new mongoose.Schema({
  _id: {
    type: mongoose.Schema.Types.ObjectId, auto: true
  },
  teamLogo: {
    type: String,
  },
  teamName: {
    type: String,
  },
  players: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Player",
      autopopulate: true,
    },
  ],
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  teamfor: {
    type: String,
    required: true,
    enum: ['cricket', 'football']
  },
  // teamMatchsData: {
  //   tennis: {

  //   },
  //   leather: {

  //   },
  // },
  teamMatchsData: {
    type: Map,
    of: mongoose.Schema.Types.Mixed, // You can define a more specific schema here if needed
    default: {},
  },
  numberOfWins: {
    type: Number,
  },

},


);
teamSchema.plugin(autopopulate);
teamSchema.set('timestamps', true);

export default mongoose.model("Team", teamSchema);


