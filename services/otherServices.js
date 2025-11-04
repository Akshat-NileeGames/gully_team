
import moment from "moment";
import mongoose from 'mongoose';
import CustomErrorHandler from "../helpers/CustomErrorHandler.js";
import ImageUploader from "../helpers/ImageUploader.js";
import firebaseNotification from "../helpers/firebaseNotification.js";
import { ShopService } from "../services/index.js"
import nodemailer from "nodemailer"
import { RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET } from "../config/index.js";
import axios from "axios";
import {
  Banner,
  Content,
  Coupon,
  CouponHistory,
  EntryFees,
  HelpDesk,
  Notification,
  OrderHistory,
  Tournament,
  User,
  Payment,
  Package,
  Shop,
  Venue,
  Individual,
  Booking
  // Transaction

} from "../models/index.js";

import crypto from "crypto";

import RazorpayHandler from "../helpers/RazorPayHandler.js";
import path from "path";

const otherServices = {
  /**
 * @function addHelpDesk
 * @description Creates and saves a new Helpdesk ticket in the database using the provided data.
 *              Waits for the save operation to complete before returning the created ticket.
 *
 * @param {Object} data - The data used to create a new Helpdesk ticket.
 * @param {string} data.title - The title of the helpdesk ticket.
 * @param {string} data.description - A detailed description of the issue or request.
 * @param {string} [data.priority] - The priority level of the ticket (e.g., 'low', 'medium', 'high').
 * @param {string} [data.status] - The current status of the ticket (e.g., 'open', 'in-progress', 'closed').
 * @returns {Promise<HelpDesk>} Resolves with the newly created Helpdesk ticket document.
 * @throws {Error} Throws an error if saving the ticket to the database fails.
 */
  async addhelpDesk(data) {
    // Create a new instance of the HelpdeskTicket model
    const newHelpdeskTicket = new HelpDesk(data);

    // Save the new HelpdeskTicket and wait for the operation to complete
    await newHelpdeskTicket.save();

    return newHelpdeskTicket;
  },
  /**
   * @function getContent
   * @description Retrieves a specific content entry from the database based on its type.
   *              Throws a not-found error if the requested content does not exist.
   *
   * @param {string} contentName - The type or identifier of the content to retrieve.
   * @returns {Promise<Content>} Resolves with the retrieved content document.
   * @throws {CustomErrorHandler} Throws an error if the content is not found in the database.
   */
  async getContent(contentName) {
    //Find the Banner
    let Contentdata = await Content.findOne({ type: contentName });

    if (!Contentdata) {
      // Handle the case where the user is not found
      throw CustomErrorHandler.notFound("Content Not Found");
    }
    return Contentdata;
  },
  /**
   * @function updateContent
   * @description Updates an existing content entry in the database by its type.
   *              Allows updating of the content text and status fields.
   *
   * @param {string} contentName - The type or identifier of the content to update.
   * @param {Object} data - The new content data to apply.
   * @param {string} data.content - The updated content text.
   * @param {string} [data.status] - The updated content status (e.g., 'active', 'inactive').
   * @returns {Promise<Content>} Resolves with the updated content document.
   * @throws {Error} Throws an error if the database update operation fails.
   */
  async updateContent(contentName, data) {
    let { content, status } = data;
    //Find the content

    const updatedContent = await Content.findOneAndUpdate(
      { type: contentName },
      { content, status },
      { new: true }
    );
    return updatedContent;
  },

  //*************************************    HelpDesk   ************************************** */
  /**
   * @function getHelpdesk
   * @description Retrieves a paginated list of helpdesk tickets from the database.
   *              Populates user information and formats the returned data for client use.
   *
   * @param {number} pageSize - The maximum number of helpdesk tickets to retrieve.
   * @param {number} skip - The number of tickets to skip (used for pagination).
   * @returns {Promise<Object[]>} Resolves with an array of formatted helpdesk ticket objects.
   * @throws {Error} Throws an error if the database query fails.
   */
  async getHelpdesk(pageSize, skip) {
    //Find the Banner
    let helpDeskdata = await HelpDesk.find()
      .skip(skip) // Skip the calculated number of documents
      .limit(pageSize)
      .populate({
        path: "userId",
        select: "fullName email",
      });

    const formattedData = helpDeskdata.map((entry) => ({
      _id: entry._id,
      fullName: entry.userId.fullName,
      email: entry.userId.email,
      issue: entry.issue,
      status: entry.status,
      date: entry.createdAt,
      updatedAt: entry.updatedAt,
      __v: entry.__v,
    }));

    return formattedData;
  },
  /**
   * @function getHelpdeskById
   * @description Retrieves detailed information about a specific helpdesk ticket by its ID.
   *              Populates user information and formats the timestamps for readability.
   *
   * @param {string} helpdeskId - The unique identifier of the helpdesk ticket.
   * @returns {Promise<Object>} Resolves with a formatted helpdesk ticket object.
   * @throws {CustomErrorHandler} Throws an error if the helpdesk ticket is not found.
   */
  async getHelpdeskById(helpdeskId) {
    //Find the Banner
    let helpDeskdata = await HelpDesk.findById(helpdeskId).populate({
      path: "userId",
      select: "fullName email",
    });

    const formattedData = {
      _id: helpDeskdata._id,
      fullName: helpDeskdata.userId.fullName,
      email: helpDeskdata.userId.email,
      issue: helpDeskdata.issue,
      status: helpDeskdata.status,
      response: helpDeskdata.response,
      date: moment(helpDeskdata.createdAt).format("YYYY-MM-DD  HH:mm"),
      updatedAt: moment(helpDeskdata.updatedAt).format("YYYY-MM-DD  HH:mm"),
    };

    return formattedData;
  },

  /**
   * @function updateHelpdesk
   * @description Updates the response and status fields of an existing helpdesk ticket.
   *              Returns the updated helpdesk document after modification.
   *
   * @param {string} helpdeskId - The unique identifier of the helpdesk ticket to update.
   * @param {Object} data - The fields to update in the helpdesk ticket.
   * @param {string} [data.response] - The response message to associate with the ticket.
   * @param {string} [data.status] - The updated status of the ticket (e.g., 'open', 'resolved', 'closed').
   * @returns {Promise<HelpDesk>} Resolves with the updated helpdesk document.
   * @throws {Error} Throws an error if the update operation fails.
   */
  async updateHelpdesk(helpdeskId, data) {
    let { response, status } = data;
    //Find the content

    const updatedHelpdesk = await HelpDesk.findOneAndUpdate(
      { _id: helpdeskId },
      { response, status },
      { new: true }
    );

    return updatedHelpdesk;
  },

  //*************************************    Notification   ************************************** */
  /**
   * @function getNotification
   * @description Retrieves a paginated list of notifications from the database.
   *              Supports pagination using `pageSize` and `skip` parameters.
   *
   * @param {number} pageSize - The maximum number of notifications to retrieve.
   * @param {number} skip - The number of notifications to skip (used for pagination).
   * @returns {Promise<Notification[]>} Resolves with an array of notification documents.
   * @throws {Error} Throws an error if the database query fails.
   */
  async getNotification(pageSize, skip) {
    //Find the Banner
    let notificationData = await Notification.find()
      .skip(skip) // Skip the calculated number of documents
      .limit(pageSize);

    return notificationData;
  },
  /**
   * @function getNotificationById
   * @description Retrieves a single notification from the database using its unique ID.
   *
   * @param {string} Id - The unique identifier of the notification.
   * @returns {Promise<Notification>} Resolves with the notification document.
   * @throws {CustomErrorHandler} Throws an error if the notification is not found.
   */
  async getNotificationById(Id) {
    //Find the Banner
    let notificationData = await Notification.findById(Id);
    return notificationData;
  },
  /**
   * @function addNotification
   * @description Creates and saves a new notification in the database.
   *              Uploads the notification image if provided and sends push notifications
   *              to all active, verified users with a registered FCM token.
   *
   * @param {Object} data - The data for the new notification.
   * @param {string} data.title - The title of the notification.
   * @param {string} data.message - The body text of the notification.
   * @param {string} [data.image] - The image file or path for the notification.
   * @returns {Promise<Notification>} Resolves with the newly created notification document.
   * @throws {Error} Throws an error if saving or sending notifications fails.
   */
  async addNotification(data) {
    let { title, message, image } = data;

    const imagePath = await ImageUploader.Upload(image, "notification");

    // Create a new instance of the HelpdeskTicket model
    const newNotification = new Notification({
      title: title,
      message: message,
      imageUrl: imagePath,
      // Add other fields as needed based on your model schema
    });

    // Save the new Notification and wait for the operation to complete
    await newNotification.save();

    //find all the registere User to notify .
    const registeredUser = await User.find({
      banStatus: "active",
      isPhoneNumberVerified: "true",
    });

    for (const user of registeredUser) {
      if (user?.fcmToken) {
        try {
          await firebaseNotification.sendNotification(user.fcmToken, {
            title: title,
            body: message,
            image: imagePath
              ? "https://gully-team-bucket.s3.amazonaws.com/" + imagePath
              : "",
          });
          console.log("Notification sent to user:", user.fcmToken);
        } catch (error) {
          console.error(
            "Error sending notification to user:",
            user.fcmToken,
            error
          );
        }
      }
    }

    return newNotification;
  },
  /**
   * @function updateNotification
   * @description Updates an existing notification with new title, message, or image.
   *              If an image is provided, uploads the new one and replaces the old image.
   *              Sends updated notifications to all active, verified users.
   *
   * @param {string} NotificationId - The unique identifier of the notification to update.
   * @param {Object} data - The updated notification fields.
   * @param {string} [data.title] - The updated notification title.
   * @param {string} [data.message] - The updated notification message.
   * @param {string} [data.image] - The updated image file or path for the notification.
   * @returns {Promise<Notification>} Resolves with the updated notification document.
   * @throws {Error} Throws an error if the update or notification sending process fails.
   */
  async updateNotification(NotificationId, data) {
    let { title, message, image } = data;
    //Find the content
    let imagePath;
    const updatedNotification = await Notification.findById(NotificationId);


    if (image) {
      imagePath = await ImageUploader.Upload(
        image,
        "notification",
        updatedNotification.imageUrl
      );
      updatedNotification.imageUrl = imagePath;
    }

    updatedNotification.title = title;
    updatedNotification.message = message;

    //find all the registere User to notify .
    const registeredUser = await User.find({
      banStatus: "active",
      isPhoneNumberVerified: "true",
    });

    for (const user of registeredUser) {
      if (user?.fcmToken) {
        try {
          await firebaseNotification.sendNotification(user.fcmToken, {
            title: title,
            body: message,
            image: imagePath
              ? "https://gully-team-bucket.s3.amazonaws.com/" + imagePath
              : updatedNotification.imageUrl
                ? "https://gully-team-bucket.s3.amazonaws.com/" +
                updatedNotification.imageUrl
                : "",
          });
          console.log("Notification sent to user:", user.fcmToken);
        } catch (error) {
          console.error(
            "Error sending notification to user:",
            user.fcmToken,
            error
          );
        }
      }
    }

    return await updatedNotification.save();
  },

  //*************************************    Banner   ************************************** */
  /**
   * @function addBanner
   * @description Creates and saves a new banner in the database. 
   *              Uploads the banner image before saving and stores its URL.
   *
   * @param {Object} data - The data for creating a new banner.
   * @param {string} data.title - The title of the banner.
   * @param {string} [data.link] - The optional link or redirect URL associated with the banner.
   * @param {string} data.image - The image file or path to upload for the banner.
   * @returns {Promise<Banner>} Resolves with the newly created banner document.
   * @throws {Error} Throws an error if image upload or database save operation fails.
   */
  async addBanner(data) {
    let { title, link, image } = data;

    const imagePath = await ImageUploader.Upload(image, "Banner");

    // Create a new instance of the HelpdeskTicket model
    const newBanner = new Banner({
      title: title,
      link: link,
      imageUrl: imagePath,
      // Add other fields as needed based on your model schema
    });

    // Save the new Banner and wait for the operation to complete
    await newBanner.save();

    return newBanner;
  },
  /**
   * @function getBanner
   * @description Retrieves all banner records from the database.
   *              Throws a not-found error if no banners are available.
   *
   * @returns {Promise<Banner[]>} Resolves with an array of banner documents.
   * @throws {CustomErrorHandler} Throws an error if no banners are found.
   */
  async getBanner() {
    //Find the Banner
    let banner = await Banner.find();

    if (!banner) {
      // Handle the case where the user is not found
      throw CustomErrorHandler.notFound("Banner Not Found");
    }
    return banner;
  },
  /**
   * @function getBannerById
   * @description Retrieves a single banner from the database using its unique ID.
   *
   * @param {string} Id - The unique identifier of the banner to retrieve.
   * @returns {Promise<Banner>} Resolves with the banner document.
   * @throws {CustomErrorHandler} Throws an error if the banner is not found.
   */
  async getBannerById(Id) {
    console.log("Got Banner");
    //Find the Banner
    let BannerData = await Banner.findById(Id);
    return BannerData;
  },
  /**
   * @function updateBanner
   * @description Updates an existing banner in the database.
   *              Allows modification of the title, link, image, and active status.
   *              If a new image is provided, uploads it and replaces the old one.
   *
   * @param {string} BannerId - The unique identifier of the banner to update.
   * @param {Object} data - The updated banner data.
   * @param {string} [data.title] - The updated banner title.
   * @param {string} [data.link] - The updated link or redirect URL.
   * @param {string} [data.image] - The new image file or path to replace the existing one.
   * @param {boolean} [data.isActive] - Indicates whether the banner is active.
   * @returns {Promise<Banner>} Resolves with the updated banner document.
   * @throws {Error} Throws an error if the image upload or database update fails.
   */
  async updateBanner(BannerId, data) {
    let { title, link, image, isActive } = data;

    //Find the content
    let imagePath;
    const updatedBanner = await Banner.findById(BannerId);

    if (image != null || image != "") {
      imagePath = await ImageUploader.Upload(
        image,
        "Banner",
        updatedBanner.imageUrl
      );
      updatedBanner.imageUrl = imagePath;
    }

    updatedBanner.title = title;
    updatedBanner.link = link;
    updatedBanner.isActive = isActive;

    return await updatedBanner.save();
  },

  //*************************************    Package   ************************************** */

  /**
   * @function createPackage
   * @description Creates and saves a new package in the database using the provided package data.
   *
   * @param {Object} packageData - The data for the new package.
   * @param {string} packageData.name - The name of the package.
   * @param {string} packageData.packageFor - The type or category the package is intended for.
   * @param {number} packageData.price - The price of the package.
   * @param {string} [packageData.description] - An optional description of the package.
   * @returns {Promise<Package>} Resolves with the newly created package document.
   * @throws {Error} Throws an error if the creation process fails.
   */
  async createPackage(packageData) {
    try {
      const newPackage = new Package(packageData);
      await newPackage.save();
      return newPackage;
    } catch (error) {
      throw new Error('Error creating package: ' + error.message);
    }
  },
  /**
 * @function getPackages
 * @description Retrieves all packages from the database.
 *
 * @returns {Promise<Package[]>} Resolves with an array of package documents.
 * @throws {Error} Throws an error if the retrieval process fails.
 */
  async getPackages() {
    try {
      const packages = await Package.find();
      return packages;
    } catch (error) {
      throw new Error('Error fetching packages: ' + error.message);
    }
  },
  /**
 * @function getPackageById
 * @description Retrieves a specific package by its unique ID.
 *
 * @param {string} id - The unique identifier of the package.
 * @returns {Promise<Package>} Resolves with the package document if found.
 * @throws {Error} Throws an error if the retrieval process fails.
 */
  async getPackageById(id) {
    try {
      const packageData = await Package.findById(id);
      return packageData;
    } catch (error) {
      throw new Error('Error fetching package: ' + error.message);
    }
  },
  /**
   * @function getPackagesByType
   * @description Retrieves all packages matching a specific type or category.
   *
   * @param {string} packageFor - The package type or category to filter by.
   * @returns {Promise<Package[]>} Resolves with an array of matching package documents.
   * @throws {Error} Throws an error if no packages are found or if the query fails.
   */
  async getPackagesByType(packageFor) {
    try {
      // Query packages by packageFor field
      const packages = await Package.find({ packageFor: packageFor });

      if (packages.length === 0) {
        throw new Error('No packages found for the given type');
      }

      return packages;
    } catch (error) {
      throw new Error('Error retrieving packages: ' + error.message);
    }
  },
  /**
 * @function getAdditionalPackages
 * @description Retrieves all additional shop packages (packageFor: 'shopAdditional').
 *
 * @param {string} packageFor - The package category to retrieve. (Currently fixed to 'shopAdditional')
 * @returns {Promise<Package[]>} Resolves with an array of additional shop packages.
 * @throws {Error} Throws an error if no packages are found or the query fails.
 */
  async getAdditionalPackages(packageFor) {
    try {

      const packages = await Package.find({ packageFor: 'shopAdditional' });

      if (packages.length === 0) {
        throw new Error('No packages found for the given type');
      }

      return packages;
    } catch (error) {
      throw new Error('Error retrieving packages: ' + error.message);
    }
  },

  /**
   * @function updatePackage
   * @description Updates a package in the database by its ID with new data.
   *
   * @param {string} id - The unique identifier of the package to update.
   * @param {Object} updatedData - The data fields to update in the package.
   * @param {string} [updatedData.name] - The updated package name.
   * @param {number} [updatedData.price] - The updated package price.
   * @param {string} [updatedData.description] - The updated description.
   * @returns {Promise<Package>} Resolves with the updated package document.
   * @throws {Error} Throws an error if the update process fails.
   */
  async updatePackage(id, updatedData) {
    try {
      const updatedPackage = await Package.findByIdAndUpdate(id, updatedData, { new: true });
      return updatedPackage;
    } catch (error) {
      throw new Error('Error updating package: ' + error.message);
    }
  },
  /**
 * @function deletePackage
 * @description Deletes a package from the database by its unique ID.
 *
 * @param {string} id - The unique identifier of the package to delete.
 * @returns {Promise<Package>} Resolves with the deleted package document.
 * @throws {Error} Throws an error if the deletion process fails.
 */
  async deletePackage(id) {
    try {
      const deletedPackage = await Package.findByIdAndDelete(id);
      return deletedPackage;
    } catch (error) {
      throw new Error('Error deleting package: ' + error.message);
    }
  },
  //*************************************    Coupon   ************************************** */

  async addCoupon(data) {
    let {
      fees,
      offer,
      discountType,
      couponName,
      startDate,
      endDate,
      title,
      description,
    } = data;

    const modifiedEndDate = new Date(
      `${new Date(endDate).toISOString().split("T")[0]}T23:59:59.999Z`
    );

    // Create a new instance of the HelpdeskTicket model
    const newCoupon = new Coupon({
      couponName: couponName,
      title: title,
      description: description,
      minAmount: fees,
      discount: offer,
      type: discountType,
      startDate: startDate,
      endDate: modifiedEndDate,
      description: description,
      // Add other fields as needed based on your model schema
    });

    // Save the new Coupon and wait for the operation to complete
    await newCoupon.save();

    return newCoupon;
  },

  async getCoupon(skip, pageSize) {
    //Find the getCoupon
    let getCoupon = await Coupon.find();

    if (!getCoupon) {
      // Handle the case where the user is not found
      throw CustomErrorHandler.notFound("getCoupon Not Found");
    }
    return getCoupon;
  },

  async getCouponById(Id) {
    //Find the Banner
    let couponData = await Coupon.findById(Id).select(
      "_id couponName minAmount discount type startDate endDate title description"
    );
    return couponData;
  },

  async updateCoupon(Id, data) {
    let {
      minAmount,
      discount,
      type,
      couponName,
      startDate,
      endDate,
      title,
      description,
    } = data;

    const couponData = await Coupon.findById(Id);

    couponData.title = title;
    couponData.description = description;
    couponData.minAmount = minAmount;
    couponData.discount = discount;
    couponData.type = type;
    couponData.couponName = couponName;
    couponData.startDate = startDate;
    couponData.endDate = endDate;

    return await couponData.save();
  },

  async applyCoupon(couponID, amount) {
    //Find the getCoupon
    // let getCoupon = await Coupon.find();

    const userId = global.user.userId;

    let actualAmount = amount;

    if (!amount) {
      // Handle the case where the amount is not found
      throw CustomErrorHandler.notFound("Please provide valid amount");
    }

    let couponData = await Coupon.findById(couponID).select(
      "_id couponName minAmount discount type startDate endDate"
    );

    if (couponData.minAmount >= amount) {
      throw CustomErrorHandler.notFound(
        "This coupon is applicable for amount greather than " +
        couponData.minAmount
      );
    }

    if (couponData.type === "Flat") {
      actualAmount = amount - couponData.discount;
    }
    if (couponData.type === "Percentage") {
      actualAmount = amount - (amount * couponData.discount) / 100;
    }

    // Create a new instance of the HelpdeskTicket model
    const coupon = new CouponHistory({
      couponName: couponData.couponName,
      minAmount: couponData.minAmount,
      discount: couponData.discount,
      type: couponData.type,
      userId: userId,
      // tournamentId: tournamentId,
      // Add other fields as needed based on your model schema
    });

    // Save the new Coupon and wait for the operation to complete
    const couponHistory = await coupon.save();

    return couponHistory;
  },
  //old code
  // async tournamentFees(tournamentId) {
  //   //Calaculate Tournament Fess
  //   const tournament = await Tournament?.find({ _id: tournamentId }); // Limit the number of documents per page
  //   console.log("Tournament " + JSON.stringify(tournament));
  //   const tournamentLimit = tournament[0]?.tournamentLimit;
  //   console.log("tournamentLimit " + tournamentLimit);

  //   const entryFees = await EntryFees.find({
  //     initialteamLimit: { $lte: tournamentLimit },
  //     endteamLimit: { $gte: tournamentLimit },
  //   });

  //   if (!entryFees) {
  //     return 500;
  //   }
  // async tournamentFees(tournamentId) {
  //   //Calaculate Tournament Fess
  //   const tournament = await Tournament?.find({ _id: tournamentId }); // Limit the number of documents per page
  //   console.log("Tournament " + JSON.stringify(tournament));
  //   const tournamentLimit = tournament[0]?.tournamentLimit;
  //   console.log("tournamentLimit " + tournamentLimit);

  //   const entryFees = await EntryFees.find({
  //     initialteamLimit: { $lte: tournamentLimit },
  //     endteamLimit: { $gte: tournamentLimit },
  //   });

  //   return entryFees?.[0]?.fees;
  // },
  /**
   * @function tournamentFees
   * @description Retrieves the tournament entry fee based on a given team limit.
   *              Searches for a fee structure where the team limit falls within the defined range.
   *
   * @param {number} teamLimit - The number of teams to determine the applicable entry fee.
   * @returns {Promise<number | Object>} Resolves with the matching entry fee amount if found.
   * Returns an object with a `success` flag and message if no matching fee is found.
   * @throws {Error} Throws an error if the database query fails.
   */
  async tournamentFees(teamLimit) {
    const entryFees = await EntryFees.find({
      initialteamLimit: { $lte: teamLimit },
      endteamLimit: { $gte: teamLimit },
    });

    if (!entryFees || entryFees.length === 0) {
      return { success: false, message: "No fees found for the provided team limit" };
    }
    return entryFees?.[0]?.fees;
  },
  // async transactionHistory(userId, pageSize, skip) {
  //   try {
  //         // Fetch transactions, populating order and tournament information
  //     const transactions = await OrderHistory.find({ userId })
  //       .populate({
  //         path: "orderId",
  //         model: OrderHistory,
  //         select: "tournamentId userId amount coupon status createdAt", // Fields to populate from OrderHistory
  //         populate: [
  //           {
  //             path: "tournamentId",
  //             select: "tournamentName fees ballCharges breakfastCharges tournamentStartDateTime tournamentEndDateTime", // Fields to populate from Tournament
  //           },
  //           {
  //             path: "userId",
  //             select: "phoneNumber email fullName", // Fields to populate from User
  //           },
  //         ],
  //       })
  //       .limit(pageSize)
  //       .skip(skip)
  //       .exec();

  //     // Count total transactions for pagination
  //     const totalCount = await OrderHistory.countDocuments({ userId });


  //     return {
  //       history: transactions,
  //       totalCount
  //     };
  //   } catch (error) {

  //     throw error;
  //   }
  // },
  /**
 * @function transactionBannerHistory
 * @description Retrieves a paginated list of banner-related transaction history for a specific user.
 *              Includes associated user, banner, and payment details using MongoDB aggregation.
 *
 * @param {string} userId - The unique identifier of the user whose banner transactions are being fetched.
 * @param {number} pageSize - The number of transaction records to retrieve per page.
 * @param {number} skip - The number of records to skip (for pagination).
 * @returns {Promise<{history: Object[], totalCount: number}>} 
 * Resolves with an object containing an array of transaction history and the total count of records.
 * @throws {Error} Throws an error if database operations fail.
 */
  async transactionBannerHistory(userId, pageSize, skip) {
    const totalCount = await OrderHistory.countDocuments({ userId, ordertype: "banner" }); // Filter for banner orders

    const history = await OrderHistory.aggregate([
      {
        $match: {
          userId: mongoose.Types.ObjectId(userId), // Filter by the logged-in user ID
          ordertype: "banner", // Filter for banner orders
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $unwind: "$user",
      },
      {
        $lookup: {
          from: "promotionalbanners",
          localField: "bannerId",
          foreignField: "_id",
          as: "banner",
        },
      },
      {
        $unwind: { path: "$banner", preserveNullAndEmptyArrays: true },
      },
      {
        $lookup: {
          from: "payments",
          localField: "orderId",
          foreignField: "orderId",
          as: "payments",
        },
      },
      {
        $unwind: { path: "$payments", preserveNullAndEmptyArrays: true },
      },
      {
        $project: {
          _id: 1,
          amountDue: 1,
          orderId: 1,
          coupon: 1,
          amountWithoutCoupon: 1,
          amount: 1,
          status: 1,
          createdAt: 1,
          updatedAt: 1,
          userName: "$user.fullname",
          phoneNumber: "$user.phoneNumber",
          email: "$user.email",
          bannerTitle: "$banner.banner_title", // Banner details
          bannerImage: "$banner.banner_image", // Banner image
          payments: 1, // Include payments in the response
          invoiceUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf", // Placeholder for invoice URL
        },
      },
      {
        $sort: {
          createdAt: -1, // Sort by createdAt field in descending order (newest first)
        },
      },
    ])
      .skip(skip)
      .limit(pageSize);

    return { history, totalCount };
  },
  /**
   * @function transactionHistory
   * @description Retrieves a paginated list of all transaction history (including tournaments and banners)
   *              for a specific user. Includes related user, tournament, and payment details.
   *
   * @param {string} userId - The unique identifier of the user whose transaction history is being fetched.
   * @param {number} pageSize - The number of transaction records to retrieve per page.
   * @param {number} skip - The number of records to skip (for pagination).
   * @returns {Promise<{history: Object[], totalCount: number}>} 
   * Resolves with an object containing an array of transaction history and the total count of records.
   * @throws {Error} Throws an error if database operations fail.
   */
  async transactionHistory(userId, pageSize, skip) {
    const totalCount = await OrderHistory.countDocuments({ userId });

    const history = await OrderHistory.aggregate([
      {
        $match: {
          userId: mongoose.Types.ObjectId(userId) // Filter by the logged-in user ID
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $unwind: "$user",
      },
      {
        $lookup: {
          from: "tournaments",
          localField: "tournamentId",
          foreignField: "_id",
          as: "tournament",
        },
      },
      {
        $unwind: { path: "$tournament", preserveNullAndEmptyArrays: true },
      },
      {
        $lookup: {
          from: "payments",
          localField: "orderId",
          foreignField: "orderId",
          as: "payments",
        },
      },
      {
        $unwind: { path: "$payments", preserveNullAndEmptyArrays: true },
      },
      {
        $project: {
          _id: 1,
          amountDue: 1,
          orderId: 1,
          coupon: 1,
          amountWithoutCoupon: 1,
          amount: 1,
          ordertype: 1,
          status: 1,
          createdAt: 1,
          updatedAt: 1,
          userName: "$user.fullname",
          phoneNumber: "$user.phoneNumber",
          email: "$user.email",
          tournament: "$tournament",
          payments: 1, // Include payments in the response
          tournamentName: "$tournament.tournamentName",
          tournamentStartDateTime: "$tournament.tournamentStartDateTime",
          tournamentEndDateTime: "$tournament.tournamentEndDateTime",
          invoiceUrl:
            "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf", // Placeholder for invoice URL
        },
      },
      {
        $sort: {
          createdAt: -1, // Sort by createdAt field in descending order (newest first)
        },
      },
    ])
      .skip(skip)
      .limit(pageSize);

    return { history, totalCount };
  },
  /**
 * @function getTrans
 * @description Retrieves a detailed transaction history for a given user, 
 *              including populated references to related entities such as 
 *              packages, venues, bookings, shops, and banners.
 *
 * @param {string} userId - The unique identifier of the user whose transaction history is to be fetched.
 * @returns {Promise<{history: Object[], totalCount: number}>} 
 * Resolves with an object containing:
 *  - `history`: Array of populated transaction documents for the user.
 *  - `totalCount`: Total number of transactions found for the user.
 *
 * @throws {Error} Throws an error if the query or population fails.
 *
 * @example
 * const result = await getTrans("671b1d3f8b9e6c23f42e");
 * console.log(result.history); // List of populated transaction records
 * console.log(result.totalCount); // Total number of transactions
 */
  async getTrans(userId) {
    const totalCount = await OrderHistory.countDocuments({ userId });
    const history = await OrderHistory.find({ userId: userId })
      .populate('PackageId')
      .populate('individualId')
      .populate({
        path: "individualId",
        populate: {
          path: "packageRef"
        }
      })
      .populate({
        path: "venueId",
        populate: {
          path: "packageRef",
        }

      })
      .populate({
        path: "bookingId",
        populate: [
          {
            path: "venueId",
            populate: {
              path: "packageRef"
            }
          },
          {
            path: "userId"
          }
        ]
      })

      .populate({
        path: 'shopId',
        populate: [
          { path: 'packageId' },
          { path: 'AdditionalPackages' }
        ]
      })
      .populate({
        path: 'bannerId',
        select: '-locationHistory',
      });
    return { history, totalCount };
  },

  /**
   * @function transactionHistoryById
   * @description Retrieves a single transaction record for a specific tournament ID 
   *              and transforms it into a simplified response object.
   *
   * @param {string} Id - The unique identifier of the tournament whose transaction history is being fetched.
   * @returns {Promise<Object>} 
   * Resolves with a transformed transaction object containing essential fields such as 
   * order details, user information, tournament data, and payment details.
   *
   * @throws {Error} Throws an error if the transaction record is not found or the query fails.
   *
   * @example
   * const transaction = await transactionHistoryById("671b3a4c8e93a92bf2c4");
   * console.log(transaction.tournamentName); // e.g. "Summer League 2025"
   */
  async transactionHistoryById(Id) {
    const history = await OrderHistory.findOne({ tournamentId: Id });

    const transformedData = {
      _id: history._id,
      orderId: history.orderId,
      fullName: history.userId.fullName,
      email: history.userId.email,
      phoneNumber: history.userId.phoneNumber,
      tournamentName: history.tournamentId.tournamentName,
      amountWithoutCoupon: history.amountWithoutCoupon,
      coupon: history.coupon,
      amount: history.amount,
      amountPaid: history.amountPaid,
      amountDue: history.amountDue,
      currency: history.currency,
      receipt: history.receipt,
      status: history.status,
      createdAt: history.createdAt,
      updatedAt: history.updatedAt,
      __v: history.__v,
    };

    return transformedData;
  },
  /**
   * @function deleteTransaction
   * @description Deletes all transaction records associated with a specific user.
   *              Validates the user ID before attempting deletion.
   *
   * @param {string} userId - The unique identifier of the user whose transactions are to be deleted.
   * @returns {Promise<void>} Resolves when all transactions for the user are successfully deleted.
   * @throws {Error} Throws an error if `userId` is missing or the deletion operation fails.
   *
   * @example
   * await deleteTransaction("671b4a1f9c8e2d1ab234");
   * console.log("All transactions for user deleted successfully.");
   */
  async deleteTransaction(userId) {
    if (!userId) {
      throw new Error("User ID is required.");
    }

    await OrderHistory.deleteMany({ userId }); // Delete all transactions associated with the user
  },
  /**
   * @function deleteTransactionById
   * @description Deletes a single transaction record by its unique transaction ID.
   *              Ensures the transaction exists before deletion.
   *
   * @param {string} transactionId - The unique identifier of the transaction to delete.
   * @returns {Promise<void>} Resolves when the transaction is successfully deleted.
   * @throws {Error} Throws an error if `transactionId` is missing or if no matching transaction is found.
   *
   * @example
   * await deleteTransactionById("673c1a5e91f8b7a1cdef");
   * console.log("Transaction deleted successfully.");
   */
  async deleteTransactionById(transactionId) {
    if (!transactionId) {
      throw new Error("Transaction ID is required.");
    }

    const transaction = await OrderHistory.findById(transactionId);
    if (!transaction) {
      throw new Error("Transaction not found.");
    }

    await OrderHistory.findByIdAndDelete(transactionId); // Delete the specific transaction
  },


  //*************************************    Payment   ************************************** */
  //Nikhil
  // async createOrder(data) {
  //   const userInfo = global.user;

  //   const receipt = crypto.randomBytes(10).toString("hex");

  //   const paymentData = {
  //     amount: data.amount * 100, // Amount in paise (100 paise = 1 INR)
  //     currency: "INR",
  //     receipt: `order_receipt_${receipt}`,
  //     payment_capture: 1, // Auto capture payment
  //   };

  //   const result = await RazorpayHandler.createOrder(paymentData);

  //   console.log("result", result);

  //   // Create a new instance of the OrderHistory model
  //   const orderHistory = new OrderHistory({
  //     orderId: result.id, // Unique ID for the order
  //     userId: userInfo.userId,
  //     tournamentId: data.tournamentId,
  //     amount: result.amount / 100,
  //     amountWithoutCoupon: data.amountWithoutCoupon ?? 0,
  //     coupon: data.coupon ?? "",
  //     amountPaid: result.amount_paid,
  //     amountDue: result.amount / 100, // Full amount due initially
  //     amountDue: result.amount_due / 100,
  //     currency: result.currency,
  //     receipt: result.receipt,
  //     status: result.status,


  //   });

  //   // Save the new Banner and wait for the operation to complete
  //   await orderHistory.save();

  //   // Creating a transaction record
  //   const transaction = new Transaction({
  //     userId: userInfo.userId,
  //     orderId: result.id,
  //     tournamentId: data.tournamentId,
  //     amount: result.amount / 100,
  //     amountWithoutCoupon: data.amountWithoutCoupon ?? 0,
  //     coupon: data.coupon ?? "",
  //     amountPaid: result.amount_paid,
  //     amountDue: result.amount_due / 100,
  //     currency: result.currency,
  //     receipt: result.receipt,
  //     status: result.status,
  //   });
  //   await transaction.save();
  //   return result;
  // },

  /**
  * @function createOrder
  * @description Creates a new payment order using Razorpay and records the initial order and payment details 
  *              in the database. The order is initialized with a "Pending" payment status until payment capture.
  *
  * @param {Object} data - The data required to create a new order.
  * @param {number} data.amount - The total order amount in INR.
  * @param {string} data.tournamentId - The ID of the associated tournament.
  * @param {string} [data.razorpay_paymentId] - The Razorpay payment ID if available.
  * @param {number} [data.amountWithoutCoupon=0] - The original amount before applying any coupon.
  * @param {string} [data.coupon=""] - The applied coupon code, if any.
  * @param {string} [data.paymentMode="Card"] - The mode of payment used.
  * @returns {Promise<Object>} Resolves with the created Razorpay order details and a confirmation message.
  *
  * @throws {Error} Throws an error if Razorpay order creation or database save operations fail.
  */

  async createOrder(data) {
    const userInfo = global.user;

    const receipt = crypto.randomBytes(10).toString("hex");

    const paymentData = {
      amount: data.amount * 100, // Amount in paise (100 paise = 1 INR)
      currency: "INR",
      receipt: `order_receipt_${receipt}`,
      payment_capture: 1, // Auto capture payment
    };

    const result = await RazorpayHandler.createOrder(paymentData);

    const orderHistory = new OrderHistory({
      orderId: result.id,
      userId: userInfo.userId,
      tournamentId: data.tournamentId,
      razorpay_paymentId: data.razorpay_paymentId,
      amount: result.amount / 100,
      amountWithoutCoupon: data.amountWithoutCoupon ?? 0,
      coupon: data.coupon ?? "",
      amountPaid: 0, // Initially 0
      amountDue: result.amount / 100,
      currency: result.currency,
      receipt: result.receipt,
      status: "Pending", // Set status as Pending initially
    });

    await orderHistory.save();

    const payment = new Payment({
      orderId: result.id,
      userId: userInfo.userId,
      tournamentId: data.tournamentId,
      razorpay_paymentId: data.razorpay_paymentId,
      amountPaid: 0, // Will be updated when the payment is captured
      paymentStatus: "Pending",
      paymentMode: data.paymentMode || "Card",
      transactionId: result.id,
    });

    await payment.save();
    return {
      order: result,
      message: "Order created successfully. Payment is pending.",
    };
  },





  /**
   * @function createBannerOrder
   * @description Creates a new Razorpay order for a banner purchase and records the corresponding
   *              order and payment details in the database. Calculates GST and stores it along with
   *              the total amount and base amount before GST.
   *
   * @param {Object} data - The data required to create a banner order.
   * @param {number} data.amount - The total banner cost in INR.
   * @param {string} [data.bannerId] - The ID of the banner being purchased.
   * @param {string} [data.razorpay_paymentId] - The Razorpay payment ID, if available.
   * @param {number} [data.amountWithoutCoupon=0] - The amount before applying any coupon.
   * @param {string} [data.coupon=""] - The coupon code used, if any.
   * @param {string} [data.status="Pending"] - The initial status of the order (default is "Pending").
   * @param {string} [data.paymentMode="Card"] - The payment method used.
   * @returns {Promise<Object>} Resolves with the created Razorpay order details and a confirmation message.
   *
   * @throws {Error} Throws an error if the Razorpay order creation or database operations fail.
   */
  async createBannerOrder(data) {
    const userInfo = global.user;
    // Generate a unique receipt identifier
    const receipt = crypto.randomBytes(10).toString("hex");
    // Prepare payment data for Razorpay

    const paymentData = {
      amount: data.amount * 100, // Amount in paise (100 paise = 1 INR)
      currency: "INR",
      receipt: `order_receipt_${receipt}`,
      payment_capture: 1, // Auto capture payment
    };
    // Create order with Razorpay

    const result = await RazorpayHandler.createOrder(paymentData);
    const bannerId = mongoose.Types.ObjectId.isValid(data.bannerId) ? data.bannerId : null;

    const orderHistory = new OrderHistory({
      orderId: result.id,
      userId: userInfo.userId,
      razorpay_paymentId: data.razorpay_paymentId,
      bannerId: bannerId,
      baseAmount: data.baseAmount,
      processingFee: data.processingFee,
      convenienceFee: data.convenienceFee,
      gstamount: data.gstamount,
      totalAmount: data.totalAmount,
      currency: result.currency,
      receipt: result.receipt,
      status: data.status || "Pending",
      ordertype: "banner",
    });

    await orderHistory.save();

    const payment = new Payment({
      orderId: result.id,
      userId: userInfo.userId,
      razorpay_paymentId: data.razorpay_paymentId,
      bannerId: bannerId,
      baseAmount: data.baseAmount,
      processingFee: data.processingFee,
      convenienceFee: data.convenienceFee,
      gstamount: data.gstamount,
      totalAmount: data.totalAmount,
      paymentStatus: data.status || "Pending",
      paymentMode: data.paymentMode || "Card",
      transactionId: result.id,
      paymentfor: "banner",
    });

    await payment.save();

    return {
      order: result,
      message: "Banner Order created successfully. Payment is pending.",
    };
  },
  /**
   * @function createshopOrder
   * @description Creates a Razorpay order for a shop package purchase, stores the order and payment
   *              details in the database, and triggers a confirmation email after a delay.
   *
   * @param {Object} data - The required input data for creating the shop order.
   * @param {string} data.shopId - The ID of the shop for which the order is being created.
   * @param {string} data.PackageId - The ID of the package being purchased.
   * @param {number} data.amount - The total amount (in INR) for the order.
   * @param {number} data.baseAmount - The base amount before fees and taxes.
   * @param {number} data.processingFee - The processing fee applied to the order.
   * @param {number} data.convenienceFee - The convenience fee applied to the order.
   * @param {number} data.gstamount - The GST amount applied to the order.
   * @param {number} data.totalAmount - The final total including GST and fees.
   * @param {string} [data.razorpay_paymentId] - The Razorpay payment ID, if available.
   * @param {string} [data.status="Pending"] - The payment status (default: "Pending").
   * @param {string} [data.paymentMode="Card"] - The payment mode (e.g., "Card", "UPI", "NetBanking").
   *
   * @returns {Promise<Object>} Returns the created Razorpay order details and a confirmation message.
   *
   * @throws {Error} Throws an error if the shop, user, or package is not found, or if Razorpay/order creation fails.
   */
  async createshopOrder(data) {
    const userInfo = global.user;

    // Generate a unique receipt identifier
    const receipt = crypto.randomBytes(10).toString("hex");

    // Prepare payment data for Razorpay
    const paymentData = {
      amount: data.amount * 100, // Amount in paise (100 paise = 1 INR)
      currency: "INR",
      receipt: `order_receipt_${receipt}`,
      payment_capture: 1, // Auto capture payment
    };

    // Create a new order with Razorpay
    const result = await RazorpayHandler.createOrder(paymentData);
    // const shopId = mongoose.Types.ObjectId.isValid(data.shopId) ? data.shopId : null;
    const shop = await Shop.findById(data.shopId);
    if (!shop) {
      throw CustomErrorHandler.notFound("Shop Not Found");
    }
    const user = await User.findById(shop.userId);
    if (!user) {
      return CustomErrorHandler.notFound("User Not Found");
    }

    const purchasedPackage = await Package.findById(data.PackageId);
    if (!purchasedPackage) {
      return CustomErrorHandler.notFound("Package Not Found");
    }
    const orderHistory = new OrderHistory({
      orderId: result.id,
      userId: userInfo.userId,
      shopId: data.shopId,
      razorpay_paymentId: data.razorpay_paymentId,
      PackageId: data.PackageId,
      baseAmount: data.baseAmount,
      processingFee: data.processingFee,
      convenienceFee: data.convenienceFee,
      gstamount: data.gstamount,
      totalAmount: data.totalAmount,
      currency: result.currency,
      receipt: result.receipt,
      status: data.status || "Pending",
      ordertype: "Shop",
    });

    await orderHistory.save();

    const payment = new Payment({
      orderId: result.id,
      userId: userInfo.userId,
      shopId: data.shopId,
      razorpay_paymentId: data.razorpay_paymentId,
      PackageId: data.PackageId,
      baseAmount: data.baseAmount,
      processingFee: data.processingFee,
      convenienceFee: data.convenienceFee,
      gstamount: data.gstamount,
      totalAmount: data.totalAmount,
      paymentStatus: data.status || "Pending",
      paymentMode: data.paymentMode || "Card",
      transactionId: result.id,
    });

    await payment.save();
    setTimeout(async () => {

      console.log("Sending email after 10 seconds...",);
      await otherServices.sendpaymentMail(
        "shop-subscription",
        user,
        shop,
        purchasedPackage,
        result.id,
        orderHistory.receipt,
        data.status,
        {
          baseAmount: data.baseAmount,
          convenienceFee: data.convenienceFee,
          processingFee: data.processingFee,
          gstAmount: data.gstAmount,
          totalAmount: data.totalAmount,
          paymentMode: data.paymentMode || "Online Payment"
        }
      );
    }, 10000);
    return {
      order: result,
      message: "Shop Order created successfully. Payment is pending.",
    };
  },

  //Send mail
  async sendpaymentMail(userFor = "", user, shop, purchasedPackage, TRANSACTION_ID, RECEIPT_NUMBER, PAYMENT_STATUS, paymentDetails = {}) {
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

    if (!user || !user.email || !purchasedPackage) {
      console.error("Missing or invalid user/purchasedPackage info.");
      return;
    }

    // Use payment details from parameters or calculate from package price
    const baseAmount = paymentDetails.baseAmount || (purchasedPackage.price / 1.18).toFixed(2);
    const convenienceFee = paymentDetails.convenienceFee || 0;
    const processingFee = paymentDetails.processingFee || 0;
    const gstAmount = paymentDetails.gstAmount || (purchasedPackage.price * 0.18).toFixed(2);
    const totalAmount = paymentDetails.totalAmount || purchasedPackage.price.toFixed(2);
    const paymentMode = paymentDetails.paymentMode || "Online Payment";

    // Helper function to format currency
    const formatCurrency = (amount) => {
      const num = parseFloat(amount) || 0;
      return num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    // Determine status-specific content
    let headerTitle, headerColor, statusBadgeColor, statusMessage, introText, ctaText, ctaButtons;

    // Set content based on payment status
    if (PAYMENT_STATUS === "Failed") {
      headerTitle = "Payment Failed - Action Required";
      headerColor = "linear-gradient(135deg, #dc2626 0%, #ef4444 100%)";
      statusBadgeColor = "#fee2e2";
      statusMessage = `
      <div style="background-color: #fee2e2; border: 1px solid #f87171; border-radius: 6px; padding: 16px; margin: 20px 0;">
        <p style="color: #b91c1c; font-weight: bold; margin: 0 0 10px 0; font-size: 16px;">Payment Failed</p>
        <p style="color: #b91c1c; margin: 0; font-size: 14px;">
          We were unable to process your payment for the subscription package. No charges have been made to your account.
        </p>
      </div>
    `;
      introText = `
      We regret to inform you that your payment for the ${purchasedPackage.name} subscription package could not be processed. 
      This could be due to insufficient funds, expired card details, or a temporary issue with the payment gateway.
    `;
      ctaText = "Please retry your payment to activate your subscription and access all features.";
      ctaButtons = `
      <a href="#" class="cta-button" style="background-color: #2563eb;">
        Retry Payment
      </a>
      <a href="mailto:gullyteam33@gmail.com" class="cta-button" style="background-color: #059669;">
        Contact Support
      </a>
    `;
    } else if (PAYMENT_STATUS === "Pending") {
      headerTitle = "Payment Pending - Verification in Progress";
      headerColor = "linear-gradient(135deg, #eab308 0%, #facc15 100%)";
      statusBadgeColor = "#fef3c7";
      statusMessage = `
      <div style="background-color: #fef3c7; border: 1px solid #fbbf24; border-radius: 6px; padding: 16px; margin: 20px 0;">
        <p style="color: #92400e; font-weight: bold; margin: 0 0 10px 0; font-size: 16px;"> Payment Pending</p>
        <p style="color: #92400e; margin: 0; font-size: 14px;">
          Your payment is being processed. This usually takes a few minutes, but may take up to 24 hours in some cases.
        </p>
      </div>
    `;
      introText = `
      Thank you for purchasing the ${purchasedPackage.name} subscription package. Your payment is currently being processed.
      You will receive a confirmation email once the payment is successfully verified.
    `;
      ctaText = "You can check the status of your payment in your Transaction History.";
      ctaButtons = `
      <a href="mailto:gullyteam33@gmail.com" class="cta-button" style="background-color: #2563eb;">
        Contact Support
      </a>
    `;
    } else {
      // Success or any other status
      headerTitle = "Subscription Package Successfully Purchased";
      headerColor = "linear-gradient(135deg, #16a34a 0%, #22c55e 100%)";
      statusBadgeColor = "#dcfce7";
      statusMessage = `
      <div style="background-color: #dcfce7; border: 1px solid #86efac; border-radius: 6px; padding: 16px; margin: 20px 0;">
        <p style="color: #166534; font-weight: bold; margin: 0 0 10px 0; font-size: 16px;">Payment Successful</p>
        <p style="color: #166534; margin: 0; font-size: 14px;">
          Your payment has been successfully processed and your subscription is now active.
        </p>
      </div>
    `;
      introText = `
      We are pleased to confirm that your subscription payment has been successfully processed. Thank you for choosing Gully Team — 
      We're excited to have you onboard and look forward to supporting your business growth.
    `;
      ctaText = "Thank you for joining us and trusting Gully Team with your business growth. We look forward to building something amazing together!";
      ctaButtons = `
      <a href="#" class="cta-button" style="background-color: #16a34a;">
        🏪 Access Dashboard
      </a>
      <a href="mailto:gullyteam33@gmail.com" class="cta-button" style="background-color: #2563eb;">
        Contact Support
      </a>
    `;
    }

    // Dynamic title & subject based on payment status
    let subject;
    if (PAYMENT_STATUS === "Failed") {
      subject = `Payment Failed - Action Required for Your Gully Team Shop Subscription`;
    } else if (PAYMENT_STATUS === "Pending") {
      subject = `Payment Pending - Your Gully Team Shop Subscription`;
    } else {
      subject = `Payment Confirmation – Gully Team Shop Subscription Activated`;
    }

    const mailOptions = {
      from: "gullyteam33@gmail.com",
      to: shop.ownerEmail,
      subject: subject,
      html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Status – Gully Team Shop Subscription</title>
  <style>
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
      max-width: 650px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
    }

    .header {
      background: ${headerColor};
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
      color: rgba(255, 255, 255, 0.8);
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
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .details-table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    }

    .details-table td {
      padding: 14px 16px;
      border-bottom: 1px solid #f3f4f6;
      vertical-align: top;
    }

    .details-table tr:nth-child(even) {
      background-color: #f8fafc;
    }

    .details-table tr:nth-child(odd) {
      background-color: #ffffff;
    }

    .details-table tr:last-child td {
      border-bottom: none;
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

    /* Payment Summary Styles */
    .payment-summary {
      background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
      border: 2px solid #f59e0b;
      border-radius: 12px;
      padding: 25px;
      margin: 30px 0;
    }

    .payment-title {
      font-size: 20px;
      font-weight: bold;
      color: #92400e;
      margin: 0 0 20px 0;
      text-align: center;
    }

    .payment-table {
      width: 100%;
      border-collapse: collapse;
      background: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .payment-table td {
      padding: 12px 16px;
      border-bottom: 1px solid #f3f4f6;
    }

    .payment-table tr:last-child td {
      border-bottom: none;
    }

    .payment-table .payment-label {
      font-weight: 600;
      color: #92400e;
      width: 60%;
      font-size: 14px;
    }

    .payment-table .payment-value {
      color: #92400e;
      font-size: 14px;
      font-weight: 500;
      text-align: right;
    }

    .payment-table .total-row {
      background-color: #92400e;
      color: #ffffff;
      font-weight: bold;
      font-size: 16px;
    }

    .payment-table .total-row .payment-label,
    .payment-table .total-row .payment-value {
      color: #ffffff;
    }

    .transaction-id {
      background-color: ${statusBadgeColor};
      border: 1px solid ${PAYMENT_STATUS === "Failed" ? "#f87171" : PAYMENT_STATUS === "Pending" ? "#fbbf24" : "#86efac"};
      border-radius: 6px;
      padding: 12px 16px;
      margin: 20px 0;
      text-align: center;
    }

    .transaction-id .label {
      font-size: 12px;
      color: ${PAYMENT_STATUS === "Failed" ? "#b91c1c" : PAYMENT_STATUS === "Pending" ? "#92400e" : "#166534"};
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .transaction-id .value {
      font-size: 16px;
      color: ${PAYMENT_STATUS === "Failed" ? "#b91c1c" : PAYMENT_STATUS === "Pending" ? "#92400e" : "#166534"};
      font-weight: bold;
      font-family: 'Courier New', monospace;
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
      margin: 0 10px 10px 0;
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
      
      .payment-table .payment-label {
        width: 50%;
      }
      
      .highlight-section,
      .info-section,
      .payment-summary {
        padding: 20px;
      }
      
      .cta-button {
        display: block;
        margin: 10px 0;
      }
    }

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
              <h1>${headerTitle}</h1>
              <p>Gully Team Shop Subscription</p>
            </div>

            <!-- Content -->
            <div class="content">
              <!-- Welcome Message -->
              <p class="welcome-text">Hello ${user.fullName}! 👋</p>
              <p class="intro-text">${introText}</p>

              <!-- Status Message -->
              ${statusMessage}

              <!-- Transaction ID -->
              <div class="transaction-id">
                <div class="label">Transaction ID:</div>
                <div class="value">${TRANSACTION_ID}</div>
              </div>

              <!-- Payment Summary -->
              <div class="payment-summary">
                <h3 class="payment-title">Payment Breakdown</h3>
                <table class="payment-table" role="presentation">
                  <tr>
                    <td class="payment-label">Package Name:</td>
                    <td class="payment-value">${purchasedPackage.name}</td>
                  </tr>
                  <tr>
                    <td class="payment-label">Base Amount:</td>
                    <td class="payment-value">₹${formatCurrency(baseAmount)}</td>
                  </tr>
                  ${convenienceFee > 0 ? `
                  <tr>
                    <td class="payment-label">Convenience Fee (2.5%):</td>
                    <td class="payment-value">₹${formatCurrency(convenienceFee)}</td>
                  </tr>
                  ` : ''}
                  ${processingFee > 0 ? `
                  <tr>
                    <td class="payment-label">Processing Fee:</td>
                    <td class="payment-value">₹${formatCurrency(processingFee)}</td>
                  </tr>
                  ` : ''}
                  <tr>
                    <td class="payment-label">GST (18%):</td>
                    <td class="payment-value">₹${formatCurrency(gstAmount)}</td>
                  </tr>
                  <tr>
                    <td class="payment-label">Payment Method:</td>
                    <td class="payment-value">${paymentMode}</td>
                  </tr>
                  <tr>
                    <td class="payment-label">Payment Status:</td>
                    <td class="payment-value" style="color: ${PAYMENT_STATUS === "Failed" ? "#dc2626" : PAYMENT_STATUS === "Pending" ? "#92400e" : "#16a34a"}; font-weight: bold;">
                      ${PAYMENT_STATUS}
                    </td>
                  </tr>
                  <tr>
                    <td class="payment-label">Receipt Number:</td>
                    <td class="payment-value">${RECEIPT_NUMBER}</td>
                  </tr>
                  <tr class="total-row">
                    <td class="payment-label">Total Amount ${PAYMENT_STATUS === "Failed" ? "Attempted" : PAYMENT_STATUS === "Pending" ? "Processing" : "Paid"}:</td>
                    <td class="payment-value">₹${formatCurrency(totalAmount)}</td>
                  </tr>
                </table>
              </div>

              <!-- Package Details -->
              <h3 class="section-title">
                📦 Package Information
              </h3>
              <table class="details-table" role="presentation">
                <tr>
                  <td class="label">Package Name:</td>
                  <td class="value">${purchasedPackage.name}</td>
                </tr>
                <tr>
                  <td class="label">Duration:</td>
                  <td class="value">${purchasedPackage.duration || 'N/A'} month${purchasedPackage.duration > 1 ? 's' : ''}</td>
                </tr>
                <tr>
                  <td class="label">Max Media Allowed:</td>
                  <td class="value">${purchasedPackage.maxMedia || 'Unlimited'}</td>
                </tr>
                <tr>
                  <td class="label">Max Videos Allowed:</td>
                  <td class="value">${purchasedPackage.maxVideos || 'Unlimited'}</td>
                </tr>
                ${purchasedPackage.features && purchasedPackage.features.length > 0 ? `
                <tr>
                  <td class="label">Features:</td>
                  <td class="value">${purchasedPackage.features.join(', ')}</td>
                </tr>
                ` : ''}
              </table>

              <!-- Shop Information -->
              <h3 class="section-title">
                🏪 Shop Information
              </h3>
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
              </table>

              <!-- Owner Information -->
              <h3 class="section-title">
                👤 Owner Information
              </h3>
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
              <h3 class="section-title">
                Additional Details
              </h3>
              <table class="details-table" role="presentation">
                ${shop.businesslicenseNumber ? `
                <tr>
                  <td class="label">License Number:</td>
                  <td class="value">${shop.businesslicenseNumber}</td>
                </tr>
                ` : ''}
                ${shop.gstNumber ? `
                <tr>
                  <td class="label">GST Number:</td>
                  <td class="value">${shop.gstNumber}</td>
                </tr>
                ` : ''}
                <tr>
                  <td class="label">Registered On:</td>
                  <td class="value">${new Date(shop.joinedAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })}</td>
                </tr>
                <tr>
                  <td class="label">Payment Date:</td>
                  <td class="value">${new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })}</td>
                </tr>
              </table>

              ${PAYMENT_STATUS !== "Failed" ? `
              <!-- Getting Started -->
              <div class="highlight-section">
                <h3 class="highlight-title">🚀 Getting Started with Your Subscription:</h3>
                <ul class="task-list">
                  <li class="task-item">
                    <span class="checkmark">✓</span>
                    Log into your Gully Team dashboard to access your shop management tools
                  </li>
                  <li class="task-item">
                    <span class="checkmark">✓</span>
                    Upload high-quality images of your shop and products (up to ${purchasedPackage.maxMedia || 'unlimited'} images)
                  </li>
                  <li class="task-item">
                    <span class="checkmark">✓</span>
                    Update your shop timings and availability settings
                  </li>
                  <li class="task-item">
                    <span class="checkmark">✓</span>
                    Add detailed product descriptions and pricing information
                  </li>
                  <li class="task-item">
                    <span class="checkmark">✓</span>
                    Monitor your shop analytics and customer engagement metrics
                  </li>
                </ul>
              </div>
              ` : ''}

              <!-- Info Section -->
              <div class="info-section">
                <h3 class="info-title">
                  ${PAYMENT_STATUS === "Failed" ? "Payment Failed - What to Do Next" :
          PAYMENT_STATUS === "Pending" ? " Payment Processing Information" :
            "What's Included in Your Subscription"}
                </h3>
                <p class="info-text">
                  ${PAYMENT_STATUS === "Failed" ? `
                    Your payment could not be processed. This might be due to:
                    <br><br>
                    • Insufficient funds in your account<br>
                    • Incorrect card details or expired card<br>
                    • Bank declined the transaction<br>
                    • Temporary issue with the payment gateway<br>
                    • Network connectivity issues
                    <br><br>
                    <strong>Don't worry - no charges have been made to your account.</strong> Please try again with a different payment method or contact your bank for more information.
                  ` : PAYMENT_STATUS === "Pending" ? `
                    Your payment is currently being processed by our payment gateway. Here's what you need to know:
                    <br><br>
                    • Processing usually takes 2-5 minutes<br>
                    • In rare cases, it may take up to 24 hours<br>
                    • You'll receive an email confirmation once completed<br>
                    • Your subscription will be activated automatically upon successful payment<br>
                    • You can check the status in your Transaction History
                    <br><br>
                    If your payment isn't confirmed within 30 minutes, please contact our support team.
                  ` : `
                    Your subscription gives you access to essential tools to manage and grow your business:
                    <br><br>
                    • Professional shop listing with up to ${purchasedPackage.maxMedia || 'unlimited'} images<br>
                    • Advanced shop management dashboard<br>
                    • Customer analytics and insights<br>
                    • Priority customer support<br>
                    • Mobile app access for on-the-go management
                    <br><br>
                    Log in to your Gully Team dashboard to get started and make the most of these features.
                  `}
                </p>
              </div>

              <!-- Call to Action -->
              <div class="cta-section">
                <p class="cta-text">
                  ${ctaText}
                </p>
                ${ctaButtons}
              </div>
            </div>

            <!-- Footer -->
            <div class="footer">
              <p class="footer-text">
                <strong>© ${new Date().getFullYear()} Nilee Games and Future Technologies Pvt. Ltd.</strong>
              </p>
              <p class="footer-text">
                Support: <a href="mailto:gullyteam33@gmail.com" class="footer-link">gullyteam33@gmail.com</a> | 
                Website: <a href="#" class="footer-link">www.gullyteam.com</a>
              </p>
              <p class="footer-text">
                For payment queries, please include your Transaction ID: <strong>${TRANSACTION_ID}</strong>
              </p>
            </div>
          </div>
        </td>
      </tr>
    </table>
  </div>
</body>
</html>`
    };

    transporter.sendMail(mailOptions, function (error, info) {
      if (error) {
        console.log("Error sending shop subscription email:", error);
      } else {
        console.log("Shop subscription email sent successfully:", info.response);
      }
    });
  },
  /**
   * @function createBookingOrder
   * @description
   * Creates a new Razorpay order for a venue booking, records the order and payment details
   * in the database, and sends a booking confirmation email after successful creation.
   *
   * @param {Object} data - The input payload for booking order creation.
   * @param {string} data.venueId - The ID of the venue being booked.
   * @param {string} data.sport - The sport associated with the booking.
   * @param {string} data.sessionId - The session ID of the booking slot.
   * @param {number} data.amount - The total payable amount (in INR).
   * @param {number} data.baseAmount - The base amount before any taxes or fees.
   * @param {number} data.processingFee - The processing fee applied to the booking.
   * @param {number} data.convenienceFee - The convenience fee applied to the booking.
   * @param {number} data.gstamount - The GST amount applied to the booking.
   * @param {number} data.totalAmount - The final total amount including GST and fees.
   * @param {string} [data.razorpay_paymentId] - The Razorpay payment ID (optional).
   * @param {string} [data.status="Pending"] - The payment status, defaults to `"Pending"`.
   * @param {string} [data.paymentMode="Card"] - The payment mode used (e.g., `"Card"`, `"UPI"`, `"NetBanking"`).
   *
   * @returns {Promise<Object>} Returns a success response containing the created Razorpay order and a message.
   *
   * @throws {Error} Throws a descriptive error if:
   * - The venue, venue owner, or booking cannot be found.
   * - Razorpay order creation fails.
   */
  async createBookingOrder(data) {
    const userInfo = global.user
    // Generate a unique receipt identifier for Razorpay
    const receipt = crypto.randomBytes(10).toString("hex")

    // Prepare Razorpay payment data
    const paymentData = {
      amount: data.amount * 100,
      currency: "INR",
      receipt: `order_receipt_${receipt}`,
      payment_capture: 1,
    }

    // Create Razorpay order
    const result = await RazorpayHandler.createOrder(paymentData)
    const venue = await Venue.findById(data.venueId)
    if (!venue) throw CustomErrorHandler.notFound("Venue Not Found")

    const user = await User.findById(venue.userId)
    if (!user) throw CustomErrorHandler.notFound("User Not Found")

    const booking = await Booking.findOne({
      venueId: data.venueId,
      sport: data.sport,
      sessionId: data.sessionId,
      userId: userInfo.userId,
    })
    if (!booking) throw CustomErrorHandler.notFound("Booking Not Found")

    const orderHistory = new OrderHistory({
      orderId: result.id,
      userId: userInfo.userId,
      razorpay_paymentId: data.razorpay_paymentId,
      bookingId: booking._id,
      baseAmount: data.baseAmount,
      processingFee: data.processingFee,
      convenienceFee: data.convenienceFee,
      gstamount: data.gstamount,
      totalAmount: data.totalAmount,
      currency: result.currency,
      receipt: result.receipt,
      status: data.status || "Pending",
      ordertype: "booking",
    })

    await orderHistory.save()
    const payment = new Payment({
      orderId: result.id,
      userId: userInfo.userId,
      razorpay_paymentId: data.razorpay_paymentId,
      bookingId: booking._id,
      baseAmount: data.baseAmount,
      processingFee: data.processingFee,
      convenienceFee: data.convenienceFee,
      gstamount: data.gstamount,
      totalAmount: data.totalAmount,
      paymentfor: "booking",
      paymentStatus: data.status || "Pending",
      paymentMode: data.paymentMode || "Card",
      transactionId: result.id,
    })

    await payment.save()

    setTimeout(async () => {
      console.log("Sending booking confirmation email...")
      await this.sendBookingConfirmation(booking, user, venue, {
        transactionId: result.id,
        paymentMethod: data.paymentMode || "Online Payment",
        receipt: result.receipt,
        paymentStatus: data.status || "Pending",
        bookingStatus: booking.bookingStatus,
        baseAmount: data.baseAmount || 0,
        processingFee: data.processingFee || 0,
        convenienceFee: data.convenienceFee || 0,
        gstamount: data.gstamount || 0,
        totalAmount: data.totalAmount || 0,
      })
    }, 10000);
    return {
      order: result,
      message: "Booking order created successfully.",
    }
  },

  async sendBookingConfirmation(booking, user, venue, paymentDetails) {
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      requireTLS: true,
      auth: {
        user: "gullyteam33@gmail.com",
        pass: "iaur qnaj ocsq jyvq",
      },
    })

    const formatBookingSchedule = (scheduledDates) => {
      return scheduledDates
        .map((schedule) => {
          const date = new Date(schedule.date).toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })
          const timeSlots = schedule.timeSlots
            .map(
              (slot) => `
          <div style="background-color: #f8fafc; padding: 8px 12px; margin: 4px 0; border-radius: 4px; border-left: 3px solid #2563eb;">
            <strong>${slot.startTime} - ${slot.endTime}</strong> (Area ${slot.playableArea})
          </div>
        `,
            )
            .join("")
          return `
        <div style="margin-bottom: 20px; padding: 15px; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px;">
          <h4 style="margin: 0 0 10px 0; color: #1f2937; font-size: 16px;">${date}</h4>
          ${timeSlots}
        </div>
      `
        })
        .join("")
    }

    const formatBookingPattern = (pattern) => {
      const patterns = {
        single_slots: "Single Time Slot",
        multiple_slots: "Multiple Time Slots",
        full_day_booking: "Full Day Booking",
        week_booking: "Weekly Booking",
      }
      return patterns[pattern] || pattern
    }

    const getPaymentStatusBadge = (status) => {
      const statusConfig = {
        successful: {
          color: "#16a34a",
          bg: "#dcfce7",
          border: "#86efac",
          text: "Payment Successful",
        },
        pending: {
          color: "#92400e",
          bg: "#fef3c7",
          border: "#fbbf24",
          text: " Payment Pending",
        },
        failed: {
          color: "#dc2626",
          bg: "#fee2e2",
          border: "#f87171",
          text: "Payment Failed",
        },
      }
      const config = statusConfig[status?.toLowerCase()] || statusConfig.pending
      return `
    <div style="background-color: ${config.bg}; border: 1px solid ${config.border}; border-radius: 6px; padding: 12px; margin: 15px 0; text-align: center;">
      <span style="color: ${config.color}; font-weight: bold; font-size: 14px;">${config.text}</span>
    </div>
  `
    }

    const getBookingStatusBadge = (status) => {
      const statusConfig = {
        confirmed: {
          color: "#16a34a",
          bg: "#dcfce7",
          border: "#86efac",
          text: "Booking Confirmed",
        },
        pending: {
          color: "#92400e",
          bg: "#fef3c7",
          border: "#fbbf24",
          text: " Booking Pending",
        },
        cancelled: {
          color: "#dc2626",
          bg: "#fee2e2",
          border: "#f87171",
          text: "Booking Cancelled",
        },
      }
      const config = statusConfig[status?.toLowerCase()] || statusConfig.pending
      return `
    <div style="background-color: ${config.bg}; border: 1px solid ${config.border}; border-radius: 6px; padding: 12px; margin: 15px 0; text-align: center;">
      <span style="color: ${config.color}; font-weight: bold; font-size: 14px;">${config.text}</span>
    </div>
  `
    }

    // Determine if transaction is successful or failed
    const isSuccessful = paymentDetails.paymentStatus?.toLowerCase() === 'successful'
    const isPending = paymentDetails.paymentStatus?.toLowerCase() === 'pending'
    const isFailed = paymentDetails.paymentStatus?.toLowerCase() === 'failed'

    // Helper function to format currency with fallback
    const formatCurrency = (amount) => {
      const numAmount = Number(amount) || 0;
      return numAmount.toLocaleString('en-IN');
    }

    // Dynamic content based on transaction status
    const getEmailSubject = () => {
      if (isSuccessful) {
        return `Booking Confirmed - ${venue.venue_name} | Gully Team`
      } else if (isPending) {
        return `Booking Pending - ${venue.venue_name} | Gully Team`
      } else {
        return `Booking Failed - ${venue.venue_name} | Gully Team`
      }
    }

    const getHeaderContent = () => {
      if (isSuccessful) {
        return {
          title: "Booking Confirmed!",
          subtitle: "Your venue has been successfully booked",
          gradient: "linear-gradient(135deg, #16a34a 0%, #22c55e 100%)",
          subtitleColor: "#bbf7d0"
        }
      } else if (isPending) {
        return {
          title: "Booking Pending",
          subtitle: "Your booking is being processed",
          gradient: "linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)",
          subtitleColor: "#fef3c7"
        }
      } else {
        return {
          title: "Booking Failed",
          subtitle: "There was an issue with your booking",
          gradient: "linear-gradient(135deg, #dc2626 0%, #ef4444 100%)",
          subtitleColor: "#fecaca"
        }
      }
    }

    const getWelcomeMessage = () => {
      if (isSuccessful) {
        return {
          greeting: `Hello ${user.fullName || user.name}!`,
          message: "Great news! Your venue booking has been confirmed. We're excited to help you enjoy your sports session. Below are all the details of your booking."
        }
      } else if (isPending) {
        return {
          greeting: `Hello ${user.fullName || user.name}!`,
          message: "Your booking request has been received and is currently being processed. We'll notify you once the payment is confirmed. Below are the details of your booking request."
        }
      } else {
        return {
          greeting: `Hello ${user.fullName || user.name}!`,
          message: "Unfortunately, there was an issue processing your booking payment. Don't worry - no charges have been made to your account. You can try booking again or contact our support team for assistance."
        }
      }
    }

    const getNextSteps = () => {
      if (isSuccessful) {
        return `
      <div class="next-steps">
        <h3 class="next-steps-title">What's Next?</h3>
        <ul class="steps-list">
          <li class="step-item">
            <span class="checkmark">✓</span>
            Save this confirmation email for your records
          </li>
          <li class="step-item">
            <span class="checkmark">✓</span>
            Arrive at the venue 15 minutes before your scheduled time
          </li>
          <li class="step-item">
            <span class="checkmark">✓</span>
            Contact the venue directly if you need to make any changes
          </li>
          <li class="step-item">
            <span class="checkmark">✓</span>
            Enjoy your sports session and have a great time!
          </li>
        </ul>
      </div>
    `
      } else if (isPending) {
        return `
      <div class="next-steps" style="background-color: #fef3c7; border: 1px solid #fbbf24;">
        <h3 class="next-steps-title" style="color: #92400e;"> What Happens Next?</h3>
        <ul class="steps-list">
          <li class="step-item" style="color: #92400e;">
            <span class="checkmark" style="color: #f59e0b;"></span>
            We're processing your payment - this usually takes a few minutes
          </li>
          <li class="step-item" style="color: #92400e;">
            <span class="checkmark" style="color: #f59e0b;"></span>
            You'll receive a confirmation email once payment is successful
          </li>
          <li class="step-item" style="color: #92400e;">
            <span class="checkmark" style="color: #f59e0b;"></span>
            Check your app for real-time booking status updates
          </li>
          <li class="step-item" style="color: #92400e;">
            <span class="checkmark" style="color: #f59e0b;"></span>
            Contact support if payment isn't confirmed within 30 minutes
          </li>
        </ul>
      </div>
    `
      } else {
        return `
      <div class="next-steps" style="background-color: #fee2e2; border: 1px solid #f87171;">
        <h3 class="next-steps-title" style="color: #991b1b;">What You Can Do Next</h3>
        <ul class="steps-list">
          <li class="step-item" style="color: #991b1b;">
            <span class="checkmark" style="color: #dc2626;"></span>
            Try booking again - the time slot is still available
          </li>
          <li class="step-item" style="color: #991b1b;">
            <span class="checkmark" style="color: #dc2626;"></span>
            Check your payment method and try a different card if needed
          </li>
          <li class="step-item" style="color: #991b1b;">
            <span class="checkmark" style="color: #dc2626;"></span>
            Contact our support team for assistance with your booking
          </li>
          <li class="step-item" style="color: #991b1b;">
            <span class="checkmark" style="color: #dc2626;"></span>
            Rest assured - no charges were made to your account
          </li>
        </ul>
      </div>
    `
      }
    }

    const getClosingMessage = () => {
      if (isSuccessful) {
        return `
      <p style="text-align: center; color: #6b7280; font-size: 16px; margin-top: 30px;">
        Thank you for choosing Gully Team!<br>
        <em>We hope you have an amazing sports experience!</em>
      </p>
    `
      } else if (isPending) {
        return `
      <p style="text-align: center; color: #6b7280; font-size: 16px; margin-top: 30px;">
        Thank you for your patience!<br>
        <em>We'll update you as soon as your booking is confirmed.</em>
      </p>
    `
      } else {
        return `
      <p style="text-align: center; color: #6b7280; font-size: 16px; margin-top: 30px;">
        We apologize for the inconvenience! <br>
        <em>Our support team is here to help you complete your booking.</em>
      </p>
    `
      }
    }

    const headerContent = getHeaderContent()
    const welcomeMessage = getWelcomeMessage()

    const mailOptions = {
      from: "gullyteam33@gmail.com",
      to: user.email,
      subject: getEmailSubject(),
      html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Venue Booking ${isSuccessful ? 'Confirmation' : isPending ? 'Pending' : 'Failed'} - Gully Team</title>
  <style>
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
      max-width: 700px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
    }
    
    .header {
      background: ${headerContent.gradient};
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
      color: ${headerContent.subtitleColor};
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
    
    .booking-summary {
      background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
      border: 2px solid #0ea5e9;
      border-radius: 12px;
      padding: 25px;
      margin: 30px 0;
    }
    
    .booking-title {
      font-size: 20px;
      font-weight: bold;
      color: #0c4a6e;
      margin: 0 0 20px 0;
      text-align: center;
    }
    
    .booking-id {
      background-color: #fef3c7;
      border: 1px solid #f59e0b;
      border-radius: 6px;
      padding: 12px 16px;
      margin: 20px 0;
      text-align: center;
    }
    
    .booking-id .label {
      font-size: 12px;
      color: #92400e;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .booking-id .value {
      font-size: 16px;
      color: #92400e;
      font-weight: bold;
      font-family: 'Courier New', monospace;
    }
    
    .section-title {
      font-size: 18px;
      font-weight: bold;
      color: #2563eb;
      margin: 30px 0 20px 0;
      padding-bottom: 8px;
      border-bottom: 2px solid #e5e7eb;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .details-table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    }
    
    .details-table td {
      padding: 14px 16px;
      border-bottom: 1px solid #f3f4f6;
      vertical-align: top;
    }
    
    .details-table tr:nth-child(even) {
      background-color: #f8fafc;
    }
    
    .details-table tr:nth-child(odd) {
      background-color: #ffffff;
    }
    
    .details-table tr:last-child td {
      border-bottom: none;
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

    .payment-breakdown {
      background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
      border: 2px solid #f59e0b;
      border-radius: 12px;
      padding: 25px;
      margin: 30px 0;
    }

    .payment-breakdown-title {
      font-size: 20px;
      font-weight: bold;
      color: #92400e;
      margin: 0 0 20px 0;
      text-align: center;
    }

    .payment-breakdown-table {
      width: 100%;
      border-collapse: collapse;
      background: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .payment-breakdown-table td {
      padding: 12px 16px;
      border-bottom: 1px solid #f3f4f6;
    }

    .payment-breakdown-table tr:last-child td {
      border-bottom: none;
    }

    .payment-breakdown-table .payment-label {
      font-weight: 600;
      color: #92400e;
      width: 60%;
      font-size: 14px;
    }

    .payment-breakdown-table .payment-value {
      color: #92400e;
      font-size: 14px;
      font-weight: 500;
      text-align: right;
    }

    .payment-breakdown-table .total-row {
      background-color: #92400e;
      color: #ffffff;
      font-weight: bold;
      font-size: 16px;
    }

    .payment-breakdown-table .total-row .payment-label,
    .payment-breakdown-table .total-row .payment-value {
      color: #ffffff;
    }
    
    .amount-highlight {
      background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%);
      border: 2px solid #16a34a;
      border-radius: 8px;
      padding: 20px;
      margin: 25px 0;
      text-align: center;
    }
    
    .amount-value {
      font-size: 32px;
      font-weight: bold;
      color: #166534;
      margin: 0 0 5px 0;
    }
    
    .amount-label {
      font-size: 14px;
      color: #166534;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .next-steps {
      background-color: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 8px;
      padding: 25px;
      margin: 30px 0;
    }
    
    .next-steps-title {
      font-size: 18px;
      font-weight: bold;
      color: #166534;
      margin: 0 0 15px 0;
    }
    
    .steps-list {
      margin: 0;
      padding: 0;
      list-style: none;
    }
    
    .step-item {
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
    
    .contact-section {
      background-color: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: 8px;
      padding: 25px;
      margin: 30px 0;
    }
    
    .contact-title {
      font-size: 18px;
      font-weight: bold;
      color: #1e40af;
      margin: 0 0 15px 0;
    }
    
    .contact-text {
      color: #1e40af;
      font-size: 15px;
      line-height: 1.6;
      margin: 0;
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

    .schedule-container {
      background-color: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 20px;
      margin: 20px 0;
    }

    .retry-booking {
      background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%);
      color: white;
      padding: 15px 30px;
      border-radius: 8px;
      text-decoration: none;
      display: inline-block;
      font-weight: bold;
      margin: 20px 0;
      text-align: center;
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
      
      .booking-summary,
      .next-steps,
      .contact-section,
      .payment-breakdown {
        padding: 20px;
      }
      
      .amount-value {
        font-size: 28px;
      }
    }
    
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
              <h1>${headerContent.title}</h1>
              <p>${headerContent.subtitle}</p>
            </div>
            
            <!-- Content -->
            <div class="content">
              <!-- Welcome Message -->
              <p class="welcome-text">${welcomeMessage.greeting}</p>
              <p class="intro-text">
                ${welcomeMessage.message}
              </p>

              <!-- Booking ID -->
              <div class="booking-id">
                <div class="label">Booking ID:</div>
                <div class="value">${booking._id}</div>
              </div>

              <!-- Booking Status -->
              ${getBookingStatusBadge(booking.bookingStatus)}

              <!-- Booking Summary -->
              <div class="booking-summary">
                <h3 class="booking-title">Booking ${isSuccessful ? 'Summary' : isPending ? 'Request Details' : 'Attempt Details'}</h3>
                <table class="details-table" role="presentation">
                  <tr>
                    <td class="label">Venue Name:</td>
                    <td class="value">${venue.venue_name}</td>
                  </tr>
                  <tr>
                    <td class="label">Venue Address:</td>
                    <td class="value">${venue.venue_address}</td>
                  </tr>
                  <tr>
                    <td class="label">Sport:</td>
                    <td class="value">${booking.sport}</td>
                  </tr>
                  <tr>
                    <td class="label">Booking Type:</td>
                    <td class="value">${formatBookingPattern(booking.bookingPattern)}</td>
                  </tr>
                  <tr>
                    <td class="label">Duration:</td>
                    <td class="value">${booking.durationInHours} hour${booking.durationInHours > 1 ? "s" : ""}</td>
                  </tr>
                </table>
              </div>

              ${isSuccessful ? `
              <!-- Scheduled Dates & Time Slots -->
              <h3 class="section-title">
                Scheduled Dates & Time Slots
              </h3>
              <div class="schedule-container">
                ${formatBookingSchedule(booking.scheduledDates)}
              </div>
              ` : ''}

              <!-- Payment Breakdown -->
              <div class="payment-breakdown">
                <h3 class="payment-breakdown-title">Payment ${isSuccessful ? 'Breakdown' : isFailed ? 'Attempt Details' : 'Processing'}</h3>
                <table class="payment-breakdown-table" role="presentation">
                  <tr>
                    <td class="payment-label">Base Amount:</td>
                    <td class="payment-value">₹${formatCurrency(paymentDetails.baseAmount)}</td>
                  </tr>
                  <tr>
                    <td class="payment-label">Processing Fee:</td>
                    <td class="payment-value">₹${formatCurrency(paymentDetails.processingFee)}</td>
                  </tr>
                  <tr>
                    <td class="payment-label">Convenience Fee:</td>
                    <td class="payment-value">₹${formatCurrency(paymentDetails.convenienceFee)}</td>
                  </tr>
                  <tr>
                    <td class="payment-label">GST Amount (18%):</td>
                    <td class="payment-value">₹${formatCurrency(paymentDetails.gstamount)}</td>
                  </tr>
                  <tr class="total-row">
                    <td class="payment-label">Total Amount ${isSuccessful ? 'Paid' : isFailed ? 'Attempted' : 'Processing'}:</td>
                    <td class="payment-value">₹${formatCurrency(paymentDetails.totalAmount)}</td>
                  </tr>
                </table>
              </div>

              <!-- Payment Details -->
              <h3 class="section-title">
                Payment Details
              </h3>
              
              ${getPaymentStatusBadge(paymentDetails.paymentStatus)}
              
              <table class="details-table" role="presentation">
                <tr>
                  <td class="label">Payment Method:</td>
                  <td class="value">${paymentDetails.paymentMethod || "Online Payment"}</td>
                </tr>
                <tr>
                  <td class="label">Transaction ID:</td>
                  <td class="value">${booking.razorpayPaymentId || paymentDetails.transactionId || "N/A"}</td>
                </tr>
                <tr>
                  <td class="label">Session ID:</td>
                  <td class="value">${booking.sessionId}</td>
                </tr>
                <tr>
                  <td class="label">${isSuccessful ? 'Payment' : 'Attempt'} Date:</td>
                  <td class="value">${new Date(booking.createdAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })}</td>
                </tr>
              </table>

              ${isFailed ? `
              <!-- Retry Booking Section -->
              <div style="text-align: center; margin: 30px 0;">
                <a href="#" class="retry-booking">
                  Try Booking Again
                </a>
                <p style="color: #6b7280; font-size: 14px; margin-top: 10px;">
                  The time slot is still available for booking
                </p>
              </div>
              ` : ''}

              <!-- Next Steps -->
              ${getNextSteps()}

              <!-- Contact Support -->
              <div class="contact-section">
  <h3 class="contact-title">Need Help?</h3>
  <p class="contact-text">
    ${isSuccessful
          ? 'If you have any questions about your booking or need assistance, our support team is here to help:'
          : isPending
            ? 'If your payment is taking longer than expected or you have questions, our support team is ready to assist:'
            : 'Having trouble with your booking? Our support team is here to help you complete your reservation:'
        }
    <br><br>
    Email: <a href="mailto:gullyteam33@gmail.com" style="color: #1e40af; text-decoration: none;">gullyteam33@gmail.com</a><br>
    <br>
    For immediate venue-related queries, contact the venue directly at <strong>${venue.venue_contact}</strong>
  </p>
</div>


              ${getClosingMessage()}
            </div>

            <div class="footer">
              <p class="footer-text">
                <strong>© ${new Date().getFullYear()} Nilee Games and Future Technologies Pvt. Ltd.</strong>
              </p>
              <p class="footer-text">
                Support: <a href="mailto:gullyteam33@gmail.com" class="footer-link">gullyteam33@gmail.com</a> | 
                Website: <a href="#" class="footer-link">www.gullyteam.com</a>
              </p>
            </div>
          </div>
        </td>
      </tr>
    </table>
  </div>
</body>
</html>`,
    }

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log(`Error sending booking ${isSuccessful ? 'confirmation' : isPending ? 'pending notification' : 'failure notification'}:`, error)
      } else {
        console.log(`Booking ${isSuccessful ? 'confirmation' : isPending ? 'pending notification' : 'failure notification'} email sent:`, info.response)
      }
    })
  },

  /**
 * @function createVenueOrder
 * @description
 * Handles the complete process of creating a Razorpay order for a venue subscription.
 * - Generates a new Razorpay order using the specified amount.
 * - Validates user, venue, and package information.
 * - Saves order details in `OrderHistory` and `Payment` collections.
 * - Initiates email notifications (delayed by 10s) based on payment status.
 * 
 * @param {Object} data - Incoming payment & venue details.
 * @param {String} data.venueId - The ID of the venue being subscribed (optional).
 * @param {String} data.PackageId - The ID of the purchased package.
 * @param {Number} data.amount - Total amount to be paid (in INR).
 * @param {Number} data.baseAmount - Base package price before taxes.
 * @param {Number} data.processingFee - Platform processing fee.
 * @param {Number} data.convenienceFee - Additional handling fee.
 * @param {Number} data.gstamount - GST (18%) applied to the order.
 * @param {Number} data.totalAmount - Final total (base + GST + fees).
 * @param {String} [data.status="Pending"] - Payment status (Pending/Failed/Success).
 * @param {String} [data.paymentMode="Card"] - Payment method used.
 * @param {String} data.razorpay_paymentId - Razorpay payment ID (if available).
 * @param {Object} [data.venueData] - Venue data (used when venue record isn’t in DB).
 * 
 * @returns {Promise<Object>} Returns a Razorpay order object and a success message.
 */
  async createVenueOrder(data) {
    const userInfo = global.user;
    const receipt = crypto.randomBytes(10).toString("hex");
    const paymentData = {
      amount: Math.round(data.amount * 100),
      currency: "INR",
      receipt: `order_receipt_${receipt}`,
      payment_capture: 1,
    };
    const result = await RazorpayHandler.createOrder(paymentData);

    let venue = null;
    if (data.venueId) {
      venue = await Venue.findById(data.venueId);
      if (!venue) throw CustomErrorHandler.notFound("Venue Not Found");
    }

    const user = venue ? await User.findById(venue.userId) : await User.findById(userInfo.userId);
    if (!user) throw CustomErrorHandler.notFound("User Not Found");

    const purchasedPackage = await Package.findById(data.PackageId);
    if (!purchasedPackage) throw CustomErrorHandler.notFound("Package Not Found");

    const orderHistoryData = {
      orderId: result.id,
      userId: userInfo.userId,
      razorpay_paymentId: data.razorpay_paymentId,
      PackageId: data.PackageId,
      baseAmount: data.baseAmount,
      processingFee: data.processingFee,
      convenienceFee: data.convenienceFee,
      gstamount: data.gstamount,
      totalAmount: data.totalAmount,
      currency: result.currency,
      receipt: result.receipt,
      status: data.status || "Pending",
      ordertype: "venue",
    };

    if (data.venueId) {
      orderHistoryData.venueId = data.venueId;
    }

    const orderHistory = new OrderHistory(orderHistoryData);
    await orderHistory.save();

    const paymentDataObj = {
      orderId: result.id,
      userId: userInfo.userId,
      razorpay_paymentId: data.razorpay_paymentId,
      PackageId: data.PackageId,
      baseAmount: data.baseAmount,
      processingFee: data.processingFee,
      convenienceFee: data.convenienceFee,
      gstamount: data.gstamount,
      totalAmount: data.totalAmount,
      paymentStatus: data.status || "Pending",
      paymentMode: data.paymentMode || "Card",
      transactionId: result.id,
    };

    if (data.venueId) {
      paymentDataObj.venueId = data.venueId;
    }

    const payment = new Payment(paymentDataObj);
    await payment.save();

    if (venue) {
      setTimeout(async () => {
        console.log("Sending email after 10 seconds...");
        await otherServices.sendvenuepaymentMail(
          "shop-subscription",
          user,
          venue,
          purchasedPackage,
          result.id,
          orderHistory.receipt,
          data.status,
          data.baseAmount,
          data.processingFee,
          data.convenienceFee,
          data.gstamount,
          data.totalAmount
        );
      }, 10000);
      await otherServices.creatContactonRazorPay(venue);
    } else if (data.status === "Failed" && data.venueData) {
      setTimeout(async () => {
        console.log("Sending failed payment email...");
        await otherServices.sendvenuepaymentMail(
          "shop-subscription",
          user,
          null,
          purchasedPackage,
          result.id,
          orderHistory.receipt,
          data.status,
          data.baseAmount,
          data.processingFee,
          data.convenienceFee,
          data.gstamount,
          data.totalAmount,
          data.venueData
        );
      }, 10000);
    }

    return {
      order: result,
      message: "Shop Order created successfully. Payment is pending.",
    };
  },
  async sendvenuepaymentMail(
    userFor = "",
    user,
    venue,
    purchasedPackage,
    TRANSACTION_ID,
    RECEIPT_NUMBER,
    PAYMENT_STATUS,
    baseAmount,
    processingFee,
    convenienceFee,
    gstAmount,
    totalAmount,
    venueDataFromFrontend = null
  ) {
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

    if (!user || !user.email || !purchasedPackage || typeof purchasedPackage.price !== "number") {
      console.error("Missing or invalid user/purchasedPackage info.");
      return;
    }

    // Use venue from DB if available, otherwise use data from frontend
    const venueData = venue || venueDataFromFrontend;

    if (!venueData) {
      console.error("No venue data available for email");
      return;
    }

    // Price breakdown - use passed parameters instead of calculating
    const baseAmountFormatted = baseAmount.toFixed(2);
    const gstAmountFormatted = gstAmount.toFixed(2);
    const totalAmountFormatted = totalAmount.toFixed(2);
    const convenienceFeeFormatted = convenienceFee.toFixed(2);
    const processingFeeFormatted = processingFee.toFixed(2);

    // Determine status-specific content
    let headerTitle, headerColor, statusBadgeColor, statusMessage, introText, ctaText, ctaButtons;

    // Set content based on payment status
    if (PAYMENT_STATUS === "Failed") {
      headerTitle = "Payment Failed - Action Required";
      headerColor = "linear-gradient(135deg, #dc2626 0%, #ef4444 100%)";
      statusBadgeColor = "#fee2e2";
      statusMessage = `
      <div style="background-color: #fee2e2; border: 1px solid #f87171; border-radius: 6px; padding: 16px; margin: 20px 0;">
        <p style="color: #b91c1c; font-weight: bold; margin: 0 0 10px 0; font-size: 16px;">Payment Failed</p>
        <p style="color: #b91c1c; margin: 0; font-size: 14px;">
          We were unable to process your payment for the venue subscription package. Please check your payment details and try again.
        </p>
      </div>
    `;
      introText = `
      We regret to inform you that your payment for the ${purchasedPackage.name} venue subscription package could not be processed. 
      This could be due to insufficient funds, expired card details, or a temporary issue with the payment gateway.
    `;
      ctaText = "Please retry your payment to activate your venue subscription and start accepting bookings.";
      ctaButtons = `
      <a href="mailto:gullyteam33@gmail.com" class="cta-button" style="background-color: #2563eb;">
        Contact Support
      </a>
    `;
    } else if (PAYMENT_STATUS === "Pending") {
      headerTitle = "Payment Pending - Verification in Progress";
      headerColor = "linear-gradient(135deg, #eab308 0%, #facc15 100%)";
      statusBadgeColor = "#fef3c7";
      statusMessage = `
      <div style="background-color: #fef3c7; border: 1px solid #fbbf24; border-radius: 6px; padding: 16px; margin: 20px 0;">
        <p style="color: #92400e; font-weight: bold; margin: 0 0 10px 0; font-size: 16px;">Payment Pending</p>
        <p style="color: #92400e; margin: 0; font-size: 14px;">
          Your payment is being processed. This usually takes a few minutes, but may take up to 24 hours in some cases.
        </p>
      </div>
    `;
      introText = `
      Thank you for purchasing the ${purchasedPackage.name} venue subscription package. Your payment is currently being processed.
      You will receive a confirmation email once the payment is successfully verified.
    `;
      ctaText = "You can check the status of your payment in your Transaction History.";
      ctaButtons = `
      <a href="mailto:gullyteam33@gmail.com" class="cta-button" style="background-color: #2563eb;">
        Contact Support
      </a>
    `;
    } else {
      // Success or any other status
      headerTitle = "Venue Subscription Successfully Activated";
      headerColor = "linear-gradient(135deg, #2563eb 0%, #06b6d4 100%)";
      statusBadgeColor = "#fef3c7";
      statusMessage = `
      <div style="background-color: #dcfce7; border: 1px solid #86efac; border-radius: 6px; padding: 16px; margin: 20px 0;">
        <p style="color: #166534; font-weight: bold; margin: 0 0 10px 0; font-size: 16px;">Payment Successful</p>
        <p style="color: #166534; margin: 0; font-size: 14px;">
          Your payment has been successfully processed and your venue subscription is now active.
        </p>
      </div>
    `;
      introText = `
      We are pleased to confirm that your venue subscription payment has been successfully processed. Thank you for choosing Gully Team —
      We're excited to have you onboard and look forward to helping you manage your venue bookings and grow your sports business.
    `;
      ctaText = "Thank you for joining us and trusting Gully Team with your venue management. We look forward to helping you connect with sports enthusiasts!";
      ctaButtons = `
      <a href="mailto:gullyteam33@gmail.com" class="cta-button" style="background-color: #2563eb;">
        Contact Support
      </a>
    `;
    }

    // Dynamic title & subject based on payment status
    let subject;
    if (PAYMENT_STATUS === "Failed") {
      subject = "Payment Failed - Action Required for Your Gully Team Venue Subscription";
    } else if (PAYMENT_STATUS === "Pending") {
      subject = "Payment Pending - Your Gully Team Venue Subscription";
    } else {
      subject = "Payment Confirmation – Gully Team Venue Subscription";
    }

    // Helper function to format sports pricing
    const formatSportsPricing = (venueData) => {
      if (venueData.sportPricing && venueData.sportPricing.length > 0) {
        return venueData.sportPricing.map((sp) => `${sp.sport}: ₹${sp.perHourCharge}/hour`).join("<br>");
      }
      return `Default Rate: ₹${venueData.perHourCharge || 0}/hour`;
    };

    // Helper function to format venue timeslots
    const formatVenueTimings = (timeslots) => {
      const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
      return days
        .map((day) => {
          const slot = timeslots[day];
          if (slot && slot.isOpen) {
            return `${day}: ${slot.openTime} - ${slot.closeTime}`;
          }
          return `${day}: Closed`;
        })
        .join("<br>");
    };

    // Helper function to format facilities
    const formatFacilities = (facilities) => {
      const facilityNames = {
        isWaterAvailable: "Water",
        isParkingAvailable: "Parking",
        isEquipmentProvided: "Equipment",
        isWashroomAvailable: "Washroom",
        isChangingRoomAvailable: "Changing Room",
        isFloodlightAvailable: "Floodlight",
        isSeatingLoungeAvailable: "Seating Lounge",
        isFirstAidAvailable: "First Aid",
        isWalkingTrackAvailable: "Walking Track",
      };

      const availableFacilities = Object.keys(facilities)
        .filter((key) => facilities[key] === true)
        .map((key) => facilityNames[key])
        .filter(Boolean);

      return availableFacilities.length > 0 ? availableFacilities.join(", ") : "Basic facilities available";
    };

    const mailOptions = {
      from: "gullyteam33@gmail.com",
      to: user.email,
      subject: subject,
      html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Status – Gully Team Venue</title>
  <style>
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
      max-width: 650px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
    }

    .header {
      background: ${headerColor};
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
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .section-icon {
      font-size: 20px;
    }

    .details-table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    }

    .details-table td {
      padding: 14px 16px;
      border-bottom: 1px solid #f3f4f6;
      vertical-align: top;
    }

    .details-table tr:nth-child(even) {
      background-color: #f8fafc;
    }

    .details-table tr:nth-child(odd) {
      background-color: #ffffff;
    }

    .details-table tr:last-child td {
      border-bottom: none;
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

    /* Payment Summary Styles */
    .payment-summary {
      background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
      border: 2px solid #0ea5e9;
      border-radius: 12px;
      padding: 25px;
      margin: 30px 0;
    }

    .payment-title {
      font-size: 20px;
      font-weight: bold;
      color: #0c4a6e;
      margin: 0 0 20px 0;
      text-align: center;
    }

    .payment-table {
      width: 100%;
      border-collapse: collapse;
      background: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .payment-table td {
      padding: 14px 18px;
      border-bottom: 1px solid #e2e8f0;
    }

    .payment-table tr:last-child td {
      border-bottom: none;
    }

    .payment-table .payment-label {
      font-weight: 600;
      color: #1e40af;
      width: 45%;
      font-size: 15px;
    }

    .payment-table .payment-value {
      color: #374151;
      font-size: 15px;
      font-weight: 500;
    }

    .payment-table .status-${PAYMENT_STATUS.toLowerCase()} {
      color: ${PAYMENT_STATUS === "Failed" ? "#dc2626" : PAYMENT_STATUS === "Pending" ? "#92400e" : "#16a34a"};
      font-weight: bold;
    }

    .payment-table .total-row {
      background-color: #1e40af;
      color: #ffffff;
      font-weight: bold;
      font-size: 16px;
    }

    .payment-table .total-row .payment-label,
    .payment-table .total-row .payment-value {
      color: #ffffff;
    }

    .transaction-id {
      background-color: ${statusBadgeColor};
      border: 1px solid #f59e0b;
      border-radius: 6px;
      padding: 12px 16px;
      margin: 20px 0;
      text-align: center;
    }

    .transaction-id .label {
      font-size: 12px;
      color: #92400e;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .transaction-id .value {
      font-size: 16px;
      color: #92400e;
      font-weight: bold;
      font-family: 'Courier New', monospace;
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
      margin: 0 10px 10px 0;
    }

    .cta-button.secondary {
      background-color: #059669;
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
      
      .payment-table .payment-label {
        width: 50%;
      }
      
      .highlight-section,
      .info-section,
      .payment-summary {
        padding: 20px;
      }
      
      .cta-button {
        display: block;
        margin: 10px 0;
      }
    }

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
              <h1>${headerTitle}</h1>
              <p>Gully Team Venue Subscription</p>
            </div>

            <!-- Content -->
            <div class="content">
              <!-- Welcome Message -->
              <p class="welcome-text">Hello ${user.fullName}! 🏟️</p>
              <p class="intro-text">${introText}</p>

              <!-- Status Message -->
              ${statusMessage}

              <div class="transaction-id">
                <div class="label">Transaction ID:</div>
                <div class="value">${TRANSACTION_ID}</div>
              </div>

              <div class="payment-summary">
                <h3 class="payment-title">Payment Summary</h3>
                <table class="payment-table" role="presentation">
                  <tr>
                    <td class="payment-label">Package Name:</td>
                    <td class="payment-value">${purchasedPackage.name}</td>
                  </tr>
                  <tr>
                    <td class="payment-label">Base Amount:</td>
                    <td class="payment-value">₹${baseAmountFormatted}</td>
                  </tr>
                  <tr>
                    <td class="payment-label">Convenience Fee:</td>
                    <td class="payment-value">₹${convenienceFeeFormatted}</td>
                  </tr>
                  <tr>
                    <td class="payment-label">Processing Fee:</td>
                    <td class="payment-value">₹${processingFeeFormatted}</td>
                  </tr>
                  <tr>
                    <td class="payment-label">GST (18%):</td>
                    <td class="payment-value">₹${gstAmountFormatted}</td>
                  </tr>
                  <tr>
                    <td class="payment-label">Payment Status:</td>
                    <td class="payment-value status-${PAYMENT_STATUS.toLowerCase()}">${PAYMENT_STATUS}</td>
                  </tr>
                  <tr>
                    <td class="payment-label">Receipt Number:</td>
                    <td class="payment-value">${RECEIPT_NUMBER}</td>
                  </tr>
                  <tr class="total-row">
                    <td class="payment-label">Total Amount:</td>
                    <td class="payment-value">₹${totalAmountFormatted}</td>
                  </tr>
                </table>
              </div>

              <h3 class="section-title">
                Venue Information
              </h3>
              <table class="details-table" role="presentation">
                <tr>
                  <td class="label">Venue Name:</td>
                  <td class="value">${venueData.venue_name || 'N/A'}</td>
                </tr>
                <tr>
                  <td class="label">Description:</td>
                  <td class="value">${venueData.venue_description || 'N/A'}</td>
                </tr>
                <tr>
                  <td class="label">Address:</td>
                  <td class="value">${venueData.venue_address || 'N/A'}</td>
                </tr>
                <tr>
                  <td class="label">Contact Number:</td>
                  <td class="value">${venueData.venue_contact || 'N/A'}</td>
                </tr>
                <tr>
                  <td class="label">Venue Type:</td>
                  <td class="value">${venueData.venue_type || 'N/A'}</td>
                </tr>
                ${venueData.venue_surfacetype ? `
                <tr>
                  <td class="label">Surface Type:</td>
                  <td class="value">${venueData.venue_surfacetype}</td>
                </tr>
                ` : ''}
              </table>

              <!-- Sports & Pricing Information -->
              <h3 class="section-title">
                Sports & Pricing
              </h3>
              <table class="details-table" role="presentation">
                <tr>
                  <td class="label">Available Sports:</td>
                  <td class="value">${venueData.venue_sports ? venueData.venue_sports.join(", ") : "Not specified"}</td>
                </tr>
                <tr>
                  <td class="label">Pricing:</td>
                  <td class="value">${formatSportsPricing(venueData)}</td>
                </tr>
                ${venueData.upiId ? `
                <tr>
                  <td class="label">UPI ID:</td>
                  <td class="value">${venueData.upiId}</td>
                </tr>
                ` : ''}
              </table>

              <!-- Venue Timings -->
              ${venueData.venue_timeslots ? `
              <h3 class="section-title">
                Venue Timings
              </h3>
              <table class="details-table" role="presentation">
                <tr>
                  <td class="label">Operating Hours:</td>
                  <td class="value">${formatVenueTimings(venueData.venue_timeslots)}</td>
                </tr>
              </table>
              ` : ''}

              <!-- Facilities -->
              ${venueData.venuefacilities ? `
              <h3 class="section-title">
                Facilities & Amenities
              </h3>
              <table class="details-table" role="presentation">
                <tr>
                  <td class="label">Available Facilities:</td>
                  <td class="value">${formatFacilities(venueData.venuefacilities)}</td>
                </tr>
                ${venueData.venue_rules && venueData.venue_rules.length > 0 ? `
                <tr>
                  <td class="label">Venue Rules:</td>
                  <td class="value">${venueData.venue_rules.join("<br>")}</td>
                </tr>
                ` : ''}
              </table>
              ` : ''}

              <!-- Owner Information -->
              <h3 class="section-title">
                Owner Information
              </h3>
              <table class="details-table" role="presentation">
                <tr>
                  <td class="label">Owner Name:</td>
                  <td class="value">${user.fullName}</td>
                </tr>
                <tr>
                  <td class="label">Email:</td>
                  <td class="value">${user.email}</td>
                </tr>
                <tr>
                  <td class="label">Phone:</td>
                  <td class="value">${user.phoneNumber || "Not provided"}</td>
                </tr>
                ${venue && venue.createdAt ? `
                <tr>
                  <td class="label">Registered On:</td>
                  <td class="value">${new Date(venue.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</td>
                </tr>
                ` : ''}
              </table>

              ${PAYMENT_STATUS !== "Failed" ? `
              <!-- Getting Started -->
              <div class="highlight-section">
                <h3 class="highlight-title">Start with the basics:</h3>
                <ul class="task-list">
                  <li class="task-item">
                    <span class="checkmark">✓</span>
                    Log into your venue dashboard and review your listing
                  </li>
                  <li class="task-item">
                    <span class="checkmark">✓</span>
                    Upload high-quality images of your venue and facilities
                  </li>
                  <li class="task-item">
                    <span class="checkmark">✓</span>
                    Set up your sports offerings and per-hour pricing
                  </li>
                  <li class="task-item">
                    <span class="checkmark">✓</span>
                    Configure your venue timings and availability
                  </li>
                  <li class="task-item">
                    <span class="checkmark">✓</span>
                    Monitor incoming bookings and manage your calendar
                  </li>
                  <li class="task-item">
                    <span class="checkmark">✓</span>
                    Track your venue analytics and booking performance
                  </li>
                </ul>
              </div>
              ` : ''}

              <!-- Info Section -->
              <div class="info-section">
                <h3 class="info-title">${PAYMENT_STATUS === "Failed" ? "Payment Failed - What to Do Next" : "What's Included in Your Venue Subscription"}</h3>
                <p class="info-text">
                  ${PAYMENT_STATUS === "Failed" ? `
                    Your payment could not be processed. This might be due to:
                    <br><br>
                    • Insufficient funds in your account<br>
                    • Incorrect card details<br>
                    • Bank declined the transaction<br>
                    • Temporary issue with the payment gateway
                    <br><br>
                    Please try again with a different payment method or contact your bank for more information.
                  ` : `
                    Your venue subscription gives you access to powerful tools to manage your sports facility and grow your booking business. This includes:
                    <br><br>
                    • <strong>Venue Listing:</strong> Showcase your Venue/turf on our platform with photos and detailed information<br>
                    • <strong>Multi-Sport Management:</strong> Add multiple sports with individual pricing for each<br>
                    • <strong>Booking Management:</strong> Accept and manage slot bookings from sports enthusiasts<br>
                    • <strong>Flexible Pricing:</strong> Set per-hour charges for different sports and time slots<br>
                    • <strong>Analytics Dashboard:</strong> Track bookings, revenue, and venue performance<br>
                    • <strong>Payment Integration:</strong> Secure payment processing with multiple payment options<br>
                    • <strong>Calendar Management:</strong> Manage availability and time slots efficiently
                    <br><br>
                    Log in to your Gully Team venue dashboard to start accepting bookings and connecting with sports enthusiasts in your area.
                  `}
                </p>
              </div>

              <!-- Call to Action -->
              <div class="cta-section">
                <p class="cta-text">
                  ${ctaText}
                </p>
                ${ctaButtons}
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
              <p class="footer-text">
                For payment queries, please include your Transaction ID: <strong>${TRANSACTION_ID}</strong>
              </p>
            </div>
          </div>
        </td>
      </tr>
    </table>
  </div>
</body>
</html>`,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log("Error sending email:", error);
      } else {
        console.log("Venue subscription email sent:", info.response);
      }
    });
  },


  /**
   * Creates a Razorpay Contact and Fund Account (VPA) for a Venue.
   * Updates the Venue document with the generated Razorpay IDs.
   *
   * @param {Object} venue - The venue document containing necessary details.
   * @returns {Boolean} - Returns true if both contact and fund account creation succeed.
   * @throws {Error} - Throws error if any Razorpay API call fails.
   */
  async creatContactonRazorPay(venue) {
    try {
      const endpoint = 'https://api.razorpay.com/v1/contacts';
      const auth = {
        username: RAZORPAY_KEY_ID,
        password: RAZORPAY_KEY_SECRET
      };

      const headers = {
        'Content-Type': 'application/json'
      };
      const payload = {
        name: venue.venue_name || `Venue_${venue._id}`,
        contact: venue.venue_contact || "0000000000",
        type: "vendor",
        reference_id: "test",
        notes: {
          source: "Venue Registration",
          venueId: venue._id.toString()
        }
      };

      const contactResponse = await axios.post(endpoint, payload, { auth, headers });
      const contactId = contactResponse.data.id;
      console.log("Razorpay contact created:", contactId);
      const fundAccountResponse = await axios.post(
        'https://api.razorpay.com/v1/fund_accounts',
        {
          account_type: "vpa",
          contact_id: contactId,
          vpa: {
            address: venue.venue_vpa || "demo@upi"
          }
        },
        { auth, headers }
      );

      const fundAccountId = fundAccountResponse.data.id;

      await Venue.findByIdAndUpdate(venue._id, {
        razorpaycontactId: contactId,
        razorpayFundAccountId: fundAccountId
      });

      return true;
    } catch (error) {
      console.error("Failed to create Razorpay contact:", error.response?.data || error.message);
      throw new Error("Could not create contact on Razorpay");
    }
  },

  /**
 * @function createIndividualSubscriptionOrder
 * @description
 * Handles the creation of an order for an individual’s subscription or renewal.  
 * This method integrates with Razorpay to generate a payment order, records it in
 * the `OrderHistory` and `Payment` collections, and triggers a confirmation email
 * (sent asynchronously after 10 seconds).
 *
 * The function supports both direct user-based subscriptions and
 * subscriptions tied to a specific `Individual` record.
 *
 * @param {Object} data - The payload containing subscription and payment details.
 * @param {String} [data.individualId] - (Optional) The ID of the Individual associated with this subscription.
 * @param {String} data.PackageId - The ID of the package being purchased.
 * @param {Number} data.amount - Total payable amount (in INR).
 * @param {Number} data.baseAmount - Base subscription amount before taxes and fees.
 * @param {Number} data.processingFee - Processing fee applied to the transaction.
 * @param {Number} data.convenienceFee - Convenience or service fee.
 * @param {Number} data.gstamount - GST applied (typically 18% of the total).
 * @param {Number} data.totalAmount - Total amount payable after all additions.
 * @param {String} [data.status="Pending"] - Initial payment status (e.g., "Pending", "Success", "Failed").
 * @param {String} [data.paymentMode="Card"] - Payment mode (e.g., "Card", "UPI", "NetBanking").
 * @param {String} [data.razorpay_paymentId] - Razorpay payment ID if available.
 *
 * @returns {Promise<Object>} Returns the Razorpay order object and a success message.
 * @throws {Error} Throws an error if:
 * - The Individual, User, or Package record cannot be found.
 * - Razorpay order creation fails.
 * - Database operations fail (OrderHistory or Payment not saved).
 *
 * @notes
 * - Uses `global.user` to identify the currently authenticated user.
 * - Delays the email sending by 10 seconds using `setTimeout()` to prevent blocking the response.
 * - Email is sent via `sendIndividualSubscriptionMail()` with detailed payment summary.
 */
  async createIndividualSubscriptionOrder(data) {
    try {
      const userInfo = global.user;
      const receipt = crypto.randomBytes(10).toString("hex");

      const paymentData = {
        amount: data.amount * 100,
        currency: "INR",
        receipt: `order_receipt_${receipt}`,
        payment_capture: 1,
      };

      const result = await RazorpayHandler.createOrder(paymentData);

      let individual = null;
      if (data.individualId) {
        individual = await Individual.findById(data.individualId);
        if (!individual) throw CustomErrorHandler.notFound("Individual Not Found");
      }

      const user = individual ? await User.findById(individual.userId) : await User.findById(userInfo.userId);
      if (!user) throw CustomErrorHandler.notFound("User Not Found");
      const purchasedPackage = await Package.findById(data.PackageId);
      if (!purchasedPackage) throw CustomErrorHandler.notFound("Package Not Found");

      const orderHistoryData = {
        orderId: result.id,
        userId: userInfo.userId,
        razorpay_paymentId: data.razorpay_paymentId,
        PackageId: data.PackageId,
        baseAmount: data.baseAmount,
        processingFee: data.processingFee,
        convenienceFee: data.convenienceFee,
        gstamount: data.gstamount,
        totalAmount: data.totalAmount,
        currency: result.currency,
        receipt: result.receipt,
        status: data.status || "Pending",
        ordertype: "individual-subscription-Renew",
      };

      if (data.individualId) {
        orderHistoryData.individualId = data.individualId;
      }

      const orderHistory = new OrderHistory(orderHistoryData);
      await orderHistory.save();

      const paymentDataObj = {
        orderId: result.id,
        userId: userInfo.userId,
        razorpay_paymentId: data.razorpay_paymentId,
        PackageId: data.PackageId,
        individualId: data.individualId,
        baseAmount: data.baseAmount,
        processingFee: data.processingFee,
        convenienceFee: data.convenienceFee,
        gstamount: data.gstamount,
        totalAmount: data.totalAmount,
        paymentfor: "individual-subscription-Renew",
        paymentStatus: data.status || "Pending",
        paymentMode: data.paymentMode || "Card",
        transactionId: result.id,
      };

      if (data.individualId) {
        paymentDataObj.individualId = data.individualId;
      }

      const payment = new Payment(paymentDataObj);
      await payment.save();

      // Send email after 10 seconds
      setTimeout(async () => {
        console.log("Sending individual subscription email after 10 seconds...");
        await this.sendIndividualSubscriptionMail(
          user,
          individual,
          purchasedPackage,
          result.id,
          orderHistory.receipt,
          data.status,
          {
            baseAmount: data.baseAmount,
            processingFee: data.processingFee,
            convenienceFee: data.convenienceFee,
            gstAmount: data.gstamount,
            totalAmount: data.totalAmount,
            paymentMode: data.paymentMode || "Online Payment"
          }
        );
      }, 10000);

      return {
        order: result,
        message: "Individual subscription order created successfully. Confirmation email will be sent shortly.",
      };
    } catch (error) {
      console.error(`Error in createIndividualSubscriptionOrder: ${error}`);
      throw error;
    }
  },

  /**
  * @function createVenueSubscriptionOrder
  * @description
  * Creates a Razorpay order for renewing or subscribing to a venue package.  
  * This function generates a payment order via Razorpay, stores order details in both
  * `OrderHistory` and `Payment` collections, and schedules a confirmation email 
  * to be sent asynchronously after 10 seconds.
  *
  * @param {Object} data - The payload containing venue subscription and payment details.
  * @param {String} data.venueId - The ID of the venue for which the subscription is being renewed.
  * @param {String} data.PackageId - The ID of the package being purchased for the venue.
  * @param {Number} data.amount - Total payable amount (in INR).
  * @param {Number} data.baseAmount - Base subscription amount before taxes and additional charges.
  * @param {Number} data.processingFee - Processing fee for handling the transaction.
  * @param {Number} data.convenienceFee - Additional service or convenience fee.
  * @param {Number} data.gstamount - GST amount applied (typically a percentage of the total).
  * @param {Number} data.totalAmount - Total payable amount after adding GST and fees.
  * @param {String} [data.status="Pending"] - Initial payment status (e.g., "Pending", "Success", "Failed").
  * @param {String} [data.paymentMode="Card"] - Mode of payment used (e.g., "Card", "UPI", "NetBanking").
  * @param {String} [data.razorpay_paymentId] - Razorpay payment ID, if available.
  *
  * @returns {Promise<Object>} Returns the Razorpay order object and a success message.
  *
  * @throws {Error} Throws an error if:
  * - The Venue, User, or Package cannot be found.
  * - Razorpay order creation fails.
  * - Database operations (saving OrderHistory or Payment) fail.
  *
  * @notes
  * - Uses `global.user` to identify the currently authenticated user.
  * - Automatically sends a subscription confirmation email via `sendVenueSubscriptionMail()` 
  *   after a short delay to avoid blocking the main execution thread.
  * - Payment and order details are logged in both `OrderHistory` and `Payment` collections 
  *   for traceability and reconciliation.
  */
  async createVenueSubscriptionOrder(data) {
    try {
      const userInfo = global.user;
      const receipt = crypto.randomBytes(10).toString("hex");
      const paymentData = {
        amount: Math.round(data.amount * 100),
        currency: "INR",
        receipt: `order_receipt_${receipt}`,
        payment_capture: 1,
      };

      const result = await RazorpayHandler.createOrder(paymentData);

      const venue = await Venue.findById(data.venueId);
      if (!venue) throw CustomErrorHandler.notFound("Venue Not Found");

      const user = await User.findById(venue.userId);
      if (!user) throw CustomErrorHandler.notFound("User Not Found");

      const purchasedPackage = await Package.findById(data.PackageId);
      if (!purchasedPackage) throw CustomErrorHandler.notFound("Package Not Found");

      const orderHistoryData = {
        orderId: result.id,
        userId: userInfo.userId,
        razorpay_paymentId: data.razorpay_paymentId,
        PackageId: data.PackageId,
        baseAmount: data.baseAmount,
        venueId: data.venueId,
        processingFee: data.processingFee,
        convenienceFee: data.convenienceFee,
        gstamount: data.gstamount,
        totalAmount: data.totalAmount,
        currency: result.currency,
        receipt: result.receipt,
        status: data.status || "Pending",
        ordertype: "venue-subscription-Renew",
      };
      const orderHistory = new OrderHistory(orderHistoryData);
      await orderHistory.save();

      const paymentDataObj = {
        orderId: result.id,
        userId: userInfo.userId,
        razorpay_paymentId: data.razorpay_paymentId,
        PackageId: data.PackageId,
        venueId: data.venueId,
        baseAmount: data.baseAmount,
        processingFee: data.processingFee,
        convenienceFee: data.convenienceFee,
        gstamount: data.gstamount,
        totalAmount: data.totalAmount,
        paymentfor: "venue-subscription-Renew",
        paymentStatus: data.status || "Pending",
        paymentMode: data.paymentMode || "Card",
        transactionId: result.id,
      };
      const payment = new Payment(paymentDataObj);
      await payment.save();

      setTimeout(async () => {
        console.log("Sending venue subscription email after 10 seconds...");
        await this.sendVenueSubscriptionMail(
          user,
          venue,
          purchasedPackage,
          result.id,
          orderHistory.receipt,
          data.status,
          {
            baseAmount: data.baseAmount,
            processingFee: data.processingFee,
            convenienceFee: data.convenienceFee,
            gstAmount: data.gstamount,
            totalAmount: data.totalAmount,
            paymentMode: data.paymentMode || "Online Payment"
          }
        );
      }, 10000);

      return {
        order: result,
        message: "Venue subscription order created successfully. Confirmation email will be sent shortly.",
      };
    } catch (error) {
      console.error(`Error in createVenueSubscriptionOrder: ${error}`);
      throw error;
    }
  },

  async sendIndividualSubscriptionMail(user, individual, purchasedPackage, TRANSACTION_ID, RECEIPT_NUMBER, PAYMENT_STATUS, paymentDetails = {}) {
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

    if (!user || !user.email || !purchasedPackage) {
      console.error("Missing or invalid user/purchasedPackage info.");
      return;
    }

    // Use payment details from parameters
    const baseAmount = paymentDetails.baseAmount || 0;
    const convenienceFee = paymentDetails.convenienceFee || 0;
    const processingFee = paymentDetails.processingFee || 0;
    const gstAmount = paymentDetails.gstAmount || 0;
    const totalAmount = paymentDetails.totalAmount || 0;
    const paymentMode = paymentDetails.paymentMode || "Online Payment";

    // Helper function to format currency
    const formatCurrency = (amount) => {
      const num = parseFloat(amount) || 0;
      return num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    // Determine status-specific content
    let headerTitle, headerColor, statusBadgeColor, statusMessage, introText, ctaText, ctaButtons;

    if (PAYMENT_STATUS === "Failed") {
      headerTitle = "Payment Failed - Action Required";
      headerColor = "linear-gradient(135deg, #dc2626 0%, #ef4444 100%)";
      statusBadgeColor = "#fee2e2";
      statusMessage = `
        <div style="background-color: #fee2e2; border: 1px solid #f87171; border-radius: 6px; padding: 16px; margin: 20px 0;">
          <p style="color: #b91c1c; font-weight: bold; margin: 0 0 10px 0; font-size: 16px;">Payment Failed</p>
          <p style="color: #b91c1c; margin: 0; font-size: 14px;">
            We were unable to process your payment for the sports service subscription. No charges have been made to your account.
          </p>
        </div>
      `;
      introText = `We regret to inform you that your payment for the ${purchasedPackage.name} subscription package could not be processed.`;
      ctaText = "Please retry your payment to activate your subscription and start offering your sports services.";
      ctaButtons = `
        <a href="#" class="cta-button" style="background-color: #2563eb;">Retry Payment</a>
        <a href="mailto:gullyteam33@gmail.com" class="cta-button" style="background-color: #059669;">Contact Support</a>
      `;
    } else if (PAYMENT_STATUS === "Pending") {
      headerTitle = "Payment Pending - Verification in Progress";
      headerColor = "linear-gradient(135deg, #eab308 0%, #facc15 100%)";
      statusBadgeColor = "#fef3c7";
      statusMessage = `
        <div style="background-color: #fef3c7; border: 1px solid #fbbf24; border-radius: 6px; padding: 16px; margin: 20px 0;">
          <p style="color: #92400e; font-weight: bold; margin: 0 0 10px 0; font-size: 16px;"> Payment Pending</p>
          <p style="color: #92400e; margin: 0; font-size: 14px;">
            Your payment is being processed. This usually takes a few minutes, but may take up to 24 hours in some cases.
          </p>
        </div>
      `;
      introText = `Thank you for purchasing the ${purchasedPackage.name} subscription package. Your payment is currently being processed.`;
      ctaText = "You can check the status of your payment in your Transaction History.";
      ctaButtons = `
        <a href="mailto:gullyteam33@gmail.com" class="cta-button" style="background-color: #2563eb;">Contact Support</a>
      `;
    } else {
      headerTitle = "Sports Service Subscription Successfully Activated!";
      headerColor = "linear-gradient(135deg, #16a34a 0%, #22c55e 100%)";
      statusBadgeColor = "#dcfce7";
      statusMessage = `
        <div style="background-color: #dcfce7; border: 1px solid #86efac; border-radius: 6px; padding: 16px; margin: 20px 0;">
          <p style="color: #166534; font-weight: bold; margin: 0 0 10px 0; font-size: 16px;">Payment Successful</p>
          <p style="color: #166534; margin: 0; font-size: 14px;">
            Your payment has been successfully processed and your subscription is now active.
          </p>
        </div>
      `;
      introText = `Great news! Your subscription payment has been successfully processed. You're now ready to connect with sports enthusiasts and grow your coaching business.`;
      ctaText = "Thank you for joining us and trusting Gully Team with your sports service business!";
      ctaButtons = `
        <a href="#" class="cta-button" style="background-color: #16a34a;">🏆 Access Dashboard</a>
        <a href="mailto:gullyteam33@gmail.com" class="cta-button" style="background-color: #2563eb;">Contact Support</a>
      `;
    }

    // Dynamic subject based on payment status
    let subject;
    if (PAYMENT_STATUS === "Failed") {
      subject = `Payment Failed - Action Required for Your Gully Team Sports Service Subscription`;
    } else if (PAYMENT_STATUS === "Pending") {
      subject = `Payment Pending - Your Gully Team Sports Service Subscription`;
    } else {
      subject = `Welcome Back! Your Sports Service Subscription is Active`;
    }

    const mailOptions = {
      from: "gullyteam33@gmail.com",
      to: user.email,
      subject: subject,
      html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sports Service Subscription - Gully Team</title>
  <style>
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
      max-width: 650px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
    }

    .header {
      background: ${headerColor};
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
      color: rgba(255, 255, 255, 0.8);
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
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .details-table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    }

    .details-table td {
      padding: 14px 16px;
      border-bottom: 1px solid #f3f4f6;
      vertical-align: top;
    }

    .details-table tr:nth-child(even) {
      background-color: #f8fafc;
    }

    .details-table tr:nth-child(odd) {
      background-color: #ffffff;
    }

    .details-table tr:last-child td {
      border-bottom: none;
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

    .payment-summary {
      background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
      border: 2px solid #f59e0b;
      border-radius: 12px;
      padding: 25px;
      margin: 30px 0;
    }

    .payment-title {
      font-size: 20px;
      font-weight: bold;
      color: #92400e;
      margin: 0 0 20px 0;
      text-align: center;
    }

    .payment-table {
      width: 100%;
      border-collapse: collapse;
      background: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .payment-table td {
      padding: 12px 16px;
      border-bottom: 1px solid #f3f4f6;
    }

    .payment-table tr:last-child td {
      border-bottom: none;
    }

    .payment-table .payment-label {
      font-weight: 600;
      color: #92400e;
      width: 60%;
      font-size: 14px;
    }

    .payment-table .payment-value {
      color: #92400e;
      font-size: 14px;
      font-weight: 500;
      text-align: right;
    }

    .payment-table .total-row {
      background-color: #92400e;
      color: #ffffff;
      font-weight: bold;
      font-size: 16px;
    }

    .payment-table .total-row .payment-label,
    .payment-table .total-row .payment-value {
      color: #ffffff;
    }

    .transaction-id {
      background-color: ${statusBadgeColor};
      border: 1px solid ${PAYMENT_STATUS === "Failed" ? "#f87171" : PAYMENT_STATUS === "Pending" ? "#fbbf24" : "#86efac"};
      border-radius: 6px;
      padding: 12px 16px;
      margin: 20px 0;
      text-align: center;
    }

    .transaction-id .label {
      font-size: 12px;
      color: ${PAYMENT_STATUS === "Failed" ? "#b91c1c" : PAYMENT_STATUS === "Pending" ? "#92400e" : "#166534"};
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .transaction-id .value {
      font-size: 16px;
      color: ${PAYMENT_STATUS === "Failed" ? "#b91c1c" : PAYMENT_STATUS === "Pending" ? "#92400e" : "#166534"};
      font-weight: bold;
      font-family: 'Courier New', monospace;
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
      margin: 0 10px 10px 0;
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
      
      .payment-table .payment-label {
        width: 50%;
      }
      
      .highlight-section,
      .payment-summary {
        padding: 20px;
      }
      
      .cta-button {
        display: block;
        margin: 10px 0;
      }
    }

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
              <h1>${headerTitle}</h1>
              <p>Gully Team Sports Service Provider</p>
            </div>

            <!-- Content -->
            <div class="content">
              <!-- Welcome Message -->
              <p class="welcome-text">Hello ${individual?.fullName || user.fullName}!</p>
              <p class="intro-text">${introText}</p>

              <!-- Status Message -->
              ${statusMessage}

              <!-- Transaction ID -->
              <div class="transaction-id">
                <div class="label">Transaction ID:</div>
                <div class="value">${TRANSACTION_ID}</div>
              </div>

              <!-- Payment Summary -->
              <div class="payment-summary">
                <h3 class="payment-title">Payment Breakdown</h3>
                <table class="payment-table" role="presentation">
                  <tr>
                    <td class="payment-label">Package Name:</td>
                    <td class="payment-value">${purchasedPackage.name}</td>
                  </tr>
                  <tr>
                    <td class="payment-label">Base Amount:</td>
                    <td class="payment-value">₹${formatCurrency(baseAmount)}</td>
                  </tr>
                  ${convenienceFee > 0 ? `
                  <tr>
                    <td class="payment-label">Convenience Fee (2.5%):</td>
                    <td class="payment-value">₹${formatCurrency(convenienceFee)}</td>
                  </tr>
                  ` : ''}
                  ${processingFee > 0 ? `
                  <tr>
                    <td class="payment-label">Processing Fee:</td>
                    <td class="payment-value">₹${formatCurrency(processingFee)}</td>
                  </tr>
                  ` : ''}
                  <tr>
                    <td class="payment-label">GST (18%):</td>
                    <td class="payment-value">₹${formatCurrency(gstAmount)}</td>
                  </tr>
                  <tr>
                    <td class="payment-label">Payment Method:</td>
                    <td class="payment-value">${paymentMode}</td>
                  </tr>
                  <tr>
                    <td class="payment-label">Payment Status:</td>
                    <td class="payment-value" style="color: ${PAYMENT_STATUS === "Failed" ? "#dc2626" : PAYMENT_STATUS === "Pending" ? "#92400e" : "#16a34a"}; font-weight: bold;">
                      ${PAYMENT_STATUS}
                    </td>
                  </tr>
                  <tr>
                    <td class="payment-label">Receipt Number:</td>
                    <td class="payment-value">${RECEIPT_NUMBER}</td>
                  </tr>
                  <tr class="total-row">
                    <td class="payment-label">Total Amount ${PAYMENT_STATUS === "Failed" ? "Attempted" : PAYMENT_STATUS === "Pending" ? "Processing" : "Paid"}:</td>
                    <td class="payment-value">₹${formatCurrency(totalAmount)}</td>
                  </tr>
                </table>
              </div>
            </div>

            <!-- Footer -->
            <div class="footer">
              <p class="footer-text">
                <strong>© ${new Date().getFullYear()} Nilee Games and Future Technologies Pvt. Ltd.</strong>
              </p>
              <p class="footer-text">
                Support: <a href="mailto:gullyteam33@gmail.com" class="footer-link">gullyteam33@gmail.com</a> | 
                Website: <a href="#" class="footer-link">www.gullyteam.com</a>
              </p>
              <p class="footer-text">
                For payment queries, please include your Transaction ID: <strong>${TRANSACTION_ID}</strong>
              </p>
            </div>
          </div>
        </td>
      </tr>
    </table>
  </div>
</body>
</html>`
    };

    transporter.sendMail(mailOptions, function (error, info) {
      if (error) {
        console.log("Error sending individual subscription email:", error);
      } else {
        console.log("Individual subscription email sent successfully:", info.response);
      }
    });
  },

  async sendVenueSubscriptionMail(user, venue, purchasedPackage, TRANSACTION_ID, RECEIPT_NUMBER, PAYMENT_STATUS, paymentDetails = {}) {
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

    if (!user || !user.email || !purchasedPackage) {
      console.error("Missing or invalid user/purchasedPackage info.");
      return;
    }

    // Use payment details from parameters
    const baseAmount = paymentDetails.baseAmount || 0;
    const convenienceFee = paymentDetails.convenienceFee || 0;
    const processingFee = paymentDetails.processingFee || 0;
    const gstAmount = paymentDetails.gstAmount || 0;
    const totalAmount = paymentDetails.totalAmount || 0;
    const paymentMode = paymentDetails.paymentMode || "Online Payment";

    // Helper function to format currency
    const formatCurrency = (amount) => {
      const num = parseFloat(amount) || 0;
      return num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    // Helper function to format venue facilities
    const formatFacilities = (facilities) => {
      const facilityNames = {
        isWaterAvailable: "Water",
        isParkingAvailable: "Parking",
        isEquipmentProvided: "Equipment",
        isWashroomAvailable: "Washroom",
        isChangingRoomAvailable: "Changing Room",
        isFloodlightAvailable: "Floodlight",
        isSeatingLoungeAvailable: "Seating Lounge",
        isFirstAidAvailable: "First Aid",
        isWalkingTrackAvailable: "Walking Track",
      };

      if (!facilities) return "Basic facilities available";

      const availableFacilities = Object.keys(facilities)
        .filter((key) => facilities[key] === true)
        .map((key) => facilityNames[key])
        .filter(Boolean);

      return availableFacilities.length > 0 ? availableFacilities.join(", ") : "Basic facilities available";
    };

    // Determine status-specific content
    let headerTitle, headerColor, statusBadgeColor, statusMessage, introText, ctaText, ctaButtons;

    if (PAYMENT_STATUS === "Failed") {
      headerTitle = "Payment Failed - Action Required";
      headerColor = "linear-gradient(135deg, #dc2626 0%, #ef4444 100%)";
      statusBadgeColor = "#fee2e2";
      statusMessage = `
        <div style="background-color: #fee2e2; border: 1px solid #f87171; border-radius: 6px; padding: 16px; margin: 20px 0;">
          <p style="color: #b91c1c; font-weight: bold; margin: 0 0 10px 0; font-size: 16px;">Payment Failed</p>
          <p style="color: #b91c1c; margin: 0; font-size: 14px;">
            We were unable to process your payment for the venue subscription package. No charges have been made to your account.
          </p>
        </div>
      `;
      introText = `We regret to inform you that your payment for the ${purchasedPackage.name} venue subscription package could not be processed.`;
      ctaText = "Please retry your payment to activate your venue subscription and start accepting bookings.";
      ctaButtons = `
        <a href="#" class="cta-button" style="background-color: #2563eb;">Retry Payment</a>
        <a href="mailto:gullyteam33@gmail.com" class="cta-button" style="background-color: #059669;">Contact Support</a>
      `;
    } else if (PAYMENT_STATUS === "Pending") {
      headerTitle = "Payment Pending - Verification in Progress";
      headerColor = "linear-gradient(135deg, #eab308 0%, #facc15 100%)";
      statusBadgeColor = "#fef3c7";
      statusMessage = `
        <div style="background-color: #fef3c7; border: 1px solid #fbbf24; border-radius: 6px; padding: 16px; margin: 20px 0;">
          <p style="color: #92400e; font-weight: bold; margin: 0 0 10px 0; font-size: 16px;"> Payment Pending</p>
          <p style="color: #92400e; margin: 0; font-size: 14px;">
            Your payment is being processed. Your venue will be activated once processing is complete.
          </p>
        </div>
      `;
      introText = `Thank you for purchasing the ${purchasedPackage.name} venue subscription package. Your payment is currently being processed.`;
      ctaText = "You can check the status of your payment in your Transaction History.";
      ctaButtons = `
        <a href="mailto:gullyteam33@gmail.com" class="cta-button" style="background-color: #2563eb;">Contact Support</a>
      `;
    } else {
      headerTitle = "Venue Subscription Successfully Activated!";
      headerColor = "linear-gradient(135deg, #2563eb 0%, #06b6d4 100%)";
      statusBadgeColor = "#dcfce7";
      statusMessage = `
        <div style="background-color: #dcfce7; border: 1px solid #86efac; border-radius: 6px; padding: 16px; margin: 20px 0;">
          <p style="color: #166534; font-weight: bold; margin: 0 0 10px 0; font-size: 16px;">Payment Successful</p>
          <p style="color: #166534; margin: 0; font-size: 14px;">
            Your venue is now live and visible to sports enthusiasts looking for booking opportunities.
          </p>
        </div>
      `;
      introText = `Excellent! Your venue subscription payment has been successfully processed. Your venue is now active on our platform and ready to receive bookings.`;
      ctaText = "Thank you for joining us and trusting Gully Team with your venue management!";
      ctaButtons = `
        <a href="#" class="cta-button" style="background-color: #16a34a;">🏟️ Access Dashboard</a>
        <a href="mailto:gullyteam33@gmail.com" class="cta-button" style="background-color: #2563eb;">Contact Support</a>
      `;
    }

    // Dynamic subject based on payment status
    let subject;
    if (PAYMENT_STATUS === "Failed") {
      subject = `Payment Failed - Action Required for Your Gully Team Venue Subscription`;
    } else if (PAYMENT_STATUS === "Pending") {
      subject = `Payment Pending - Your Gully Team Venue Subscription`;
    } else {
      subject = `🏟️ Venue Subscription Activated - Welcome Back to Gully Team!`;
    }

    const mailOptions = {
      from: "gullyteam33@gmail.com",
      to: user.email,
      subject: subject,
      html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Venue Subscription - Gully Team</title>
  <style>
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
      max-width: 650px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
    }

    .header {
      background: ${headerColor};
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
      color: rgba(255, 255, 255, 0.8);
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
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .details-table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    }

    .details-table td {
      padding: 14px 16px;
      border-bottom: 1px solid #f3f4f6;
      vertical-align: top;
    }

    .details-table tr:nth-child(even) {
      background-color: #f8fafc;
    }

    .details-table tr:nth-child(odd) {
      background-color: #ffffff;
    }

    .details-table tr:last-child td {
      border-bottom: none;
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

    .payment-summary {
      background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
      border: 2px solid #0ea5e9;
      border-radius: 12px;
      padding: 25px;
      margin: 30px 0;
    }

    .payment-title {
      font-size: 20px;
      font-weight: bold;
      color: #0c4a6e;
      margin: 0 0 20px 0;
      text-align: center;
    }

    .payment-table {
      width: 100%;
      border-collapse: collapse;
      background: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .payment-table td {
      padding: 12px 16px;
      border-bottom: 1px solid #f3f4f6;
    }

    .payment-table tr:last-child td {
      border-bottom: none;
    }

    .payment-table .payment-label {
      font-weight: 600;
      color: #0c4a6e;
      width: 60%;
      font-size: 14px;
    }

    .payment-table .payment-value {
      color: #0c4a6e;
      font-size: 14px;
      font-weight: 500;
      text-align: right;
    }

    .payment-table .total-row {
      background-color: #0c4a6e;
      color: #ffffff;
      font-weight: bold;
      font-size: 16px;
    }

    .payment-table .total-row .payment-label,
    .payment-table .total-row .payment-value {
      color: #ffffff;
    }

    .transaction-id {
      background-color: ${statusBadgeColor};
      border: 1px solid ${PAYMENT_STATUS === "Failed" ? "#f87171" : PAYMENT_STATUS === "Pending" ? "#fbbf24" : "#86efac"};
      border-radius: 6px;
      padding: 12px 16px;
      margin: 20px 0;
      text-align: center;
    }

    .transaction-id .label {
      font-size: 12px;
      color: ${PAYMENT_STATUS === "Failed" ? "#b91c1c" : PAYMENT_STATUS === "Pending" ? "#92400e" : "#166534"};
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .transaction-id .value {
      font-size: 16px;
      color: ${PAYMENT_STATUS === "Failed" ? "#b91c1c" : PAYMENT_STATUS === "Pending" ? "#92400e" : "#166534"};
      font-weight: bold;
      font-family: 'Courier New', monospace;
    }

    .venue-highlight {
      background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
      border: 2px solid #16a34a;
      border-radius: 12px;
      padding: 25px;
      margin: 30px 0;
      text-align: center;
    }

    .venue-name {
      font-size: 24px;
      font-weight: bold;
      color: #166534;
      margin-bottom: 8px;
    }

    .venue-address {
      color: #166534;
      font-size: 16px;
    }

    .features-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
      margin: 20px 0;
    }

    .feature-card {
      background-color: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 20px;
    }

    .feature-icon {
      font-size: 24px;
      margin-bottom: 12px;
    }

    .feature-title {
      font-weight: bold;
      color: #1f2937;
      margin-bottom: 8px;
    }

    .feature-description {
      color: #6b7280;
      font-size: 14px;
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
      margin: 0 10px 10px 0;
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
      
      .payment-table .payment-label {
        width: 50%;
      }
      
      .payment-summary,
      .venue-highlight {
        padding: 20px;
      }
      
      .cta-button {
        display: block;
        margin: 10px 0;
      }
      
      .features-grid {
        grid-template-columns: 1fr;
      }
    }

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
              <h1>${headerTitle}</h1>
              <p>Gully Team Venue Management</p>
            </div>

            <!-- Content -->
            <div class="content">
              <!-- Welcome Message -->
              <p class="welcome-text">Hello ${user.fullName}! 🏟️</p>
              <p class="intro-text">${introText}</p>

              <!-- Status Message -->
              ${statusMessage}


              <!-- Transaction ID -->
              <div class="transaction-id">
                <div class="label">Transaction ID:</div>
                <div class="value">${TRANSACTION_ID}</div>
              </div>

              <!-- Payment Summary -->
              <div class="payment-summary">
                <h3 class="payment-title">Payment Summary</h3>
                <table class="payment-table" role="presentation">
                  <tr>
                    <td class="payment-label">Package: ${purchasedPackage.name}</td>
                    <td class="payment-value">₹${formatCurrency(baseAmount)}</td>
                  </tr>
                  ${convenienceFee > 0 ? `
                  <tr>
                    <td class="payment-label">Convenience Fee (2.5%):</td>
                    <td class="payment-value">₹${formatCurrency(convenienceFee)}</td>
                  </tr>
                  ` : ''}
                  ${processingFee > 0 ? `
                  <tr>
                    <td class="payment-label">Processing Fee:</td>
                    <td class="payment-value">₹${formatCurrency(processingFee)}</td>
                  </tr>
                  ` : ''}
                  <tr>
                    <td class="payment-label">GST (18%):</td>
                    <td class="payment-value">₹${formatCurrency(gstAmount)}</td>
                  </tr>
                  <tr>
                    <td class="payment-label">Payment Method:</td>
                    <td class="payment-value">${paymentMode}</td>
                  </tr>
                  <tr>
                    <td class="payment-label">Payment Status:</td>
                    <td class="payment-value" style="color: ${PAYMENT_STATUS === "Failed" ? "#dc2626" : PAYMENT_STATUS === "Pending" ? "#92400e" : "#16a34a"}; font-weight: bold;">
                      ${PAYMENT_STATUS}
                    </td>
                  </tr>
                  <tr>
                    <td class="payment-label">Receipt Number:</td>
                    <td class="payment-value">${RECEIPT_NUMBER}</td>
                  </tr>
                  <tr class="total-row">
                    <td class="payment-label">Total Amount ${PAYMENT_STATUS === "Failed" ? "Attempted" : PAYMENT_STATUS === "Pending" ? "Processing" : "Paid"}:</td>
                    <td class="payment-value">₹${formatCurrency(totalAmount)}</td>
                  </tr>
                </table>
              </div>


           

            <!-- Footer -->
            <div class="footer">
              <p class="footer-text">
                <strong>© ${new Date().getFullYear()} Nilee Games and Future Technologies Pvt. Ltd.</strong>
              </p>
              <p class="footer-text">
                Support: <a href="mailto:gullyteam33@gmail.com" class="footer-link">gullyteam33@gmail.com</a> | 
                Website: <a href="#" class="footer-link">www.gullyteam.com</a>
              </p>
              <p class="footer-text">
                For payment queries, please include your Transaction ID: <strong>${TRANSACTION_ID}</strong>
              </p>
            </div>
          </div>
        </td>
      </tr>
    </table>
  </div>
</body>
</html>`
    };

    transporter.sendMail(mailOptions, function (error, info) {
      if (error) {
        console.log("Error sending venue subscription email:", error);
      } else {
        console.log("Venue subscription email sent successfully:", info.response);
      }
    });
  },

  /**
 * @function createIndividualOrder
 * @description
 * Creates a Razorpay order for an individual service provider subscription or package purchase.  
 * This function handles payment initiation, order and payment record creation, and triggers a 
 * confirmation or failure email asynchronously after order creation.
 *
 * @param {Object} data - The payload containing payment and individual subscription details.
 * @param {String} [data.individualId] - The ID of the individual linked to this order (optional).
 * @param {String} data.PackageId - The ID of the package being purchased by the individual.
 * @param {Number} data.amount - Total payable amount (in INR).
 * @param {Number} data.baseAmount - Base package amount before fees and taxes.
 * @param {Number} data.processingFee - Transaction or platform processing fee.
 * @param {Number} data.convenienceFee - Additional convenience charge.
 * @param {Number} data.gstamount - GST amount applied to the transaction.
 * @param {Number} data.totalAmount - Final total payable amount after all charges.
 * @param {String} [data.status="Pending"] - Payment status at the time of order creation.
 * @param {String} [data.paymentMode="Card"] - Payment mode used (e.g., "Card", "UPI", "NetBanking").
 * @param {String} [data.razorpay_paymentId] - Razorpay payment identifier, if available.
 * @param {Object} [data.individualData] - Temporary individual data from frontend (used if payment fails).
 *
 * @returns {Promise<Object>} Returns an object containing the Razorpay order and a success message.
 *
 * @throws {Error} Throws if:
 * - The associated Individual, User, or Package cannot be found.
 * - Razorpay order creation fails.
 * - Order or payment records cannot be saved.
 *
 * @notes
 * - Uses `global.user` for identifying the currently authenticated user.
 * - Records all order details in `OrderHistory` and `Payment` collections for traceability.
 * - Sends an email notification asynchronously via `sendIndividualpaymentMail()`:
 *   - If `individualId` is provided, sends a subscription success email.
 *   - If payment fails and `individualData` exists, sends a failed payment email.
 * - Adds a 10-second delay before sending the email to avoid blocking the main request cycle.
 */

  async createIndividualOrder(data) {
    try {
      const userInfo = global.user
      const receipt = crypto.randomBytes(10).toString("hex")
      const paymentData = {
        amount: data.amount * 100,
        currency: "INR",
        receipt: `order_receipt_${receipt}`,
        payment_capture: 1,
      }
      const result = await RazorpayHandler.createOrder(paymentData)

      let individual = null
      if (data.individualId) {
        individual = await Individual.findById(data.individualId)
        if (!individual) throw CustomErrorHandler.notFound("Individual Not Found")
      }

      const user = individual ? await User.findById(individual.userId) : await User.findById(userInfo.userId)
      if (!user) throw CustomErrorHandler.notFound("User Not Found")

      const purchasedPackage = await Package.findById(data.PackageId)
      if (!purchasedPackage) throw CustomErrorHandler.notFound("Package Not Found")


      const orderHistoryData = {
        orderId: result.id,
        userId: userInfo.userId,
        razorpay_paymentId: data.razorpay_paymentId,
        PackageId: data.PackageId,
        baseAmount: data.baseAmount,
        processingFee: data.processingFee,
        convenienceFee: data.convenienceFee,
        gstamount: data.gstamount,
        totalAmount: data.totalAmount,
        currency: result.currency,
        receipt: result.receipt,
        status: data.status || "Pending",
        ordertype: "individual",
      }

      if (data.individualId) {
        orderHistoryData.individualId = data.individualId
      }

      const orderHistory = new OrderHistory(orderHistoryData)
      await orderHistory.save()

      const paymentDataObj = {
        orderId: result.id,
        userId: userInfo.userId,
        razorpay_paymentId: data.razorpay_paymentId,
        PackageId: data.PackageId,
        baseAmount: data.baseAmount,
        processingFee: data.processingFee,
        convenienceFee: data.convenienceFee,
        gstamount: data.gstamount,
        totalAmount: data.totalAmount,
        paymentfor: "individual",
        paymentStatus: data.status || "Pending",
        paymentMode: data.paymentMode || "Card",
        transactionId: result.id,
      }

      if (data.individualId) {
        paymentDataObj.individualId = data.individualId
      }

      const payment = new Payment(paymentDataObj)
      await payment.save()

      if (individual) {
        setTimeout(async () => {
          console.log("Sending email after 10 seconds...")
          await this.sendIndividualpaymentMail(
            "individual-subscription",
            user,
            individual,
            purchasedPackage,
            result.id,
            orderHistory.receipt,
            data.status,
            data.baseAmount,
            data.processingFee,
            data.convenienceFee,
            data.gstamount,
            data.totalAmount,
          )
        }, 10000)
      } else if (data.status === "Failed" && data.individualData) {
        setTimeout(async () => {
          console.log("Sending failed payment email...")
          await this.sendIndividualpaymentMail(
            "individual-subscription",
            user,
            null,
            purchasedPackage,
            result.id,
            orderHistory.receipt,
            data.status,
            data.baseAmount,
            data.processingFee,
            data.convenienceFee,
            data.gstamount,
            data.totalAmount,
            data.individualData, // Pass individual data from frontend
          )
        }, 10000)
      }

      return {
        order: result,
        message: "Individual Service Provider Order created successfully. Payment is pending.",
      }
    } catch (error) {
      console.log(`The error is :${error}`)
    }
  },
  async sendIndividualpaymentMail(
    userFor = "",
    user,
    individual,
    purchasedPackage,
    TRANSACTION_ID,
    RECEIPT_NUMBER,
    PAYMENT_STATUS,
    baseAmount,
    processingFee,
    convenienceFee,
    gstAmount,
    totalAmount,
    individualDataFromFrontend = null,
  ) {
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      requireTLS: true,
      auth: {
        user: "gullyteam33@gmail.com",
        pass: "iaur qnaj ocsq jyvq",
      },
    })

    if (!user || !user.email || !purchasedPackage || typeof purchasedPackage.price !== "number") {
      console.error("Missing or invalid user/purchasedPackage info.")
      return
    }

    // Use individual from DB if available, otherwise use data from frontend
    const individualData = individual || individualDataFromFrontend

    if (!individualData) {
      console.error("No individual data available for email")
      return
    }

    // Price breakdown - use passed parameters instead of calculating
    const baseAmountFormatted = baseAmount.toFixed(2)
    const gstAmountFormatted = gstAmount.toFixed(2)
    const totalAmountFormatted = totalAmount.toFixed(2)
    const convenienceFeeFormatted = convenienceFee.toFixed(2)
    const processingFeeFormatted = processingFee.toFixed(2)

    // Determine status-specific content
    let headerTitle, headerColor, statusBadgeColor, statusMessage, introText, ctaText, ctaButtons

    // Set content based on payment status
    if (PAYMENT_STATUS === "Failed") {
      headerTitle = "Payment Failed - Action Required"
      headerColor = "linear-gradient(135deg, #dc2626 0%, #ef4444 100%)"
      statusBadgeColor = "#fee2e2"
      statusMessage = `
      <div style="background-color: #fee2e2; border: 1px solid #f87171; border-radius: 6px; padding: 16px; margin: 20px 0;">
        <p style="color: #b91c1c; font-weight: bold; margin: 0 0 10px 0; font-size: 16px;">Payment Failed</p>
        <p style="color: #b91c1c; margin: 0; font-size: 14px;">
          We were unable to process your payment for the sports service provider subscription. Please check your payment details and try again.
        </p>
      </div>
    `
      introText = `
      We regret to inform you that your payment for the ${purchasedPackage.name} subscription package could not be processed. 
      This could be due to insufficient funds, expired card details, or a temporary issue with the payment gateway.
    `
      ctaText = "Please retry your payment to activate your subscription and start offering your sports services."
      ctaButtons = `
      <a href="mailto:gullyteam33@gmail.com" class="cta-button" style="background-color: #2563eb;">
        Contact Support
      </a>
    `
    } else if (PAYMENT_STATUS === "Pending") {
      headerTitle = "Payment Pending - Verification in Progress"
      headerColor = "linear-gradient(135deg, #eab308 0%, #facc15 100%)"
      statusBadgeColor = "#fef3c7"
      statusMessage = `
      <div style="background-color: #fef3c7; border: 1px solid #fbbf24; border-radius: 6px; padding: 16px; margin: 20px 0;">
        <p style="color: #92400e; font-weight: bold; margin: 0 0 10px 0; font-size: 16px;">Payment Pending</p>
        <p style="color: #92400e; margin: 0; font-size: 14px;">
          Your payment is being processed. This usually takes a few minutes, but may take up to 24 hours in some cases.
        </p>
      </div>
    `
      introText = `
      Thank you for purchasing the ${purchasedPackage.name} subscription package. Your payment is currently being processed.
      You will receive a confirmation email once the payment is successfully verified.
    `
      ctaText = "You can check the status of your payment in your Transaction History."
      ctaButtons = `
      <a href="mailto:gullyteam33@gmail.com" class="cta-button" style="background-color: #2563eb;">
        Contact Support
      </a>
    `
    } else {
      // Success or any other status
      headerTitle = "Sports Service Provider Subscription Activated"
      headerColor = "linear-gradient(135deg, #2563eb 0%, #06b6d4 100%)"
      statusBadgeColor = "#fef3c7"
      statusMessage = `
      <div style="background-color: #dcfce7; border: 1px solid #86efac; border-radius: 6px; padding: 16px; margin: 20px 0;">
        <p style="color: #166534; font-weight: bold; margin: 0 0 10px 0; font-size: 16px;">Payment Successful</p>
        <p style="color: #166534; margin: 0; font-size: 14px;">
          Your payment has been successfully processed and your subscription is now active.
        </p>
      </div>
    `
      introText = `
      We are pleased to confirm that your subscription payment has been successfully processed. Thank you for choosing Gully Team —
      We're excited to have you onboard and look forward to helping you connect with sports enthusiasts seeking your expertise.
    `
      ctaText =
        "Thank you for joining us and trusting Gully Team with your sports service business. We look forward to helping you share your expertise with enthusiasts!"
      ctaButtons = `
      <a href="mailto:gullyteam33@gmail.com" class="cta-button" style="background-color: #2563eb;">
        Contact Support
      </a>
    `
    }

    // Dynamic title & subject based on payment status
    let subject
    if (PAYMENT_STATUS === "Failed") {
      subject = "Payment Failed - Action Required for Your Gully Team Sports Service Subscription"
    } else if (PAYMENT_STATUS === "Pending") {
      subject = "Payment Pending - Your Gully Team Sports Service Subscription"
    } else {
      subject = "Payment Confirmation – Gully Team Sports Service Subscription"
    }

    // Helper function to format service options
    const formatServiceOptions = (options) => {
      const services = []
      if (options.providesOneOnOne) services.push("One-on-One Training")
      if (options.providesTeamService) services.push("Team Training")
      if (options.providesOnlineService) services.push("Online Sessions")
      return services.length > 0 ? services.join(", ") : "Not specified"
    }

    // Helper function to format education
    const formatEducation = (education) => {
      if (!education || education.length === 0) return "Not provided"
      return education
        .map(
          (edu) => `${edu.degree} from ${edu.institution} (${edu.year})${edu.description ? `: ${edu.description}` : ""}`,
        )
        .join("<br>")
    }

    // Helper function to format experience
    const formatExperience = (experience) => {
      if (!experience || experience.length === 0) return "Not provided"
      return experience
        .map(
          (exp) =>
            `${exp.title} at ${exp.organization} (${exp.duration})${exp.description ? `: ${exp.description}` : ""}`,
        )
        .join("<br>")
    }

    // Helper function to format certificates
    const formatCertificates = (certificates) => {
      if (!certificates || certificates.length === 0) return "Not provided"
      return certificates
        .map((cert) => {
          const issueDate = cert.issueDate
            ? new Date(cert.issueDate).toLocaleDateString("en-US", { year: "numeric", month: "long" })
            : "N/A"
          return `${cert.name} issued by ${cert.issuedBy} (${issueDate})`
        })
        .join("<br>")
    }

    const mailOptions = {
      from: "gullyteam33@gmail.com",
      to: user.email,
      subject: subject,
      html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Status – Gully Team Sports Service</title>
  <style>
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
      max-width: 650px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
    }

    .header {
      background: ${headerColor};
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
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .section-icon {
      font-size: 20px;
    }

    .details-table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    }

    .details-table td {
      padding: 14px 16px;
      border-bottom: 1px solid #f3f4f6;
      vertical-align: top;
    }

    .details-table tr:nth-child(even) {
      background-color: #f8fafc;
    }

    .details-table tr:nth-child(odd) {
      background-color: #ffffff;
    }

    .details-table tr:last-child td {
      border-bottom: none;
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

    /* Payment Summary Styles */
    .payment-summary {
      background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
      border: 2px solid #0ea5e9;
      border-radius: 12px;
      padding: 25px;
      margin: 30px 0;
    }

    .payment-title {
      font-size: 20px;
      font-weight: bold;
      color: #0c4a6e;
      margin: 0 0 20px 0;
      text-align: center;
    }

    .payment-table {
      width: 100%;
      border-collapse: collapse;
      background: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .payment-table td {
      padding: 14px 18px;
      border-bottom: 1px solid #e2e8f0;
    }

    .payment-table tr:last-child td {
      border-bottom: none;
    }

    .payment-table .payment-label {
      font-weight: 600;
      color: #1e40af;
      width: 45%;
      font-size: 15px;
    }

    .payment-table .payment-value {
      color: #374151;
      font-size: 15px;
      font-weight: 500;
    }

    .payment-table .status-${PAYMENT_STATUS.toLowerCase()} {
      color: ${PAYMENT_STATUS === "Failed" ? "#dc2626" : PAYMENT_STATUS === "Pending" ? "#92400e" : "#16a34a"};
      font-weight: bold;
    }

    .payment-table .total-row {
      background-color: #1e40af;
      color: #ffffff;
      font-weight: bold;
      font-size: 16px;
    }

    .payment-table .total-row .payment-label,
    .payment-table .total-row .payment-value {
      color: #ffffff;
    }

    .transaction-id {
      background-color: ${statusBadgeColor};
      border: 1px solid #f59e0b;
      border-radius: 6px;
      padding: 12px 16px;
      margin: 20px 0;
      text-align: center;
    }

    .transaction-id .label {
      font-size: 12px;
      color: #92400e;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .transaction-id .value {
      font-size: 16px;
      color: #92400e;
      font-weight: bold;
      font-family: 'Courier New', monospace;
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
      margin: 0 10px 10px 0;
    }

    .cta-button.secondary {
      background-color: #059669;
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
      
      .payment-table .payment-label {
        width: 50%;
      }
      
      .highlight-section,
      .info-section,
      .payment-summary {
        padding: 20px;
      }
      
      .cta-button {
        display: block;
        margin: 10px 0;
      }
    }

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
              <h1>${headerTitle}</h1>
              <p>Gully Team Sports Service Provider</p>
            </div>

            <!-- Content -->
            <div class="content">
              <!-- Welcome Message -->
              <p class="welcome-text">Hello ${individualData.fullName || user.fullName}!</p>
              <p class="intro-text">${introText}</p>

              <!-- Status Message -->
              ${statusMessage}

              <div class="transaction-id">
                <div class="label">Transaction ID:</div>
                <div class="value">${TRANSACTION_ID}</div>
              </div>

              <div class="payment-summary">
                <h3 class="payment-title">Payment Summary</h3>
                <table class="payment-table" role="presentation">
                  <tr>
                    <td class="payment-label">Package Name:</td>
                    <td class="payment-value">${purchasedPackage.name}</td>
                  </tr>
                  <tr>
                    <td class="payment-label">Base Amount:</td>
                    <td class="payment-value">₹${baseAmountFormatted}</td>
                  </tr>
                  <tr>
                    <td class="payment-label">Convenience Fee:</td>
                    <td class="payment-value">₹${convenienceFeeFormatted}</td>
                  </tr>
                  <tr>
                    <td class="payment-label">Processing Fee:</td>
                    <td class="payment-value">₹${processingFeeFormatted}</td>
                  </tr>
                  <tr>
                    <td class="payment-label">GST (18%):</td>
                    <td class="payment-value">₹${gstAmountFormatted}</td>
                  </tr>
                  <tr>
                    <td class="payment-label">Payment Status:</td>
                    <td class="payment-value status-${PAYMENT_STATUS.toLowerCase()}">${PAYMENT_STATUS}</td>
                  </tr>
                  <tr>
                    <td class="payment-label">Receipt Number:</td>
                    <td class="payment-value">${RECEIPT_NUMBER}</td>
                  </tr>
                  <tr class="total-row">
                    <td class="payment-label">Total Amount:</td>
                    <td class="payment-value">₹${totalAmountFormatted}</td>
                  </tr>
                </table>
              </div>

              <h3 class="section-title">
                Personal Information
              </h3>
              <table class="details-table" role="presentation">
                <tr>
                  <td class="label">Full Name:</td>
                  <td class="value">${individualData.fullName || "N/A"}</td>
                </tr>
                <tr>
                  <td class="label">Email:</td>
                  <td class="value">${individualData.email || user.email}</td>
                </tr>
                <tr>
                  <td class="label">Phone Number:</td>
                  <td class="value">${individualData.phoneNumber || "N/A"}</td>
                </tr>
                <tr>
                  <td class="label">PAN Number:</td>
                  <td class="value">${individualData.panNumber || "N/A"}</td>
                </tr>
                <tr>
                  <td class="label">Years of Experience:</td>
                  <td class="value">${individualData.yearOfExperience || 0} years</td>
                </tr>
              </table>

              <!-- Service Information -->
              <h3 class="section-title">
                Service Information
              </h3>
              <table class="details-table" role="presentation">
                <tr>
                  <td class="label">Sports Categories:</td>
                  <td class="value">${individualData.sportsCategories ? individualData.sportsCategories.join(", ") : "Not specified"}</td>
                </tr>
                <tr>
                  <td class="label">Service Types:</td>
                  <td class="value">${individualData.selectedServiceTypes ? individualData.selectedServiceTypes.join(", ") : "Not specified"}</td>
                </tr>
                <tr>
                  <td class="label">Service Options:</td>
                  <td class="value">${individualData.serviceOptions ? formatServiceOptions(individualData.serviceOptions) : "Not specified"}</td>
                </tr>
                <tr>
                  <td class="label">Available Days:</td>
                  <td class="value">${individualData.availableDays ? individualData.availableDays.join(", ") : "Not specified"}</td>
                </tr>
                <tr>
                  <td class="label">Age Groups Supported:</td>
                  <td class="value">${individualData.supportedAgeGroups ? individualData.supportedAgeGroups.join(", ") : "Not specified"}</td>
                </tr>
              </table>

              <!-- Qualifications -->
              ${individualData.education || individualData.experience || individualData.certificates
          ? `
              <h3 class="section-title">
                Qualifications & Experience
              </h3>
              <table class="details-table" role="presentation">
                ${individualData.education
            ? `
                <tr>
                  <td class="label">Education:</td>
                  <td class="value">${formatEducation(individualData.education)}</td>
                </tr>
                `
            : ""
          }
                ${individualData.experience
            ? `
                <tr>
                  <td class="label">Experience:</td>
                  <td class="value">${formatExperience(individualData.experience)}</td>
                </tr>
                `
            : ""
          }
                ${individualData.certificates
            ? `
                <tr>
                  <td class="label">Certificates:</td>
                  <td class="value">${formatCertificates(individualData.certificates)}</td>
                </tr>
                `
            : ""
          }
              </table>
              `
          : ""
        }

              <!-- Bio -->
              ${individualData.bio
          ? `
              <h3 class="section-title">
                Professional Bio
              </h3>
              <table class="details-table" role="presentation">
                <tr>
                  <td class="value" colspan="2">${individualData.bio}</td>
                </tr>
              </table>
              `
          : ""
        }

              ${PAYMENT_STATUS !== "Failed"
          ? `
              <!-- Getting Started -->
              <div class="highlight-section">
                <h3 class="highlight-title">Start with the basics:</h3>
                <ul class="task-list">
                  <li class="task-item">
                    <span class="checkmark">✓</span>
                    Log into your dashboard and review your profile
                  </li>
                  <li class="task-item">
                    <span class="checkmark">✓</span>
                    Upload high-quality images showcasing your coaching/training
                  </li>
                  <li class="task-item">
                    <span class="checkmark">✓</span>
                    Set your availability schedule for bookings
                  </li>
                  <li class="task-item">
                    <span class="checkmark">✓</span>
                    Add any additional certifications or qualifications
                  </li>
                  <li class="task-item">
                    <span class="checkmark">✓</span>
                    Respond to booking requests from sports enthusiasts
                  </li>
                  <li class="task-item">
                    <span class="checkmark">✓</span>
                    Manage your calendar and client communications
                  </li>
                </ul>
              </div>
              `
          : ""
        }

              <!-- Info Section -->
              <div class="info-section">
                <h3 class="info-title">${PAYMENT_STATUS === "Failed" ? "Payment Failed - What to Do Next" : "What's Included in Your Service Provider Subscription"}</h3>
                <p class="info-text">
                  ${PAYMENT_STATUS === "Failed"
          ? `
                    Your payment could not be processed. This might be due to:
                    <br><br>
                    • Insufficient funds in your account<br>
                    • Incorrect card details<br>
                    • Bank declined the transaction<br>
                    • Temporary issue with the payment gateway
                    <br><br>
                    Please try again with a different payment method or contact your bank for more information.
                  `
          : `
                    Your service provider subscription gives you access to powerful tools to manage your sports services and connect with enthusiasts. This includes:
                    <br><br>
                    • <strong>Profile Listing:</strong> Showcase your expertise and services on our platform<br>
                    • <strong>Multi-Sport Services:</strong> Offer training in multiple sports categories<br>
                    • <strong>Booking Management:</strong> Accept and manage service bookings from clients<br>
                    • <strong>Flexible Service Options:</strong> Offer one-on-one, team, and online training<br>
                    • <strong>Calendar Management:</strong> Manage your availability and schedule efficiently<br>
                    • <strong>Client Communication:</strong> Direct communication with your clients<br>
                    • <strong>Performance Analytics:</strong> Track your bookings and client feedback
                    <br><br>
                    Log in to your Gully Team dashboard to start accepting bookings and connecting with sports enthusiasts in your area.
                  `
        }
                </p>
              </div>

              <!-- Call to Action -->
              <div class="cta-section">
                <p class="cta-text">
                  ${ctaText}
                </p>
                ${ctaButtons}
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
              <p class="footer-text">
                For payment queries, please include your Transaction ID: <strong>${TRANSACTION_ID}</strong>
              </p>
            </div>
          </div>
        </td>
      </tr>
    </table>
  </div>
</body>
</html>`,
    }

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log("Error sending email:", error)
      } else {
        console.log("Individual subscription email sent:", info.response)
      }
    })
  },


  async sendVenueExpirationReminder(venue, user, packageDetails, expirationDate, daysUntilExpiration) {
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      requireTLS: true,
      auth: {
        user: "gullyteam33@gmail.com",
        pass: "iaur qnaj ocsq jyvq",
      },
    })

    // Format expiration date
    const formattedExpirationDate = new Date(expirationDate).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })

    // Determine urgency level and styling
    let urgencyLevel, headerColor, urgencyMessage, urgencyBadgeColor

    if (daysUntilExpiration <= 3) {
      urgencyLevel = "critical"
      headerColor = "linear-gradient(135deg, #dc2626 0%, #ef4444 100%)"
      urgencyBadgeColor = "#fee2e2"
      urgencyMessage = `
          <div style="background-color: #fee2e2; border: 1px solid #f87171; border-radius: 6px; padding: 16px; margin: 20px 0;">
            <p style="color: #b91c1c; font-weight: bold; margin: 0 0 10px 0; font-size: 16px;">Critical: Package Expires in ${daysUntilExpiration} day${daysUntilExpiration === 1 ? "" : "s"}!</p>
            <p style="color: #b91c1c; margin: 0; font-size: 14px;">
              Your venue will be removed from our platform if not renewed immediately.
            </p>
          </div>
        `
    } else if (daysUntilExpiration <= 7) {
      urgencyLevel = "warning"
      headerColor = "linear-gradient(135deg, #eab308 0%, #facc15 100%)"
      urgencyBadgeColor = "#fef3c7"
      urgencyMessage = `
          <div style="background-color: #fef3c7; border: 1px solid #fbbf24; border-radius: 6px; padding: 16px; margin: 20px 0;">
            <p style="color: #92400e; font-weight: bold; margin: 0 0 10px 0; font-size: 16px;">Package Expires in ${daysUntilExpiration} days</p>
            <p style="color: #92400e; margin: 0; font-size: 14px;">
              Don't let your venue go offline. Renew now to continue receiving bookings.
            </p>
          </div>
        `
    } else {
      urgencyLevel = "reminder"
      headerColor = "linear-gradient(135deg, #2563eb 0%, #06b6d4 100%)"
      urgencyBadgeColor = "#dbeafe"
      urgencyMessage = `
          <div style="background-color: #dbeafe; border: 1px solid #93c5fd; border-radius: 6px; padding: 16px; margin: 20px 0;">
            <p style="color: #1e40af; font-weight: bold; margin: 0 0 10px 0; font-size: 16px;">Package Expires in ${daysUntilExpiration} days</p>
            <p style="color: #1e40af; margin: 0; font-size: 14px;">
              Plan ahead and renew your package to avoid any interruption in service.
            </p>
          </div>
        `
    }

    const subject =
      daysUntilExpiration <= 3
        ? `URGENT: Your Venue Package Expires in ${daysUntilExpiration} Day${daysUntilExpiration === 1 ? "" : "s"}!`
        : `Reminder: Your Venue Package Expires in ${daysUntilExpiration} Days`

    const mailOptions = {
      from: "gullyteam33@gmail.com",
      to: user.email,
      subject: subject,
      html: `<!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Package Expiration Reminder – Gully Team</title>
    <style>
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
        background: ${headerColor};
        padding: 40px 30px;
        text-align: center;
      }

      .header h1 {
        margin: 0;
        color: #ffffff;
        font-size: 26px;
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

      .package-info {
        background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
        border: 2px solid #0ea5e9;
        border-radius: 12px;
        padding: 25px;
        margin: 30px 0;
      }

      .package-title {
        font-size: 18px;
        font-weight: bold;
        color: #0c4a6e;
        margin: 0 0 15px 0;
      }

      .package-details {
        color: #0c4a6e;
        font-size: 15px;
        line-height: 1.6;
        margin: 0;
      }

      .expiration-info {
        background-color: ${urgencyBadgeColor};
        border: 2px solid ${urgencyLevel === "critical" ? "#f87171" : urgencyLevel === "warning" ? "#fbbf24" : "#93c5fd"};
        border-radius: 8px;
        padding: 20px;
        margin: 25px 0;
        text-align: center;
      }

      .expiration-date {
        font-size: 24px;
        font-weight: bold;
        color: ${urgencyLevel === "critical" ? "#b91c1c" : urgencyLevel === "warning" ? "#92400e" : "#1e40af"};
        margin: 0 0 10px 0;
      }

      .expiration-label {
        font-size: 14px;
        color: ${urgencyLevel === "critical" ? "#b91c1c" : urgencyLevel === "warning" ? "#92400e" : "#1e40af"};
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .warning-section {
        background-color: #fef2f2;
        border: 1px solid #fecaca;
        border-radius: 8px;
        padding: 20px;
        margin: 25px 0;
      }

      .warning-title {
        font-size: 16px;
        font-weight: bold;
        color: #dc2626;
        margin: 0 0 10px 0;
      }

      .warning-text {
        color: #dc2626;
        font-size: 14px;
        line-height: 1.5;
        margin: 0;
      }

      .cta-section {
        text-align: center;
        margin: 35px 0;
      }

      .cta-button {
        display: inline-block;
        padding: 16px 32px;
        background-color: #2563eb;
        color: #ffffff !important;
        text-decoration: none;
        border-radius: 8px;
        font-weight: bold;
        font-size: 16px;
        line-height: 1;
        transition: background-color 0.3s ease;
      }

      .cta-button:hover {
        background-color: #1d4ed8;
      }

      .cta-button.urgent {
        background-color: #dc2626;
        animation: pulse 2s infinite;
      }

      .cta-button.urgent:hover {
        background-color: #b91c1c;
      }

      @keyframes pulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.05); }
        100% { transform: scale(1); }
      }

      .footer {
        background-color: #f9fafb;
        padding: 25px 30px;
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
          font-size: 22px;
        }

        .content {
          padding: 30px 20px;
        }

        .package-info,
        .warning-section {
          padding: 20px;
        }

        .cta-button {
          display: block;
          margin: 15px 0;
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
                <h1>Package Expiration Reminder</h1>
                <p>Gully Team Venue Subscription</p>
              </div>

              <!-- Content -->
              <div class="content">
                <!-- Welcome Message -->
                <p class="welcome-text">Hello ${user.fullName}! 🏟️</p>
                <p class="intro-text">
                  We hope your venue <strong>${venue.venue_name}</strong> has been successfully attracting sports enthusiasts through our platform. 
                  We're writing to remind you that your current subscription package is approaching its expiration date.
                </p>

                <!-- Urgency Message -->
                ${urgencyMessage}

                <!-- Package Information -->
                <div class="package-info">
                  <h3 class="package-title">Current Package: ${packageDetails.name}</h3>
                  <div class="package-details">
                    <strong>Package Features:</strong><br>
                    • Venue listing on Gully Team platform<br>
                    • Multi-sport booking management<br>
                    • Payment processing integration<br>
                    • Customer booking notifications<br>
                    • Basic venue analytics<br>
                    ${packageDetails.description ? `<br><strong>Additional Benefits:</strong> ${packageDetails.description}` : ""}
                  </div>
                </div>

                <!-- Expiration Date -->
                <div class="expiration-info">
                  <div class="expiration-date">${formattedExpirationDate}</div>
                  <div class="expiration-label">Package Expiration Date</div>
                </div>

                <!-- Warning Section -->
                <div class="warning-section">
                  <h3 class="warning-title">Important Notice</h3>
                  <p class="warning-text">
                    <strong>If your package is not renewed, your venue will no longer be visible on our platform.</strong>
                    This means you will stop receiving new bookings and your venue listing will be deactivated until renewal.
                  </p>
                </div>

                <!-- Call to Action -->
                <div class="cta-section">
                  <a href="mailto:gullyteam33@gmail.com?subject=Package Renewal Request - ${venue.venue_name}" 
                     class="cta-button ${urgencyLevel === "critical" ? "urgent" : ""}">
                    ${urgencyLevel === "critical" ? "Renew Now - Urgent!" : "Renew Package"}
                  </a>
                </div>

                <p style="text-align: center; color: #6b7280; font-size: 14px; margin-top: 20px;">
                  Questions about renewal? Contact our support team at 
                  <a href="mailto:gullyteam33@gmail.com" style="color: #2563eb;">gullyteam33@gmail.com</a>
                </p>
              </div>

              <!-- Footer -->
              <div class="footer">
                <p class="footer-text">
                  © ${new Date().getFullYear()} Nilee Games and Future Technologies Pvt. Ltd.
                </p>
                <p class="footer-text">
                  Email: <a href="mailto:gullyteam33@gmail.com" class="footer-link">gullyteam33@gmail.com</a>
                </p>
                <p class="footer-text">
                  Thank you for being a valued partner with Gully Team!
                </p>
              </div>
            </div>
          </td>
        </tr>
      </table>
    </div>
  </body>
  </html>`,
    }

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log("Error sending venue expiration reminder:", error)
      } else {
        console.log("Venue expiration reminder sent:", info.response)
      }
    })
  },

  //#region Reminder mail for Individual
  async sendExpirationReminder(individual, user, packageDetails, expirationDate, daysUntilExpiration) {
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      requireTLS: true,
      auth: {
        user: "gullyteam33@gmail.com",
        pass: "iaur qnaj ocsq jyvq",
      },
    })

    // Format expiration date
    const formattedExpirationDate = new Date(expirationDate).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })

    // Determine urgency level and styling
    let urgencyLevel, headerColor, urgencyMessage, urgencyBadgeColor

    if (daysUntilExpiration <= 3) {
      urgencyLevel = "critical"
      headerColor = "linear-gradient(135deg, #dc2626 0%, #ef4444 100%)"
      urgencyBadgeColor = "#fee2e2"
      urgencyMessage = `
        <div style="background-color: #fee2e2; border: 1px solid #f87171; border-radius: 6px; padding: 16px; margin: 20px 0;">
          <p style="color: #b91c1c; font-weight: bold; margin: 0 0 10px 0; font-size: 16px;">Critical: Package Expires in ${daysUntilExpiration} day${daysUntilExpiration === 1 ? "" : "s"}!</p>
          <p style="color: #b91c1c; margin: 0; font-size: 14px;">
            Your profile will be removed from our platform if not renewed immediately.
          </p>
        </div>
      `
    } else if (daysUntilExpiration <= 7) {
      urgencyLevel = "warning"
      headerColor = "linear-gradient(135deg, #eab308 0%, #facc15 100%)"
      urgencyBadgeColor = "#fef3c7"
      urgencyMessage = `
        <div style="background-color: #fef3c7; border: 1px solid #fbbf24; border-radius: 6px; padding: 16px; margin: 20px 0;">
          <p style="color: #92400e; font-weight: bold; margin: 0 0 10px 0; font-size: 16px;">Package Expires in ${daysUntilExpiration} days</p>
          <p style="color: #92400e; margin: 0; font-size: 14px;">
            Don't let your profile go offline. Renew now to continue receiving client bookings.
          </p>
        </div>
      `
    } else {
      urgencyLevel = "reminder"
      headerColor = "linear-gradient(135deg, #2563eb 0%, #06b6d4 100%)"
      urgencyBadgeColor = "#dbeafe"
      urgencyMessage = `
        <div style="background-color: #dbeafe; border: 1px solid #93c5fd; border-radius: 6px; padding: 16px; margin: 20px 0;">
          <p style="color: #1e40af; font-weight: bold; margin: 0 0 10px 0; font-size: 16px;">Package Expires in ${daysUntilExpiration} days</p>
          <p style="color: #1e40af; margin: 0; font-size: 14px;">
            Plan ahead and renew your package to avoid any interruption in service.
          </p>
        </div>
      `
    }

    const subject =
      daysUntilExpiration <= 3
        ? `URGENT: Your Service Provider Package Expires in ${daysUntilExpiration} Day${daysUntilExpiration === 1 ? "" : "s"}!`
        : `Reminder: Your Service Provider Package Expires in ${daysUntilExpiration} Days`

    const mailOptions = {
      from: "gullyteam33@gmail.com",
      to: user.email,
      subject: subject,
      html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Package Expiration Reminder – Gully Team</title>
  <style>
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
      background: ${headerColor};
      padding: 40px 30px;
      text-align: center;
    }
    
    .header h1 {
      margin: 0;
      color: #ffffff;
      font-size: 26px;
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
    
    .package-info {
      background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
      border: 2px solid #0ea5e9;
      border-radius: 12px;
      padding: 25px;
      margin: 30px 0;
    }
    
    .package-title {
      font-size: 18px;
      font-weight: bold;
      color: #0c4a6e;
      margin: 0 0 15px 0;
    }
    
    .package-details {
      color: #0c4a6e;
      font-size: 15px;
      line-height: 1.6;
      margin: 0;
    }
    
    .expiration-info {
      background-color: ${urgencyBadgeColor};
      border: 2px solid ${urgencyLevel === "critical" ? "#f87171" : urgencyLevel === "warning" ? "#fbbf24" : "#93c5fd"};
      border-radius: 8px;
      padding: 20px;
      margin: 25px 0;
      text-align: center;
    }
    
    .expiration-date {
      font-size: 24px;
      font-weight: bold;
      color: ${urgencyLevel === "critical" ? "#b91c1c" : urgencyLevel === "warning" ? "#92400e" : "#1e40af"};
      margin: 0 0 10px 0;
    }
    
    .expiration-label {
      font-size: 14px;
      color: ${urgencyLevel === "critical" ? "#b91c1c" : urgencyLevel === "warning" ? "#92400e" : "#1e40af"};
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .warning-section {
      background-color: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 8px;
      padding: 20px;
      margin: 25px 0;
    }
    
    .warning-title {
      font-size: 16px;
      font-weight: bold;
      color: #dc2626;
      margin: 0 0 10px 0;
    }
    
    .warning-text {
      color: #dc2626;
      font-size: 14px;
      line-height: 1.5;
      margin: 0;
    }
    
    .cta-section {
      text-align: center;
      margin: 35px 0;
    }
    
    .cta-button {
      display: inline-block;
      padding: 16px 32px;
      background-color: #2563eb;
      color: #ffffff !important;
      text-decoration: none;
      border-radius: 8px;
      font-weight: bold;
      font-size: 16px;
      line-height: 1;
      transition: background-color 0.3s ease;
    }
    
    .cta-button:hover {
      background-color: #1d4ed8;
    }
    
    .cta-button.urgent {
      background-color: #dc2626;
      animation: pulse 2s infinite;
    }
    
    .cta-button.urgent:hover {
      background-color: #b91c1c;
    }
    
    @keyframes pulse {
      0% { transform: scale(1); }
      50% { transform: scale(1.05); }
      100% { transform: scale(1); }
    }
    
    .footer {
      background-color: #f9fafb;
      padding: 25px 30px;
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
        font-size: 22px;
      }
      
      .content {
        padding: 30px 20px;
      }
      
      .package-info,
      .warning-section {
        padding: 20px;
      }
      
      .cta-button {
        display: block;
        margin: 15px 0;
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
              <h1>Package Expiration Reminder</h1>
              <p>Gully Team Service Provider</p>
            </div>
            
            <!-- Content -->
            <div class="content">
              <!-- Welcome Message -->
              <p class="welcome-text">Hello ${individual.fullName}!</p>
              <p class="intro-text">
                We hope you've been successfully connecting with sports enthusiasts and growing your coaching business through our platform. 
                We're writing to remind you that your current subscription package is approaching its expiration date.
              </p>

              <!-- Urgency Message -->
              ${urgencyMessage}

              <!-- Package Information -->
              <div class="package-info">
                <h3 class="package-title">Current Package: ${packageDetails.name}</h3>
                <div class="package-details">
                  <strong>Package Features:</strong><br>
                  • Professional profile on Gully Team platform<br>
                  • Client booking management system<br>
                  • Showcase your expertise and certifications<br>
                  • Direct communication with potential clients<br>
                  • Service scheduling and calendar management<br>
                  ${packageDetails.description ? `<br><strong>Additional Benefits:</strong> ${packageDetails.description}` : ""}
                </div>
              </div>

              <!-- Expiration Date -->
              <div class="expiration-info">
                <div class="expiration-date">${formattedExpirationDate}</div>
                <div class="expiration-label">Package Expiration Date</div>
              </div>

              <!-- Warning Section -->
              <div class="warning-section">
                <h3 class="warning-title">Important Notice</h3>
                <p class="warning-text">
                  <strong>If your package is not renewed, your profile will no longer be visible on our platform.</strong>
                  This means potential clients won't be able to find you, and you will stop receiving new booking requests until renewal.
                </p>
              </div>

              <!-- Call to Action -->
              <div class="cta-section">
                <a href="mailto:gullyteam33@gmail.com?subject=Package Renewal Request - ${individual.fullName}" 
                   class="cta-button ${urgencyLevel === "critical" ? "urgent" : ""}">
                  ${urgencyLevel === "critical" ? "Renew Now - Urgent!" : "Renew Package"}
                </a>
              </div>

              <p style="text-align: center; color: #6b7280; font-size: 14px; margin-top: 20px;">
                Questions about renewal? Contact our support team at 
                <a href="mailto:gullyteam33@gmail.com" style="color: #2563eb;">gullyteam33@gmail.com</a>
              </p>
            </div>
            
            <!-- Footer -->
            <div class="footer">
              <p class="footer-text">
                © ${new Date().getFullYear()} Nilee Games and Future Technologies Pvt. Ltd.
              </p>
              <p class="footer-text">
                Email: <a href="mailto:gullyteam33@gmail.com" class="footer-link">gullyteam33@gmail.com</a>
              </p>
              <p class="footer-text">
                Thank you for being a valued partner with Gully Team!
              </p>
            </div>
          </div>
        </td>
      </tr>
    </table>
  </div>
</body>
</html>`,
    }

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log("Error sending individual expiration reminder:", error)
      } else {
        console.log("Individual expiration reminder sent:", info.response)
      }
    })
  },

  //   const VenueExpirationReminderService = require("./venue-expiration-reminder")
  // const IndividualExpirationReminderService = require("./individual-expiration-reminder")
  // const Venue = require("./Venue") // Assuming Venue is a model
  // const Individual = require("./Individual") // Assuming Individual is a model
  // const User = require("./User") // Assuming User is a model
  // const Package = require("./Package") // Assuming Package is a model

  // class ExpirationReminderScheduler {
  //   // Send reminders for venues
  //   async sendVenueExpirationReminders() {
  //     try {
  //       const currentDate = new Date()
  //       const reminderDates = [
  //         new Date(currentDate.getTime() + 30 * 24 * 60 * 60 * 1000), // 30 days
  //         new Date(currentDate.getTime() + 14 * 24 * 60 * 60 * 1000), // 14 days
  //         new Date(currentDate.getTime() + 7 * 24 * 60 * 60 * 1000), // 7 days
  //         new Date(currentDate.getTime() + 3 * 24 * 60 * 60 * 1000), // 3 days
  //         new Date(currentDate.getTime() + 1 * 24 * 60 * 60 * 1000), // 1 day
  //       ]

  //       for (const reminderDate of reminderDates) {
  //         const venues = await Venue.find({
  //           isSubscriptionPurchased: true,
  //           subscriptionExpiry: {
  //             $gte: reminderDate,
  //             $lt: new Date(reminderDate.getTime() + 24 * 60 * 60 * 1000), // Next day
  //           },
  //         }).populate("userId packageRef")

  //         for (const venue of venues) {
  //           if (venue.userId && venue.packageRef) {
  //             const daysUntilExpiration = Math.ceil((venue.subscriptionExpiry - currentDate) / (1000 * 60 * 60 * 24))

  //             await VenueExpirationReminderService.sendExpirationReminder(
  //               venue,
  //               venue.userId,
  //               venue.packageRef,
  //               venue.subscriptionExpiry,
  //               daysUntilExpiration,
  //             )

  //             console.log(`Venue expiration reminder sent to ${venue.userId.email} for ${venue.venue_name}`)
  //           }
  //         }
  //       }
  //     } catch (error) {
  //       console.error("Error sending venue expiration reminders:", error)
  //     }
  //   }

  //   // Send reminders for individuals
  //   async sendIndividualExpirationReminders() {
  //     try {
  //       const currentDate = new Date()
  //       const reminderDates = [
  //         new Date(currentDate.getTime() + 30 * 24 * 60 * 60 * 1000), // 30 days
  //         new Date(currentDate.getTime() + 14 * 24 * 60 * 60 * 1000), // 14 days
  //         new Date(currentDate.getTime() + 7 * 24 * 60 * 60 * 1000), // 7 days
  //         new Date(currentDate.getTime() + 3 * 24 * 60 * 60 * 1000), // 3 days
  //         new Date(currentDate.getTime() + 1 * 24 * 60 * 60 * 1000), // 1 day
  //       ]

  //       for (const reminderDate of reminderDates) {
  //         const individuals = await Individual.find({
  //           hasActiveSubscription: true,
  //           subscriptionExpiry: {
  //             $gte: reminderDate,
  //             $lt: new Date(reminderDate.getTime() + 24 * 60 * 60 * 1000), // Next day
  //           },
  //         }).populate("userId packageRef")

  //         for (const individual of individuals) {
  //           if (individual.userId && individual.packageRef) {
  //             const daysUntilExpiration = Math.ceil((individual.subscriptionExpiry - currentDate) / (1000 * 60 * 60 * 24))

  //             await IndividualExpirationReminderService.sendExpirationReminder(
  //               individual,
  //               individual.userId,
  //               individual.packageRef,
  //               individual.subscriptionExpiry,
  //               daysUntilExpiration,
  //             )

  //             console.log(`Individual expiration reminder sent to ${individual.userId.email} for ${individual.fullName}`)
  //           }
  //         }
  //       }
  //     } catch (error) {
  //       console.error("Error sending individual expiration reminders:", error)
  //     }
  //   }

  //   // Run both reminder services
  //   async sendAllExpirationReminders() {
  //     console.log("Starting expiration reminder process...")
  //     await this.sendVenueExpirationReminders()
  //     await this.sendIndividualExpirationReminders()
  //     console.log("Expiration reminder process completed.")
  //   }
  // }

  // module.exports = new ExpirationReminderScheduler()

  // // Example usage with cron job
  // // const cron = require('node-cron')
  // //
  // // // Run daily at 9:00 AM
  // // cron.schedule('0 9 * * *', () => {
  // //   console.log('Running expiration reminder scheduler...')
  // //   ExpirationReminderScheduler.sendAllExpirationReminders()
  // // })



  async createSponsorOrder(data) {
    const userInfo = global.user;

    const receipt = crypto.randomBytes(10).toString("hex");

    const paymentData = {
      amount: data.amount * 100, // Amount in paise (100 paise = 1 INR)
      currency: "INR",
      receipt: `order_receipt_${receipt}`,
      payment_capture: 1, // Auto capture payment
    };

    const result = await RazorpayHandler.createOrder(paymentData);


    const orderHistory = new OrderHistory({
      orderId: result.id,
      userId: userInfo.userId,
      razorpay_paymentId: data.razorpay_paymentId,
      PackageId: data.PackageId,
      baseAmount: data.baseAmount,
      processingFee: data.processingFee,
      convenienceFee: data.convenienceFee,
      gstamount: data.gstamount,
      totalAmount: data.totalAmount,
      tournamentId: data.tournamentId,
      currency: result.currency,
      receipt: result.receipt,
      status: data.status || "Pending",
      ordertype: "sponsor"
    });

    await orderHistory.save();

    const payment = new Payment({
      orderId: result.id,
      userId: userInfo.userId,
      razorpay_paymentId: data.razorpay_paymentId,
      PackageId: data.PackageId,
      tournamentId: data.tournamentId,
      baseAmount: data.baseAmount,
      processingFee: data.processingFee,
      convenienceFee: data.convenienceFee,
      gstamount: data.gstamount,
      totalAmount: data.totalAmount,
      paymentStatus: data.status || "Pending",
      paymentMode: data.paymentMode || "Card",
      transactionId: result.id,
      paymentfor: "sponsor",
    });

    await payment.save();

    return {
      order: result,
      message: "Banner Order created successfully. Payment is pending.",
    };
  },

  //DG working
  // async updatePayment(data) {
  //   if (data?.payload) {
  //     const paymentEntity = data.payload.payment.entity;
  //     if (paymentEntity?.status === "captured") {
  //       const orderId = paymentEntity.order_id;

  //       const orderHistory = await OrderHistory.findOne({ orderId }); // Find the order by Razorpay orderId
  //       if (orderHistory) {
  //         orderHistory.status = "Successful"; // Update the status to Successful
  //         orderHistory.amountPaid = paymentEntity.amount / 100; // Update amount paid
  //         orderHistory.amountDue = 0; // No amount due after successful payment

  //         await orderHistory.save(); // Save the updated order history

  //         // Find the related tournament and update it
  //         const tournament = await Tournament.findById(orderHistory.tournamentId);

  //         if (tournament) {
  //           tournament.isActive = true; // Mark tournament as active
  //           tournament.payments.push({
  //             paymentid: paymentEntity.id,
  //             amount: paymentEntity.amount / 100,
  //           }); // Add the payment details to the tournament's payments array

  //           await tournament.save(); // Save the updated tournament
  //         }
  //       }
  //     }
  //   }

  //   return "Payment update processed successfully";
  // },

  //DG 
  async updatePayment(data) {
    if (data?.payload) {
      const paymentEntity = data.payload.payment.entity;
      if (paymentEntity) {
        const orderId = paymentEntity.order_id;

        const orderHistory = await OrderHistory.findOne({ orderId });
        const payment = await Payment.findOne({ orderId });

        if (orderHistory && payment) {
          const isCaptured = paymentEntity.status === "captured";

          // Update order history and payment details
          orderHistory.status = isCaptured ? "Successful" : "Failed";
          orderHistory.amountPaid = isCaptured
            ? paymentEntity.amount / 100
            : 0;
          orderHistory.amountDue = isCaptured
            ? 0
            : orderHistory.amount; // Set amountDue to total if failed
          await orderHistory.save();

          payment.paymentStatus = isCaptured ? "Successful" : "Failed";
          payment.amountPaid = isCaptured
            ? paymentEntity.amount / 100
            : 0;
          await payment.save();

          // Update related tournament if payment is successful
          if (isCaptured) {
            const tournament = await Tournament.findById(
              orderHistory.tournamentId
            );

            if (tournament) {
              tournament.isActive = true; // Mark tournament as active
              tournament.payments.push({
                paymentid: payment._id,
                amount: paymentEntity.amount / 100,
              });
              await tournament.save();
            }
          }
        }
      }
    }

    return "Payment update processed successfully";
  },


  //DG
  // async handleRazorpayWebhook(data) {
  //   try {
  //     const payment = data.payload.payment.entity; // Extract payment entity

  //     if (payment && payment.status) {
  //       // Find the associated order using the order_id
  //       const order = await OrderHistory.findOne({ orderId: payment.order_id });

  //       if (!order) {
  //         throw new Error("Order not found");
  //       }

  //       // Update the status based on Razorpay's payment status
  //       order.status = payment.status === "captured" ? "Successful" : "Failed";
  //       order.amountPaid = payment.amount / 100; // Update amount paid in INR
  //       order.amountDue = order.amount - order.amountPaid;

  //       // Save the updated order
  //       await order.save();

  //       return order;
  //     } else {
  //       throw new Error("Invalid Razorpay webhook data");
  //     }
  //   } catch (error) {
  //     console.error("Error handling Razorpay webhook:", error);
  //     throw error;
  //   }
  // },

  //Nikhil
  // async updatePayment(data) {
  //   if (data?.payload) {
  //     if (data?.payload?.payment?.entity?.status == "captured") {
  //       const orderId = data?.payload?.payment?.entity?.order_id;

  //       const orderHistory = await OrderHistory.findOne({ orderId: orderId }); //Nikhil

  //       if (orderHistory) {
  //         orderHistory.status = "captured";
  //       }

  //       const newOrderHistory = await orderHistory.save();

  //       const tournament = await Tournament.findById(
  //         newOrderHistory.tournamentId
  //       );

  //       tournament.isActive = true;

  //       await tournament.save();
  //     }
  //   }

  //   return "done";
  // },

  //*************************************    EntryFees  ************************************** */
  // post
  async addEntryFees(data) {
    let { initialteamLimit, endteamLimit, fees } = data;

    // Create a new instance of the HelpdeskTicket model
    const newEntryFees = new EntryFees({
      initialteamLimit: initialteamLimit,
      endteamLimit: endteamLimit,
      fees: fees,
    });
    // Save the new entryFees  and wait for the operation to complete
    await newEntryFees.save();

    return newEntryFees;
  },

  // get
  async getallEntryFees() {
    //Find the entryFees
    let entryFees = await EntryFees.find();

    if (!entryFees) {
      // Handle the case where the user is not found
      throw CustomErrorHandler.notFound("EntryFees  Not Found");
    }
    return entryFees;
  },
  async getEntryFeesById(Id) {
    //Find the entryFees
    let EntryFeesData = await EntryFees.findById(Id);
    return EntryFeesData;
  },

  async updateEntryFees(EntryFeesId, data) {
    let { initialteamLimit, endteamLimit, fees } = data;

    const updatedEntryFees = await EntryFees.findById(EntryFeesId);

    updatedEntryFees.initialteamLimit = initialteamLimit;
    updatedEntryFees.endteamLimit = endteamLimit;
    updatedEntryFees.fees = fees;

    return await updatedEntryFees.save();
  },
};

export default otherServices;
