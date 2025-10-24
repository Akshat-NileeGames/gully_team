import express from "express";

const router = express.Router();

import { matchController } from "../controllers/index.js";
import validateUser from "../middlewares/validateUser.js";

router.post("/createMatch", validateUser, matchController.createMatch);
router.get("/getMatches/:tournamentId", matchController.getMatches);
router.get("/getMatch/:matchId", matchController.getSingleMatch);
// router.get("/editMatch/:matchId", matchController.editMatch);
router.put("/editMatch/:matchId", validateUser, matchController.editMatch); 
router.delete("/deleteMatch/:matchId", validateUser, matchController.deleteMatch);

router.get("/getOpponentTournamentId", validateUser, matchController.getOpponentTournamentId);

router.get("/getOpponent/:tournamentId/:teamId", validateUser, matchController.getOpponent);

router.get("/getOpponentOld/:tournamentId/:teamId", validateUser, matchController.getOpponentOld,);

router.post("/updateScoreBoard/:matchId", validateUser, matchController.updateScoreBoard);

router.post("/updateTeamMatchsData", validateUser, matchController.updateTeamMatchsData);
router.post("/updateFootballMatchData", validateUser, matchController.updateFootballMatchData);

router.get("/teamRanking/:ballType", validateUser, matchController.teamRanking);
router.get("/footballteamRanking", validateUser, matchController.getFootballTeamRankings);

router.get("/playerRanking/:ballType/:skill", validateUser, matchController.playerRanking);
router.get("/footballplayerRanking/:category", validateUser, matchController.footballplayerRanking)

router.post("/topPerformers", validateUser, matchController.topPerformers);
router.post("/footballtopPerformers", validateUser, matchController.getFootballTopPerformers);

//nikhil
// router.get(
//   "/myPerformance/:id/:category/:matchType",
//   validateUser,
//   matchController.myPerformance,
// );

//DG
router.post("/myPerformance/:userId", validateUser, matchController.myPerformance);
router.get("/getmyFootballPerformance/:userId", validateUser, matchController.getFootballPerformance);

// to create challenge match
router.post("/createChallengeMatch", validateUser, matchController.createChallengeMatch);

router.get("/getChallengeMatch", validateUser, matchController.getChallengeMatch);

//to chnage the status of challenge match eg. pending, Accepted,Denied
router.post("/updateChallengeMatch/:matchId/:status", validateUser, matchController.updateChallengeMatch);

// to update score board of challenge match
router.post("/updateChallengeScoreBoard/:matchId", validateUser, matchController.updateChallengeScoreBoard);

router.get("/getChallengeMatchPerformance/:matchId", validateUser, matchController.getChallengeMatchPerformance);
router.get("/getFootballChallengePerformance/:matchId", validateUser, matchController.getFootballChallengePerformance);

router.post("/finishChallengeMatch/", validateUser, matchController.finishChallengeMatch);

export default router;
