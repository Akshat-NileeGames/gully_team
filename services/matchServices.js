// import { Types } from "mongoose";
import mongoose from "mongoose"; // Add this line
import CustomErrorHandler from "../helpers/CustomErrorHandler.js";
import {
  ChallengeTeam,
  Match,
  Player,
  Team,
  RegisteredTeam,
  Tournament,
  User,
} from "../models/index.js";
import { DateTime } from "luxon";
import firebaseNotification from "../helpers/firebaseNotification.js";

const matchServices = {
  /**
   * @function createMatch
   * @description Creates a match for a tournament. Validates tournament existence and user authority,
   * checks for overlapping players between teams, normalizes the provided datetime to ISO, saves the match,
   * and sends notifications to both team organizers if FCM tokens exist.
   *
   * @param {Object} data - Match creation payload.
   * @param {string} data.tournamentId - Tournament ID.
   * @param {string} data.team1ID - Team 1 ID.
   * @param {string} data.team2ID - Team 2 ID.
   * @param {string|number} data.round - Round identifier.
   * @param {string|number} data.matchNo - Match number.
   * @param {string} data.dateTime - ISO date/time string for the match.
   * @param {string} [data.winningTeamId] - Optional winning team ID.
   * @param {string} [data.matchAuthority] - Authority who created/controls the match.
   * @param {number} [data.matchlength] - Optional match length.
   * @returns {Promise<Object>} The saved match document.
   * @throws {CustomErrorHandler} Throws validation/permission/date/overlap errors via CustomErrorHandler.
   */
  async createMatch(data) {

    const { tournamentId, team1ID, team2ID, round, matchNo, dateTime, winningTeamId, matchAuthority, matchlength } = data;
    const userInfo = global.user;
    const TournamentExist = await Tournament.findOne({ _id: tournamentId });

    // Verify tournament exists
    if (!TournamentExist) {
      throw CustomErrorHandler.badRequest("This Tournament is Not Found.");
    }

    // Check if the user has the authority to create the match
    if (TournamentExist?.authority != userInfo.userId) {
      throw CustomErrorHandler.badRequest("You do not have permission.");
    }
    // Validate that team1 and team2 do not share players
    const team1 = await Team.findById(team1ID);
    const team2 = await Team.findById(team2ID);

    const team1Players = team1.players;
    const team2Players = team2.players;

    // Check for overlapping players by phoneNumber
    const overlappingPlayers = team1Players.filter(player1 =>
      team2Players.some(player2 => player1.phoneNumber === player2.phoneNumber)
    );
    if (overlappingPlayers.length > 0) {
      const overlapDetails = overlappingPlayers.map(player =>
        `${player.name} (Phone: ${player.phoneNumber})`
      ).join(", ");

      throw CustomErrorHandler.badRequest(`There are overlapping players in both teams: ${overlapDetails}`);
    }

    //parse and validate ISO datetime (UTC), return standardized ISO string
    const formatDateTime = (dateTimeString) => {
      const parsedDate = DateTime.fromISO(dateTimeString, { zone: "utc" });
      if (!parsedDate.isValid) {
        throw CustomErrorHandler.badRequest("Invalid date format. Please provide a valid ISO string.");
      }

      return parsedDate.toISO();
    };

    // Standardize and log datetime before saving
    const standardizedDateTime = formatDateTime(dateTime);
    console.log("Create Match - Original DateTime:", dateTime);
    console.log("Create Match - Stored DateTime:", standardizedDateTime);



    // Create a new match
    const newMatch = new Match({
      tournament: tournamentId,
      team1: team1ID,
      team2: team2ID,
      dateTime: standardizedDateTime,
      matchlength: matchlength > 0 ? matchlength : null,
      Round: round,
      matchNo: matchNo,
      winningTeamId: winningTeamId,
      matchAuthority: matchAuthority
    });

    // Save the new match
    const matchdata = await newMatch.save();
    //Fetch The team Captain of Team1 and Team2
    const [team1org, team2org] = await Promise.all([
      User.findById(team1.userId),
      User.findById(team2.userId)
    ]);

    const [Team1FCM, Team2FCM] = [team1org.fcmToken, team2org.fcmToken];

    console.log("Team1FCM", Team1FCM);
    console.log("Team2FCM", Team2FCM);
    // If both organizers have FCM tokens, prepare and send notifications
    if (Team1FCM && Team2FCM) {
      const notificationDataTeam1 = {
        title: `${team1.teamName} VS ${team2.teamName} ${round} Match`,
        body: `Your match against ${team2.teamName} is scheduled on ${standardizedDateTime.split('T')[0]}. Be ready!`,
      };

      const notificationDataTeam2 = {
        title: `${team2.teamName} VS ${team1.teamName} ${round} Match`,
        body: `Your match against ${team1.teamName} is scheduled on ${standardizedDateTime.split('T')[0]}. Be ready!`,
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

    return matchdata;
  },


  // async createMatch(data) {
  //   const userInfo = global.user;

  //   console.log("user", userInfo);
  //   const { tournamentId, team1ID, team2ID, round, matchNo, dateTime } = data;

  //   const TournamentExist = await Tournament.findOne({
  //     _id: tournamentId,
  //   });

  //   if (!TournamentExist) {
  //     throw CustomErrorHandler.badRequest("This Tournament is Not Found.");
  //   }

  //   if (TournamentExist?.authority != userInfo.userId) {
  //     throw CustomErrorHandler.badRequest("You do not have permission.");
  //   }

  //   //we are checking team1 player is present in team2.

  //   const team1 = await Team.findById(team1ID);
  //   const team2 = await Team.findById(team2ID);

  //   let team1Players = team1.players;
  //   let team2Players = team2.players;

  //   // Function to check if any player from `team2` is present in `team1`
  //   function isPlayerPresentInTeam2(team1Players, team2Players) {
  //     // Extracting the array of player phoneNumber from `team1`
  //     const team1PlayerIds = team1Players.map((player) => player.phoneNumber);

  //     for (const player of team2Players) {
  //       if (team1PlayerIds.includes(player.phoneNumber)) {
  //         console.log(
  //           `Player with  ${player.phoneNumber} is present in both Team `
  //         );
  //         throw CustomErrorHandler.alreadyExist(
  //           `Player with  Phone Number ${player.phoneNumber} present in both Team `
  //         );
  //         //return true;
  //       }
  //     }
  //     return false; // No player from `team2` is present in `team1`
  //   }

  //   // Call the function passing `team1` and `team2` as arguments
  //   const isPlayerPresent = isPlayerPresentInTeam2(team1Players, team2Players);

  //   // Create a new instance of the Match model
  //   const newMatch = new Match({
  //     tournament: tournamentId,
  //     team1: team1ID,
  //     team2: team2ID,
  //     dateTime: dateTime,
  //     Round: round,
  //     matchNo: matchNo,
  //   });

  //   // Save the new Match and wait for the operation to complete
  //   const matchdata = await newMatch.save();
  //   return matchdata;
  // },


  //Anurag
  // async getOpponentTournamentId() {
  //   try {
  //     const userInfo = global.user;
  //     if (!userInfo || !userInfo.userId) {
  //       throw new Error("User information is missing or invalid.");
  //     }

  //     const userPhoneNumber = await User.findOne({ _id: userInfo.userId }).select("phoneNumber").lean();
  //     const phoneNumberToFind = userPhoneNumber?.phoneNumber;

  //     if (!phoneNumberToFind) {
  //       throw new Error("User phone number not found.");
  //     }

  //     const matchData = await Match.find({ scoreBoard: { $ne: null } })
  //       .select("tournament team1 team2 _id")
  //       .populate({
  //         path: "tournament",
  //         select: "tournamentName",
  //       })
  //       .populate({
  //         path: "team1",
  //         populate: { path: "players", select: "phoneNumber" },
  //       })
  //       .populate({
  //         path: "team2",
  //         populate: { path: "players", select: "phoneNumber" },
  //       })
  //       .lean();

  //     const tournamentsWithPhoneNumber = matchData.filter((match) => {
  //       return (
  //         match.team1?.players?.some((player) => player.phoneNumber === phoneNumberToFind) ||
  //         match.team2?.players?.some((player) => player.phoneNumber === phoneNumberToFind)
  //       );
  //     });

  //     const tournamentDetails = tournamentsWithPhoneNumber.map((match) => {
  //       let teamId = "";

  //       if (match.team1?.players?.some((player) => player.phoneNumber === phoneNumberToFind)) {
  //         teamId = match.team1._id.toString();
  //       } else if (match.team2?.players?.some((player) => player.phoneNumber === phoneNumberToFind)) {
  //         teamId = match.team2._id.toString();
  //       }

  //       return {
  //         matchId: match._id,
  //         tournamentId: match.tournament._id,
  //         tournamentName: match.tournament.tournamentName,
  //         teamId,
  //       };
  //     });

  //     return { data: tournamentDetails };
  //   } catch (error) {
  //     console.error("Error in getOpponentTournamentId:", error.message);
  //     throw error;
  //   }
  // },


  /**
   * @function getOpponentTournamentId
   * @description Fetches all tournaments in which the logged-in user has participated, ensuring
   * no player overlaps between teams. Returns match and tournament details linked to the user.
   *
   * @returns {Promise<Object>} Object containing a `data` array with match and tournament details.
   * @throws {CustomErrorHandler.badRequest} If the user's phone number cannot be found.
   */
  async getOpponentTournamentId() {
    const userInfo = global.user;
    const userId = userInfo.userId;

    // Fetch user's phone number
    const userPhoneNumber = await User.findOne({ _id: userId }).select("phoneNumber");

    if (!userPhoneNumber) {
      throw CustomErrorHandler.badRequest("User phone number not found.");
    }

    const phoneNumberToFind = userPhoneNumber.phoneNumber;

    // Fetch matches with scoreboards and populated team/player/tournament data
    // Sort by dateTime descending to get latest matches first
    const matchData = await Match.find({ scoreBoard: { $ne: null } })
      .select("tournament team1 team2 _id dateTime")
      .sort({ dateTime: -1 }) // Latest matches first
      .populate("tournament", "tournamentName tournamentfor")

      .populate({
        path: "team1",
        populate: {
          path: "players",
          select: "phoneNumber",
        },
      })
      .populate({
        path: "team2",
        populate: {
          path: "players",
          select: "phoneNumber",
        },
      });

    // Filter matches containing the user's phone number and no overlapping players
    const tournamentsWithPhoneNumber = matchData.filter((match) => {
      if (!match.team1?.players || !match.team2?.players) {
        return false;
      }

      const team1Players = match.team1.players.map((player) => player.phoneNumber);
      const team2Players = match.team2.players.map((player) => player.phoneNumber);

      // Exclude matches where teams share any player phoneNumber
      const hasOverlap = team1Players.some((phone) => team2Players.includes(phone));

      if (hasOverlap) {
        return false;
      }
      // Include match if user's phone exists in either team
      return (
        team1Players.includes(phoneNumberToFind) ||
        team2Players.includes(phoneNumberToFind)
      );
    });

    // Extract relevant tournament and team details
    const tournamentDetails = tournamentsWithPhoneNumber.map((match) => {
      let teamId = "";
      let tournamentId = null;

      // console.log(match);

      if (match.team1 && match.team1.players) {
        const isInTeam1 = match.team1.players.some(
          (player) => player.phoneNumber === phoneNumberToFind
        );
        if (isInTeam1) {
          teamId = match.team1._id;
        }
      }

      if (!teamId && match.team2 && match.team2.players) {
        const isInTeam2 = match.team2.players.some(
          (player) => player.phoneNumber === phoneNumberToFind
        );
        if (isInTeam2) {
          teamId = match.team2._id;
        }
      }

      if (match.tournament && match.tournament._id) {
        tournamentId = match.tournament._id;
      }

      if (tournamentId) {
        return {
          matchId: match._id,
          tournamentId,
          tournamentName: match.tournament.tournamentName,
          tournamentfor: match.tournament.tournamentfor,
          teamId,
        };
      }

      return null;
    }).filter(Boolean);

    // Get unique tournaments (keep only the latest match per tournament)
    const uniqueTournaments = {};
    tournamentDetails.forEach((detail) => {
      const tournamentKey = detail.tournamentId.toString();

      // If tournament not seen yet, or this match is more recent, keep it
      if (!uniqueTournaments[tournamentKey]) {
        uniqueTournaments[tournamentKey] = detail;
      }
      // Since matches are already sorted by default (latest first in MongoDB),
      // we only keep the first occurrence of each tournament
    });

    // Convert back to array
    const uniqueTournamentList = Object.values(uniqueTournaments);

    return { data: uniqueTournamentList };
  },

  /**
   * @function getMatch
   * @description Retrieves all matches for a given tournament.
   *
   * @param {string} tournamentId - The tournament ObjectId.
   * @returns {Promise<Array>} Array of match documents.
   * @throws {CustomErrorHandler.notFound} If no matches are found.
   */
  async getMatch(tournamentId) {
    // Query matches by tournament
    const MatchExist = await Match.find({
      tournament: tournamentId,
    });
    // If no match document is found, throw notFound error
    if (!MatchExist) {
      throw CustomErrorHandler.notFound("This Match is Not Found.");
    }
    return MatchExist;
  },

  /**
   * @function getSingleMatch
   * @description Retrieves a single match by its ID.
   *
   * @param {Object} data - Payload containing the matchId.
   * @param {string} data.matchId - The match ObjectId.
   * @returns {Promise<Object>} The match document.
   * @throws {CustomErrorHandler.notFound} If the match is not found.
   */
  async getSingleMatch(data) {
    try {
      const { matchId } = data;
      // Find match by ID
      const MatchExist = await Match.findById(matchId);
      if (!MatchExist) {
        throw CustomErrorHandler.notFound("This Match is Not Found.");
      }
      return MatchExist;
    } catch (error) {
      console.log(`Failed to get Single Match :${error}`);
    }
  },

  /**
 * @function getChallengeMatch
 * @description Retrieves challenge team entries that include a scoreboard for a given match ID.
 *
 * @param {Object} data - Payload containing the matchId.
 * @param {string} data.matchId - The match ObjectId to search in scoreBoard.matchId.
 * @returns {Promise<Array>} Array of challenge team documents containing the match scoreboard.
 * @throws {CustomErrorHandler.notFound} If no matching challenge entries are found.
 */
  async getChallengeMatch(data) {
    try {
      const { matchId } = data;
      // Find challenge teams that reference the given matchId in their scoreboard
      const MatchExist = await ChallengeTeam.find({
        "scoreBoard.matchId": matchId
      });
      if (!MatchExist) {
        throw CustomErrorHandler.notFound("This Match is Not Found.");
      }
      return MatchExist;
    } catch (error) {
      console.log(`Failed to get Single Match :${error}`);
    }
  },


  //Old
  // async getOpponentTournamentId() {
  //   const userInfo = global.user;
  //   const userId = userInfo.userId;

  //   const userPhoneNumber = await User.find({
  //     _id: userId,
  //   }).select("phoneNumber");

  //   const phoneNumberToFind = userPhoneNumber
  //     ? userPhoneNumber[0].phoneNumber
  //     : "1234567891";

  //   const matchData = await Match.find({ scoreBoard: { $ne: null } })
  //     .select("tournament team1 team2 _id ")
  //     .populate("tournament", "tournamentName");

  //   const tournamentsWithPhoneNumber = matchData.filter((match) => {
  //     // Check if the phone number exists in either team1 or team2 players' arrays
  //     return (
  //       match.team1.players.some(
  //         (player) => player.phoneNumber === phoneNumberToFind
  //       ) ||
  //       match.team2.players.some(
  //         (player) => player.phoneNumber === phoneNumberToFind
  //       )
  //     );
  //   });

  //   const tournamentDetails = tournamentsWithPhoneNumber.map((match) => ({
  //     matchId: match._id,
  //     tournamentId: match.tournament._id,
  //     tournamentName: match.tournament.tournamentName,
  //     teamId: match.team1.players.some(
  //       (player) => player.phoneNumber === phoneNumberToFind
  //     )
  //       ? match.team1._id
  //       : match.team2.players.some(
  //           (player) => player.phoneNumber === phoneNumberToFind
  //         )
  //       ? match.team2._id
  //       : "",
  //   }));

  //   const filteredTournaments = matchData
  //     .filter((match) => {
  //       const team1Players = match.team1.players.map((player) =>
  //         player.phoneNumber.toString()
  //       );
  //       const team2Players = match.team2.players.map((player) =>
  //         player.phoneNumber.toString()
  //       );
  //       //TODO: change here
  //       return (
  //         !team1Players.includes(phoneNumberToFind) ||
  //         team2Players.includes(phoneNumberToFind)
  //       );
  //     })
  //     .map((match) => ({
  //       tournamentId: match.tournament._id,
  //       tournamentName: match.tournament.tournamentName,
  //       teamId: match.team1
  //         ? match.team1._id
  //         : match.team2
  //         ? match.team2._id
  //         : "",
  //       // Assuming there is a 'name' property in the tournament object
  //     }));

  //   return { data: tournamentDetails };
  // },

  //FIX: Not Used
  /**
   * @function getOpponentOld
   * @description Legacy method to retrieve unique opponent teams for a given team within a specific tournament.
   * Queries all matches where the specified team participated and extracts their opponents, ensuring no duplicates.
   *
   * @param {string} tournamentID - The tournament ObjectId to search within
   * @param {string} teamID - The team ObjectId to find opponents for
   * @returns {Promise<Array>} Array of unique opponent objects, each containing {opponent: Team}
   */
  async getOpponentOld(tournamentID, teamID) {
    const userInfo = global.user;

    // Find all matches in the tournament where the specified team participated (either as team1 or team2)
    const opponents = await Match.find({
      tournament: tournamentID,
      $or: [{ team1: teamID }, { team2: teamID }],
    }).select("team1, team2");

    // Map through matches to extract the opponent (the team that isn't the specified teamID)
    const filteredOpponents = opponents
      .map((opponent) => {
        const { team1, team2 } = opponent;

        if (teamID === team1._id.toString()) {
          return { opponent: team2 };
        } else if (teamID === team2._id.toString()) {
          return { opponent: team1 };
        }
        return null; // If neither team1 nor team2 matches teamId
      })
      .filter(Boolean); // Remove null entries

    // Remove duplicate opponents using a Set to track unique opponent IDs
    const uniqueOpponentsSet = new Set();
    const uniqueOpponents = filteredOpponents.reduce((acc, opponent) => {
      if (!uniqueOpponentsSet.has(opponent.opponent._id)) {
        uniqueOpponentsSet.add(opponent.opponent._id);
        acc.push(opponent);
      }
      return acc;
    }, []);

    return uniqueOpponents;
    // return filteredOpponents;
  },

  /**
   * @function getOpponent
   * @description Retrieves all opponent teams and match details for a specific team within a tournament.
   * Returns both the unique list of opponent teams and the complete match details for further analysis.
   *
   * @param {string} tournamentID - The tournament ObjectId to search within
   * @param {string} teamID - The team ObjectId to find opponents for
   * @returns {Promise<Object>} Object containing {team: Array, matchDetails: Array}
   *   - team: Array of unique opponent objects
   *   - matchDetails: Array of complete match documents
   * @throws {CustomErrorHandler.notFound} If no matches found for the team in the tournament
   */
  async getOpponent(tournamentID, teamID) {
    const userInfo = global.user;

    // Find all matches in the tournament where the specified team participated
    let opponents = await Match.find({
      tournament: tournamentID,
      $or: [{ team1: teamID }, { team2: teamID }],
    })
    // .select("scoreBoard _id ")
    // .lean();

    // Validate that matches were found for this team
    if (!opponents) {
      throw CustomErrorHandler.notFound("The Player of this Match not Found.");
    }

    // Extract opponent teams from each match
    const filteredOpponents = opponents
      .map((opponent) => {
        const { team1, team2 } = opponent;
        if (teamID === team1._id.toString()) {
          return { opponent: team2 };
        } else if (teamID === team2._id.toString()) {
          return { opponent: team1 };
        }
        return null; // If neither team1 nor team2 matches teamId
      })
      .filter(Boolean); // Remove null entries

    // Remove duplicate opponents to get unique list
    const uniqueOpponentsSet = new Set();
    const uniqueOpponents = filteredOpponents.reduce((acc, opponent) => {
      if (!uniqueOpponentsSet.has(opponent.opponent._id)) {
        uniqueOpponentsSet.add(opponent.opponent._id);
        acc.push(opponent);
      }
      return acc;
    }, []);
    // console.log(uniqueOpponents);

    // Return both the filtered opponents and complete match details
    return { team: filteredOpponents, matchDetails: opponents };
  },

  /**
   * @function editMatch
   * @description Updates an existing match with new information including teams, date/time, round, and match number.
   * Validates match existence and normalizes the datetime before saving changes.
   *
   * @param {Object} data - Updated match data
   * @param {string} data.tournamentId - Tournament ID for validation
   * @param {string} data.team1ID - Updated Team 1 ID
   * @param {string} data.team2ID - Updated Team 2 ID
   * @param {string} data.dateTime - Updated ISO date/time string
   * @param {string|number} data.round - Updated round identifier
   * @param {string|number} data.matchNo - Updated match number
   * @param {string} MatchId - The match ObjectId to update
   * @returns {Promise<Object>} The updated match document
   * @throws {CustomErrorHandler.notFound} If the match is not found
   * @throws {CustomErrorHandler.badRequest} If date format is invalid
   */
  async editMatch(data, MatchId) {

    const userInfo = global.user;

    // Verify the match exists in the specified tournament
    const MatchExist = await Match.findOne({
      _id: MatchId,
      tournament: data.tournamentId,
    });

    if (!MatchExist) throw CustomErrorHandler.notFound("Match Not Found");

    // Helper function to normalize datetime to UTC ISO format
    const formatDateTime = (dateTimeString) => {
      const parsedDate = DateTime.fromISO(dateTimeString, { zone: "utc" });
      if (!parsedDate.isValid) {
        throw CustomErrorHandler.badRequest("Invalid date format. Please provide a valid ISO string.");
      }

      return parsedDate.toISO();
    };

    // Normalize the provided datetime
    const standardizedDateTime = formatDateTime(data.dateTime);
    // console.log("Edit Match - Original DateTime:", data.dateTime);
    // console.log("Edit Match - Formatted DateTime:", standardizedDateTime);

    // Update match fields with new data
    MatchExist.team1 = data.team1ID;
    MatchExist.team2 = data.team2ID;
    MatchExist.Round = data.round;
    MatchExist.matchNo = data.matchNo;
    MatchExist.dateTime = standardizedDateTime;
    MatchExist.matchAuthority = data.matchAuthority;
    if (data.matchlength) {
      MatchExist.matchlength = data.matchlength;
    }

    // Save the updated match
    const matchData = await MatchExist.save();

    // Fetch team organizers for reschedule notifications
    const [team1org, team2org] = await Promise.all([
      User.findById(MatchExist.team1.userId),
      User.findById(MatchExist.team2.userId)
    ]);
    const [Team1FCM, Team2FCM] = [team1org.fcmToken, team2org.fcmToken];

    // Send reschedule notifications to both team organizers if FCM tokens exist
    if (Team1FCM && Team2FCM) {
      const notificationDataTeam1 = {
        title: `${MatchExist.team1.teamName} VS ${MatchExist.team2.teamName} ${MatchExist.Round} Match`,
        body: `Your match against ${MatchExist.team2.teamName} is Rescheduled on ${standardizedDateTime.split('T')[0]}. Be ready!`,
      };

      const notificationDataTeam2 = {
        title: `${MatchExist.team2.teamName} VS ${MatchExist.team1.teamName} ${MatchExist.Round} Match`,
        body: `Your match against ${MatchExist.team1.teamName} is Rescheduled on ${standardizedDateTime.split('T')[0]}. Be ready!`,
      };

      try {
        const [response1, response2] = await Promise.all([
          firebaseNotification.sendNotification(Team1FCM, notificationDataTeam1),
          firebaseNotification.sendNotification(Team2FCM, notificationDataTeam2)
        ]);

        console.log("Notification sent to Team1 organizer successfully:", response1);
        console.log("Notification sent to Team2 organizer successfully:", response2);
      } catch (error) {
        // Log error but don't fail the match update if notifications fail
        console.error("Error sending notification:", error);
      }
    }
    return matchData;
  },

  // async editMatch(data, MatchId) {  recently commented code
  //   const userInfo = global.user;

  //   // Find the Match by ID and ensure it belongs to the correct tournament
  //   const MatchExist = await Match.findOne({
  //     _id: MatchId,
  //     tournament: data.tournamentId,
  //   });

  //   if (!MatchExist) {
  //     // Handle the case where the Match is not found
  //     throw CustomErrorHandler.notFound("Match Not Found");
  //   }

  //   // Update the match fields
  //   MatchExist.team1 = data.team1ID;
  //   MatchExist.team2 = data.team2ID;
  //   MatchExist.Round = data.round;
  //   MatchExist.matchNo = data.matchNo;
  //   MatchExist.dateTime = data.dateTime;

  //   // Save the updated document
  //   const matchData = await MatchExist.save();
  //   return matchData;
  // },


  // async editMatch(data, MatchId) {
  //   const userInfo = global.user;

  //   // Find the Match by ID
  //   const MatchExist = await Match.find({
  //     _id: MatchId,
  //     tournament: data.tournamentId,
  //   });

  //   if (!MatchExist) {
  //     // Handle the case where the Match is not found
  //     throw CustomErrorHandler.notFound("Match Not Found");
  //   }

  //   // Update the tournament's isDeleted is true;
  //   MatchExist.team1 = data.team1ID;
  //   MatchExist.team2 = data.team2ID;
  //   MatchExist.Round = data.round;
  //   MatchExist.matchNo = data.matchNo;
  //   MatchExist.dateTime = data.dateTime;
  //   // Save the updated user document
  //   let matchData = await MatchExist.save();
  //   return matchData;
  // },
  //DG 
  // async updateScoreBoard(data, MatchId) {
  //   try {
  //     // Validate input data
  //     if (!data.scoreBoard || typeof data.scoreBoard !== 'object') {
  //       throw CustomErrorHandler.badRequest("Invalid scoreBoard data");
  //     }

  //     // Atomic update
  //     const matchData = await Match.findByIdAndUpdate(
  //       MatchId,
  //       { $set: { scoreBoard: data.scoreBoard } },
  //       { new: true, runValidators: true }
  //     );

  //     if (!matchData) {
  //       throw CustomErrorHandler.notFound("Match Not Found");
  //     }

  //     return matchData;
  //   } catch (err) {
  //     console.error("Error updating scoreBoard:", err);
  //     throw CustomErrorHandler.internal("Failed to update ScoreBoard");
  //   }
  // },

  /**
   * @function updateScoreBoard
   * @description Updates the scoreboard data for a match and changes its status to 'current' indicating the match is in progress.
   * Supports dynamic scoreboard structure for both cricket and football matches stored as a Map.
   *
   * @param {Object} data - Payload containing scoreboard data
   * @param {Object} data.scoreBoard - Scoreboard object with match-specific data (flexible structure)
   * @param {string} matchId - The match ObjectId to update
   * @returns {Promise<Object>} The updated match document with new scoreboard
   * @throws {CustomErrorHandler.badRequest} If scoreBoard data is invalid
   * @throws {CustomErrorHandler.notFound} If the match is not found
   */
  async updateScoreBoard(data, matchId) {
    try {
      // Validate scoreboard data structure
      if (!data.scoreBoard || typeof data.scoreBoard !== 'object') {
        throw CustomErrorHandler.badRequest("Invalid scoreBoard data");
      }

      // Update match with new scoreboard and set status to 'current' (match in progress)
      const matchData = await Match.findByIdAndUpdate(
        matchId,
        {
          $set: {
            scoreBoard: data.scoreBoard,
            status: 'current'
          }
        },
        { new: true, runValidators: true } // Return updated document and run schema validators
      );

      if (!matchData) {
        throw CustomErrorHandler.notFound("Match Not Found");
      }

      return matchData;
    } catch (err) {
      console.error("Error updating scoreBoard:", err);
    }
  },


  //Nikhil
  // async updateScoreBoard(data, MatchId) {
  //   // const userInfo = global.user;

  //   // Find the tournament by ID
  //   const match = await Match.findById(MatchId);

  //   if (!match) {
  //     // Handle the case where the tournament is not found
  //     throw CustomErrorHandler.notFound("Match Not Found");
  //   }
  //   match.scoreBoard = data.scoreBoard;

  //   // Save the updated user document
  //   let matchData = await match.save();
  //   return matchData;
  // },


  /**
   * @function updateTeamMatchsData
   * @description Updates team and player statistics after a cricket match concludes. Processes batting and bowling
   * statistics for both teams, updates team match data based on the match result, marks the match as played,
   * and sends notifications to all tournament participants.
   *
   * @param {Object} data - Match completion data.
   * @param {string} data.matchId - The ID of the match to update.
   * @param {string} [data.winningTeamId] - The ID of the winning team (null if draw).
   * @param {boolean} data.isDraw - Whether the match ended in a draw.
   * @returns {Promise<boolean>} Returns true on successful update.
   * @throws {CustomErrorHandler} Throws error if match is not found.
   */
  async updateTeamMatchsData(data) {
    try {
      const { matchId, winningTeamId, isDraw } = data;
      const match = await Match.findOne({ _id: matchId });
      if (!match) throw CustomErrorHandler.notFound("Match Not Found");

      const tournament = await Tournament.findById(match.tournament).select("ballType");
      const balltype = tournament.ballType.name;

      const scoreBoard = match.scoreBoard;
      const team1Data = scoreBoard.get('team1');
      const team2Data = scoreBoard.get('team2');
      const firstInnings = scoreBoard.get('firstInnings');
      const secondInnings = scoreBoard.get('secondInnings');

      for (const player of team1Data.players || []) {
        await this.updatePlayerStats(player, balltype);
      }

      for (const player of team2Data.players || []) {
        await this.updatePlayerStats(player, balltype);
      }

      const totalBalls1 = (firstInnings?.overs || 0) * 6 + (firstInnings?.balls || 0);
      const totalBalls2 = (secondInnings?.overs || 0) * 6 + (secondInnings?.balls || 0);

      let winningteam1 = 0;
      let winningteam2 = 0;

      if (!isDraw) {
        winningteam1 = firstInnings?.battingTeam?._id?.toString() === winningTeamId.toString() ? 1 : 0;
        winningteam2 = secondInnings?.battingTeam?._id?.toString() === winningTeamId.toString() ? 1 : 0;
      }

      const teamStatsPath = balltype === 'leather' ? 'teamMatchsData.leather' : 'teamMatchsData.tennis';
      await Team.findByIdAndUpdate(firstInnings?.battingTeam?._id, {
        $inc: {
          [`${teamStatsPath}.runs`]: firstInnings?.totalScore || 0,
          [`${teamStatsPath}.wins`]: winningteam1,
          [`${teamStatsPath}.${balltype === 'leather' ? 'balls' : 'overs'}`]: totalBalls1,
          [`${teamStatsPath}.wickets`]: firstInnings?.totalWickets || 0,
          [`${teamStatsPath}.innings`]: 1,
        }
      });

      await Team.findByIdAndUpdate(secondInnings?.battingTeam?._id, {
        $inc: {
          [`${teamStatsPath}.runs`]: secondInnings?.totalScore || 0,
          [`${teamStatsPath}.wins`]: winningteam2,
          [`${teamStatsPath}.${balltype === 'leather' ? 'balls' : 'overs'}`]: totalBalls2,
          [`${teamStatsPath}.wickets`]: secondInnings?.totalWickets || 0,
          [`${teamStatsPath}.innings`]: 1,
        }
      });

      match.status = "played";
      match.winningTeamId = isDraw ? null : winningTeamId;
      match.isMatchDraw = isDraw ? true : false;
      match.isMatchEnded = true;
      await match.save();

      const tournamentTeams = await RegisteredTeam.find({
        tournament: tournament._id,
        status: "Accepted"
      }).populate('team user');

      const teamFcmTokens = tournamentTeams.map(t => t.user?.fcmToken).filter(Boolean);

      let notification;

      if (isDraw) {
        notification = {
          title: "Match Result",
          body: `The match between ${firstInnings?.battingTeam?.teamName || 'Team A'} and ${secondInnings?.battingTeam?.teamName || 'Team B'} ended in a draw.`
        };
      } else {
        const winnerTeam = await Team.findById(winningTeamId).select('teamName');

        const isWinnerFirstInnings = firstInnings?.battingTeam?._id?.toString() === winningTeamId.toString();
        const runDiff = (firstInnings?.totalScore || 0) - (secondInnings?.totalScore || 0);
        const wicketsRemaining = 10 - (secondInnings?.totalWickets || 0);
        const winType = runDiff === 0
          ? ''
          : isWinnerFirstInnings
            ? `by ${runDiff} runs`
            : `by ${wicketsRemaining} wicket${wicketsRemaining > 1 ? 's' : ''}`;

        const opponentTeam = isWinnerFirstInnings
          ? tournamentTeams.find(t => t.team._id.toString() === secondInnings?.battingTeam?._id?.toString())
          : tournamentTeams.find(t => t.team._id.toString() === firstInnings?.battingTeam?._id?.toString());

        const opponentTeamName = opponentTeam?.team?.teamName || "Opponent";

        notification = {
          title: "Hey Participants!",
          body: `${winnerTeam?.teamName} has won the match against ${opponentTeamName} ${winType}`
        };
      }

      // Send notification
      if (teamFcmTokens.length && notification) {
        try {
          await Promise.all(teamFcmTokens.map(token =>
            firebaseNotification.sendNotification(token, notification)
          ));
          console.log("Notifications sent!");
        } catch (error) {
          console.error("Notification error:", error);
        }
      }

      return true;
    } catch (error) {
      console.log(`Failed to Update Data: ${error}`);
    }
  },

  /**
   * @function updatePlayerStats
   * @description Updates individual player batting and bowling statistics for cricket matches. Increments
   * the player's career statistics including runs, balls, wickets, centuries, and half-centuries based on
   * their performance in the match.
   *
   * @param {Object} player - The player object containing match performance data.
   * @param {Object} player.batting - Batting statistics from the match.
   * @param {number} player.batting.runs - Runs scored in the match.
   * @param {number} player.batting.balls - Balls faced in the match.
   * @param {number} player.batting.fours - Number of fours hit.
   * @param {number} player.batting.sixes - Number of sixes hit.
   * @param {string} [player.batting.outType] - How the player was dismissed.
   * @param {Object} player.bowling - Bowling statistics from the match.
   * @param {number} player.bowling.runs - Runs conceded while bowling.
   * @param {number} player.bowling.wickets - Wickets taken.
   * @param {number} player.bowling.currentOver - Overs bowled.
   * @param {number} player.bowling.maidens - Maiden overs bowled.
   * @param {string} balltype - Type of ball used ('leather' or 'tennis').
   * @returns {Promise<void>} Updates player statistics in the database.
   */
  async updatePlayerStats(player, balltype) {
    if (!player?.batting || !player?.bowling) return;

    // Determine milestone achievements
    let isHalfCentury = player.batting.runs >= 50 && player.batting.runs < 100 ? 1 : 0;
    let isCentury = 0;
    if (player.batting.runs >= 100 && player.batting.runs < 200) isCentury = 1;
    else if (player.batting.runs < 300) isCentury = 2;
    else if (player.batting.runs < 400) isCentury = 3;
    else if (player.batting.runs < 500) isCentury = 4;

    const prefix = `battingStatistic.${balltype}`;
    const bowlPrefix = `bowlingStatistic.${balltype}`;
    await Player.findByIdAndUpdate(player._id, {
      $inc: {
        [`${prefix}.runs`]: player.batting.runs,
        [`${prefix}.balls`]: player.batting.balls,
        [`${prefix}.fours`]: player.batting.fours,
        [`${prefix}.sixes`]: player.batting.sixes,
        [`${prefix}.century`]: isCentury,
        [`${prefix}.halfCentury`]: isHalfCentury,
        [`${prefix}.out`]: player.batting.outType ? 1 : 0,
        [`${prefix}.innings`]: 1,

        [`${bowlPrefix}.runs`]: player.bowling.runs,
        [`${bowlPrefix}.wickets`]: player.bowling.wickets,
        [`${bowlPrefix}.Over`]: player.bowling.currentOver,
        [`${bowlPrefix}.maidens`]: player.bowling.maidens,
        [`${bowlPrefix}.fours`]: player.bowling.fours,
        [`${bowlPrefix}.sixes`]: player.bowling.sixes,
        [`${bowlPrefix}.wides`]: player.bowling.wides,
        [`${bowlPrefix}.noBalls`]: player.bowling.noBalls,
        [`${bowlPrefix}.innings`]: 1,
      }
    }, { new: true });
  },

  /**
   * @function updateFootballMatchData
   * @description Updates team and player statistics after a football match concludes. Processes all match events
   * including goals, assists, cards, fouls, and penalty shootouts. Updates individual player statistics and team
   * match records, then marks the match as played.
   *
   * @param {Object} data - Football match completion data.
   * @param {string} data.matchId - The ID of the match to update.
   * @param {string} [data.winningTeamId] - The ID of the winning team (null if draw).
   * @returns {Promise<Object>} Returns match result details including scores, winner, and number of players updated.
   * @throws {CustomErrorHandler} Throws error if match or scoreboard data is not found.
   */
  async updateFootballMatchData(data) {
    try {
      const { matchId, winningTeamId } = data;
      const match = await Match.findById(matchId).populate(["team1", "team2"])
      if (!match) throw CustomErrorHandler.notFound("Match not found or already played");

      const scoreBoard = match.scoreBoard
      if (!scoreBoard) throw CustomErrorHandler.badRequest("Match scoreboard data not found");
      const homeTeam = scoreBoard.get("homeTeam") || {}
      const awayTeam = scoreBoard.get("awayTeam") || {}
      const matchEvents = scoreBoard.get("matchEvents") || []
      const goals = scoreBoard.get("goals") || []
      const cards = scoreBoard.get("cards") || []
      const penaltyShootout = scoreBoard.get("penaltyShootout") || {}
      const isPenaltyShootout = scoreBoard.get("isPenaltyShootout") || false
      const isExtraTime = scoreBoard.get("isExtraTime") || false
      const extraTime = scoreBoard.get("extraTime") || false

      let homeScore = scoreBoard.get("homeScore") || 0
      let awayScore = scoreBoard.get("awayScore") || 0

      // Add extra time goals to the final score if extra time was played
      if (isExtraTime && extraTime) {
        // Check for total goals in extraTime object first, then fall back to calculating from halves
        let homeExtraGoals = extraTime.homeGoals ?? 0;
        let awayExtraGoals = extraTime.awayGoals ?? 0;

        // If not found at top level, calculate from first and second half
        if (homeExtraGoals === 0 && awayExtraGoals === 0) {
          homeExtraGoals = (extraTime.firstHalf?.homeGoals ?? 0) + (extraTime.secondHalf?.homeGoals ?? 0);
          awayExtraGoals = (extraTime.firstHalf?.awayGoals ?? 0) + (extraTime.secondHalf?.awayGoals ?? 0);
        }

        homeScore += homeExtraGoals;
        awayScore += awayExtraGoals;
      }

      const playerStats = new Map()
      const allPlayers = [...(homeTeam.players || []), ...(awayTeam.players || [])]

      allPlayers.forEach((player) => {
        if (player._id) {
          playerStats.set(player._id.toString(), {
            matchesPlayed: 1,
            goals: 0,
            saves: 0,
            assists: 0,
            penaltyGoals: 0,
            yellowCards: 0,
            redCards: 0,
            foulsCommitted: 0,
            foulsSuffered: 0,
          })
        }
      })

      goals.forEach((goal) => {
        const scorerId = goal.scorerId?._id?.toString()
        if (scorerId && playerStats.has(scorerId)) {
          playerStats.get(scorerId).goals += 1
        }

        const assistId = goal.assistId?._id?.toString()
        if (assistId && playerStats.has(assistId)) {
          playerStats.get(assistId).assists += 1
        }
      })

      cards.forEach((card) => {
        const playerId = card.playerId?._id?.toString()
        if (playerId && playerStats.has(playerId)) {
          if (card.cardType === "Yellow") {
            playerStats.get(playerId).yellowCards += 1
          } else if (card.cardType === "Red") {
            playerStats.get(playerId).redCards += 1
          }
        }
      })

      if (isPenaltyShootout && penaltyShootout.penalties) {
        penaltyShootout.penalties.forEach((penalty) => {
          const playerId = penalty.playerId?._id?.toString()
          if (playerId && playerStats.has(playerId)) {
            if (penalty.result === "scored" || penalty.isScored === true) {
              playerStats.get(playerId).penaltyGoals += 1
            }
          }
        })
      }

      matchEvents.forEach((event) => {
        const playerId = event.playerId?._id?.toString()
        if (!playerId || !playerStats.has(playerId)) return

        const stats = playerStats.get(playerId)

        switch (event.eventType) {
          case "foul":
            stats.foulsCommitted += 1
            if (event.description) {
              const foulPattern = /General Foul by .+ on (.+) -/
              const match = event.description.match(foulPattern)
              if (match) {
                const fouledPlayerName = match[1].trim()

                allPlayers.forEach((player) => {
                  if (player.name === fouledPlayerName && player._id) {
                    const fouledPlayerId = player._id.toString()
                    if (playerStats.has(fouledPlayerId)) {
                      playerStats.get(fouledPlayerId).foulsSuffered += 1
                    }
                  }
                })
              }
            }
            break

          case "yellow_card":
            stats.yellowCards += 1
            break

          case "red_card":
            stats.redCards += 1
            break
        }
      })

      const playerUpdatePromises = []
      for (const [playerId, stats] of playerStats.entries()) {
        const updatePromise = Player.findByIdAndUpdate(
          playerId,
          {
            $inc: {
              "footballStatistic.matchesPlayed": stats.matchesPlayed,
              "footballStatistic.goals": stats.goals,
              "footballStatistic.assists": stats.assists,
              "footballStatistic.penaltyGoals": stats.penaltyGoals,
              "footballStatistic.yellowCards": stats.yellowCards,
              "footballStatistic.redCards": stats.redCards,
              "footballStatistic.foulsCommitted": stats.foulsCommitted,
              "footballStatistic.foulsSuffered": stats.foulsSuffered,
            },
          },
          { new: true },
        )
        playerUpdatePromises.push(updatePromise)
      }

      await Promise.all(playerUpdatePromises)

      // Determine if match is a draw based on final scores (already includes extra time)
      // If there's a penalty shootout, only count as draw if penalty shootout scores are equal
      let isMatchDraw = false;

      if (isPenaltyShootout && penaltyShootout) {
        const homePenaltyScore = penaltyShootout.homeTeamScore ?? 0;
        const awayPenaltyScore = penaltyShootout.awayTeamScore ?? 0;
        isMatchDraw = homePenaltyScore === awayPenaltyScore;
      } else {
        // For regular time or extra time, check if final scores are equal
        isMatchDraw = homeScore === awayScore;
      }

      console.log(`The Home score:${homeScore} and away score:${awayScore}`);
      console.log(`WinningTeamId: ${winningTeamId}, isMatchDraw: ${isMatchDraw}`);
      const team1UpdateData = {
        $inc: {
          "teamMatchsData.football.goals": homeScore,
          "teamMatchsData.football.matchesPlayed": 1,
          "teamMatchsData.football.wins": winningTeamId && match.team1._id.equals(winningTeamId) ? 1 : 0,
          "teamMatchsData.football.draws": !winningTeamId ? 1 : 0,
          "teamMatchsData.football.losses": winningTeamId && !match.team1._id.equals(winningTeamId) ? 1 : 0,
        },
      }

      const team2UpdateData = {
        $inc: {
          "teamMatchsData.football.goals": awayScore,
          "teamMatchsData.football.matchesPlayed": 1,
          "teamMatchsData.football.wins": winningTeamId && match.team2._id.equals(winningTeamId) ? 1 : 0,
          "teamMatchsData.football.draws": !winningTeamId ? 1 : 0,
          "teamMatchsData.football.losses": winningTeamId && !match.team2._id.equals(winningTeamId) ? 1 : 0,
        },
      }

      await Promise.all([
        Team.findByIdAndUpdate(match.team1._id, team1UpdateData),
        Team.findByIdAndUpdate(match.team2._id, team2UpdateData),
      ])
      match.status = "played";
      match.isMatchDraw = winningTeamId ? false : true;
      match.winningTeamId = winningTeamId ?? null;
      match.isMatchEnded = true;
      await match.save();

      // Send notifications to all tournament participants
      const tournament = await Tournament.findById(match.tournament);
      if (tournament) {
        const tournamentTeams = await RegisteredTeam.find({
          tournament: tournament._id,
          status: "Accepted"
        }).populate('team user');

        const teamFcmTokens = tournamentTeams
          .map(t => t.user?.fcmToken)
          .filter(Boolean);

        let notification;

        if (!winningTeamId) {
          notification = {
            title: "Football Match Result",
            body: `The match between ${match.team1.teamName} and ${match.team2.teamName} ended in a draw (${homeScore}-${awayScore}).`
          };
        } else {
          const winnerTeam = await Team.findById(winningTeamId).select('teamName');
          const loserTeamName = match.team1._id.equals(winningTeamId)
            ? match.team2.teamName
            : match.team1.teamName;

          notification = {
            title: "Hey Participants!",
            body: `${winnerTeam?.teamName} has won the football match against ${loserTeamName} (${homeScore}-${awayScore})`
          };
        }

        if (teamFcmTokens.length > 0 && notification) {
          try {
            await Promise.all(
              teamFcmTokens.map(token =>
                firebaseNotification.sendNotification(token, notification)
              )
            );
            console.log("Football match result notifications sent successfully!");
          } catch (error) {
            console.error("Error sending football match notifications:", error);
          }
        }
      }

      return {
        success: true,
        matchId: match._id,
        finalScore: `${homeScore}-${awayScore}`,
        winner: !isMatchDraw ? winningTeamId : "Tie",
        playersUpdated: playerStats.size,
        isPenaltyShootout: isPenaltyShootout
      }
    } catch (error) {
      console.error("Error updating football match data:", error)
      throw error
    }
  },

  /**
   * @function teamRanking
   * @description Retrieves the top 20 cricket teams ranked by number of wins for a specific ball type.
   * Returns team details including logo, name, and win statistics sorted in descending order.
   *
   * @param {string} ballType - The type of ball to filter rankings ('leather' or 'tennis').
   * @returns {Promise<Array>} Array of top 20 ranked teams with their statistics and details.
   */
  async teamRanking(ballType) {
    let teamsRanking;

    teamsRanking = await Team.aggregate([
      {
        $project: {
          _id: 1,
          teamLogo: 1,
          teamName: 1,
          ballType: ballType,
          registeredAt: "$createdAt",
          numberOfWins: { $ifNull: [`$teamMatchsData.${ballType}.wins`, 0] },
        },
      },
      {
        $sort: {
          numberOfWins: -1, // Sort in descending order of numberOfWins
        },
      },
      {
        $limit: 20, // Limit the number of results to 20
      },
    ]);

    return teamsRanking;
  },

  /**
   * @function getFootballTeamRankings
   * @description Retrieves the top 20 football teams ranked by number of wins. Calculates comprehensive
   * team statistics including points, goal difference, win percentage, and goals per match. Returns teams
   * sorted by wins in descending order.
   *
   * @returns {Promise<Array>} Array of top 20 ranked football teams with calculated performance metrics.
   * @throws {Error} Throws error if database query fails.
   */
  async getFootballTeamRankings() {
    const limit = 20
    try {
      const teamRankings = await Team.aggregate([
        {
          $match: {
            teamfor: "football",
          },
        },
        {
          $project: {
            _id: 1,
            teamLogo: 1,
            teamName: 1,
            registeredAt: "$createdAt",
            matchesPlayed: { $ifNull: ["$teamMatchsData.football.matchesPlayed", 0] },
            numberOfWins: { $ifNull: ["$teamMatchsData.football.wins", 0] },
            draws: { $ifNull: ["$teamMatchsData.football.draws", 0] },
            losses: { $ifNull: ["$teamMatchsData.football.losses", 0] },
            goals: { $ifNull: ["$teamMatchsData.football.goals", 0] },
            goalsConceded: { $ifNull: ["$teamMatchsData.football.goalsConceded", 0] },
            cleanSheets: { $ifNull: ["$teamMatchsData.football.cleanSheets", 0] },
          },
        },
        {
          $addFields: {
            points: {
              $add: [{ $multiply: ["$wins", 3] }, { $multiply: ["$draws", 1] }],
            },
            goalDifference: { $subtract: ["$goals", "$goalsConceded"] },
            winPercentage: {
              $cond: {
                if: { $gt: ["$matchesPlayed", 0] },
                then: {
                  $round: [{ $multiply: [{ $divide: ["$wins", "$matchesPlayed"] }, 100] }, 2],
                },
                else: 0,
              },
            },
            goalsPerMatch: {
              $cond: {
                if: { $gt: ["$matchesPlayed", 0] },
                then: {
                  $round: [{ $divide: ["$goals", "$matchesPlayed"] }, 2],
                },
                else: 0,
              },
            },
          },
        },
        // {
        //   $sort: {
        //     wins: { wins: -1, },
        //   }
        // },
        {
          $sort: (() => {
            const sortOptions = {
              wins: { wins: -1, }
            };
            return sortOptions.wins;
          })(),
        },
        {
          $limit: limit,
        },
        {
          $addFields: {
            rank: { $add: [{ $indexOfArray: [{ $range: [0, limit] }, "$_id"] }, 1] },
          },
        },
      ])

      return teamRankings
    } catch (error) {
      throw new Error(`Error fetching team rankings: ${error.message}`)
    }
  },

  /**
   * @function playerRanking
   * @description Retrieves the top 10 cricket players ranked by batting or bowling performance for a specific
   * ball type. Fetches detailed statistics including runs, wickets, strike rate, economy, and player profile photos.
   * Performs a lookup join with user details to get profile information.
   *
   * @param {string} ballType - The type of ball to filter rankings ('leather' or 'tennis').
   * @param {string} skill - The skill category to rank by ('batting' or 'bowling').
   * @returns {Promise<Array>} Array of top 10 ranked players with their statistics and profile photos.
   */
  async playerRanking(ballType, skill) {
    try {
      const sortingField = skill === "batting" ? "runs" : "wickets";

      const playerRankingWithImage = await Player.aggregate([
        {
          $lookup: {
            from: "users",
            localField: "userId",
            foreignField: "_id",
            as: "userDetails",
          },
        },
        {
          $unwind: {
            path: "$userDetails",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $project: {
            playerName: {
              $cond: {
                if: { $ifNull: ["$userDetails.fullName", false] },
                then: "$userDetails.fullName",
                else: "$name", // fallback to player's own name
              },
            },
            profilePhoto: { $ifNull: ["$userDetails.profilePhoto", ""] },

            // Batting statistics
            runs: { $ifNull: [`$battingStatistic.${ballType}.runs`, 0] },
            fours: { $ifNull: [`$battingStatistic.${ballType}.fours`, 0] },
            sixes: { $ifNull: [`$battingStatistic.${ballType}.sixes`, 0] },
            balls: { $ifNull: [`$battingStatistic.${ballType}.balls`, 0] },

            // Strike Rate
            strikeRate: {
              $cond: {
                if: {
                  $and: [
                    { $ne: [`$battingStatistic.${ballType}.balls`, 0] },
                    { $ne: [`$battingStatistic.${ballType}.runs`, 0] },
                  ],
                },
                then: {
                  $round: [
                    {
                      $multiply: [
                        {
                          $divide: [
                            `$battingStatistic.${ballType}.runs`,
                            `$battingStatistic.${ballType}.balls`,
                          ],
                        },
                        100,
                      ],
                    },
                    2,
                  ],
                },
                else: 0,
              },
            },

            // Bowling statistics
            bowlingruns: { $ifNull: [`$bowlingStatistic.${ballType}.runs`, 0] },
            wickets: { $ifNull: [`$bowlingStatistic.${ballType}.wickets`, 0] },
            Over: { $ifNull: [`$bowlingStatistic.${ballType}.Over`, 0] },
            bowlingfours: { $ifNull: [`$bowlingStatistic.${ballType}.fours`, 0] },
            bowlingsixes: { $ifNull: [`$bowlingStatistic.${ballType}.sixes`, 0] },
            maidens: { $ifNull: [`$bowlingStatistic.${ballType}.maidens`, 0] },
            wides: { $ifNull: [`$bowlingStatistic.${ballType}.wides`, 0] },
            noBalls: { $ifNull: [`$bowlingStatistic.${ballType}.noBalls`, 0] },
            innings: { $ifNull: [`$bowlingStatistic.${ballType}.innings`, 0] },

            // Economy
            economy: {
              $cond: {
                if: {
                  $and: [
                    { $ne: [`$battingStatistic.${ballType}.balls`, 0] },
                    { $ne: [`$bowlingStatistic.${ballType}.runs`, 0] },
                  ],
                },
                then: {
                  $round: [
                    {
                      $multiply: [
                        {
                          $divide: [
                            `$bowlingStatistic.${ballType}.runs`,
                            `$battingStatistic.${ballType}.balls`,
                          ],
                        },
                        100,
                      ],
                    },
                    2,
                  ],
                },
                else: 0,
              },
            },
          },
        },
        {
          $sort: {
            [sortingField]: -1,
          },
        },
        {
          $limit: 10,
        },
      ]);

      return playerRankingWithImage;
    } catch (error) {
      console.log(` Failed to Get player Ranking: ${error}`);
    }
  },

  /**
   * @function footballplayerRanking
   * @description Retrieves the top 30 football players ranked by a specific performance category. Calculates
   * comprehensive statistics including goals, assists, saves, cards, fouls, and performance metrics like goals
   * per match and overall rating. Performs lookups with user and team collections to enrich player data.
   *
   * @param {Object} data - Ranking criteria.
   * @param {string} data.category - The category to rank by ('goals', 'assists', 'saves', 'matches_played', 'overall', 'fouls', 'penalty_goals', 'penalty_saves').
   * @returns {Promise<Array>} Array of top 30 ranked football players with statistics, rank, and team information.
   * @throws {Error} Throws error if database query fails.
   */
  async footballplayerRanking(data) {
    const { category } = data;
    const limit = 30;
    const position = null;

    try {
      const matchConditions = {
        footballStatistic: { $exists: true },
      }
      if (position) {
        matchConditions.role = position
      }

      const playerRankings = await Player.aggregate([
        {
          $match: matchConditions,
        },
        {
          $lookup: {
            from: "users",
            localField: "userId",
            foreignField: "_id",
            as: "userDetails",
          },
        },
        {
          $lookup: {
            from: "teams",
            localField: "team",
            foreignField: "_id",
            as: "teamDetails",
          },
        },
        {
          $unwind: {
            path: "$userDetails",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $unwind: {
            path: "$teamDetails",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $project: {
            playerName: { $ifNull: ["$userDetails.fullName", "$name"] },
            profilePhoto: { $ifNull: ["$userDetails.profilePhoto", ""] },
            teamName: { $ifNull: ["$teamDetails.teamName", ""] },
            role: "$role",
            goals: { $ifNull: ["$footballStatistic.goals", 0] },
            assists: { $ifNull: ["$footballStatistic.assists", 0] },
            saves: { $ifNull: ["$footballStatistic.saves", 0] },
            matchesPlayed: { $ifNull: ["$footballStatistic.matchesPlayed", 0] },
            minutesPlayed: { $ifNull: ["$footballStatistic.minutesPlayed", 0] },
            cleanSheets: { $ifNull: ["$footballStatistic.cleanSheets", 0] },
            penaltyGoals: { $ifNull: ["$footballStatistic.penaltyGoals", 0] },
            penaltySaves: { $ifNull: ["$footballStatistic.penaltySaves", 0] },
            yellowCards: { $ifNull: ["$footballStatistic.yellowCards", 0] },
            redCards: { $ifNull: ["$footballStatistic.redCards", 0] },
            foulsCommitted: { $ifNull: ["$footballStatistic.foulsCommitted", 0] },
            foulsSuffered: { $ifNull: ["$footballStatistic.foulsSuffered", 0] },
          },
        },
        {
          $addFields: {
            // Calculate performance metrics
            goalsPerMatch: {
              $cond: {
                if: { $gt: ["$matchesPlayed", 0] },
                then: { $round: [{ $divide: ["$goals", "$matchesPlayed"] }, 2] },
                else: 0,
              },
            },
            assistsPerMatch: {
              $cond: {
                if: { $gt: ["$matchesPlayed", 0] },
                then: { $round: [{ $divide: ["$assists", "$matchesPlayed"] }, 2] },
                else: 0,
              },
            },
            savesPerMatch: {
              $cond: {
                if: { $gt: ["$matchesPlayed", 0] },
                then: { $round: [{ $divide: ["$saves", "$matchesPlayed"] }, 2] },
                else: 0,
              },
            },
            foulsPerMatch: {
              $cond: {
                if: { $gt: ["$matchesPlayed", 0] },
                then: { $round: [{ $divide: ["$foulsCommitted", "$matchesPlayed"] }, 2] },
                else: 0,
              },
            },
            overallRating: {
              $round: [
                {
                  $add: [
                    { $multiply: ["$goals", 3] },
                    { $multiply: ["$assists", 2] },
                    { $multiply: ["$saves", 1] },
                    { $multiply: ["$cleanSheets", 2] },
                    { $multiply: ["$penaltyGoals", 1] },
                    { $multiply: ["$penaltySaves", 2] },
                  ],
                },
                2,
              ],
            },
          },
        },
        {
          $sort: (() => {
            const sortOptions = {
              goals: { goals: -1, assists: -1 },
              assists: { assists: -1, goals: -1 },
              saves: { saves: -1, cleanSheets: -1 },
              matches_played: { matchesPlayed: -1, goals: -1 },
              overall: { overallRating: -1, goals: -1 },
              fouls: { foulsCommitted: -1, yellowCards: -1 },
              penalty_goals: { penaltyGoals: -1, goals: -1 },
              penalty_saves: { penaltySaves: -1, saves: -1 },
            };
            return sortOptions[category] || sortOptions.goals;
          })(),
        },
        {
          $limit: limit,
        },
      ])

      // Add rank to each player
      playerRankings.forEach((player, index) => {
        player.rank = index + 1
      })

      return playerRankings
    } catch (error) {
      throw new Error(`Error fetching player rankings: ${error.message}`)
    }
  },

  /**
   * @function _getPlayerSortCriteria
   * @description Helper function that returns the appropriate sort criteria for football player rankings
   * based on the specified category. Each category has a primary and secondary sort field to break ties.
   *
   * @param {string} category - The ranking category ('goals', 'assists', 'saves', 'matches_played', 'overall').
   * @returns {Object} Sort criteria object with field names and sort order (-1 for descending).
   */
  async _getPlayerSortCriteria(category) {
    const sortOptions = {
      goals: { goals: -1, assists: -1 },
      assists: { assists: -1, goals: -1 },
      saves: { saves: -1, cleanSheets: -1 },
      matches_played: { matchesPlayed: -1, goals: -1 },
      overall: { overallRating: -1, goals: -1 },
    }

    return sortOptions[category] || sortOptions.goals
  },

  /**
   * @function topPerformers
   * @description Retrieves top cricket performers for a specific date and location. Uses geospatial queries to find
   * nearby tournaments, aggregates player performance data from match scoreboards, and ranks players by batting
   * performance. Returns top 100 players with their statistics and profile photos.
   *
   * @param {Object} data - Search criteria for top performers.
   * @param {number} data.latitude - Latitude coordinate for location-based search.
   * @param {number} data.longitude - Longitude coordinate for location-based search.
   * @param {string} data.startDate - The date to search for matches (YYYY-MM-DD format).
   * @param {string} [data.filter='tennis'] - The ball type filter ('leather' or 'tennis').
   * @returns {Promise<Array>} Array of top 100 players ranked by runs with batting and bowling statistics.
   * @throws {Error} Throws error if startDate is not provided.
   */
  async topPerformers(data) {
    const { latitude, longitude, startDate, filter } = data;

    const ballType = filter || "tennis";

    // Validate startDate
    if (!startDate) {
      throw new Error("Start date is required");
    }

    const startDateTime = new Date(`${startDate}T00:00:00.000Z`);
    const endDateTime = new Date(`${startDate}T23:59:59.999Z`);

    // Fetch tournament data
    const tournamentData = await Tournament.aggregate([
      {
        $geoNear: {
          near: {
            type: "Point",
            coordinates: [longitude, latitude],
          },
          distanceField: "distance",
          spherical: true,
          query: {
            isDeleted: false,
            "ballType.name": ballType,
            tournamentStartDateTime: { $lte: endDateTime },
            tournamentEndDateTime: { $gte: startDateTime },
          },
        },
      },
      {
        $lookup: {
          from: "matches",
          localField: "_id",
          foreignField: "tournament",
          as: "matches",
          pipeline: [
            { $match: { dateTime: { $gte: startDateTime, $lte: endDateTime } } },
            {
              $lookup: {
                from: "teams",
                localField: "team1",
                foreignField: "_id",
                as: "team1",
              },
            },
            {
              $lookup: {
                from: "teams",
                localField: "team2",
                foreignField: "_id",
                as: "team2",
              },
            },
            {
              $unwind: { path: "$team1", preserveNullAndEmptyArrays: true },
            },
            {
              $unwind: { path: "$team2", preserveNullAndEmptyArrays: true },
            },
            {
              $project: {
                dateTime: 1,
                scoreBoard: 1,
                team1: { players: 1 },
                team2: { players: 1 },
              },
            },
          ],
        },
      },
    ]);

    // // Flatten matches from tournament data
    // const matches = tournamentData.map((t) => t.matches).flat();

    // Flatten matches from tournament data
    const matches = tournamentData.flatMap((tournament) => tournament.matches);

    // Extract player performance from the scoreboards
    const allPlayersData = matches.flatMap((match) => {
      const team1Players = match?.scoreBoard?.team1?.players || [];
      const team2Players = match?.scoreBoard?.team2?.players || [];
      return [...team1Players, ...team2Players];
    });

    // Aggregate player performance by phone number
    const aggregatedPlayers = {};
    allPlayersData.forEach((player) => {
      const phoneNumber = player.phoneNumber;
      if (!aggregatedPlayers[phoneNumber]) {
        aggregatedPlayers[phoneNumber] = { ...player, batting: { ...player.batting }, bowling: { ...player.bowling } };
      } else {
        const existingPlayer = aggregatedPlayers[phoneNumber];
        existingPlayer.batting.runs += player.batting?.runs || 0;
        existingPlayer.batting.balls += player.batting?.balls || 0;
        existingPlayer.batting.fours += player.batting?.fours || 0;
        existingPlayer.batting.sixes += player.batting?.sixes || 0;

        existingPlayer.bowling.runs += player.bowling?.runs || 0;
        existingPlayer.bowling.wickets += player.bowling?.wickets || 0;
      }
    });

    // Convert aggregated players to an array
    const aggregatedPlayersArray = Object.values(aggregatedPlayers);

    // Sort players by runs (batting performance)
    aggregatedPlayersArray.sort((a, b) => (b.batting?.runs || 0) - (a.batting?.runs || 0));
    // Fetch top 10 players
    const top10Players = aggregatedPlayersArray.slice(0, 100);

    // Attach profile photos and ranks
    const playerIds = top10Players.map((player) => player._id);

    const playerProfiles = await Player.find({ _id: { $in: playerIds } })
      .populate({ path: "userId", select: "profilePhoto" })
      .select("_id userId");

    //const defaultPhoto = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAAAAAAAD";
    const profilePhotoMap = new Map(
      playerProfiles.map((player) => [
        player._id.toString(),
        player.userId?.profilePhoto || "",  // Default photo if missing
      ])
    );

    // const profilePhotoMap = new Map(playerProfiles.map((p) => [p._id.toString(), p.userId.profilePhoto || ""]));
    top10Players.forEach((player, index) => {
      player.profilePhoto = profilePhotoMap.get(player._id.toString()) || "";
      player.rank = index + 1;
    });

    return top10Players;
  },

  /**
   * @function getFootballTopPerformers
   * @description Retrieves top football performers for a specific date and location within a 15km radius.
   * Uses geospatial queries to find nearby football tournaments, aggregates player statistics from match
   * scoreboards including goals, assists, saves, cards, and fouls. Filters and ranks players based on the
   * specified criteria (goals or saves).
   *
   * @param {Object} data - Search criteria for top performers.
   * @param {number} data.latitude - Latitude coordinate for location-based search.
   * @param {number} data.longitude - Longitude coordinate for location-based search.
   * @param {string} data.startDate - The date to search for matches (YYYY-MM-DD format).
   * @param {string} [data.filter='goals'] - The filter type ('goals' or 'saves').
   * @returns {Promise<Array>} Array of top 100 players with aggregated football statistics and profile photos.
   */
  async getFootballTopPerformers(data) {
    try {
      const { latitude, longitude, startDate, filter } = data;

      const startDateTime = new Date(`${startDate}T00:00:00.000Z`);
      const endDateTime = new Date(`${startDate}T23:59:59.999Z`);

      // Maximum distance in meters (15 km)
      const maxDistance = 15000;

      // Determine filter type (default to "goals")
      const filterType = filter || "goals"; // Options: "goals", "saves"

      // Fetch tournament data for football within 15km radius
      const tournamentData = await Tournament.aggregate([
        {
          $geoNear: {
            near: {
              type: "Point",
              coordinates: [parseFloat(longitude), parseFloat(latitude)],
            },
            distanceField: "distance",
            maxDistance: maxDistance,
            spherical: true,
            query: {
              isDeleted: false,
              tournamentfor: "football",
              tournamentStartDateTime: { $lte: endDateTime },
              tournamentEndDateTime: { $gte: startDateTime },
            },
          },
        },
        {
          $lookup: {
            from: "matches",
            localField: "_id",
            foreignField: "tournament",
            as: "matches",
            pipeline: [
              {
                $match: {
                  dateTime: { $gte: startDateTime, $lte: endDateTime },
                  status: "played",
                  scoreBoard: { $ne: null },
                },
              },
              {
                $project: {
                  dateTime: 1,
                  scoreBoard: 1,
                  tournament: 1,
                },
              },
            ],
          },
        },
        {
          $match: {
            matches: { $ne: [] }, // Only include tournaments with matches
          },
        },
      ]);

      // Flatten matches from tournament data
      const matches = tournamentData.flatMap((tournament) => tournament.matches);

      if (matches.length === 0) {
        return [];
      }

      // Extract player performance from the scoreboards
      const allPlayersData = matches.flatMap((match) => {
        const homeTeamPlayers = match?.scoreBoard?.homeTeam?.players || [];
        const awayTeamPlayers = match?.scoreBoard?.awayTeam?.players || [];

        // Also check for team1/team2 format
        const team1Players = match?.scoreBoard?.team1?.players || [];
        const team2Players = match?.scoreBoard?.team2?.players || [];

        return [
          ...homeTeamPlayers,
          ...awayTeamPlayers,
          ...team1Players,
          ...team2Players,
        ];
      });

      // Aggregate player performance by phone number
      const aggregatedPlayers = {};

      allPlayersData.forEach((player) => {
        const phoneNumber = player.phoneNumber;
        if (!phoneNumber) return; // Skip if no phone number

        if (!aggregatedPlayers[phoneNumber]) {
          aggregatedPlayers[phoneNumber] = {
            _id: player._id,
            name: player.name,
            phoneNumber: player.phoneNumber,
            role: player.role,
            footballStatistic: {
              goals: 0,
              assists: 0,
              saves: 0,
              yellowCards: 0,
              redCards: 0,
              foulsCommitted: 0,
              foulsSuffered: 0,
              penaltySaves: 0,
              penaltyGoals: 0,
              matchesPlayed: 0,
            },
          };
        }

        const stats = player.footballStatistic || {};
        const existingPlayer = aggregatedPlayers[phoneNumber];

        // Aggregate statistics
        existingPlayer.footballStatistic.goals += stats.goals || 0;
        existingPlayer.footballStatistic.assists += stats.assists || 0;
        existingPlayer.footballStatistic.saves += stats.saves || 0;
        existingPlayer.footballStatistic.yellowCards += stats.yellowCards || 0;
        existingPlayer.footballStatistic.redCards += stats.redCards || 0;
        existingPlayer.footballStatistic.foulsCommitted += stats.foulsCommitted || 0;
        existingPlayer.footballStatistic.foulsSuffered += stats.foulsSuffered || 0;
        existingPlayer.footballStatistic.penaltySaves += stats.penaltySaves || 0;
        existingPlayer.footballStatistic.penaltyGoals += stats.penaltyGoals || 0;
      });

      // Also aggregate from match goals and events
      matches.forEach((match) => {
        const goals = match?.scoreBoard?.goals || [];
        const matchEvents = match?.scoreBoard?.matchEvents || [];
        const cards = match?.scoreBoard?.cards || [];

        // Track unique players per match for matchesPlayed count
        const playersInMatch = new Set();

        // Process goals
        goals.forEach((goal) => {
          const scorerPhone = goal.scorerId?.phoneNumber;
          const assistPhone = goal.assistId?.phoneNumber;

          if (scorerPhone && aggregatedPlayers[scorerPhone]) {
            aggregatedPlayers[scorerPhone].footballStatistic.goals++;
            playersInMatch.add(scorerPhone);

            // Check for penalty goals
            if (goal.goalType === "Penalty" || goal.goalType === "Penalty Goal") {
              aggregatedPlayers[scorerPhone].footballStatistic.penaltyGoals++;
            }
          }

          if (assistPhone && aggregatedPlayers[assistPhone]) {
            aggregatedPlayers[assistPhone].footballStatistic.assists++;
            playersInMatch.add(assistPhone);
          }
        });

        // Process cards
        cards.forEach((card) => {
          const playerPhone = card.playerId?.phoneNumber;
          if (playerPhone && aggregatedPlayers[playerPhone]) {
            playersInMatch.add(playerPhone);
            if (card.cardType === "Yellow") {
              aggregatedPlayers[playerPhone].footballStatistic.yellowCards++;
            } else if (card.cardType === "Red") {
              aggregatedPlayers[playerPhone].footballStatistic.redCards++;
            }
          }
        });

        // Process match events
        matchEvents.forEach((event) => {
          const playerPhone = event.playerId?.phoneNumber;
          if (playerPhone && aggregatedPlayers[playerPhone]) {
            playersInMatch.add(playerPhone);

            // Count saves
            if (event.eventType === "goal_save") {
              aggregatedPlayers[playerPhone].footballStatistic.saves++;

              // Check for penalty saves
              if (
                event.additionalData?.saveType === "penalty_save" ||
                event.description?.toLowerCase().includes("penalty")
              ) {
                aggregatedPlayers[playerPhone].footballStatistic.penaltySaves++;
              }
            }

            // Count fouls
            if (event.eventType === "foul") {
              aggregatedPlayers[playerPhone].footballStatistic.foulsCommitted++;
            }
          }

          // Count fouls suffered (victim)
          const victimPhone = event.additionalData?.victimPlayer?.phoneNumber;
          if (victimPhone && aggregatedPlayers[victimPhone]) {
            playersInMatch.add(victimPhone);
            if (event.eventType === "foul") {
              aggregatedPlayers[victimPhone].footballStatistic.foulsSuffered++;
            }
          }
        });

        // Increment matches played for all players in this match
        playersInMatch.forEach((phone) => {
          if (aggregatedPlayers[phone]) {
            aggregatedPlayers[phone].footballStatistic.matchesPlayed++;
          }
        });
      });

      // Convert aggregated players to an array
      let aggregatedPlayersArray = Object.values(aggregatedPlayers);

      // Filter based on the filter type
      if (filterType === "goals") {
        // Filter players with at least 1 goal
        aggregatedPlayersArray = aggregatedPlayersArray.filter(
          (player) => player.footballStatistic.goals > 0
        );

        // Sort by goals (descending), then assists (descending)
        aggregatedPlayersArray.sort((a, b) => {
          const goalsDiff = b.footballStatistic.goals - a.footballStatistic.goals;
          if (goalsDiff !== 0) return goalsDiff;

          // If goals are equal, sort by assists
          return b.footballStatistic.assists - a.footballStatistic.assists;
        });
      } else if (filterType === "saves") {
        // Filter players with at least 1 save
        aggregatedPlayersArray = aggregatedPlayersArray.filter(
          (player) => player.footballStatistic.saves > 0
        );

        // Sort by saves (descending), then penalty saves (descending)
        aggregatedPlayersArray.sort((a, b) => {
          const savesDiff = b.footballStatistic.saves - a.footballStatistic.saves;
          if (savesDiff !== 0) return savesDiff;

          // If saves are equal, sort by penalty saves
          return b.footballStatistic.penaltySaves - a.footballStatistic.penaltySaves;
        });
      } else {
        // Default: filter players with any performance
        aggregatedPlayersArray = aggregatedPlayersArray.filter(
          (player) =>
            player.footballStatistic.goals > 0 ||
            player.footballStatistic.assists > 0 ||
            player.footballStatistic.saves > 0
        );

        // Default sort by goals
        aggregatedPlayersArray.sort((a, b) => {
          const goalsDiff = b.footballStatistic.goals - a.footballStatistic.goals;
          if (goalsDiff !== 0) return goalsDiff;
          return b.footballStatistic.saves - a.footballStatistic.saves;
        });
      }

      // Get top 10 players
      const top10Players = aggregatedPlayersArray.slice(0, 10);

      // Fetch player profiles for profile photos
      const playerIds = top10Players
        .map((player) => player._id)
        .filter((id) => id); // Filter out any undefined IDs

      let profilePhotoMap = new Map();

      if (playerIds.length > 0) {
        const playerProfiles = await Player.find({ _id: { $in: playerIds } })
          .populate({ path: "userId", select: "profilePhoto" })
          .select("_id userId");

        profilePhotoMap = new Map(
          playerProfiles.map((player) => [
            player._id.toString(),
            player.userId?.profilePhoto || "",
          ])
        );
      }

      // Attach profile photos and ranks
      top10Players.forEach((player, index) => {
        player.profilePhoto = player._id
          ? profilePhotoMap.get(player._id.toString()) || ""
          : "";
        player.rank = index + 1;

        // Add performance score based on filter type
        if (filterType === "goals") {
          player.performanceScore =
            player.footballStatistic.goals * 10 +
            player.footballStatistic.assists * 5;
          player.primaryStat = player.footballStatistic.goals;
          player.secondaryStat = player.footballStatistic.assists;
          player.statType = "Goals Scored";
        } else if (filterType === "saves") {
          player.performanceScore =
            player.footballStatistic.saves * 10 +
            player.footballStatistic.penaltySaves * 15;
          player.primaryStat = player.footballStatistic.saves;
          player.secondaryStat = player.footballStatistic.penaltySaves;
          player.statType = "Saves Made";
        } else {
          player.performanceScore =
            player.footballStatistic.goals * 10 +
            player.footballStatistic.assists * 5 +
            player.footballStatistic.saves * 3;
          player.primaryStat = player.footballStatistic.goals;
          player.secondaryStat = player.footballStatistic.saves;
          player.statType = "Overall Performance";
        }
      });
      return top10Players;
    } catch (error) {
      console.error("Error in getFootballTopPerformers:", error);
      throw new Error(`Error fetching top performers: ${error.message}`);
    }
  },
  //original code by nikhil
  // async topPerformers(data) {
  //   let { latitude, longitude, startDate, filter } = data;

  //   let ballType = filter || "tennis";

  //   if (!startDate) {
  //     startDate = new Date();
  //     startDate = startDate.toISOString().split("T")[0];
  //   }

  //   let startDateTime = new Date(`${startDate}T00:00:00.000Z`);
  //   let endDateTime = new Date(`${startDate}T23:59:59.999Z`);

  //   let tournament_data = await Tournament.aggregate([
  //     {
  //       $geoNear: {
  //         near: {
  //           type: "Point",
  //           coordinates: [longitude, latitude],
  //         },
  //         distanceField: "distance",
  //         spherical: true,
  //         // maxDistance: parseFloat(10) * 10000, // Convert kilometers to meters 10km * 1000m
  //         query: {
  //           isDeleted: false,
  //           $or: [
  //             {
  //               tournamentStartDateTime: {
  //                 $lte: startDateTime,
  //               },
  //               tournamentEndDateTime: {
  //                 $gte: endDateTime,
  //               },
  //             },
  //           ],
  //         },
  //         // key: "locationHistory.currentLocation.coordinates",
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
  //         distanceInKm: { $lt: 10 }, // Adjust as needed 3000 meaks 3km
  //       },
  //     },
  //     {
  //       $match: {
  //         "ballType.name": ballType,
  //       },
  //     },
  //     {
  //       $lookup: {
  //         from: "matches",
  //         foreignField: "tournament",
  //         localField: "_id",
  //         as: "matches",
  //         pipeline: [
  //           {
  //             $match: {
  //               dateTime: {
  //                 $gte: startDateTime,
  //                 $lt: endDateTime,
  //               },
  //             },
  //           },
  //           {
  //             $lookup: {
  //               from: "teams",
  //               foreignField: "_id",
  //               localField: "team1",
  //               as: "team1",
  //             },
  //           },
  //           {
  //             $lookup: {
  //               from: "tournaments",
  //               foreignField: "_id",
  //               localField: "tournament",
  //               as: "tournament",
  //             },
  //           },
  //           {
  //             $lookup: {
  //               from: "teams",
  //               foreignField: "_id",
  //               localField: "team2",
  //               as: "team2",
  //             },
  //           },
  //           {
  //             $addFields: {
  //               "team1.players": [],
  //               "team2.players": [],
  //             },
  //           },
  //           {
  //             $unwind: {
  //               path: "$team1",
  //               preserveNullAndEmptyArrays: true,
  //             },
  //           },
  //           {
  //             $unwind: {
  //               path: "$team2",
  //               preserveNullAndEmptyArrays: true,
  //             },
  //           },
  //           {
  //             $unwind: {
  //               path: "$tournament",
  //               preserveNullAndEmptyArrays: true,
  //             },
  //           },
  //           {
  //             $addFields: {
  //               tournamentName: "$tournament.tournamentName",
  //               tournamentId: "$tournament._id",
  //             },
  //           },
  //           {
  //             $project: {
  //               tournament: 0,
  //             },
  //           },
  //         ],
  //       },
  //     },
  //     {
  //       $lookup: {
  //         from: "users",
  //         foreignField: "_id",
  //         localField: "user",
  //         as: "user",
  //         pipeline: [
  //           {
  //             $project: {
  //               _id: 1,
  //               fullName: 1,
  //               phoneNumber: 1,
  //             },
  //           },
  //         ],
  //       },
  //     },
  //     {
  //       $unwind: {
  //         path: "$user",
  //         preserveNullAndEmptyArrays: true,
  //       },
  //     },

  //     {
  //       $addFields: {
  //         organizerName: "$user.fullName",
  //         phoneNumber: "$user.phoneNumber",
  //       },
  //     },
  //     {
  //       $sort: {
  //         tournamentStartDateTime: 1, // Sort by fieldName1 in ascending order
  //         // fieldName2: -1 // Sort by fieldName2 in descending order
  //       },
  //     },
  //     // {
  //     //   $project: {
  //     //     distance: 0,
  //     //   },
  //     // },
  //   ]);
  //   // console.log("tournament_data", tournament_data);

  //   const matches = tournament_data
  //     .map((tournament) => tournament.matches)
  //     .flat(1);

  //   if (!matches) {
  //     throw CustomErrorHandler.notFound("Match not Found.");
  //   }

  //   let selectedFields = [
  //     "_id",
  //     "name",
  //     "phoneNumber",
  //     "role",
  //     "batting",
  //     "bowling",
  //   ];

  //   // Fields to include from batting and bowling objects
  //   let selectedBattingFields = ["runs", "balls", "fours", "sixes"];
  //   let selectedBowlingFields = ["runs", "wickets"];

  //   let team1dataPlayer = matches
  //     .map((match) =>
  //       match?.scoreBoard?.team1?.players.map((player) => {
  //         let selectedPlayerData = {};
  //         selectedFields.forEach((field) => {
  //           if (field === "batting") {
  //             selectedPlayerData[field] = {};
  //             selectedBattingFields.forEach((battingField) => {
  //               selectedPlayerData[field][battingField] =
  //                 player.batting[battingField];
  //             });
  //           } else if (field === "bowling") {
  //             selectedPlayerData[field] = {};
  //             selectedBowlingFields.forEach((bowlingField) => {
  //               selectedPlayerData[field][bowlingField] =
  //                 player.bowling[bowlingField];
  //             });
  //           } else {
  //             selectedPlayerData[field] = player[field];
  //           }
  //         });
  //         return selectedPlayerData;
  //       })
  //     )
  //     .flat(1);

  //   let team2dataPlayer = matches
  //     .map((match) =>
  //       match?.scoreBoard?.team2?.players.map((player) => {
  //         let selectedPlayerData = {};
  //         selectedFields.forEach((field) => {
  //           if (field === "batting") {
  //             selectedPlayerData[field] = {};
  //             selectedBattingFields.forEach((battingField) => {
  //               selectedPlayerData[field][battingField] =
  //                 player.batting[battingField];
  //             });
  //           } else if (field === "bowling") {
  //             selectedPlayerData[field] = {};
  //             selectedBowlingFields.forEach((bowlingField) => {
  //               selectedPlayerData[field][bowlingField] =
  //                 player.bowling[bowlingField];
  //             });
  //           } else {
  //             selectedPlayerData[field] = player[field];
  //           }
  //         });
  //         return selectedPlayerData;
  //       })
  //     )
  //     .flat(1);

  //   // Concatenate the two arrays into a single array
  //   let allPlayersData = team1dataPlayer.concat(team2dataPlayer);

  //   // Group players by phone number and calculate sum parameters
  //   let groupedPlayers = {};
  //   allPlayersData.forEach((player) => {
  //     if (!groupedPlayers[player?.phoneNumber]) {
  //       groupedPlayers[player?.phoneNumber] = {
  //         ...player,
  //         batting: { ...player?.batting },
  //         bowling: { ...player?.bowling },
  //       };
  //     } else {
  //       groupedPlayers[player?.phoneNumber].batting.runs +=
  //         player?.batting?.runs || 0;
  //       groupedPlayers[player?.phoneNumber].batting.balls +=
  //         player?.batting?.balls || 0;
  //       groupedPlayers[player?.phoneNumber].batting.fours +=
  //         player?.batting?.fours || 0;
  //       groupedPlayers[player?.phoneNumber].batting.sixes +=
  //         player?.batting?.sixes || 0;

  //       groupedPlayers[player?.phoneNumber].bowling.runs +=
  //         player?.bowling?.runs || 0;
  //       groupedPlayers[player?.phoneNumber].bowling.wickets +=
  //         player?.bowling?.wickets || 0;
  //     }
  //   });

  //   // Convert grouped players object back to an array
  //   let aggregatedPlayersData = Object.values(groupedPlayers);

  //   // Sort players by batting runs (descending order)
  //   aggregatedPlayersData.sort(
  //     (a, b) => (b.batting.runs || 0) - (a.batting.runs || 0)
  //   );

  //   // Get the top 10 players
  //   let top10BattingPlayers = aggregatedPlayersData.slice(0, 10);

  //   // Extracting player id from the all players from the player module.
  //   const playerIds = top10BattingPlayers.map((player) => player._id);

  //   // Fetch user profiles corresponding to the userIds
  //   const playersWithUserProfile = await Player.find({
  //     _id: { $in: playerIds },
  //   })
  //     .populate({
  //       path: "userId",
  //       select: "profilePhoto", // Specify the fields you want to select from the user model
  //     })
  //     .select("userId");

  //   const profilePhotos = playersWithUserProfile.map(
  //     (profile) => profile.userId.profilePhoto || ""
  //   );

  //   // Iterate over top 10 batting players and add profile photo
  //   top10BattingPlayers.forEach((player, index) => {
  //     player.profilePhoto = profilePhotos[index] || ""; // Assign profile photo from profilePhotos array
  //     player.rank = index + 1;
  //     player.playerName = player.name || "";
  //   });

  //   return top10BattingPlayers;
  // },

  //Nikhil
  //   async myPerformance(matchType, category) {
  //     const userInfo = global.user;
  //     const userId = userInfo.userId;

  //     let playerPerformances = await Player.find({ userId });

  //     if (!playerPerformances || playerPerformances.length === 0) {

  //       throw CustomErrorHandler.notFound("Player Performances Not Found");
  //     }

  //     const aggregatePlayerPerformances = (playerPerformances) => {
  //       let aggregatedData = {
  //         batting: {
  //           Runs:  { tennis: 0, leather: 0 },
  //           Balls: { tennis: 0, leather: 0 },
  //           Fours: { tennis: 0, leather: 0 },
  //           Sixes: { tennis: 0, leather: 0 },
  //           "Strike Rate": { tennis: 0, leather: 0 },
  //           "Half Century": { tennis: 0, leather: 0 },
  //           Century: { tennis: 0, leather: 0 },
  //         },
  //         bowling: {
  //           Overs: { tennis: 0, leather: 0 },
  //           Runs: { tennis: 0, leather: 0 },
  //           Wickets: { tennis: 0, leather: 0 },
  //           Economy: { tennis: 0, leather: 0 },
  //           Maidens: { tennis: 0, leather: 0 },
  //         },
  //       };

  //       playerPerformances.forEach((player) => {
  //         // Aggregate batting statistics
  //         aggregatedData.batting.Runs.tennis +=
  //           player.battingStatistic?.tennis?.runs || 0;
  //         aggregatedData.batting.Runs.leather +=
  //           player.battingStatistic?.leather?.runs || 0;
  //         aggregatedData.batting.Balls.tennis +=
  //           player.battingStatistic?.tennis?.balls || 0;
  //         aggregatedData.batting.Balls.leather +=
  //           player.battingStatistic?.leather?.balls || 0;
  //         aggregatedData.batting.Fours.tennis +=
  //           player.battingStatistic?.tennis?.fours || 0;
  //         aggregatedData.batting.Fours.leather +=
  //           player.battingStatistic?.leather?.fours || 0;
  //         aggregatedData.batting.Sixes.tennis +=
  //           player.battingStatistic?.tennis?.sixes || 0;
  //         aggregatedData.batting.Sixes.leather +=
  //           player.battingStatistic?.leather?.sixes || 0;
  //         aggregatedData.batting["Strike Rate"].tennis +=
  //           parseInt(
  //             ((player.battingStatistic?.tennis?.runs || 0) /
  //               (player.battingStatistic?.tennis?.balls || 1)) *
  //               100
  //           ) || 0;
  //         aggregatedData.batting["Strike Rate"].leather +=
  //           parseInt(
  //             ((player.battingStatistic?.leather?.runs || 0) /
  //               (player.battingStatistic?.leather?.balls || 1)) *
  //               100
  //           ) || 0;
  //         aggregatedData.batting["Half Century"].tennis +=
  //           player.battingStatistic?.tennis?.halfCentury || 0;
  //         aggregatedData.batting["Half Century"].leather +=
  //           player.battingStatistic?.leather?.halfCentury || 0;
  //         aggregatedData.batting.Century.tennis +=
  //           player.battingStatistic?.tennis?.century || 0;
  //         aggregatedData.batting.Century.leather +=
  //           player.battingStatistic?.leather?.century || 0;

  //         // Aggregate bowling statistics
  //         aggregatedData.bowling.Overs.tennis +=
  //           player.bowlingStatistic?.tennis?.Over || 0;
  //         aggregatedData.bowling.Overs.leather +=
  //           player.bowlingStatistic?.leather?.Over || 0;
  //         aggregatedData.bowling.Runs.tennis +=
  //           player.bowlingStatistic?.tennis?.runs || 0;
  //         aggregatedData.bowling.Runs.leather +=
  //           player.bowlingStatistic?.leather?.runs || 0;
  //         aggregatedData.bowling.Wickets.tennis +=
  //           player.bowlingStatistic?.tennis?.wickets || 0;
  //         aggregatedData.bowling.Wickets.leather +=
  //           player.bowlingStatistic?.leather?.wickets || 0;
  //         aggregatedData.bowling.Economy.tennis +=
  //           parseInt(
  //             ((player.bowlingStatistic?.tennis?.runs || 0) /
  //               (player.bowlingStatistic?.tennis?.Over || 1)) *
  //               6
  //           ) || 0;
  //         aggregatedData.bowling.Economy.leather +=
  //           parseInt(
  //             ((player.bowlingStatistic?.leather?.runs || 0) /
  //               (player.bowlingStatistic?.leather?.Over || 1)) *
  //               6
  //           ) || 0;
  //         aggregatedData.bowling.Maidens.tennis +=
  //           player.bowlingStatistic?.tennis?.maidens || 0;
  //         aggregatedData.bowling.Maidens.leather +=
  //           player.bowlingStatistic?.leather?.maidens || 0;
  //       });

  //       return aggregatedData;
  //     };
  //   const aggregatedData = aggregatePlayerPerformances(playerPerformances);

  //   // return aggregatedData[matchType];
  //   return aggregatedData; //DG

  // },



  //DG 

  // async myPerformance(userId, category) {

  //   if (!userId) {
  //     throw CustomErrorHandler.badRequest("User ID is required");
  //   }

  //   const playerPerformances = await Player.find({ userId }).lean(); 

  //   if (!playerPerformances || playerPerformances.length === 0) {
  //     throw CustomErrorHandler.notFound("Player Performances Not Found");
  //   }

  // const aggregatedData = {
  //   batting: {
  //     Runs: { tennis: 0, leather: 0 },
  //     Balls: { tennis: 0, leather: 0 },
  //     Fours: { tennis: 0, leather: 0 },
  //     Sixes: { tennis: 0, leather: 0 },
  //     "Strike Rate": { tennis: 0, leather: 0 },
  //     "Half Century": { tennis: 0, leather: 0 },
  //     Century: { tennis: 0, leather: 0 },
  //   },
  //   bowling: {
  //     Overs: { tennis: 0, leather: 0 },
  //     Runs: { tennis: 0, leather: 0 },
  //     Wickets: { tennis: 0, leather: 0 },
  //     Economy: { tennis: 0, leather: 0 },
  //     Maidens: { tennis: 0, leather: 0 },
  //   },
  // };

  // // Aggregate stats across all performances
  // playerPerformances.forEach((performance) => {
  //   if (category === "batting" && performance.battingStatistic) {
  //     Object.keys(performance.battingStatistic).forEach((ballType) => {
  //       const stats = performance.battingStatistic[ballType] || {};
  //       aggregatedData.batting.Runs[ballType] += stats.runs || 0;
  //       aggregatedData.batting.Balls[ballType] += stats.balls || 0;
  //       aggregatedData.batting.Fours[ballType] += stats.fours || 0;
  //       aggregatedData.batting.Sixes[ballType] += stats.sixes || 0;
  //       aggregatedData.batting["Half Century"][ballType] += stats.halfCentury || 0;
  //       aggregatedData.batting.Century[ballType] += stats.century || 0;
  //     });
  //   } else if (category === "bowling" && performance.bowlingStatistic) {
  //     Object.keys(performance.bowlingStatistic).forEach((ballType) => {
  //       const stats = performance.bowlingStatistic[ballType] || {};
  //       // const oversDecimal = convertOversToDecimal(stats.overs);
  //       aggregatedData.bowling.Overs[ballType] += stats.Over || 0;
  //       // aggregatedData.bowling.Overs[ballType] += oversDecimal || 0;
  //       aggregatedData.bowling.Runs[ballType] += stats.runs || 0;
  //       aggregatedData.bowling.Wickets[ballType] += stats.wickets || 0;
  //       aggregatedData.bowling.Maidens[ballType] += stats.maidens || 0;
  //     });
  //   }
  // });

  //   if (category === "batting") {
  //     Object.keys(aggregatedData.batting.Runs).forEach((ballType) => {
  //       aggregatedData.batting["Strike Rate"][ballType] = parseFloat(
  //         ((aggregatedData.batting.Runs[ballType] || 0) /
  //           (aggregatedData.batting.Balls[ballType] || 1)) *
  //           100
  //       ).toFixed(2);
  //     });
  //   }

  // if (category === "bowling") {
  //   Object.keys(aggregatedData.bowling.Runs).forEach((ballType) => {
  //     const totalOvers = aggregatedData.bowling.Overs[ballType];
  //     aggregatedData.bowling.Economy[ballType] =
  //       totalOvers > 0
  //         ? parseFloat(aggregatedData.bowling.Runs[ballType] / totalOvers).toFixed(2)
  //         : "0.00";
  //   });
  // }
  //   // Return the aggregated data
  //   return aggregatedData;
  // },

  /**
   * @function myPerformance
   * @description Retrieves comprehensive cricket performance data for a specific user. Fetches all tournaments
   * where the user participated (as organizer or player), aggregates match-by-match statistics including batting
   * and bowling performance, and returns detailed match summaries grouped by tournament along with overall
   * career statistics and recent performance data.
   *
   * @param {string} userId - The ID of the user whose performance to retrieve.
   * @param {string} category - The performance category (currently unused but available for future filtering).
   * @returns {Promise<Object>} Performance data including match summaries by tournament, aggregated statistics, and latest matches.
   * @throws {CustomErrorHandler} Throws error if user ID is missing or user not found.
   */
  async myPerformance(userId, category) {
    if (!userId) {
      throw CustomErrorHandler.badRequest("User ID is required");
    }

    const user = await User.findById(userId).select("phoneNumber").lean();
    if (!user) {
      throw CustomErrorHandler.notFound("User not found.");
    }
    const userPhoneNumber = user.phoneNumber;

    // Fetch tournaments associated with the user
    const userTournaments = await Tournament.find({
      $or: [
        { user: userId }, // If the user created the tournament
        { organizer: userId }, // If the user is an organizer
        { coHostId1: userId }, // If the user is a co-host
        { coHostId2: userId }  // If the user is a second co-host
      ],
      isDeleted: false,
    }).select("_id").lean();

    const userPlayedTournament = await Tournament.find({
      $or: [
        { user: userId },
        { organizer: userId },
        { coHostId1: userId },
        { coHostId2: userId }
      ],
      isDeleted: false,
    }, {
      locationHistory: 0,
      matches: 0,
      payments: 0,

    });
    const tournamentIds = userTournaments.map((tournament) => tournament._id);
    const matches = await Match.find({
      tournament: { $in: tournamentIds },
      status: "played",
      scoreBoard: { $ne: null },
      $or: [
        { "scoreBoard.team1.players.phoneNumber": userPhoneNumber },
        { "scoreBoard.team2.players.phoneNumber": userPhoneNumber },
      ],
    })
    // .populate("tournament", "tournamentName tournamentStartDateTime tournamentEndDateTime ballType")
    // .populate("team1", "teamName teamLogo")
    // .populate("team2", "teamName teamLogo")
    // .lean();

    const playedTournamentIds = new Set(matches.map((match) => match.tournament._id.toString()));

    const filteredTournaments = userTournaments.filter((tournament) =>
      playedTournamentIds.has(tournament._id.toString())
    );


    // Fetch all performances and latest 5 performances
    const allPerformances = await Player.find({ userId }).lean();

    const latestPerformances = await Match.find({
      $or: [
        { "scoreBoard.team1.players.phoneNumber": userPhoneNumber },
        { "scoreBoard.team2.players.phoneNumber": userPhoneNumber },
      ],
      status: "played",
    })
      .sort({ dateTime: -1 })
      .limit(5)
      .lean();

    // console.log("Latest Performances:",latestPerformances);

    const latestMatchesData = latestPerformances.map((match) => {
      const team1Players = match.scoreBoard.team1.players;
      const team2Players = match.scoreBoard.team2.players;

      // Find the user's performance in the match
      const playerStats = team1Players.concat(team2Players).find(
        (player) => player.phoneNumber === userPhoneNumber
      );
      // Calculate total overs bowled by the player
      const oversData = playerStats?.bowling?.overs || {};
      let totalBalls = Object.keys(oversData).reduce((sum, key) => {
        const over = oversData[key];
        // Only count deliveries with valid "over" and "ball" values
        return sum + (over.over !== undefined && over.ball !== undefined ? 1 : 0);
      }, 0);

      // Subtract one ball if there are any valid deliveries
      if (totalBalls > 0) {
        totalBalls -= 1;
      }

      const totalOversBowled = Math.floor(totalBalls / 6) + (totalBalls % 6) / 10; // Convert balls to overs (e.g., 8 balls = 1.2 overs)

      // Initialize aggregated data structure for the match
      const playerData = {
        batting: {
          runs: playerStats?.batting?.runs || 0,
          balls: playerStats?.batting?.balls || 0,
          fours: playerStats?.batting?.fours || 0,
          sixes: playerStats?.batting?.sixes || 0,
          halfcentury: playerStats?.batting?.halfCentury || 0,
          century: playerStats?.batting?.century || 0,
          strikeRate: playerStats?.batting?.balls
            ? (
              (playerStats.batting.runs / playerStats.batting.balls) *
              100
            ).toFixed(2)
            : "0.00",
        },
        bowling: {
          overs: totalBalls === 0 ? "0.0" : totalOversBowled.toFixed(1),
          runs: playerStats?.bowling?.runs || 0,
          wickets: playerStats?.bowling?.wickets || 0,
          economy: totalBalls > 0
            ? (playerStats.bowling.runs / (totalBalls / 6)).toFixed(2)
            : "0.00",
          maidens: playerStats?.bowling?.maidens || 0,
        },
      };

      return {
        _id: match._id,
        dateTime: match.dateTime,
        team1: match.scoreBoard?.team1?.teamName || match.team1?.teamName || "Unknown",
        team2: match.scoreBoard?.team2?.teamName || match.team2?.teamName || "Unknown",
        playerData,
      };
    });


    // if (!allPerformances || allPerformances.length === 0) {
    //   throw CustomErrorHandler.notFound("Player Performances Not Found");
    // }

    const aggregatedData = {
      batting: {
        Runs: { tennis: 0, leather: 0 },
        Balls: { tennis: 0, leather: 0 },
        Fours: { tennis: 0, leather: 0 },
        Sixes: { tennis: 0, leather: 0 },
        "Strike Rate": { tennis: 0, leather: 0 },
        "Half Century": { tennis: 0, leather: 0 },
        Century: { tennis: 0, leather: 0 },
        Innings: { tennis: 0, leather: 0 },
        Average: { tennis: 0, leather: 0 },
      },
      bowling: {
        Overs: { tennis: 0, leather: 0 },
        Runs: { tennis: 0, leather: 0 },
        Wickets: { tennis: 0, leather: 0 },
        Economy: { tennis: 0, leather: 0 },
        Maidens: { tennis: 0, leather: 0 },
        Innings: { tennis: 0, leather: 0 },
        Average: { tennis: 0, leather: 0 },

      },
    };

    allPerformances.forEach((performance) => {
      if (performance.battingStatistic) {
        Object.keys(performance.battingStatistic).forEach((ballType) => {
          const stats = performance.battingStatistic[ballType] || {};
          aggregatedData.batting.Runs[ballType] += stats.runs || 0;
          aggregatedData.batting.Balls[ballType] += stats.balls || 0;
          aggregatedData.batting.Fours[ballType] += stats.fours || 0;
          aggregatedData.batting.Sixes[ballType] += stats.sixes || 0;
          aggregatedData.batting["Half Century"][ballType] += stats.halfCentury || 0;
          aggregatedData.batting.Century[ballType] += stats.century || 0;
          aggregatedData.batting.Innings[ballType] += stats.innings || 1;

        });
      }
      if (performance.bowlingStatistic) {
        Object.keys(performance.bowlingStatistic).forEach((ballType) => {
          const stats = performance.bowlingStatistic[ballType] || {};
          aggregatedData.bowling.Overs[ballType] += stats.Over || 0;
          aggregatedData.bowling.Runs[ballType] += stats.runs || 0;
          aggregatedData.bowling.Wickets[ballType] += stats.wickets || 0;
          aggregatedData.bowling.Maidens[ballType] += stats.maidens || 0;
          aggregatedData.bowling.Innings[ballType] += stats.innings || 1;

        });
      }
    });


    Object.keys(aggregatedData.batting.Runs).forEach((ballType) => {
      aggregatedData.batting["Strike Rate"][ballType] = parseFloat(
        ((aggregatedData.batting.Runs[ballType] || 0) /
          (aggregatedData.batting.Balls[ballType] || 1)) *
        100
      ).toFixed(2);

      aggregatedData.batting.Average[ballType] = parseFloat(
        aggregatedData.batting.Runs[ballType] /
        (aggregatedData.batting.Innings[ballType] || 1)
      ).toFixed(2);
    });

    Object.keys(aggregatedData.bowling.Runs).forEach((ballType) => {
      const totalOvers = aggregatedData.bowling.Overs[ballType];
      aggregatedData.bowling.Economy[ballType] =
        totalOvers > 0
          ? parseFloat(aggregatedData.bowling.Runs[ballType] / totalOvers).toFixed(2)
          : "0.00";

      aggregatedData.bowling.Average[ballType] = parseFloat(
        aggregatedData.bowling.Runs[ballType] /
        (aggregatedData.bowling.Wickets[ballType] || 1)
      ).toFixed(2);
    });


    // Find the best performance against a team
    const bestBattingPerformance = matches.reduce((best, match) => {
      const team1 = match.scoreBoard.get("team1");
      const team2 = match.scoreBoard.get("team2");
      const team1Players = team1.players;
      const team2Players = team2.players;

      const userPerformance = team1Players.concat(team2Players).find(player => player.phoneNumber === userPhoneNumber);
      if (userPerformance && userPerformance.batting.runs > (best.runs || 0)) {
        return {
          runs: userPerformance.batting.runs,
          team: match.team1._id === userPerformance.team ? match.team2.teamName : match.team1.teamName,
          _id: match._id,
        };
      }
      return best;
    }, {});

    const bestBowlingPerformance = matches.reduce((best, match) => {
      const team1 = match.scoreBoard.get("team1");
      const team2 = match.scoreBoard.get("team2");
      const team1Players = team1.players;
      const team2Players = team2.players;

      const userPerformance = team1Players.concat(team2Players).find(player => player.phoneNumber === userPhoneNumber);
      if (userPerformance && userPerformance.bowling.wickets > (best.wickets || 0)) {
        return {
          performance: `${userPerformance.bowling.runs}-${userPerformance.bowling.wickets}`,
          team: match.team1._id === userPerformance.team ? match.team2.teamName : match.team1.teamName,
          _id: match._id,
        };
      }
      return best;
    }, {});

    return { aggregatedData, matches, bestBattingPerformance, bestBowlingPerformance, latestMatchesData, userPlayedTournament };

  },

  // async getFootballPerformance(data) {
  //   try {
  //     const { userId } = data;

  //     const user = await User.findById(userId).select("phoneNumber").lean();
  //     if (!user) throw CustomErrorHandler.notFound("User not found.");
  //     const userPhoneNumber = user.phoneNumber;

  //     // Get tournaments related to user and football
  //     const userTournaments = await Tournament.find({
  //       $or: [
  //         { user: userId },
  //         { tournamentfor: "football" },
  //         { organizer: userId },
  //         { coHostId1: userId },
  //         { coHostId2: userId }
  //       ],
  //       isDeleted: false,
  //     }, {
  //       locationHistory: 0,
  //       matches: 0,
  //       payments: 0,
  //     });
  //     const tournamentIds = userTournaments.map(t => t._id);
  //     // Get played matches where user participated
  //     const matches = await Match.find({
  //       tournament: { $in: tournamentIds },
  //       status: "played",
  //       scoreBoard: { $ne: null },
  //       $or: [
  //         { "scoreBoard.homeTeam.players.phoneNumber": userPhoneNumber },
  //         { "scoreBoard.awayTeam.players.phoneNumber": userPhoneNumber },
  //       ],
  //     }, {
  //       scoreBoard: 0
  //     })
  //     // .populate("tournament", "tournamentName tournamentStartDateTime tournamentEndDateTime")
  //     // .lean();
  //     // Latest 5 performances for recent form
  //     const latestPerformances = await Match.find({
  //       status: "played",
  //       scoreBoard: { $ne: null },
  //       $or: [
  //         { "scoreBoard.homeTeam.players.phoneNumber": userPhoneNumber },
  //         { "scoreBoard.awayTeam.players.phoneNumber": userPhoneNumber },
  //       ],
  //     })
  //       .sort({ dateTime: -1 })
  //       .limit(5)
  //       .lean();
  //     // console.log(latestPerformances);

  //     const player = await Player.findOne({ phoneNumber: userPhoneNumber }).lean();
  //     const latestMatchesData = latestPerformances.map(match => {
  //       const team1Players = match?.scoreBoard?.homeTeam?.players || [];
  //       const team2Players = match?.scoreBoard?.awayTeam?.players || [];

  //       const allPlayers = team1Players.concat(team2Players);
  //       const playerStats = allPlayers.find(p => p.phoneNumber === userPhoneNumber);
  //       // const stats = playerStats?.footballStatistic || {};
  //       const stats = player?.footballStatistic || {};
  //       // console.log(playerStats);
  //       console.log(player);
  //       return {
  //         _id: match._id,
  //         dateTime: match.dateTime,
  //         team1: match?.scoreBoard?.homeTeam?.teamName || 'N/A',
  //         team2: match?.scoreBoard?.awayTeam?.teamName || 'N/A',
  //         playerData: {
  //           goals: stats.goals || 0,
  //           assists: stats.assists || 0,
  //           saves: stats.saves || 0,
  //           yellowCards: stats.yellowCards || 0,
  //           redCards: stats.redCards || 0,
  //           foulsCommitted: stats.foulsCommitted || 0,
  //           foulsSuffered: stats.foulsSuffered || 0,
  //           penaltySaves: stats.penaltySaves || 0,
  //           penaltyGoals: stats.penaltyGoals || 0,
  //         }
  //       };
  //     });

  //     // Get all performance data from Player collection
  //     const allPerformances = await Player.find({
  //       userId,
  //       footballStatistic: { $exists: true }
  //     }).lean();

  //     // Calculate aggregated data
  //     const aggregatedData = {
  //       matchesPlayed: 0,
  //       totalGoals: 0,
  //       totalAssists: 0,
  //       totalSaves: 0,
  //       totalYellowCards: 0,
  //       totalRedCards: 0,
  //       totalFoulsCommitted: 0,
  //       totalFoulsSuffered: 0,
  //       totalPenaltySaves: 0,
  //       totalPenaltyGoals: 0,
  //     };

  //     // Aggregate performance data from Player collection
  //     allPerformances.forEach(perf => {
  //       const stats = perf.footballStatistic || {};
  //       aggregatedData.matchesPlayed += stats.matchesPlayed || 0;
  //       aggregatedData.totalGoals += stats.goals || 0;
  //       aggregatedData.totalAssists += stats.assists || 0;
  //       aggregatedData.totalSaves += stats.saves || 0;
  //       aggregatedData.totalYellowCards += stats.yellowCards || 0;
  //       aggregatedData.totalRedCards += stats.redCards || 0;
  //       aggregatedData.totalFoulsCommitted += stats.foulsCommitted || 0;
  //       aggregatedData.totalFoulsSuffered += stats.foulsSuffered || 0;
  //       aggregatedData.totalPenaltySaves += stats.penaltySaves || 0;
  //       aggregatedData.totalPenaltyGoals += stats.penaltyGoals || 0;
  //     });

  //     // Enhanced recent form calculation with goals and assists focus
  //     const recentFormData = latestMatchesData.map((match, index) => {
  //       const goals = match.playerData?.goals || 0;
  //       const assists = match.playerData?.assists || 0;

  //       return {
  //         matchIndex: index + 1,
  //         goals,
  //         assists,
  //         totalContribution: goals + assists,
  //         matchDate: match.dateTime,
  //         performance: goals > 0 || assists > 0 ? 'positive' : 'neutral'
  //       };
  //     });

  //     // Calculate recent form summary
  //     const recentFormSummary = {
  //       totalGoalsInRecentMatches: recentFormData.reduce((sum, match) => sum + match.goals, 0),
  //       totalAssistsInRecentMatches: recentFormData.reduce((sum, match) => sum + match.assists, 0),
  //       matchesWithContribution: recentFormData.filter(match => match.totalContribution > 0).length,
  //       averageGoalsPerMatch: recentFormData.length > 0
  //         ? (recentFormData.reduce((sum, match) => sum + match.goals, 0) / recentFormData.length).toFixed(2)
  //         : 0,
  //       averageAssistsPerMatch: recentFormData.length > 0
  //         ? (recentFormData.reduce((sum, match) => sum + match.assists, 0) / recentFormData.length).toFixed(2)
  //         : 0
  //     };

  //     return {
  //       aggregatedData,
  //       matches,
  //       latestMatchesData,
  //       userTournaments,
  //       recentFormData,
  //       recentFormSummary,
  //     };

  //   } catch (error) {
  //     console.error("Failed to get Football Performance:", error);
  //     throw error;
  //   }
  // },

  /**
   * @function getFootballPerformance
   * @description Retrieves comprehensive football performance data for a specific user. Fetches all football
   * tournaments where the user participated, aggregates statistics from the Player collection including goals,
   * assists, saves, cards, and fouls. Returns detailed performance data for the user's latest 5 matches along
   * with overall aggregated statistics.
   *
   * @param {Object} data - Performance request data.
   * @param {string} data.userId - The ID of the user whose performance to retrieve.
   * @returns {Promise<Object>} Performance data including aggregated statistics, matches, latest match details, and tournaments.
   * @throws {Error} Throws error if user is not found.
   */
  async getFootballPerformance(data) {
    try {
      const { userId } = data;
      const user = await User.findById(userId).select("phoneNumber").lean();
      if (!user) {
        throw new Error("User not found");
      }
      const userPhone = user.phoneNumber;

      // 2. Get tournaments relevant for this user + football
      const userTournaments = await Tournament.find({
        $or: [
          { user: userId },
          { tournamentfor: "football" },
          { organizer: userId },
          { coHostId1: userId },
          { coHostId2: userId }
        ],
        isDeleted: false
      }).lean();

      const tournamentIds = userTournaments.map(t => t._id);

      // 3. Fetch matches played where user’s team is involved
      //    and get latest 5 as well
      const matches = await Match.find({
        tournament: { $in: tournamentIds },
        status: "played",
        scoreBoard: { $ne: null },
        $or: [
          { "scoreBoard.homeTeam.players.phoneNumber": userPhone },
          { "scoreBoard.awayTeam.players.phoneNumber": userPhone },
        ],
      })

      const latestMatches = await Match.find({
        status: "played",
        scoreBoard: { $ne: null },
        $or: [
          { "scoreBoard.homeTeam.players.phoneNumber": userPhone },
          { "scoreBoard.awayTeam.players.phoneNumber": userPhone }
        ]
      })
        .sort({ dateTime: -1 })
        .limit(5)
        .lean();

      // 4. To get stats from Player collection by team
      //    First collect all team IDs from latestMatches for which user is involved
      const teamIdsInLatest = latestMatches.map(m => {
        const homeTeamId = m.scoreBoard?.homeTeam?._id;
        const awayTeamId = m.scoreBoard?.awayTeam?._id;
        // check which of these match user's team via Player.team
        // We’ll filter later
        return [homeTeamId, awayTeamId];
      }).flat().filter(Boolean);

      // 5. Fetch the Player doc for this user in those teams
      const playerDocs = await Player.find({
        userId: userId,
        team: { $in: teamIdsInLatest }
      }).lean();

      // Might assume only one, but could be multiple if user plays in multiple teams
      // Build a map by teamId to that player's stats
      const playerStatsMap = {}; // { teamId: stats }
      playerDocs.forEach(p => {
        if (p.team && p.footballStatistic) {
          playerStatsMap[String(p.team)] = p.footballStatistic;
        }
      });

      // 6. Build latestMatchesData
      const latestMatchesData = latestMatches.map(match => {
        const homeTeam = match.scoreBoard?.homeTeam;
        const awayTeam = match.scoreBoard?.awayTeam;

        // Which team is the user's?
        // Match against phone number (if unique) OR via playerStatsMap
        let stats = null;

        // Option A: via phoneNumber
        const allPlayers = [
          ...(homeTeam?.players || []),
          ...(awayTeam?.players || [])
        ];
        const foundByPhone = allPlayers.find(p => p.phoneNumber === userPhone);
        if (foundByPhone?.footballStatistic) {
          stats = foundByPhone.footballStatistic;
        }

        // Option B: via Player.team
        if (!stats) {
          const homeId = homeTeam?._id;
          const awayId = awayTeam?._id;
          if (homeId && playerStatsMap[String(homeId)]) {
            stats = playerStatsMap[String(homeId)];
          } else if (awayId && playerStatsMap[String(awayId)]) {
            stats = playerStatsMap[String(awayId)];
          }
        }

        // If still null, fallback to zeros
        stats = stats || {};

        return {
          _id: match._id,
          dateTime: match.dateTime,
          team1: homeTeam?.teamName || "N/A",
          team2: awayTeam?.teamName || "N/A",
          playerData: {
            goals: stats.goals || 0,
            assists: stats.assists || 0,
            saves: stats.saves || 0,
            yellowCards: stats.yellowCards || 0,
            redCards: stats.redCards || 0,
            foulsCommitted: stats.foulsCommitted || 0,
            foulsSuffered: stats.foulsSuffered || 0,
            penaltySaves: stats.penaltySaves || 0,
            penaltyGoals: stats.penaltyGoals || 0,
          }
        };
      });

      // 7. Similarly aggregate full performance from Player collection
      const allPlayerPerformances = await Player.find({
        userId,
        footballStatistic: { $exists: true }
      }).lean();

      const aggregatedData = {
        matchesPlayed: 0,
        totalGoals: 0,
        totalAssists: 0,
        totalSaves: 0,
        totalYellowCards: 0,
        totalRedCards: 0,
        totalFoulsCommitted: 0,
        totalFoulsSuffered: 0,
        totalPenaltySaves: 0,
        totalPenaltyGoals: 0,
      };

      allPlayerPerformances.forEach(p => {
        const st = p.footballStatistic;
        aggregatedData.matchesPlayed += st.matchesPlayed || 0;
        aggregatedData.totalGoals += st.goals || 0;
        aggregatedData.totalAssists += st.assists || 0;
        aggregatedData.totalSaves += st.saves || 0;
        aggregatedData.totalYellowCards += st.yellowCards || 0;
        aggregatedData.totalRedCards += st.redCards || 0;
        aggregatedData.totalFoulsCommitted += st.foulsCommitted || 0;
        aggregatedData.totalFoulsSuffered += st.foulsSuffered || 0;
        aggregatedData.totalPenaltySaves += st.penaltySaves || 0;
        aggregatedData.totalPenaltyGoals += st.penaltyGoals || 0;
      });

      // 8. Return full performance result
      return {
        aggregatedData,
        matches,
        latestMatchesData,
        userTournaments,
        // plus other fields you need
      };

    } catch (err) {
      console.error("Error in getFootballPerformance:", err);
      throw err;
    }
  },

  /**
   * @function createChallengeMatch
   * @description Creates a new challenge match between two teams. Validates that no pending challenge match
   * exists between the same teams, sets up the match details including captains, sport type, and match authority,
   * then saves the challenge to the database.
   *
   * @param {Object} data - Challenge match creation data.
   * @param {string} data.team1ID - The ID of the challenging team.
   * @param {string} data.team2ID - The ID of the challenged team.
   * @param {string} [data.dateTime] - Optional date and time for the match.
   * @param {string} data.challengeforSport - The sport type ('cricket' or 'football').
   * @param {number} data.matchlength - Length of the match in overs/halves.
   * @param {string} data.matchAuthority - The ID of the user who will be the match authority.
   * @returns {Promise<Object>} The saved challenge match document.
   * @throws {CustomErrorHandler} Throws error if a pending challenge already exists between the teams.
   */
  async createChallengeMatch(data) {
    const { team1ID, team2ID, dateTime, challengeforSport, matchlength, matchAuthority } = data;

    const userInfo = global.user;

    const teamData = await Team?.findOne({ _id: team2ID });

    const existingMatch = await ChallengeTeam?.findOne({
      $or: [
        { team1: team1ID, team2: team2ID },
        { team1: team2ID, team2: team1ID },
      ],
      status: { $in: ["Pending"] },
    });
    if (existingMatch) {
      throw CustomErrorHandler.alreadyExist("Challenge Match Already Exist.");
    }


    // const team1 = await Team?.findById(team1ID);
    // const team2 = await Team?.findById(team2ID);

    // let team1Players = team1.players;
    // let team2Players = team2.players;

    // function isPlayerPresentInTeam2(team1Players, team2Players) {
    //   const team1PlayerIds = team1Players.map((player) => player.phoneNumber);

    //   for (const player of team2Players) {
    //     if (team1PlayerIds.includes(player.phoneNumber)) {
    //       console.log(
    //         `Player with  ${player.phoneNumber} is present in both Team `
    //       );
    //       throw CustomErrorHandler.alreadyExist(
    //         `Player with  Phone Number ${player.phoneNumber} present in both Team `
    //       );
    //     }
    //   }
    //   return false;
    // }

    // const isPlayerPresent = isPlayerPresentInTeam2(team1Players, team2Players);

    const newMatch = new ChallengeTeam({
      team1: team1ID,
      team2: team2ID,
      captain1: userInfo.userId,
      captain2: teamData.userId,
      challengedBy: userInfo.userId,
      challengeforSport: challengeforSport,
      matchlength: matchlength,
      winningTeamId: null,
      matchAuthority: matchAuthority
      // dateTime: dateTime,
    });

    const matchdata = await newMatch.save();
    return matchdata;
  },

  /**
   * @function getAvailableAuthority
   * @description Retrieves all available users who can serve as match authorities for a challenge match.
   * Combines players from both the challenging team and opponent team, extracts unique phone numbers,
   * and returns the corresponding user information including their full names.
   *
   * @param {Object} data - Authority search data.
   * @param {string} data.challengeTeamId - The ID of the challenging team.
   * @param {string} data.opponentTeamId - The ID of the opponent team.
   * @returns {Promise<Array>} Array of users with their ID, name, and phone number who can be match authorities.
   * @throws {Error} Throws error if one or both teams are not found.
   */
  async getAvailableAuthority(data) {
    try {
      const { challengeTeamId, opponentTeamId } = data;

      const [challengeTeam, opponentTeam] = await Promise.all([
        Team.findById(challengeTeamId).populate('players'),
        Team.findById(opponentTeamId).populate('players')
      ]);

      if (!challengeTeam || !opponentTeam) throw new Error('One or both teams not found');

      const allPlayers = [...challengeTeam.players, ...opponentTeam.players];
      const phoneNumbers = Array.from(new Set(allPlayers.map(p => p.phoneNumber).filter(Boolean)));
      const users = await User.find({ phoneNumber: { $in: phoneNumbers } });
      const mappeduser = users.map(u => ({
        id: u._id,
        name: u.fullName,
        phoneNumber: u.phoneNumber
      }));
      return mappeduser;
    } catch (err) {
      throw err;
    }
  },

  /**
   * @function getChallengeMatch
   * @description Retrieves all challenge matches where the current user is a captain of either team.
   * Returns matches with status of 'Accepted', 'Pending', or 'played', populated with team details
   * including team names and logos.
   *
   * @returns {Promise<Array>} Array of challenge matches where the user is captain, with team details populated.
   * @throws {CustomErrorHandler} Throws error if no matches are found.
   */
  async getChallengeMatch() {
    const userInfo = global.user;

    const MatchExist = await ChallengeTeam.find({
      $or: [{ captain1: userInfo.userId }, { captain2: userInfo.userId }],
      status: { $in: ["Accepted", "Pending", "played"] },
    })
      .populate("team1", "teamName teamLogo")
      .populate("team2", "teamName teamLogo")
      .exec();

    //   const MatchExist = await ChallengeTeam.aggregate([
    //     {
    //       $match: {
    //         $or: [
    //           { captain1: userInfo.userId },
    //           { captain2: userInfo.userId }
    //         ],
    //         status: { $in: ["Accepted", "Pending"] }
    //       }
    //     },
    //     {
    //         $lookup: {
    //             from: 'teams', // Name of the collection you're joining with
    //             localField: 'team1', // Field in the current collection that references the users collection
    //             foreignField: '_id', // Field in the 'users' collection to match with
    //             as: 'Team1' // Output array field name
    //         }
    //     },
    //     {

    //         $project: {
    //             _id: 1,
    //               team1: 1,
    //               team2: 1,
    //               captain1: 1,
    //               captain2: 1,
    //               dateTime: 1,
    //               status: 1,
    //               scoreBoard: 1,
    //               Round: 1,
    //               matchNo: 1,
    //               createdAt: 1,
    //               updatedAt: 1,
    //             // userEmail: { $arrayElemAt: ["$User.email", 0] }, // Extract email field from User array
    //             // userFullName: { $arrayElemAt: ["$User.fullName", 0] } // Extract fullName field from User array
    //         }
    //     }
    // ]);

    if (!MatchExist) {
      throw CustomErrorHandler.notFound("This Match is Not Found.");
    }
    return MatchExist;
  },

  /**
   * @function updateChallengeMatch
   * @description Updates the status of a challenge match. Used to accept, reject, or modify the state
   * of a challenge match between teams.
   *
   * @param {string} matchId - The ID of the challenge match to update.
   * @param {string} status - The new status for the match ('Accepted', 'Pending', 'Rejected', etc.).
   * @returns {Promise<Object>} The updated challenge match document.
   */
  async updateChallengeMatch(matchId, status) {
    const MatchExist = await ChallengeTeam.findById(matchId);

    MatchExist.status = status;

    return await MatchExist.save();
  },

  /**
   * @function updateChallengeScoreBoard
   * @description Updates the scoreboard data for a challenge match. Replaces the existing scoreboard
   * with new data provided, allowing real-time score tracking during the match.
   *
   * @param {Object} data - Score update data.
   * @param {Object} data.scoreBoard - The complete scoreboard object to save.
   * @param {string} matchId - The ID of the challenge match to update.
   * @returns {Promise<Object>} The updated challenge match document with new scoreboard.
   * @throws {CustomErrorHandler} Throws error if match is not found.
   */
  async updateChallengeScoreBoard(data, matchId) {
    const isMatchExists = await ChallengeTeam.findById(matchId);

    if (!isMatchExists) {
      throw CustomErrorHandler.notFound("Match Not Found");
    }
    const match = await ChallengeTeam.findByIdAndUpdate(
      matchId,
      {
        $set: {
          scoreBoard: data.scoreBoard
        }
      },
      { new: true, runValidators: true } // Return updated document and run schema validators
    );
    if (!match) {
      throw CustomErrorHandler.notFound("Match Not Found");
    }

    return match;
  },

  /**
   * @function finishChallengeMatch
   * @description Marks a challenge match as completed and determines the winner or draw status. For football
   * matches, analyzes the scoreboard including regular time, extra time, and penalty shootouts to determine
   * the final result. For cricket matches, uses the provided isDraw flag and winningTeamId.
   *
   * @param {Object} data - Match completion data.
   * @param {string} data.matchId - The ID of the challenge match to finish.
   * @param {string} [data.winningTeamId] - The ID of the winning team (null if draw).
   * @param {boolean} [data.isDraw] - Whether the match ended in a draw (for cricket).
   * @returns {Promise<Object>} The updated challenge match document with final result.
   * @throws {CustomErrorHandler} Throws error if match is not found or scoreboard data is missing (for football).
   */
  async finishChallengeMatch(data) {
    try {
      const { matchId, winningTeamId, isDraw } = data;
      const match = await ChallengeTeam.findById(matchId);
      if (!match) throw CustomErrorHandler.notFound("Match Not Found");

      // Handle football match completion
      if (match.challengeforSport == 'football') {
        const scoreBoard = match.scoreBoard
        const homeTeam = scoreBoard.get("homeTeam") || {}
        const awayTeam = scoreBoard.get("awayTeam") || {}
        const matchEvents = scoreBoard.get("matchEvents") || []
        const goals = scoreBoard.get("goals") || []
        const cards = scoreBoard.get("cards") || []
        const penaltyShootout = scoreBoard.get("penaltyShootout") || {}
        const isPenaltyShootout = scoreBoard.get("isPenaltyShootout") || false
        const isExtraTime = scoreBoard.get("isExtraTime") || false
        const extraTime = scoreBoard.get("extraTime") || false

        const homeScore = scoreBoard.get("homeScore") || 0
        const awayScore = scoreBoard.get("awayScore") || 0

        if (!scoreBoard) throw CustomErrorHandler.badRequest("Match scoreboard data not found");
        let isMatchDraw = false;
        if (isPenaltyShootout) {
          const homePenaltyScore = penaltyShootout?.homeTeamScore ?? 0;
          const awayPenaltyScore = penaltyShootout?.awayTeamScore ?? 0;

          if (homePenaltyScore === awayPenaltyScore) {
            isMatchDraw = true;
          }

        } else if (isExtraTime) {
          const homeExtraScore = (extraTime?.firstHalf?.homeGoals ?? 0) + (extraTime?.secondHalf?.homeGoals ?? 0);
          const awayExtraScore = (extraTime?.firstHalf?.awayGoals ?? 0) + (extraTime?.secondHalf?.awayGoals ?? 0);

          if (homeExtraScore === awayExtraScore) {
            isMatchDraw = true;
          }

        } else {
          if (homeScore === awayScore) {
            isMatchDraw = true;
          }
        }
        match.status = "played"
        match.isMatchDraw = isMatchDraw
        match.winningTeamId = !isMatchDraw ? winningTeamId : null
      } else {
        match.isMatchDraw = isDraw;
        match.status = "played"
        match.winningTeamId = isDraw ? null : winningTeamId;
      }
      let matchData = await match.save();
      return matchData;
    } catch (error) {
      console.log(`Failed to updat challenge match:${error}`);
    }
  },

  /**
   * @function getChallengeMatchPerformance
   * @description Retrieves cricket performance data for the current user in a specific challenge match.
   * Searches both teams' player lists for the user's phone number and returns their batting and bowling
   * statistics from the match scoreboard.
   *
   * @param {Object} data - Performance request data.
   * @param {string} data.matchId - The ID of the challenge match.
   * @returns {Promise<Object>} Player performance data including batting and bowling statistics from the match.
   * @throws {CustomErrorHandler} Throws error if match is not found or player is not in either team.
   */
  async getChallengeMatchPerformance(data) {
    try {
      const { matchId } = data;
      const userInfo = global.user;
      const MatchExist = await ChallengeTeam.findById(matchId);

      if (!MatchExist) {
        throw CustomErrorHandler.notFound("This Match is Not Found.");
      }

      const user = await User.findById(userInfo.userId);
      const phoneNumberToFind = user.phoneNumber;
      const team1Data = MatchExist.scoreBoard.get('team1');
      const team2Data = MatchExist.scoreBoard.get('team2');

      const team1 = team1Data?.players?.filter((player) => player.phoneNumber === phoneNumberToFind) || [];
      const team2 = team2Data?.players?.filter((player) => player.phoneNumber === phoneNumberToFind) || [];


      const teamData = team1.length > 0 ? team1[0] : team2.length > 0 ? team2[0] : null;

      if (!teamData) {
        throw CustomErrorHandler.notFound("Player not found in either team.");
      }

      // Calculate batting achievements
      let isHalfCentury = 0;
      let isCentury = 0;
      const runs = teamData?.batting?.runs || 0;

      if (runs >= 50 && runs < 100) {
        isHalfCentury = 1;
      } else if (runs >= 100 && runs < 200) {
        isCentury = 1;
      } else if (runs >= 200 && runs < 300) {
        isCentury = 2;
      } else if (runs >= 300 && runs < 400) {
        isCentury = 3;
      } else if (runs >= 400 && runs < 500) {
        isCentury = 4;
      }

      // Calculate batting stats
      const battingStats = {
        Runs: {
          tennis: teamData?.batting?.runs || 0,
          leather: 0,
        },
        Balls: {
          tennis: teamData?.batting?.balls || 0,
          leather: 0,
        },
        Fours: {
          tennis: teamData?.batting?.fours || 0,
          leather: 0,
        },
        Sixes: {
          tennis: teamData?.batting?.sixes || 0,
          leather: 0,
        },
        "Strike Rate": {
          tennis: teamData?.batting?.balls ?
            ((teamData.batting.runs / teamData.batting.balls) * 100).toFixed(2) : 0,
          leather: 0,
        },
        Average: {
          tennis: teamData?.batting?.runs || 0,
          leather: 0,
        },
        "Half Century": {
          tennis: isHalfCentury,
          leather: 0,
        },
        Century: {
          tennis: isCentury,
          leather: 0,
        },
      };

      // Calculate bowling stats
      const bowlingStats = {
        Overs: {
          tennis: Object.keys(teamData?.bowling?.overs || {}).length - 1 || 0,
          leather: 0,
        },
        Runs: {
          tennis: teamData?.bowling?.runs || 0,
          leather: 0,
        },
        Wickets: {
          tennis: teamData?.bowling?.wickets || 0,
          leather: 0,
        },
        Economy: {
          tennis: (() => {
            const overs = Object.keys(teamData?.bowling?.overs || {}).length - 1;
            const runs = teamData?.bowling?.runs || 0;
            return overs > 0 ? (runs / overs).toFixed(2) : 0;
          })(),
          leather: 0,
        },
        Maidens: {
          tennis: teamData?.bowling?.maidens || 0,
          leather: 0,
        },
      };
      return {
        batting: battingStats,
        bowling: bowlingStats
      };
    } catch (error) {
      console.log(`Failed to Get Performance:${error}`);
    }
  },

  /**
   * @function getFootballChallengePerformance
   * @description Retrieves comprehensive football performance data for the current user in a specific challenge match.
   * Analyzes the match scoreboard to extract detailed statistics including goals, assists, saves, cards, fouls,
   * penalty actions, and other match events. Calculates aggregated performance metrics for the player.
   *
   * @param {Object} data - Performance request data.
   * @param {string} data.matchId - The ID of the football challenge match.
   * @returns {Promise<Object>} Aggregated football statistics including goals, assists, saves, cards, fouls, and more.
   * @throws {CustomErrorHandler} Throws error if user or match is not found, or if player is not in either team.
   */
  async getFootballChallengePerformance(data) {
    try {
      const { matchId } = data;
      const userInfo = global.user;
      const user = await User.findById(userInfo.userId).select("phoneNumber").lean();

      if (!user) {
        throw new Error("User not found");
      }

      const phoneNumber = user.phoneNumber;

      // Find the challenge match by matchId
      const match = await ChallengeTeam.findById(matchId).lean();

      if (!match) {
        throw CustomErrorHandler.notFound("This Match is not found.");
      }

      // Check if match is played and has scoreBoard
      if (match.status !== "played" || !match.scoreBoard) {
        throw CustomErrorHandler.notFound("Match has not been played or scoreboard data is missing.");
      }

      const scoreBoard = match.scoreBoard;

      // Handle both Map and plain object formats
      const homeTeamData = scoreBoard.get ? scoreBoard.get("homeTeam") : scoreBoard.homeTeam;
      const awayTeamData = scoreBoard.get ? scoreBoard.get("awayTeam") : scoreBoard.awayTeam;

      if (!homeTeamData || !awayTeamData) {
        throw CustomErrorHandler.notFound("Scoreboard data missing or malformed.");
      }

      // Find the player in either team
      const homePlayer = homeTeamData?.players?.find(p => p.phoneNumber === phoneNumber);
      const awayPlayer = awayTeamData?.players?.find(p => p.phoneNumber === phoneNumber);

      const playerInMatch = homePlayer || awayPlayer;

      if (!playerInMatch) {
        throw CustomErrorHandler.notFound("Player not found in either team.");
      }

      const playerId = String(playerInMatch._id);
      const playerTeamId = homePlayer ? String(homeTeamData._id) : String(awayTeamData._id);

      // Extract match events
      const matchEvents = scoreBoard.matchEvents || [];
      const goals = scoreBoard.goals || [];
      const cards = scoreBoard.cards || [];

      // Calculate statistics from match events
      let totalGoals = 0;
      let totalAssists = 0;
      let totalYellowCards = 0;
      let totalRedCards = 0;
      let totalFoulsCommitted = 0;
      let totalSaves = 0;
      let totalPenaltySaves = 0;
      let totalPenaltyGoals = 0;

      // Count goals scored by this player
      goals.forEach(goal => {
        const scorerId = String(goal.scorerId?._id || goal.scorerId);
        if (scorerId === playerId) {
          totalGoals++;

          // Check if it's a penalty goal
          if (goal.goalType === "Penalty" || goal.goalType === "penalty_goal") {
            totalPenaltyGoals++;
          }
        }

        // Count assists
        const assistId = String(goal.assistId?._id || goal.assistId);
        if (assistId === playerId) {
          totalAssists++;
        }
      });

      // Count cards for this player
      cards.forEach(card => {
        const cardPlayerId = String(card.playerId?._id || card.playerId);
        if (cardPlayerId === playerId) {
          if (card.cardType === "Yellow") {
            totalYellowCards++;
          } else if (card.cardType === "Red") {
            totalRedCards++;
          }
        }
      });

      // Count fouls, saves, and other events from matchEvents
      matchEvents.forEach(event => {
        const eventPlayerId = String(event.playerId?._id || event.playerId);
        const eventTeamId = String(event.teamId?._id || event.teamId);

        if (eventPlayerId === playerId) {
          // Count fouls committed
          if (event.eventType === "foul") {
            totalFoulsCommitted++;
          }

          // Count saves (for goalkeepers)
          if (event.eventType === "save") {
            totalSaves++;

            // Check if it's a penalty save
            if (event.additionalData?.saveType === "penalty_saved" ||
              event.description?.toLowerCase().includes("penalty")) {
              totalPenaltySaves++;
            }
          }
        }
      });

      // Additional statistics (if available in match events)
      let foulsSuffered = 0;
      let minutesPlayed = 0;
      let shotsOnTarget = 0;
      let passesCompleted = 0;

      matchEvents.forEach(event => {
        const victimPlayerId = String(event.additionalData?.victimPlayer?._id || event.additionalData?.victimPlayer || "");

        // Count fouls suffered (when player is the victim)
        if (victimPlayerId === playerId && event.eventType === "foul") {
          foulsSuffered++;
        }

        // Count shots on target
        if (String(event.playerId?._id || event.playerId) === playerId &&
          event.eventType === "shot_on_target") {
          shotsOnTarget++;
        }

        // Count passes completed
        if (String(event.playerId?._id || event.playerId) === playerId &&
          event.eventType === "pass_completed") {
          passesCompleted++;
        }
      });

      // Calculate minutes played (if available from substitutions or match duration)
      const matchDuration = match.matchlength || 0;
      const wasSubstituted = (scoreBoard.substitutions || []).some(sub =>
        String(sub.playerOut?._id || sub.playerOut) === playerId
      );

      if (!wasSubstituted) {
        minutesPlayed = matchDuration; // Full match duration in halves
      }

      // Build aggregatedData for this single match
      const aggregatedData = {
        matchesPlayed: 1,
        totalGoals,
        totalAssists,
        totalSaves,
        totalYellowCards,
        totalRedCards,
        totalFoulsCommitted,
        totalFoulsSuffered: foulsSuffered,
        totalPenaltySaves,
        totalPenaltyGoals,
        minutesPlayed,
        shotsOnTarget,
        passesCompleted,
      };

      const teamName = homePlayer ? homeTeamData?.teamName : awayTeamData?.teamName;
      const opponentName = homePlayer ? awayTeamData?.teamName : homeTeamData?.teamName;
      return aggregatedData;

    } catch (err) {
      console.error("Error in getChallengeFootballPerformance:", err);
      throw err;
    }
  },

  /**
   * @function deleteMatch
   * @description Deletes a match from the database by its ID. Validates that the match exists before
   * attempting deletion.
   *
   * @param {string} matchId - The ID of the match to delete.
   * @returns {Promise<void>} Resolves when the match is successfully deleted.
   * @throws {CustomErrorHandler} Throws error if match is not found.
   */
  async deleteMatch(matchId) {
    const match = await Match.findById(matchId);
    if (!match) {
      throw CustomErrorHandler.notFound("Match not found with the provided ID.");
    }
    await match.remove();
    return;
  },



};



export default matchServices;
