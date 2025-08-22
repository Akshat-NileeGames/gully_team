// import mongoose from "mongoose";
// import autopopulate from "mongoose-autopopulate";
// const locationSchema = new mongoose.Schema({ _id: false });

// const locationHistorySchema = new mongoose.Schema(
//   {
//     currentLocation: {
//       point: {
//         type: {
//           type: String,
//           enum: ["Point"],
//           default: "Point",
//           required: false,
//         },
//         coordinates: {
//           type: [Number],
//           required: true,
//         },
//       },
//       selectLocation: String,
//     },
//     // previousLocations: [locationSchema],
//     timestamp: {
//       type: Date,
//       default: Date.now,
//     },
//   },
//   { _id: false }
// );

// const gameTypeSchema = new mongoose.Schema({
//   name: {
//     type: String,
//     enum: [
//       "TENNIS BALL",
//       "CRICKET",
//       "TABLE TENNIS",
//       "FOOTBALL",
//       "VOLLEYBALL",
//       "KABADDI",
//     ],
//   },
// });

// const tournamentCategorySchema = new mongoose.Schema({
//   name: {
//     type: String,
//     enum: ["open", "corporate", "series", "turf"],
//   },
// });

// const ballTypeSchema = new mongoose.Schema({
//   name: {
//     type: String,
//     enum: ["tennis", "leather", "others"],
//   },
// });

// const matchTypeSchema = new mongoose.Schema({
//   name: {
//     type: String,
//     enum: ["Tennis ball cricket match", "season ball cricket match"],
//   },
// });

// const pitchTypeSchema = new mongoose.Schema({
//   name: {
//     type: String,
//     enum: ["rough", "cement"],
//   },
// });

// const TournamentprizeSchema = new mongoose.Schema({
//   name: {
//     type: String,
//     // enum: ["1st prize", "2nd prize", "best baller", "best batsman"],
//   },
// });

// const tournamentSchema = new mongoose.Schema(
//   {
//     sportsid: mongoose.Schema.Types.ObjectId,
//     tournamentStartDateTime: {
//       type: Date,
//       required: true,
//     },
//     tournamentEndDateTime: {
//       type: Date,
//       required: true,
//     },
//     tournamentName: {
//       type: String,
//       required: true,
//     },
//     tournamentCategory: {
//       type: tournamentCategorySchema,
//       required: true,
//     },
//     ballType: {
//       type: ballTypeSchema,
//       required: true,
//     },
//     pitchType: {
//       type: pitchTypeSchema,
//       required: true,
//     },
//     phoneNumber: {
//       type: String,
//       //required: true
//     },
//     matchType: {
//       type: matchTypeSchema,
//       required: true,
//     },
//     matches: [                  //added by DG
//       {
//         type: mongoose.Schema.Types.ObjectId,
//         ref: "Match", // Reference to the Match model
//       },
//     ],
//     tournamentPrize: {
//       type: TournamentprizeSchema,
//       //  required: true,
//     },
//     fees: {
//       type: Number,
//       required: true,
//     },
//     ballCharges: {
//       type: Number,
//       required: true,
//     },
//     breakfastCharges: {
//       type: Number,
//       required: true,
//     },
//     stadiumAddress: {
//       type: String,
//       required: true,
//     },
//     tournamentLimit: {
//       type: Number,
//       required: true,
//     },
//     gameType: {
//       type: gameTypeSchema,
//       required: true,
//     },

//     email: {
//       type: String,
//       required: true,
//     },
//     rules: {
//       type: String,
//     },
//     disclaimer: {
//       type: String,
//     },
//     locationHistory: {
//       point: {
//         type: {
//           type: String,
//           enum: ["Point"],
//           default: "Point",
//           required: false,
//         },
//         coordinates: {
//           type: [Number],
//           required: true,
//         },
//       },
//     },
//     user: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "User",
//       required: true,
//     },
//     isDeleted: {
//       type: Boolean,
//       default: false,
//       required: false,
//     },
//     isCompleted: {
//       type: Boolean,
//       default: false,
//       required: false,
//     },
//     isActive: {
//       type: Boolean,
//       default: false,
//       required: false,
//     },
//     coHostId1: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "User",
//     },
//     coHostId2: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "User",
//     },
//     coverPhoto: {
//       type: String,
//     },
//     payments: [
//       {
//         paymentid: {
//           type: mongoose.Schema.Types.ObjectId,
//           ref: "Payment",
//         },
//         amount: Number,
//       },
//     ],
//     authority: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "User",
//       required: true,
//     },
//     //payment: Payment.schema, // Include the payment schema here
//   },


//   {
//     timestamps: true,
//   }
// );
// //tournamentSchema.index({ location: "2dsphere" });
// tournamentSchema.index({ "locationHistory.point": "2dsphere" });
// //tournamentSchema.index({ 'locationHistory.currentLocation.coordinates': '2dsphere' });
// tournamentSchema.plugin(autopopulate);

