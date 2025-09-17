import { ObjectId } from "mongodb";
import { mongoose } from "mongoose";
import CustomErrorHandler from "../helpers/CustomErrorHandler.js";
import ImageUploader from "../helpers/ImageUploader.js";
import { matchServices } from "../services/index.js";
import { Lookingfor, Player, Team, RegisteredTeam, User, Match } from "../models/index.js";

import teamController from "../controllers/teamController.js";
// const { Types } = require('mongoose');
import Types from "mongoose";

const teamServices = {
  async getTeamById(TeamId) {
    //Find the Banner
    let teamData = await Team.findOne({ _id: TeamId });

    if (!teamData) {
      // Handle the case where the user is not found
      throw CustomErrorHandler.notFound("Team Not Found");
    }

    let userData = await User.findOne({ _id: teamData.userId }); // Select the fields you need for the user

    // let captainData = {
    //   _id: userData._id,
    //   name: userData.fullName,
    //   email: userData.email,
    //   phoneNumber: userData.phoneNumber,
    //   role: "Captain",
    // };

    // push the captain data into the team data at index 0
    // teamData.players.unshift(captainData);

    return { teamData };
  },

  async getAllTeams() {
    //Find the Banner
    let teamData = await Team.find();

    if (!teamData) {
      // Handle the case where the user is not found
      throw CustomErrorHandler.notFound("Team Not Found");
    }
    return teamData;
  },

  async getUserTeams() {
    //Find the Team
    const userInfo = global.user;

    let teamData = await Team.find({ userId: userInfo.userId });

    if (!teamData) {
      // Handle the case where the Team is not found
      throw CustomErrorHandler.notFound("Team Not Found");
    }

    const modifiedTeamData = teamData.map((team) => {
      const playersCount = team.players.length;
      return {
        ...team.toObject(), // Convert Mongoose document to plain object
        playersCount,
      };
    });

    return modifiedTeamData;
  },
  async getTeamsByPhoneNumber(phoneNumber) {
    try {
      // Step 1: Find all players associated with the given phone number
      const players = await Player.find({ phoneNumber });

      // if (!players || players.length === 0) {
      //   return next(CustomErrorHandler.notFound("No players found with this phone number."));
      //   // console.log("No players found with this phone number.");
      // }

      // Step 2: Extract team IDs from the players
      const teamIds = players.map(player => player.team);

      // Step 3: Fetch all teams by team IDs
      const teams = await Team.find({ _id: { $in: teamIds } });

      if (!teams || teams.length === 0) {
        // throw CustomErrorHandler.notFound("No teams found for these players.");
        console.log("No teams found for these players.");
      }

      // Step 4: For each team, get the count of players in that team
      const teamsWithPlayerCount = await Promise.all(teams.map(async (team) => {
        const playerCount = await Player.countDocuments({ team: team._id });
        return {
          ...team.toObject(),
          playersCount: playerCount,
        };
      }));
      return teamsWithPlayerCount;
    } catch (err) {
      throw err;
    }
  },

  // async getTeamsByPhoneNumber(phoneNumber) {
  //   try {
  //     // Step 1: Find all players associated with the given phone number
  //     const players = await Player.find({ phoneNumber });

  //     if (!players || players.length === 0) {
  //       throw new Error("No players found with this phone number.");
  //     }

  //     // Step 2: Extract unique team IDs from the players
  //     const teamIds = [...new Set(players.map(player => player.team.toString()))];

  //     // Step 3: Fetch all teams by team IDs
  //     const teams = await Team.find({ _id: { $in: teamIds } });

  //     if (!teams || teams.length === 0) {
  //       throw new Error("No teams found for these players.");
  //     }

  //     // Step 4: Construct the response with team details and player count
  //     const teamsWithDetails = await Promise.all(
  //       teams.map(async (team) => {
  //         const playerCount = await Player.countDocuments({ team: team._id }); // Count players in the team
  //         return {
  //           teamId: team._id,
  //           teamName: team.name,
  //           teamLogo: team.logo,
  //           playerCount: `${playerCount}/15`, // Player count formatted as 'X/15'
  //           createdAt: team.createdAt,
  //           updatedAt: team.updatedAt,
  //         };
  //       })
  //     );

  //     // Step 5: Return only teams associated with the given player's phone number
  //     return teamsWithDetails;
  //   } catch (err) {
  //     console.error("Error in getTeamsByPhoneNumber:", err);
  //     throw err;
  //   }
  // },


  //old code
  // async getUserTeams() {
  //   //Find the Team
  //   const userInfo = global.user; 

  //   let teamData = await Team.find({ userId: userInfo.userId });

  //   if (!teamData) {
  //     // Handle the case where the Team is not found
  //     throw CustomErrorHandler.notFound("Team Not Found");
  //   }

  //   const modifiedTeamData = teamData.map((team) => {
  //     const playersCount = team.players.length;
  //     return {
  //       ...team.toObject(), // Convert Mongoose document to plain object
  //       playersCount,
  //     };
  //   });

  //   return modifiedTeamData;
  // },

  /**
   * @function createTeam
   * @description Creates a new team and adds the user as the captain.
   * Uploads the team logo if provided, saves the team and player info, 
   * and returns the created team and user's FCM token.
   * 
   * @param {Object} data - Team creation data
   * @param {string} data.teamLogo - Base64 string or file to be uploaded (optional)
   * @param {string} data.teamName - Name of the team
   * @param {string} data.teamfor - Indicates the category or sport the team is for
   * 
   * @returns {Promise<Object>} The created team data and FCM token
   * @throws {Error} Throws if creation fails at any point
   */
  async createTeam(data) {

    const { teamLogo, teamName, teamfor } = data;
    const userInfo = global.user;
    let imagePath = "";

    if (teamLogo) {
      imagePath = await ImageUploader.Upload(data.teamLogo, "create-team");
    }

    const team = new Team({
      teamLogo: imagePath,
      teamName: teamName,
      teamfor: teamfor,
      userId: userInfo.userId,
    });

    let teamdata = await team.save();

    if (teamdata) {
      let user = await User.findById(userInfo.userId);

      const player = new Player({
        name: user.fullName,
        phoneNumber: user.phoneNumber,
        role: "Captain",
        team: teamdata._id,
        userId: userInfo.userId,
      });

      let playerData = await player.save();

      team.players.push(playerData._id);

      teamdata = await team.save();

      // for notification
      const fcmToken = user.fcmToken;

      return { teamdata, fcmToken };
    } //for notification
  },

  //previois
  // async createTeam(data) {
  //   // Added fcmtoken for notifications
  //   const { teamLogo, teamName } = data;
  //   const userInfo = global.user;

  //   let imagePath = "";

  //   if (teamLogo) {
  //     imagePath = await ImageUploader.Upload(data.teamLogo, "create-team");
  //   }

  //   const team = new Team({
  //     teamLogo: imagePath,
  //     teamName: teamName,
  //     userId: userInfo.userId,
  //     // tournamentId: tournamentId,
  //   });

  //   let teamdata = await team.save();

  //   if (teamdata) {
  //     let user = await User.findById(userInfo.userId);

  //     const player = new Player({
  //       name: user.fullName,
  //       phoneNumber: user.phoneNumber,
  //       role: "Captain",
  //       team: teamdata._id,
  //       userId: userInfo.userId,
  //     });

  //     let playerData = await player.save();

  //     team.players.push(playerData._id);

  //     teamdata = await team.save();

  //     // for notification
  //     const fcmToken = user.fcmToken;

  //     return { teamdata, fcmToken };
  //   } 
  // },
  // async createTeam(data) {
  //   const { teamLogo, teamName } = data;
  //   const userInfo = global.user;

  //   let imagePath = "";

  //   if (teamLogo) {
  //     imagePath = await ImageUploader.Upload(data.teamLogo, "create-team");
  //   }

  //   const team = new Team({
  //     teamLogo: imagePath,
  //     teamName: teamName,
  //     userId: userInfo.userId,
  //   });

  //   let teamdata = await team.save();

  //   if (teamdata) {
  //     let user = await User.findById(userInfo.userId);

  //     const player = new Player({
  //       name: user.fullName,
  //       phoneNumber: user.phoneNumber,
  //       role: "Captain",
  //       team: teamdata._id,
  //       userId: userInfo.userId,
  //     });

  //     let playerData = await player.save();

  //     team.players.push(playerData._id);

  //     teamdata = await team.save();

  //     // for notification
  //     const fcmToken = user.fcmToken;

  //     // Debug: log the team data and fcmToken
  //     console.log("Team Data Saved:", teamdata);
  //     console.log("FCM Token:", fcmToken);

  //     return { teamdata, fcmToken };
  //   }
  // },

  async editTeam(data, TeamId) {
    const { teamLogo, teamName } = data;

    // Find the team by ID
    const team = await Team.findById(TeamId);
    if (!team) {
      throw CustomErrorHandler.notFound("Team Not Found");
    }
    if (team.teamLogo === null) {
      console.log("Team Logo found to be null");
    }
    let imagePath = "";
    if (teamLogo) {
      try {
        imagePath = await ImageUploader.Upload(teamLogo, "create-team");
        console.log("Image Upload Success: " + imagePath);
      } catch (error) {
        throw new Error("Error uploading the logo: " + error.message);
      }
    }
    team.teamName = teamName;
    if (imagePath) {
      team.teamLogo = imagePath;
    }

    let teamData = await team.save();

    return teamData;
  },

  // async addPlayer(data, TeamId) {
  //   const { name, phoneNumber,role } = data;

  //   const team = await Team.findById(TeamId);

  //   if (!team) {
  //     throw CustomErrorHandler.notFound("Team Not Found");
  //   }

  //   if (team.players.length >= 15) {
  //     throw CustomErrorHandler.badRequest(
  //       "Team is already at maximum capacity (15 players)"
  //     );
  //   }

  //   // Check if the player already exists in the team
  //   const existingPlayer = await Player.findOne({
  //     team: TeamId,
  //     phoneNumber: phoneNumber,
  //   });

  //   if (existingPlayer) {
  //     throw CustomErrorHandler.badRequest(
  //       "Player with the same phone number already exists in the team."
  //     );
  //   }

  //   // Check if the user exists or create a new one
  //   const existingUser = await User.findOne({ phoneNumber: phoneNumber });
  //   let userId;
  //   let fcmToken;
  //   if (existingUser) {
  //     userId = existingUser._id;
  //     fcmToken = existingUser.fcmToken;
  //   } else {
  //     const newUser = new User({
  //       fullName: name,
  //       phoneNumber: phoneNumber,
  //       registrationDate: new Date(),
  //     });

  //     const newUserData = await newUser.save();
  //     userId = newUserData._id;
  //     fcmToken = newUserData.fcmToken;
  //   }

  //   // Create a new player
  //   const player = new Player({
  //     name: name,
  //     phoneNumber: phoneNumber,
  //     team: TeamId,
  //     userId: userId,
  //     role: role,
  //   });

  //   let playerData = await player.save();

  //   // Add player to the team
  //   team.players.push(playerData._id);

  //   // Set the first player added as the captain
  //   if (team.players.length === 1) {
  //     team.captain = playerData._id; // Set the first player as the default captain
  //   }

  //   let teamdata = await team.save();

  //   return { teamdata, fcmToken };
  // },
  // async addPlayer(data, TeamId, currentUser) {
  //   const { name, phoneNumber, role } = data;

  //   const team = await Team.findById(TeamId);

  //   if (!team) {
  //     throw CustomErrorHandler.notFound("Team Not Found");
  //   }

  //   if (team.players.length >= 15) {
  //     throw CustomErrorHandler.badRequest("Team is already at maximum capacity (15 players)");
  //   }

  //   // Check if the player already exists in the team
  //   const existingPlayer = await Player.findOne({
  //     team: TeamId,
  //     phoneNumber: phoneNumber,
  //   });

  //   if (existingPlayer) {
  //     throw CustomErrorHandler.badRequest(
  //       "Player with the same phone number already exists in the team."
  //     );
  //   }

  //   // Check if the user exists in the application
  //   const existingUser = await User.findOne({ phoneNumber: phoneNumber });
  //   let userId = null; // Default value for userId
  //   let fcmToken = null;

  //   if (existingUser) {
  //     userId = existingUser._id; // Set the userId if the user exists
  //     fcmToken = existingUser.fcmToken;
  //   }

  //   // Create a new player
  //   const player = new Player({
  //     name: name,
  //     phoneNumber: phoneNumber,
  //     team: TeamId,
  //     userId: userId, // userId will be null if the user does not exist
  //     role: role,
  //   });

  //   let playerData = await player.save();

  //   // Assign the first player as captain
  //   if (team.players.length === 0) {
  //     team.captain = playerData._id;

  //     // Save captain role in the database
  //     const captain = new Player({
  //       name: currentUser.name,
  //       phoneNumber: currentUser.phoneNumber,
  //       team: TeamId,
  //       userId: currentUser._id, // Set the userId for the captain
  //       role: "Captain",
  //     });
  //     await captain.save();
  //   }

  //   // Add player to the team
  //   team.players.push(playerData._id);

  //   let teamdata = await team.save();

  //   return { teamdata, fcmToken };
  // },
  //   async addPlayer(data, TeamId, currentUser) {
  //     const { name, phoneNumber, role } = data;

  //     const team = await Team.findById(TeamId);

  //     if (!team) {
  //       throw CustomErrorHandler.notFound("Team Not Found");
  //     }

  //     if (team.players.length >= 15) {
  //       throw CustomErrorHandler.badRequest("Team is already at maximum capacity (15 players)");
  //     }

  //     // Check if the player already exists in the team
  //     const existingPlayer = await Player.findOne({
  //       team: TeamId,
  //       phoneNumber: phoneNumber,
  //     });

  //     if (existingPlayer) {
  //       throw CustomErrorHandler.badRequest(
  //         "Player with the same phone number already exists in the team."
  //       );
  //     }

  //     // Check if the user exists
  //     const existingUser = await User.findOne({ phoneNumber: phoneNumber });
  //     let userId = null; // Default to null for player if user doesn't exist
  //     let fcmToken;

  //     if (existingUser) {
  //       userId = existingUser._id; // Use the userId from existing user
  //       fcmToken = existingUser.fcmToken; // Get the FCM token of the existing user
  //     }

  //     // Create a new player (userId is null if user does not exist)
  //     const player = new Player({
  //       name: name,
  //       phoneNumber: phoneNumber,
  //       team: TeamId,
  //       userId: userId, // userId is either null or the actual userId
  //       role: role,
  //     });

  //     let playerData = await player.save();

  //     // Assign the first player as captain
  //     if (team.players.length === 0) {
  //       team.captain = playerData._id;

  //       // Save captain role in the database
  //       const captain = new Player({
  //         name: currentUser.name,
  //         phoneNumber: currentUser.phoneNumber,
  //         team: TeamId,
  //         userId: currentUser._id,
  //         role: "Captain",
  //       });
  //       await captain.save();
  //     }

  //     // Add player to the team
  //     team.players.push(playerData._id);

  //     let teamdata = await team.save();

  //     return { teamdata, fcmToken };
  // },
  async addPlayer(data, TeamId, currentUser) {
    const { name, phoneNumber, role } = data;

    const team = await Team.findById(TeamId);

    if (!team) {
      throw CustomErrorHandler.notFound("Team Not Found");
    }

    if (team.players.length >= 15) {
      throw CustomErrorHandler.badRequest("Team is already at maximum capacity (15 players)");
    }

    // Check if the player already exists in the team
    const existingPlayer = await Player.findOne({
      team: TeamId,
      phoneNumber: phoneNumber,
    });

    if (existingPlayer) {
      throw CustomErrorHandler.badRequest(
        "Player with the same phone number already exists in the team."
      );
    }

    // Check if the user exists
    const existingUser = await User.findOne({ phoneNumber: phoneNumber });
    let userId = null; // Default to null for player if user doesn't exist
    let fcmToken;

    if (existingUser) {
      userId = existingUser._id; // Use the userId from existing user
      fcmToken = existingUser.fcmToken; // Get the FCM token of the existing user
    }

    // Create a new player (userId is null if user does not exist)
    const player = new Player({
      name: name,
      phoneNumber: phoneNumber,
      team: TeamId,
      userId: userId, // userId is either null or the actual userId
      role: role,
    });

    let playerData = await player.save();

    //   // Update player record if a new user is created with the phone number
    //   if (existingUser) {
    //     await Player.updateOne(
    //       { phoneNumber: phoneNumber, team: TeamId }, // Match player by phone number and team
    //       { $set: { userId: userId } } // Set the userId to the new user's _id
    //     );
    //   }

    //   // Assign the first player as captain
    //   if (team.players.length === 0) {
    //     team.captain = playerData._id;

    //     // Save captain role in the database
    //     const captain = new Player({
    //       name: currentUser.name,
    //       phoneNumber: currentUser.phoneNumber,
    //       team: TeamId,
    //       userId: currentUser._id,
    //       role: "Captain",
    //     });
    //     await captain.save();
    //   }

    //   // Add player to the team
    //   team.players.push(playerData._id);

    //   let teamdata = await team.save();

    //   return { teamdata, fcmToken };
    // },

    // If the user did not exist before and a new user registers later
    if (!userId) {
      // Wait for player registration and user creation logic to complete before updating player
      const registeredUser = await User.findOne({ phoneNumber: phoneNumber });

      if (registeredUser) {
        // Update the player record with the newly created userId
        await Player.updateOne(
          { phoneNumber: phoneNumber, team: TeamId }, // Match player by phone number and team
          { $set: { userId: registeredUser._id } } // Update userId with the new user's _id
        );
      }
    }

    // Assign the first player as captain
    if (team.players.length === 0) {
      team.captain = playerData._id;

      // Save captain role in the database
      const captain = new Player({
        name: currentUser.name,
        phoneNumber: currentUser.phoneNumber,
        team: TeamId,
        userId: currentUser._id,
        role: "Captain",
      });
      await captain.save();
    }

    // Add player to the team
    team.players.push(playerData._id);

    let teamdata = await team.save();

    return { teamdata, fcmToken };
  },
  //   async addPlayer(data, TeamId, currentUser) {
  //     const { name, phoneNumber, role } = data;

  //     const team = await Team.findById(TeamId);

  //     if (!team) {
  //       throw CustomErrorHandler.notFound("Team Not Found");
  //     }

  //     if (team.players.length >= 15) {
  //       throw CustomErrorHandler.badRequest("Team is already at maximum capacity (15 players)");
  //     }

  //     // Check if the player already exists in the team
  //     const existingPlayer = await Player.findOne({
  //       team: TeamId,
  //       phoneNumber: phoneNumber,
  //     });

  //     if (existingPlayer) {
  //       throw CustomErrorHandler.badRequest(
  //         "Player with the same phone number already exists in the team."
  //       );
  //     }

  //     // Check if the user exists
  //     const existingUser = await User.findOne({ phoneNumber: phoneNumber });
  //     let userId = null; // Default to null for player if user doesn't exist
  //     let fcmToken;

  //     if (existingUser) {
  //       userId = existingUser._id; // Use the userId from existing user
  //       fcmToken = existingUser.fcmToken; // Get the FCM token of the existing user
  //     }

  //     // Create a new player (userId is null if user does not exist)
  //     const player = new Player({
  //       name: name,
  //       phoneNumber: phoneNumber,
  //       team: TeamId,
  //       userId: userId, // userId is either null or the actual userId
  //       role: role,
  //     });

  //     let playerData = await player.save();

  //     // Assign the first player as captain
  //     if (team.players.length === 0) {
  //       team.captain = playerData._id;

  //       // Save captain role in the database
  //       const captain = new Player({
  //         name: currentUser.name,
  //         phoneNumber: currentUser.phoneNumber,
  //         team: TeamId,
  //         userId: currentUser._id,
  //         role: "Captain",
  //       });
  //       await captain.save();
  //     }

  //     // Add player to the team
  //     team.players.push(playerData._id);

  //     let teamdata = await team.save();

  //     return { teamdata, fcmToken };
  // },


  // async addPlayer(data, TeamId, currentUser) {
  //   const { name, phoneNumber, role } = data;

  //   const team = await Team.findById(TeamId);

  //   if (!team) {
  //     throw CustomErrorHandler.notFound("Team Not Found");
  //   }

  //   if (team.players.length >= 15) {
  //     throw CustomErrorHandler.badRequest("Team is already at maximum capacity (15 players)");
  //   }

  //   // Check if the player already exists in the team
  //   const existingPlayer = await Player.findOne({
  //     team: TeamId,
  //     phoneNumber: phoneNumber,
  //   });

  //   if (existingPlayer) {
  //     throw CustomErrorHandler.badRequest(
  //       "Player with the same phone number already exists in the team."
  //     );
  //   }

  //   // Check if the user exists or create a new one
  //   const existingUser = await User.findOne({ phoneNumber: phoneNumber });
  //   let userId;
  //   let fcmToken;

  //   if (existingUser) {
  //     userId = existingUser._id;
  //     fcmToken = existingUser.fcmToken;
  //   } else {
  //     const newUser = new User({
  //       fullName: name,
  //       phoneNumber: phoneNumber,
  //       registrationDate: new Date(),
  //     });

  //     const newUserData = await newUser.save();
  //     userId = newUserData._id;
  //     fcmToken = newUserData.fcmToken;
  //   }

  //   // Create a new player
  //   const player = new Player({
  //     name: name,
  //     phoneNumber: phoneNumber,
  //     team: TeamId,
  //     userId: userId,
  //     role: role,
  //   });

  //   let playerData = await player.save();

  //   // Assign the first player as captain
  //   if (team.players.length === 0) {
  //     team.captain = playerData._id;

  //     // Save captain role in the database
  //     const captain = new Player({
  //       name: currentUser.name,
  //       phoneNumber: currentUser.phoneNumber,
  //       team: TeamId,
  //       userId: currentUser._id,
  //       role: "Captain",
  //     });
  //     await captain.save();
  //   }

  //   // Add player to the team
  //   team.players.push(playerData._id);

  //   let teamdata = await team.save();

  //   return { teamdata, fcmToken };
  // },

  async deletePlayer(teamId, playerId) {
    const team = await Team.findById(teamId);

    if (!team) {
      throw CustomErrorHandler.notFound("Team Not Found");
    }

    const playerIndex = team.players.findIndex((player) =>
      player._id.equals(playerId)
    );

    if (playerIndex === -1) {
      throw CustomErrorHandler.notFound("Player Not Found in the team");
    }

    // Remove the player from the team
    team.players.splice(playerIndex, 1);

    // // If the player being deleted was the captain, reassign the first player as the new captain
    // if (team.captain.toString() === playerId && team.players.length > 0) {
    //   team.captain = team.players[0]._id; // Assign the first player as the new captain
    // }
    if (team.captain && team.captain.toString() === playerId && team.players.length > 0) {
      team.captain = team.players[0]._id; // Assign the first player as the new captain
    }

    // Save the updated team data
    await team.save();

    // Delete the player from the Player collection
    await Player.deleteOne({ _id: playerId });

    return team;
  },

  async changeCaptain(userId, teamId, newCaptainId, newRole, previousCaptainId, previousCaptainRole,) {
    const team = await Team.findById(teamId).populate('players');
    if (!team) throw CustomErrorHandler.notFound("Team Not Found");

    if (!team.players || team.players.length === 0) throw CustomErrorHandler.notFound("No players found in the team");

    const currentCaptain = team.players.find(player => player._id.toString() === previousCaptainId);
    if (!currentCaptain) throw CustomErrorHandler.notFound("Current captain not found in the team");

    if (currentCaptain._id.toString() === newCaptainId) throw CustomErrorHandler.badRequest("This player is already the captain");

    const newCaptain = team.players.find(player => player._id.toString() === newCaptainId);
    if (!newCaptain) throw CustomErrorHandler.notFound("New captain not found in this team");

    if (currentCaptain) {
      const validRoles = [
        "Batsman",
        "Bowler",
        "All Rounder",
        "Wicket Keeper",
        "Goal Keeper",
        "Defender",
        "Midfielder",
        "Attacker",
        "Striker"
      ];

      if (previousCaptainRole && !validRoles.includes(previousCaptainRole)) {
        throw CustomErrorHandler.badRequest(
          "Previous captain's role must be one of: " + validRoles.join(", ")
        );
      }

      currentCaptain.role = previousCaptainRole || "Batsman";
      await currentCaptain.save();
    }
    team.captain = newCaptain._id;
    newCaptain.role = newRole;
    await newCaptain.save();
    await team.save();
    return {
      teamId: team._id,
      newCaptain: {
        id: newCaptain._id,
        name: newCaptain.name,
        role: newCaptain.role,
      },
      previousCaptain: {
        id: currentCaptain._id,
        name: currentCaptain.name,
        role: currentCaptain.role,
      },
    };
  },

  //   async changeCaptain(userId, teamId, newCaptainId, newRole) {
  //     // Fetch team data and populate players
  //     const team = await Team.findById(teamId).populate("players");

  //     if (!team) {
  //         throw CustomErrorHandler.notFound("Team Not Found");
  //     }

  //     // Debugging Logs
  //     console.log("Team Data:", team);
  //     console.log("Requester UserId:", userId);

  //     // Ensure `players` array exists and is populated
  //     if (!team.players || team.players.length === 0) {
  //         throw CustomErrorHandler.notFound("No players found in the team");
  //     }

  //     // Check if the requester is part of the team
  //     const requester = team.players.find(
  //         (player) => player?.userId?.toString() === userId.toString()
  //     );
  //     if (!requester) {
  //         throw CustomErrorHandler.unAuthorized("You are not a member of this team");
  //     }

  //     // Validate that the new captain is part of the team
  //     const newCaptain = team.players.find(
  //         (player) => player?._id?.toString() === newCaptainId.toString()
  //     );
  //     if (!newCaptain) {
  //         throw CustomErrorHandler.notFound("New Captain not found in the team");
  //     }

  //     // Ensure the current captain or any player can change the captain
  //     if (team.captain && requester._id.toString() !== team.captain.toString()) {
  //         if (!team.players.some((player) => player?._id?.toString() === userId.toString())) {
  //             throw CustomErrorHandler.unAuthorized("Only team members can change the captain");
  //         }
  //     }

  //     // Update the previous captain's role if a captain already exists
  //     if (team.captain) {
  //         const previousCaptain = await Player.findById(team.captain);
  //         if (previousCaptain) {
  //             previousCaptain.role = "Batsman"; // Default to a role, e.g., Batsman
  //             await previousCaptain.save();
  //         }
  //     }

  //     // Update the captain field and assign the new role to the new captain
  //     team.captain = newCaptain._id;
  //     newCaptain.role = newRole || "Captain";
  //     await newCaptain.save();

  //     // Save the updated team data
  //     const updatedTeam = await team.save();
  //     return updatedTeam;
  // },



  // async editTeam(data, TeamId) {
  //   const { teamLogo, teamName } = data;
  //   const userInfo = global.user;

  //   // Find the tournament by ID
  //   const team = await Team.findById(TeamId);

  //   if (!team) {
  //     // Handle the case where the tournament is not found
  //     throw CustomErrorHandler.notFound("team Not Found");
  //   }

  //   if (teamLogo) {
  //     const imagePath = await ImageUploader.Upload(
  //       teamLogo,
  //       "create-team",
  //       team.teamLogo
  //     );
  //     team.teamLogo = imagePath;
  //   }
  //   team.teamName = teamName;

  //   // Update the tournament's isDeleted is true;
  //   // if (teamLogo) {
  //   // }

  //   // Save the updated user document
  //   let teamData = await team.save();
  //   return teamData;
  // },

  // async addPlayer(data, TeamId) {
  //   const { name, phoneNumber, role } = data;
  //   const userInfo = global.user;

  //   const team = await Team.findById(TeamId);

  //   if (!team) {
  //     // Handle the case where the tournament is not found
  //     throw CustomErrorHandler.notFound("team Not Found");
  //   }

  //   if (team.players.length >= 15) {
  //     throw CustomErrorHandler.badRequest(
  //       "Team is already at maximum capacity (15 players)"
  //     );
  //   }

  //   const existingPlayer = await Player.findOne({
  //     team: TeamId,
  //     phoneNumber: phoneNumber,
  //   });

  //   if (existingPlayer) {
  //     throw CustomErrorHandler.badRequest(
  //       "Player with the same phone number already exists in the team."
  //     );
  //   }
  //   // did change in user User.exist
  //   const existingUser = await User.findOne({ phoneNumber: phoneNumber });
  //   let userId;
  //   let fcmToken;
  //   if (existingUser) {
  //     userId = existingUser._id;
  //     fcmToken = existingUser.fcmToken; // Added notification
  //   } else {
  //     const newUser = new User({
  //       fullName: name,
  //       phoneNumber: phoneNumber,
  //       registrationDate: new Date(),
  //     });

  //     const newUserData = await newUser.save();
  //     userId = newUserData._id;
  //     fcmToken = newUserData.fcmToken;
  //   }

  //   const player = new Player({
  //     name: name,
  //     phoneNumber: phoneNumber,
  //     role: role,
  //     team: TeamId,
  //     userId: userId,
  //   });

  //   let playerData = await player.save();

  //   team.players.push(playerData._id);

  //   let teamdata = await team.save();
  //   return { teamdata, fcmToken };
  // },

  // async deletePlayer(teamId, playerId) {
  //   // const userInfo = global.user;

  //   // Find the tournament by ID
  //   const team = await Team.findById(teamId);

  //   if (!team) {
  //     // Handle the case where the tournament is not found
  //     throw CustomErrorHandler.notFound("team Not Found");
  //   }
  //   // Delete the player from the team players collection
  //   await Player.deleteOne({ _id: playerId });

  //   // Remove the player from the team's 'players' array
  //   team.players = team.players.filter((p) => !p._id.equals(playerId));

  //   // Save the updated team after removing the player
  //   await team.save();

  //   return team;
  // },

  async getAllTeamNearByMe() {
    //Find the Banner
    let teamData = await Team.find();

    if (!teamData) {
      // Handle the case where the user is not found
      throw CustomErrorHandler.notFound("Team Not Found");
    }
    return teamData;
  },

  async addLookingFor(data) {
    const { placeName, longitude, latitude, role } = data;
    const userInfo = global.user;

    const looking = new Lookingfor({
      userId: userInfo.userId,
      role: role,
      location: {
        type: "Point",
        coordinates: [parseFloat(longitude), parseFloat(latitude)],
        selectLocation: placeName,
      },
    });

    const lookingData = await looking.save();

    return lookingData;
  },

  async deleteLookingFor(lookingId) {
    // Delete the player from the team players collection
    await Lookingfor.deleteOne({ _id: lookingId });
  },

  async getAllLooking(data) {
    const { latitude, longitude } = data;
    const maxDistanceInKm = 30;

    const looking = await Lookingfor.aggregate([
      {
        $geoNear: {
          near: {
            type: "Point",
            coordinates: [parseFloat(longitude), parseFloat(latitude)],
          },
          distanceField: "distance",
          spherical: true,
          key: "location", // Specify the index key
        },
      },
      {
        $addFields: {
          distanceInKm: {
            $divide: ["$distance", 1000],
          },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "userId", // Update to the correct field in Lookingfor schema
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $match: {
          distanceInKm: { $lt: 6 }, // Adjust as needed, 3000 means 3km
        },
      },
      {
        $unwind: "$user",
      },
      {
        $project: {
          _id: 1,
          role: 1,
          latitude: 1,
          longitude: 1,
          location: "$location.selectLocation",
          createdAt: 1,
          email: "$user.email",
          phoneNumber: "$user.phoneNumber",
          fullName: "$user.fullName",
          distanceInKm: 1,
        },
      },
      {
        $sort: {
          createdAt: -1, // Sort by createdAt field in descending order (newest first)
        },
      },
      {
        $limit: 50, // Limit the number of results to 50
      },
    ]);

    if (!looking || looking.length === 0) {
      // Handle the case where no results are found
      throw CustomErrorHandler.notFound("Team Not Found");
    }

    return { data: looking };
  },

  async getLookingByID() {
    const userInfo = global.user;

    const looking = await Lookingfor.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userInfo.userId),
        },
      },
      {
        $lookup: {
          from: "users", // Name of the collection you're joining with
          localField: "userId", // Field in the current collection that references the users collection
          foreignField: "_id", // Field in the 'users' collection to match with
          as: "User", // Output array field name
        },
      },
      {
        $project: {
          _id: 1,
          role: 1,
          location: "$location.selectLocation",
          createdAt: 1,
          userEmail: { $arrayElemAt: ["$User.email", 0] }, // Extract email field from User array
          fullName: { $arrayElemAt: ["$User.fullName", 0] }, // Extract fullName field from User array
          phoneNumber: { $arrayElemAt: ["$User.phoneNumber", 0] }, // Extract phoneNumber field from User array
        },
      },
    ]);

    if (!looking) {
      // Handle the case where the user is not found
      throw CustomErrorHandler.notFound("looking Not Found");
    }
    return looking;
  },

  // async getAllNearByTeam(data) {
  //   const { latitude, longitude } = data;
  //   const userInfo = global.user;

  //   const NearByTeams = await User.aggregate([
  //     {
  //       $geoNear: {
  //         near: {
  //           type: "Point",
  //           coordinates: [parseFloat(longitude), parseFloat(latitude)],
  //         },

  //         distanceField: "distance",
  //         spherical: true,
  //         // distanceCalc: "dist.calculated",

  //         query: {
  //           isDeleted: false,
  //           isNewUser: false,
  //         },
  //         key: "location", // Specify the index key
  //       },
  //     },
  //     {
  //       $addFields: {
  //         distanceInKm: {
  //           $divide: ["$distance", 1000],
  //         },
  //       },
  //     },
  //     {
  //       $match: {
  //         distanceInKm: { $lt: 30 }, // Adjust as needed 3000 meaks 3km
  //       },
  //     },
  //     {
  //       $match: {
  //         _id: { $ne: ObjectId(userInfo.userId) }, // Filter out the user with the specified userId
  //       },
  //     },
  //     {
  //       $lookup: {
  //         from: "teams", // Replace with the actual name of your teams collection
  //         localField: "_id",
  //         foreignField: "userId",
  //         as: "teams",
  //       },
  //     },
  //     {
  //       $project: {
  //         fullName: 1,
  //         email: 1,
  //         distanceInKm: 1,
  //         "teams.teamName": 1,
  //         "teams.teamLogo": 1,
  //         "teams._id": 1,
  //         // Add other fields you want to include in the result
  //       },
  //     },
  //   ]);

  //   return NearByTeams;
  // },

  async getAllNearByTeam(data) {
    const { latitude, longitude, sport } = data;
    const userInfo = global.user;

    const NearByTeams = await User.aggregate([
      {
        $geoNear: {
          near: {
            type: "Point",
            coordinates: [parseFloat(longitude), parseFloat(latitude)],
          },
          distanceField: "distance",
          spherical: true,
          query: {
            isDeleted: false,
            isNewUser: false,
          },
          key: "location",
        },
      },
      {
        $addFields: {
          distanceInKm: {
            $divide: ["$distance", 1000],
          },
        },
      },
      {
        $match: {
          distanceInKm: { $lt: 30 },
          _id: { $ne: mongoose.Types.ObjectId(userInfo.userId) },
        },
      },
      {
        $lookup: {
          from: "teams",
          localField: "_id",
          foreignField: "userId",
          as: "teams",
        },
      },
      {
        $unwind: "$teams", // Flatten the array to filter based on teamfor
      },
      {
        $match: {
          "teams.teamfor": sport,
        },
      },
      {
        $group: {
          _id: "$_id",
          fullName: { $first: "$fullName" },
          email: { $first: "$email" },
          distanceInKm: { $first: "$distanceInKm" },
          teams: { $push: "$teams" },
        },
      },
      {
        $project: {
          fullName: 1,
          email: 1,
          distanceInKm: 1,
          "teams.teamName": 1,
          "teams.teamLogo": 1,
          "teams._id": 1,
          "teams.teamfor": 1,
        },
      },
    ]);

    return NearByTeams;
  },
  async getTeamCount() {
    //Find the Banner
    const totalTeams = await Team.countDocuments();
    return totalTeams;
  },



  // async editPlayer(data, TeamId,playerId) {
  //   const { name, phoneNumber, role } = data;
  //   const userInfo = global.user;

  //   const team = await Team.findById(TeamId);

  //   if (!team) {
  //     // Handle the case where the tournament is not found
  //     throw CustomErrorHandler.notFound("team Not Found");
  //   }

  //   const player = await Player.findById(playerId);

  //   if (!player) {
  //     // Handle the case where the tournament is not found
  //     throw CustomErrorHandler.notFound("player Not Found");
  //   }

  //    // Update the tournament's isDeleted is true;
  //    player.isDeleted = true;
  //    player.isDeleted = true;
  //    player.isDeleted = true;
  //    // Save the updated user document
  //    let tournamentdata = await player.save();

  // // Find the player to be edited within the 'players' array
  // const playerIndex = team.Player.findIndex(
  //   (p) => p._id.toString() === playerId
  // );

  // if (playerIndex === -1) {
  //   throw CustomErrorHandler.badRequest(
  //     "Player not found in the specified team."
  //   );
  // }

  // // Update the player's information within the 'players' array
  // team.players[playerIndex].name = updatedPlayerInfo.name;
  // team.players[playerIndex].phoneNumber = updatedPlayerInfo.phoneNumber;
  // team.players[playerIndex].role = updatedPlayerInfo.role;

  // // Save the updated team
  // await team.save();

  //   const existingUser = await User.exists({ phoneNumber: phoneNumber });
  //   let userId;
  //   if (existingUser) {
  //     userId=existingUser._id
  //   }

  //   const player = new Player({
  //     name: name,
  //     phoneNumber: phoneNumber,
  //     role: role,
  //     team: TeamId,
  //     userId: userId
  //   });

  //  let playerData = await player.save();

  //   team.players.push(playerData._id);

  //   let teamdata = await team.save();
  //   return teamdata;
  // },


  // async getPointsTable(tournamentId) {
  //   try {
  //     const registeredTeams = await RegisteredTeam.find({
  //       tournament: tournamentId,
  //       status: 'Accepted',
  //     }).populate('team');

  //     const pointsTable = [];

  //     for (const registeredTeam of registeredTeams) {
  //       const team = registeredTeam.team;
  //       const matches = await Match.find({
  //         tournament: tournamentId,
  //         status: 'played',
  //         $or: [{ team1: team._id }, { team2: team._id }],
  //       }).populate('scoreBoard.team1 scoreBoard.team2');

  //       let matchesPlayed = 0;
  //       let wins = 0;
  //       let losses = 0;
  //       let ties = 0;
  //       let totalRunsScored = 0;
  //       let totalRunsConceded = 0;
  //       let totalBallsFaced = 0;
  //       let totalBallsBowled = 0;

  //       for (const match of matches) {
  //         matchesPlayed++;

  //         const isTeam1 = match.scoreBoard.team1._id.toString() === team._id.toString();

  //         const teamData = isTeam1 ? match.scoreBoard.firstInnings : match.scoreBoard.secondInnings;
  //         const opponentData = isTeam1 ? match.scoreBoard.secondInnings : match.scoreBoard.firstInnings;

  //         if (!teamData || !opponentData) {
  //           console.error(`Invalid scoreBoard data for Match ID: ${match._id}`);
  //           continue;
  //         }

  //         const teamRuns = teamData.totalScore || 0;
  //         const opponentRuns = opponentData.totalScore || 0;
  //         totalRunsScored += teamRuns;
  //         totalRunsConceded += opponentRuns;

  //         const teamBallsFaced = (parseInt(teamData.overs || 0) * 6) + (parseInt(teamData.balls || 0));
  //         const opponentBallsFaced = (parseInt(opponentData.overs || 0) * 6) + (parseInt(opponentData.balls || 0));

  //         totalBallsFaced += teamBallsFaced;
  //         totalBallsBowled += opponentBallsFaced;

  //         if (match.isTie) {
  //           ties++;
  //         } else if (match.winningTeamId && match.winningTeamId.toString() === team._id.toString()) {
  //           wins++;
  //         } else {
  //           losses++;
  //         }
  //       }
  //       const oversPlayed = (totalBallsFaced / 6).toFixed(2);
  //       const oversBowled = (totalBallsBowled / 6).toFixed(2);
  //       const runRateScored = totalBallsFaced > 0 ? (totalRunsScored / parseFloat(oversPlayed)).toFixed(2) : 0;
  //       const runRateConceded = totalBallsBowled > 0 ? (totalRunsConceded / parseFloat(oversBowled)).toFixed(2) : 0;

  //       const netRunRate = (parseFloat(runRateScored) - parseFloat(runRateConceded)).toFixed(2);

  //       pointsTable.push({
  //         rank: 0, 
  //         teamId: team._id,
  //         teamName: team.teamName,
  //         teamLogo: team.teamLogo,
  //         matchesPlayed,
  //         wins,
  //         losses,
  //         ties,
  //         points: wins * 2 + ties,
  //         netRunRate,
  //         // runsScored: totalRunsScored,
  //         // runsConceded: totalRunsConceded,
  //         // oversPlayed,
  //         // oversBowled
  //       });
  //     }
  //     pointsTable.sort((a, b) => {
  //       if (b.points !== a.points) {
  //         return b.points - a.points;
  //       }
  //       return parseFloat(b.netRunRate) - parseFloat(a.netRunRate);
  //     });

  //     pointsTable.forEach((team, index) => {
  //       team.rank = index + 1;
  //     });

  //     return pointsTable;
  //   } catch (error) { 
  //     console.error('Error in getPointsTable:', error.message);
  //     throw new Error(error.message);
  //   }
  // },

  async getPointsTable(tournamentId) {
    try {
      const registeredTeams = await RegisteredTeam.find({
        tournament: tournamentId,
        status: 'Accepted',
      }).populate('team');

      const pointsTable = [];

      for (const registeredTeam of registeredTeams) {
        const team = registeredTeam.team;
        const matches = await Match.find({
          tournament: tournamentId,
          status: 'played',
          $or: [{ team1: team._id }, { team2: team._id }],
        }).populate('scoreBoard.team1 scoreBoard.team2');

        let matchesPlayed = 0;
        let wins = 0;
        let losses = 0;
        let ties = 0;
        let totalRunsScored = 0;
        let totalRunsConceded = 0;
        let totalBallsFaced = 0;
        let totalBallsBowled = 0;
        let teamNetRunRate = 0;

        for (const match of matches) {
          matchesPlayed++;

          const isTeam1 = match.scoreBoard.team1._id.toString() === team._id.toString();

          const teamData = isTeam1 ? match.scoreBoard.firstInnings : match.scoreBoard.secondInnings;
          const opponentData = isTeam1 ? match.scoreBoard.secondInnings : match.scoreBoard.firstInnings;

          if (!teamData || !opponentData) {
            console.error(`Invalid scoreBoard data for Match ID: ${match._id}`);
            continue;
          }


          const teamRuns = teamData.totalScore || 0;
          const opponentRuns = opponentData.totalScore || 0;
          totalRunsScored += teamRuns;
          totalRunsConceded += opponentRuns;

          const teamBallsFaced = (parseInt(teamData.overs || 0) * 6) + (parseInt(teamData.balls || 0));
          const opponentBallsFaced = (parseInt(opponentData.overs || 0) * 6) + (parseInt(opponentData.balls || 0));

          totalBallsFaced += teamBallsFaced;
          totalBallsBowled += opponentBallsFaced;

          // Handle tie case
          if (match.isTie) {
            ties++;
          } else if (match.winningTeamId && match.winningTeamId.toString() === team._id.toString()) {
            wins++;
          } else {
            losses++;
          }
          if (teamRuns === opponentRuns) {
            teamNetRunRate += 0.15;

          }
        }

        const oversPlayed = (totalBallsFaced / 6).toFixed(2);
        const oversBowled = (totalBallsBowled / 6).toFixed(2);
        const runRateScored = totalBallsFaced > 0 ? (totalRunsScored / parseFloat(oversPlayed)).toFixed(2) : 0;
        const runRateConceded = totalBallsBowled > 0 ? (totalRunsConceded / parseFloat(oversBowled)).toFixed(2) : 0;

        let netRunRate = (parseFloat(runRateScored) - parseFloat(runRateConceded)).toFixed(2);

        if (teamNetRunRate !== 0) {
          netRunRate = (parseFloat(netRunRate) + teamNetRunRate).toFixed(2);

        }

        pointsTable.push({
          rank: 0,
          teamId: team._id,
          teamName: team.teamName,
          teamLogo: team.teamLogo,
          matchesPlayed,
          wins,
          losses,
          ties,
          points: wins * 2 + ties * 0.15,
          netRunRate,
        });
      }

      pointsTable.sort((a, b) => {
        if (b.points !== a.points) {
          return b.points - a.points;
        }
        return parseFloat(b.netRunRate) - parseFloat(a.netRunRate);
      });

      pointsTable.forEach((team, index) => {
        team.rank = index + 1;
      });

      return pointsTable;
    } catch (error) {
      console.error('Error in getPointsTable:', error.message);
      throw new Error(error.message);
    }
  }
};

export default teamServices;
