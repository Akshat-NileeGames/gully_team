
import moment from "moment";
import mongoose from 'mongoose';
import CustomErrorHandler from "../helpers/CustomErrorHandler.js";
import ImageUploader from "../helpers/ImageUploader.js";
import firebaseNotification from "../helpers/firebaseNotification.js";
import { ShopService } from "../services/index.js"
import nodemailer from "nodemailer"
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
  Ground,
  Individual,
  Booking
  // Transaction

} from "../models/index.js";

import crypto from "crypto";

import RazorpayHandler from "../helpers/RazorPayHandler.js";

const otherServices = {
  async addhelpDesk(data) {
    // Create a new instance of the HelpdeskTicket model
    const newHelpdeskTicket = new HelpDesk(data);

    // Save the new HelpdeskTicket and wait for the operation to complete
    await newHelpdeskTicket.save();

    return newHelpdeskTicket;
  },

  async getContent(contentName) {
    //Find the Banner
    let Contentdata = await Content.findOne({ type: contentName });

    if (!Contentdata) {
      // Handle the case where the user is not found
      throw CustomErrorHandler.notFound("Content Not Found");
    }
    return Contentdata;
  },

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

  async getNotification(pageSize, skip) {
    //Find the Banner
    let notificationData = await Notification.find()
      .skip(skip) // Skip the calculated number of documents
      .limit(pageSize);

    return notificationData;
  },

  async getNotificationById(Id) {
    //Find the Banner
    let notificationData = await Notification.findById(Id);
    return notificationData;
  },

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

  async updateNotification(NotificationId, data) {
    let { title, message, image } = data;
    //Find the content
    let imagePath;
    const updatedNotification = await Notification.findById(NotificationId);

    console.log("imagr", image);

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

  async getBanner() {
    //Find the Banner
    let banner = await Banner.find();

    if (!banner) {
      // Handle the case where the user is not found
      throw CustomErrorHandler.notFound("Banner Not Found");
    }
    return banner;
  },

  async getBannerById(Id) {
    console.log("Got Banner");
    //Find the Banner
    let BannerData = await Banner.findById(Id);
    return BannerData;
  },

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


  async createPackage(packageData) {
    try {
      const newPackage = new Package(packageData);
      await newPackage.save();
      return newPackage;
    } catch (error) {
      throw new Error('Error creating package: ' + error.message);
    }
  },
  async getPackages() {
    try {
      const packages = await Package.find();
      return packages;
    } catch (error) {
      throw new Error('Error fetching packages: ' + error.message);
    }
  },
  async getPackageById(id) {
    try {
      const packageData = await Package.findById(id);
      return packageData;
    } catch (error) {
      throw new Error('Error fetching package: ' + error.message);
    }
  },

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


  async updatePackage(id, updatedData) {
    try {
      const updatedPackage = await Package.findByIdAndUpdate(id, updatedData, { new: true });
      return updatedPackage;
    } catch (error) {
      throw new Error('Error updating package: ' + error.message);
    }
  },
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

  // Working code for transaction (DG :11/11/24)
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
          from: "promotionalbanners", // Look up promotional banners
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
  async getTrans(userId) {
    const totalCount = await OrderHistory.countDocuments({ userId });
    const history = await OrderHistory.find({ userId: userId })
      .populate('PackageId')
      .populate({
        path: 'shopId',
        populate: [
          { path: 'packageId' },
          { path: 'AdditionalPackages' }
        ]
      })
      // .populate({
      //   path: 'tournamentId',
      //   populate: [
      //     { path: 'ballType', select: 'name' },
      //     { path: 'gameType', select: 'name' },
      //     { path: 'pitchType', select: 'name' },
      //     { path: 'matchType', select: 'name' },
      //     { path: 'tournamentCategory', select: 'name' },
      //     { path: 'tournamentPrize', select: 'name' },
      //     {
      //       path: 'user',
      //       select: 'email phoneNumber fullName locations.placeName',
      //     },
      //   ]
      // })
      .populate({
        path: 'bannerId',
        select: '-locationHistory',
      });
    return { history, totalCount };
  },

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

  //DG
  async deleteTransaction(userId) {
    if (!userId) {
      throw new Error("User ID is required.");
    }

    await OrderHistory.deleteMany({ userId }); // Delete all transactions associated with the user
  },

  // DG
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

  //DG

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

  async createBannerOrder(data) {
    const userInfo = global.user;

    const receipt = crypto.randomBytes(10).toString("hex");

    const paymentData = {
      amount: data.amount * 100, // Amount in paise (100 paise = 1 INR)
      currency: "INR",
      receipt: `order_receipt_${receipt}`,
      payment_capture: 1, // Auto capture payment
    };

    const result = await RazorpayHandler.createOrder(paymentData);
    const bannerId = mongoose.Types.ObjectId.isValid(data.bannerId) ? data.bannerId : null;
    const gstRate = 18 / 100;
    const gstAmount = (result.amount / 100) * gstRate;
    const amountBeforeGST = (result.amount / 100) - gstAmount;
    console.log("Result ", result);

    const orderHistory = new OrderHistory({
      orderId: result.id,
      userId: userInfo.userId,
      bannerId: bannerId,
      razorpay_paymentId: data.razorpay_paymentId,
      amount: result.amount / 100,
      amountWithoutCoupon: data.amountWithoutCoupon ?? 0,
      coupon: data.coupon ?? "",
      totalAmountWithGST: result.amount / 100,
      gstAmount: gstAmount,
      amountbeforegst: amountBeforeGST,
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
      amountPaid: 0,
      paymentStatus: data.status || "Pending",
      paymentMode: data.paymentMode || "Card",
      transactionId: result.id,
    });

    await payment.save();

    return {
      order: result,
      message: "Banner Order created successfully. Payment is pending.",
    };
  },

  async createshopOrder(data) {
    const userInfo = global.user;

    const receipt = crypto.randomBytes(10).toString("hex");

    const paymentData = {
      amount: data.amount * 100, // Amount in paise (100 paise = 1 INR)
      currency: "INR",
      receipt: `order_receipt_${receipt}`,
      payment_capture: 1, // Auto capture payment
    };

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

    const gstRate = 18 / 100;
    const gstAmount = (result.amount / 100) * gstRate;
    const amountBeforeGST = (result.amount / 100) - gstAmount;
    const orderHistory = new OrderHistory({
      orderId: result.id,
      userId: userInfo.userId,
      shopId: data.shopId,
      razorpay_paymentId: data.razorpay_paymentId,
      PackageId: data.PackageId,
      amount: result.amount / 100,
      amountWithoutCoupon: data.amountWithoutCoupon ?? 0,
      coupon: data.coupon ?? "",
      totalAmountWithGST: result.amount / 100,
      gstAmount: gstAmount,
      amountbeforegst: amountBeforeGST,
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
      amountPaid: 0,
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
        data.status
      );
    }, 10000);
    return {
      order: result,
      message: "Shop Order created successfully. Payment is pending.",
    };
  },

  async sendpaymentMail(userFor = "", user, shop, purchasedPackage, TRANSACTION_ID, RECEIPT_NUMBER, PAYMENT_STATUS) {
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

    // Price breakdown with fallback
    const baseAmount = (purchasedPackage.price * 0.82).toFixed(2);
    const gstAmount = (purchasedPackage.price * 0.18).toFixed(2);
    const totalAmount = purchasedPackage.price.toFixed(2);

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
            We were unable to process your payment for the subscription package. Please check your payment details and try again.
          </p>
        </div>
      `;
      introText = `
        We regret to inform you that your payment for the ${purchasedPackage.name} subscription package could not be processed. 
        This could be due to insufficient funds, expired card details, or a temporary issue with the payment gateway.
      `;
      ctaText = "Please retry your payment to activate your subscription and access all features.";
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
      headerColor = "linear-gradient(135deg, #2563eb 0%, #06b6d4 100%)";
      statusBadgeColor = "#fef3c7"; // Keep the same for transaction ID
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
        We're excited to have you onboard and look forward to supporting your business growth through the Gully Team.
      `;
      ctaText = "Thank you for joining us and trusting Gully Team with your business growth. We look forward to building something amazing together!";
      ctaButtons = `
        <a href="mailto:gullyteam33@gmail.com" class="cta-button" style="background-color: #2563eb;">
          Contact Support
        </a>
      `;
    }

    // Dynamic title & subject based on payment status
    let subject;
    if (PAYMENT_STATUS === "Failed") {
      subject = "Payment Failed - Action Required for Your Gully Team Subscription";
    } else if (PAYMENT_STATUS === "Pending") {
      subject = "Payment Pending - Your Gully Team Subscription";
    } else {
      subject = "Payment Confirmation – Gully Team Subscription";
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
  <title>Payment Status – Gully Team</title>
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
      color: ${PAYMENT_STATUS === "Failed" ? "#dc2626" :
          PAYMENT_STATUS === "Pending" ? "#92400e" : "#16a34a"};
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
              <p>Gully Team Subscription</p>
            </div>

            <!-- Content -->
            <div class="content">
              <!-- Welcome Message -->
              <p class="welcome-text">Hello ${user.fullName}! 👋</p>
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
                    <td class="payment-value">₹${baseAmount}</td>
                  </tr>
                  <tr>
                    <td class="payment-label">GST (18%):</td>
                    <td class="payment-value">₹${gstAmount}</td>
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
                    <td class="payment-value">₹${totalAmount}</td>
                  </tr>
                </table>
              </div>
              <h3 class="section-title">
                Shop Information
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
                Owner Information
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
              <h3 class="section-title">
                Additional Details
              </h3>
              <table class="details-table" role="presentation">
               ${shop.LicenseNumber ? `<tr><td class="label">License Number:</td><td class="value">${shop.LicenseNumber}</td></tr>` : ''}
                ${shop.GstNumber ? `<tr><td class="label">GST Number:</td><td class="value">${shop.GstNumber}</td></tr>` : ''}
                <tr>
                  <td class="label">Registered On:</td>
                  <td class="value">${new Date(shop.joinedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</td>
                </tr>
              </table>

              ${PAYMENT_STATUS !== "Failed" ? `
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
                  <li class="task-item">
                    <span class="checkmark">✓</span>
                    Track your subscription and analytics from the dashboard
                  </li>
                </ul>
              </div>
              ` : ''}

              <!-- Info Section -->
              <div class="info-section">
                <h3 class="info-title">${PAYMENT_STATUS === "Failed" ? "Payment Failed - What to Do Next" : "What's Included in Your Subscription"}</h3>
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
                    Your subscription gives you access to essential tools to manage and grow your business. This includes the ability to list and manage products, edit your shop details, and monitor performance through the analytics dashboard.
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
</html>
`
    };

    transporter.sendMail(mailOptions, function (error, info) {
      if (error) {
        console.log("Error sending email:", error);
      } else {
        console.log("Subscription/extension email sent:", info.response);
      }
    });
  },
  async createBookingOrder(data) {
    const userInfo = global.user;

    const receipt = crypto.randomBytes(10).toString("hex");

    const paymentData = {
      amount: data.amount * 100, // Amount in paise (100 paise = 1 INR)
      currency: "INR",
      receipt: `order_receipt_${receipt}`,
      payment_capture: 1, // Auto capture payment
    };

    const result = await RazorpayHandler.createOrder(paymentData);
    // const shopId = mongoose.Types.ObjectId.isValid(data.shopId) ? data.shopId : null;
    const venue = await Ground.findById(data.venueId);
    if (!venue) throw CustomErrorHandler.notFound("Venue Not Found");

    const user = await User.findById(venue.userId);
    if (!user) return CustomErrorHandler.notFound("User Not Found");

    const booking = await Booking.findById(data.bookingId);
    if (!booking) return CustomErrorHandler.notFound("Booking Not Found");

    const gstRate = 18 / 100;
    const gstAmount = (result.amount / 100) * gstRate;
    const amountBeforeGST = (result.amount / 100) - gstAmount;
    const orderHistory = new OrderHistory({
      orderId: result.id,
      userId: userInfo.userId,
      venueId: data.venueId,
      razorpay_paymentId: data.razorpay_paymentId,
      bookingId: data.bookingId,
      amount: result.amount / 100,
      amountWithoutCoupon: data.amountWithoutCoupon ?? 0,
      coupon: data.coupon ?? "",
      totalAmountWithGST: result.amount / 100,
      gstAmount: gstAmount,
      amountbeforegst: amountBeforeGST,
      currency: result.currency,
      receipt: result.receipt,
      status: data.status || "Pending",
      ordertype: "Shop",
    });

    await orderHistory.save();

    const payment = new Payment({
      orderId: result.id,
      userId: userInfo.userId,
      venueId: data.venueId,
      razorpay_paymentId: data.razorpay_paymentId,
      bookingId: data.bookingId,
      amountPaid: 0,
      paymentStatus: data.status || "Pending",
      paymentMode: data.paymentMode || "Card",
      transactionId: result.id,
    });

    await payment.save();

    setTimeout(async () => {

      console.log("Sending email after 10 seconds...",);
      await otherServices.sendBookingConfirmation(
        user,
        venue,
        purchasedPackage,
        result.id,
        orderHistory.receipt,
        data.status
      );
    }, 10000);
    return {
      order: result,
      message: "Shop Order created successfully. Payment is pending.",
    };
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

    // Helper function to format booking dates and times
    const formatBookingSchedule = (scheduledDates) => {
      return scheduledDates
        .map((schedule) => {
          const date = new Date(schedule.date).toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })
          const timeSlots = schedule.timeSlots.map((slot) => `${slot.startTime} - ${slot.endTime}`).join(", ")
          return `${date}: ${timeSlots}`
        })
        .join("<br>")
    }

    // Helper function to format booking pattern
    const formatBookingPattern = (pattern) => {
      const patterns = {
        single_slots: "Single Time Slot",
        multiple_slots: "Multiple Time Slots",
        full_day_booking: "Full Day Booking",
        week_booking: "Weekly Booking",
      }
      return patterns[pattern] || pattern
    }

    // Helper function to format payment status
    const getPaymentStatusBadge = (status) => {
      const statusConfig = {
        successful: { color: "#16a34a", bg: "#dcfce7", border: "#86efac", text: "✅ Payment Successful" },
        pending: { color: "#92400e", bg: "#fef3c7", border: "#fbbf24", text: "⏳ Payment Pending" },
        failed: { color: "#dc2626", bg: "#fee2e2", border: "#f87171", text: "❌ Payment Failed" },
        refunded: { color: "#6b7280", bg: "#f3f4f6", border: "#d1d5db", text: "💰 Payment Refunded" },
      }
      const config = statusConfig[status] || statusConfig.pending
      return `
        <div style="background-color: ${config.bg}; border: 1px solid ${config.border}; border-radius: 6px; padding: 12px; margin: 15px 0; text-align: center;">
          <span style="color: ${config.color}; font-weight: bold; font-size: 14px;">${config.text}</span>
        </div>
      `
    }

    // Helper function to format booking status
    const getBookingStatusBadge = (status) => {
      const statusConfig = {
        confirmed: { color: "#16a34a", bg: "#dcfce7", border: "#86efac", text: "✅ Booking Confirmed" },
        pending: { color: "#92400e", bg: "#fef3c7", border: "#fbbf24", text: "⏳ Booking Pending" },
        cancelled: { color: "#dc2626", bg: "#fee2e2", border: "#f87171", text: "❌ Booking Cancelled" },
        completed: { color: "#059669", bg: "#d1fae5", border: "#6ee7b7", text: "🎉 Booking Completed" },
      }
      const config = statusConfig[status] || statusConfig.pending
      return `
        <div style="background-color: ${config.bg}; border: 1px solid ${config.border}; border-radius: 6px; padding: 12px; margin: 15px 0; text-align: center;">
          <span style="color: ${config.color}; font-weight: bold; font-size: 14px;">${config.text}</span>
        </div>
      `
    }

    const mailOptions = {
      from: "gullyteam33@gmail.com",
      to: user.email,
      subject: "Your Venue Booking Confirmation",
      html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Venue Booking Confirmation – Gully Team</title>
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
      background: linear-gradient(135deg, #16a34a 0%, #22c55e 100%);
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
      color: #bbf7d0;
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
    
    .amount-highlight {
      background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
      border: 2px solid #f59e0b;
      border-radius: 8px;
      padding: 20px;
      margin: 25px 0;
      text-align: center;
    }
    
    .amount-value {
      font-size: 32px;
      font-weight: bold;
      color: #92400e;
      margin: 0 0 5px 0;
    }
    
    .amount-label {
      font-size: 14px;
      color: #92400e;
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
      .contact-section {
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
              <h1>🎉 Booking Confirmed!</h1>
              <p>Your venue has been successfully booked</p>
            </div>
            
            <!-- Content -->
            <div class="content">
              <!-- Welcome Message -->
              <p class="welcome-text">Hello ${user.fullName || user.name}! 🏟️</p>
              <p class="intro-text">
                Great news! Your venue booking has been confirmed. We're excited to help you enjoy your sports session. 
                Below are all the details of your booking.
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
                <h3 class="booking-title">Booking Summary</h3>
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
                  <tr>
                    <td class="label">Scheduled Date(s) & Time(s):</td>
                    <td class="value">${formatBookingSchedule(booking.scheduledDates)}</td>
                  </tr>
                </table>
              </div>

              <!-- Total Amount -->
              <div class="amount-highlight">
                <div class="amount-value">₹${booking.totalAmount.toLocaleString()}</div>
                <div class="amount-label">Total Amount</div>
              </div>

              <!-- Payment Details -->
              <h3 class="section-title">
                💳 Payment Details
              </h3>
              
              ${getPaymentStatusBadge(booking.paymentStatus)}
              
              <table class="details-table" role="presentation">
                <tr>
                  <td class="label">Payment Method:</td>
                  <td class="value">${paymentDetails.paymentMethod || "Online Payment"}</td>
                </tr>
                <tr>
                  <td class="label">Transaction ID:</td>
                  <td class="value">${paymentDetails.transactionId || "N/A"}</td>
                </tr>
                <tr>
                  <td class="label">Payment Date:</td>
                  <td class="value">${new Date(booking.createdAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })}</td>
                </tr>
              </table>

              <!-- Venue Contact Information -->
              <h3 class="section-title">
                📞 Venue Contact Information
              </h3>
              <table class="details-table" role="presentation">
                <tr>
                  <td class="label">Contact Number:</td>
                  <td class="value">${venue.venue_contact}</td>
                </tr>
                <tr>
                  <td class="label">Venue Type:</td>
                  <td class="value">${venue.venue_type}</td>
                </tr>
                <tr>
                  <td class="label">Surface Type:</td>
                  <td class="value">${venue.venue_surfacetype}</td>
                </tr>
                ${venue.upiId
          ? `
                <tr>
                  <td class="label">UPI ID:</td>
                  <td class="value">${venue.upiId}</td>
                </tr>
                `
          : ""
        }
              </table>

              <!-- Next Steps -->
              <div class="next-steps">
                <h3 class="next-steps-title">📋 What's Next?</h3>
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
                    Bring a valid ID and this booking confirmation
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

              <!-- Contact Support -->
              <div class="contact-section">
                <h3 class="contact-title">🤝 Need Help?</h3>
                <p class="contact-text">
                  If you have any questions about your booking or need assistance, our support team is here to help:
                  <br><br>
                  📧 Email: <a href="mailto:gullyteam33@gmail.com" style="color: #1e40af; text-decoration: none;">gullyteam33@gmail.com</a><br>
                  📱 Include your Booking ID: <strong>${booking._id}</strong> in any correspondence
                  <br><br>
                  For immediate venue-related queries, contact the venue directly at <strong>${venue.venue_contact}</strong>
                </p>
              </div>

              <p style="text-align: center; color: #6b7280; font-size: 16px; margin-top: 30px;">
                Thank you for choosing Gully Team! 🏆<br>
                <em>We hope you have an amazing sports experience!</em>
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
                This is an automated email. Please do not reply directly to this email.
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
        console.log("Error sending booking confirmation:", error)
      } else {
        console.log("Booking confirmation email sent:", info.response)
      }
    })
  },
  async createVenueOrder(data) {
    const userInfo = global.user;

    const receipt = crypto.randomBytes(10).toString("hex");

    const paymentData = {
      amount: data.amount * 100, // Amount in paise (100 paise = 1 INR)
      currency: "INR",
      receipt: `order_receipt_${receipt}`,
      payment_capture: 1, // Auto capture payment
    };

    const result = await RazorpayHandler.createOrder(paymentData);
    // const shopId = mongoose.Types.ObjectId.isValid(data.shopId) ? data.shopId : null;
    const venue = await Ground.findById(data.venueId);
    if (!venue) throw CustomErrorHandler.notFound("Venue Not Found");

    const user = await User.findById(venue.userId);
    if (!user) return CustomErrorHandler.notFound("User Not Found");

    const purchasedPackage = await Package.findById(data.PackageId);
    if (!purchasedPackage) return CustomErrorHandler.notFound("Package Not Found");

    const gstRate = 18 / 100;
    const gstAmount = (result.amount / 100) * gstRate;
    const amountBeforeGST = (result.amount / 100) - gstAmount;
    const orderHistory = new OrderHistory({
      orderId: result.id,
      userId: userInfo.userId,
      venueId: data.venueId,
      razorpay_paymentId: data.razorpay_paymentId,
      PackageId: data.PackageId,
      amount: result.amount / 100,
      amountPaid: 0,
      amountDue: result.amount / 100,
      amountWithoutCoupon: data.amountWithoutCoupon ?? 0,
      coupon: data.coupon ?? "",
      totalAmountWithGST: result.amount / 100,
      gstAmount: gstAmount,
      amountbeforegst: amountBeforeGST,
      currency: result.currency,
      receipt: result.receipt,
      status: data.status || "Pending",
      ordertype: "venue",
    });

    await orderHistory.save();

    const payment = new Payment({
      orderId: result.id,
      userId: userInfo.userId,
      venueId: data.venueId,
      razorpay_paymentId: data.razorpay_paymentId,
      PackageId: data.PackageId,
      amountPaid: 0,
      paymentStatus: data.status || "Pending",
      paymentMode: data.paymentMode || "Card",
      transactionId: result.id,
    });

    await payment.save();

    setTimeout(async () => {

      console.log("Sending email after 10 seconds...",);
      await otherServices.sendvenuepaymentMail(
        "shop-subscription",
        user,
        venue,
        purchasedPackage,
        result.id,
        orderHistory.receipt,
        data.status
      );
    }, 10000);
    return {
      order: result,
      message: "Shop Order created successfully. Payment is pending.",
    };
  },
  async sendvenuepaymentMail(userFor = "", user, venue, purchasedPackage, TRANSACTION_ID, RECEIPT_NUMBER, PAYMENT_STATUS) {
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

    // Price breakdown with fallback
    const baseAmount = (purchasedPackage.price * 0.82).toFixed(2)
    const gstAmount = (purchasedPackage.price * 0.18).toFixed(2)
    const totalAmount = purchasedPackage.price.toFixed(2)

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
            We were unable to process your payment for the venue subscription package. Please check your payment details and try again.
          </p>
        </div>
      `
      introText = `
        We regret to inform you that your payment for the ${purchasedPackage.name} venue subscription package could not be processed. 
        This could be due to insufficient funds, expired card details, or a temporary issue with the payment gateway.
      `
      ctaText = "Please retry your payment to activate your venue subscription and start accepting bookings."
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
        Thank you for purchasing the ${purchasedPackage.name} venue subscription package. Your payment is currently being processed.
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
      headerTitle = "Venue Subscription Successfully Activated"
      headerColor = "linear-gradient(135deg, #2563eb 0%, #06b6d4 100%)"
      statusBadgeColor = "#fef3c7"
      statusMessage = `
        <div style="background-color: #dcfce7; border: 1px solid #86efac; border-radius: 6px; padding: 16px; margin: 20px 0;">
          <p style="color: #166534; font-weight: bold; margin: 0 0 10px 0; font-size: 16px;">Payment Successful</p>
          <p style="color: #166534; margin: 0; font-size: 14px;">
            Your payment has been successfully processed and your venue subscription is now active.
          </p>
        </div>
      `
      introText = `
        We are pleased to confirm that your venue subscription payment has been successfully processed. Thank you for choosing Gully Team — 
        We're excited to have you onboard and look forward to helping you manage your venue bookings and grow your sports business.
      `
      ctaText =
        "Thank you for joining us and trusting Gully Team with your venue management. We look forward to helping you connect with sports enthusiasts!"
      ctaButtons = `
        <a href="mailto:gullyteam33@gmail.com" class="cta-button" style="background-color: #2563eb;">
          Contact Support
        </a>
      `
    }

    // Dynamic title & subject based on payment status
    let subject
    if (PAYMENT_STATUS === "Failed") {
      subject = "Payment Failed - Action Required for Your Gully Team Venue Subscription"
    } else if (PAYMENT_STATUS === "Pending") {
      subject = "Payment Pending - Your Gully Team Venue Subscription"
    } else {
      subject = "Payment Confirmation – Gully Team Venue Subscription"
    }

    // Helper function to format sports pricing
    const formatSportsPricing = (venue) => {
      if (venue.sportPricing && venue.sportPricing.length > 0) {
        return venue.sportPricing.map((sp) => `${sp.sport}: ₹${sp.perHourCharge}/hour`).join("<br>")
      }
      return `Default Rate: ₹${venue.perHourCharge}/hour`
    }

    // Helper function to format venue timeslots
    const formatVenueTimings = (timeslots) => {
      const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
      return days
        .map((day) => {
          const slot = timeslots[day]
          if (slot && slot.isOpen) {
            return `${day}: ${slot.openTime} - ${slot.closeTime}`
          }
          return `${day}: Closed`
        })
        .join("<br>")
    }

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
      }

      const availableFacilities = Object.keys(facilities)
        .filter((key) => facilities[key] === true)
        .map((key) => facilityNames[key])
        .filter(Boolean)

      return availableFacilities.length > 0 ? availableFacilities.join(", ") : "Basic facilities available"
    }

    const mailOptions = {
      from: "gullyteam33@gmail.com",
      to: user.email, // Changed from shop.ownerEmail to user.email
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
                    <td class="payment-value">₹${baseAmount}</td>
                  </tr>
                  <tr>
                    <td class="payment-label">GST (18%):</td>
                    <td class="payment-value">₹${gstAmount}</td>
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
                    <td class="payment-value">₹${totalAmount}</td>
                  </tr>
                </table>
              </div>

              <h3 class="section-title">
                Venue Information
              </h3>
              <table class="details-table" role="presentation">
                <tr>
                  <td class="label">Venue Name:</td>
                  <td class="value">${venue.venue_name}</td>
                </tr>
                <tr>
                  <td class="label">Description:</td>
                  <td class="value">${venue.venue_description}</td>
                </tr>
                <tr>
                  <td class="label">Address:</td>
                  <td class="value">${venue.venue_address}</td>
                </tr>
                <tr>
                  <td class="label">Contact Number:</td>
                  <td class="value">${venue.venue_contact}</td>
                </tr>
                <tr>
                  <td class="label">Venue Type:</td>
                  <td class="value">${venue.venue_type}</td>
                </tr>
                <tr>
                  <td class="label">Surface Type:</td>
                  <td class="value">${venue.venue_surfacetype}</td>
                </tr>
              </table>

              <!-- Sports & Pricing Information -->
              <h3 class="section-title">
                Sports & Pricing
              </h3>
              <table class="details-table" role="presentation">
                <tr>
                  <td class="label">Available Sports:</td>
                  <td class="value">${venue.venue_sports ? venue.venue_sports.join(", ") : "Not specified"}</td>
                </tr>
                <tr>
                  <td class="label">Pricing:</td>
                  <td class="value">${formatSportsPricing(venue)}</td>
                </tr>
                <tr>
                  <td class="label">Payment Methods:</td>
                  <td class="value">${venue.paymentMethods ? venue.paymentMethods.join(", ") : "Cash, UPI"}</td>
                </tr>
                <tr>
                  <td class="label">UPI ID:</td>
                  <td class="value">${venue.upiId}</td>
                </tr>
              </table>

              <!-- Venue Timings -->
              <h3 class="section-title">
                Venue Timings
              </h3>
              <table class="details-table" role="presentation">
                <tr>
                  <td class="label">Operating Hours:</td>
                  <td class="value">${formatVenueTimings(venue.venue_timeslots)}</td>
                </tr>
              </table>

              <!-- Facilities -->
              <h3 class="section-title">
                Facilities & Amenities
              </h3>
              <table class="details-table" role="presentation">
                <tr>
                  <td class="label">Available Facilities:</td>
                  <td class="value">${formatFacilities(venue.venuefacilities)}</td>
                </tr>
                ${venue.venue_rules && venue.venue_rules.length > 0
          ? `
                <tr>
                  <td class="label">Venue Rules:</td>
                  <td class="value">${venue.venue_rules.join("<br>")}</td>
                </tr>
                `
          : ""
        }
              </table>

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
                <tr>
                  <td class="label">Registered On:</td>
                  <td class="value">${new Date(venue.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</td>
                </tr>
              </table>

              ${PAYMENT_STATUS !== "Failed"
          ? `
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
              `
          : ""
        }

              <!-- Info Section -->
              <div class="info-section">
                <h3 class="info-title">${PAYMENT_STATUS === "Failed" ? "Payment Failed - What to Do Next" : "What's Included in Your Venue Subscription"}</h3>
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
                    Your venue subscription gives you access to powerful tools to manage your sports facility and grow your booking business. This includes:
                    <br><br>
                    • <strong>Venue Listing:</strong> Showcase your ground/turf on our platform with photos and detailed information<br>
                    • <strong>Multi-Sport Management:</strong> Add multiple sports with individual pricing for each<br>
                    • <strong>Booking Management:</strong> Accept and manage slot bookings from sports enthusiasts<br>
                    • <strong>Flexible Pricing:</strong> Set per-hour charges for different sports and time slots<br>
                    • <strong>Analytics Dashboard:</strong> Track bookings, revenue, and venue performance<br>
                    • <strong>Payment Integration:</strong> Secure payment processing with multiple payment options<br>
                    • <strong>Calendar Management:</strong> Manage availability and time slots efficiently
                    <br><br>
                    Log in to your Gully Team venue dashboard to start accepting bookings and connecting with sports enthusiasts in your area.
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
</html>
`,
    }

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log("Error sending email:", error)
      } else {
        console.log("Venue subscription email sent:", info.response)
      }
    })
  },

  async createIndividualOrder(data) {
    const userInfo = global.user
    const receipt = crypto.randomBytes(10).toString("hex")

    const paymentData = {
      amount: data.amount * 100, // Amount in paise (100 paise = 1 INR)
      currency: "INR",
      receipt: `order_receipt_${receipt}`,
      payment_capture: 1, // Auto capture payment
    }

    const result = await RazorpayHandler.createOrder(paymentData)

    const individual = await Individual.findById(data.individualId)
    if (!individual) throw CustomErrorHandler.notFound("Individual Not Found")

    const user = await User.findById(individual.userId)
    if (!user) throw CustomErrorHandler.notFound("User Not Found")

    const purchasedPackage = await Package.findById(data.PackageId)
    if (!purchasedPackage) throw CustomErrorHandler.notFound("Package Not Found")

    const gstRate = 18 / 100
    const gstAmount = (result.amount / 100) * gstRate
    const amountBeforeGST = result.amount / 100 - gstAmount
    console.log(data.ordertype);
    const orderHistory = new OrderHistory({
      orderId: result.id,
      userId: userInfo.userId,
      individualId: data.individualId,
      razorpay_paymentId: data.razorpay_paymentId,
      PackageId: data.PackageId,
      amount: result.amount / 100,
      amountPaid: 0,
      amountDue: result.amount / 100,
      amountWithoutCoupon: data.amountWithoutCoupon ?? 0,
      coupon: data.coupon ?? "",
      totalAmountWithGST: result.amount / 100,
      gstAmount: gstAmount,
      amountbeforegst: amountBeforeGST,
      currency: result.currency,
      receipt: result.receipt,
      status: data.status || "Pending",
      ordertype: data.ordertype,
    })

    await orderHistory.save()

    const payment = new Payment({
      orderId: result.id,
      userId: userInfo.userId,
      individualId: data.individualId,
      razorpay_paymentId: data.razorpay_paymentId,
      PackageId: data.PackageId,
      amountPaid: 0,
      paymentStatus: data.status || "Pending",
      paymentMode: data.paymentMode || "Card",
      transactionId: result.id,
    })

    await payment.save()

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
      )
    }, 10000)

    return {
      order: result,
      message: "Individual Service Provider Order created successfully. Payment is pending.",
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

    // Price breakdown with fallback
    const baseAmount = (purchasedPackage.price * 0.82).toFixed(2)
    const gstAmount = (purchasedPackage.price * 0.18).toFixed(2)
    const totalAmount = purchasedPackage.price.toFixed(2)

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
          (edu) =>
            `${edu.degree} from ${edu.institution} (${edu.year})${edu.description ? `: ${edu.description}` : ""}`,
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
              <p class="welcome-text">Hello ${individual.fullName}! 🏆</p>
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
                    <td class="payment-value">₹${baseAmount}</td>
                  </tr>
                  <tr>
                    <td class="payment-label">GST (18%):</td>
                    <td class="payment-value">₹${gstAmount}</td>
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
                    <td class="payment-value">₹${totalAmount}</td>
                  </tr>
                </table>
              </div>

              <h3 class="section-title">
                Personal Information
              </h3>
              <table class="details-table" role="presentation">
                <tr>
                  <td class="label">Full Name:</td>
                  <td class="value">${individual.fullName}</td>
                </tr>
                <tr>
                  <td class="label">Email:</td>
                  <td class="value">${individual.email}</td>
                </tr>
                <tr>
                  <td class="label">Phone Number:</td>
                  <td class="value">${individual.phoneNumber}</td>
                </tr>
                <tr>
                  <td class="label">PAN Number:</td>
                  <td class="value">${individual.panNumber}</td>
                </tr>
                <tr>
                  <td class="label">Years of Experience:</td>
                  <td class="value">${individual.yearOfExperience} years</td>
                </tr>
              </table>

              <!-- Service Information -->
              <h3 class="section-title">
                Service Information
              </h3>
              <table class="details-table" role="presentation">
                <tr>
                  <td class="label">Sports Categories:</td>
                  <td class="value">${individual.sportsCategories.join(", ")}</td>
                </tr>
                <tr>
                  <td class="label">Service Types:</td>
                  <td class="value">${individual.selectedServiceTypes.join(", ")}</td>
                </tr>
                <tr>
                  <td class="label">Service Options:</td>
                  <td class="value">${formatServiceOptions(individual.serviceOptions)}</td>
                </tr>
                <tr>
                  <td class="label">Available Days:</td>
                  <td class="value">${individual.availableDays.join(", ")}</td>
                </tr>
                <tr>
                  <td class="label">Age Groups Supported:</td>
                  <td class="value">${individual.supportedAgeGroups.join(", ")}</td>
                </tr>
              </table>

              <!-- Qualifications -->
              <h3 class="section-title">
                Qualifications & Experience
              </h3>
              <table class="details-table" role="presentation">
                <tr>
                  <td class="label">Education:</td>
                  <td class="value">${formatEducation(individual.education)}</td>
                </tr>
                <tr>
                  <td class="label">Experience:</td>
                  <td class="value">${formatExperience(individual.experience)}</td>
                </tr>
                <tr>
                  <td class="label">Certificates:</td>
                  <td class="value">${formatCertificates(individual.certificates)}</td>
                </tr>
              </table>

              <!-- Bio -->
              <h3 class="section-title">
                Professional Bio
              </h3>
              <table class="details-table" role="presentation">
                <tr>
                  <td class="value" colspan="2">${individual.bio}</td>
                </tr>
              </table>

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
</html>
`,
    }

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log("Error sending email:", error)
      } else {
        console.log("Individual subscription email sent:", info.response)
      }
    })
  },


  //#region Reminder Mail for venue
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
            <p style="color: #b91c1c; font-weight: bold; margin: 0 0 10px 0; font-size: 16px;">⚠️ Critical: Package Expires in ${daysUntilExpiration} day${daysUntilExpiration === 1 ? "" : "s"}!</p>
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
            <p style="color: #92400e; font-weight: bold; margin: 0 0 10px 0; font-size: 16px;">⏰ Package Expires in ${daysUntilExpiration} days</p>
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
            <p style="color: #1e40af; font-weight: bold; margin: 0 0 10px 0; font-size: 16px;">📅 Package Expires in ${daysUntilExpiration} days</p>
            <p style="color: #1e40af; margin: 0; font-size: 14px;">
              Plan ahead and renew your package to avoid any interruption in service.
            </p>
          </div>
        `
    }

    const subject =
      daysUntilExpiration <= 3
        ? `🚨 URGENT: Your Venue Package Expires in ${daysUntilExpiration} Day${daysUntilExpiration === 1 ? "" : "s"}!`
        : `⏰ Reminder: Your Venue Package Expires in ${daysUntilExpiration} Days`

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
                  <h3 class="warning-title">⚠️ Important Notice</h3>
                  <p class="warning-text">
                    <strong>If your package is not renewed, your venue will no longer be visible on our platform.</strong>
                    This means you will stop receiving new bookings and your venue listing will be deactivated until renewal.
                  </p>
                </div>

                <!-- Call to Action -->
                <div class="cta-section">
                  <a href="mailto:gullyteam33@gmail.com?subject=Package Renewal Request - ${venue.venue_name}" 
                     class="cta-button ${urgencyLevel === "critical" ? "urgent" : ""}">
                    ${urgencyLevel === "critical" ? "🚨 Renew Now - Urgent!" : "🔄 Renew Package"}
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
          <p style="color: #b91c1c; font-weight: bold; margin: 0 0 10px 0; font-size: 16px;">⚠️ Critical: Package Expires in ${daysUntilExpiration} day${daysUntilExpiration === 1 ? "" : "s"}!</p>
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
          <p style="color: #92400e; font-weight: bold; margin: 0 0 10px 0; font-size: 16px;">⏰ Package Expires in ${daysUntilExpiration} days</p>
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
          <p style="color: #1e40af; font-weight: bold; margin: 0 0 10px 0; font-size: 16px;">📅 Package Expires in ${daysUntilExpiration} days</p>
          <p style="color: #1e40af; margin: 0; font-size: 14px;">
            Plan ahead and renew your package to avoid any interruption in service.
          </p>
        </div>
      `
    }

    const subject =
      daysUntilExpiration <= 3
        ? `🚨 URGENT: Your Service Provider Package Expires in ${daysUntilExpiration} Day${daysUntilExpiration === 1 ? "" : "s"}!`
        : `⏰ Reminder: Your Service Provider Package Expires in ${daysUntilExpiration} Days`

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
              <p class="welcome-text">Hello ${individual.fullName}! 🏆</p>
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
                <h3 class="warning-title">⚠️ Important Notice</h3>
                <p class="warning-text">
                  <strong>If your package is not renewed, your profile will no longer be visible on our platform.</strong>
                  This means potential clients won't be able to find you, and you will stop receiving new booking requests until renewal.
                </p>
              </div>

              <!-- Call to Action -->
              <div class="cta-section">
                <a href="mailto:gullyteam33@gmail.com?subject=Package Renewal Request - ${individual.fullName}" 
                   class="cta-button ${urgencyLevel === "critical" ? "urgent" : ""}">
                  ${urgencyLevel === "critical" ? "🚨 Renew Now - Urgent!" : "🔄 Renew Package"}
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
  // const Ground = require("./Ground") // Assuming Ground is a model
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
  //         const venues = await Ground.find({
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
    const gstRate = 18 / 100;
    const gstAmount = (result.amount / 100) * gstRate;
    const amountBeforeGST = (result.amount / 100) - gstAmount;

    const orderHistory = new OrderHistory({
      orderId: result.id,
      userId: userInfo.userId,
      PackageId: data.PackageId,
      amount: result.amount / 100, // Amount in INR
      amountWithoutCoupon: data.amountWithoutCoupon ?? 0,
      coupon: data.coupon ?? "",
      tournamentId: data.tournamentId,
      amountPaid: 0,
      amountDue: result.amount / 100,
      currency: result.currency,
      receipt: result.receipt,
      status: data.status || "Pending",
      ordertype: "Sponsor",
      gstAmount: gstAmount,
      amountbeforegst: amountBeforeGST,
      totalAmountWithGST: result.amount / 100,
    });

    await orderHistory.save();

    const payment = new Payment({
      orderId: result.id,
      userId: userInfo.userId,
      PackageId: data.PackageId,
      amountPaid: 0,
      tournamentId: data.tournamentId,
      paymentStatus: data.status || "Pending",
      paymentMode: data.paymentMode || "Card",
      transactionId: result.id,
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
    console.log("EntryFees", EntryFees);
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
