import Joi from "joi";
import { otherServices,adminService } from "../../services/index.js";

import { User } from "../../models/index.js";
/**
 * ============================================================================
 * Controller Layer — General Structure and Conventions
 * ============================================================================
 *
 * Overview:
 * ----------
 * This controller is responsible for handling HTTP requests and responses.
 * Each handler performs the following core tasks:
 *   1. Validates incoming request data using Joi or other validators.
 *   2. Delegates core business logic to the appropriate Service layer.
 *   3. Returns standardized JSON responses or forwards errors to middleware.
 *
 * Standard Response Format:
 *   • Success → { success: true, message: string, data: any }
 *   • Errors  → Managed centrally via CustomErrorHandler + Express middleware.
 *
 * ============================================================================
 * Developer Notes (Conventions Used Across Controllers)
 * ============================================================================
 *
 * ➤ Async Handlers:
 *   - Always declared as `async` (due to I/O operations like DB/service calls).
 *   - Wrap logic in `try/catch` blocks.
 *   - On failure, forward errors using `next(CustomErrorHandler.*)` so centralized
 *     middleware handles logging, formatting, and response codes.
 *   - Always return a response or call `next()` to properly end the request lifecycle.
 *   - Keep controllers thin and side-effect free → validate → call service → respond.
 *
 * ➤ Joi Validation:
 *   - Use: `const { error, value } = schema.validate(req.<source>);`
 *   - For user-friendly messages: 
 *       `error.details.map(d => d.message).join(', ')`
 *   - Forward validation errors via:
 *       `return next(CustomErrorHandler.badRequest(error.details.map(e => e.message).join(', ')))`
 *   - Avoid sending raw Joi error objects to clients.
 *
 * ➤ CustomErrorHandler (Usage Conventions):
 *   - Common methods: `badRequest(message, err?)`, `validationError(message)`, `serverError(message, err?)`.
 *   - Prefer forwarding errors using `next(CustomErrorHandler.badRequest(...))` 
 *     instead of returning raw error objects.
 *   - Some legacy patterns call `CustomErrorHandler.validationError(...)` directly;
 *     update these to use `next(...)` for proper middleware flow.
 *   - Keep messages concise and avoid exposing internal or sensitive data.
 *
 * ➤ Retrieving User Context:
 *   - Preferred: `req.user` (set by authentication middleware).
 *   - Legacy: `global.user` may still exist in older modules (e.g., slot management).
 *   - Always validate the presence of `userId` before use.
 *   - Migrate legacy flows to `req.user` during refactors.
 *
 * ➤ Response Shape:
 *   - Success responses follow:
 *       { success: true, message: string, data: any }
 *   - All errors are propagated to centralized middleware via `next(CustomErrorHandler.*)`.
 *
 * ============================================================================
 * Purpose:
 * ----------
 * This structure ensures:
 *   • Consistency across all controller implementations.
 *   • Predictable and maintainable request handling.
 *   • Clear separation of concerns between controllers and services.
 *   • Scalable and debuggable backend architecture.
 * ============================================================================
 */

