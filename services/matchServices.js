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
  async createMatch(data) {
    const userInfo = global.user;

    const { tournamentId, team1ID, team2ID, round, matchNo, dateTime, winningTeamId, matchAuthority } = data;
    console.log(`The Team 1 id:${team1ID} and Team 2 id:${team2ID}`)
    // Check if the tournament exists
    const TournamentExist = await Tournament.findOne({ _id: tournamentId });

    if (!TournamentExist) {
      throw CustomErrorHandler.badRequest("This Tournament is Not Found.");
    }

    // Check if the user has the authority to create the match
    if (TournamentExist?.authority != userInfo.userId) {
      throw CustomErrorHandler.badRequest("You do not have permission.");
    }
    console.log("time received", dateTime);
    // Validate that team1 and team2 do not share players
    const team1 = await Team.findById(team1ID);
    const team2 = await Team.findById(team2ID);

    const team1Players = team1.players;
    const team2Players = team2.players;


    //Previous Code to check Overlap PLayers
    // Check for player overlap
    // const isPlayerPresentInTeam2 = team1Players.some(player1 =>
    //   team2Players.some(player2 => player1.phoneNumber === player2.phoneNumber)
    // );
    // if (isPlayerPresentInTeam2) {
    //   console.log("Player found:",isPlayerPresentInTeam2)
    //   throw CustomErrorHandler.alreadyExist("Player overlap found in teams.");
    // }


    const overlappingPlayers = team1Players.filter(player1 =>
      team2Players.some(player2 => player1.phoneNumber === player2.phoneNumber)
    );
    if (overlappingPlayers.length > 0) {
      const overlapDetails = overlappingPlayers.map(player =>
        `${player.name} (Phone: ${player.phoneNumber})`
      ).join(", ");

      throw CustomErrorHandler.badRequest(`There are overlapping players in both teams: ${overlapDetails}`);
    }

    const formatDateTime = (dateTimeString) => {
      const parsedDate = DateTime.fromISO(dateTimeString, { zone: "utc" });
      if (!parsedDate.isValid) {
        throw CustomErrorHandler.badRequest("Invalid date format. Please provide a valid ISO string.");
      }

      return parsedDate.toISO();
    };


    const standardizedDateTime = formatDateTime(dateTime);
    console.log("Create Match - Original DateTime:", dateTime);
    console.log("Create Match - Stored DateTime:", standardizedDateTime);



    // Create a new match
    const newMatch = new Match({
      tournament: tournamentId,
      team1: team1ID,
      team2: team2ID,
      dateTime: standardizedDateTime, // Save as UTC
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


  //DG
  async getOpponentTournamentId() {
    const userInfo = global.user;
    const userId = userInfo.userId;

    const userPhoneNumber = await User.findOne({ _id: userId }).select("phoneNumber");

    if (!userPhoneNumber) {
      throw CustomErrorHandler.badRequest("User phone number not found.");
    }

    const phoneNumberToFind = userPhoneNumber.phoneNumber;

    const matchData = await Match.find({ scoreBoard: { $ne: null } })
      .select("tournament team1 team2 _id")
      .populate("tournament", "tournamentName")
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

    const tournamentsWithPhoneNumber = matchData.filter((match) => {
      if (!match.team1?.players || !match.team2?.players) {
        return false;
      }

      const team1Players = match.team1.players.map((player) => player.phoneNumber);
      const team2Players = match.team2.players.map((player) => player.phoneNumber);

      const hasOverlap = team1Players.some((phone) => team2Players.includes(phone));

      if (hasOverlap) {
        return false;
      }
      return (
        team1Players.includes(phoneNumberToFind) ||
        team2Players.includes(phoneNumberToFind)
      );
    });

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
          teamId,
        };
      }

      return null;
    }).filter(Boolean);

    return { data: tournamentDetails };
  },


  async getMatch(tournamentId) {
    const MatchExist = await Match.find({
      tournament: tournamentId,
    });

    if (!MatchExist) {
      throw CustomErrorHandler.notFound("This Match is Not Found.");
    }
    return MatchExist;
  },

  async getSingleMatch(matchId) {

    const MatchExist = await Match.findById(new mongoose.Types.ObjectId(matchId));
    if (!MatchExist) {
      throw CustomErrorHandler.notFound("This Match is Not Found.");
    }
    return MatchExist;
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

  async getOpponentOld(tournamentID, teamID) {
    const userInfo = global.user;

    const opponents = await Match.find({
      tournament: tournamentID,
      $or: [{ team1: teamID }, { team2: teamID }],
    }).select("team1, team2");

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
      .filter(Boolean);

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

  async getOpponent(tournamentID, teamID) {
    const userInfo = global.user;
    console.log(teamID);
    let opponents = await Match.find({
      tournament: tournamentID,
      $or: [{ team1: teamID }, { team2: teamID }],
    })
    // .select("scoreBoard _id ")
    // .lean();

    if (!opponents) {
      throw CustomErrorHandler.notFound("The Player of this Match not Found.");
    }
    console.log(opponents);
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
      .filter(Boolean);

    const uniqueOpponentsSet = new Set();
    const uniqueOpponents = filteredOpponents.reduce((acc, opponent) => {
      if (!uniqueOpponentsSet.has(opponent.opponent._id)) {
        uniqueOpponentsSet.add(opponent.opponent._id);
        acc.push(opponent);
      }
      return acc;
    }, []);
    // console.log(uniqueOpponents);


    return { team: filteredOpponents, matchDetails: opponents };
  },

  async editMatch(data, MatchId) {
    // Ensure the dateTime is standardized
    const userInfo = global.user;

    // Find the Match by ID and ensure it belongs to the correct tournament
    const MatchExist = await Match.findOne({
      _id: MatchId,
      tournament: data.tournamentId,
    });

    if (!MatchExist) {
      throw CustomErrorHandler.notFound("Match Not Found");
    }
    const formatDateTime = (dateTimeString) => {
      const parsedDate = DateTime.fromISO(dateTimeString, { zone: "utc" });
      if (!parsedDate.isValid) {
        throw CustomErrorHandler.badRequest("Invalid date format. Please provide a valid ISO string.");
      }

      return parsedDate.toISO();
    };

    const standardizedDateTime = formatDateTime(data.dateTime);
    console.log("Edit Match - Original DateTime:", data.dateTime);
    console.log("Edit Match - Formatted DateTime:", standardizedDateTime);


    // Update the match fields
    MatchExist.team1 = data.team1ID;
    MatchExist.team2 = data.team2ID;
    MatchExist.Round = data.round;
    MatchExist.matchNo = data.matchNo;
    MatchExist.dateTime = standardizedDateTime;

    // Save the updated document
    const matchData = await MatchExist.save();

    //Send Notification to both team organizers about match Changes
    const [team1org, team2org] = await Promise.all([
      User.findById(MatchExist.team1.userId),
      User.findById(MatchExist.team2.userId)
    ]);
    const [Team1FCM, Team2FCM] = [team1org.fcmToken, team2org.fcmToken];
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
  async updateScoreBoard(data, MatchId) {
    try {
      // Validate input data
      if (!data.scoreBoard || typeof data.scoreBoard !== 'object') {
        throw CustomErrorHandler.badRequest("Invalid scoreBoard data");
      }

      // Atomic update
      const matchData = await Match.findByIdAndUpdate(
        MatchId,
        {
          $set: {
            scoreBoard: data.scoreBoard,
            status: 'current' // Set status to 'current' when updating scoreboard
          }
        },
        { new: true, runValidators: true }
      );

      if (!matchData) {
        throw CustomErrorHandler.notFound("Match Not Found");
      }

      return matchData;
    } catch (err) {
      console.error("Error updating scoreBoard:", err);
      throw CustomErrorHandler.internal("Failed to update ScoreBoard");
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

  //code by Nikhil
  async updateTeamMatchsData(matchId, winningTeamId) {
    // Find the Match by ID
    const match = await Match.findOne({
      _id: matchId,
      status: { $ne: "played" },
    });

    if (!match) {
      // Handle the case where the Match is not found
      throw CustomErrorHandler.notFound("Match Not Found");
    }

    // Find the Tournament which type, tennis or leather ball
    const tournament = await Tournament.findById(match.tournament).select(
      "ballType"
    );

    const balltype = tournament.ballType.name;

    // Update Team 1 player data

    let Team1Players = match.scoreBoard.team1.players;

    for (const teamPlayer1 of Team1Players) {
      if (balltype == "leather") {
        let isCentury = 0;
        let isHalfCentury = 0;

        if (teamPlayer1.batting.runs >= 50 && teamPlayer1.batting.runs < 100) {
          isHalfCentury = 1;
        } else if (
          teamPlayer1.batting.runs >= 100 &&
          teamPlayer1.batting.runs < 200
        ) {
          isCentury = 1;
        } else if (
          teamPlayer1.batting.runs >= 200 &&
          teamPlayer1.batting.runs < 300
        ) {
          isCentury = 2;
        } else if (
          teamPlayer1.batting.runs >= 300 &&
          teamPlayer1.batting.runs < 400
        ) {
          isCentury = 3;
        } else if (
          teamPlayer1.batting.runs >= 400 &&
          teamPlayer1.batting.runs < 500
        ) {
          isCentury = 4;
        }

        const player1 = await Player.findByIdAndUpdate(
          teamPlayer1._id,
          {
            $inc: {
              "battingStatistic.leather.runs": teamPlayer1.batting.runs,
              "battingStatistic.leather.balls": teamPlayer1.batting.balls,
              "battingStatistic.leather.fours": teamPlayer1.batting.fours,
              "battingStatistic.leather.sixes": teamPlayer1.batting.sixes,

              "battingStatistic.leather.century": isCentury,
              "battingStatistic.leather.halfCentury": isHalfCentury,
              "battingStatistic.leather.out": teamPlayer1.batting.outType
                ? 1
                : 0,
              "battingStatistic.leather.innings": 1,

              "bowlingStatistic.leather.runs": teamPlayer1.bowling.runs,
              "bowlingStatistic.leather.wickets": teamPlayer1.bowling.wickets,
              "bowlingStatistic.leather.Over": teamPlayer1.bowling.currentOver,
              "bowlingStatistic.leather.maidens": teamPlayer1.bowling.maidens,
              "bowlingStatistic.leather.fours": teamPlayer1.bowling.fours,
              "bowlingStatistic.leather.sixes": teamPlayer1.bowling.sixes,
              "bowlingStatistic.leather.wides": teamPlayer1.bowling.wides,
              "bowlingStatistic.leather.noBalls": teamPlayer1.bowling.noBalls,
              "bowlingStatistic.leather.innings": 1,
            },
          },
          { new: true } // bowlingStatisticThis option returns the updated document
        );
      } else {
        let isCentury = 0;
        let isHalfCentury = 0;

        if (teamPlayer1.batting.runs >= 50 && teamPlayer1.batting.runs < 100) {
          isHalfCentury = 1;
        } else if (
          teamPlayer1.batting.runs >= 100 &&
          teamPlayer1.batting.runs < 200
        ) {
          isCentury = 1;
        } else if (
          teamPlayer1.batting.runs >= 200 &&
          teamPlayer1.batting.runs < 300
        ) {
          isCentury = 2;
        } else if (
          teamPlayer1.batting.runs >= 300 &&
          teamPlayer1.batting.runs < 400
        ) {
          isCentury = 3;
        } else if (
          teamPlayer1.batting.runs >= 400 &&
          teamPlayer1.batting.runs < 500
        ) {
          isCentury = 4;
        }

        const player1 = await Player.findByIdAndUpdate(
          teamPlayer1._id,
          {
            $inc: {
              "battingStatistic.tennis.runs": teamPlayer1.batting.runs,
              "battingStatistic.tennis.balls": teamPlayer1.batting.balls,
              "battingStatistic.tennis.fours": teamPlayer1.batting.fours,
              "battingStatistic.tennis.sixes": teamPlayer1.batting.sixes,

              "battingStatistic.tennis.century": isCentury,
              "battingStatistic.tennis.halfCentury": isHalfCentury,
              "battingStatistic.tennis.out": teamPlayer1.batting.outType
                ? 1
                : 0,
              "battingStatistic.tennis.innings": 1,

              "bowlingStatistic.tennis.runs": teamPlayer1.bowling.runs,
              "bowlingStatistic.tennis.wickets": teamPlayer1.bowling.wickets,
              "bowlingStatistic.tennis.Over": teamPlayer1.bowling.currentOver,
              "bowlingStatistic.tennis.maidens": teamPlayer1.bowling.maidens,
              "bowlingStatistic.tennis.fours": teamPlayer1.bowling.fours,
              "bowlingStatistic.tennis.sixes": teamPlayer1.bowling.sixes,
              "bowlingStatistic.tennis.wides": teamPlayer1.bowling.wides,
              "bowlingStatistic.tennis.noBalls": teamPlayer1.bowling.noBalls,
              "bowlingStatistic.tennis.innings": 1,
            },
          },
          { new: true } // This option returns the updated document
        );
      }
    }

    // Update Team 2 player data

    let Team2Players = match.scoreBoard.team2.players;

    for (const teamPlayer2 of Team2Players) {
      if (balltype == "leather") {
        let isCentury = 0;
        let isHalfCentury = 0;

        if (teamPlayer2?.batting?.runs >= 50 && teamPlayer2?.batting?.runs < 100) {
          isHalfCentury = 1;
        } else if (
          teamPlayer2?.batting?.runs >= 100 &&
          teamPlayer2?.batting?.runs < 200
        ) {
          isCentury = 1;
        } else if (
          teamPlayer2?.batting?.runs >= 200 &&
          teamPlayer2?.batting.runs < 300
        ) {
          isCentury = 2;
        } else if (
          teamPlayer2?.batting?.runs >= 300 &&
          teamPlayer2?.batting?.runs < 400
        ) {
          isCentury = 3;
        } else if (
          teamPlayer2.batting.runs >= 400 &&
          teamPlayer2.batting.runs < 500
        ) {
          isCentury = 4;
        }

        const player2 = await Player.findByIdAndUpdate(
          teamPlayer2._id,
          {
            $inc: {
              "battingStatistic.leather.runs": teamPlayer2.batting.runs,
              "battingStatistic.leather.balls": teamPlayer2.batting.balls,
              "battingStatistic.leather.fours": teamPlayer2.batting.fours,
              "battingStatistic.leather.sixes": teamPlayer2.batting.sixes,

              "battingStatistic.leather.century": isCentury,
              "battingStatistic.leather.halfCentury": isHalfCentury,
              "battingStatistic.leather.out": teamPlayer2.batting.outType
                ? 1
                : 0,

              "bowlingStatistic.leather.runs": teamPlayer2.bowling.runs,
              "bowlingStatistic.leather.wickets": teamPlayer2.bowling.wickets,
              "bowlingStatistic.leather.Over": teamPlayer2.bowling.currentOver,
              "bowlingStatistic.leather.maidens": teamPlayer2.bowling.maidens,
              "bowlingStatistic.leather.fours": teamPlayer2.bowling.fours,
              "bowlingStatistic.leather.sixes": teamPlayer2.bowling.sixes,
              "bowlingStatistic.leather.wides": teamPlayer2.bowling.wides,
              "bowlingStatistic.leather.noBalls": teamPlayer2.bowling.noBalls,

              "bowlingStatistic.leather.innings": 1,
              "battingStatistic.leather.innings": 1,
            },
          },
          { new: true } // This option returns the updated document
        );
      } else {
        let isCentury = 0;
        let isHalfCentury = 0;

        if (teamPlayer2.batting.runs >= 50 && teamPlayer2.batting.runs < 100) {
          isHalfCentury = 1;
        } else if (
          teamPlayer2.batting.runs >= 100 &&
          teamPlayer2.batting.runs < 200
        ) {
          isCentury = 1;
        } else if (
          teamPlayer2.batting.runs >= 200 &&
          teamPlayer2.batting.runs < 300
        ) {
          isCentury = 2;
        } else if (
          teamPlayer2.batting.runs >= 300 &&
          teamPlayer2.batting.runs < 400
        ) {
          isCentury = 3;
        } else if (
          teamPlayer2.batting.runs >= 400 &&
          teamPlayer2.batting.runs < 500
        ) {
          isCentury = 4;
        }

        const player1 = await Player.findByIdAndUpdate(
          teamPlayer2._id,
          {
            $inc: {
              "battingStatistic.tennis.runs": teamPlayer2.batting.runs,
              "battingStatistic.tennis.balls": teamPlayer2.batting.balls,
              "battingStatistic.tennis.fours": teamPlayer2.batting.fours,
              "battingStatistic.tennis.sixes": teamPlayer2.batting.sixes,

              "battingStatistic.tennis.century": isCentury,
              "battingStatistic.tennis.halfCentury": isHalfCentury,
              "battingStatistic.tennis.out": teamPlayer2.batting.outType
                ? 1
                : 0,

              "bowlingStatistic.tennis.runs": teamPlayer2.bowling.runs,
              "bowlingStatistic.tennis.wickets": teamPlayer2.bowling.wickets,
              "bowlingStatistic.tennis.Over": teamPlayer2.bowling.currentOver,
              "bowlingStatistic.tennis.maidens": teamPlayer2.bowling.maidens,
              "bowlingStatistic.tennis.fours": teamPlayer2.bowling.fours,
              "bowlingStatistic.tennis.sixes": teamPlayer2.bowling.sixes,
              "bowlingStatistic.tennis.wides": teamPlayer2.bowling.wides,
              "bowlingStatistic.tennis.noBalls": teamPlayer2.bowling.noBalls,

              "bowlingStatistic.tennis.innings": 1,
              "battingStatistic.tennis.innings": 1,
            },
          },
          { new: true } // This option returns the updated document
        );
      }
    }

    let totalBalls1 =
      match.scoreBoard.firstInnings.overs * 6 +
      match.scoreBoard.firstInnings.balls;
    let totalBalls2 =
      match.scoreBoard.secondInnings.overs * 6 +
      match.scoreBoard.secondInnings.balls;

    let winningteam1 = 0;
    let winningteam2 = 0;
    if (match.scoreBoard.firstInnings.battingTeam._id == winningTeamId) {
      winningteam1 = 1;
    }
    if (match.scoreBoard.secondInnings.battingTeam._id == winningTeamId) {
      winningteam2 = 1;
    }

    //if ball is leather update team data
    if (balltype == "leather") {
      const team1 = await Team.findByIdAndUpdate(
        match.scoreBoard.firstInnings.battingTeam._id,
        {
          $inc: {
            "teamMatchsData.leather.runs":
              match.scoreBoard.firstInnings.totalScore || 0,
            "teamMatchsData.leather.wins": winningteam1 || 0,
            "teamMatchsData.leather.balls": totalBalls1 || 0,
            "teamMatchsData.leather.wickets":
              match.scoreBoard.firstInnings.totalWickets || 0,
            "teamMatchsData.leather.innings": 1,
          },
        },
        { new: true } // This option returns the updated document
      );
      const team2 = await Team.findByIdAndUpdate(
        match.scoreBoard.secondInnings.battingTeam._id,
        {
          $inc: {
            "teamMatchsData.leather.runs":
              match.scoreBoard.secondInnings.totalScore || 0,
            "teamMatchsData.leather.wins": winningteam2 || 0,
            "teamMatchsData.leather.balls": totalBalls2 || 0,
            "teamMatchsData.leather.wickets":
              match.scoreBoard.secondInnings.totalWickets || 0,
            "teamMatchsData.leather.innings": 1,
          },
        },
        { new: true } // This option returns the updated document
      );
    }

    if (balltype == "tennis") {
      const team1 = await Team.findByIdAndUpdate(
        match.scoreBoard.firstInnings.battingTeam._id,
        {
          $inc: {
            "teamMatchsData.tennis.runs":
              match.scoreBoard.firstInnings.totalScore || 0,
            "teamMatchsData.tennis.wins": winningteam1 || 0,
            "teamMatchsData.tennis.overs": totalBalls1 || 0,
            "teamMatchsData.tennis.wickets":
              match.scoreBoard.firstInnings.totalWickets || 0,
            "teamMatchsData.tennis.innings": 1,
          },
        },
        { new: true } // This option returns the updated document
      );
      const team2 = await Team.findByIdAndUpdate(
        match.scoreBoard.secondInnings.battingTeam._id,
        {
          $inc: {
            "teamMatchsData.tennis.runs":
              match.scoreBoard.secondInnings.totalScore || 0,
            "teamMatchsData.tennis.wins": winningteam2 || 0,
            "teamMatchsData.tennis.overs": totalBalls2 || 0,
            "teamMatchsData.tennis.wickets":
              match.scoreBoard.secondInnings.totalWickets || 0,
            "teamMatchsData.tennis.innings": 1,
          },
        },
        { new: true } // This option returns the updated document
      );
    }

    match.status = "played";
    match.winningTeamId = winningTeamId || "";

    console.log("Current Tournament id:", tournament._id);
    const tournament_data = await RegisteredTeam.find({
      tournament: tournament._id,
      status: "Accepted",
      // isEliminated:false,
    });
    const teamorgfmc = tournament_data.map((team) => team.user.fcmToken);
    console.log("FMC Token:", teamorgfmc);

    const winnerTeamName = await Team.findById(winningTeamId).select('teamName');
    console.log("Winner Team Name:", winnerTeamName.teamName);

    // Calculate differences and determine win type of the match that will be used for 
    let winningMessage = '';
    let opponentTeam = null;

    if (match.scoreBoard.firstInnings.battingTeam._id.toString() === winningTeamId.toString()) {
      const runDifference = match.scoreBoard.firstInnings.totalScore - match.scoreBoard.secondInnings.totalScore;
      if (runDifference === 0) {
        //show nothing if match run difference is 0 or it has tie
        winningMessage = ' ';
      } else {
        winningMessage = `by ${runDifference} runs`;
      }

      opponentTeam = tournament_data.find(
        (team) => team.team._id.toString() === match.scoreBoard.secondInnings.battingTeam._id.toString()
      );
    } else {
      const wicketsRemaining = 10 - match.scoreBoard.secondInnings.totalWickets;

      winningMessage = `by ${wicketsRemaining} wicket${wicketsRemaining > 1 ? 's' : ''}`;
      opponentTeam = tournament_data.find(
        (team) => team.team._id.toString() === match.scoreBoard.firstInnings.battingTeam._id.toString()
      );
    }

    const opponentTeamName = opponentTeam ? opponentTeam.team.teamName : "Opponent";
    console.log("Opponent Team Name:", opponentTeamName);

    if (teamorgfmc) {
      const notificationData = {
        title: `Hey Participants!`,
        body: `${winnerTeamName.teamName} has won the match against ${opponentTeamName} ${winningMessage}`,
      };

      try {
        const sendNotifications = teamorgfmc.map((fcmToken) => {
          return firebaseNotification.sendNotification(fcmToken, notificationData);
        });

        await Promise.all(sendNotifications);
        console.log("Notifications sent successfully!");

      } catch (error) {
        console.error("Error sending notification:", error);
      }
    }
    await match.save();
    return true;
  },




  async teamRanking(ballType) {
    let teamsRanking;

    //teamsRanking = await Team.find().select(' _id teamLogo teamName').limit(20);

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

  async playerRanking(ballType, skill) {
    const sortingField = skill === "batting" ? `runs` : `wickets`;
    const playerRankingWithImage = await Player.aggregate([
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "userDetails",
        },
      },
      //unwind
      {
        $unwind: {
          path: "$userDetails",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          playerName: { $ifNull: ["$userDetails.fullName", ""] },
          profilePhoto: { $ifNull: ["$userDetails.profilePhoto", ""] },
          runs: { $ifNull: [`$battingStatistic.${ballType}.runs`, 0] },
          fours: { $ifNull: [`$battingStatistic.${ballType}.fours`, 0] },
          sixes: { $ifNull: [`$battingStatistic.${ballType}.sixes`, 0] },
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
                  2, // Limiting to 0 decimal places
                ],
              },
              else: 0,
            },
          },

          balls: { $ifNull: [`$battingStatistic.${ballType}.balls`, 0] },
          bowlingruns: { $ifNull: [`$bowlingStatistic.${ballType}.runs`, 0] },
          wickets: { $ifNull: [`$bowlingStatistic.${ballType}.wickets`, 0] },
          Over: { $ifNull: [`$bowlingStatistic.${ballType}.Over`, 0] },
          bowlingfours: { $ifNull: [`$bowlingStatistic.${ballType}.fours`, 0] },
          bowlingsixes: { $ifNull: [`$bowlingStatistic.${ballType}.sixes`, 0] },
          maidens: { $ifNull: [`$bowlingStatistic.${ballType}.maidens`, 0] },
          wides: { $ifNull: [`$bowlingStatistic.${ballType}.wides`, 0] },
          noBalls: { $ifNull: [`$bowlingStatistic.${ballType}.noBalls`, 0] },
          innings: { $ifNull: [`$bowlingStatistic.${ballType}.innings`, 0] },

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
                  2, // Limiting to 0 decimal places
                ],
              },
              else: 0,
            },
          },

          // profilePhoto: {
          //   $cond: {
          //     if: { $eq: [{ $size: "$userDetails" }, 0] },
          //     then: "",
          //     else: { $arrayElemAt: ["$userDetails.image", 0] },
          //   },
          // },
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
  },

  //code by DG
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

  //new
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

    // const userPlayedTournament = await Tournament.find({
    //   $or: [
    //     { user: userId },
    //     { organizer: userId },
    //     { coHostId1: userId },
    //     { coHostId2: userId }
    //   ],
    //   isDeleted: false,
    // }, {
    //   _id: 1, 
    //   tournamentStartDateTime: 1, 
    //   tournamentEndDateTime: 1,  
    //   tournamentName: 1,
    //   fees: 1,
    //   coverPhoto:1,   
    //   rules: 1, 
    // });
    // {
    //   _id: 1, 
    //   tournamentStartDateTime: 1, 
    //   tournamentEndDateTime: 1,  
    //   tournamentName: 1,
    //   ballType: 1,
    //   tournamentPrize: 1, 
    //   fees: 1,   
    //   rules: 1, 
    // });
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

    // Use filteredTournaments for further processing in matchsummary and other computations.
    const matchsummary = filteredTournaments.map(tournament => {
      const tournamentMatches = matches.filter(match =>
        match.tournament._id.toString() === tournament._id.toString()
      );

      const matchStats = tournamentMatches.map(match => {
        const team1Players = match.scoreBoard.team1.players;
        const team2Players = match.scoreBoard.team2.players;
        const playerStats = team1Players.concat(team2Players).find(player =>
          player.phoneNumber === userPhoneNumber
        );

        if (!playerStats) return null;

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

        const totalOversBowled =
          Math.floor(totalBalls / 6) + (totalBalls % 6) / 10;

        // To Calculate strike rate
        const strikeRate = playerStats.batting.balls > 0
          ? ((playerStats.batting.runs / playerStats.batting.balls) * 100).toFixed(2)
          : "0.00";

        // to Calculate economy
        // const economy = playerStats.bowling.overs > 0
        //   ? (playerStats.bowling.runs / playerStats.bowling.overs).toFixed(2)
        //   : "0.00";
        const economy =
          totalBalls > 0
            ? (playerStats.bowling.runs / (totalBalls / 6)).toFixed(2)
            : "0.00";

        return {
          matchId: match._id,
          matchDate: match.dateTime,
          against: match.team1._id === playerStats.team ? match.team2.teamName : match.team1.teamName,
          batting: {
            runs: playerStats.batting.runs || 0,
            balls: playerStats.batting.balls || 0,
            fours: playerStats.batting.fours || 0,
            sixes: playerStats.batting.sixes || 0,
            strikeRate: strikeRate
          },
          bowling: {
            // overs: playerStats.bowling.Over || 0,
            overs: totalBalls === 0 ? "0.0" : totalOversBowled.toFixed(1),
            runs: playerStats.bowling.runs || 0,
            maidens: playerStats.bowling.maidens || 0,
            wickets: playerStats.bowling.wickets || 0,
            economy: economy
          }
        };
      }).filter(Boolean);

      return {
        tournamentId: tournament._id,
        tournamentName: tournament.tournamentName,
        matches: matchStats
      };
    });

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
        team1: match.team1.teamName,
        team2: match.team2.teamName,
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
      const team1Players = match.scoreBoard.team1.players;
      const team2Players = match.scoreBoard.team2.players;

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
      const team1Players = match.scoreBoard.team1.players;
      const team2Players = match.scoreBoard.team2.players;

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


    const currentYear = new Date().getFullYear();
    const overallMatchRuns = matches.reduce((total, match) => {
      const team1Players = match.scoreBoard.team1.players;
      const team2Players = match.scoreBoard.team2.players;

      const userPerformance = team1Players.concat(team2Players).find(player => player.phoneNumber === userPhoneNumber);
      if (userPerformance && new Date(match.matchDate).getFullYear() === currentYear) {
        return total + (userPerformance.batting.runs || 0);
      }
      return total;
    }, 0);

    // Calculate overall bowling performance for the year
    const overallBowlingPerformance = matches.reduce((total, match) => {
      const team1Players = match.scoreBoard.team1.players;
      const team2Players = match.scoreBoard.team2.players;

      const userPerformance = team1Players.concat(team2Players).find(player => player.phoneNumber === userPhoneNumber);
      if (userPerformance && new Date(match.matchDate).getFullYear() === currentYear) {
        return total + (userPerformance.bowling.wickets || 0);
      }
      return total;
    }, 0);

    return { aggregatedData, matches, bestBattingPerformance, bestBowlingPerformance, latestMatchesData, userPlayedTournament };

  },


  async createChallengeMatch(data) {
    const { team1ID, team2ID, dateTime } = data;

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

    //we are checking team1 player is present in team2.

    const team1 = await Team?.findById(team1ID);
    const team2 = await Team?.findById(team2ID);

    let team1Players = team1.players;
    let team2Players = team2.players;

    // Function to check if any player from `team2` is present in `team1`
    function isPlayerPresentInTeam2(team1Players, team2Players) {
      // Extracting the array of player phoneNumber from `team1`
      const team1PlayerIds = team1Players.map((player) => player.phoneNumber);

      for (const player of team2Players) {
        if (team1PlayerIds.includes(player.phoneNumber)) {
          console.log(
            `Player with  ${player.phoneNumber} is present in both Team `
          );
          throw CustomErrorHandler.alreadyExist(
            `Player with  Phone Number ${player.phoneNumber} present in both Team `
          );
          //return true;
        }
      }
      return false; // No player from `team2` is present in `team1`
    }

    // Call the function passing `team1` and `team2` as arguments
    const isPlayerPresent = isPlayerPresentInTeam2(team1Players, team2Players);

    // Create a new instance of the Match model
    const newMatch = new ChallengeTeam({
      team1: team1ID,
      team2: team2ID,
      captain1: userInfo.userId,
      captain2: teamData.userId,
      challengedBy: userInfo.userId,
      // dateTime: dateTime,
    });

    // Save the new Match and wait for the operation to complete
    const matchdata = await newMatch.save();
    return matchdata;
  },

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

  async updateChallengeMatch(matchId, status) {
    const MatchExist = await ChallengeTeam.findById(matchId);

    MatchExist.status = status;

    return await MatchExist.save();
  },

  async updateChallengeScoreBoard(data, MatchId) {
    // const userInfo = global.user;

    // Find the tournament by ID
    const match = await ChallengeTeam.findById(MatchId);

    if (!match) {
      // Handle the case where the tournament is not found
      throw CustomErrorHandler.notFound("Match Not Found");
    }
    match.scoreBoard = data.scoreBoard;

    // Save the updated user document
    let matchData = await match.save();
    return matchData;
  },

  async finishChallengeMatch(MatchId, winningTeamId) {
    // const userInfo = global.user;
    // Find the tournament by ID
    const match = await ChallengeTeam.findById(MatchId);
    if (!match) {
      // Handle the case where the tournament is not found
      throw CustomErrorHandler.notFound("Match Not Found");
    }
    match.winningTeamId = winningTeamId;
    // Save the updated user document
    let matchData = await match.save();
    return matchData;
  },

  async getChallengeMatchPerformance(MatchId) {
    const userInfo = global.user;
    const MatchExist = await ChallengeTeam.findById(MatchId);

    if (!MatchExist) {
      throw CustomErrorHandler.notFound("This Match is Not Found.");
    }

    const user = await User.findById(userInfo.userId);
    const phoneNumberToFind = user.phoneNumber;

    const team1 = MatchExist.scoreBoard.team1.players.filter((player) => {
      return player.phoneNumber === phoneNumberToFind;
    });

    const team2 = MatchExist.scoreBoard.team2.players.filter((player) => {
      return player.phoneNumber === phoneNumberToFind;
    });

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
    console.log("battingStats", battingStats);
    console.log("BowlingStats", bowlingStats);
    return {
      batting: battingStats,
      bowling: bowlingStats
    };
  },

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
