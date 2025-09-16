import mongoose from "mongoose";

// Define the Player schema
const playerSchema = new mongoose.Schema({
  team: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Team",
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: false,
  },
  matchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Match",
    required: false,
  },
  name: {
    type: String,
    required: true,
  },
  phoneNumber: {
    type: String,
  },
  role: {
    type: String,
    enum: [
      "Batsman",
      "Bowler",
      "All Rounder",
      "Wicket Keeper",
      "Captain",
      "Goal Keeper",
      "Defender",
      "Midfielder",
      "Attacker",
      "Striker"
    ],
    required: true,
  },
  battingStatistic: {
    tennis: {},
    leather: {},
  },
  bowlingStatistic: {
    tennis: {},
    leather: {},
  },

  footballStatistic: {
    matchesPlayed: {
      type: Number,
      default: 0
    },
    minutesPlayed: {
      type: Number,
      default: 0
    },
    goals: {
      type: Number,
      default: 0
    },
    assists: {
      type: Number,
      default: 0
    },

    saves: {
      type: Number,
      default: 0
    },
    //Need to add it into team
    cleanSheets: {
      type: Number,
      default: 0
    },
    penaltySaves: {
      type: Number,
      default: 0
    },
    penaltyGoals: {
      type: Number,
      default: 0
    },
    yellowCards: {
      type: Number,
      default: 0
    },
    redCards: {
      type: Number,
      default: 0
    },
    foulsCommitted: {
      type: Number,
      default: 0
    },
    foulsSuffered: {
      type: Number,
      default: 0
    },
    //Need to talk in future
    offsides: {
      type: Number,
      default: 0
    },
  }
});

export default mongoose.model("Player", playerSchema);
