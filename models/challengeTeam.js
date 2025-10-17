import mongoose from "mongoose";
// import autopopulate from "mongoose-autopopulate";
const challengeTeamSchema = new mongoose.Schema({
  challengedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  team1: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Team",
    required: true,
  },
  team2: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Team",
    required: true,
  },
  captain1: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  captain2: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  endDate: {
    type: String,
  },
  updateDateTime: {
    type: String,
  },
  status: {
    type: String,
    enum: ["played", "Accepted", "Denied", "Pending"],
    default: "Pending",
  },
  msg: {
    type: String,
  },
  challengeforSport: {
    type: String,
    enum: ['cricket', 'football'],
    default: 'cricket',
    required: true,
  },
  scoreBoard: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: null
  },
  matchlength: {
    type: Number,
    required: false,
  },
  Round: {
    type: String,
    required: true,
    default: 0,
  },
  matchNo: {
    type: Number,
    required: true,
    default: 0,
  },
  winningTeamId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Team",
    default: null,
  },
  isMatchDraw: {
    type: Boolean,
    default: false
  },
  matchAuthority: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  }
});
// challengeTeamSchema.plugin(autopopulate);
challengeTeamSchema.set("timestamps", true);

export default mongoose.model("ChallengeTeam", challengeTeamSchema);
