import Joi from "joi";
import CustomErrorHandler from "../helpers/CustomErrorHandler.js";
import { Team} from "../models/index.js";
import { adminService, teamServices } from "../services/index.js";
import firebaseNotification from "../helpers/firebaseNotification.js";

const teamController = {
  async getTeamById(req, res, next) {
    let TeamId = req.params.Id;
    try {
      const result = await teamServices.getTeamById(TeamId);

      return res.status(200).json({
        sucess: true,
        message: "Team Retrieved Successfully",
        data: result,
      });
    } catch (err) {
      console.log(" Error in  getTeamById");
      return next(err);
    }
  },

  async teamListByTournamentID(req, res, next) {
    let TeamId = req.params.Id;
    try {
      const result = await teamServices.getTeamById(TeamId);

      return res.status(200).json({
        success: true,
        message: "Team Retrieved Successfully",
        data: result,
      });
    } catch (err) {
      console.log(" Error in  getTeamById");
      return next(err);
    }
  },
  async getUserTeams(req, res, next) {
    try {
      // Pass user info from req.user to service
      const result = await teamServices.getUserTeams(req.user); 
      
      return res.status(200).json({
        success: true,
        message: "User's teams retrieved successfully",
        data: { teams: result },
      });
    } catch (err) {
      console.log("Error in getUserTeams");
      return next(err);
    }
  },
 // old code
  // async getAllTeams(req, res, next) {
  //   try {
  //     const result = await teamServices.getAllTeams();

  //     return res.status(200).json({
  //       success: true,
  //       message: "All Team Retrieved Successfully",
  //       data: { teams: result },
  //     });
  //   } catch (err) {
  //     console.log(" Error in getAllTeams");
  //     return next(err);
  //   }
  // },
 
  // async getPlayerTeams(req, res, next) {
  //   try {
  //     // Get the phone number from the logged-in user (from the token)
  //     const { phoneNumber } = req.user; // Assuming the phone number is available in the JWT token
  
  //     // Fetch teams by phone number from the service
  //     const teams = await teamServices.getTeamsByPhoneNumber(phoneNumber);
  
  //     // Return the teams
  //     return res.status(200).json({
  //       success: true,
  //       message: "Teams retrieved successfully",
  //       data: { teams },
  //     });
  //   } catch (err) {
  //     console.log("Error in getPlayerTeams:", err);
  //     return next(err);
  //   }
  // },
  async getPlayerTeams(req, res, next) {
    try {
      const { phoneNumber } = req.user; // Assuming phone number is available in req.user after token authentication
  
      // Fetch teams by phone number using the service
      const teams = await teamServices.getTeamsByPhoneNumber(phoneNumber);
  
      // Return the teams with player count
      return res.status(200).json({
        success: true,
        message: "Teams retrieved successfully",
        data: { teams },
      });
    } catch (err) {
      console.log("Error in getPlayerTeams:", err);
      return next(err);
    }
  },
  

//old code where user can retrieve his team by his user id
  // async getUserTeams(req, res, next) {
  //   try {
  //     const result = await teamServices.getUserTeams();

  //     return res.status(200).json({
  //       success: true,
  //       message: "All Team Retrieved Successfully",
  //       data: { teams: result },
  //     });
  //   } catch (err) {
  //     console.log(" Error in getUserTeams");
  //     return next(err);
  //   }
  // },
  async createTeam(req, res, next) {
    //validation
    const teamValidation = Joi.object({
     
      teamName: Joi.string().regex(/^[a-zA-Z][a-zA-Z0-9 ]*$/).required().min(3).max(25),
      teamLogo: Joi.string().optional(),
    });

    const { error } = teamValidation.validate(req.body);

    if (error) {
      console.log("Error in createTeam validation", error);
      return next(CustomErrorHandler.validationError("Failed To Create team "));
    }

    //verify teamName aready exist
    // const TeamNameExist = await Team.exists({ teamName: req.body.teamName });

    // if (TeamNameExist) {
    //   return next(
    //     CustomErrorHandler.alreadyExist("This Team Name already present.")
    //   );
    // }

    try {
      
      const { teamdata, fcmToken } = await teamServices.createTeam(req.body,);

    // for notification
      //await adminService.sendNotification(fcmToken,`Team Created!🏅  Congratulations! Your team ${teamdata.teamName} has been successfully created.`);

      const notificationData = {
        title: "Gully Team",
        body: `Team Created!🏅  Congratulations! Your team ${teamdata.teamName} has been successfully created.`,
        image: "",
      };

      if (fcmToken) {
         await firebaseNotification.sendNotification(
          fcmToken,
          notificationData
        );
      }
  
      return res.status(200).json({
        sucess: true,
        message: "profile created suessfully",
        data: teamdata,
      });
    } catch (err) {
      console.log("Error in createTeam");
      return next(err);
    }
  },

  // async createTeam(req, res, next) {
  //   //validation
  //   const teamValidation = Joi.object({
  //     //teamName:Joi.string().regex(/^[a-zA-Z\s][a-zA-Z0-9-\s]*$/).min(3).max(30).required(),
  //     teamName:Joi.string().regex(/^[a-zA-Z][a-zA-Z0-9\s-]*$/).min(3).max(30).required()
  //     .messages({
  //       'string.base': 'Name must be a string',
  //       'string.pattern.base': 'Name must start with a letter and can contain letters, numbers, spaces, and dashes only',
  //       'string.empty': 'Name is required',
  //       'any.required': 'Name is required',
  //       'string.min': 'Name must have at least {#limit} characters',
  //       'string.max': 'Name must have at most {#limit} characters'
  //   }),
  //     teamLogo: Joi.string().optional(),
  //     // tournamentId: Joi.string().required(), //DG
  //   });

  //   const { error } = teamValidation.validate(req.body);

  //   if (error) {
  //     return next(error);
  //   }

  //   //verify teamName aready exist
  //   // const TeamNameExist = await Team.exists({ teamName: req.body.teamName });

  //   // if (TeamNameExist) {
  //   //   return next(
  //   //     CustomErrorHandler.alreadyExist("This Team Name already present.")
  //   //   );
  //   // }

  //   try {
      
  //     const { teamdata, fcmToken } = await teamServices.createTeam(req.body,);

  //   // for notification
  //     //await adminService.sendNotification(fcmToken,`Team Created!🏅  Congratulations! Your team ${teamdata.teamName} has been successfully created.`);

  //     const notificationData = {
  //       title: "Gully Team",
  //       body: `Team Created!🏅  Congratulations! Your team ${teamdata.teamName} has been successfully created.`,
  //       image: "",
  //     };

  //     if (fcmToken) {
  //        await firebaseNotification.sendNotification(
  //         fcmToken,
  //         notificationData
  //       );
  //     }
  
  //     return res.status(200).json({
  //       success: true,
  //       message: "profile created successfully",
  //       data: teamdata,
  //     });
  //   } catch (err) {
  //     console.log("Error in createTeam");
  //     return next(err);
  //   }
  // },
 
 
  
  // async editTeam(req, res, next) {
  //   let TeamId = req.params.Id;
  //   // Validation
  //   const teamValidation = Joi.object({
  //     teamLogo: Joi.string().optional(),
  //     teamName: Joi.string().required(),
  //   });
  
  //   const { error } = teamValidation.validate(req.body);
  
  //   if (error) {
  //     return next(error);
  //   }
  
  //   const team = await Team.findById(TeamId);
  
  //   if (!team) {
  //     return next(CustomErrorHandler.notFound("Team not found"));
  //   }
  
  //   if (team.teamName !== req.body.teamName) {
  //     // Check if team name already exists
  //     const TeamNameExist = await Team.exists({
  //       teamName: req.body.teamName,
  //     });
  
  //     if (TeamNameExist) {
  //       return next(
  //         CustomErrorHandler.alreadyExist(
  //           "This Team Name is already taken. Please try another name."
  //         )
  //       );
  //     }
  //   }
  
  //   try {
  //     const result = await teamServices.editTeam(req.body, TeamId);
  
  //     return res.status(200).json({
  //       success: true,
  //       message: "Profile edited successfully",
  //       data: result,
  //     });
  //   } catch (err) {
  //     console.log("Error in editTeam");
  //     return next(err);
  //   }
  // },
  async addPlayer(req, res, next) {
    let TeamId = req.params.Id;
    // Validation
    const playerValidation = Joi.object({
      name: Joi.string().regex(/^[a-zA-Z\s][a-zA-Z0-9-\s]*$/).min(1).max(255).required(),
      phoneNumber: Joi.string().pattern(/^\d{10}$/).required(),
      role: Joi.string().valid("Batsman", "Bowler", "All Rounder", "Wicket Keeper").required(),
    });
  
    const { error } = playerValidation.validate(req.body);
  
    if (error) {
      return next(error);
    }
  
    try {
      // Add the player to the team
      const { teamdata, fcmToken } = await teamServices.addPlayer(req.body, TeamId, req.user);
  
      // Send notification if user is found and has an FCM token
      const notificationData = {
        title: "Gully Team",
        body: `Exciting news! You've been added to team ${teamdata.teamName} by the captain.`,
        image: "",
      };
    
      if (fcmToken) {
        await firebaseNotification.sendNotification(fcmToken, notificationData);
      }
  
      return res.status(200).json({
        success: true,
        message: "Player added successfully",
        data: teamdata,
      });
    } catch (err) {
      console.log("Error in addPlayer");
      return next(err);
    }
},

  // async addPlayer(req, res, next) {
  //   let TeamId = req.params.Id;
  //   // Validation
  //   const playerValidation = Joi.object({
  //     name: Joi.string().regex(/^[a-zA-Z\s][a-zA-Z0-9-\s]*$/).min(1).max(255).required(),
  //     phoneNumber: Joi.string().pattern(/^\d{10}$/).required(),
  //     role: Joi.string().valid("Batsman", "Bowler", "All Rounder", "Wicket Keeper").required(),
  //   });
  
  //   const { error } = playerValidation.validate(req.body);
  
  //   if (error) {
  //     return next(error);
  //   }
  
  //   try {
  //     // Add the player to the team
  //     const { teamdata, fcmToken } = await teamServices.addPlayer(req.body, TeamId, req.user);
  
  //     const notificationData = {
  //       title: "Gully Team",
  //       body: `Exciting news! You've been added to team ${teamdata.teamName} by the captain.`,
  //       image: "",
  //   };
    
  //     if (fcmToken) {
  //       await firebaseNotification.sendNotification(fcmToken, notificationData);
  //     }
  
  //     return res.status(200).json({
  //       success: true,
  //       message: "Player added successfully",
  //       data: teamdata,
  //     });
  //   } catch (err) {
  //     console.log("Error in addPlayer");
  //     return next(err);
  //   }
  // },


  
  
  // async addPlayer(req, res, next) {
  //   let TeamId = req.params.Id;
  //   // Validation
  //   const playerValidation = Joi.object({
  //     name: Joi.string().regex(/^[a-zA-Z\s][a-zA-Z0-9-\s]*$/).min(1).max(255).required(),
  //     phoneNumber: Joi.string().pattern(/^\d{10}$/).required(),
  //     role: Joi.string().valid("Batsman", "Bowler", "All Rounder", "Wicket Keeper").required(),
  //   });
  
  //   const { error } = playerValidation.validate(req.body);
  
  //   if (error) {
  //     return next(error);
  //   }
  
  //   try {
  //     // Add the player to the team
  //     const { teamdata, fcmToken } = await teamServices.addPlayer(req.body, TeamId, req.user);
  
  //     const notificationData = {
  //       title: "Gully Team",
  //       body: `Exciting news! You've been added to team ${teamdata.teamName} by the captain.`,
  //       image: "",
  //     };
  
  //     if (fcmToken) {
  //       await firebaseNotification.sendNotification(fcmToken, notificationData);
  //     }
  
  //     return res.status(200).json({
  //       success: true,
  //       message: "Player added successfully",
  //       data: teamdata,
  //     });
  //   } catch (err) {
  //     console.log("Error in addPlayer");
  //     return next(err);
  //   }
  // },
  
  
  async deletePlayer(req, res, next) {
    let teamId = req.params.teamId;
    let playerId = req.params.playerId;
  
    try {
      const result = await teamServices.deletePlayer(teamId, playerId);
  
      return res.status(200).json({
        success: true,
        message: "Player deleted successfully",
        data: result,
      });
    } catch (err) {
      console.log("Error in deletePlayer");
      return next(err);
    }
  },
  async changeCaptain(req, res, next) {
    try {
        const { teamId } = req.params;
        const { newCaptainId, newRole, previousCaptainId, previousCaptainRole } = req.body;

        // Validate the data
        if (!newCaptainId || !newRole || !previousCaptainId) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields (newCaptainId, newRole, or previousCaptainId)',
            });
        }

        const result = await teamServices.changeCaptain(
            req.user.id, 
            teamId, 
            newCaptainId, 
            newRole, 
            previousCaptainId, 
            previousCaptainRole
        );

        res.status(200).json({
            success: true,
            message: 'Captain changed successfully',
            data: result,
        });
    } catch (err) {
        console.log('Error in changeCaptain:', err.message);
        next(err); // Pass error to the next middleware or error handler
    }
},



