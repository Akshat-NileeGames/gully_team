import express from "express";
const router = express.Router();
import { teamController } from "../controllers/index.js";
import validateUser from "../middlewares/validateUser.js";

router.get("/getTeam/:Id", validateUser, teamController.getTeamById);

// router.get("/getAllTeam", validateUser, teamController.getAllTeams);

router.get("/getUsersAllTeam", validateUser, teamController.getUserTeams);
router.get('/player-teams', validateUser, teamController.getPlayerTeams);

// router.get("/getPlayerTeams", validateUser, teamController.getPlayerTeams);
router.post("/createTeam", validateUser, teamController.createTeam);

router.post("/editTeam/:Id", validateUser, teamController.editTeam);

router.post("/addPlayer/:Id", validateUser, teamController.addPlayer);

router.delete('/deletePlayer/:teamId/:playerId', teamController.deletePlayer);

router.put('/changeCaptain/:teamId', validateUser, teamController.changeCaptain);

// router.post("/deletePlayer/:teamId/:playerId", validateUser,teamController.deletePlayer);

router.post("/addLookingFor", validateUser, teamController.addLookingFor);

router.post("/getAllLooking", validateUser, teamController.getAllLooking);

router.delete("/deleteLookingFor/:lookingId",validateUser,teamController.deleteLookingFor);

router.get("/getLookingByID", validateUser, teamController.getLookingByID);

router.post("/getAllNearByTeam", validateUser, teamController.getAllNearByTeam);

router.get("/pointsTable/:tournamentId", validateUser, teamController.getPointsTable);


export default router;
