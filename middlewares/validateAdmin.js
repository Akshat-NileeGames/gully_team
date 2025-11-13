import CustomErrorHandler from "../helpers/CustomErrorHandler.js";
import jwtService from "../helpers/jwtService.js";
import { Admin } from "../models/index.js";
/**
 * @description
 * Middleware responsible for validating admin authentication using JWT.
 * Ensures that only authorized administrators can access restricted routes.
 *
 * @workflow
 *  1. Extracts the Authorization token from request headers.
 *  2. Validates the JWT using the jwtService.
 *  3. Decodes admin credentials (email, phoneNumber) from the token payload.
 *  4. Attaches the admin’s email to the `req` object for use in controllers.
 *  5. Passes control to the next middleware or route handler if valid.
 *
 * @errorHandling
 *  - Returns 401 Unauthorized if:
 *      • Authorization header is missing
 *      • JWT verification fails (invalid or expired token)
 *
 * @note
 *  This middleware should be applied to all routes that require
 *  admin-level authentication or dashboard access.
 */

const validateAdmin = async function (req, res, next) {
  let authHeader = req.headers.authorization;

  if (!authHeader) {
    return next(CustomErrorHandler.unAuthorized());
  }
  const token = authHeader.split(" ")[1];
  console.log("Incoming token:", token);


  try {
    const { phoneNumber, email } = await jwtService.verify(token);
    console.log(email);
    req.email = email; // Attaching email to req object
    next();
  } catch (err) {
    console.log(err);
    return next(CustomErrorHandler.unAuthorized());
  }


};

export default validateAdmin;
