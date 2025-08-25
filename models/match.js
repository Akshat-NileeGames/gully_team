import mongoose from "mongoose";
import autopopulate from "mongoose-autopopulate";
const matchSchema = new mongoose.Schema(
  {
    tournament: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tournament",
      required: true,
    },
    team1: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Team",
      required: true,
      autopopulate: true,
    },
    team2: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Team",
      required: true,
      autopopulate: true,
    },

    dateTime: {
      type: Date,
      required: true,
      default: () => new Date(), // Defaults to current date/time added by DG

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
      enum: ["played", "upcoming", "current", "cancelled"],
      default: "upcoming",
    },
    msg: {
      type: String,
    },
    coHostId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },

    // scoreBoard: {
    //   type: {
    //     team1: {
    //       type: {},
    //     },
    //     team2: {
    //       type: {},
    //     },
    //     isChallenge: {
    //       type: Boolean,
    //       default: false,
    //     },
    //     matchId: {
    //       // type: String, //nikhil
    //       type: mongoose.Schema.Types.ObjectId, //DG
    //     },
    //     tossWonBy: {
    //       type: mongoose.Schema.Types.ObjectId,
    //     },
    //     electedTo: {
    //       type: String,
    //       enum: ["Bat", "Bowl"],
    //     },
    //     firstInnings: {},
    //     secondInnings: {},
    //     totalOvers: {
    //       type: Number,
    //     },
    //     extras: {
    //       type: {},
    //       default: null,
    //     },
    //     overCompleted: {
    //       type: Boolean,
    //       default: false,
    //     },
    //     partnerships: {
    //       type: {},
    //       default: null,
    //     },
    //     strikerId: {
    //       type: mongoose.Schema.Types.ObjectId,
    //     },
    //     nonStrikerId: {
    //       type: mongoose.Schema.Types.ObjectId,
    //     },
    //     bowlerId: {
    //       type: mongoose.Schema.Types.ObjectId,
    //     },
    //     ballsToBowl: { type: Number },
    //     currentOver: { type: Number },
    //     currentBall: { type: Number },
    //     currentInnings: { type: Number },
    //     currentInningsScore: { type: Number },
    //     currentInningsWickets: { type: Number },
    //     lastEventType: { type: String },
    //     firstInningHistory: {
    //       type: Object,
    //       required: false,
    //       default: null,
    //     },

    //     secondInningHistory: {
    //       type: Object,
    //       required: false,
    //       default: null,
    //     },
    //   },
    //   default: null,
    // },
    scoreBoard: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: null
    },
    Round: {
      type: String,
      required: true,
      // default: 0,
    },
    matchNo: {
      type: Number,
      required: true,
      default: 0,
    },
    matchlength: {
      type: Number,
      required: false,
    },
    matchType: {
      type: String,
      enum: ["Tournaments", "Challenged"]
    },
    winningTeamId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Team",
      default: null,
    },
    isTie: { type: Boolean, default: false },
    matchAuthority: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    }
  },
  {
    timestamps: true,
  },
);
matchSchema.plugin(autopopulate);

export default mongoose.model("Match", matchSchema);                                    