async editTeam(req, res, next) {
  let TeamId = req.params.Id;

  // Validation
  const teamValidation = Joi.object({
    teamLogo: Joi.string().optional(),
    teamName: Joi.string().required(),
  });

  const { error } = teamValidation.validate(req.body);

  if (error) {
    return next(error);
  }

  const team = await Team.findById(TeamId);

  if (!team) {
    return next(CustomErrorHandler.notFound("Team not found"));
  }

  if (team.teamName !== req.body.teamName) {
    const TeamNameExist = await Team.exists({
      teamName: req.body.teamName,
    });

    if (TeamNameExist) {
      return next(
        CustomErrorHandler.alreadyExist(
          "This Tournament Name is already taken. Please try another name."
        )
      );
    }
  }

  try {
    const result = await teamServices.editTeam(req.body, TeamId);

    return res.status(200).json({
      success: true,
      message: "Profile edited successfully",
      data: result,
    });
  } catch (err) {
    console.log("Error in editTeam", err);
    return next(err);
  }
},
  // async addPlayer(req, res, next) {
  //   let TeamId = req.params.Id;
  //   //validation
  //   const playerValidation = Joi.object({
  //     //it is old validation
  //     //name: Joi.string().regex(/^[a-zA-Z][a-zA-Z0-9-]*$/).min(1).max(255).required(),
  //     //new validation(22-05)
  //    name: Joi.string().regex(/^[a-zA-Z\s][a-zA-Z0-9-\s]*$/).min(1).max(255).required(),


  //     phoneNumber: Joi.string()
  //       .pattern(/^\d{10}$/)
  //       .required(),
  //     role: Joi.string()
  //       .valid("Batsman", "Bowler", "All Rounder", "Wicket Keeper")
  //       .required(),
  //   });

  //   const { error } = playerValidation.validate(req.body);

  //   if (error) {
  //     return next(error);
  //   }

  //   try {
  //     const { teamdata, fcmToken } = await teamServices.addPlayer(
  //       req.body,
  //       TeamId
  //     );

  //     //await adminService.sendNotification(registrationToken,`Exciting news! You've been added to  ${teamdata.teamName} by the captain`);

  //     const notificationData = {
  //       title: "Gully Team",
  //       body: `Exciting news! You've been added to team  ${teamdata.teamName} by the captain`,
  //       image: "",
  //     };

  //     if (fcmToken) {
  //       await firebaseNotification.sendNotification(
  //         fcmToken,
  //         notificationData
  //       );
       
  //     }

  //     return res.status(200).json({
  //       success: true,
  //       message: "Player Added successfully",
  //       data: teamdata,
  //     });
  //   } catch (err) {
  //     console.log("Error in createTeam");
  //     return next(err);
  //   }
  // },

  // async deletePlayer(req, res, next) {
  //   let teamId = req.params.teamId;
  //   let playerId = req.params.playerId;

  //   try {
  //     const result = await teamServices.deletePlayer(teamId, playerId);

  //     return res.status(200).json({
  //       success: true,
  //       message: "Player deleted successfully",
  //       data: result,
  //     });
  //   } catch (err) {
  //     console.log("Error in editTeam");
  //     return next(err);
  //   }
  // },

  async addLookingFor(req, res, next) {
    //validation
    const playerValidation = Joi.object({
      latitude: Joi.number().required(),
      longitude: Joi.number().required(),
      placeName: Joi.string().required(),
      role: Joi.string().required(),
      // role: Joi.string()
      //   .valid("Batsman", "Bowler", "All Rounder", "Wicket Keeper")
      //   .required(),
    });

    const { error } = playerValidation.validate(req.body);

    if (error) {
      return next(error);
    }

    try {
      const result = await teamServices.addLookingFor(req.body);

      return res.status(200).json({
        success: true,
        message: "Add Looking For Added successfully",
        data: result,
      });
    } catch (err) {
      console.log("Error in addLookingFor",err);
      return next(err);
    }
  },

  async deleteLookingFor(req, res, next) {
    const lookingId = req.params.lookingId;

    try {
      const result = await teamServices.deleteLookingFor(lookingId);

      return res.status(200).json({
        success: true,
        message: " Looking deleted successfully",
        data: result,
      });
    } catch (err) {
      console.log("Error in deleteLookingFor");
      return next(err);
    }
  },

  async getAllLooking(req, res, next) {
    try {
      const result = await teamServices.getAllLooking(req.body);

      return res.status(200).json({
        success: true,
        message: "All Looking Retrieved Successfully",
        data: result,
      });
    } catch (err) {
      console.log(" Error in  getAllLooking");
      return next(err);
    }
  },

  async getAllNearByTeam(req, res, next) {
    try {
      const result = await teamServices.getAllNearByTeam(req.body);

      return res.status(200).json({
        success: true,
        message: "getAllNearByTeam Retrieved Successfully",
        data: { teams: result },
      });
    } catch (err) {
      console.log(" Error in  getAllNearByTeam");
      return next(err);
    }
  },

  async getLookingByID(req, res, next) {
    const lookingId = req.params.lookingId;

    try {
      const result = await teamServices.getLookingByID();

      return res.status(200).json({
        success: true,
        message: "Users Looking Retrieved Successfully",
        data: { data: result },
      });
    } catch (err) {
      console.log(" Error in  getLookingByID");
      return next(err);
    }
  },

  
  // async editPlayer(req, res, next) {
  //   const teamId = req.params.teamId;
  //   const playerId = req.params.playerId;

  //   //validation
  //   const playerValidation = Joi.object({
  //     name: Joi.string().min(1).max(255).required(),
  //     phoneNumber: Joi.string().pattern(/^\d{10}$/).required(),
  //     role: Joi.string().valid('Batsman', 'Bowler', 'All Rounder','Wicket Keeper').required(),
  //   });

  //   const { error } = playerValidation.validate(req.body);

  //   if (error) {
  //     return next(error);
  //   }

  //   try {

  //     const result = await teamServices.editPlayer(req.body,TeamId,playerId);

  //     return res.status(200).json({
  //       sucess: true,
  //       message: "TeamPlayer Edited suessfully",
  //       data: result,
  //     });
  //   } catch (err) {
  //     console.log("Error in editPlayer");
  //     return next(err);
  //   }
  // },


async getPointsTable(req, res, next) {
  try {
    const { tournamentId } = req.params;

    if (!tournamentId) {
      return next(CustomErrorHandler.badRequest('Tournament ID is required'));
    }

    const pointsTable = await teamServices.getPointsTable(tournamentId);

    res.status(200).json({
      success: true,
      message: 'Points Table Retrieved Successfully',
      data: {
        TeamPoints: pointsTable,
      },
    });
  } catch (err) {
    next(err);
  }
},

  };


export default teamController;

