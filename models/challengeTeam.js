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

  winningTeamId: {
    type: String,
    default: "Pending",
  },
  endDate: {
    type: String,
  },
  updateDateTime: {
    type: String,
  },
  venue: {
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
    type: {
      team1: {
        type: {},
      },
      team2: {
        type: {},
      },
      matchId: {
        type: String,
      },
      tossWonBy: {
        type: mongoose.Schema.Types.ObjectId,
      },
      electedTo: {
        type: String,
        enum: ["Bat", "Bowl"],
      },
      firstInnings: {},
      secondInnings: {},
      isChallenge: {
        type: Boolean,
        default: true,
      },
      totalOvers: {
        type: Number,
      },
      extras: {
        type: {},
        default: null,
      },
      overCompleted: {
        type: Boolean,
        default: false,
      },
      partnerships: {
        type: {},
        default: null,
      },
      strikerId: {
        type: mongoose.Schema.Types.ObjectId,
      },
      nonStrikerId: {
        type: mongoose.Schema.Types.ObjectId,
      },
      bowlerId: {
        type: mongoose.Schema.Types.ObjectId,
      },
      ballsToBowl: { type: Number },
      currentOver: { type: Number },
      currentBall: { type: Number },
      currentInnings: { type: Number },
      currentInningsScore: { type: Number },
      currentInningsWickets: { type: Number },
      lastEventType: { type: String },
      firstInningHistory: {
        type: Object,
        required: false,
        default: null,
      },

      secondInningHistory: {
        type: Object,
        required: false,
        default: null,
      },
    },
    default: null,
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
});
// challengeTeamSchema.plugin(autopopulate);
challengeTeamSchema.set("timestamps", true);

export default mongoose.model("ChallengeTeam", challengeTeamSchema);
