
import moment from "moment";
import mongoose from 'mongoose';
import CustomErrorHandler from "../helpers/CustomErrorHandler.js";
import ImageUploader from "../helpers/ImageUploader.js";
import firebaseNotification from "../helpers/firebaseNotification.js";
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
  Package
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
      .populate('sponsorPackageId')
      .populate({
        path: 'bannerId',
        select: '-locationHistory',
      });

    console.log("History : ", history);

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
      sponsorPackageId: data.sponsorPackageId,
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
      sponsorPackageId: data.sponsorPackageId,
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