// // Add text index here
// tournamentSchema.index(
//   {
//     tournamentName: "text",
//   },
//   {
//     name: "TournamentNameTextIndex", // Optional name for the index
//     default_language: "english", // Optional language for the index
//     textIndexVersion: 3, // Optional text index version
//     minLength: 1, // Set the minimum length for partial matches
//   }
// );


// export default mongoose.model("Tournament", tournamentSchema);
import mongoose from "mongoose";
import autopopulate from "mongoose-autopopulate";

const locationSchema = new mongoose.Schema({ _id: false });

const locationHistorySchema = new mongoose.Schema(
  {
    currentLocation: {
      point: {
        type: {
          type: String,
          enum: ["Point"],
          default: "Point",
          required: false,
        },
        coordinates: {
          type: [Number],
          required: true,
        },
      },
      selectLocation: String,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const gameTypeSchema = new mongoose.Schema({
  name: {
    type: String,
    enum: [
      "TENNIS BALL",
      "CRICKET",
      "TABLE TENNIS",
      "FOOTBALL",
      "VOLLEYBALL",
      "KABADDI",
    ],
  },
});

const tournamentCategorySchema = new mongoose.Schema({
  name: {
    type: String,
    enum: ["open", "corporate", "series", "turf"],
  },
});

const ballTypeSchema = new mongoose.Schema({
  name: {
    type: String,
    enum: ["tennis", "leather", "others", "rubber"],
  },
});

const matchTypeSchema = new mongoose.Schema({
  name: {
    type: String,
    enum: ["Tennis ball cricket match", "season ball cricket match", "Football match"],
  },
});

const pitchTypeSchema = new mongoose.Schema({
  name: {
    type: String,
    enum: ["rough", "cement"],
  },
});

const TournamentprizeSchema = new mongoose.Schema({
  name: {
    type: String,
  },
});

const tournamentSchema = new mongoose.Schema(
  {
    sportsid: mongoose.Schema.Types.ObjectId,
    tournamentStartDateTime: {
      type: Date,
      required: true,
    },
    tournamentEndDateTime: {
      type: Date,
      required: true,
    },
    tournamentName: {
      type: String,
      required: true,
    },
    tournamentCategory: {
      type: tournamentCategorySchema,
      required: true,
    },
    ballType: {
      type: ballTypeSchema,
      required: false,
    },
    pitchType: {
      type: pitchTypeSchema,
      required: true,
    },
    phoneNumber: {
      type: String,
    },
    matchType: {
      type: matchTypeSchema,
      required: true,
    },
    matches: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Match",
      },
    ],
    tournamentPrize: {
      type: TournamentprizeSchema,
    },
    fees: {
      type: Number,
      required: true,
    },
    tournamentfor: {
      type: String,
      required: true,
      enum: ['cricket', 'football'],
      default: "cricket"
    },
    ballCharges: {
      type: Number,
      required: false,
      default: 0
    },
    breakfastCharges: {
      type: Number,
      required: false,
      default: 0
    },
    stadiumAddress: {
      type: String,
      required: true,
    },
    tournamentLimit: {
      type: Number,
      required: true,
    },
    gameType: {
      type: gameTypeSchema,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    rules: {
      type: String,
    },
    disclaimer: {
      type: String,
    },
    locationHistory: {
      point: {
        type: {
          type: String,
          enum: ["Point"],
          default: "Point",
          required: false,
        },
        coordinates: {
          type: [Number],
          required: true,
        },
      },
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    organizer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      required: false,
    },
    isCompleted: {
      type: Boolean,
      default: false,
      required: false,
    },
    isActive: {
      type: Boolean,
      default: false,
      required: false,
    },
    coHostId1: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    coHostId2: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    coverPhoto: {
      type: String,
    },
    payments: [
      {
        paymentid: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Payment",
        },
        amount: Number,
      },
    ],
    authority: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    isSponsorshippurchase: {
      type: Boolean,
      default: false
    },
    SponsorshipPackageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Package",
    },
    TotalEditDone: {
      type: Number,
      default: 0,
    }
    // eliminatedTeamIds: {
    //   type: [mongoose.Schema.Types.ObjectId],
    //   ref: "RegisteredTeam",
    //   default: [],
    // },

  },
  {
    timestamps: true,
  }
);

tournamentSchema.index({ "locationHistory.point": "2dsphere" });
tournamentSchema.plugin(autopopulate);

tournamentSchema.index(
  {
    tournamentName: "text",
  },
  {
    name: "TournamentNameTextIndex",
    default_language: "english",
    textIndexVersion: 3,
    minLength: 1,
  }
);

export default mongoose.model("Tournament", tournamentSchema);
