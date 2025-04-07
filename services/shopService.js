import { Shop, Product, Category } from '../models/index.js';
import ImageUploader from '../helpers/ImageUploader.js';
import { DateTime } from "luxon";
import nodemailer from "nodemailer";
import product from '../models/product.js';
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
        console.log("User Info:", userInfo);
        const newShop = new Shop({
            shopName: data.shopName,
            shopDescription: data.shopDescription,
            shopLocation: data.shopLocation,
            locationHistory: {
                point: {
                    type: "Point",
                    coordinates: [parseFloat(data.longitude), parseFloat(data.latitude)],
                },
                selectLocation: data.selectLocation,
            },
            shopContact: data.shopContact,
            shopEmail: data.shopEmail,
            shopLink: data.shoplink || null,
            businessLicenseNumber: data.businessLicenseNumber,
            gstNumber: data.gstNumber,
            ownerName: data.ownerName,
            ownerContact: data.ownerContact,
            ownerEmail: data.ownerEmail,
            ownerAddress: data.ownerAddress,
            ownerIdentificationNumber: data.ownerIdentificationNumber,
            shopImage: shopImg,
            userId: userInfo.userId,
            createdAt: DateTime.now().toISO(),
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
                locationHistory: 0
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
            }, {
                $project: {
                    locationHistory: 0
                }
            }
        ]);
        console.log("Shops near you:", shop);
        return shop;
    },

    async AddProduct(data) {
        const { productsImage, productName, productsDescription, productsPrice, productCategory, productBrand, shopId } = data;

        console.log(data);
        let imagesUrl = [];
        // if (productsImage && productsImage.length > 0) {
        //     for (image in productsImage) {
        //         // const uploadedImage = await ImageUploader.Upload(image, "Product");
        //         // imagesUrl.push(uploadedImage);
        //         imagesUrl.push(image);
        //     }
        // }
        const product = new Product({
            productsImage: productsImage,
            productName: productName,
            productsDescription: productsDescription,
            productsPrice: productsPrice,
            productCategory: productCategory,
            productBrand: productBrand,
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
            const product = await Product.find({
                shopId: data.shopId
            }).populate('shopId');
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
    async getCategory(data) {

        try {

        } catch (error) {
            console.error("Error in getting category:", error);
        }
    },

}
export default ShopService;