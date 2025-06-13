import Joi from "joi";
import { SponsorService } from "../services/index.js";

const SponsorController = {

  async addSponsor(req, res, next) {
    const sponsor_schema = Joi.object({
      sponsorMedia: Joi.string().required(),
      sponsorName: Joi.string().required(),
      sponsorDescription: Joi.string().optional(),
      sponsorUrl: Joi.string().optional(),
      tournamentId: Joi.string().optional(),
      isVideo: Joi.boolean().required()
    });

    const { error } = sponsor_schema.validate(req.body);
    if (error) {
      return next(error);
    }
    try {
      const result = await SponsorService.addSponsor(req.body);
      return res.status(200).json({
        success: true,
        message: "Sponsor Added Successfully",
        data: result,
      });
    } catch (err) {
      console.log("Failed to add Sponsor:", err);

    }

  },

  async getSponsor(req, res, next) {
    const { tournamentId } = req.params;

    try {
      const sponsor = await SponsorService.getSponsor(tournamentId);
      if (!sponsor) {
        return res.status(404).json({
          success: false,
          message: "Sponsor not found",
        });
      }
      return res.status(200).json({
        success: true,
        message: "Sponsor Retrived Successfully",
        data: { mySponsor: sponsor },
      });
    } catch (err) {
      console.log("Failed to get Sponsor:", err);
      return next(err);
    }
  },



  async editSponsor(req, res, next) {
    const { sponsorId } = req.params;
    // const sponsor_schema = Joi.object({
    //   sponsorDescription: Joi.string().optional(),
    //   sponsorUrl: Joi.string().optional(),
    // });

    // const { error } = sponsor_schema.validate(req.body);
    // if (error) {
    //   return next(error);
    // }

    try {
      const result = await SponsorService.editSponsor(sponsorId, req.body);
      return res.status(200).json({
        success: true,
        message: "Sponsor Updated Successfully",
        data: result,
      });
    } catch (err) {
      console.log("Failed to edit Sponsor:", err);
      return next(err);
    }
  },

  async deleteSponsor(req, res, next) {
    const { sponsorId } = req.params;

    try {
      const result = await SponsorService.deleteSponsor(sponsorId);
      return res.status(200).json({
        success: true,
        message: "Sponsor Deleted Successfully",
        data: result,
      });
    } catch (err) {
      console.log("Failed to delete Sponsor:", err);
      return next(err);
    }
  },


  async getSponsorsForTournament(req, res, next) {
    const { tournamentId } = req.params;

    try {
      const sponsors = await SponsorService.getSponsorsForTournament(tournamentId);
      return res.status(200).json({
        success: true,
        message: "Sponsor Retrived Successfully",
        data: { Sponsor: sponsors },
      });
    } catch (err) {
      console.log("Failed to get Sponsors for Tournament:", err);
      return next(err);
    }
  },


}

export default SponsorController;