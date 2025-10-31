import Banner from '../models/Promotional_Banner_model.js';
import Tournament from '../models/tournament.js';
import ImageUploader from '../helpers/ImageUploader.js';
import { PromotionalbannerService } from "../services/index.js";
import Joi from "joi";
import CustomErrorHandler from '../helpers/CustomErrorHandler.js';
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
        console.log(req.body);
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