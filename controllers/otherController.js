import Joi from "joi";
import { otherServices } from "../services/index.js";
//DG imported these additional files
import mongoose from "mongoose";
import { Tournament } from "../models/index.js";

const otherController = {
  async addhelpDesk(req, res, next) {
    //validation
    // Joi schema for validation
    const helpdeskSchema = Joi.object({
      issue: Joi.string().required(),
      status: Joi.string()
        .valid("Open", "Closed", "InProgress")
        .default("Open"),
    });

    const { error } = helpdeskSchema.validate(req.body);

    if (error) {
      return next(error);
    }
    try {
      const result = await otherServices.addhelpDesk({
        ...req.body,
        userId: global.user.userId,
      });

      return res.status(200).json({
        status: true,
        message: "HelpDesk Ticket Added Suessfully",
        data: result,
      });
    } catch (err) {
      console.log(" Error in EditProfile ");
      return next(err);
    }
  },

  async getBanner(req, res, next) {
    try {
      const result = await otherServices.getBanner();

      return res.status(200).json({
        sucess: true,
        message: "Banner Retrived SucessFully",
        data: { banners: result },
      });
    } catch (err) {
      console.log(" Error in getBanner ");
      return next(err);
    }
  },

  async getContent(req, res, next) {
    const contentName = req.params.contentName;
    console.log(contentName);
    try {
      const result = await otherServices.getContent(contentName);

      return res.status(200).json({
        sucess: true,
        message: "Content Retrived SucessFully",
        data: result,
      });
    } catch (err) {
      console.log(" Error in getContent ");
      return next(err);
    }
  },

  async createOrder(req, res, next) {
    try {
      const result = await otherServices.createOrder(req.body);

      return res.status(200).json({
        sucess: true,
        message: "OrderID created SucessFully",
        data: result,
      });
    } catch (err) {
      console.log(" Error in createOrder ");
      return next(err);
    }
  },

  async createBannerOrder(req, res, next) {
    try {
      const result = await otherServices.createBannerOrder(req.body);

      return res.status(200).json({
        sucess: true,
        message: "OrderID created SucessFully",
        data: result,
      });
    } catch (err) {
      console.log(" Error in createOrder ");
      return next(err);
    }
  },

  async createSponsorOrder(req, res, next) {
    try {
      const result = await otherServices.createSponsorOrder(req.body);

      return res.status(200).json({
        sucess: true,
        message: "OrderID created SucessFully",
        data: result,
      });
    } catch (err) {
      console.log(" Error in createOrder ");
      return next(err);
    }
  },
  async createSponsorOrder(req, res, next) {
    try {
      const result = await otherServices.createSponsorOrder(req.body);

      return res.status(200).json({
        sucess: true,
        message: "OrderID created SucessFully",
        data: result,
      });
    } catch (err) {
      console.log(" Error in createOrder ");
      return next(err);
    }
  },
  async createshopOrder(req, res, next) {
    try {
      const result = await otherServices.createshopOrder(req.body);

      return res.status(200).json({
        sucess: true,
        message: "OrderID created SucessFully",
        data: result,
      });
    } catch (err) {
      console.log(" Error in createOrder ");
      return next(err);
    }
  },


  async updatePayment(req, res, next) {
    try {
      const result = await otherServices.updatePayment(req.body);
      // console.log(req.body);
      return res.status(200).json({
        sucess: true,
        message: "Payment Updated SucessFully",
        data: result,
      });
    } catch (err) {
      console.log(" Error in updatePayment ");
      return next(err);
    }
  },

  async applyCoupon(req, res, next) {
    const couponID = req.body.couponId;
    const amount = req.body.amount;
    // const tournamentId = req.body.tournamentId;

    try {
      const result = await otherServices.applyCoupon(
        couponID,
        amount,
        // tournamentId,
      );

      return res.status(200).json({
        sucess: true,
        message: "Coupon Applied SucessFully",
        data: result,
      });
    } catch (err) {
      console.log(" Error in applyCoupon ");
      return next(err);
    }
  },

  // async tournamentFees(req, res, next) {
  //   const tournamentId = req.body.tournamentId;

  //   try {
  //     const result = await otherServices.tournamentFees(tournamentId);

  //     return res.status(200).json({
  //       sucess: true,
  //       message: "Tournament Fees Retrived SucessFully",
  //       data: { fee: result },
  //     });
  //   } catch (err) {
  //     console.log(" Error in tournamentFees ");
  //     return next(err);
  //   }
  // },
  async tournamentFees(req, res, next) {
    const teamLimit = req.params.tournamentLimit;

    try {
      const result = await otherServices.tournamentFees(teamLimit);

      return res.status(200).json({
        success: true,
        message: "Tournament Fees Retrieved Successfully",
        data: { fee: result },
      });
    } catch (err) {
      console.log("Error in tournamentFees");
      return next(err);
    }
  },
  async getCoupon(req, res, next) {
    try {
      let result = await otherServices.getCoupon(100, 0);

      return res.status(200).json({
        sucess: true,
        status: true,
        message: "Coupon Retrived SucessFully",
        data: { coupons: result },
      });
    } catch (err) {
      console.log(" Error in getCoupon ");
      return next(err);
    }
  },


  async getPackageById(req, res) {
    const { id } = req.params;
    try {
      const packageData = await otherServices.getPackageById(id);
      if (!packageData) {
        return res.status(404).json({ message: 'Package not found' });
      }
      return res.status(200).json({
        status: true,
        message: "Package retrived successfully",
        data: packageData,
      });
    } catch (error) {
      return res.status(500).json({ message: 'Error fetching package', error: error.message });
    }
  },


  async getPackagesByType(req, res) {
    const { packageFor } = req.params;

    try {

      const result = await otherServices.getPackagesByType(packageFor);

      return res.status(200).json({
        status: true,
        message: "Package retrived successfully",
        data: { packages: result },
      });
    } catch (error) {
      return res.status(500).json({
        message: 'Error retrieving packages',
        error: error.message,
      });
    }
  },
  async getAdditionalPackages(req, res) {
    try {
      const result = await otherServices.getAdditionalPackages();

      return res.status(200).json({
        status: true,
        message: "Package retrived successfully",
        data: { packages: result },
      });
    } catch (error) {
      return res.status(500).json({
        message: 'Error retrieving packages',
        error: error.message,
      });
    }
  },

  // async transactionHistory(req, res, next) {
  //   try {
  //     if (!req.user || !req.user.userId) {
  //       console.log("User not authorized in controller");
  //       return res.status(400).json({
  //         success: false,
  //         status: false,
  //         message: "User not authorized",
  //       });
  //     }

  //     const { userId } = req.user;
  //     const pageSize = parseInt(req.query.pageSize) || 10;
  //     const skip = parseInt(req.query.skip) || 0;

  //     const result = await otherServices.transactionHistory(userId, pageSize, skip);

  //     return res.status(200).json({
  //       success: true,
  //       status: true,
  //       message: "Transaction History Retrieved Successfully",
  //       data: { transactions: result.history, totalCount: result.totalCount },
  //     });
  //   } catch (err) {
  //     console.log("Error in transactionHistory controller:", err);
  //     return next(err);
  //   }
  // },


  //nikhil
  // async transactionHistory(req, res, next) {
  //   try {
  //     let result = await otherServices.transactionHistory();

  //     return res.status(200).json({
  //       sucess: true,
  //       status: true,
  //       message: "Transaction History Retrieved Successfully",
  //       data: { transactions: result },
  //     });
  //   } catch (err) {
  //     console.log(" Error in transactionHistory ");
  //     return next(err);
  //   }
  // },

  //Anurag's Code

  async transactionHistory(req, res, next) {
    try {
      const { userId } = req.user;
      const pageSize = parseInt(req.query.pageSize) || 10;
      const skip = parseInt(req.query.skip) || 0;

      let result = await otherServices.getTrans(userId, pageSize, skip);

      return res.status(200).json({
        success: true,
        message: "Transaction History Retrieved Successfully",
        data: { transactions: result.history, totalCount: result.totalCount },
      });
    } catch (err) {
      console.log("Error in transactionHistory", err);
      return next(err);
    }
  },



  // DG
  async deleteTransaction(req, res, next) {
    try {
      const { userId } = req.user;

      await otherServices.deleteTransaction(userId);

      return res.status(200).json({
        success: true,
        message: "All transactions deleted successfully.",
      });
    } catch (err) {
      console.error("Error in deleteTransaction:", err);
      return next(err);
    }
  },

  //DG
  async deleteTransactionById(req, res, next) {
    try {
      const { transactionId } = req.params;

      if (!transactionId) {
        return res.status(400).json({
          success: false,
          message: "Transaction ID is required.",
        });
      }

      await otherServices.deleteTransactionById(transactionId);

      return res.status(200).json({
        success: true,
        message: "Transaction deleted successfully.",
      });
    } catch (err) {
      console.error("Error in deleteTransactionById:", err);
      return next(err);
    }
  },


  //DG
  async razorpayWebhook(req, res, next) {
    try {
      // Razorpay sends webhook data in the body
      const result = await otherServices.handleRazorpayWebhook(req.body);

      return res.status(200).json({
        success: true,
        message: "Transaction status updated successfully",
        data: result,
      });
    } catch (error) {
      console.error("Error in Razorpay webhook:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to update transaction status",
      });
    }
  },

  //DG 
  // async updateTransactionStatus(req, res, next) {
  //   try {
  //     const { orderId, paymentId } = req.body;

  //     const updatedOrder = await verifyAndUpdateTransactionStatus(
  //       orderId,
  //       paymentId
  //     );

  //     if (!updatedOrder) {
  //       return res.status(404).json({
  //         success: false,
  //         message: "Order not found or already updated.",
  //       });
  //     }

  //     return res.status(200).json({
  //       success: true,
  //       message: "Transaction status updated successfully",
  //       data: updatedOrder,
  //     });
  //   } catch (error) {
  //     console.error("Error updating transaction status:", error);
  //     return next(error);
  //   }
  // }
};

export default otherController;
