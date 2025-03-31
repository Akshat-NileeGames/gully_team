import { Shop } from '../models/index.js';
import ImageUploader from '../helpers/ImageUploader.js';
import { DateTime } from "luxon";
import nodemailer from "nodemailer";
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

}
export default ShopService;