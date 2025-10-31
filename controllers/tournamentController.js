import Joi from "joi";
import CustomErrorHandler from "../helpers/CustomErrorHandler.js";
import firebaseNotification from "../helpers/firebaseNotification.js";
import { Tournament, User } from "../models/index.js";
import { tournamentServices } from "../services/index.js";

const tournamentController = {

  /**
  * @function createTournament
  * @description Handles tournament creation: validates input, checks for duplicates,
  * formats dates, persists data, and sends notification if needed.
  * @param {Object} req - Express request object containing tournament data in `req.body`
  * @param {Object} res - Express response object
  * @param {Function} next - Express next middleware function
  * @returns {Object} JSON response with success status and created tournament data
  */
  //#region createTournament
  async createTournament(req, res, next) {
    const tournamentSchema = Joi.object({
      tournamentStartDateTime: Joi.date().iso().required(),
      tournamentEndDateTime: Joi.date()
        .iso()
        .min(Joi.ref("tournamentStartDateTime"))
        .required(),
      tournamentName: Joi.string().min(3).max(30).required(),
      tournamentfor: Joi.string().required(),
      tournamentCategory: Joi.string().required(),
      ballType: Joi.string().optional(),
      pitchType: Joi.string().required(),
      matchType: Joi.string().required(),
      tournamentPrize: Joi.string().required(),
      selectLocation: Joi.string().required(),
      fees: Joi.number().integer().min(0).required(),
      ballCharges: Joi.number().min(0).optional(),
      breakfastCharges: Joi.number().integer().min(0).optional(),
      stadiumAddress: Joi.string().required(),
      tournamentLimit: Joi.number().integer().positive().required(),
      gameType: Joi.string().required(),
      longitude: Joi.number().required(),
      latitude: Joi.number().required(),
      rules: Joi.string().required(),
      coHost1Phone: Joi.number().allow(null).optional(),
      coHost1Name: Joi.string().allow(null).optional(),
      coHost2Phone: Joi.number().allow(null).optional(),
      coHost2Name: Joi.string().allow(null).optional(),
      coverPhoto: Joi.string().optional().allow(null),
      //eliminatedTeamIds: Joi.array().items(Joi.string()).optional(), // Added field for eliminatedTeamIds
    });
    const { error } = tournamentSchema.validate(req.body);
    if (error) return CustomErrorHandler.validationError(`Failed to validate Request:${error}`);

    // const TournamentNameExist = await Tournament.exists({
    //   tournamentName: req.body.tournamentName,
    //   isCompleted: false,
    // });

    // if (TournamentNameExist) {
    //   return next(CustomErrorHandler.alreadyExist(
    //     "This Tournament Name is already present."
    //   ))
    // }
    const formatStartDate = (dateString) => {
      const date = new Date(dateString);

      date.setHours(0, 0, 0, 0);
      const offset = 5.5 * 60 * 60 * 1000;
      return new Date(date.getTime() + offset);
    };
    const formatEndDate = (dateString) => {
      const date = new Date(dateString);
      date.setHours(23, 59, 59, 999);
      const offset = 5.5 * 60 * 60 * 1000;
      return new Date(date.getTime() + offset);
    };

    const userStartDate = formatStartDate(req.body.tournamentStartDateTime);
    const userEndDate = formatEndDate(req.body.tournamentEndDateTime);

    try {
      const { newTournament, fcmToken } = await tournamentServices.createTournament(
        req.body,
        userStartDate,
        userEndDate
      );

      const notificationData = {
        title: "Gully Team",
        body: `${newTournament.tournamentName} Tournament created successfully! Get set for an epic showdown. Stay tuned for participants and let the games begin! 🏆`,
        image: "",
      };
      if (fcmToken) {
        console.log("Sending notification...");
        await firebaseNotification.sendNotification(fcmToken, notificationData);
        console.log("Notification sent successfully!");
      } else {
        console.log("No FCM Token available. Skipping notification.");
      }

      return res.status(200).json({
        success: true,
        message: "Tournament Created Successfully",
        data: newTournament,
      });
    } catch (err) {
      console.log("Error in createTournament", err);
    }
  },
  // async createTournament(req, res, next) {
  //   let test = req.query;
  //   console.log(test); // Log incoming query parameters

  //   const tournamentSchema = Joi.object({
  //     tournamentStartDateTime: Joi.date().iso().required(),
  //     tournamentEndDateTime: Joi.date()
  //       .iso()
  //       .min(Joi.ref("tournamentStartDateTime"))
  //       .required(),
  //     tournamentName: Joi.string().min(3).max(30).required(),
  //     tournamentCategory: Joi.string().required(),
  //     ballType: Joi.string().required(),
  //     pitchType: Joi.string().required(),
  //     matchType: Joi.string().required(),
  //     tournamentPrize: Joi.string().required(),
  //     selectLocation: Joi.string().required(),
  //     fees: Joi.number().integer().min(0).required(),
  //     ballCharges: Joi.number().min(0).required(),
  //     breakfastCharges: Joi.number().integer().min(0).required(),
  //     stadiumAddress: Joi.string().required(),
  //     tournamentLimit: Joi.number().integer().positive().required(),
  //     gameType: Joi.string().required(),
  //     longitude: Joi.number().required(),
  //     latitude: Joi.number().required(),
  //     rules: Joi.string().required(),
  //     coHost1Phone: Joi.number().allow(null).optional(),
  //     coHost1Name: Joi.string().allow(null).optional(),
  //     coHost2Phone: Joi.number().allow(null).optional(),
  //     coHost2Name: Joi.string().allow(null).optional(),
  //     coverPhoto: Joi.string().optional().allow(null),
  //   });

  //   const { error } = tournamentSchema.validate(req.body);
  //   if (error) {
  //     return next(error);
  //   }

  //   const TournamentNameExist = await Tournament.exists({
  //     tournamentName: req.body.tournamentName,
  //     isCompleted: false,
  //   });

  //   if (TournamentNameExist) {
  //     return next(
  //       CustomErrorHandler.alreadyExist(
  //         "This Tournament Name is already present."
  //       )
  //     );
  //   }

  //   const formatStartDate = (dateString) => {
  //     const date = new Date(dateString);

  //     date.setHours(0, 0, 0, 0);
  //     const offset = 5.5 * 60 * 60 * 1000;
  //     return new Date(date.getTime() + offset);
  //   };

  //   const formatEndDate = (dateString) => {
  //     const date = new Date(dateString);
  //     date.setHours(23, 59, 59, 999);
  //     const offset = 5.5 * 60 * 60 * 1000; // IST offset
  //     return new Date(date.getTime() + offset);
  //   };

  //   const userStartDate = formatStartDate(req.body.tournamentStartDateTime);
  //   const userEndDate = formatEndDate(req.body.tournamentEndDateTime);

  //   try {
  //     const { newTournament, fcmToken } = await tournamentServices.createTournament(
  //       req.body,
  //       userStartDate,
  //       userEndDate
  //     );

  //     const notificationData = {
  //       title: "Gully Team",
  //       body: `${newTournament.tournamentName} Tournament created successfully! Get set for an epic showdown. Stay tuned for participants and let the games begin! 🏆`,
  //       image: "", // Add an image URL if available
  //     };

  //     console.log("FCM Token:", fcmToken); // Log FCM Token
  //     if (fcmToken) {
  //       console.log("Sending notification...",notificationData);
  //       await firebaseNotification.sendNotification(fcmToken, notificationData);
  //       console.log("Notification sent successfully!");
  //     } else {
  //       console.log("No FCM Token available. Skipping notification.");
  //     }

  //     // Return response with all tournament parameters and notification body
  //     return res.status(200).json({
  //       success: true,
  //       message: "Tournament Created Successfully",
  //       data: newTournament,
  //     });
  //   } catch (err) {
  //     console.log("Error in createTournament", err);
  //     return next(err);
  //   }
  // },

  //   async createTournament(req, res, next) {
  //     let test = req.query;
  //     console.log(test);

  //     const tournamentSchema = Joi.object({
  //         tournamentStartDateTime: Joi.date().iso().required(),
  //         tournamentEndDateTime: Joi.date()
  //             .iso()
  //             .min(Joi.ref("tournamentStartDateTime"))
  //             .required(),
  //         tournamentName: Joi.string().min(3).max(30).required(),
  //         tournamentCategory: Joi.string().required(),
  //         ballType: Joi.string().required(),
  //         pitchType: Joi.string().required(),
  //         matchType: Joi.string().required(),
  //         tournamentPrize: Joi.string().required(),
  //         selectLocation: Joi.string().required(),
  //         fees: Joi.number().integer().min(0).required(),
  //         ballCharges: Joi.number().min(0).required(),
  //         breakfastCharges: Joi.number().integer().min(0).required(),
  //         stadiumAddress: Joi.string().required(),
  //         tournamentLimit: Joi.number().integer().positive().required(),
  //         gameType: Joi.string().required(),
  //         longitude: Joi.number().required(),
  //         latitude: Joi.number().required(),
  //         rules: Joi.string().required(),
  //         coHost1Phone: Joi.number().allow(null).optional(),
  //         coHost1Name: Joi.string().allow(null).optional(),
  //         coHost2Phone: Joi.number().allow(null).optional(),
  //         coHost2Name: Joi.string().allow(null).optional(),
  //         coverPhoto: Joi.string().optional().allow(null),
  //         //eliminatedTeamIds: Joi.array().items(Joi.string()).optional(), // Added field for eliminatedTeamIds
  //     });

  //     const { error } = tournamentSchema.validate(req.body);
  //     if (error) {
  //         return next(error);
  //     }

  //     const TournamentNameExist = await Tournament.exists({
  //         tournamentName: req.body.tournamentName,
  //         isCompleted: false,
  //     });

  //     if (TournamentNameExist) {
  //         return next(
  //             CustomErrorHandler.alreadyExist(
  //                 "This Tournament Name is already present."
  //             )
  //         );
  //     }

  //     const formatStartDate = (dateString) => {
  //         const date = new Date(dateString);

  //         date.setHours(0, 0, 0, 0);
  //         const offset = 5.5 * 60 * 60 * 1000;
  //         return new Date(date.getTime() + offset);
  //     };
  //     const formatEndDate = (dateString) => {
  //         const date = new Date(dateString);
  //         date.setHours(23, 59, 59, 999);
  //         const offset = 5.5 * 60 * 60 * 1000; // IST offset
  //         return new Date(date.getTime() + offset);
  //     };

  //     const userStartDate = formatStartDate(req.body.tournamentStartDateTime);
  //     const userEndDate = formatEndDate(req.body.tournamentEndDateTime);

  //     try {
  //         const { newTournament, fcmToken } = await tournamentServices.createTournament(
  //             req.body,
  //             userStartDate,
  //             userEndDate
  //         );

  //         const notificationData = {
  //             title: "Gully Team",
  //             body: `${newTournament.tournamentName} Tournament created successfully! Get set for an epic showdown. Stay tuned for participants and let the games begin! 🏆`,
  //             image: "",
  //         };

  //         if (fcmToken) {
  //             await firebaseNotification.sendNotification(fcmToken, notificationData);
  //         }

  //         return res.status(200).json({
  //             success: true,
  //             message: "Tournament Created Successfully",
  //             data: newTournament,
  //         });
  //     } catch (err) {
  //         console.log("Error in createTournament", err);
  //         return next(err);
  //     }
  // },

  /**
   * Create a new tournament
   */
  //   async createTournament(req, res, next) {
  //     let test = req.query;
  //     console.log(test);

  //     const tournamentSchema = Joi.object({
  //         tournamentStartDateTime: Joi.date().iso().required(),
  //         tournamentEndDateTime: Joi.date()
  //             .iso()
  //             .min(Joi.ref("tournamentStartDateTime"))
  //             .required(),
  //         tournamentName: Joi.string().min(3).max(30).required(),
  //         tournamentCategory: Joi.string().required(),
  //         ballType: Joi.string().required(),
  //         pitchType: Joi.string().required(),
  //         matchType: Joi.string().required(),
  //         tournamentPrize: Joi.string().required(),
  //         selectLocation: Joi.string().required(),
  //         fees: Joi.number().integer().min(0).required(),
  //         ballCharges: Joi.number().min(0).required(),
  //         breakfastCharges: Joi.number().integer().min(0).required(),
  //         stadiumAddress: Joi.string().required(),
  //         tournamentLimit: Joi.number().integer().positive().required(),
  //         gameType: Joi.string().required(),
  //         longitude: Joi.number().required(),
  //         latitude: Joi.number().required(),
  //         rules: Joi.string().required(),
  //         coHost1Phone: Joi.number().allow(null).optional(),
  //         coHost1Name: Joi.string().allow(null).optional(),
  //         coHost2Phone: Joi.number().allow(null).optional(),
  //         coHost2Name: Joi.string().allow(null).optional(),
  //         coverPhoto: Joi.string().optional().allow(null),
  //         //eliminatedTeamIds: Joi.array().items(Joi.string()).optional(), // Added field for eliminatedTeamIds
  //     });

  //     const { error } = tournamentSchema.validate(req.body);
  //     if (error) {
  //         return next(error);
  //     }

  //     const TournamentNameExist = await Tournament.exists({
  //         tournamentName: req.body.tournamentName,
  //         isCompleted: false,
  //     });

  //     if (TournamentNameExist) {
  //         return next(
  //             CustomErrorHandler.alreadyExist(
  //                 "This Tournament Name is already present."
  //             )
  //         );
  //     }

  //     const formatStartDate = (dateString) => {
  //         const date = new Date(dateString);

  //         date.setHours(0, 0, 0, 0);
  //         const offset = 5.5 * 60 * 60 * 1000;
  //         return new Date(date.getTime() + offset);
  //     };
  //     const formatEndDate = (dateString) => {
  //         const date = new Date(dateString);
  //         date.setHours(23, 59, 59, 999);
  //         const offset = 5.5 * 60 * 60 * 1000; // IST offset
  //         return new Date(date.getTime() + offset);
  //     };

  //     const userStartDate = formatStartDate(req.body.tournamentStartDateTime);
  //     const userEndDate = formatEndDate(req.body.tournamentEndDateTime);

  //     try {
  //         const { newTournament, fcmToken } = await tournamentServices.createTournament(
  //             req.body,
  //             userStartDate,
  //             userEndDate
  //         );

  //         const notificationData = {
  //             title: "Gully Team",
  //             body: `${newTournament.tournamentName} Tournament created successfully! Get set for an epic showdown. Stay tuned for participants and let the games begin! 🏆`,
  //             image: "",
  //         };
  //         let notificationStatus = "Notification not sent"; // Default status
  //         if (fcmToken) {
  //           const notificationResponse = await firebaseNotification.sendNotification(fcmToken, notificationData);
  //     notificationStatus = notificationResponse === "failed" ? "Notification failed" : "Notification sent successfully";

  //             // await firebaseNotification.sendNotification(fcmToken, notificationData);
  //         }

  //         return res.status(200).json({
  //             success: true,
  //             message: "Tournament Created Successfully",
  //             notificationStatus: notificationStatus,  // Include notification status in the response

  //             data: newTournament,
  //         });
  //     } catch (err) {
  //         console.log("Error in createTournament", err);
  //         return next(err);
  //     }
  // },

  /**
   * Edit an existing tournament
   */
  //#region edittournament
  async editTournament(req, res, next) {
    const TournamentId = req.params.id;

    const tournamentSchema = Joi.object({
      tournamentStartDateTime: Joi.date().iso().required(),
      tournamentEndDateTime: Joi.date()
        .iso()
        .greater(Joi.ref("tournamentStartDateTime"))
        .required(),
      tournamentName: Joi.string().min(3).max(30).required(),
      tournamentCategory: Joi.string().required(),
      ballType: Joi.string().required(),
      pitchType: Joi.string().required(),
      matchType: Joi.string().required(),
      tournamentPrize: Joi.string().required(),
      selectLocation: Joi.string().required(),
      fees: Joi.number().positive().min(0).max(1000000).required(),
      ballCharges: Joi.number().min(0).required(),
      breakfastCharges: Joi.number().min(0).required(),
      stadiumAddress: Joi.string().required(),
      tournamentLimit: Joi.number().integer().positive().required(),
      gameType: Joi.string().required(),
      longitude: Joi.number().required(),
      latitude: Joi.number().required(),
      rules: Joi.string().required(),
      coverPhoto: Joi.string().optional().allow(null),
      coHost1Phone: Joi.number().allow(null).optional(),
      coHost1Name: Joi.string().allow(null).optional(),
      coHost2Phone: Joi.number().allow(null).optional(),
      coHost2Name: Joi.string().allow(null).optional(),
      tournamentfor: Joi.string().required(),
      // eliminatedTeamIds: Joi.array().items(Joi.string()).optional(), // Added field for eliminatedTeamIds
    });

    const { error } = tournamentSchema.validate(req.body);

    if (error) {
      return next(error);
    }

    try {
      const tournament = await Tournament.findById(TournamentId);

      if (!tournament) {
        return next(CustomErrorHandler.notFound("Tournament not found."));
      }

      const currentDate = new Date();
      if (new Date(tournament.tournamentEndDateTime) < currentDate) {
        return next(
          CustomErrorHandler.badRequest(
            "The tournament has already ended and cannot be edited."
          )
        );
      }

      if (tournament.tournamentName !== req.body.tournamentName) {
        const TournamentNameExist = await Tournament.exists({
          tournamentName: req.body.tournamentName,
          isCompleted: false,
        });

        if (TournamentNameExist) {
          return next(
            CustomErrorHandler.alreadyExist("This Tournament Name already exists.")
          );
        }
      }

      // Updated date handling for edit tournament
      const formatStartDate = (dateString) => {
        const date = new Date(dateString);
        date.setHours(0, 0, 0, 0);
        const offset = 5.5 * 60 * 60 * 1000;
        return new Date(date.getTime() + offset);
      };

      const formatEndDate = (dateString) => {
        const date = new Date(dateString);
        date.setHours(23, 59, 59, 999);
        const offset = 5.5 * 60 * 60 * 1000;
        return new Date(date.getTime() + offset);
      };

      const userStartDate = req.body.tournamentStartDateTime
        ? formatStartDate(req.body.tournamentStartDateTime)
        : tournament.tournamentStartDateTime;

      const userEndDate = req.body.tournamentEndDateTime
        ? formatEndDate(req.body.tournamentEndDateTime)
        : tournament.tournamentEndDateTime;

      const result = await tournamentServices.editTournament(
        req.body,
        userStartDate.toISOString(),
        userEndDate.toISOString(),
        TournamentId
      );

      return res.status(200).json({
        success: true,
        message: "Tournament Edited Successfully",
        data: result,
      });
    } catch (err) {
      console.error("Error in editTournament:", err);
      return next(err);
    }
  },
  //#region setSponsor
  async setSponsor(req, res, next) {

    const sponsor_schema = Joi.object({
      tournamentId: Joi.string().required(),
      PackageId: Joi.string().required()
    });
    const { error } = sponsor_schema.validate(req.body);

    if (error) {
      return next(error);
    }
    try {
      const result = await tournamentServices.setSponsor(req.body);
      return res.status(200).json({
        success: true,
        message: "Sponsor for these Tournament Activated Successfully",
        data: result,
      });

    } catch (err) {
      console.log("Unable to Activate Sposorship:", err);
    }
  },



  // const tournamentController = {
  // async createTournament(req, res, next) {
  //   const userInfo = global.user;

  //   if (!userInfo || !userInfo.userId) {
  //     return res.status(400).json({
  //       success: false,
  //       message: "User not authenticated.",
  //     });
  //   }

  //   // Joi schema for validation
  //   const tournamentSchema = Joi.object({
  //     tournamentStartDateTime: Joi.date().iso().required(),
  //     tournamentEndDateTime: Joi.date().iso().required(),
  //     tournamentName: Joi.string().min(3).max(30).required(),
  //     tournamentCategory: Joi.string().required(),
  //     ballType: Joi.string().required(),
  //     pitchType: Joi.string().required(),
  //     matchType: Joi.string().required(),
  //     tournamentPrize: Joi.string().required(),
  //     selectLocation: Joi.string().required(),
  //     fees: Joi.number().integer().min(0).required(),
  //     ballCharges: Joi.number().min(0).required(),
  //     breakfastCharges: Joi.number().integer().min(0).required(),
  //     stadiumAddress: Joi.string().required(),
  //     tournamentLimit: Joi.number().integer().positive().required(),
  //     gameType: Joi.string().required(),
  //     longitude: Joi.number().required(),
  //     latitude: Joi.number().required(),
  //     rules: Joi.string().required(),
  //     coHost1Phone: Joi.number().allow(null).optional(),
  //     coHost1Name: Joi.string().allow(null).optional(),
  //     coHost2Phone: Joi.number().allow(null).optional(),
  //     coHost2Name: Joi.string().allow(null).optional(),
  //     coverPhoto: Joi.string().optional().allow(null),
  //   });

  //   const { error } = tournamentSchema.validate(req.body);
  //   if (error) return next(error);

  //   try {
  //     // Verify if a tournament with the same name and user already exists
  //     const TournamentExist = await Tournament.exists({
  //       tournamentName: req.body.tournamentName,
  //       isCompleted: false,
  //       user: userInfo.userId,
  //       isActive: false,
  //     });

  //     if (TournamentExist) {
  //       const tournament = await Tournament.findById(TournamentExist._id).populate("user");
  //       return res.status(200).json({
  //         success: true,
  //         message: "Tournament Already Created",
  //         data: tournament,
  //       });
  //     }

  //     // Verify if a tournament name already exists in the system
  //     const TournamentNameExist = await Tournament.exists({
  //       tournamentName: req.body.tournamentName,
  //       isCompleted: false,
  //     });

  //     if (TournamentNameExist) {
  //       return next(
  //         CustomErrorHandler.alreadyExist("This Tournament Name is already present.")
  //       );
  //     }

  //     // Normalize today's UTC date
  //     const now = new Date();
  //     const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())); // UTC midnight

  //     // Parse and convert user-provided dates
  //     const userStartDate = new Date(req.body.tournamentStartDateTime);
  //     const userEndDate = new Date(req.body.tournamentEndDateTime);

  //     // Direct conversion to UTC (dates are in ISO format)
  //     const startUTC = new Date(userStartDate.toISOString());
  //     const endUTC = new Date(userEndDate.toISOString());

  //     // Log dates for debugging
  //     console.log("Current Time (Local):", now);
  //     console.log("Today (UTC Midnight):", todayUTC);
  //     console.log("User Start Date (Original):", userStartDate);
  //     console.log("User End Date (Original):", userEndDate);
  //     console.log("User Start Date (UTC):", startUTC);
  //     console.log("User End Date (UTC):", endUTC);

  //     // Validate dates
  //     if (startUTC < todayUTC) {
  //       console.error("Validation Failed: Start date is in the past.");
  //       return res.status(400).json({
  //         message: "Tournament start date must be today or in the future.",
  //       });
  //     }

  //     if (startUTC > endUTC) {
  //       console.error("Validation Failed: Start date is after end date.");
  //       return res.status(400).json({
  //         message: "Tournament start date cannot be later than the end date.",
  //       });
  //     }

  //     // Call service to create a new tournament
  //     const { newTournament, fcmToken } = await tournamentServices.createTournament(
  //       req.body,
  //       startUTC,
  //       endUTC
  //     );

  //     // Ensure `isActive` status is set to true
  //     newTournament.isActive = true;
  //     await newTournament.save();

  //     const notificationData = {
  //       title: "Gully Team",
  //       body: `${newTournament.tournamentName} Tournament created successfully! Get ready for an epic showdown.`,
  //     };

  //     if (fcmToken) {
  //       await firebaseNotification.sendNotification(fcmToken, notificationData);
  //     }

  //     return res.status(200).json({
  //       success: true,
  //       message: "Tournament Created Successfully",
  //       data: newTournament,
  //     });
  //   } catch (err) {
  //     console.error("Error in createTournament:", err);
  //     return next(err);
  //   }
  // },
  // const tournamentController = {
  //   async createTournament(req, res, next) {
  //     const userInfo = global.user;

  //     if (!userInfo || !userInfo.userId) {
  //       return res.status(400).json({
  //         success: false,
  //         message: "User not authenticated.",
  //       });
  //     }

  //     // Joi schema for validation
  //     const tournamentSchema = Joi.object({
  //       tournamentStartDateTime: Joi.date().iso().required(),
  //       tournamentEndDateTime: Joi.date().iso().required(),
  //       tournamentName: Joi.string().min(3).max(30).required(),
  //       tournamentCategory: Joi.string().required(),
  //       ballType: Joi.string().required(),
  //       pitchType: Joi.string().required(),
  //       matchType: Joi.string().required(),
  //       tournamentPrize: Joi.string().required(),
  //       selectLocation: Joi.string().required(),
  //       fees: Joi.number().integer().min(0).required(),
  //       ballCharges: Joi.number().min(0).required(),
  //       breakfastCharges: Joi.number().integer().min(0).required(),
  //       stadiumAddress: Joi.string().required(),
  //       tournamentLimit: Joi.number().integer().positive().required(),
  //       gameType: Joi.string().required(),
  //       longitude: Joi.number().required(),
  //       latitude: Joi.number().required(),
  //       rules: Joi.string().required(),
  //       coHost1Phone: Joi.number().allow(null).optional(),
  //       coHost1Name: Joi.string().allow(null).optional(),
  //       coHost2Phone: Joi.number().allow(null).optional(),
  //       coHost2Name: Joi.string().allow(null).optional(),
  //       coverPhoto: Joi.string().optional().allow(null),
  //     });

  //     const { error } = tournamentSchema.validate(req.body);
  //     if (error) return next(error);

  //     try {
  //       const existingTournament = await Tournament.exists({
  //         tournamentName: req.body.tournamentName,
  //         isCompleted: false,
  //         user: userInfo.userId,
  //         isActive: false,
  //       });

  //       if (existingTournament) {
  //         const tournament = await Tournament.findById(existingTournament._id).populate("user");
  //         return res.status(200).json({
  //           success: true,
  //           message: "Tournament Already Created",
  //           data: tournament,
  //         });
  //       }

  //       // Normalize today's UTC date
  //       const now = new Date();
  //       const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())); // UTC midnight

  //       // Parse and convert user-provided dates
  //       const userStartDate = new Date(req.body.tournamentStartDateTime);
  //       const userEndDate = new Date(req.body.tournamentEndDateTime);

  //       // Direct conversion to UTC (dates are in ISO format)
  //       const startUTC = new Date(userStartDate.toISOString());
  //       const endUTC = new Date(userEndDate.toISOString());

  //       // Log dates for debugging
  //       console.log("Current Time (Local):", now);
  //       console.log("Today (UTC Midnight):", todayUTC);
  //       console.log("User Start Date (Original):", userStartDate);
  //       console.log("User End Date (Original):", userEndDate);
  //       console.log("User Start Date (UTC):", startUTC);
  //       console.log("User End Date (UTC):", endUTC);

  //       // Validate dates
  //       if (startUTC < todayUTC) {
  //         console.error("Validation Failed: Start date is in the past.");
  //         return res.status(400).json({
  //           message: "Tournament start date must be today or in the future.",
  //         });
  //       }

  //       if (startUTC > endUTC) {
  //         console.error("Validation Failed: Start date is after end date.");
  //         return res.status(400).json({
  //           message: "Tournament start date cannot be later than the end date.",
  //         });
  //       }

  //       // Call service to create a new tournament
  //       const { newTournament, fcmToken } = await tournamentServices.createTournament(
  //         req.body,
  //         startUTC,
  //         endUTC
  //       );

  //       // Ensure `isActive` status is set to true
  //       newTournament.isActive = true;
  //       await newTournament.save();

  //       const notificationData = {
  //         title: "Gully Team",
  //         body: `${newTournament.tournamentName} Tournament created successfully! Get ready for an epic showdown.`,
  //       };

  //       if (fcmToken) {
  //         await firebaseNotification.sendNotification(fcmToken, notificationData);
  //       }

  //       return res.status(200).json({
  //         success: true,
  //         message: "Tournament Created Successfully",
  //         data: newTournament,
  //       });
  //     } catch (err) {
  //       console.error("Error in createTournament:", err);
  //       return next(err);
  //     }
  //   },

  // const tournamentController = {
  //   async createTournament(req, res, next) {
  //     const userInfo = global.user;

  //     if (!userInfo || !userInfo.userId) {
  //       return res.status(400).json({
  //         success: false,
  //         message: "User not authenticated.",
  //       });
  //     }

  //     // Joi schema for validation
  //     const tournamentSchema = Joi.object({
  //       tournamentStartDateTime: Joi.date().iso().required(),
  //       tournamentEndDateTime: Joi.date().iso().required(),
  //       tournamentName: Joi.string().min(3).max(30).required(),
  //       tournamentCategory: Joi.string().required(),
  //       ballType: Joi.string().required(),
  //       pitchType: Joi.string().required(),
  //       matchType: Joi.string().required(),
  //       tournamentPrize: Joi.string().required(),
  //       selectLocation: Joi.string().required(),
  //       fees: Joi.number().integer().min(0).required(),
  //       ballCharges: Joi.number().min(0).required(),
  //       breakfastCharges: Joi.number().integer().min(0).required(),
  //       stadiumAddress: Joi.string().required(),
  //       tournamentLimit: Joi.number().integer().positive().required(),
  //       gameType: Joi.string().required(),
  //       longitude: Joi.number().required(),
  //       latitude: Joi.number().required(),
  //       rules: Joi.string().required(),
  //       coHost1Phone: Joi.number().allow(null).optional(),
  //       coHost1Name: Joi.string().allow(null).optional(),
  //       coHost2Phone: Joi.number().allow(null).optional(),
  //       coHost2Name: Joi.string().allow(null).optional(),
  //       coverPhoto: Joi.string().optional().allow(null),
  //     });

  //     const { error } = tournamentSchema.validate(req.body);
  //     if (error) return next(error);

  //     try {
  //       // Check if a tournament with the same name already exists for the user
  //       const TournamentExist = await Tournament.exists({
  //         tournamentName: req.body.tournamentName,
  //         isCompleted: false,
  //         user: userInfo.userId,
  //         isActive: false,
  //       });

  //       if (TournamentExist) {
  //         const tournament = await Tournament.findById(TournamentExist._id).populate("user");
  //         return res.status(200).json({
  //           success: true,
  //           message: "Tournament Already Created",
  //           data: tournament,
  //         });
  //       }

  //       // Check if a tournament with the same name already exists globally
  //       const TournamentNameExist = await Tournament.exists({
  //         tournamentName: req.body.tournamentName,
  //         isCompleted: false,
  //       });

  //       if (TournamentNameExist) {
  //         return next(
  //           CustomErrorHandler.alreadyExist("This Tournament Name is already present.")
  //         );
  //       }

  //       // Parse dates as local timezone and convert to UTC
  //       const userStartDate = new Date(req.body.tournamentStartDateTime);
  //       const userEndDate = new Date(req.body.tournamentEndDateTime);

  //       const startUTC = new Date(userStartDate.getTime() - userStartDate.getTimezoneOffset() * 60000);
  //       const endUTC = new Date(userEndDate.getTime() - userEndDate.getTimezoneOffset() * 60000);

  //       // Get today's UTC midnight for comparison
  //       const today = new Date();
  //       today.setUTCHours(0, 0, 0, 0);

  //       // Validate dates
  //       if (startUTC < today) {
  //         return res.status(400).json({
  //           message: "Tournament start date must be today or in the future.",
  //         });
  //       }

  //       if (startUTC > endUTC) {
  //         return res.status(400).json({
  //           message: "Tournament start date cannot be later than the end date.",
  //         });
  //       }

  //       const { newTournament, fcmToken } = await tournamentServices.createTournament(
  //         req.body,
  //         startUTC,
  //         endUTC
  //       );

  //       // Ensure `isActive` status is set to true
  //       newTournament.isActive = true;
  //       await newTournament.save();

  //       const notificationData = {
  //         title: "Gully Team",
  //         body: `${newTournament.tournamentName} Tournament created successfully! Get ready for an epic showdown.`,
  //       };

  //       if (fcmToken) {
  //         await firebaseNotification.sendNotification(fcmToken, notificationData);
  //       }

  //       return res.status(200).json({
  //         success: true,
  //         message: "Tournament Created Successfully",
  //         data: newTournament,
  //       });
  //     } catch (err) {
  //       console.error("Error in createTournament:", err);
  //       return next(err);
  //     }
  //   },

  // async editTournament(req, res, next) {
  //   const TournamentId = req.params.id;

  //   // Joi schema for validation
  //   const tournamentSchema = Joi.object({
  //     tournamentStartDateTime: Joi.date().iso().required(),
  //     tournamentEndDateTime: Joi.date()
  //       .iso()
  //       .greater(Joi.ref("tournamentStartDateTime"))
  //       .required(),
  //     tournamentName: Joi.string().min(3).max(30).required(),
  //     tournamentCategory: Joi.string().required(),
  //     ballType: Joi.string().required(),
  //     pitchType: Joi.string().required(),
  //     matchType: Joi.string().required(),
  //     tournamentPrize: Joi.string().required(),
  //     selectLocation: Joi.string().required(),
  //     fees: Joi.number().positive().min(0).max(1000000).required(),
  //     ballCharges: Joi.number().min(0).positive().required(),
  //     breakfastCharges: Joi.number().min(0).positive().required(),
  //     stadiumAddress: Joi.string().required(),
  //     tournamentLimit: Joi.number().integer().positive().required(),
  //     gameType: Joi.string().required(),
  //     longitude: Joi.number().required(),
  //     latitude: Joi.number().required(),
  //     rules: Joi.string().required(),
  //     coverPhoto: Joi.string().optional().allow(null),
  //     coHost1Phone: Joi.number().allow(null).optional(),
  //     coHost1Name: Joi.string().allow(null).optional(),
  //     coHost2Phone: Joi.number().allow(null).optional(),
  //     coHost2Name: Joi.string().allow(null).optional(),
  //   });

  //   const { error } = tournamentSchema.validate(req.body);

  //   if (error) {
  //     return next(error);
  //   }

  //   const today = new Date();
  //   today.setUTCHours(0, 0, 0, 0); // Normalize to UTC midnight

  //   try {
  //     const tournament = await Tournament.findById(TournamentId);

  //     if (!tournament) {
  //       return next(CustomErrorHandler.notFound("Tournament not found."));
  //     }

  //     // Check if tournament name has been changed and already exists
  //     if (tournament.tournamentName !== req.body.tournamentName) {
  //       const TournamentNameExist = await Tournament.exists({
  //         tournamentName: req.body.tournamentName,
  //         isCompleted: false,
  //       });

  //       if (TournamentNameExist) {
  //         return next(
  //           CustomErrorHandler.alreadyExist("This Tournament Name already exists.")
  //         );
  //       }
  //     }

  //     // Handle start and end dates
  //     const userStartDate = req.body.tournamentStartDateTime
  //       ? new Date(req.body.tournamentStartDateTime)
  //       : tournament.tournamentStartDateTime;

  //     const userEndDate = req.body.tournamentEndDateTime
  //       ? new Date(req.body.tournamentEndDateTime)
  //       : tournament.tournamentEndDateTime;

  //     // Validate dates
  //     if (userStartDate < today || userEndDate < today) {
  //       return next(
  //         CustomErrorHandler.badRequest(
  //           "Invalid start or end date. Please set the dates from today onwards."
  //         )
  //       );
  //     }

  //     // Update tournament
  //     const result = await tournamentServices.editTournament(
  //       req.body,
  //       userStartDate,
  //       userEndDate,
  //       TournamentId
  //     );

  //     return res.status(200).json({
  //       success: true,
  //       message: "Tournament Edited Successfully",
  //       data: result,
  //     });
  //   } catch (err) {
  //     console.error("Error in editTournament:", err);
  //     return next(err);
  //   }
  // },


  //   async editTournament(req, res, next) {
  //     let TournamentId = req.params.id;

  //     //validation
  //     // Joi schema for validation
  //     const tournamentSchema = Joi.object({
  //       tournamentStartDateTime: Joi.date().iso().required(),
  //       tournamentEndDateTime: Joi.date()
  //         .iso()
  //         .greater(Joi.ref("tournamentStartDateTime"))
  //         .required(),
  //       tournamentName: Joi.string().min(3).max(30).required(),
  //       tournamentCategory: Joi.string().required(),
  //       ballType: Joi.string().required(),
  //       pitchType: Joi.string().required(),
  //       matchType: Joi.string().required(),
  //       tournamentPrize: Joi.string().required(),
  //       selectLocation: Joi.string().required(),
  //       fees: Joi.number().positive().min(0).max(1000000).required(),
  //       ballCharges: Joi.number().min(0).positive().required(),
  //       breakfastCharges: Joi.number().min(0).positive().required(),
  //       stadiumAddress: Joi.string().required(),
  //       tournamentLimit: Joi.number().integer().positive().required(),
  //       gameType: Joi.string().required(),
  //       longitude: Joi.number().required(),
  //       latitude: Joi.number().required(),
  //       rules: Joi.string().required(),
  //       coverPhoto: Joi.string().optional().allow(null),
  //       coHost1Phone: Joi.number().allow(null).optional(),
  //       coHost1Name: Joi.string().allow(null).optional(),

  //       coHost2Phone: Joi.number().allow(null).optional(),
  //       coHost2Name: Joi.string().allow(null).optional(),
  //     });

  //     const { error } = tournamentSchema.validate(req.body);

  //     if (error) {
  //       return next(error);
  //     }

  //     console.log(req.body);

  //     const tournament = await Tournament.findById(TournamentId);

  //     if (tournament.tournamentName !== req.body.tournamentName) {
  //       //verify phone Number aready exist
  //       const TournamentNameExist = await Tournament.exists({
  //         tournamentName: req.body.tournamentName,
  //         isCompleted: false,
  //       });

  //       if (TournamentNameExist) {
  //         return next(
  //           CustomErrorHandler.alreadyExist("This Tournament Name alredy Exist.")
  //         );
  //       }
  //     }

  //     const userStartDate = req.body.tournamentStartDateTime
  //       ? new Date(req.body.tournamentStartDateTime)
  //       : tournament.tournamentStartDateTime;

  //     let userEndDate = req.body.tournamentEndDateTime
  //       ? new Date(
  //           `${
  //             new Date(req.body.tournamentEndDateTime).toISOString().split("T")[0]
  //           }T23:59:59.999Z`
  //         )
  //       : tournament.tournamentEndDateTime;

  //     const today = new Date();

  //     // const oneDayBeforeTournament = new Date(
  //     //   tournament.tournamentStartDateTime.getTime() - 1 * 24 * 60 * 60 * 1000
  //     // );
  // if (userStartDate < today || userEndDate < today) { // Highlighted Change: Allow start date from today
  //     return next(
  //       CustomErrorHandler.badRequest(
  //         "Invalid start or end date. Please set the dates from today onwards."
  //       )
  //     );
  //   }
  //     // if (today >= oneDayBeforeTournament) {
  //     //   return next(
  //     //     CustomErrorHandler.badRequest(
  //     //       "Organizer cannot edit a tournament one day before it starts."
  //     //     )
  //     //   );
  //     // }

  //     let minStartDate;

  //     // Extract date parts from tournament and req.body values
  //     const tournamentStartDate = new Date(tournament.tournamentStartDateTime)
  //       .toISOString()
  //       .split("T")[0];
  //     const requestBodyStartDate = new Date(req.body.tournamentStartDateTime)
  //       .toISOString()
  //       .split("T")[0];

  //     // Check if tournament start date is not equal to req.body start date
  //     if (tournamentStartDate !== requestBodyStartDate) {
  //       // Your logic here if the dates are not equal
  //       if (userStartDate < minStartDate || userEndDate < minStartDate) {
  //         return next(
  //           CustomErrorHandler.badRequest(
  //             "Invalid start or end date. Please set the dates at least 4 days from today."
  //           )
  //         );
  //       }
  //     }

  //     // Check if the new dates are at least 4 days from today only if dates are provided
  //     if (req.body.tournamentStartDateTime || req.body.tournamentEndDateTime) {
  //       minStartDate = new Date(today.getTime() + 4 * 24 * 60 * 60 * 1000);
  //     }

  //     try {
  //       const result = await tournamentServices.editTournament(
  //         req.body,
  //         userStartDate,
  //         userEndDate,
  //         TournamentId
  //       );

  //       return res.status(200).json({
  //         sucess: true,
  //         message: "Tournament Edited Suessfully",
  //         data: result,
  //       });
  //     } catch (err) {
  //       console.log(" Error in editTournament ");
  //       return next(err);
  //     }
  //   },

  async getTournament(req, res, next) {
    try {
      const result = await tournamentServices.getTournament(req.body);
      return res.status(200).json({
        sucess: true,
        message: "Tournament Retrieved Suessfully",
        data: {
          tournamentList: result.tournament_data,
          matches: result.matches,
        },
      });
    } catch (err) {
      console.log(" Error in  Retrieved Tournament");
      return next(err);
    }
  },

  async getTournamentById(req, res) {
    try {
      const { tournamentId } = req.params;
      const tournamentData = await tournamentServices.getTournamentById(tournamentId);
      return res.status(200).json({
        success: true,
        data: tournamentData,
      });
    } catch (error) {
      console.error("Error fetching tournament:", error);
      return res.status(500).json({
        success: false,
        message: "An error occurred while fetching the tournament",
        error: error.message,
      });
    }
  },

  async getTournamentByName(req, res, next) {
    let query = req.query.query;
    try {
      const result = await tournamentServices.getTournamentByName(query);

      return res.status(200).json({
        sucess: true,
        message: "Tournament Retrieved Suessfully",
        data: {
          tournamentList: result,
        },
      });
    } catch (err) {
      console.log(" Error in  Retrieved Tournament");
      return next(err);
    }
  },

  async deleteTournament(req, res, next) {
    let TournamentId = req.params.Id;
    try {
      const result = await tournamentServices.deleteTournament(TournamentId);

      return res.status(200).json({
        sucess: true,
        message: "Tournament Deleted Suessfully",
        data: result,
      });
    } catch (err) {
      console.log(" Error in  deleteTournament");
      return next(err);
    }
  },

  async getCurrentTournament(req, res, next) {
    try {
      const result = await tournamentServices.getCurrentTournamentByOrganizer(
        req.body
      );

      return res.status(200).json({
        sucess: true,
        message: "Current Tournament Retrieved Suessfully",
        data: { tournamentList: result },
      });
    } catch (err) {
      console.log(" Error in  getCurrentTournament");
      return next(err);
    }
  },

  async getAllTournament(req, res, next) {
    try {
      const result = await tournamentServices.getAllTournamentByOrganizer(
        req.body
      );

      return res.status(200).json({
        sucess: true,
        message: "Tournaments Retrieved Suessfully",
        data: { tournamentList: result },
      });
    } catch (err) {
      console.log(" Error in  getTournaments");
      return next(err);
    }
  },

  async entryForm(req, res, next) {
    let teamID = req.params.teamID;
    let tournamentID = req.params.tournamentID;
    try {

      // const org= await Tournament.findOne({ _id: tournamentID });
      // const userId = org.user._id;
      // console.log("User id:", userId);
      // const user = await User.findOne({ _id: userId });
      // if (!user) {
      //   throw CustomErrorHandler.notFound("User not found.");
      // }
      // const fcmToken = user.fcmToken;
      // console.log("Organizer FCM Token:", fcmToken);
      // const tournamentname=org.tournamentName;
      // console.log("Organizer FCM Token", fcmToken);
      const result = await tournamentServices.createEntryForm(
        teamID,
        tournamentID
      );
      // const notificationData = {
      //   title: "Team Request",
      //   body: `Hey Organizer, ${result.teamName} has requested to join your tournament ${tournamentname}.`,
      //   image: "",
      // };

      // if (fcmToken) {
      //    await firebaseNotification.sendNotification(
      //     fcmToken,
      //     notificationData
      //   );
      // }
      return res.status(200).json({
        sucess: true,
        message: "Entry Form Filled Successfully",
        data: result,
      });
    } catch (err) {
      console.log(" Error in  entryForm");
      return next(err);
    }
  },

  async pendingTeamRequest(req, res, next) {
    let tournamentID = req.params.tournamentID;

    try {
      const result = await tournamentServices.teamRequest(
        tournamentID,
        "Pending"
      );

      return res.status(200).json({
        sucess: true,
        message: "Pending Team Data FetchedSuccessfully",
        data: { teamRequests: result.tournament_data },
      });
    } catch (err) {
      console.log(" Error in  pendingTeamRequest");
      return next(err);
    }
  },

  async rejectedTeamRequest(req, res, next) {
    let tournamentID = req.params.tournamentID;

    try {
      const result = await tournamentServices.teamRequest(
        tournamentID,
        "Denied"
      );

      return res.status(200).json({
        sucess: true,
        message: "Rejected Team Data FetchedSuccessfully",
        data: { teamRequests: result },
      });
    } catch (err) {
      console.log(" Error in  pendingTeamRequest");
      return next(err);
    }
  },

  async acceptedTeamRequest(req, res, next) {
    let tournamentID = req.params.tournamentID;

    try {
      const { tournament_data } = await tournamentServices.teamRequest(
        tournamentID,
        "Accepted"
      );

      return res.status(200).json({
        sucess: true,
        message: "Accepted Team Data Fetched Successfully",
        data: { registeredTeams: tournament_data },
      });
    } catch (err) {
      console.log(" Error in  acceptedTeamRequest");
      return next(err);
    }
  },

  async updateTeamRequest(req, res, next) {
    let teamID = req.params.teamID;
    let tournamentID = req.params.tournamentID;
    let action = req.params.action;

    try {
      const result = await tournamentServices.updateTeamRequest(
        teamID,
        tournamentID,
        action
      );

      return res.status(200).json({
        sucess: true,
        message: "Team Status Updated Successfully",
        data: result,
      });
    } catch (err) {
      console.log(" Error in  updateTeamRequest");
      return next(err);
    }
  },

  async getCount(req, res, next) {
    try {
      const result = await tournamentServices.getCount();

      return res.status(200).json({
        sucess: true,
        message: "Data Retrieved Suessfully",
        data: result,
      });
    } catch (err) {
      console.log(" Error in  getCount");
      return next(err);
    }
  },

  async getTournamentByUser(req, res, next) {
    try {
      const result = await tournamentServices.getTournamentByUser();

      return res.status(200).json({
        sucess: true,
        message: "Data Retrieved Suessfully",
        data: result,
      });
    } catch (err) {
      console.log(" Error in  getTournamentByUser");
      return next(err);
    }
  },

  async updateAuthority(req, res, next) {
    let tournamentID = req.body.tournamentID;
    let UserId = req.body.UserId;

    try {
      const result = await tournamentServices.updateAutority(
        tournamentID,
        UserId
      );

      return res.status(200).json({
        sucess: true,
        message: "Tournament Autority Updated Successfully",
        data: { id: result },
      });
    } catch (err) {
      console.log(" Error in  updateAutority");
      return next(err);
    }
  },



  async eliminateTeams(req, res) {
    try {
      const { tournamentId } = req.params;
      const { eliminatedTeamIds } = req.body;

      if (!tournamentId) {
        return res.status(400).json({ message: "Tournament ID is required." });
      }

      if (!eliminatedTeamIds || !Array.isArray(eliminatedTeamIds) || eliminatedTeamIds.length === 0) {
        return res.status(400).json({ message: "Eliminated team IDs are required." });
      }

      const result = await tournamentServices.eliminateTeams(tournamentId, eliminatedTeamIds);

      return res.status(200).json({
        success: true,
        message: "Teams eliminated successfully.",
        data: {
          remainingTeams: result.remainingTeams,
        },
      });
    } catch (error) {
      console.error("Error in eliminateTeams controller:", error);
      return res.status(500).json({ message: "Internal server error." });
    }
  },



  async getEliminatedTeams(req, res) {
    try {
      const { tournamentId } = req.params;

      if (!tournamentId) {
        return res.status(400).json({ message: "Tournament ID is required." });
      }

      const eliminatedTeams = await tournamentServices.getEliminatedTeams(tournamentId);

      return res.status(200).json({
        success: true,
        message: "Eliminated teams fetched successfully.",
        data: eliminatedTeams,
      });
    } catch (error) {
      console.error("Error in getEliminatedTeams controller:", error);
      return res.status(500).json({ message: "Internal server error." });
    }
  },


};

export default tournamentController;
