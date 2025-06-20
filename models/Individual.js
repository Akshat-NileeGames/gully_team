import mongoose from "mongoose"

const educationSchema = new mongoose.Schema({
    degree: String,
    institution: String,
    year: String,
    description: String,
})

const experienceSchema = new mongoose.Schema({
    title: String,
    organization: String,
    duration: String,
    description: String,
})

const certificateSchema = new mongoose.Schema({
    name: String,
    issuedBy: String,
    issueDate: Date,
    certificateUrl: String,
})

const individualSchema = new mongoose.Schema(
    {
        fullName: {
            type: String,
            required: true,
        },
        email: {
            type: String,
            required: true,
        },
        phoneNumber: {
            type: String,
            required: true,
        },
        bio: {
            type: String,
            required: true,
        },
        panNumber: {
            type: String,
            required: true,
            match: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/,
        },
        profileImageUrl: {
            type: String,
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
        sportsCategories: {
            type: [String],
            required: true,
        },
        selectedServiceTypes: {
            type: [String],
            required: true,
        },
        availableDays: {
            type: [String],
            required: true,
        },
        supportedAgeGroups: {
            type: [String],
            required: true,
        },
        yearOfExperience: {
            type: Number,
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
        // hourlyRate: {
        //     type: Number,
        // },
        // availability: [
        //     {
        //         day: String,
        //         venue_timeslots: [
        //             {
        //                 startTime: String,
        //                 endTime: String,
        //                 isBooked: { type: Boolean, default: false },
        //                 bookedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        //             },
        //         ],
        //     },
        // ],
    },
    { timestamps: true },
)

individualSchema.index({ "locationHistory.point": "2dsphere" });
export default mongoose.model("Individual", individualSchema)
