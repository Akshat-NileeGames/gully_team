import { ShopService } from "../services/index.js";
import Joi from "joi";
const ShopController = {

    async addShop(req, res, next) {

        const shopSchema = Joi.object({
            shopImage: Joi.array().items(Joi.string()).max(3).required(),
            shopName: Joi.string().required(),
            shopDescription: Joi.string().required(),
            shopLocation: Joi.string().required(),
            locationHistory: Joi.object({
                point: Joi.object({
                    type: Joi.string().valid("Point").default("Point").required(),
                    coordinates: Joi.array().items(Joi.number()).required()
                })
            }),
            shopContact: Joi.string().required(),
            shopEmail: Joi.string().email().pattern(new RegExp('^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$')).required(),
            shoplink: Joi.string().optional(),
            businessLicenseNumber: Joi.string().pattern(new RegExp('^[A-Za-z0-9-]+$')).required(),
            gstNumber: Joi.string().pattern(new RegExp('^[0-9]{15}$')).required(),
            ownerName: Joi.string().required(),
            ownerContact: Joi.string().required(),
            ownerEmail: Joi.string().email().pattern(new RegExp('^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$')).required(),
            ownerAddress: Joi.string().required(),
            ownerIdentificationNumber: Joi.string().required(),
        });
        const { error } = shopSchema.validate(req.body)
        if (error) {
            return next(error);
        }
        try {
            const result =await ShopService.addShop(req.body);
            return res.status(200).json({
                success: true,
                message: "Shop Created Successfully",
                data: result,
            });
        } catch (error) {
            
        }
    }
}
export default ShopController;