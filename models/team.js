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

  teamMatchsData: {
    tennis: {

    },
    leather: {

    },
  },
  numberOfWins: {
    type: Number,
  },

},


);
teamSchema.plugin(autopopulate);
teamSchema.set('timestamps', true);

export default mongoose.model("Team", teamSchema);


