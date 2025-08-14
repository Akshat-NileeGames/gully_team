import CustomErrorHandler from "../helpers/CustomErrorHandler.js";
import jwtService from "../helpers/jwtService.js";
import { Admin } from "../models/index.js";

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