const contentController = {
  async getContent(req, res, next) {
    const contentName = req.params.contentName;
    try {
      const result = await otherServices.getContent(contentName);

      return res.status(200).json({
        sucess: true,
        status: true,
        message: "Content Retrived SucessFully",
        data: result,
      });
    } catch (err) {
      console.log(" Error in getContent ");
      return next(err);
    }
  },

  async updateContent(req, res, next) {
    const contentName = req.params.contentName;

    //validation
    const ContentSchema = Joi.object({
      content: Joi.required(),
      status: Joi.required(),

    });

    const { error } = ContentSchema.validate(req.body);

    if (error) {
      return next(error);
    }

    try {
      const result = await otherServices.updateContent(contentName,req.body);

      return res.status(200).json({
        sucess: true,
        status: true,
        message: "Content Updated SucessFully",
        data: result,
      });
    } catch (err) {
      console.log(" Error in updateContent ");
      return next(err);
    } 
  },

  async getHelpdesk(req, res, next) {

    const page = parseInt(req.params.page) || 1;    // Get the requested page from query parameters (default to page 1)
    const pageSize = parseInt(req.params.pageSize); // Set the number of documents per page

    // Calculate the number of documents to skip based on the requested page
    const skip = (page - 1) * pageSize;

    try {
      const result = await otherServices.getHelpdesk(pageSize, skip);

      return res.status(200).json({
        sucess: true,
        status: true,
        message: "HelpDesk List Retrived SucessFully",
        data: result,
      });
    } catch (err) {
      console.log(" Error in getHelpdesk ");
      return next(err);
    }
  },

  async getHelpdeskById(req, res, next) {

    const helpdeskId = req.params.helpdeskId

    
    try {
      const result = await otherServices.getHelpdeskById(helpdeskId);

      return res.status(200).json({
        sucess: true,
        status: true,
        message: "HelpDesk  Retrived SucessFully",
        data: result,
      });
    } catch (err) {
      console.log(" Error in getHelpdeskById ");
      return next(err);
    }
  },

  async updateHelpdesk(req, res, next) {
    const helpdeskId = req.params.helpdeskId;


    try {
      const result = await otherServices.updateHelpdesk(helpdeskId,req.body);

      const userId=result.userId;

      const user = await User.findById(userId);

    const mail = await adminService.sendMail("helpdesk",user.email,user.fullName,result.response??"We are working ");

      return res.status(200).json({
        sucess: true,
        status: true,
        message: "Helpdesk Updated SucessFully",
        data: result,
      });
    } catch (err) {
      console.log(" Error in updateHelpdesk ");
      return next(err);
    } 
  },



  //*************************************    Notification   ************************************** */

  async getNotification(req, res, next) {

    const page = parseInt(req.params.page) || 1;    // Get the requested page from query parameters (default to page 1)
    const pageSize = parseInt(req.params.pageSize); // Set the number of documents per page

    // Calculate the number of documents to skip based on the requested page
    const skip = (page - 1) * pageSize;

    try {
      const result = await otherServices.getNotification(pageSize, skip);

      return res.status(200).json({
        sucess: true,
        status: true,
        message: "getNotification List Retrived SucessFully",
        data: result,
      });
    } catch (err) {
      console.log(" Error in getNotification ");
      return next(err);
    }
  },

  async getNotificationById(req, res, next) {

    const Id = req.params.Id

    try {
      const result = await otherServices.getNotificationById(Id);

      return res.status(200).json({
        sucess: true,
        status: true,
        message: "Notification Retrived SucessFully",
        data: result,
      });
    } catch (err) {
      console.log(" Error in getNotificationById ");
      return next(err);
    }
  },

  async addNotification(req, res, next) {

    const notificationSchema = Joi.object({
      title: Joi.string().min(3).max(30).required(),
      message: Joi.string().min(3).max(300).required(), // Adjust min and max values based on your requirements
      image: Joi.required(),
    });

    const { error } = notificationSchema.validate(req.body);

    if (error) {
      return next(error);
    }

    try {
      const result = await otherServices.addNotification(req.body);
      
      return res.status(200).json({
        sucess: true,
        status: true,
        message: "Notification Added SucessFully",
        data: result,
      });
    } catch (err) {
      console.log(" Error in addNotification ");
      return next(err);
    }
  },

  async updateNotification(req, res, next) {
    const NotificationId = req.params.NotificationId;

    try {
      const result = await otherServices.updateNotification(NotificationId,req.body);

      return res.status(200).json({
        sucess: true,
        status: true,
        message: "Notification Updated SucessFully",
        data: result,
      });
    } catch (err) {
      console.log(" Error in updateNotification ");
      return next(err);
    } 
  },



  //*************************************    Package   ************************************** */

  async createPackage(req, res) {
    try {
      const packageData = req.body;
      if (packageData.packageFor === 'sponsorship') {
        if (packageData.price === 49) {
          packageData.maxImages = 1;
          packageData.maxVideos = 0;
          packageData.sponsorshipDetails = '1 Image';
        } else if (packageData.price === 99) {
          packageData.maxImages = 3;
          packageData.maxVideos = 0;
          packageData.sponsorshipDetails = '3 Images';
        } else if (packageData.price === 199) {
          packageData.maxImages = 5;
          packageData.maxVideos = 1;
          packageData.sponsorshipDetails = '5 Images + 1 Video';
        }
      }
      const newPackage = await otherServices.createPackage(packageData);
      return res.status(200).json({
        status: true,
        message: "Package created successfully",
        data: newPackage,
      });
    } catch (error) {
      return res.status(500).json({ message: 'Error creating package', error: error.message });
    }
  },


  async getPackages(req, res) {
    try {
      const packages = await otherServices.getPackages();
      return res.status(200).json({
        status: true,
        message: "Package retrived successfully",
        data: packages,
      });
    } catch (error) {
      return res.status(500).json({ message: 'Error fetching packages', error: error.message });
    }
  },
  

  async updatePackage(req, res) {
    const { id } = req.params;
    const updatedData = req.body;
    try {
      const updatedPackage = await otherServices.updatePackage(id, updatedData);
      if (!updatedPackage) {
        return res.status(404).json({ message: 'Package not found' });
      }
      return res.status(200).json({
        status: true,
        message: "Package Edited successfully",
        data: updatedPackage,
      });
    } catch (error) {
      return res.status(500).json({ message: 'Error updating package', error: error.message });
    }
  },
  async deletePackage(req, res) {
    const { id } = req.params;
    try {
      const deletedPackage = await otherServices.deletePackage(id);
      if (!deletedPackage) {
        return res.status(404).json({ message: 'Package not found' });
      }
      return res.status(200).json({
        status: true,
        message: "Package Deleted successfully",
        data: deletedPackage,
      });
    } catch (error) {
      return res.status(500).json({ message: 'Error deleting package', error: error.message });
    }
  },
  //*************************************    Banner   ************************************** */


  async addBanner(req, res, next) {

    const BannerSchema = Joi.object({
      title: Joi.string().min(3).max(30).required(),
      link: Joi.string().min(3).max(300).required(), // Adjust min and max values based on your requirements
      image: Joi.required(),
    });

    const { error } = BannerSchema.validate(req.body);

    if (error) {
      return next(error);
    }

    try {
      const result = await otherServices.addBanner(req.body);

      return res.status(200).json({
        sucess: true,
        status: true,
        message: "Banner Added SucessFully",
        data: result,
      });
    } catch (err) {
      console.log(" Error in addBanner ");
      return next(err);
    }
  },

  async getBanner(req, res, next) {
    try {
      const result = await otherServices.getBanner();

      return res.status(200).json({
        sucess: true,
        status: true,
        message: "Banner Retrived SucessFully",
        data: result,
      });
    } catch (err) {
      console.log(" Error in getBanner ");
      return next(err);
    }
  },

  async getBannerById(req, res, next) {

    const BannerId = req.params.BannerId

    try {
      const result = await otherServices.getBannerById(BannerId);

      return res.status(200).json({
        sucess: true,
        status: true,
        message: "Banner Retrived SucessFully",
        data: result,
      });
    } catch (err) {
      console.log(" Error in getBannerById ");
      return next(err);
    }
  },


  async updateBanner(req, res, next) {
    const BannerId = req.params.BannerId;

    try {
      const result = await otherServices.updateBanner(BannerId,req.body);

      return res.status(200).json({
        sucess: true,
        status: true,
        message: "Banner Updated SucessFully",
        data: result,
      });
    } catch (err) {
      console.log(" Error in updateBanner ");
      return next(err);
    } 
  },


    //*************************************    Coupon   ************************************** */

    async addCoupon(req, res, next) {

      const CouponSchema = Joi.object({
        couponName: Joi.string().required(), // Coupon name field
        title: Joi.string().required(), // Coupon name field
        description: Joi.string().required(), // Coupon name field
        fees: Joi.number().required(), // Assuming fees is a number
        offer: Joi.number().required(), // Assuming offer is a number
        discountType: Joi.string().valid('Percentage', 'Flat').required(), // Type can only be 'percentage' or 'flat'
        startDate: Joi.date().required(), // Start date field
        endDate: Joi.date().min(Joi.ref('startDate')).required() // End date field, and it must be greater than or equal to startDate
      });
  
      const { error } = CouponSchema.validate(req.body);
  
      if (error) {
        return next(error);
      }
  
      try {
        const result = await otherServices.addCoupon(req.body);
  
        return res.status(200).json({
          sucess: true,
          status: true,
          message: "Coupon Added SucessFully",
          data: result,
        });
      } catch (err) {
        console.log(" Error in addCoupon ");
        return next(err);
      }
    },

    async getCoupon(req, res, next) {
      try {

    const page = parseInt(req.params.page) || 1;    // Get the requested page from query parameters (default to page 1)
    const pageSize = parseInt(req.params.pageSize); // Set the number of documents per page

    // Calculate the number of documents to skip based on the requested page
    const skip = (page - 1) * pageSize;

        const result = await otherServices.getCoupon(pageSize,skip);
  
        return res.status(200).json({
          sucess: true,
          status: true,
          message: "Coupon Retrived SucessFully",
          data: result,
        });
      } catch (err) {
        console.log(" Error in getCoupon ");
        return next(err);
      }
    },

    async getCouponById(req, res, next) {

      const Id = req.params.Id
  
      try {
        const result = await otherServices.getCouponById(Id);
  
        return res.status(200).json({
          sucess: true,
          status: true,
          message: "Coupon Retrived SucessFully",
          data: result,
        });
      } catch (err) {
        console.log(" Error in getCouponById ");
        return next(err);
      }
    },

    async updateCoupon(req, res, next) {
      const Id = req.params.Id;
  
      try {
        const result = await otherServices.updateCoupon(Id,req.body);
  
        return res.status(200).json({
          sucess: true,
          status: true,
          message: "Coupon Updated SucessFully",
          data: result,
        });
      } catch (err) {
        console.log(" Error in updateCoupon ");
        return next(err);
      } 
    },
//*************************************    EntryFees   ************************************** */
async addEntryFees(req, res, next) {

  const EntryFeesSchema = Joi.object({
    initialteamLimit: Joi.number().min(1).max(30).required(),
    endteamLimit: Joi.number().min(1).max(300).required(), // Adjust min and max values based on your requirements
    fees: Joi.number().min(1).max(300).required(),
    
  });

  const { error } = EntryFeesSchema.validate(req.body);

  if (error) {
    return next(error);
  }

  try {
    const result = await otherServices.addEntryFees(req.body);

    return res.status(200).json({
      sucess: true,
      status: true,
      message: "EntryFees Added SucessFully",
      data: result,
    });
  } catch (err) {
    console.log(" Error in addEntryFees ");
    return next(err);
  }
},

async getallEntryFees(req, res, next) {
  try {
    const result = await otherServices.getallEntryFees();

    return res.status(200).json({
      sucess: true,
      status: true,
      message: "EntryFees Retrived SucessFully",
      data: result,
    });
  } catch (err) {
    console.log(" Error in getEntryFees ");
    return next(err);
  }
},

async getEntryFeesById(req, res, next) {

  const EntryFeesId = req.params.EntryFeesId

  try {
    const result = await otherServices.getEntryFeesById(EntryFeesId);

    return res.status(200).json({
      sucess: true,
      status: true,
      message: "EntryFees Retrived SucessFully",
      data: result,
    });
  } catch (err) {
    console.log(" Error in getEntryFeesById ");
    return next(err);
  }
},

async updateEntryFees(req, res, next) {
  const EntryFeesId = req.params.EntryFeesId;

  try {
    const result = await otherServices.updateEntryFees(EntryFeesId,req.body);

    return res.status(200).json({
      sucess: true,
      status: true,
      message: "EntryFees Updated SucessFully",
      data: result,
    });
  } catch (err) {
    console.log(" Error in updateEntryFees ");
    return next(err);
  } 
},


async getAllTransaction(req, res, next) {

  const page = parseInt(req.params.page) || 1;    // Get the requested page from query parameters (default to page 1)
  const pageSize = parseInt(req.params.pageSize); // Set the number of documents per page

  // Calculate the number of documents to skip based on the requested page
  const skip = (page - 1) * pageSize;

  try {
    const result = await otherServices.transactionHistory(pageSize, skip);

    return res.status(200).json({
      sucess: true,
      status: true,
      message: "TransactionHistory List Retrived SucessFully",
      data: result.history,
      count: result.totalCount,
    });
  } catch (err) {
    console.log(" Error in TransactionHistory ");
    return next(err);
  }
},

async getAllTransactionById(req, res, next) {

  const Id = req.params.Id

  try {
    const result = await otherServices.transactionHistoryById(Id);

    return res.status(200).json({
      sucess: true,
      status: true,
      message: "TransactionHistory List Retrived SucessFully",
      data: result,
    });
  } catch (err) {
    console.log(" Error in TransactionHistory ");
    return next(err);
  }
},

};

export default contentController;
