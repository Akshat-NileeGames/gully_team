import CustomErrorHandler from "../helpers/CustomErrorHandler.js";
import category from "../models/category.js";
import { ShopService } from "../services/index.js";
import Joi from "joi";
const ShopController = {

    //#region Add Shop
    async addShop(req, res, next) {
        const shopSchema = Joi.object({
            shopImage: Joi.array().items(Joi.string()).min(1).max(3).required(),
            shopName: Joi.string().required(),
            shopDescription: Joi.string().required(),
            shopAddress: Joi.string().required(),
            selectLocation: Joi.string().required(),
            longitude: Joi.number().required(),
            latitude: Joi.number().required(),
            shopContact: Joi.string().required(),
            shopEmail: Joi.string().email().required(),
            // LicenseNumber: Joi.string().pattern(/^[A-Za-z0-9-]+$/).required(),
            // gstNumber: Joi.string().pattern(/^[0-9]{15}$/).required(),
            ownerName: Joi.string().required(),
            ownerPhoneNumber: Joi.string().required(),
            ownerEmail: Joi.string().email().required(),
            ownerAddress: Joi.string().required(),
            ownerPanNumber: Joi.string().required(),
            aadharFrontSide: Joi.string().required(),
            aadharBackSide: Joi.string().required(),

            shopTiming: Joi.object().keys({
                Monday: Joi.object({
                    isOpen: Joi.boolean().required(),
                    openTime: Joi.string().optional(),
                    closeTime: Joi.string().optional(),
                }),
                Tuesday: Joi.object({
                    isOpen: Joi.boolean().required(),
                    openTime: Joi.string().optional(),
                    closeTime: Joi.string().optional(),
                }),
                Wednesday: Joi.object({
                    isOpen: Joi.boolean().required(),
                    openTime: Joi.string().optional(),
                    closeTime: Joi.string().optional(),
                }),
                Thursday: Joi.object({
                    isOpen: Joi.boolean().required(),
                    openTime: Joi.string().optional(),
                    closeTime: Joi.string().optional(),
                }),
                Friday: Joi.object({
                    isOpen: Joi.boolean().required(),
                    openTime: Joi.string().optional(),
                    closeTime: Joi.string().optional(),
                }),
                Saturday: Joi.object({
                    isOpen: Joi.boolean().required(),
                    openTime: Joi.string().optional(),
                    closeTime: Joi.string().optional(),
                }),
                Sunday: Joi.object({
                    isOpen: Joi.boolean().required(),
                    openTime: Joi.string().optional(),
                    closeTime: Joi.string().optional(),
                }),
            }).required(),
            shopLink: Joi.string().allow(null, '').optional(),
            joinedAt: Joi.date().iso().required(),
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

    //#region GetShop
    async getShop(req, res, next) {
        const productschema = Joi.object({
            shopId: Joi.string().required(),
        });

        const { error } = productschema.validate(req.body);
        if (error) return next(error);
        try {

            const result = await ShopService.getShop(req.body);
            return res.status(200).json({
                success: true,
                message: "Shop Fetched successfully",
                data: { shop: result }
            });
        } catch (error) {
            console.log(`Failed to Get The product: ${error}`);
        }
    },
    //#endregion


    //#region EditShop
    async EditShop(req, res, next) {
        const shopSchema = Joi.object({
            shopId: Joi.string().required(),
            shopImage: Joi.array().items(Joi.string()).min(1).max(3).optional(),
            shopName: Joi.string().optional(),
            shopDescription: Joi.string().optional(),
            shopAddress: Joi.string().optional(),
            selectLocation: Joi.string().optional(),
            longitude: Joi.number().optional(),
            latitude: Joi.number().optional(),
            shopContact: Joi.string().optional(),
            shopEmail: Joi.string().email().optional(),
            shopLink: Joi.string().optional().allow(null, ''),
            shopTiming: Joi.object().optional(),
            ownerName: Joi.string().optional(),
            ownerPhoneNumber: Joi.string().optional(),
            ownerEmail: Joi.string().email().optional(),
            ownerAddress: Joi.string().optional(),
        });

        const { error } = shopSchema.validate(req.body);
        if (error) return next(error);

        try {
            const result = await ShopService.editShop(req.body);
            return res.status(200).json({
                success: true,
                message: "Shop updated successfully",
                data: { shop: result }
            });
        } catch (err) {
            next(err);
        }
    },
    //#endregion



    //#region GetMyShop
    async getMyShop(req, res, next) {
        try {
            const result = await ShopService.getMyShop();
            return res.status(200).json({
                success: true,
                message: "My Shop Retrieved Successfully",
                data: { shops: result },
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
                data: { nearbyshop: result },
            });
        } catch (err) {
            console.log("Failed to get Nearby Shop:", err);
        }
    },
    //#endregion

    //#region AddProduct
    async AddProduct(req, res, next) {
        const product = Joi.object({
            productsImage: Joi.array().items(Joi.string()).required(),
            productName: Joi.string().required(),
            productsDescription: Joi.string().required(),
            productsPrice: Joi.number().required(),
            productCategory: Joi.string().required(),
            productSubCategory: Joi.string().required(),
            productBrand: Joi.string().required(),
            shopId: Joi.string().required(),
            discountedvalue: Joi.number().optional(),
            discounttype: Joi.string().valid("percent", "fixed").required(),
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

    //#region EditProduct
    async EditProduct(req, res, next) {
        const schema = Joi.object({
            productId: Joi.string().required(),
            productName: Joi.string().optional(),
            productsDescription: Joi.string().optional(),
            productsPrice: Joi.number().optional(),
            productCategory: Joi.string().optional(),
            productSubCategory: Joi.string().optional(),
            productBrand: Joi.string().optional(),
            discountedvalue: Joi.number().optional(),
            discounttype: Joi.string().valid("percent", "fixed").optional(),
            productsImage: Joi.array().items(Joi.string()).max(3).optional(),
            isImageEditDone: Joi.boolean().required()
        });

        const { error } = schema.validate(req.body);
        if (error) return next(error);

        try {
            const result = await ShopService.editProduct(req.body);
            return res.status(200).json({
                success: true,
                message: "Product updated successfully",
                data: { product: result }
            });
        } catch (err) {
            next(err);
        }
    },
    //#endregion

    //#region getFilterProduct
    async getFilterProduct(req, res, next) {
        const filterSchema = Joi.object({
            productCategory: Joi.array().items(Joi.string()).optional(),
            productSubCategory: Joi.array().items(Joi.string()).optional(),
            productBrand: Joi.array().items(Joi.string()).optional(),
            shopId: Joi.string().required(),
            page: Joi.number().integer().min(1).optional(),
        });

        const { error } = filterSchema.validate(req.body);
        if (error) return next(error);

        try {
            const products = await ShopService.getFilterProduct(req.body);
            return res.status(200).json({
                success: true,
                message: "Filtered products fetched successfully",
                data: { filterProducts: products }
            });
        } catch (err) {
            console.error("Failed to get filtered products:", err);
            return res.status(500).json({
                success: false,
                message: "Failed to get products",
            });
        }
    },
    //#endregion

    //#region getSpecificProduct
    async getProduct(req, res, next) {
        const productschema = Joi.object({
            productId: Joi.string().required(),
        });

        const { error } = productschema.validate(req.body);
        if (error) return next(error);
        try {

            const result = await ShopService.getProduct(req.body);
            return res.status(200).json({
                success: true,
                message: "Product Fetched successfully",
                data: { product: result }
            });
        } catch (error) {
            console.log(`Failed to Get The product: ${error}`);
        }
    },
    //#endregion

    //#region GetShopProduct
    async getShopProduct(req, res, next) {
        const shopSchema = Joi.object({
            shopId: Joi.string().required(),
            page: Joi.number().optional()
        });

        const { error } = shopSchema.validate(req.params);
        if (error) return next(error);

        try {
            const result = await ShopService.getShopProduct(req.params);
            return res.status(200).json({
                success: true,
                message: "Shop Product Fetch Successfully",
                data: { products: result }
            });
        } catch (error) {
            console.error("Unable to fetch Shop Product:", error);
            return res.status(500).json({ success: false, message: "Internal Server Error" });
        }
    },
    //#endregion

    //#region getTotalImageCount
    async getTotalImageCount(req, res, next) {
        const shopSchema = Joi.object({
            shopId: Joi.string().required()
        });

        const { error } = shopSchema.validate(req.params);
        if (error) return next(error);

        try {
            const result = await ShopService.getTotalImageCount(req.params.shopId);
            return res.status(200).json({
                success: true,
                message: "Total image count fetched successfully",
                data: result
            });
        } catch (error) {
            console.error("Unable to fetch total image count:", error);
            return res.status(500).json({ success: false, message: "Internal Server Error" });
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
        const searchQuery = req.params.querytext;
        if (!searchQuery) {
            return res.status(400).json({
                success: false,
                message: "Search query is required."
            });
        }
        try {
            const query = searchQuery.trim();
            const { shops, products, didYouMean,
                originalQuery, correctedQuery } = await ShopService.searchShopsAndProducts(query);
            let message = "Search results fetched successfully.";
            if (correctedQuery) {
                message = `Showing results for "${correctedQuery}". Search instead for "${originalQuery}"?`;
            } else if (didYouMean && shops.length === 0 && products.length === 0) {
                message = `No results found for "${originalQuery}". Did you mean "${didYouMean}"?`;
            }
            return res.status(200).json({
                success: true,
                message: message,
                data: {
                    shops, products, searchInfo: {
                        originalQuery,
                        correctedQuery,
                        didYouMean
                    }
                }
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
                data: { category: result }
            })
        } catch (error) {
            console.log("Unable to fetch Category:", error);
        }
    },
    //#endregion

    //#region GetSub Category
    async getSubCategory(req, res, next) {
        const catgeory = Joi.object({
            category: Joi.string().required()
        });
        const { error } = catgeory.validate(req.params);
        if (error) {
            return next(error);
        }
        try {
            const result = await ShopService.getSubCategory(req.params);
            return res.json({
                success: true,
                message: "Sub Category Retrieved Successfully",
                data: { subCategory: result }
            })
        } catch (error) {
            console.error("Failed to get Sub Category:", error);
        }
    },
    //#endregion

    //#region GetBrand
    async getBrand(req, res, next) {
        try {
            const result = await ShopService.getBrand();
            return res.json({
                success: true,
                message: "Category Retrieved Successfully",
                data: { Brands: result }
            })
        } catch (error) {
            console.log("Unable to fetch Category:", error);
        }
    },
    //#endregion

    //#region Set Product Discount
    async setProductDiscount(req, res, next) {
        const schema = Joi.object({
            productId: Joi.string().required(),
            discount: Joi.object({
                value: Joi.number().required(),
                type: Joi.string().valid("percent", "fixed").required()
            }).required()
        });

        const { error } = schema.validate(req.body);
        if (error) return next(error);

        try {
            const result = await ShopService.setProductDiscount(req.body);
            return res.status(200).json({
                success: true,
                message: "Product discount updated successfully",
                data: result
            });
        } catch (err) {
            console.error("Failed to update discount:", err);
            return next(err);
        }
    },
    //#endregion

    async getSimilarProduct(req, res, next) {
        const category = Joi.object({});
        const { error } = category.validate();
        if (error) {
            return next(error);
        }
    },

    //#region updateshopSubscriptionStatus
    async updateSubscriptionStatus(req, res, next) {
        const shopSchema = Joi.object({
            shopId: Joi.string().required(),
            packageId: Joi.string().required(),
            packageStartDate: Joi.date().iso().required(),
            packageEndDate: Joi.date().iso().required(),
        });
        const { error } = shopSchema.validate(req.body);
        if (error) {
            return next(error);
        }
        try {
            const result = await ShopService.updateSubscriptionStatus(req.body);
            return res.status(200).json({
                success: true,
                message: "Shop Subscription Added successfully",
                data: result
            });
        } catch (error) {
            console.log("Failed to update Subscription Status:", error);
        }
    },
    //#endregion

    //#region addExtensionPackage
    async addExtensionPackage(req, res, next) {
        const shopSchema = Joi.object({
            shopId: Joi.string().required(),
            packageId: Joi.string().required(),
            packageStartDate: Joi.date().iso().required(),
            packageEndDate: Joi.date().iso().required(),
        });
        const { error } = shopSchema.validate(req.body);
        if (error) {
            return next(error);
        }
        try {
            const result = await ShopService.addExtensionPackage(req.body);
            return res.status(200).json({
                success: true,
                message: "Shop Extension Package Added successfully",
                data: result
            });
        } catch (error) {
            console.log("Failed to update Subscription Status:", error);
        }
    },
    //#endregion

    //#region GetSimilarProduct
    async getSimilarProduct(req, res, next) {
        const schema = Joi.object({
            productId: Joi.string().required(),
            latitude: Joi.number().required(),
            longitude: Joi.number().required(),
            page: Joi.number().optional(),
            limit: Joi.number().optional(),

        });

        const { error } = schema.validate(req.body);
        if (error) {
            return next(error);
        }

        try {
            const result = await ShopService.getSimilarProduct(req.body);
            return res.status(200).json({
                success: true,
                message: "Similar products retrieved successfully",
                data: { similarProduct: result },
            });
        } catch (error) {
            console.error("Failed to fetch similar products:", error);
            return next(error);
        }
    },
    //#endregion

    //#region getSimilarShopProduct
    async getSimilarShopProduct(req, res, next) {
        const similarshop = Joi.object({
            shopId: Joi.string().required(),
            productId: Joi.string().required(),
            page: Joi.number().optional(),
            limit: Joi.number().optional(),
        });

        const { error } = similarshop.validate(req.body);
        if (error) {
            return next(error);
        }

        try {
            const result = await ShopService.getSimilarShopProduct(req.body);
            return res.status(200).json({
                success: true,
                message: "More products from the same shop retrieved successfully",
                data: { similarshopproduct: result },
            });
        } catch (error) {
            console.error("Failed to fetch more products from the same shop:", error);
            return next(error);
        }
    },
    //#endregion
    async moreFromBrand(req, res, next) {
        const schema = Joi.object({
            brand: Joi.string().required(),
            productId: Joi.string().required(),
            page: Joi.number().optional(),
            limit: Joi.number().optional(),
        });

        const { error } = schema.validate(req.body);
        if (error) {
            return next(error);
        }

        try {
            const { brand, productId, page, limit } = req.body;
            const result = await ShopService.getMoreFromBrand(brand, productId, page, limit);
            return res.status(200).json({
                success: true,
                message: "More products from the same brand retrieved successfully",
                data: result,
            });
        } catch (error) {
            console.error("Failed to fetch more products from the same brand:", error);
            return next(error);
        }
    },
    //#region GetShopAnalytics
    async getShopAnalytics(req, res, next) {
        const schema = Joi.object({
            shopId: Joi.string().required()
        });

        const { error } = schema.validate(req.params);
        if (error) {
            return next(error);
        }

        try {
            const result = await ShopService.getShopAnalytics(req.params.shopId);
            return res.status(200).json({
                success: true,
                message: "Shop analytics retrieved successfully",
                data: result
            });
        } catch (error) {
            console.error("Failed to get shop analytics:", error);
            return next(error);
        }
    },
    //#endregion

    //#region GetProductViewAnalytics
    async getProductViewAnalytics(req, res, next) {
        const schema = Joi.object({
            shopId: Joi.string().required(),
            timeRange: Joi.string().valid('7days', '15days', '30days', 'all').required()
        });

        const { error } = schema.validate(req.params);
        if (error) {
            return next(error);
        }

        try {
            const result = await ShopService.getProductViewAnalytics(
                req.params.shopId,
                req.params.timeRange
            );
            return res.status(200).json({
                success: true,
                message: "Product view analytics retrieved successfully",
                data: result
            });
        } catch (error) {
            console.error("Failed to get product view analytics:", error);
            return next(error);
        }
    },
    //#endregion

    //#region GetVisitorAnalytics
    async getVisitorAnalytics(req, res, next) {
        const schema = Joi.object({
            shopId: Joi.string().required(),
            timeRange: Joi.string().valid('7days', '15days', '30days', 'all').required()
        });

        const { error } = schema.validate(req.params);
        if (error) {
            return next(error);
        }

        try {
            const result = await ShopService.getVisitorAnalytics(
                req.params.shopId,
                req.params.timeRange
            );
            return res.status(200).json({
                success: true,
                message: "Visitor analytics retrieved successfully",
                data: result
            });
        } catch (error) {
            console.error("Failed to get visitor analytics:", error);
            return next(error);
        }
    },
    //#endregion

    //#region GetDailyVisitors
    async getDailyVisitors(req, res, next) {
        const schema = Joi.object({
            shopId: Joi.string().required(),
            days: Joi.number().integer().min(1).max(30).required()
        });

        const { error } = schema.validate(req.params);
        if (error) {
            return next(error);
        }

        try {
            const result = await ShopService.getDailyVisitors(
                req.params.shopId,
                parseInt(req.params.days)
            );
            return res.status(200).json({
                success: true,
                message: "Daily visitor data retrieved successfully",
                data: result
            });
        } catch (error) {
            console.error("Failed to get daily visitors:", error);
            return next(error);
        }
    },
    //#endregion

    //#region RecordProductView
    async recordProductView(req, res, next) {
        const schema = Joi.object({
            productId: Joi.string().required(),
            shopId: Joi.string().required()
        });

        const { error } = schema.validate(req.body);
        if (error) {
            return next(error);
        }

        try {
            await ShopService.recordProductView(req.body);
            return res.status(200).json({
                success: true,
                message: "Product view recorded successfully"
            });
        } catch (error) {
            console.error("Failed to record product view:", error);
            return next(error);
        }
    },
    //#endregion

    //#region RecordShopVisit
    async recordShopVisit(req, res, next) {
        const schema = Joi.object({
            shopId: Joi.string().required(),
        });

        const { error } = schema.validate(req.body);
        if (error) {
            return next(error);
        }

        try {
            await ShopService.recordShopVisit(req.body);
            return res.status(200).json({
                success: true,
                message: "Shop visit recorded successfully"
            });
        } catch (error) {
            console.error("Failed to record shop visit:", error);
            return next(error);
        }
    }
    //#endregion

}
export default ShopController;