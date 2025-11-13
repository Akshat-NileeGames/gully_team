import CustomErrorHandler from "../helpers/CustomErrorHandler.js";
import jwtService from "../helpers/jwtService.js";
import { User } from "../models/index.js";
/**
 * @description
 * Middleware that validates and authenticates user requests using JWT tokens.
 * It ensures that only authorized users can access protected routes.
 *
 * @workflow
 *  1. Checks for the presence of an Authorization header.
 *  2. Extracts and verifies the JWT access token.
 *  3. Retrieves the corresponding user from the database.
 *  4. Prevents access if the user is banned or not found.
 *  5. Attaches user details (ID, email, phoneNumber, fcmToken) to both:
 *     - `req.user` for per-request use.
 *     - `global.user` for global reference across services.
 *  6. Proceeds to the next middleware if the user is authorized.
 *
 * @errorHandling
 *  - Returns 401 Unauthorized if:
 *      • Authorization header is missing
 *      • Token is invalid or expired
 *      • User does not exist
 *      • User account is currently banned
 *
 * @note
 *  This middleware must be applied to all routes that require
 *  user authentication. Automatically updates expired bans.
 */


const validateUser = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    console.log("Authorization header is missing");
    return next(CustomErrorHandler.unAuthorized("Authorization header is missing.")); 
  }

  const token = authHeader.split(" ")[1];

  try {
    const { userId, email } = await jwtService.verify(token);
    req.user = { userId, email };

    // Fetch the full user data, including phoneNumber
    const userData = await User.findOne({ _id: userId });
    if (!userData) {
      console.log("User not found");
      return next(CustomErrorHandler.unAuthorized("User not found"));
    }

    // Attach phone number to the user object
    req.user.phoneNumber = userData.phoneNumber;

    global.user = { userId: userId, email: email , fcmToken:userData.fcmToken||"" };
    
    if (userData.banStatus === "ban") {
      const currentDate = new Date();

      // Check if the ban has expired
      if (userData.banExpiresAt < currentDate) {
        userData.banStatus = "active";
        userData.banExpiresAt = null;
        await userData.save();
      } else {
        console.log("User is banned");
        return next(CustomErrorHandler.unAuthorized("You are banned"));
      }
    }

    // Proceed to the next middleware if the user is authorized
    next();

  } catch (err) {
    console.log("JWT verification error:", err);
    return next(CustomErrorHandler.unAuthorized("Invalid or expired token."));
  }
};
export default validateUser;


// DG
// const validateUser = async (req, res, next) =>{
//   const authHeader = req.headers.authorization;

//   if (!authHeader) {
//     console.log("Authorization header is missing");
//     return next(CustomErrorHandler.unAuthorized("Authorization header is missing.")); 
//   }

//   const token = authHeader.split(" ")[1];

//   try {
//     const { userId, email } = await jwtService.verify(token);
//     req.user = { userId, email };

//     // Check if the user is banned
//     const userData = await User.findOne({ _id: userId });
//     if (!userData) {
//       console.log("User not found");
//       return next(CustomErrorHandler.unAuthorized("User not found"));
//     }

//     global.user = { userId: userId, email: email , fcmToken:userData.fcmToken||"" };
    
//     if (userData.banStatus === "ban") {
//       const currentDate = new Date();

//       // Check if the ban has expired
//       if (userData.banExpiresAt < currentDate) {
//         userData.banStatus = "active";
//         userData.banExpiresAt = null;
//         await userData.save();
//       } else {
//         console.log("User is banned");
//         return next(CustomErrorHandler.unAuthorized("You are banned"));
//       }
//     }

//     // Proceed to the next middleware if the user is authorized
//     next();

//   } catch (err) {
//     console.log("JWT verification error:", err);
//     return next(CustomErrorHandler.unAuthorized("Invalid or expired token."));
//   }
// };

// export default validateUser;

// originalcode Nikhil
// const validateUser = async function (req, res, next) {
//   let authHeader = req.headers.authorization;

//   if (!authHeader) {
//     return next(CustomErrorHandler.unAuthorized());
//   }
//   const token = authHeader.split(" ")[1];

//   // console.log(token);

//   try {
//     const { userId, email } = await jwtService.verify(token);
//     // const user = {userId,email};
//     req.user = { userId, email };
//   // check user is banned or not 
//   let userData = await User.findOne({ _id: userId });

//   global.user = { userId: userId, email: email , fcmToken:userData.fcmToken||"" };
//   // req.user = {user, email};

//   if(userData.banStatus === 'ban'){

//     if(userData.banExpiresAt <  currentDate){
//       userData.banStatus = "active";
//       userData.banExpiresAt = null;
//       userData = await user.save();
//       }

//       if(userData.banStatus === 'active'){
//         next();
//       }else{
//         return next(CustomErrorHandler.unAuthorized("you are banned"));
//       }

//   }else{
//     next();
//   }

//   } catch (err) {
//     console.log(err);
//     return next(CustomErrorHandler.unAuthorized());
//   }
// };

// export default validateUser;

