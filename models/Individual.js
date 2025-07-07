import mongoose from "mongoose"

const educationSchema = new mongoose.Schema({
  degree: {
    type: String,
    required: true,
  },
  field: {
    type: String,
    required: true,
  },
  institution: {
    type: String,
    required: true,
  },
  startDate: {
    type: String,
    required: true,
  },
  endDate: {
    type: String,
    required: false,
  },
  isCurrently: {
    type: Boolean,
    default: false,
  },
})

const experienceSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  organization: {
    type: String,
    required: true,
  },
  startDate: {
    type: String,
    required: true,
  },
  endDate: {
    type: String,
    required: false,
  },
  isCurrently: {
    type: Boolean,
    default: false,
  },
  description: {
    type: String,
    required: false,
  },
})

const certificateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  issuedBy: {
    type: String,
    required: true,
  },
  issueDate: {
    type: String,
    required: true,
  },
})

const individualSchema = new mongoose.Schema(
  {
    profileImageUrl: {
      type: String,
    },
    fullName: {
      type: String,
      required: true,
    },
    bio: {
      type: String,
      required: true,
    },
    phoneNumber: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    panNumber: {
      type: String,
      required: true,
      match: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/,
    },
    yearOfExperience: {
      type: Number,
      required: true,
    },
    sportsCategories: {
      type: [String],
      required: true,
    },
    selectedServiceTypes: {
      type: [String],
      required: true,
    },
    serviceImageUrls: {
      type: [String],
      required: true,
    },
    serviceOptions: {
      providesOneOnOne: { type: Boolean, default: false },
      providesTeamService: { type: Boolean, default: false },
      providesOnlineService: { type: Boolean, default: false },
    },
    availableDays: {
      type: [String],
      required: true,
    },
    supportedAgeGroups: {
      type: [String],
      required: true,
    },
    education: [educationSchema],
    experience: [experienceSchema],
    certificates: [certificateSchema],
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
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
        selectLocation: String,
      },
    },
    hasActiveSubscription: {
      type: Boolean,
      default: false,
    },
    packageRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Package",
    },
    subscriptionExpiry: {
      type: Date,
    },
  },
  { timestamps: true },
)

individualSchema.index({ "locationHistory.point": "2dsphere" })

export default mongoose.model("Individual", individualSchema)
