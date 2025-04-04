import Banner from '../models/Promotional_Banner_model.js';
import Tournament from '../models/tournament.js';
import ImageUploader from '../helpers/ImageUploader.js';
import { PromotionalbannerService } from "../services/index.js";
import Joi from "joi";
import CustomErrorHandler from '../helpers/CustomErrorHandler.js';
const PromotionalbannerController = {
    
    async createBanner(req,res,next){

        const banner_schema=Joi.object({
            banner_title:Joi.string().required(),
            banner_image:Joi.string().required(),
            startDate: Joi.date().iso().required(),
            endDate: Joi.date().iso().min(Joi.ref("startDate")).required(),
            bannerlocationaddress:Joi.string().required(),
            longitude: Joi.number().required(),
            latitude: Joi.number().required(),
            packageId:Joi.string().required(),
        });
        const{error}=banner_schema.validate(req.body)
        if(error){
           return next(err);
        }
        try{
            const result=await PromotionalbannerService.createBanner(req.body);
            return res.status(200).json({
                success: true,
                message: "Banner  Created Successfully",
                data: result,
              });
        }catch(err){
            console.log("Unable to create Banner:",err)
        }
    },

    async getmybanner(req,res,next){

        try{
            const result=await PromotionalbannerService.getbanner();
            return res.status(200).json({
                success: true,
                message: "Banner  Created Successfully",
                data: {Banners:result},
              });
        }catch(err){
            console.log("Error in getting my banner: ",err)
        }
    },


    async getBannersNearby(req, res, next) {
        const { latitude, longitude, desiredBannerCount } = req.body;

        if (!latitude || !longitude) {
            return res.status(400).json({
                success: false,
                message: "Latitude and longitude are required"
            });
        }

        try {
            const result = await PromotionalbannerService.getBannersWithinRadius(
                latitude,
                longitude
            );

            return res.status(200).json({
                success: true,
                message: "Banners fetched successfully",
                data: {
                    banners: result.banners
                }
            });
        } catch (err) {
            console.log("Error in fetching nearby banners:", err);
            return res.status(500).json({
                success: false,
                message: "An error occurred while fetching banners",
                error: err.message
            });
        }
    },

    async editBanner(req, res) {
        const bannerId = req.params.id;
        const bannerSchema = Joi.object({
            banner_title:Joi.string().required(),
            banner_image:Joi.string().optional()
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