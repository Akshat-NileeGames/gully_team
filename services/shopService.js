import { Shop, Product, Category } from '../models/index.js';
import ImageUploader from '../helpers/ImageUploader.js';
import { DateTime } from "luxon";
import CustomErrorHandler from '../helpers/CustomErrorHandler.js';
const ShopService = {

    async addShop(data) {
        const userInfo = global.user;
        let shopImg = [];
        if (data.shopImage && data.shopImage.length > 0) {
            for (let images of data.shopImage) {
                // const ImageUrl=await ImageUploader.ImageUploader(images,"ShopImages");
                // shopImg.push(ImageUrl);
                shopImg.push(images);
            }
        }
        const shopTiming = {
            Monday: {
                isOpen: data.shopTiming.Monday.isOpen,
                openTime: data.shopTiming.Monday.openTime || null,
                closeTime: data.shopTiming.Monday.closeTime || null,
            },
            Tuesday: {
                isOpen: data.shopTiming.Tuesday.isOpen,
                openTime: data.shopTiming.Tuesday.openTime || null,
                closeTime: data.shopTiming.Tuesday.closeTime || null,
            },
            Wednesday: {
                isOpen: data.shopTiming.Wednesday.isOpen,
                openTime: data.shopTiming.Wednesday.openTime || null,
                closeTime: data.shopTiming.Wednesday.closeTime || null,
            },
            Thursday: {
                isOpen: data.shopTiming.Thursday.isOpen,
                openTime: data.shopTiming.Thursday.openTime || null,
                closeTime: data.shopTiming.Thursday.closeTime || null,
            },
            Friday: {
                isOpen: data.shopTiming.Friday.isOpen,
                openTime: data.shopTiming.Friday.openTime || null,
                closeTime: data.shopTiming.Friday.closeTime || null,
            },
            Saturday: {
                isOpen: data.shopTiming.Saturday.isOpen,
                openTime: data.shopTiming.Saturday.openTime || null,
                closeTime: data.shopTiming.Saturday.closeTime || null,
            },
            Sunday: {
                isOpen: data.shopTiming.Sunday.isOpen,
                openTime: data.shopTiming.Sunday.openTime || null,
                closeTime: data.shopTiming.Sunday.closeTime || null,
            },
        };

        console.log("The got datetime:", data.joinedAt);
        const formatDateTime = (dateTimeString) => {
            const parsedDate = DateTime.fromISO(dateTimeString, { zone: "utc" });
            if (!parsedDate.isValid) {
                throw CustomErrorHandler.badRequest("Invalid date format. Please provide a valid ISO string.");
            }

            return parsedDate.toISO();
        };


        const standardizedDateTime = formatDateTime(data.joinedAt);
        const newShop = new Shop({
            shopImage: shopImg,
            shopName: data.shopName,
            shopDescription: data.shopDescription,
            shopAddress: data.shopAddress,
            locationHistory: {
                point: {
                    type: "Point",
                    coordinates: [parseFloat(data.longitude), parseFloat(data.latitude)],
                    selectLocation: data.selectLocation,
                },

            },
            shopContact: data.shopContact,
            shopEmail: data.shopEmail,
            shopLink: data.shoplink || null,
            shopTiming: shopTiming,
            LicenseNumber: data.LicenseNumber,
            gstNumber: data.gstNumber,
            ownerName: data.ownerName,
            ownerPhoneNumber: data.ownerPhoneNumber,
            ownerEmail: data.ownerEmail,
            ownerAddress: data.ownerAddress,
            ownerAddharImages: {
                aadharFrontSide: data.aadharFrontSide,
                aadharBackSide: data.aadharBackSide
            },
            ownerPanNumber: data.ownerPanNumber,
            userId: userInfo.userId,
            joinedAt: standardizedDateTime,
            isSubscriptionPurchased: false
        });
        try {
            const result = await newShop.save();
            return result;
        } catch (err) {
            console.log("Error in adding shop:", err);
        }
    },

    async getMyShop() {
        try {
            const userinfo = global.user;
            const shop = await Shop.find({ userId: userinfo.userId }, {
                updatedAt: 0,
                createdAt: 0,
                __v: 0,
            });
            return shop;
        } catch (err) {
            console.log("Error in getting my shop:", err);
        }
    },

    async getNearbyShop(data) {
        const { latitude, longitude } = data;
        const shop = await Shop.aggregate([
            {
                $geoNear: {
                    near: {
                        type: "Point",
                        coordinates: [longitude, latitude]
                    },
                    distanceField: "distance",
                    spherical: true,
                    maxDistance: 15 * 1000
                },
            },
            {
                $addFields: {
                    distanceInKm: {
                        $divide: ["$distance", 1000]
                    }
                }
            },
            {
                $match: {
                    distanceInKm: { $lte: 15 },
                }
            },
            //  {
            //     $project: {
            //         locationHistory: 0
            //     }
            // }
        ]);
        return shop;
    },

    async AddProduct(data) {
        const { productsImage, productName, productsDescription, productsPrice,
            productCategory, productSubCategory, productBrand, shopId, discountedvalue, discounttype } = data;
        let imagesUrl = [];
        // if (productsImage && productsImage.length > 0) {
        //     for (image in productsImage) {
        //         // const uploadedImage = await ImageUploader.Upload(image, "Product");
        //         // imagesUrl.push(uploadedImage);
        //         imagesUrl.push(image);
        //     }
        // }

        const finalDiscount = {
            discountedvalue: discounttype === 'fixed' ? 0 : discountedvalue,
            discounttype: discounttype.toLowerCase() === 'fixed' ? 'fixed' : 'percent'
        };
        const product = new Product({
            productsImage:productsImage,
            productName: productName,
            productsDescription: productsDescription,
            productsPrice: productsPrice,
            productCategory: productCategory,
            productSubCategory: productSubCategory,
            productBrand: productBrand,
            productDiscount: finalDiscount,
            shopId: shopId,
            isActive: true
        })
        try {
            const result = await product.save()
            return result;
        } catch (err) {
            console.log("Failed to add Product: ", err);
        }

    },

    async getShopProduct(data) {
        try {
            const shop = await Shop.findById(data.shopId);
            if (!shop) {
                return CustomErrorHandler.notFound("The specified shop is not available.");
            }
            const product = await Product.find({
                shopId: shop._id
            });
            return product;
        } catch (error) {
            console.log("Failed to get Shop Products", error);
        }
    },

    async setProductActiveStatus(data) {
        try {

            const product = await Product.findById(data.productId);
            if (!product) {
                return CustomErrorHandler.notFound("The specified product is not available.");
            }
            product.isActive = !data.isActive;

            await product.save();
            return product;
        } catch (error) {
            console.error('Error updating product status:', error);
        }
    },


    async searchShopsAndProducts(query) {
        try {
            const shops = await Shop.find({
                $or: [
                    { shopName: { $regex: query, $options: 'i' } },
                    // { shopDescription: { $regex: query, $options: 'i' } },
                ]
            });
            const products = await Product.find({
                $or: [
                    { productName: { $regex: query, $options: 'i' } },
                    // { productsDescription: { $regex: query, $options: 'i' } },
                ]
            });
            return { shops, products };
        } catch (err) {
            console.error("Error in searching shops and products:", err);
            throw new Error("Error in search operation");
        }
    },


    async getSpecificProduct(data) {

        try {
            const product = await Product.findById(data.productId).populate('shopId');
            if (!product) {
                return CustomErrorHandler.notFound("Product not found.");
            }
            return product;
        } catch (error) {
            console.log("Unable to fetch specific product:", error);
        }
    },

    async addCategory(data) {

        const { categoryfor, items } = data;
        const isCategoryExist = await Category.findOne({ categoryFor: categoryfor });
        if (isCategoryExist) {
            const updatedCategoryitem = await Category.updateOne(
                { categoryFor: categoryfor },
                { $addToSet: { categoryItem: { $each: items } } }
            );
            if (updatedCategoryitem.modifiedCount > 0) {
                const category = await Category.findOne({ categoryFor: categoryfor });
                return {
                    success: true,
                    message: "Category updated successfully with new items",
                    data: category
                };
            }
        } else {
            const category = new Category({
                categoryFor: categoryfor,
                categoryItem: items
            });
            const result = await category.save();
            return result;
        }
    },
    async getCategory() {
        try {
            const categories = await Category.find(
                { categoryFor: "Sports" },
                {
                    createdAt: 0,
                    updatedAt: 0,
                    __v: 0
                }
            );
            if (categories) {
                return categories[0].categoryItem;
            } else {
                return [];
            }
        } catch (error) {
            console.error("Error in getting category:", error);
            return [];
        }
    },

    async getSubCategory(data) {
        const category = data.category;
        const subCategory = await Category.find({
            categoryFor: `${category} sub`
        }, {
            createdAt: 0,
            updatedAt: 0,
            __v: 0
        })
        if (subCategory) {
            return subCategory[0].categoryItem;
        } else {
            return [];
        }
    },
    async getBrand() {
        try {
            const categories = await Category.find(
                { categoryFor: "Sports_Brand" },
                {
                    createdAt: 0,
                    updatedAt: 0,
                    __v: 0
                }
            );
            if (categories) {
                return categories[0].categoryItem;
            } else {
                return [];
            }
        } catch (error) {
            console.error("Error in getting category:", error);
            return [];
        }
    },
    async setProductDiscount(data) {
        const { productId, discount } = data;

        try {
            const product = await Product.findById(productId);
            if (!product) {
                return CustomErrorHandler.notFound("Product not found.");
            }

            product.productDiscount = {
                value: discount.value,
                type: discount.type,
            };

            await product.save();
            return product;
        } catch (err) {
            console.error("Error in setting product discount:", err);
            throw err;
        }
    }

}
export default ShopService;