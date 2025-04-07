import { ShopService } from "../services/index.js";
import Joi from "joi";
const ShopController = {

    //#region Add Shop
    async addShop(req, res, next) {

        const shopSchema = Joi.object({
            shopImage: Joi.array().items(Joi.string()).max(3).required(),
            shopName: Joi.string().required(),
            shopDescription: Joi.string().required(),
            shopLocation: Joi.string().required(),
            longitude: Joi.number().required(),
            latitude: Joi.number().required(),
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
            const result = await ShopService.addShop(req.body);
            return res.status(200).json({
                success: true,
                message: "Shop Created Successfully",
                data: result,
            });
        } catch (error) {

        }
    },
    //#endregion

    //#region GetMySHop
    async getMyShop(req, res, next) {
        try {
            const result = await ShopService.getMyShop();
            return res.status(200).json({
                success: true,
                message: "My Shop Retrieved Successfully",
                data: result,
            });
        } catch (err) {
            console.log("Failed to get My shop:", err);
        }
    },
    //#endregion

    //#region GetNearbyShop
    async GetNearbyShop(req, res, next) {
        const shopSchema = Joi.object({
            latitude: Joi.number().required(),
            longitude: Joi.number().required(),
        });
        const { error } = shopSchema.validate(req.body);
        if (error) {
            return next(error);
        }
        try {
            const result = await ShopService.getNearbyShop(req.body);
            return res.status(200).json({
                success: true,
                message: "Nearby Shop Retrieved Successfully",
                data: result,
            });
        } catch (err) {
            console.log("Failed to get Nearby Shop:", err);
        }
    },
    //#endregion

    //#region AddProduct
    async AddProduct(req, res, next) {
        const product = Joi.object({
            productsImage: Joi.array().items(Joi.string()).max(3).required(),
            productName: Joi.string().required(),
            productsDescription: Joi.string().required(),
            productsPrice: Joi.number().required(),
            productCategory: Joi.string().required(),
            productBrand: Joi.string().required(),
            shopId: Joi.string().required()
        });
        const { error } = product.validate(req.body);
        if (error) {
            return next(error);
        }
        try {
            const result = await ShopService.AddProduct(req.body);
            return res.status(200).json({
                success: true,
                message: "Product Added Successful",
                data: result,
            });
        } catch (error) {
            console.log("Unable to add product:", error);
        }
    },
    //#endregion

    //#region GetShopProduct
    async getShopProduct(req, res, next) {
        const shopSchema = Joi.object({
            shopId: Joi.string().required(),
        });
        const { error } = shopSchema.validate(req.params);
        if (error) {
            return next(error);
        }
        try {
            const result = await ShopService.getShopProduct(req.params);
            return res.json({
                success: true,
                message: "Shop Product Fetch Successfully",
                data: result
            });
        } catch (error) {
            console.log("Unable to fetch Shop Product:", error);
        }
    },

    //#endregion

    //#region setProductActiveStatus
    async setProductActiveStatus(req, res, next) {
        const productSchema = Joi.object({
            productId: Joi.string().required(),
            isActive: Joi.boolean().required()
        });
        const { error } = productSchema.validate(req.body);
        if (error) {
            return next(error);
        }
        try {
            const result = await ShopService.setProductActiveStatus(req.body);
            return res.json({
                success: true,
                message: "Your Product Active Status Changed",
                data: result
            })
        } catch (error) {
            console.log("Unable to change Product Active Status: ", error);
        }
    },

    //#endregion

    //#region Search
    async search(req, res, next) {
        const searchQuery = req.query.q;
        if (!searchQuery) {
            return res.status(400).json({
                success: false,
                message: "Search query is required."
            });
        }
        try {
            const { shops, products } = await ShopService.searchShopsAndProducts(searchQuery);

            return res.status(200).json({
                success: true,
                message: "Search results fetched successfully.",
                data: { shops, products }
            });
        } catch (err) {
            return next(err);
        }
    },
    //#endregion

    //#region GetSpecificProduct
    async getSpecificProduct(req, res, next) {
        const productSchema = Joi.object({
            productId: Joi.string().required()
        });
        const { error } = productSchema.validate(req.params);
        if (error) {
            return next(error);
        }
        try {
            const result = await ShopService.getSpecificProduct(req.params);
            return res.json({
                success: true,
                message: "Product Retrieved Successfully",
                data: result
            });
        } catch (error) {
            console.log("Unable to fetch Product:", error);
        }
    },
    //#endregion

    //#region addCategory
    async addCategory(req, res, next) {
        const categorySchema = Joi.object({
            categoryfor: Joi.string().required(),
            items: Joi.array().items(Joi.string().min(3).required()).required()
        });
        
        const { error } = categorySchema.validate(req.body);
        if (error) {
            return next(error);
        }
        try {
            const result = await ShopService.addCategory(req.body);
            return res.json({
                success: true,
                message: "Category Added Successfully",
                data: result
            })
        } catch (error) {
            console.log("unable to add Category: ", error);
        }
    },
    //#endregion

    //#region GetCategory
    async getCategory(req, res, next) {
        try {
            const result = await ShopService.getCategory();
            return res.json({
                success: true,
                message: "Category Retrieved Successfully",
                data: result
            })
        } catch (error) {
            console.log("Unable to fetch Category:", error);
        }
    },
    //#endregion
}
export default ShopController;