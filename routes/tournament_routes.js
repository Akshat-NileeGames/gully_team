import express from "express";

const router = express.Router();

import { tournamentController, SponsorController } from "../controllers/index.js";
import validateUser from "../middlewares/validateUser.js";

//CRUD operation Tournament
router.post("/createTournament", validateUser, tournamentController.createTournament);

router.put("/editTournament/:id", validateUser, tournamentController.editTournament);

router.post("/getTournament", validateUser, tournamentController.getTournament);

router.post("/setSponsor", validateUser, tournamentController.setSponsor);
router.get("/getTournamentById/:tournamentId", validateUser, tournamentController.getTournamentById);

router.get("/search/", validateUser, tournamentController.getTournamentByName);

router.delete("/deleteTournament/:Id", validateUser, tournamentController.deleteTournament);

// //get Current tournament for  organizer
router.get("/getCurrentTournament", validateUser, tournamentController.getCurrentTournament);
//get all tournament for  organizer
router.get("/getAllTournament", validateUser, tournamentController.getAllTournament);

//get Current tournament for  organizer
//Todo:Not used Api
router.get("/getTournamentByUser", validateUser, tournamentController.getTournamentByUser);

//request functionality.
router.get("/pendingTeamRequest/:tournamentID", validateUser, tournamentController.pendingTeamRequest);

router.get("/rejectedTeamRequest/:tournamentID", validateUser, tournamentController.rejectedTeamRequest);

router.get("/acceptedTeamRequest/:tournamentID", validateUser, tournamentController.acceptedTeamRequest);

router.post("/updateTeamRequest/:tournamentID/:teamID/:action", validateUser, tournamentController.updateTeamRequest);

router.post("/entryForm/:teamID/:tournamentID", validateUser, tournamentController.entryForm);

router.get("/getCount", validateUser, tournamentController.getCount);

router.post("/updateAuthority", validateUser, tournamentController.updateAuthority);

router.post("/eliminate-team/:tournamentId", validateUser, tournamentController.eliminateTeams);

router.get("/getEliminatedTeams/:tournamentId", validateUser, tournamentController.getEliminatedTeams);


//Sponsor 
router.post("/sponsor/addSponsor", validateUser, SponsorController.addSponsor);
router.get("/sponsor/getSponsor/:tournamentId", SponsorController.getSponsor);

router.post("/sponsor/editSponsor/:sponsorId", validateUser, SponsorController.editSponsor);
router.delete("/sponsor/deleteSponsor/:sponsorId", validateUser, SponsorController.deleteSponsor);
//It is used to show sponsors to user 
router.get("/sponsor/getSponsorsForTournament/:tournamentId", validateUser, SponsorController.getSponsorsForTournament);

export default router;
