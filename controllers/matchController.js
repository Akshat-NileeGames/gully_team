import Joi from "joi";
import CustomErrorHandler from "../helpers/CustomErrorHandler.js";
import { Match, User } from "../models/index.js";
import { matchServices } from "../services/index.js";
import firebaseNotification from "../helpers/firebaseNotification.js";
const matchController = {

  // async createMatch(req, res, next) {
  //   const MatchSchema = Joi.object({
  //     tournamentId: Joi.string().min(3).max(30).required(),
  //     team1ID: Joi.string().min(3).max(30).required(),
  //     team2ID: Joi.string().min(3).max(30).required(),
  //     round: Joi.string().required(),
  //     matchNo: Joi.number().integer().required(),
  //     dateTime: Joi.date().iso().required(),
  //   });

  //   const { error } = MatchSchema.validate(req.body);

  //   if (error) {
  //     return next(error);
  //   }

  //   try {
  //     const result = await matchServices.createMatch(req.body);

  //     return res.status(200).json({
  //       success: true,
  //       message: "Match created successfully",
  //       data: {
  //         matchId: result._id,
  //         team1: result.team1,
  //         team2: result.team2,
  //         round: result.Round,
  //         matchNo: result.matchNo,
  //         dateTime: result.dateTime, // UTC format
  //       },
  //     });
  //   } catch (err) {
  //     console.log("Error in createMatch");
  //     return next(err);
  //   }
  // },

  //#region createMatch
  async createMatch(req, res, next) {
    const MatchSchema = Joi.object({
      tournamentId: Joi.string().min(3).max(30).required(),
      team1ID: Joi.string().min(3).max(30).required(),
      team2ID: Joi.string().min(3).max(30).required(),
      round: Joi.string().required(),
      matchNo: Joi.number().integer().required(),
      matchlength: Joi.number().integer().allow(0).optional(),
      dateTime: Joi.date().iso().required(),
      winningTeamId: Joi.string().optional(),
      matchAuthority: Joi.string().required(),
    });

    const { error } = MatchSchema.validate(req.body);

    if (error) return CustomErrorHandler.validationError(`Failed to validate the request:${error}`);

    try {

      const MatchExist = await Match.exists({
        tournament: req.body.tournamentId,
        team1: req.body.team1ID,
        team2: req.body.team2ID,
        Round: req.body.round,
        matchNo: req.body.matchNo,
      });

      console.log(`The Team 1 id:${req.body.team1ID} and Team 2 id:${req.body.team2ID}`)
      if (MatchExist) {
        return next(
          CustomErrorHandler.alreadyExist("This Match already exists.")
        );
      }

      const result = await matchServices.createMatch(req.body);

      return res.status(200).json({
        success: true,
        message: "Match created successfully",
        data: {
          matchId: result._id,
          team1: result.team1,
          team2: result.team2,
          round: result.Round,
          matchNo: result.matchNo,
          dateTime: result.dateTime,
          winningTeamId: Joi.string().optional(),

        },
      });
    } catch (err) {
      console.log("Error in createMatch");
      return next(err);
    }
  },

  async getMatches(req, res, next) {
    let tournamentId = req.params.tournamentId;
    try {
      const result = await matchServices.getMatch(tournamentId);
      return res.status(200).json({
        success: true,
        message: "Match Retrieved Successfully",
        data: { matches: result },
      });
    } catch (err) {
      console.log(" Error in getMatch ");
      return next(err);
    }
  },

  async getSingleMatch(req, res, next) {
    let matchId = req.params.matchId;
    try {
      const result = await matchServices.getSingleMatch(matchId);

      return res.status(200).json({
        success: true,
        message: "Match Retrieved Successfully",
        data: { match: result },
      });
    } catch (err) {
      console.log(" Error in getMatch ");
      return next(err);
    }
  },

  async editMatch(req, res, next) {
    let MatchId = req.params.matchId;

    // Validation
    const MatchSchema = Joi.object({
      tournamentId: Joi.string().min(3).max(30).required(),
      team1ID: Joi.string().min(3).max(30).required(),
      team2ID: Joi.string().min(3).max(30).required(),
      round: Joi.string().required(), // Adjust min and max values based on your requirements
      matchNo: Joi.number().integer().required(), // Adjust min and max values based on your requirements
      dateTime: Joi.date().iso().required(),
      winningTeamId: Joi.string().optional(), //DG
    });

    const { error } = MatchSchema.validate(req.body);

    if (error) {
      return next(error);
    }

    try {


      const result = await matchServices.editMatch(req.body, MatchId);

      return res.status(200).json({
        success: true,
        message: "Match edited successfully",
        data: result,
      });
    } catch (err) {
      console.log("Error in editMatch");
      return next(err);
    }
  },


  // async editMatch(req, res, next) {
  //   let MatchId = req.params.matchId;
  //   //validation
  //   const MatchSchema = Joi.object({
  //     tournamentId: Joi.string().min(3).max(30).required(),
  //     team1ID: Joi.string().min(3).max(30).required(),
  //     team2ID: Joi.string().min(3).max(30).required(),

  //     round: Joi.string().required(),  // Adjust min and max values based on your requirements
  //     matchNo: Joi.number().integer().required(), // Adjust min and max values based on your requirements
  //     dateTime: Joi.date().iso().required(),
  //   });

  //   const { error } = MatchSchema.validate(req.body);

  //   if (error) {
  //     return next(error);
  //   }

  //   try {
  //     const result = await matchServices.editMatch(req.body, MatchId);

  //     return res.status(200).json({
  //       success: true,
  //       message: "Match edited successfully",
  //       data: result,
  //     });
  //   } catch (err) {
  //     console.log("Error in editMatch");
  //     return next(err);
  //   }
  // },

  async getOpponentTournamentId(req, res, next) {
    // let tournamentID = req.params.tournamentID;
    // let teamID = req.params.teamID;
    try {
      console.log(global.userInfo);

      const result = await matchServices.getOpponentTournamentId();

      return res.status(200).json({
        success: true,
        message: "Opponent Retrieved SuccessFully",
        data: result,
      });
    } catch (err) {
      console.log(" Error in getOpponent ");
      return next(err);
    }
  },




  async getOpponentOld(req, res, next) {
    let tournamentID = req.params.tournamentId;
    let teamID = req.params.teamId;

    try {
      const result = await matchServices.getOpponentOld(tournamentID, teamID);

      return res.status(200).json({
        success: true,
        message: "Opponent Retrieved SuccessFully",
        data: { matches: result },
      });
    } catch (err) {
      console.log(" Error in getOpponent ");
      return next(err);
    }
  },

  async getOpponent(req, res, next) {
    let tournamentID = req.params.tournamentId;
    let teamID = req.params.teamId;

    try {
      const result = await matchServices.getOpponent(tournamentID, teamID);

      return res.status(200).json({
        success: true,
        message: "Opponent Retrieved SuccessFully",
        data: result
      });
    } catch (err) {
      console.log(" Error in getOpponent ");
      return next(err);
    }
  },

  // async updateScoreBoard(req, res, next) {
  //   let MatchId = req.params.matchId;
  //   console.log(req.body.scoreBoard.partnerships);
  //   try {
  //     const result = await matchServices.updateScoreBoard(req.body, MatchId);

  //     return res.status(200).json({
  //       sucess: true,
  //       message: "ScoreBoard Updated successfully",
  //       data: result,
  //     });
  //   } catch (err) {
  //     console.log("Error in updateScoreBoard");
  //     return next(err);
  //   }
  // },

  async updateScoreBoard(req, res, next) {
    let MatchId = req.params.matchId;
    try {
      const result = await matchServices.updateScoreBoard(req.body, MatchId);

      return res.status(200).json({
        success: true,
        message: "ScoreBoard Updated successfully",
        data: result,
      });
    } catch (err) {
      console.log("Error in updateScoreBoard");
      return next(err);
    }
  },


  //upadateTeamMatchsData by nikhil

  async updateTeamMatchsData(req, res, next) {
    let matchId = req.params.matchId;
    let { winningTeamId } = req.body;

    if (!matchId) {
      return res.status(400).json({
        success: false,
        message: "Match ID is required.",
      });
    }

    if (!winningTeamId) {
      return res.status(400).json({
        success: false,
        message: "Winning Team ID is required.",
      });
    }
    try {
      const result = await matchServices.updateTeamMatchsData(
        matchId,
        winningTeamId,
      );

      return res.status(200).json({
        sucess: true,
        message: "Team Match data  Updated Successfully",
        data: { matches: result },
      });
    } catch (err) {
      console.log(" Error in updateTeamMatchsData ", err);
      return next(err);
    }
  },

  //DG
  // async updateTeamMatchsData(req, res, next) {
  //   const matchId = req.params.matchId;
  //   const { winningTeamId } = req.body;

  //   if (!matchId) {
  //     return res.status(400).json({
  //       success: false,
  //       message: "Match ID is required.",
  //     });
  //   }

  //   if (!winningTeamId) {
  //     return res.status(400).json({
  //       success: false,
  //       message: "Winning Team ID is required.",
  //     });
  //   }

  //   try {
  //     const result = await matchServices.updateTeamMatchsData(matchId, winningTeamId);

  //     return res.status(200).json({
  //       success: true,
  //       message: "Team Match data updated successfully",
  //       data: { matches: result },
  //     });
  //   } catch (err) {
  //     console.error("Error in updateTeamMatchsData:", err.message);
  //     return res.status(500).json({
  //       status: false,
  //       message: "Internal server error",
  //       data: null,
  //       originalError: err.message,
  //     });
  //   }
  // },


  async teamRanking(req, res, next) {
    let ballType = req.params.ballType;
    try {
      const result = await matchServices.teamRanking(ballType);

      return res.status(200).json({
        sucess: true,
        message: "Match Retriceved SuccessFully",
        data: { teamsRanking: result },
      });
    } catch (err) {
      console.log(" Error in getMatch ");
      return next(err);
    }
  },

  async playerRanking(req, res, next) {
    let ballType = req.params.ballType;
    let skill = req.params.skill;
    try {
      const result = await matchServices.playerRanking(ballType, skill);

      return res.status(200).json({
        sucess: true,
        message: "PlayerRanking Retrived SucessFully",
        data: { playerRanking: result },
      });
    } catch (err) {
      console.log(" Error in PlayerRanking ");
      return next(err);
    }
  },

  async topPerformers(req, res, next) {
    try {
      const result = await matchServices.topPerformers(req.body);

      return res.status(200).json({
        success: true,
        message: "Top Performers retrieved Successfully",
        data: { topPerformers: result },
      });
    } catch (err) {
      console.error("Error in retrieving top performers:", err);
      return next(err);
    }
  },

  //Nikhil
  //   async myPerformance(req, res, next) {
  //   let userId = req.params.userId;
  //   let matchType = req.params.matchType;
  //   let category = req.params.category;
  //   try {
  //     const result = await matchServices.myPerformance(userId,matchType, category);

  //     return res.status(200).json({
  //       sucess: true,
  //       message: "My Performance retrieved Successfully",
  //       data: result,
  //     });
  //   } catch (err) {
  //     console.log(" Error in myPerformance ", err);
  //     return next(err);
  //   }
  // },



  //DG 

  async myPerformance(req, res, next) {
    const userId = req.params.userId;
    const { category } = req.body;

    // Validate inputs
    if (!userId || !category) {
      return res.status(400).json({
        success: false,
        message: "Invalid request. Ensure userId and category are provided.",
      });
    }

    try {

      const result = await matchServices.myPerformance(userId, category);

      return res.status(200).json({
        success: true,
        message: "Player Performance retrieved successfully.",
        data: { performance: result },
      });
    } catch (err) {
      console.error("Error in myPerformance:", err);
      return next(err);
    }
  },




  //challange match

  async createChallengeMatch(req, res, next) {
    //validation
    const MatchSchema = Joi.object({
      team1ID: Joi.string().min(3).max(30).required(),
      team2ID: Joi.string().min(3).max(30).required(),
      // dateTime: Joi.date().iso().required(),
    });

    const { error } = MatchSchema.validate(req.body);

    if (error) {
      return next(error);
    }
    try {
      const result = await matchServices.createChallengeMatch(req.body);
      return res.status(200).json({
        sucess: true,
        message: "Match created successfully",
        data: result,
      });
    } catch (err) {
      console.log("Error in createChallengeMatch");
      return next(err);
    }
  },

  async getChallengeMatch(req, res, next) {
    // const status = req.params.status;
    try {
      const result = await matchServices.getChallengeMatch();

      return res.status(200).json({
        sucess: true,
        message: "Match Retrived SucessFully",
        data: { matches: result },
      });
    } catch (err) {
      console.log(" Error in getChallengeMatch ");
      return next(err);
    }
  },

  async updateChallengeMatch(req, res, next) {
    const matchId = req.params.matchId;
    const status = req.params.status;

    try {
      const result = await matchServices.updateChallengeMatch(matchId, status);

      return res.status(200).json({
        sucess: true,
        message: "Team Match data  Updated SucessFully",
        data: { matches: result },
      });
    } catch (err) {
      console.log(" Error in updateTeamMatchData ");
      return next(err);
    }
  },

  async updateChallengeScoreBoard(req, res, next) {
    let MatchId = req.params.matchId;
    // console.log(req.body.scoreBoard.partnerships);
    try {
      const result = await matchServices.updateChallengeScoreBoard(
        req.body,
        MatchId,
      );

      return res.status(200).json({
        sucess: true,
        message: "ScoreBoard Updated suessfully",
        data: result,
      });
    } catch (err) {
      console.log("Error in updateChallengeScoreBoard");
      return next(err);
    }
  },

  async finishChallengeMatch(req, res, next) {
    let matchId = req.params.matchId;
    let { winningTeamId } = req.body;
    // console.log(req.body.scoreBoard.partnerships);
    try {
      const result = await matchServices.finishChallengeMatch(
        matchId,
        winningTeamId,
      );

      return res.status(200).json({
        sucess: true,
        message: " challenge Match ScoreBoard Updated successfully",
        data: result,
      });
    } catch (err) {
      console.log("Error in finishChallengeMatch");
      return next(err);
    }
  },

  async getChallengeMatchPerformance(req, res, next) {
    let MatchId = req.params.matchId;
    try {
      const result = await matchServices.getChallengeMatchPerformance(MatchId);

      return res.status(200).json({
        sucess: true,
        message: "Challenge Match Performance Retrieved Successfully",
        data: result,
      });
    } catch (err) {
      console.log(" Error in getChallengeMatchPerformance ");
      return next(err);
    }
  },

  // async getMatches(req, res, next) {
  //   try {
  //     const result = await matchServices.getMatch();

  //     return res.status(200).json({
  //       sucess: true,
  //       message: "Match Retrived SucessFully",
  //       data: { matches: result },
  //     });
  //   } catch (err) {
  //     console.log(" Error in getMatch ");
  //     return next(err);
  //   }
  // },

  async deleteMatch(req, res, next) {
    let matchId = req.params.matchId;

    try {
      const match = await Match.findById(matchId);

      if (!match) {
        return next(
          CustomErrorHandler.notFound("Match not found with the provided ID.")
        );
      }


      await match.remove();

      // Send notification to both team organizers about match cancellation
      const [team1org, team2org] = await Promise.all([
        User.findById(match.team1.userId),
        User.findById(match.team2.userId)
      ]);
      console.log("Team1 Organizer:", team1org);
      console.log("Team2 Organizer:", team2org);
      const [Team1FCM, Team2FCM] = [team1org.fcmToken, team2org.fcmToken];

      console.log("Team1FCM", Team1FCM);
      console.log("Team2FCM", Team2FCM);

      if (Team1FCM && Team2FCM) {
        const notificationDataTeam1 = {
          title: `${match.team1.teamName} VS ${match.team2.teamName} ${match.Round} Match`,
          body: `Your match against ${match.team2.teamName} is cancelled`,
        };

        const notificationDataTeam2 = {
          title: `${match.team2.teamName} VS ${match.team1.teamName} ${match.Round} Match`,
          body: `Your match against ${match.team1.teamName} is cancelled `,
        };

        try {
          const [response1, response2] = await Promise.all([
            firebaseNotification.sendNotification(Team1FCM, notificationDataTeam1),
            firebaseNotification.sendNotification(Team2FCM, notificationDataTeam2)
          ]);

          console.log("Notification sent to Team1 organizer successfully:", response1);
          console.log("Notification sent to Team2 organizer successfully:", response2);
        } catch (error) {
          console.error("Error sending notification:", error);
        }
      }
      return res.status(200).json({
        success: true,
        message: "Match deleted successfully",
      });
    } catch (err) {
      console.log("Error in deleteMatch");
      return next(err);
    }
  },



};

export default matchController;
