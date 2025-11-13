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

  /**
  * @function getTeamById
  * @description Fetch a team by its ID.
  * @param {string} TeamId - The unique team ID.
  * @returns {Promise<Object>} Team data if found.
  * @throws {Error} Throws if the team does not exist.
  */
  async getTeamById(TeamId) {
    //Find the Banner
    let teamData = await Team.findOne({ _id: TeamId });

    if (!teamData) {
      // Handle the case where the user is not found
      throw CustomErrorHandler.notFound("Team Not Found");
    }

    let userData = await User.findOne({ _id: teamData.userId }); // Select the fields you need for the user


    return { teamData };
  },
  /**
    * @function getAllTeams
    * @description Fetch all teams in the system.
    * @returns {Promise<Array>} Array of team objects.
    * @throws {Error} Throws if no teams are found.
    */
  async getAllTeams() {
    //Find the Banner
    let teamData = await Team.find();

    if (!teamData) {
      // Handle the case where the user is not found
      throw CustomErrorHandler.notFound("Team Not Found");
    }
    return teamData;
  },

  /**
    * @function getUserTeams
    * @description Fetch all teams created by the currently logged-in user.
    * @returns {Promise<Array>} Array of user teams with player counts.
    * @throws {Error} Throws if no teams are found.
    */
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

  /**
   * @function getTeamsByPhoneNumber
   * @description Get all teams a player belongs to using their phone number.
   * @param {string} phoneNumber - The player's phone number.
   * @returns {Promise<Array>} Array of teams with player counts.
   */
  async getTeamsByPhoneNumber(phoneNumber) {
    try {
      const players = await Player.find({ phoneNumber });
      const teamIds = players.map(player => player.team);
      const teams = await Team.find({ _id: { $in: teamIds } });

      if (!teams || teams.length === 0) {
        // throw CustomErrorHandler.notFound("No teams found for these players.");
        console.log("No teams found for these players.");
      }
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

  /**
   * @function editTeam
   * @description Updates a team's name and/or logo.
   * @param {Object} data - Team update data.
   * @param {string} data.teamLogo - New logo (optional).
   * @param {string} data.teamName - New team name.
   * @param {string} TeamId - Team ID.
   * @returns {Promise<Object>} Updated team data.
   */
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

  /**
   * @function addPlayer
   * @description Adds a new player to a team.
   * Automatically updates userId if the user later registers.
   * @param {Object} data - Player details.
   * @param {string} TeamId - Team ID.
   * @param {Object} currentUser - Current user info.
   * @returns {Promise<Object>} Updated team and optional FCM token.
   */
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

  /**
  * @function deletePlayer
  * @description Removes a player from a team and deletes them from DB.
  * @param {string} teamId - The team ID.
  * @param {string} playerId - The player ID.
  * @returns {Promise<Object>} Updated team.
  */
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

  /**
   * @function changeCaptain
   * @description Changes the captain of a team and updates roles accordingly.
   * @param {string} userId - Requesting user's ID.
   * @param {string} teamId - Team ID.
   * @param {string} newCaptainId - New captain's player ID.
   * @param {string} newRole - Role of the new captain.
   * @param {string} previousCaptainId - Current captain's player ID.
   * @param {string} previousCaptainRole - Role to assign to previous captain.
   * @returns {Promise<Object>} Updated team and captain details.
   */
  async changeCaptain(userId, teamId, newCaptainId, newRole, previousCaptainId, previousCaptainRole,) {

    // Find the team and populate the players for direct access
    const team = await Team.findById(teamId).populate('players');
    if (!team) throw CustomErrorHandler.notFound("Team Not Found");

    if (!team.players || team.players.length === 0) throw CustomErrorHandler.notFound("No players found in the team");

    // Locate the current captain and the player who will become the new captain
    const currentCaptain = team.players.find(player => player._id.toString() === previousCaptainId);
    if (!currentCaptain) throw CustomErrorHandler.notFound("Current captain not found in the team");

    if (currentCaptain._id.toString() === newCaptainId) throw CustomErrorHandler.badRequest("This player is already the captain");

    // Ensure both the current and new captains exist within the team
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

  /**
  * @function getAllNearByTeam
  * @description Retrieves teams near the user's location filtered by sport.
  * @param {Object} data - Location and sport filters.
  * @param {number} data.latitude - Latitude of user.
  * @param {number} data.longitude - Longitude of user.
  * @param {string} data.sport - Sport name.
  * @returns {Promise<Array>} List of nearby teams.
  */
  async getAllTeamNearByMe() {
    //Find the Banner
    let teamData = await Team.find();

    if (!teamData) {
      // Handle the case where the user is not found
      throw CustomErrorHandler.notFound("Team Not Found");
    }
    return teamData;
  },

  /**
  * @function addLookingFor
  * @description Creates a new "looking for" entry where a user specifies their role and location preference.
  * Used when a player is looking for a team or match opportunity.
  * 
  * @param {Object} data - Contains the player's selected location and desired role.
  * @param {string} data.placeName - Human-readable name of the selected place.
  * @param {number|string} data.longitude - Longitude coordinate of the location.
  * @param {number|string} data.latitude - Latitude coordinate of the location.
  * @param {string} data.role - The role the user is looking to play (e.g., batsman, bowler).
  * 
  * @returns {Promise<Object>} The saved "looking for" record from the database.
  */
  async addLookingFor(data) {
    const { placeName, longitude, latitude, role } = data;

    // Retrieve logged-in user details from global context
    const userInfo = global.user;

    // Create a new "Lookingfor" document with user role and location details
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

  /**
 * @function deleteLookingFor
 * @description Deletes a specific "looking for" entry by its ID.
 * Typically used when a player no longer wants to appear as "looking for" a team or match.
 * 
 * @param {string} lookingId - The ID of the "looking for" record to delete.
 * @returns {Promise<void>} No content is returned; operation completes silently.
 */
  async deleteLookingFor(lookingId) {
    // Delete the player from the team players collection
    await Lookingfor.deleteOne({ _id: lookingId });
  },


  /**
 * @function getAllLooking
 * @description Retrieves nearby "looking for" players based on user's current location (within 6 km radius by default).
 * It uses MongoDB's geospatial query to find players around the given coordinates.
 * 
 * @param {Object} data - Contains latitude and longitude of the current user.
 * @returns {Promise<Object>} List of nearby players along with user details and distance.
 */
  async getAllLooking(data) {
    try {
      const { latitude, longitude } = data;
      const maxDistanceInKm = 30;

      const looking = await Lookingfor.aggregate([
        {
          // Find nearby players using GeoJSON location field
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

      // if (!looking || looking.length === 0) {
      //   // Handle the case where no results are found
      //   throw CustomErrorHandler.notFound("Team Not Found");
      // }

      return { data: looking };
    } catch (error) {
      console.log(`Failed to get looking :${error}`);
    }
  },

  /**
 * @function getLookingByID
 * @description Retrieves all "looking for" entries created by the currently logged-in user.
 * It joins with the users collection to include user profile details.
 *
 * @returns {Promise<Array>} Array of "looking for" entries with user details.
 */
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


  /**
     * @function getAllNearByTeam
     * @description Retrieves teams near the user's location filtered by sport.
     * @param {Object} data - Location and sport filters.
     * @param {number} data.latitude - Latitude of user.
     * @param {number} data.longitude - Longitude of user.
     * @param {string} data.sport - Sport name.
     * @returns {Promise<Array>} List of nearby teams.
     */
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
          distanceInKm: { $divide: ["$distance", 1000] },
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
      { $unwind: "$teams" },
      {
        $match: {
          "teams.teamfor": sport,
        },
      },
      {
        $lookup: {
          from: "players",
          let: { playerIds: "$teams.players" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $in: ["$_id", "$$playerIds"],
                },
              },
            },
          ],
          as: "teamsPopulatedPlayers",
        },
      },
      {
        $addFields: {
          "teams.players": "$teamsPopulatedPlayers",
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
          "teams.players": 1,
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
    ]);
    return NearByTeams;
  },
  async getTeamCount() {
    //Find the Banner
    const totalTeams = await Team.countDocuments();
    return totalTeams;
  },


  /**
    * @function getPointsTable
    * @description Generates the points table for a cricket tournament.
    * @param {Object} data - Tournament data.
    * @param {string} data.tournamentId - Tournament ID.
    * @returns {Promise<Array>} Ordered list of teams with stats.
    */
  async getPointsTable(data) {
    try {
      const { tournamentId } = data;
      const registeredTeams = await RegisteredTeam.find({
        tournament: tournamentId,
        status: 'Accepted',
      }).populate('team');

      const pointsTable = [];

      for (const registeredTeam of registeredTeams) {
        const team = registeredTeam.team;
        if (!team?._id) continue;

        const matches = await Match.find({
          tournament: tournamentId,
          status: 'played',
          $or: [{ team1: team._id }, { team2: team._id }],
        });

        let matchesPlayed = 0;
        let wins = 0;
        let losses = 0;
        let ties = 0;
        let totalRunsScored = 0;
        let totalRunsConceded = 0;
        let totalBallsFaced = 0;
        let totalBallsBowled = 0;
        let teamNetRunRateBonus = 0;

        for (const match of matches) {
          const scoreBoard = match.scoreBoard;
          if (!scoreBoard) continue;

          const team1 = scoreBoard.get('team1');
          const team2 = scoreBoard.get('team2');
          const firstInnings = scoreBoard.get('firstInnings');
          const secondInnings = scoreBoard.get('secondInnings');

          if (!team1?._id || !team2?._id || !firstInnings || !secondInnings) continue;

          const isTeam1 = team1._id.toString() === team._id.toString();
          const teamData = isTeam1 ? firstInnings : secondInnings;
          const opponentData = isTeam1 ? secondInnings : firstInnings;

          if (!teamData || !opponentData) continue;

          matchesPlayed++;

          const teamRuns = teamData.totalScore || 0;
          const opponentRuns = opponentData.totalScore || 0;

          totalRunsScored += teamRuns;
          totalRunsConceded += opponentRuns;

          const teamBallsFaced = (parseInt(teamData.overs || 0) * 6) + (parseInt(teamData.balls || 0));
          const opponentBallsFaced = (parseInt(opponentData.overs || 0) * 6) + (parseInt(opponentData.balls || 0));

          totalBallsFaced += teamBallsFaced;
          totalBallsBowled += opponentBallsFaced;

          if (match.isMatchDraw === true) {
            ties++;
          } else if (match.winningTeamId?.toString() === team._id.toString()) {
            wins++;
          } else {
            losses++;
          }

          if (teamRuns === opponentRuns) {
            teamNetRunRateBonus += 0.15;
          }
        }

        const oversPlayed = totalBallsFaced / 6;
        const oversBowled = totalBallsBowled / 6;
        const runRateScored = totalBallsFaced > 0 ? (totalRunsScored / oversPlayed) : 0;
        const runRateConceded = totalBallsBowled > 0 ? (totalRunsConceded / oversBowled) : 0;

        let netRunRate = runRateScored - runRateConceded;
        if (teamNetRunRateBonus !== 0) {
          netRunRate += teamNetRunRateBonus;
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
          points: (wins * 2) + (ties * 1),
          netRunRate: netRunRate.toFixed(2),
        });
      }
      pointsTable.sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        return parseFloat(b.netRunRate) - parseFloat(a.netRunRate);
      });

      pointsTable.forEach((team, index) => {
        team.rank = index + 1;
      });

      return pointsTable;
    } catch (error) {
      console.error('Error in getPointsTable:', error);
      throw new Error(error.message);
    }
  },

  /**
   * @function getFootballPointsTable
   * @description Generates the points table for a football tournament.
   * @param {Object} data - Tournament data.
   * @param {string} data.tournamentId - Tournament ID.
   * @returns {Promise<Array>} Football teams with rank and stats.
   */
  async getFootballPointsTable(data) {
    try {
      const { tournamentId } = data;

      const registeredTeams = await RegisteredTeam.find({
        tournament: tournamentId,
        status: 'Accepted',
      }).populate('team');

      const pointsTable = [];

      for (const registeredTeam of registeredTeams) {
        const team = registeredTeam.team;
        if (!team?._id) continue;

        const matches = await Match.find({
          tournament: tournamentId,
          status: 'played',
          $or: [{ team1: team._id }, { team2: team._id }],
        });

        let matchesPlayed = 0;
        let wins = 0;
        let ties = 0;
        let losses = 0;
        let goalsFor = 0;
        let goalsAgainst = 0;

        for (const match of matches) {
          const scoreBoard = match.scoreBoard;
          if (!scoreBoard) continue;

          const team1 = scoreBoard.get('homeTeam');
          const team2 = scoreBoard.get('awayTeam');

          if (!team1?._id || !team2?._id) continue;

          const isHome = team1._id.toString() === team._id.toString();
          const isAway = team2._id.toString() === team._id.toString();
          if (!isHome && !isAway) {
            continue;
          }

          matchesPlayed++;

          let homeScore = 0;
          let awayScore = 0;

          const firstHalf = scoreBoard.get('firstHalf');
          if (firstHalf) {
            homeScore += firstHalf.homeGoals || 0;
            awayScore += firstHalf.awayGoals || 0;
          }

          const secondHalf = scoreBoard.get('secondHalf');
          if (secondHalf) {
            homeScore += secondHalf.homeGoals || 0;
            awayScore += secondHalf.awayGoals || 0;
          }

          const extraTime = scoreBoard.get('extraTime');
          if (extraTime) {

            if (extraTime.firstHalf) {
              homeScore += extraTime.firstHalf.homeGoals || 0;
              awayScore += extraTime.firstHalf.awayGoals || 0;
            }

            if (extraTime.secondHalf) {
              homeScore += extraTime.secondHalf.homeGoals || 0;
              awayScore += extraTime.secondHalf.awayGoals || 0;
            }

            homeScore += extraTime.homeGoals || 0;
            awayScore += extraTime.awayGoals || 0;
          }


          const penaltyShootout = scoreBoard.get('penaltyShootout');
          let homeWonPenalty = false;
          let awayWonPenalty = false;

          if (penaltyShootout && homeScore === awayScore) {
            const homePenaltyScore = penaltyShootout.homeTeamScore || 0;
            const awayPenaltyScore = penaltyShootout.awayTeamScore || 0;

            if (homePenaltyScore > awayPenaltyScore) {
              homeWonPenalty = true;
            } else if (awayPenaltyScore > homePenaltyScore) {
              awayWonPenalty = true;
            }
          }

          let teamGoals, opponentGoals;
          if (isHome) {
            teamGoals = homeScore;
            opponentGoals = awayScore;
          } else {
            teamGoals = awayScore;
            opponentGoals = homeScore;
          }

          goalsFor += teamGoals;
          goalsAgainst += opponentGoals;

          if (teamGoals > opponentGoals) {
            wins++;
          } else if (teamGoals < opponentGoals) {
            losses++;
          } else {
            if (penaltyShootout) {
              if ((isHome && homeWonPenalty) || (isAway && awayWonPenalty)) {
                wins++;
              } else if ((isHome && awayWonPenalty) || (isAway && homeWonPenalty)) {
                losses++;
              } else {
                ties++;
              }
            } else {
              ties++;
            }
          }
        }

        const goalDifference = goalsFor - goalsAgainst;
        const points = wins * 3 + ties * 1;

        pointsTable.push({
          rank: 0,
          teamId: team._id.toString(),
          teamName: team.teamName,
          teamLogo: team.teamLogo,
          matchesPlayed,
          wins,
          losses,
          ties,
          goalsFor,
          goalsAgainst,
          goalDifference,
          points,
        });
      }

      // Sort by points, then goal difference, then goals for
      pointsTable.sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.goalDifference !== a.goalDifference)
          return b.goalDifference - a.goalDifference;
        return b.goalsFor - a.goalsFor;
      });

      // Assign ranks
      pointsTable.forEach((team, idx) => {
        team.rank = idx + 1;
      });

      return pointsTable;
    } catch (error) {
      console.error('Error in getFootballPointsTable:', error);
      throw new Error(error.message);
    }
  }

};

export default teamServices;
