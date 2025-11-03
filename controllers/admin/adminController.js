import Joi from "joi";
import CustomErrorHandler from "../../helpers/CustomErrorHandler.js";
import { Admin } from "../../models/index.js";
import { adminService, userServices, teamServices } from "../../services/index.js";
import randomstring from "randomstring";
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



const adminController = {
  async adminLogin(req, res, next) {
    //validation
    const AdminSchema = Joi.object({
      email: Joi.string().min(3).max(30).required(),
      password: Joi.string().min(3).max(100).required(),
    });

    const { error } = AdminSchema.validate(req.body);

    if (error) {
      return next(error);
    }
    try {

      const result = await adminService.adminLogin(req.body);

      return res.status(200).json({
        sucess: true,
        status: true,
        message: "Admin Login suessfully",
        data: result,
      });
    } catch (err) {
      console.log("Error in adminLogin");
      return next(err);
    }
  },

  async resetPassword(req, res, next) {

    let token = req.params.token;

    //validation
    const AdminSchema = Joi.object({
      password: Joi.string().min(3).max(30).required(),
      confirmpassword: Joi.string().min(3).max(100).required().valid(Joi.ref('password')).messages({
        'any.only': 'Passwords must match',
      }),
    });

    const { error } = AdminSchema.validate(req.body);

    if (error) {
      return next(error);
    }
    try {

      const result = await adminService.resetPassword(req.body, token);

      return res.status(200).json({
        sucess: true,
        status: true,
        message: "Reset Password suessfully",
        data: result,
      });
    } catch (err) {
      console.log("Error in resetPassword");
      return next(err);
    }
  },

  async sendMailForgotPassword(req, res, next) {
    //validation
    const AdminSchema = Joi.object({
      email: Joi.string().min(3).max(30).required(),
    });

    const { error } = AdminSchema.validate(req.body);

    if (error) {
      return next(error);
    }
    try {

      const email = req.body.email;
      const userData = await Admin.findOne({ email });

      if (userData) {

        const randomString = randomstring.generate();
        userData.tokens = randomString;
        await userData.save();

      }

      const userFor = "forgotPassword"

      const result = await adminService.sendMail(userFor, userData.email, userData.name, userData.tokens);

      return res.status(200).json({
        sucess: true,
        status: true,
        message: "Mail send  suessfully",
      });
    } catch (err) {
      console.log("Error in sendMailForgotPassword");
      return next(err);
    }
  },

  async update(req, res, next) {

    let Id = req.params.Id;

    try {

      const result = await adminService.Forceupdate(req.body, Id);

      return res.status(200).json({
        sucess: true,
        status: true,
        message: "Data Updated update",
        data: result,
      });
    } catch (err) {
      console.log("Error in update");
      return next(err);
    }
  },

  async getupdate(req, res, next) {

    let Id = req.params.Id;

    try {

      const result = await adminService.getForceupdate(Id);

      return res.status(200).json({
        sucess: true,
        status: true,
        message: "ForceUpdate Data Retrieved Successfully",
        data: result,
      });
    } catch (err) {
      console.log("Error in update");
      return next(err);
    }
  },

  async dashboard(req, res, next) {
    try {
      const totalUserCount = await userServices.getUserCount();
      const totalOrganizerCount = await userServices.getOrganizerCount();
      const totalTeamCount = await teamServices.getTeamCount();
      // const totalUserCount = await userServices.getUserCount();
      // const totalUserCount = await userServices.getUserCount();
      return res.status(200).json({
        sucess: true,
        status: true,
        message: "DashBoard Data Retrieved Successfully",
        data: {
          totalUserCount,
          totalOrganizerCount,
          totalTeamCount
        },
      });
    } catch (err) {
      console.log("Error in dashboard");
      return next(err);
    }
  },


};

export default adminController;