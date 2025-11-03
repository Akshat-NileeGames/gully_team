import Joi from "joi";
import { SponsorService } from "../services/index.js";
import CustomErrorHandler from "../helpers/CustomErrorHandler.js";


/**
 * ============================================================================
 * Controller Layer — General Structure and Conventions
 * ============================================================================
 *
 * Overview:
 * ----------
 * This controller is responsible for handling HTTP requests and responses.
 * Each handler performs the following core tasks:
 *   1. Validates incoming request data using Joi or other validators.
 *   2. Delegates core business logic to the appropriate Service layer.
 *   3. Returns standardized JSON responses or forwards errors to middleware.
 *
 * Standard Response Format:
 *   • Success → { success: true, message: string, data: any }
 *   • Errors  → Managed centrally via CustomErrorHandler + Express middleware.
 *
 * ============================================================================
 * Developer Notes (Conventions Used Across Controllers)
 * ============================================================================
 *
 * ➤ Async Handlers:
 *   - Always declared as `async` (due to I/O operations like DB/service calls).
 *   - Wrap logic in `try/catch` blocks.
 *   - On failure, forward errors using `next(CustomErrorHandler.*)` so centralized
 *     middleware handles logging, formatting, and response codes.
 *   - Always return a response or call `next()` to properly end the request lifecycle.
 *   - Keep controllers thin and side-effect free → validate → call service → respond.
 *
 * ➤ Joi Validation:
 *   - Use: `const { error, value } = schema.validate(req.<source>);`
 *   - For user-friendly messages: 
 *       `error.details.map(d => d.message).join(', ')`
 *   - Forward validation errors via:
 *       `return next(CustomErrorHandler.badRequest(error.details.map(e => e.message).join(', ')))`
 *   - Avoid sending raw Joi error objects to clients.
 *
 * ➤ CustomErrorHandler (Usage Conventions):
 *   - Common methods: `badRequest(message, err?)`, `validationError(message)`, `serverError(message, err?)`.
 *   - Prefer forwarding errors using `next(CustomErrorHandler.badRequest(...))` 
 *     instead of returning raw error objects.
 *   - Some legacy patterns call `CustomErrorHandler.validationError(...)` directly;
 *     update these to use `next(...)` for proper middleware flow.
 *   - Keep messages concise and avoid exposing internal or sensitive data.
 *
 * ➤ Retrieving User Context:
 *   - Preferred: `req.user` (set by authentication middleware).
 *   - Legacy: `global.user` may still exist in older modules (e.g., slot management).
 *   - Always validate the presence of `userId` before use.
 *   - Migrate legacy flows to `req.user` during refactors.
 *
 * ➤ Response Shape:
 *   - Success responses follow:
 *       { success: true, message: string, data: any }
 *   - All errors are propagated to centralized middleware via `next(CustomErrorHandler.*)`.
 *
 * ============================================================================
 * Purpose:
 * ----------
 * This structure ensures:
 *   • Consistency across all controller implementations.
 *   • Predictable and maintainable request handling.
 *   • Clear separation of concerns between controllers and services.
 *   • Scalable and debuggable backend architecture.
 * ============================================================================
 */

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
      return CustomErrorHandler.validationError(`Failed to Validate body:${error}`)
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