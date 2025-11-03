import Joi from "joi";
import CustomErrorHandler from "../helpers/CustomErrorHandler.js";
import { User } from "../models/index.js";
import { userServices } from "../services/index.js";
// import Player from "../models/players.js";



import firebaseNotification from "../helpers/firebaseNotification.js";
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

const userController = {
  async createProfile(req, res, next) {
    //validation
    const UserSchema = Joi.object({
      nickName: Joi.string().min(3).max(30).required(),
      phoneNumber: Joi.number().integer().required().messages({
        'number.base': 'Invalid Contact Number', // Custom error message for non-number input
        'any.required': 'Contact number is required' // Custom error message for missing input
      }), // Adjust min and max values based on your requirements, // Adjust min and max values based on your requirements
      base64Image: Joi.required(),
      isNewUser: Joi.bool().optional(),
    });

    const { error } = UserSchema.validate(req.body);

    if (error) {
      return next(error);
    }
    try {
      // if (req.body.isNewUser === true) {
      //verify phone Number aready exist
      const phoneNumberExist = await User.exists({
        phoneNumber: req.body.phoneNumber,
        isPhoneNumberVerified: true,
        isDeleted: false,
        isNewUser: false,
      });

      if (phoneNumberExist) {
        return next(
          CustomErrorHandler.alreadyExist(
            "This Phone Number is already present."
          )
        );
      }
      // }

      const result = await userServices.createProfile(req.body);

      const otpExpiryMinutes = 10; // Adjust this to the desired expiry time in minutes
      const otpResonce = await userServices.senwwdOTP(
        result._id,
        req.body.phoneNumber,
        otpExpiryMinutes
      );
      console.log("otp responce", otpResonce);

      if (otpResonce) {
        console.log("otp responce data", otpResonce.data);
      }

      return res.status(200).json({
        sucess: true,
        message: "profile created suessfully",
        data: { user: result },
      });
    } catch (err) {
      console.log("Error in createProfile");
      return next(err);
    }
  },

  // async createProfile(req, res, next) {
  //   //validation
  //   const UserSchema = Joi.object({
  //     nickName: Joi.string().min(3).max(30).required(),
  //     phoneNumber: Joi.number().integer().required().messages({
  //       'number.base': 'Invalid Contact Number', // Custom error message for non-number input
  //       'any.required': 'Contact number is required' // Custom error message for missing input
  //     }), // Adjust min and max values based on your requirements, // Adjust min and max values based on your requirements
  //     base64Image: Joi.required(),
  //     isNewUser: Joi.bool().optional(),
  //   });

  //   const { error } = UserSchema.validate(req.body);

  //   if (error) {
  //     return next(error);
  //   }
  //   try {
  //     // if (req.body.isNewUser === true) {
  //     //verify phone Number aready exist
  //     const phoneNumberExist = await User.exists({
  //       phoneNumber: req.body.phoneNumber,
  //       isPhoneNumberVerified: true,
  //       isDeleted: false,
  //       isNewUser: false,
  //     });

  //     if (phoneNumberExist) {
  //       return next(
  //         CustomErrorHandler.alreadyExist(
  //           "This Phone Number is already present."
  //         )
  //       );
  //     }
  //     // }

  //     const result = await userServices.createProfile(req.body);

  //     const otpExpiryMinutes = 10; // Adjust this to the desired expiry time in minutes
  //     const otpResonce = await userServices.sendOTP(
  //       result._id,
  //       req.body.phoneNumber,
  //       otpExpiryMinutes
  //     );
  //     console.log("otp responce", otpResonce);

  //     if (otpResonce) {
  //       console.log("otp responce data", otpResonce.data);
  //     }

  //     return res.status(200).json({
  //       sucess: true,
  //       message: "profile created suessfully",
  //       data: { user: result },
  //     });
  //   } catch (err) {
  //     console.log("Error in createProfile");
  //     return next(err);
  //   }
  // },



  // Sheetal
  // async createProfile(req, res, next) {
  //   const UserSchema = Joi.object({
  //     nickName: Joi.string().min(3).max(30).required(),
  //     phoneNumber: Joi.string()
  //       .pattern(/^\d{10}$/)
  //       .required()
  //       .messages({
  //         "string.pattern.base": "Invalid Contact Number",
  //         "any.required": "Contact number is required",
  //       }),
  //     base64Image: Joi.required(),
  //   });

  //   const { error } = UserSchema.validate(req.body);

  //   if (error) {
  //     return next(error);
  //   }

  //   try {
  //     const result = await userServices.createProfile(req.body);

  //     return res.status(200).json({
  //       success: true,
  //       message: "Profile created successfully",
  //       data: result,
  //     });
  //   } catch (err) {
  //     console.log("Error in createProfile:", err.message);
  //     return next(err);
  //   }
  // },  


  // //old is code was commented
  // async createProfile(req, res, next) {
  //   //validation
  //   const UserSchema = Joi.object({
  //     nickName: Joi.string().min(3).max(30).required(),
  //     phoneNumber: Joi.number().integer().required().messages({
  //       'number.base': 'Invalid Contact Number', // Custom error message for non-number input
  //       'any.required': 'Contact number is required' // Custom error message for missing input
  //     }), // Adjust min and max values based on your requirements, // Adjust min and max values based on your requirements
  //     base64Image: Joi.required(),
  //     isNewUser: Joi.bool().optional(),
  //   });

  //   const { error } = UserSchema.validate(req.body);

  //   if (error) {
  //     return next(error);
  //   }
  //   try {
  //     // if (req.body.isNewUser === true) {
  //     //verify phone Number aready exist
  //     const phoneNumberExist = await User.exists({
  //       phoneNumber: req.body.phoneNumber,
  //       isPhoneNumberVerified: true,
  //       isDeleted: false,
  //       isNewUser: false,
  //     });

  //     if (phoneNumberExist) {
  //       return next(
  //         CustomErrorHandler.alreadyExist(
  //           "This Phone Number is already present."
  //         )
  //       );
  //     }
  //     // }

  //     const result = await userServices.createProfile(req.body);

  //     const otpExpiryMinutes = 10; // Adjust this to the desired expiry time in minutes
  //     const otpResonce = await userServices.sendOTP (
  //       result._id,
  //       req.body.phoneNumber,
  //       otpExpiryMinutes
  //     );
  //     console.log("otp responce", otpResonce);

  //     if (otpResonce) {
  //       console.log("otp responce data", otpResonce.data);
  //     }

  //     return res.status(200).json({
  //       sucess: true,
  //       message: "profile created suessfully",
  //       data: { user: result },
  //     });
  //   } catch (err) {
  //     console.log("Error in createProfile");
  //     return next(err);
  //   }
  // },

  //Sheetal
  async editProfile(req, res, next) {
    //validation
    const UserSchema = Joi.object({
      nickName: Joi.string().min(3).max(30).optional(),
      base64Image: Joi.optional(),
      fcmToken: Joi.optional(),
    });

    const { error } = UserSchema.validate(req.body);

    if (error) {
      return next(error);
    }
    try {
      const result = await userServices.editProfile(req.body);

      return res.status(200).json({
        sucess: true,
        message: "profile Edited successfully",
        data: { user: result },
      });
    } catch (err) {
      console.log(" Error in EditProfile ");
      return next(err);
    }
  },


  async deleteProfile(req, res, next) {
    // const userId = global.user.userId;
    const { userId } = req.params;
    try {

      const result = await userServices.deleteProfile();

      return res.status(200).json({
        sucess: true,
        message: "profile Deleted suessfully",
        data: { user: result },
      });
    } catch (err) {
      console.log(" Error in deleteProfile ");
      return next(err);
    }
  },

  async sendOTP(req, res, next) {
    const userId = global.user.userId;
    const phoneNumber = req.body.phoneNumber;
    const otpExpiryMinutes = 10; // Adjust this to the desired expiry time in minutes

    //validation
    const UserSchema = Joi.object({
      phoneNumber: Joi.string()
        .pattern(/^[6789]\d{9}$/)
        .required(),
    });

    const { error } = UserSchema.validate(req.body);

    if (error) {
      console.log("Error in sendOTP validation", error);
      return next(error);
    }
    try {
      const result = await userServices.sendOTP(
        userId,
        phoneNumber,
        otpExpiryMinutes
      );

      return res.status(200).json({
        success: true,
        message: "Otp Sent Successfully",
        data: { message: result },
      });
    } catch (err) {
      console.log(" Error in sendOTP ", err);
      return next(err);
    }
  },




  async verifyOTP(req, res, next) {
    //validation
    const OtpSchema = Joi.object({
      OTP: Joi.required(),
    });

    const { error } = OtpSchema.validate(req.body);

    if (error) {
      return next(error);
    }
    try {
      const result = await userServices.verifyOTP(req.body);

      return res.status(200).json({
        sucess: true,
        message: "Otp Verified SucessFully",
        data: { user: result },
      });
    } catch (err) {
      console.log(" Error in verifyOTP ");
      return next(err);
    }
  },

  async getProfile(req, res, next) {
    try {
      const result = await userServices.getProfile();
      return res.status(200).json({
        success: true,
        message: "User Retrieved Suessfully",
        data: result,
      });
    } catch (err) {
      console.log(" Error in  getProfile");
      return next(err);
    }
  },
  async getUser(req, res, next) {
    const user = Joi.object({ userId: Joi.string().required() });
    const { error } = user.validate(req.params);
    if (error) {
      return next(error);
    }
    try {
      const result = await userServices.getUser(req.params);
      return res.status(200).json({
        success: true,
        message: "User Retrieved Suessfully",
        data: { user: result },
      });
    } catch (err) {
      console.log(" Error in  getProfile");
      return next(err);
    }
  },

  async updateLocation(req, res, next) {
    try {
      const result = await userServices.updateLocation(req.body);
      return res.status(200).json({
        success: true,
        message: "User Location Updated Suessfully",
        data: result,
      });
    } catch (err) {
      console.log(" Error in  updateLocation");
      return next(err);
    }
  },

  async send(req, res, next) {
    try {
      const registrationToken =
        "dc5leCkoQ0Ss1kZpPc8BeS:APA91bFYABgUgFnQSTJ_QTvlPWmYGM7RMZd5Cr2RuI4BFQxyiYhI9B-cRbpE-6_xIHc0REErug1ntuud_gk8B1eP6tPi_D4Ht_qvtzcCrg23IQofyTrbkwE6Xx_TnhfOvQY6LNd7WwEw";
      const notificationData = {
        title: "Gully Team",
        body: "Custom Body",
        image: "",
      };

      const result = await firebaseNotification.sendToTopic("hello",
        notificationData
      );
      return res.status(200).json({
        success: true,
        message: "User Retrieved Suessfully",
        data: result,
      });
    } catch (err) {
      console.log(err);
      console.log(" Error in  getProfile");
      return next(err);
    }
  },

  async testapi(req, res, next) {
    try {
      const result = await userServices.testapi();
      return res.status(200).json({
        sucess: true,
        message: "User Retrieved Suessfully",
        data: result,
      });
    } catch (err) {
      console.log(" Error in  getProfile");
      return next(err);
    }
  },


};

export default userController;
