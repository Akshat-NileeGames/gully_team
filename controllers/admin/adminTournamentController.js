
import { tournamentServices } from "../../services/index.js";

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

const adminTournamentController = {
  
    async getAllTournament(req, res, next) {

    
        const page = parseInt(req.params.page) || 1;    // Get the requested page from query parameters (default to page 1)
        const pageSize = parseInt(req.params.pageSize); // Set the number of documents per page
    
        // Calculate the number of documents to skip based on the requested page
        const skip = (page - 1) * pageSize;

        const search = req.query.search || "";
    
        try {
          const result = await tournamentServices.getAllTournament(pageSize,skip,search);
    
          return res.status(200).json({
            sucess: true,
            status: true,
            message: "Organizer data Retrived SucessFully",
            data: result.data,
            count: result.count,
          });
        } catch (err) {
          console.log(" Error in getAllOrganizer ");
          return next(err);
        }
      },

      async getAllTournamentLive(req, res, next) {
        const page = parseInt(req.params.page) || 1;    // Get the requested page from query parameters (default to page 1)
        const pageSize = parseInt(req.params.pageSize); // Set the number of documents per page
    
        // Calculate the number of documents to skip based on the requested page
        const skip = (page - 1) * pageSize;
    
        try {
          const result = await tournamentServices.getAllTournamentLive(pageSize,skip);
    
          return res.status(200).json({
            sucess: true,
            status: true,
            message: "Organizer data Retrived SucessFully",
            data: result.data,
            count: result.count,
          });
        } catch (err) {
          console.log(" Error in getAllOrganizer ");
          return next(err);
        }
      },

      async getTournamentById(req, res, next) {
        const Id = req.params.Id;
        try {
          const result = await tournamentServices.getTournamentById(Id);
    
          return res.status(200).json({
            sucess: true,
            status: true,
            message: "Organizer data Retrived SucessFully",
            data: result,
          });
        } catch (err) {
          console.log(" Error in getATournamentById ");
          return next(err);
        }
      },

      async getMatchesByTournamentId(req, res, next) {
        const TournamentId = req.params.TournamentId;
        try {
          const result = await tournamentServices.getMatchesByTournamentId(TournamentId);
    
          return res.status(200).json({
            sucess: true,
            status: true,
            message: "Matches data Retrived SucessFully",
            data: result,
          });
        } catch (err) {
          console.log(" Error in getMatchesByTournamentId ");
          return next(err);
        }
      },

      async updateTournamentById(req, res, next) {
        const Id = req.params.Id;
        try {
          const result = await tournamentServices.updateTournamentById(Id,req.body);

          return res.status(200).json({
            sucess: true,
            status: true,
            message: "Organizer data Edited SucessFully",
            data: result,
          });
        } catch (err) {
          console.log(" Error in updateTournamentById ");
          return next(err);
        }
      },
      async getMatchesHistoryByTournamentId(req, res, next) {
        const TournamentId = req.params.TournamentId;
        try {
          const result = await tournamentServices.getMatchesHistoryByTournamentId(TournamentId);
    
          return res.status(200).json({
            sucess: true,
            status: true,
            message: "Matches data Retrived SucessFully",
            data: result,
          });
        } catch (err) {
          console.log(" Error in getMatchesHistoryByTournamentId ");
          return next(err);
        }
      },

      

};

export default adminTournamentController;