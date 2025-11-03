import Banner from '../models/Promotional_Banner_model.js';
import Tournament from '../models/tournament.js';
import ImageUploader from '../helpers/ImageUploader.js';
import { PromotionalbannerService } from "../services/index.js";
import Joi from "joi";
import CustomErrorHandler from '../helpers/CustomErrorHandler.js';

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

const PromotionalbannerController = {

    async createBanner(req, res, next) {

        const banner_schema = Joi.object({
            banner_title: Joi.string().required(),
            banner_image: Joi.string().required(),
            startDate: Joi.date().iso().required(),
            endDate: Joi.date().iso().min(Joi.ref("startDate")).required(),
            bannerlocationaddress: Joi.string().required(),
            longitude: Joi.number().required(),
            latitude: Joi.number().required(),
            packageId: Joi.string().required(),
            bannerforsports: Joi.string().required(),
        });
        const { error } = banner_schema.validate(req.body);
        if (error) return next(CustomErrorHandler.validationError(`Provide Proper request body:${error}`));
        try {
            const result = await PromotionalbannerService.createBanner(req.body);
            return res.status(200).json({
                success: true,
                message: "Banner  Created Successfully",
                data: result,
            });
        } catch (err) {
            console.log("Unable to create Banner:", err)
        }
    },

    async getmybanner(req, res, next) {

        try {
            const result = await PromotionalbannerService.getbanner();
            return res.status(200).json({
                success: true,
                message: "Banner  Created Successfully",
                data: { Banners: result },
            });
        } catch (err) {
            console.log("Error in getting my banner: ", err)
        }
    },


    async getBannersNearby(req, res, next) {
        const banner = Joi.object({
            longitude: Joi.number().required(),
            latitude: Joi.number().required(),
            bannerforsports: Joi.string().required(),
        });
        const { error } = banner.validate(req.body);
        if (error) return next(CustomErrorHandler.validationError(`Provide Proper request body:${error}`));
        try {
            const result = await PromotionalbannerService.getBannersWithinRadius(req.body);
            return res.status(200).json({
                success: true,
                message: "Banners fetched successfully",
                data: {
                    banners: result
                }
            });
        } catch (err) {
            console.log("Error in fetching nearby banners:", err);
        }
    },

    async editBanner(req, res) {
        const bannerId = req.params.id;
        const bannerSchema = Joi.object({
            banner_title: Joi.string().required(),
            banner_image: Joi.string().optional()
        });

        const { error } = bannerSchema.validate(req.body);
        if (error) {
            return CustomErrorHandler.badRequest(error.message);
        }
        try {
            const result = await PromotionalbannerService.updateBanner(bannerId, req.body);
            return res.status(200).json({
                success: true,
                message: 'Banner updated successfully',
                data: result,
            });
        } catch (err) {
            console.log("Error in updating banner:", err);
        }
    },

};

export default PromotionalbannerController;