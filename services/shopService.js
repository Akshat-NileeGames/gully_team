import { Shop } from '../models/index.js';
import ImageUploader from '../helpers/ImageUploader.js';
import { DateTime } from "luxon";
import nodemailer from "nodemailer";
const ShopService = {

    async addShop(data) {
        let shopImg = [];
        if(data.shopImage && data.shopImage.length>0){
            for(let images of data.shopImage){
                // const ImageUrl=await ImageUploader.ImageUploader(images,"ShopImages");
                // shopImg.push(ImageUrl);
                shopImg.push(images);
            }
        }
        const newShop = new Shop({
            shopName: data.shopName,
            shopDescription: data.shopDescription,
            shopLocation: data.shopLocation,
            locationHistory: data.locationHistory,
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
            createdAt: DateTime.now().toISO(),
        });
        try{
         const result = await newShop.save();
         console.log("Shop added successfully:", result);
         return result;   
        }catch(err){
            console.log("Error in adding shop:", err);
        }
    }


}
export default ShopService;