import { Shop, Product, Category, Package, User, ShopVisit, ProductView, OTP } from '../models/index.js';
import ImageUploader from '../helpers/ImageUploader.js';
import { DateTime } from "luxon";
import CustomErrorHandler from '../helpers/CustomErrorHandler.js';
import nodemailer from "nodemailer";
import mongoose from "mongoose"
import { FAST_SMS_KEY, SENDER_ID, MESSAGE_ID } from "../config/index.js";
import axios from "axios";
import crypto from "crypto";
function isBase64Image(str) {
    return /^data:image\/[a-zA-Z]+;base64,/.test(str);
}
const ShopService = {

    async addShop(data) {

        const userInfo = global.user;
        let shopImg = [];
        if (Array.isArray(data.shopImage) && data.shopImage.length > 0) {
            for (const image of data.shopImage) {
                try {
                    const uploadedUrl = await ImageUploader.Upload(image, "ShopImages");

                    if (!uploadedUrl) {
                        throw new Error("Image upload failed or returned empty URL.");
                    }

                    shopImg.push(uploadedUrl);
                } catch (uploadError) {
                    console.error("Image upload failed:", uploadError);
                    throw CustomErrorHandler.serverError("Failed to upload one or more shop images.");
                }
            }
        } else {
            throw CustomErrorHandler.badRequest("Shop images are required.");
        }

        let aadharFrontUrl = null;
        let aadharBackUrl = null;
        if (data.aadharFrontSide && data.aadharBackSide) {
            try {
                aadharFrontUrl = await ImageUploader.Upload(data.aadharFrontSide, "AadharImages");
                if (!aadharFrontUrl) throw new Error("Aadhar front side upload failed.");

                aadharBackUrl = await ImageUploader.Upload(data.aadharBackSide, "AadharImages");
                if (!aadharBackUrl) throw new Error("Aadhar back side upload failed.");
            } catch (uploadError) {
                console.error("Aadhar image upload failed:", uploadError);
                throw CustomErrorHandler.serverError("Failed to upload Aadhar card images.");
            }
        } else {
            throw CustomErrorHandler.badRequest("Both Aadhar front and back images are required.");
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
            GstNumber: data.GstNumber,
            ownerName: data.ownerName,
            ownerPhoneNumber: data.ownerPhoneNumber,
            ownerEmail: data.ownerEmail,
            ownerAddress: data.ownerAddress,
            ownerAddharImages: {
                aadharFrontSide: aadharFrontUrl,
                aadharBackSide: aadharBackUrl
            },
            ownerPanNumber: data.ownerPanNumber,
            userId: userInfo.userId,
            joinedAt: standardizedDateTime,
            isSubscriptionPurchased: false
        });
        try {
            const result = await newShop.save();
            setTimeout(async () => {
                console.log("Sending email after 10 seconds... with Shop id", result._id);
                const user = await User.findById(userInfo.userId);
                console.log(data.ownerEmail);
                const mail = await ShopService.sendMail("Shop", user, data.ownerEmail, result);

                console.log(mail);
            }, 2000);
            return result;
        } catch (err) {
            console.log("Error in adding shop:", err);
        }
    },

    async sendMail(userFor = "", user, ownerEmail, shop) {
        const transporter = nodemailer.createTransport({
            host: "smtp.gmail.com",
            port: 587,
            secure: false,
            requireTLS: true,
            auth: {
                user: "gullyteam33@gmail.com",
                pass: "iaur qnaj ocsq jyvq",
            },
        });

        const mailOptions = {
            from: "gullyteam33@gmail.com",
            to: ownerEmail,
            subject: "Welcome! Your Shop Has Been Successfully Registered",
            html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Shop Registration Successful - Gully App</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    /* Reset styles for email clients */
    body, table, td, p, a, li, blockquote {
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
    }
    
    table, td {
      mso-table-lspace: 0pt;
      mso-table-rspace: 0pt;
    }
    
    img {
      -ms-interpolation-mode: bicubic;
      border: 0;
      height: auto;
      line-height: 100%;
      outline: none;
      text-decoration: none;
    }

    /* Main styles */
    body {
      margin: 0 !important;
      padding: 0 !important;
      background-color: #f4f6f8 !important;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }

    .email-wrapper {
      width: 100% !important;
      background-color: #f4f6f8;
      padding: 20px 0;
    }

    .email-container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
    }

    .header {
      background: linear-gradient(135deg, #2563eb 0%, #06b6d4 100%);
      padding: 40px 30px;
      text-align: center;
    }

    .header h1 {
      margin: 0;
      color: #ffffff;
      font-size: 28px;
      font-weight: bold;
      line-height: 1.2;
    }

    .header p {
      margin: 8px 0 0 0;
      color: #bfdbfe;
      font-size: 16px;
    }

    .content {
      padding: 40px 30px;
    }

    .welcome-text {
      font-size: 20px;
      font-weight: bold;
      color: #1f2937;
      margin: 0 0 20px 0;
      line-height: 1.3;
    }

    .intro-text {
      font-size: 16px;
      color: #6b7280;
      margin: 0 0 30px 0;
      line-height: 1.6;
    }

    .section-title {
      font-size: 18px;
      font-weight: bold;
      color: #2563eb;
      margin: 30px 0 20px 0;
      padding-bottom: 8px;
      border-bottom: 2px solid #e5e7eb;
    }

    .details-table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }

    .details-table td {
      padding: 12px 0;
      border-bottom: 1px solid #f3f4f6;
      vertical-align: top;
    }

    .details-table td.label {
      font-weight: 600;
      color: #374151;
      width: 35%;
      font-size: 14px;
    }

    .details-table td.value {
      color: #6b7280;
      font-size: 14px;
      word-break: break-word;
    }

    .highlight-section {
      background-color: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 8px;
      padding: 25px;
      margin: 30px 0;
    }

    .highlight-title {
      font-size: 18px;
      font-weight: bold;
      color: #166534;
      margin: 0 0 15px 0;
    }

    .task-list {
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .task-item {
      margin: 8px 0;
      color: #166534;
      font-size: 15px;
      line-height: 1.5;
    }

    .checkmark {
      color: #16a34a;
      font-weight: bold;
      margin-right: 8px;
    }

    .info-section {
      background-color: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: 8px;
      padding: 25px;
      margin: 20px 0;
    }

    .info-title {
      font-size: 18px;
      font-weight: bold;
      color: #1e40af;
      margin: 0 0 15px 0;
    }

    .info-text {
      color: #1e40af;
      font-size: 15px;
      line-height: 1.6;
      margin: 0;
    }

    .cta-section {
      text-align: center;
      margin: 40px 0 20px 0;
    }

    .cta-text {
      font-size: 16px;
      color: #6b7280;
      margin: 0 0 25px 0;
      line-height: 1.6;
    }

    .cta-button {
      display: inline-block;
      padding: 14px 28px;
      background-color: #2563eb;
      color: #ffffff !important;
      text-decoration: none;
      border-radius: 8px;
      font-weight: bold;
      font-size: 16px;
      line-height: 1;
    }

    .cta-button:hover {
      background-color: #1d4ed8;
    }

    .footer {
      background-color: #f9fafb;
      padding: 30px;
      text-align: center;
      border-top: 1px solid #e5e7eb;
    }

    .footer-text {
      font-size: 13px;
      color: #6b7280;
      margin: 0 0 8px 0;
      line-height: 1.5;
    }

    .footer-link {
      color: #2563eb;
      text-decoration: none;
    }

    .footer-link:hover {
      color: #1d4ed8;
    }

    /* Mobile responsiveness */
    @media only screen and (max-width: 600px) {
      .email-wrapper {
        padding: 10px 0;
      }
      
      .email-container {
        margin: 0 10px;
        border-radius: 8px;
      }
      
      .header {
        padding: 30px 20px;
      }
      
      .header h1 {
        font-size: 24px;
      }
      
      .content {
        padding: 30px 20px;
      }
      
      .details-table td.label {
        width: 40%;
      }
      
      .highlight-section,
      .info-section {
        padding: 20px;
      }
      
      .cta-button {
        padding: 12px 24px;
        font-size: 15px;
      }
    }

    /* Dark mode support */
    @media (prefers-color-scheme: dark) {
      .email-container {
        background-color: #ffffff !important;
      }
    }
  </style>
</head>
<body>
  <div class="email-wrapper">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
      <tr>
        <td align="center">
          <div class="email-container">
            <!-- Header -->
            <div class="header">
              <h1>Shop Registration Successful!</h1>
              <p>Welcome to the Gully App community</p>
            </div>

            <!-- Content -->
            <div class="content">
              <!-- Welcome Message -->
              <p class="welcome-text">Hello ${user.fullName || "User"}!</p>
              <p class="intro-text">
                Your shop has been successfully registered on the Gully App. We're delighted to welcome you to our growing network of innovative business owners and entrepreneurs.
              </p>
            
              <!-- Shop Information -->
              <h3 class="section-title">Shop Information</h3>
              <table class="details-table" role="presentation">
                <tr>
                  <td class="label">Shop Name:</td>
                  <td class="value">${shop.shopName}</td>
                </tr>
                <tr>
                  <td class="label">Description:</td>
                  <td class="value">${shop.shopDescription}</td>
                </tr>
                <tr>
                  <td class="label">Address:</td>
                  <td class="value">${shop.shopAddress}</td>
                </tr>
                <tr>
                  <td class="label">Contact Number:</td>
                  <td class="value">${shop.shopContact}</td>
                </tr>
                <tr>
                  <td class="label">Email:</td>
                  <td class="value">${shop.shopEmail}</td>
                </tr>
                ${shop.shopLink ? `<tr><td class="label">Shop Link:</td><td class="value">${shop.shopLink}</td></tr>` : ''}
              </table>

              <!-- Owner Information -->
              <h3 class="section-title">Owner Information</h3>
              <table class="details-table" role="presentation">
                <tr>
                  <td class="label">Owner Name:</td>
                  <td class="value">${shop.ownerName}</td>
                </tr>
                <tr>
                  <td class="label">Owner Phone:</td>
                  <td class="value">${shop.ownerPhoneNumber}</td>
                </tr>
                <tr>
                  <td class="label">Owner Email:</td>
                  <td class="value">${shop.ownerEmail}</td>
                </tr>
                <tr>
                  <td class="label">Owner Address:</td>
                  <td class="value">${shop.ownerAddress}</td>
                </tr>
                <tr>
                  <td class="label">PAN Number:</td>
                  <td class="value">${shop.ownerPanNumber}</td>
                </tr>
              </table>

              <!-- Additional Details -->
              <h3 class="section-title">Additional Details</h3>
              <table class="details-table" role="presentation">
                ${shop.LicenseNumber ? `<tr><td class="label">License Number:</td><td class="value">${shop.LicenseNumber}</td></tr>` : ''}
                ${shop.GstNumber ? `<tr><td class="label">GST Number:</td><td class="value">${shop.GstNumber}</td></tr>` : ''}
                <tr>
                  <td class="label">Registered On:</td>
                  <td class="value">${new Date(shop.joinedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</td>
                </tr>
              </table>

              <!-- Getting Started -->
              <div class="highlight-section">
                <h3 class="highlight-title">Start with the basics:</h3>
                <ul class="task-list">
                  <li class="task-item">
                    <span class="checkmark">✓</span>
                    Log into your account and view your dashboard
                  </li>
                  <li class="task-item">
                    <span class="checkmark">✓</span>
                    Add your first product or update shop details
                  </li>
                  <li class="task-item">
                    <span class="checkmark">✓</span>
                    Explore the shop timing settings and customize your hours
                  </li>
                  <li class="task-item">
                    <span class="checkmark">✓</span>
                    Upload high-quality images of your shop and products
                  </li>
                </ul>
              </div>

              <!-- Upcoming Features -->
              <div class="info-section">
                <h3 class="info-title">Stay tuned!</h3>
                <p class="info-text">
                  We're actively working on new promotional tools designed to help boost your shop's visibility — including digital banners, featured listings, and marketing packages. These features will be available soon within the Gully App to support your growth journey.
                </p>
              </div>

              <!-- Call to Action -->
              <div class="cta-section">
                <p class="cta-text">
                  Thank you for joining us. We look forward to building something amazing together!
                </p>
                <a href="mailto:gullyteam33@gmail.com" class="cta-button">
                  ✉️ Need Help? Contact Us
                </a>
              </div>
            </div>

            <!-- Footer -->
            <div class="footer">
              <p class="footer-text">
                © ${new Date().getFullYear()} Nilee Games and Future Technologies Pvt. Ltd.
              </p>
              <p class="footer-text">
                Email: <a href="mailto:gullyteam33@gmail.com" class="footer-link">gullyteam33@gmail.com</a>
              </p>
            </div>
          </div>
        </td>
      </tr>
    </table>
  </div>
</body>
</html>`};

        transporter.sendMail(mailOptions, function (error, info) {
            if (error) {
                console.log("Mail error:", error);
            } else {
                console.log("Shop registration mail sent: " + info.response);
            }
        });
    },

    async getShop(data) {
        try {
            const shop = await Shop.findById(data.shopId).populate('packageId AdditionalPackages');

            if (!shop) {
                throw CustomErrorHandler.notFound("Product Not Found");
            }
            return shop;
        } catch (error) {
            console.log(`Failed to Get The product: ${error}`);
        }
    },


    // async editShop(data) {
    //     const { shopId, ...fieldsToUpdate } = data;

    //     if (fieldsToUpdate.longitude && fieldsToUpdate.latitude) {
    //         fieldsToUpdate["locationHistory.point"] = {
    //             type: "Point",
    //             coordinates: [parseFloat(fieldsToUpdate.longitude), parseFloat(fieldsToUpdate.latitude)],
    //             selectLocation: fieldsToUpdate.selectLocation || "",
    //         };
    //         delete fieldsToUpdate.longitude;
    //         delete fieldsToUpdate.latitude;
    //         delete fieldsToUpdate.selectLocation;
    //     }

    //     if (fieldsToUpdate.aadharFrontSide || fieldsToUpdate.aadharBackSide) {
    //         fieldsToUpdate.ownerAddharImages = {};
    //         if (fieldsToUpdate.aadharFrontSide) fieldsToUpdate.ownerAddharImages.aadharFrontSide = fieldsToUpdate.aadharFrontSide;
    //         if (fieldsToUpdate.aadharBackSide) fieldsToUpdate.ownerAddharImages.aadharBackSide = fieldsToUpdate.aadharBackSide;
    //         delete fieldsToUpdate.aadharFrontSide;
    //         delete fieldsToUpdate.aadharBackSide;
    //     }

    //     try {
    //         const updatedShop = await Shop.findByIdAndUpdate(shopId, { $set: fieldsToUpdate }, { new: true });
    //         return updatedShop;
    //     } catch (err) {
    //         console.error("Failed to edit shop:", err);
    //         throw err;
    //     }
    // },
    async editShop(data) {
        const { shopId, ...fieldsToUpdate } = data;
        console.log(data.shopLink);
        if (fieldsToUpdate.longitude && fieldsToUpdate.latitude) {
            fieldsToUpdate["locationHistory.point"] = {
                type: "Point",
                coordinates: [parseFloat(fieldsToUpdate.longitude), parseFloat(fieldsToUpdate.latitude)],
                selectLocation: fieldsToUpdate.selectLocation || "",
            };
            delete fieldsToUpdate.longitude;
            delete fieldsToUpdate.latitude;
            delete fieldsToUpdate.selectLocation;
        }
        console.log(data.shopLink);
        if (fieldsToUpdate.aadharFrontSide || fieldsToUpdate.aadharBackSide) {
            fieldsToUpdate.ownerAddharImages = {};
            if (fieldsToUpdate.aadharFrontSide)
                fieldsToUpdate.ownerAddharImages.aadharFrontSide = fieldsToUpdate.aadharFrontSide;
            if (fieldsToUpdate.aadharBackSide)
                fieldsToUpdate.ownerAddharImages.aadharBackSide = fieldsToUpdate.aadharBackSide;

            delete fieldsToUpdate.aadharFrontSide;
            delete fieldsToUpdate.aadharBackSide;
        }
        if (fieldsToUpdate.shopImage && Array.isArray(fieldsToUpdate.shopImage)) {
            const processedImages = [];
            for (let img of fieldsToUpdate.shopImage) {
                if (isBase64Image(img)) {
                    const uploadedUrl = await ImageUploader.Upload(img, "ShopImages");
                    processedImages.push(uploadedUrl);
                } else {
                    processedImages.push(img);
                }
            }
            fieldsToUpdate.shopImage = processedImages;
        }
        try {
            await Shop.findByIdAndUpdate(
                shopId,
                { $set: fieldsToUpdate },
                { new: true }
            );
            const shop = await Shop.findById(shopId, {
                updatedAt: 0,
                createdAt: 0,
                __v: 0,
            }).populate('packageId AdditionalPackages');
            return shop;
        } catch (err) {
            console.error("Failed to edit shop:", err);
            throw err;
        }
    },


    async getMyShop() {
        try {
            const userinfo = global.user;

            const shops = await Shop.find(
                { userId: userinfo.userId },
                {
                    updatedAt: 0,
                    createdAt: 0,
                    __v: 0,
                }
            ).populate('packageId AdditionalPackages');

            const now = new Date();

            for (const shop of shops) {
                const isExpired = shop.packageEndDate && shop.packageEndDate < now;
                const shouldBeFalse = isExpired && shop.isSubscriptionPurchased;
                const shouldBeTrue = !isExpired && !shop.isSubscriptionPurchased;

                if (shouldBeFalse || shouldBeTrue) {
                    shop.isSubscriptionPurchased = !isExpired;
                    await shop.save();
                }
            }

            return shops;

        } catch (err) {
            console.log("Error in getting my shop:", err);
        }
    },


    async getNearbyShop(data) {
        const { latitude, longitude } = data;
        const MAX_DISTANCE_METERS = 15 * 1000;

        const userLocation = {
            type: "Point",
            coordinates: [longitude, latitude]
        };

        // Find shops with expired subscriptions within the defined radius
        const expiredShops = await Shop.find({
            "locationHistory.point": {
                $near: {
                    $geometry: userLocation,
                    $maxDistance: MAX_DISTANCE_METERS
                }
            },
            packageEndDate: { $lt: new Date() },
            isSubscriptionPurchased: true
        }).select('_id');

        // Update the subscription status of expired shops
        if (expiredShops.length > 0) {
            const expiredShopIds = expiredShops.map(shop => shop._id);
            await Shop.updateMany(
                { _id: { $in: expiredShopIds } },
                { $set: { isSubscriptionPurchased: false } }
            );
        }

        // Aggregate nearby shops with active subscriptions
        const nearbyShops = await Shop.aggregate([
            {
                $geoNear: {
                    near: userLocation,
                    distanceField: "distance",
                    spherical: true,
                    maxDistance: MAX_DISTANCE_METERS
                }
            },
            {
                $addFields: {
                    distanceInKm: { $divide: ["$distance", 1000] }
                }
            },
            {
                $match: {
                    distanceInKm: { $lte: 15 },
                    isSubscriptionPurchased: true
                }
            },
            {
                $lookup: {
                    from: "packages",
                    localField: "packageId",
                    foreignField: "_id",
                    as: "packageId"
                },
            },

            {
                $unwind: {
                    path: "$packageId",
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $lookup: {
                    from: "packages",
                    localField: "AdditionalPackages",
                    foreignField: "_id",
                    as: "AdditionalPackages"
                }
            }
        ]);

        return nearbyShops;
    },

    async AddProduct(data) {
        const { productsImage, productName, productsDescription, productsPrice,
            productCategory, productSubCategory, productBrand, shopId, discountedvalue, discounttype } = data;
        let imagesUrl = [];
        if (productsImage && productsImage.length > 0) {
            for (const image of productsImage) {
                const uploadedImage = await ImageUploader.Upload(image, "Product");
                imagesUrl.push(uploadedImage);
            }
        }

        const finalDiscount = {
            discountedvalue: discounttype === 'fixed' ? 0 : discountedvalue,
            discounttype: discounttype.toLowerCase() === 'fixed' ? 'fixed' : 'percent'
        };
        const product = new Product({
            productsImage: imagesUrl,
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
    // async editProduct(data) {
    //     const { productId, discounttype, discountedvalue, ...rest } = data;

    //     if (discounttype && discountedvalue !== undefined) {
    //         rest.productDiscount = {
    //             discounttype: discounttype.toLowerCase(),
    //             discountedvalue: discountedvalue,
    //         };
    //     }

    //     try {
    //         const updatedProduct = await Product.findByIdAndUpdate(productId, { $set: rest }, { new: true });
    //         return updatedProduct;
    //     } catch (err) {
    //         console.error("Failed to edit product:", err);
    //         throw err;
    //     }
    // },


    async editProduct(data) {
        const { productId, shopId, discounttype, discountedvalue, isImageEditDone, productsImage, ...rest } = data;

        if (discounttype && discountedvalue !== undefined) {
            rest.productDiscount = {
                discounttype: discounttype.toLowerCase(),
                discountedvalue: discountedvalue,
            };
        }
        const product = await Product.findById(productId);
        const shop = await Shop.findById(product.shopId);
        if (isImageEditDone) {
            shop.TotalEditDone += 1;
        }

        if (productsImage && Array.isArray(productsImage)) {
            const processedImages = [];
            for (let img of productsImage) {
                if (isBase64Image(img)) {
                    const uploadedUrl = await ImageUploader.Upload(img, "Product");
                    processedImages.push(uploadedUrl);
                } else {
                    processedImages.push(img);
                }
            }
            rest.productsImage = processedImages;
        }
        try {
            const updatedProduct = await Product.findByIdAndUpdate(
                productId,
                { $set: rest },
                { new: true }
            );
            shop.save();
            // const product=await Product.findById(productId)
            return updatedProduct;
        } catch (err) {
            console.error("Failed to edit product:", err);
            throw err;
        }
    },
    async getFilterProduct(filters) {
        const baseQuery = { shopId: filters.shopId };
        const orConditions = [];

        if (filters.productCategory?.length > 0) {
            orConditions.push({ productCategory: { $in: filters.productCategory } });
        }

        if (filters.productSubCategory?.length > 0) {
            orConditions.push({ productSubCategory: { $in: filters.productSubCategory } });
        }

        if (filters.productBrand?.length > 0) {
            orConditions.push({ productBrand: { $in: filters.productBrand } });
        }

        const finalQuery = {
            ...baseQuery,
            ...(orConditions.length > 0 ? { $or: orConditions } : {}),
        };

        const page = parseInt(filters.page) || 1;
        const limit = 10;
        const skip = (page - 1) * limit;

        try {
            const allMatchingProducts = await Product.find(finalQuery)
                .sort({ createdAt: -1 })
                .lean();

            const categorizedProducts = {};
            for (const product of allMatchingProducts) {
                const category = product.productCategory || "Uncategorized";
                if (!categorizedProducts[category]) {
                    categorizedProducts[category] = [];
                }
                categorizedProducts[category].push(product);
            }

            const filterProducts = {};
            for (const category in categorizedProducts) {
                const items = categorizedProducts[category];
                const paginatedItems = items.slice(skip, skip + limit);
                filterProducts[category] = paginatedItems;
            }

            return filterProducts;

        } catch (err) {
            console.error("Error fetching categorized filtered products:", err);
            throw err;
        }
    },
    // async getFilterProduct(filters) {
    //     const query = { shopId: filters.shopId };

    //     if (filters.productCategory && filters.productCategory.length > 0) {
    //         query.productCategory = { $in: filters.productCategory };
    //     }

    //     if (filters.productSubCategory && filters.productSubCategory.length > 0) {
    //         query.productSubCategory = { $in: filters.productSubCategory };
    //     }

    //     if (filters.productBrand && filters.productBrand.length > 0) {
    //         query.productBrand = { $in: filters.productBrand };
    //     }

    //     const page = parseInt(filters.page) || 1;
    //     const limit = 10;
    //     const skip = (page - 1) * limit;

    //     try {
    //         const allMatchingProducts = await Product.find(query)
    //             .sort({ createdAt: -1 })
    //             .lean();

    //         const categorizedProducts = {};
    //         for (const product of allMatchingProducts) {
    //             const category = product.productCategory || "Uncategorized";
    //             if (!categorizedProducts[category]) {
    //                 categorizedProducts[category] = [];
    //             }
    //             categorizedProducts[category].push(product);
    //         }

    //         const filterProducts = {};
    //         for (const category in categorizedProducts) {
    //             const items = categorizedProducts[category];
    //             const total = items.length;
    //             const paginatedItems = items.slice(skip, skip + limit);
    //             filterProducts[category] = paginatedItems;
    //         }

    //         return filterProducts;

    //     } catch (err) {
    //         console.log("Error fetching categorized filtered products:", err);
    //         throw err;
    //     }
    // },
    // async getFilterProduct(data) {
    //     const { latitude, longitude, shopId, page = 1 } = data;
    //     const limit = 10;
    //     const skip = (page - 1) * limit;

    //     try {
    //         // If shopId is provided, fetch its products
    //         if (shopId) {
    //             const shop = await Shop.findById(shopId);
    //             if (!shop) {
    //                 return CustomErrorHandler.notFound("The specified shop is not available.");
    //             }

    //             const products = await Product.find({ shopId: shop._id })
    //                 .sort({ createdAt: -1 })
    //                 .skip(skip)
    //                 .limit(limit)
    //                 .lean();

    //             const totalProducts = await Product.countDocuments({ shopId: shop._id });

    //             const categorizedProducts = {};
    //             products.forEach((product) => {
    //                 const category = product.productCategory || "Uncategorized";
    //                 if (!categorizedProducts[category]) {
    //                     categorizedProducts[category] = [];
    //                 }
    //                 categorizedProducts[category].push(product);
    //             });

    //             return {
    //                 source: "shop",
    //                 shop: shop,
    //                 totalProducts,
    //                 products: categorizedProducts
    //             };
    //         }

    //         // If shopId is not provided, proceed with finding nearby shops
    //         const MAX_DISTANCE_METERS = 15 * 1000;
    //         const userLocation = {
    //             type: "Point",
    //             coordinates: [longitude, latitude]
    //         };

    //         // Expire subscriptions of outdated shops
    //         const expiredShops = await Shop.find({
    //             "locationHistory.point": {
    //                 $near: {
    //                     $geometry: userLocation,
    //                     $maxDistance: MAX_DISTANCE_METERS
    //                 }
    //             },
    //             packageEndDate: { $lt: new Date() },
    //             isSubscriptionPurchased: true
    //         }).select('_id');

    //         if (expiredShops.length > 0) {
    //             const expiredShopIds = expiredShops.map(shop => shop._id);
    //             await Shop.updateMany(
    //                 { _id: { $in: expiredShopIds } },
    //                 { $set: { isSubscriptionPurchased: false } }
    //             );
    //         }

    //         // Find nearby active shops
    //         const nearbyShops = await Shop.aggregate([
    //             {
    //                 $geoNear: {
    //                     near: userLocation,
    //                     distanceField: "distance",
    //                     spherical: true,
    //                     maxDistance: MAX_DISTANCE_METERS
    //                 }
    //             },
    //             {
    //                 $addFields: {
    //                     distanceInKm: { $divide: ["$distance", 1000] }
    //                 }
    //             },
    //             {
    //                 $match: {
    //                     distanceInKm: { $lte: 15 },
    //                     isSubscriptionPurchased: true
    //                 }
    //             },
    //             {
    //                 $lookup: {
    //                     from: "packages",
    //                     localField: "packageId",
    //                     foreignField: "_id",
    //                     as: "packageId"
    //                 }
    //             },
    //             {
    //                 $unwind: {
    //                     path: "$packageId",
    //                     preserveNullAndEmptyArrays: true
    //                 }
    //             },
    //             {
    //                 $lookup: {
    //                     from: "packages",
    //                     localField: "AdditionalPackages",
    //                     foreignField: "_id",
    //                     as: "AdditionalPackages"
    //                 }
    //             }
    //         ]);

    //         // Fetch products from all nearby shops
    //         const shopIds = nearbyShops.map(shop => shop._id);
    //         const nearbyProducts = await Product.find({ shopId: { $in: shopIds } })
    //             .sort({ createdAt: -1 })
    //             .skip(skip)
    //             .limit(limit)
    //             .lean();

    //         return {
    //             source: "nearby",
    //             shops: nearbyShops,
    //             products: nearbyProducts
    //         };

    //     } catch (error) {
    //         console.log("Failed to get products based on location or shopId", error);
    //         throw error;
    //     }
    // },
    async getProduct(data) {
        try {
            const product = await Product.findById(data.productId);
            if (!product) {
                throw CustomErrorHandler.notFound("Product Not Found");
            }
            return product;
        } catch (error) {
            console.log(`Failed to Get The product: ${error}`);
        }
    },


    async getShopProduct(data) {
        try {
            const shop = await Shop.findById(data.shopId);
            if (!shop) {
                return CustomErrorHandler.notFound("The specified shop is not available.");
            }

            const page = parseInt(data.page) || 1;
            const limit = 10;
            const skip = (page - 1) * limit;

            const products = await Product.find({ shopId: shop._id })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean();

            const totalProducts = await Product.countDocuments({ shopId: shop._id });
            const categorizedProducts = {};
            products.forEach((product) => {
                const category = product.productCategory || "Uncategorized";
                if (!categorizedProducts[category]) {
                    categorizedProducts[category] = [];
                }
                categorizedProducts[category].push(product);
            });

            return categorizedProducts;
        } catch (error) {
            console.log("Failed to get Shop Products with pagination", error);
            throw error;
        }
    },
    async getTotalImageCount(shopId) {
        try {
            const shop = await Shop.findById(shopId)
                .populate('packageId')
                .populate('AdditionalPackages');

            if (!shop) {
                throw CustomErrorHandler.notFound("The specified shop is not available.");
            }

            const products = await Product.find({ shopId: shop._id }).select('productsImage').lean();
            let totalImageCount = 0;
            products.forEach(product => {
                totalImageCount += product.productsImage?.length || 0;
            });
            let totalMediaLimit = 0;
            if (shop.packageId) {
                totalMediaLimit += shop.packageId.maxMedia || 0;
            }
            if (Array.isArray(shop.AdditionalPackages) && shop.AdditionalPackages.length > 0) {
                shop.AdditionalPackages.forEach(pkg => {
                    totalMediaLimit += pkg.maxMedia || 0;
                });
            }
            let TotalEditDone = shop.TotalEditDone;


            return {
                totalImageCount,
                totalMediaLimit,
                TotalEditDone
            };

        } catch (error) {
            console.error("Error calculating total image count:", error);
            throw error;
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


    //here we are using levenshteinDistance alogrithm to correct the incorrect query provided by user
    async correctIncorrectQuery(source, target) {
        const matrix = [];

        // Initialize matrix
        for (let i = 0; i <= target.length; i++) {
            matrix[i] = [i];
        }
        for (let j = 0; j <= source.length; j++) {
            matrix[0][j] = j;
        }
        // Populate matrix using Levenshtein distance
        for (let i = 1; i <= target.length; i++) {
            for (let j = 1; j <= source.length; j++) {
                if (target.charAt(i - 1) === source.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    )
                }
            }
        }
        return matrix[target.length][source.length];
    },

    async searchShopsAndProducts(query) {
        try {
            //first we well try to find the orginal query result or partially match result 
            const originalQueryRegex = new RegExp(query, 'i');

            // Find any shops or products matching the original query
            const initialShops = await Shop.find({
                $or: [
                    { shopName: originalQueryRegex },
                    { shopDescription: originalQueryRegex },
                    { shopAddress: originalQueryRegex },
                ]
            }).populate('packageId');

            const initialProducts = await Product.find({
                $or: [
                    { productName: originalQueryRegex },
                    { productsDescription: originalQueryRegex },
                    { productCategory: originalQueryRegex },
                    { productSubCategory: originalQueryRegex },
                    { productBrand: originalQueryRegex },
                ]
            });

            /* If we find the result based on the user orginal query there is no 
            need for us to do spell correction such that we return the original result */

            if (initialShops.length > 0 || initialProducts.length > 0) {
                const shops = await Shop.find({
                    $or: [
                        { shopName: originalQueryRegex },
                        { shopDescription: originalQueryRegex },
                        { shopAddress: originalQueryRegex },
                    ]
                }).populate('packageId');

                const products = await Product.find({
                    $or: [
                        { productName: originalQueryRegex },
                        { productsDescription: originalQueryRegex },
                        { productCategory: originalQueryRegex },
                        { productSubCategory: originalQueryRegex },
                        { productBrand: originalQueryRegex },
                    ]
                });

                return { shops, products, didYouMean: null, originalQuery: query, correctedQuery: null };
            }

            /* if we dont find the result based on user orginal text wheater the query text is incorret
            we will do an spell correction to find the result using correct query
            Lets get the relevant field from database that might contain the search term */

            const [
                categories,
                subCategories,
                brands,
                productNames,
                shopNames,
                productDescriptionTerms
            ] = await Promise.all([
                Category.distinct('categoryItem'),
                Product.distinct('productSubCategory'),
                Product.distinct('productBrand'),
                Product.distinct('productName'),
                Shop.distinct('shopName'),
                Product.find({}, { productsDescription: 1 }).limit(100)
            ]);

            // Extract and filter meaningful words from product descriptions
            const descriptionWords = [];
            productDescriptionTerms.forEach(product => {
                if (product.productsDescription) {
                    // Split description and filter out short words and common stop words
                    const words = product.productsDescription
                        .split(/\s+/)
                        .filter(word =>
                            word.length > 3 &&
                            !/^(the|and|for|with|this|that|from|have|has|are|not)$/i.test(word)
                        );
                    descriptionWords.push(...words);
                }
            });

            // Create a single array of all potential search terms from the database
            const potentialTerms = [
                ...(Array.isArray(categories) ? categories.flat() : []),
                ...(Array.isArray(subCategories) ? subCategories : []),
                ...(Array.isArray(brands) ? brands : []),
                ...(Array.isArray(productNames) ? productNames : []),
                ...(Array.isArray(shopNames) ? shopNames : []),
                ...descriptionWords
            ];

            // Process and  clean up, filter short words, deduplicate terms
            const processedTerms = [...new Set(
                potentialTerms
                    .filter(term => term && typeof term === 'string')
                    .map(term => term.toLowerCase().trim())
                    .filter(term => term.length > 2) // Only consider terms with at least 3 characters
            )];
            // Attempt spelling correction for each word in the query
            const queryWords = query.toLowerCase().trim().split(/\s+/);
            // For each query word, find the best spelling suggestion
            const suggestions = [];
            for (const word of queryWords) {
                if (word.length <= 2) {
                    suggestions.push(word);
                    continue;
                }

                let bestMatch = word;
                let minDistance = Infinity;

                for (const term of processedTerms) {
                    // Only consider terms that are somewhat similar in length to the query word
                    if (Math.abs(term.length - word.length) > Math.min(3, word.length / 2)) {
                        continue;
                    }
                    const distance = await ShopService.correctIncorrectQuery(word, term);
                    const normalizedDistance = distance / Math.max(word.length, term.length);
                    // Consider a term as a potential match if it's similar enough
                    if (normalizedDistance < 0.4 && distance < minDistance) {
                        bestMatch = term;
                        minDistance = distance;
                    }
                }

                suggestions.push(bestMatch);
            }

            // Only accept the suggestion if it's different from the original query
            const suggestedQuery = suggestions.join(' ');
            const didYouMean = suggestedQuery !== query.toLowerCase().trim() ? suggestedQuery : null;

            const searchQuery = didYouMean || query;
            const searchQueryRegex = new RegExp(searchQuery, 'i');
            const shops = await Shop.find({
                $or: [
                    { shopName: searchQueryRegex },
                    { shopDescription: searchQueryRegex },
                    { shopAddress: searchQueryRegex },
                ]
            }).populate('packageId');

            const products = await Product.find({
                $or: [
                    { productName: searchQueryRegex },
                    { productsDescription: searchQueryRegex },
                    { productCategory: searchQueryRegex },
                    { productSubCategory: searchQueryRegex },
                    { productBrand: searchQueryRegex },
                ]
            });

            return {
                shops,
                products,
                didYouMean,
                originalQuery: query,
                correctedQuery: didYouMean !== null ? suggestedQuery : null
            };
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
        console.log(category);
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
    },
    async updateSubscriptionStatus(data) {
        try {
            const shop = await Shop.findById(data.shopId);
            if (!shop) {
                return CustomErrorHandler.notFound("Shop Not Found");
            }
            const user = await User.findById(shop.userId);
            if (!user) {
                return CustomErrorHandler.notFound("User Not Found");
            }
            const purchasedPackage = await Package.findById(data.packageId);
            if (!purchasedPackage) {
                return CustomErrorHandler.notFound("Package Not Found");
            }
            shop.packageId = data.packageId;
            shop.packageStartDate = data.packageStartDate;
            shop.packageEndDate = data.packageEndDate;
            shop.isSubscriptionPurchased = true;
            shop.save();
            return shop;
        } catch (error) {
            console.log("Failed to update Subscription Status:", error);
        }
    },

    async addExtensionPackage(data) {
        try {
            const shop = await Shop.findById(data.shopId);
            if (!shop) {
                return CustomErrorHandler.notFound("Shop Not Found");
            }
            if (shop.isSubscriptionPurchased == false) throw CustomErrorHandler.notFound("You Need an Active Subscription To add Extension Package");
            const user = await User.findById(shop.userId);
            if (!user) {
                return CustomErrorHandler.notFound("User Not Found");
            }
            const purchasedPackage = await Package.findById(data.packageId);
            if (!purchasedPackage) {
                return CustomErrorHandler.notFound("Package Not Found");
            }
            shop.AdditionalPackages.push(data.packageId);
            shop.save();
            return shop;
        } catch (error) {
            console.log("Failed to update Subscription Status:", error);
        }
    },

    async SimilarProduct(data) {
        const { category, subcategory, brand } = data;
        const { latitude, longitude } = data;
        const MAX_DISTANCE_METERS = 15 * 1000;

        const userLocation = {
            type: "Point",
            coordinates: [longitude, latitude]
        };

        // Find shops with expired subscriptions within the defined radius
        const expiredShops = await Shop.find({
            "locationHistory.point": {
                $near: {
                    $geometry: userLocation,
                    $maxDistance: MAX_DISTANCE_METERS
                }
            },
            packageEndDate: { $lt: new Date() },
            isSubscriptionPurchased: true
        }).select('_id');
        const products = await Product.find({
            productCategory: category,
            productSubCategory: subcategory,
            productBrand: brand
        });

    },
    async getSimilarProduct(data) {
        try {
            const { productId, latitude, longitude, page = 1, limit = 10 } = data;
            const MAX_DISTANCE_METERS = 15 * 1000;

            const product = await Product.findById(productId);
            if (!product) {
                throw new Error("Product not found");
            }

            const userLocation = {
                type: "Point",
                coordinates: [longitude, latitude]
            };

            const expiredShops = await Shop.find({
                "locationHistory.point": {
                    $near: {
                        $geometry: userLocation,
                        $maxDistance: MAX_DISTANCE_METERS
                    }
                },
                packageEndDate: { $lt: new Date() },
                isSubscriptionPurchased: true
            }).select('_id');

            if (expiredShops.length > 0) {
                const expiredShopIds = expiredShops.map(shop => shop._id);
                await Shop.updateMany(
                    { _id: { $in: expiredShopIds } },
                    { $set: { isSubscriptionPurchased: false } }
                );
            }

            const nearbyShops = await Shop.aggregate([
                {
                    $geoNear: {
                        near: userLocation,
                        distanceField: "distance",
                        spherical: true,
                        maxDistance: MAX_DISTANCE_METERS
                    }
                },
                {
                    $addFields: {
                        distanceInKm: { $divide: ["$distance", 1000] }
                    }
                },
                {
                    $match: {
                        distanceInKm: { $lte: 15 },
                        isSubscriptionPurchased: true
                    }
                },
                {
                    $lookup: {
                        from: "packages",
                        localField: "packageId",
                        foreignField: "_id",
                        as: "packageId"
                    }
                },
                {
                    $unwind: {
                        path: "$packageId",
                        preserveNullAndEmptyArrays: true
                    }
                }
            ]);

            const shopIds = nearbyShops.map((shop) => shop._id);
            const skip = (page - 1) * limit;
            console.log(skip);
            const similarProducts = await Product.find({
                shopId: { $in: shopIds },
                $or: [
                    { category: product.category },
                    { productSubCategory: product.subcategory },
                    { productBrand: product.brand },
                ],
                _id: { $ne: productId },
            })
                .skip(skip)
                .limit(limit);

            return similarProducts;
        } catch (error) {
            console.error("Error fetching similar products:", error);
            throw error;
        }
    },


    async getSimilarShopProduct(data) {
        try {
            const { shopId, productId, page = 1, limit = 5 } = data;
            const skip = (page - 1) * limit;
            const product = await Product.findById(productId);
            if (!product) {
                throw new Error("Product not found");
            }
            const products = await Product.find({
                shopId: shopId,
                $or: [
                    { category: product.category },
                    { productSubCategory: product.subcategory },
                    { productBrand: product.brand },
                ],
                _id: { $ne: productId },
            })
                .skip(skip)
                .limit(limit);

            return products;
        } catch (error) {
            console.error("Error fetching more products from the same shop:", error);
            throw error;
        }
    },

    // async getMoreSameShopProduct(shopId, productId) {
    //     try {

    //         const products = await Product.find({
    //             shopId: shopId,
    //             _id: { $ne: productId },
    //         });

    //         return products;
    //     } catch (error) {
    //         console.error("Error fetching more products from the same shop:", error);
    //         throw error;
    //     }
    // },

    async getMoreFromBrand(brand, productId, page = 1, limit = 10) {
        try {
            const skip = (page - 1) * limit;

            const products = await Product.find({
                productBrand: brand,
                _id: { $ne: productId },
            })
                .skip(skip)
                .limit(limit);

            return products;
        } catch (error) {
            console.error("Error fetching more products from the same brand:", error);
            throw error;
        }
    },
    async getShopAnalytics(shopId) {
        try {
            const shop = await Shop.findById(shopId);
            if (!shop) {
                throw CustomErrorHandler.notFound("Shop not found");
            }

            const totalProductViews = await ProductView.countDocuments({ shopId });

            const totalShopVisits = await ShopVisit.countDocuments({ shopId });
            const totalProducts = await Product.countDocuments({ shopId });
            const activeProducts = await Product.countDocuments({ shopId, isActive: true });
            const topProducts = await ProductView.aggregate([
                {
                    $match:
                    {
                        shopId: mongoose.Types.ObjectId(shopId)
                    }
                },
                {
                    $group: {
                        _id: "$productId",
                        viewCount: { $sum: 1 }
                    }
                },
                {
                    $sort: {
                        viewCount: -1
                    }
                },
                // {
                //     $limit: 5
                // },
                {
                    $lookup: {
                        from: "products",
                        localField: "_id",
                        foreignField: "_id",
                        as: "product"
                    }
                },
                {
                    $unwind: "$product"
                },
                {
                    $project: {
                        _id: 0,
                        // productId: "$_id",
                        viewCount: 1,
                        product: "$product"
                    }
                }
            ]);


            const today = new Date();
            const sevenDaysAgo = new Date(today);
            sevenDaysAgo.setDate(today.getDate() - 7);

            const visitorTrend = await ShopVisit.aggregate([
                {
                    $match: {
                        shopId: mongoose.Types.ObjectId(shopId),
                        visitedAt: { $gte: sevenDaysAgo }
                    }
                },
                {
                    $group: {
                        _id: {
                            year: { $year: "$visitedAt" },
                            month: { $month: "$visitedAt" },
                            day: { $dayOfMonth: "$visitedAt" }
                        },
                        count: { $sum: 1 }
                    }
                },
                {
                    $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 }
                },
                {
                    $project: {
                        _id: 0,
                        date: {
                            $dateFromParts: {
                                year: "$_id.year",
                                month: "$_id.month",
                                day: "$_id.day"
                            }
                        },
                        count: 1
                    }
                }
            ]);

            return {
                totalProductViews,
                totalShopVisits,
                totalProducts,
                activeProducts,
                topProducts,
                visitorTrend
            };
        } catch (error) {
            console.error("Error getting shop analytics:", error);
            throw error;
        }
    },

    // Get product view analytics for a specific time range
    async getProductViewAnalytics(shopId, timeRange) {
        try {
            const shop = await Shop.findById(shopId);
            if (!shop) {
                throw CustomErrorHandler.notFound("Shop not found");
            }

            const today = new Date();
            let startDate;

            switch (timeRange) {
                case '7days':
                    startDate = new Date(today);
                    startDate.setDate(today.getDate() - 7);
                    break;
                case '15days':
                    startDate = new Date(today);
                    startDate.setDate(today.getDate() - 15);
                    break;
                case '30days':
                    startDate = new Date(today);
                    startDate.setDate(today.getDate() - 30);
                    break;
                case 'all':
                default:
                    startDate = new Date(0); // Beginning of time
            }

            // Get most viewed products within the time range
            const mostViewedProducts = await ProductView.aggregate([
                {
                    $match: {
                        shopId: mongoose.Types.ObjectId(shopId),
                        viewedAt: { $gte: startDate }
                    }
                },
                {
                    $group: {
                        _id: "$productId",
                        viewCount: { $sum: 1 }
                    }
                },
                { $sort: { viewCount: -1 } },
                { $limit: 10 },
                {
                    $lookup: {
                        from: "products",
                        localField: "_id",
                        foreignField: "_id",
                        as: "productDetails"
                    }
                },
                { $unwind: "$productDetails" },
                {
                    $project: {
                        _id: 1,
                        viewCount: 1,
                        productName: "$productDetails.productName",
                        productImage: { $arrayElemAt: ["$productDetails.productsImage", 0] },
                        price: "$productDetails.productsPrice",
                        category: "$productDetails.productCategory"
                    }
                }
            ]);

            // Get daily product view trend
            const dailyViewTrend = await ProductView.aggregate([
                {
                    $match: {
                        shopId: mongoose.Types.ObjectId(shopId),
                        viewedAt: { $gte: startDate }
                    }
                },
                {
                    $group: {
                        _id: {
                            year: { $year: "$viewedAt" },
                            month: { $month: "$viewedAt" },
                            day: { $dayOfMonth: "$viewedAt" }
                        },
                        count: { $sum: 1 }
                    }
                },
                {
                    $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 }
                },
                {
                    $project: {
                        _id: 0,
                        date: {
                            $dateFromParts: {
                                year: "$_id.year",
                                month: "$_id.month",
                                day: "$_id.day"
                            }
                        },
                        count: 1
                    }
                }
            ]);

            // Get category-wise view distribution
            const categoryDistribution = await ProductView.aggregate([
                {
                    $match: {
                        shopId: mongoose.Types.ObjectId(shopId),
                        viewedAt: { $gte: startDate }
                    }
                },
                {
                    $lookup: {
                        from: "products",
                        localField: "productId",
                        foreignField: "_id",
                        as: "productDetails"
                    }
                },
                { $unwind: "$productDetails" },
                {
                    $group: {
                        _id: "$productDetails.productCategory",
                        viewCount: { $sum: 1 }
                    }
                },
                {
                    $project: {
                        _id: 0,
                        category: "$_id",
                        viewCount: 1
                    }
                },
                { $sort: { viewCount: -1 } }
            ]);

            return {
                mostViewedProducts,
                dailyViewTrend,
                categoryDistribution,
                timeRange
            };
        } catch (error) {
            console.error("Error getting product view analytics:", error);
            throw error;
        }
    },

    // Get visitor analytics
    async getVisitorAnalytics(shopId, timeRange) {
        try {
            const shop = await Shop.findById(shopId);
            if (!shop) {
                throw CustomErrorHandler.notFound("Shop not found");
            }

            const today = new Date();
            let startDate;

            switch (timeRange) {
                case '7days':
                    startDate = new Date(today);
                    startDate.setDate(today.getDate() - 7);
                    break;
                case '15days':
                    startDate = new Date(today);
                    startDate.setDate(today.getDate() - 15);
                    break;
                case '30days':
                    startDate = new Date(today);
                    startDate.setDate(today.getDate() - 30);
                    break;
                case 'all':
                default:
                    startDate = new Date(0); // Beginning of time
            }

            // Get total visitors
            const totalVisitors = await ShopVisit.countDocuments({
                shopId,
                visitedAt: { $gte: startDate }
            });

            // Get unique visitors
            const uniqueVisitors = await ShopVisit.aggregate([
                {
                    $match: {
                        shopId: mongoose.Types.ObjectId(shopId),
                        visitedAt: { $gte: startDate },
                        userId: { $ne: null }
                    }
                },
                {
                    $group: {
                        _id: "$userId",
                        count: { $sum: 1 }
                    }
                },
                {
                    $count: "uniqueVisitors"
                }
            ]);

            // Get daily visitor trend
            const dailyVisitorTrend = await ShopVisit.aggregate([
                {
                    $match: {
                        shopId: mongoose.Types.ObjectId(shopId),
                        visitedAt: { $gte: startDate }
                    }
                },
                {
                    $group: {
                        _id: {
                            year: { $year: "$visitedAt" },
                            month: { $month: "$visitedAt" },
                            day: { $dayOfMonth: "$visitedAt" }
                        },
                        count: { $sum: 1 }
                    }
                },
                {
                    $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 }
                },
                {
                    $project: {
                        _id: 0,
                        date: {
                            $dateFromParts: {
                                year: "$_id.year",
                                month: "$_id.month",
                                day: "$_id.day"
                            }
                        },
                        count: 1
                    }
                }
            ]);

            return {
                totalVisitors,
                uniqueVisitors: uniqueVisitors.length > 0 ? uniqueVisitors[0].uniqueVisitors : 0,
                dailyVisitorTrend,
                timeRange
            };
        } catch (error) {
            console.error("Error getting visitor analytics:", error);
            throw error;
        }
    },


    async getDailyVisitors(shopId, days) {
        try {
            const shop = await Shop.findById(shopId);
            if (!shop) {
                throw CustomErrorHandler.notFound("Shop not found");
            }

            const today = new Date();
            const startDate = new Date(today);
            startDate.setDate(today.getDate() - days);

            const dailyVisitorData = await ShopVisit.aggregate([
                {
                    $match: {
                        shopId: mongoose.Types.ObjectId(shopId),
                        visitedAt: { $gte: startDate }
                    }
                },
                {
                    $group: {
                        _id: {
                            year: { $year: "$visitedAt" },
                            month: { $month: "$visitedAt" },
                            day: { $dayOfMonth: "$visitedAt" }
                        },
                        count: { $sum: 1 }
                    }
                },
                {
                    $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 }
                },
                {
                    $project: {
                        _id: 0,
                        date: {
                            $dateFromParts: {
                                year: "$_id.year",
                                month: "$_id.month",
                                day: "$_id.day"
                            }
                        },
                        visitors: "$count"
                    }
                }
            ]);

            const result = [];
            for (let i = 0; i < days; i++) {
                const date = new Date(today);
                date.setDate(today.getDate() - i);
                date.setHours(0, 0, 0, 0);

                const found = dailyVisitorData.find(item =>
                    new Date(item.date).setHours(0, 0, 0, 0) === date.getTime()
                );

                if (found) {
                    result.unshift({
                        date: date.toISOString().split('T')[0],
                        visitors: found.visitors
                    });
                } else {
                    result.unshift({
                        date: date.toISOString().split('T')[0],
                        visitors: 0
                    });
                }
            }

            return {
                dailyVisitorData: result,
                days
            };
        } catch (error) {
            console.error("Error getting daily visitors:", error);
            throw error;
        }
    },

    async recordProductView(data) {
        const { productId, shopId } = data;

        try {
            const userInfo = global.user;
            const userId = userInfo.userId;

            const product = await Product.findById(productId);
            if (!product) {
                throw CustomErrorHandler.notFound("Product not found");
            }
            const existingView = await ProductView.findOne({
                productId,
                userId,
            });

            if (existingView) {
                // console.log("View already recorded for this device serial number.");
                return false;
            }
            const productView = new ProductView({
                productId,
                shopId,
                userId
            });

            await productView.save();
            return true;
        } catch (error) {
            console.error("Error recording product view:", error);
            throw error;
        }
    },

    async recordShopVisit(data) {
        const { shopId } = data;
        try {
            const shop = await Shop.findById(shopId);
            const userInfo = global.user;
            const userId = userInfo.userId;
            if (!shop) {
                throw CustomErrorHandler.notFound("Shop not found");
            }
            const existingView = await ShopVisit.findOne({
                shopId,
                userId
            });

            if (existingView) {
                // console.log("View already recorded for this device serial number.");
                return false;
            }
            const shopVisit = new ShopVisit({
                shopId,
                userId
            });
            await shopVisit.save();
            return true;
        } catch (error) {
            console.error("Error recording shop visit:", error);
            throw error;
        }
    },


    async sendOTP(data) {
        const { phoneNumber } = data;
        const userId = global.user.userId;
        const otpExpiryMinutes = 10;
        const mode = "prod";
        const apiUrl = "https://www.fast2sms.com/dev/bulkV2";
        const apiKey = FAST_SMS_KEY;
        const otpLength = 5; // You can change this to the desired length of your OTP
        // Generate a random string of numeric characters
        const otp = Array.from(crypto.randomBytes(otpLength))
            .map((byte) => (byte % 10).toString())
            .join("")
            .slice(0, otpLength);

        const route = "dlt";

        const config = {
            params: {
                authorization: apiKey,
                sender_id: SENDER_ID,
                message: MESSAGE_ID,
                variables_values: otp,
                route: route,
                numbers: phoneNumber,
                flash: 0
            },

            headers: {
                "cache-control": "no-cache",
            },
        };

        const expiryTime = new Date();
        expiryTime.setMinutes(expiryTime.getMinutes() + otpExpiryMinutes);

        const otpexist = await OTP.findOne({ userId });

        if (otpexist) {
            if (otpexist.attempts > 2) {
                // Current date-time
                const currentDate = new Date();

                const expiredDate = otpexist.expiryTime;

                console.log("expiredDate  ", expiredDate);

                console.log("currentDate  ", currentDate);

                // Calculate the difference in milliseconds
                const timeDifference = currentDate.getTime() - expiredDate.getTime();

                // Convert the difference to hours
                const hoursDifference = timeDifference / (1000 * 60 * 60);

                console.log("hoursDifference  ", hoursDifference);

                if (hoursDifference > 5) {
                    await OTP.updateOne({ _id: otpexist._id }, { attempts: 0 });
                } else {
                    throw CustomErrorHandler.notFound("Maximum attempts exceeded");
                }
            }

            await OTP.updateOne(
                { _id: otpexist._id },
                { otp, expiryTime, $inc: { attempts: 1 } }
            );
        } else {
            // Store OTP and related data in MongoDB
            await OTP.create({ userId, otp, expiryTime });
        }
        try {
            if (mode == "prod") {
                const response = await axios.get(apiUrl, config);
                if (response) {
                    // console.log("responce",response);
                    return true;
                }
            } else {
                return true;
            }
            console.log(response);
        } catch (error) {
            console.log(error.response.data);
            console.log(error?.data?.message);
            console.log(error?.data);
            throw CustomErrorHandler.serverError(
                error?.response?.data?.message ?? "Phone Number not valid"
            );
        }
    },

    async verifyOTP(data) {
        console.log(data);
        const otp = data.OTP;
        const userInfo = global.user;
        const userId = userInfo.userId;
        const maxAttempts = 5;
        const otpData = await OTP.findOne({ userId });

        console.log(otpData);
        if (!otpData) {
            throw CustomErrorHandler.notFound("Invalid OTP or OTP expired");
        }

        const { attempts, expiryTime } = otpData;
        if (attempts >= maxAttempts) {
            throw CustomErrorHandler.notFound("Maximum attempts exceeded");
        }
        if (otp === otpData.otp && new Date() <= new Date(expiryTime)) {
            await OTP.deleteOne({ userId });
            return true;
        } else {
            await OTP.updateOne({ userId }, { $inc: { attempts: 1 } });
            console.log("Found not otp");
            throw CustomErrorHandler.notFound("Invalid OTP or OTP expired");
        }
    },

}
export default ShopService;