import CustomErrorHandler from "../helpers/CustomErrorHandler.js";
import jwtService from "../helpers/jwtService.js";
import { User } from "../models/index.js";

const authServices = {
  /**
 * @function googleLogin
 * @description Handles user authentication and registration through Google login.
 * If the user already exists, updates their login status, access token, and location (if provided).
 * If the user does not exist, creates a new account and generates an access token.
 * Also checks for user ban status and restores or restricts access accordingly.
 *
 * @param {Object} data - The login data provided by the client.
 * @param {string} data.fullName - The user's full name.
 * @param {string} [data.email] - The user's email address (optional if phone number is used).
 * @param {string} [data.phoneNumber] - The user's phone number (used as an alternative to email).
 * @param {Object} [data.coordinates] - Optional location data.
 * @param {number} data.coordinates.latitude - The latitude of the user's location.
 * @param {number} data.coordinates.longitude - The longitude of the user's location.
 * @param {string} data.coordinates.placeName - The name of the place for the given coordinates.
 *
 * @returns {Promise<Object>} Returns the authenticated or newly created user data with access token.
 *
 * @throws {CustomErrorHandler.validationError} If the user is banned and the ban period has not expired.
 * @throws {Error} For unexpected server or database errors during the authentication process.
 *
 * @example
 * const user = await authServices.googleLogin({
 *   fullName: "John Doe",
 *   email: "john@example.com",
 *   coordinates: { latitude: 12.9716, longitude: 77.5946, placeName: "Bangalore" },
 *   phoneNumber: "9876543210"
 * });
 */

  async googleLogin(data) {
    const { fullName, email, coordinates, phoneNumber } = data;

    const userInfo = global.user;
    //Find the user by ID

    let user;

    if (phoneNumber != null) {
      user = await User.findOne({ phoneNumber, isDeleted: false });
    } else {
      user = await User.findOne({ email, isDeleted: false });
    }

    if (user) {
      // If the user exists, update their tokens
      const accessToken = jwtService.sign(
        {
          email,
          userId: user._id,
          fullName: user.fullName,
        },
        {
          // never expires
          expiresIn: "12000s",
        }
      );

      user.accessToken = accessToken;
      user.isLogin = true;

      if (coordinates) {
        // If coordinates are provided, update the user's coordinates and add to locations
        const { latitude, longitude, placeName } = coordinates;
        user.location.coordinates = [
          parseFloat(longitude),
          parseFloat(latitude),
        ];
        user.location.selectLocation = placeName;
      }

      if (user.banStatus === "ban") {
        const currentDate = new Date();
        if (user.banExpiresAt < currentDate) {
          user.banStatus = "active";
          user.banExpiresAt = null;
          user = await user.save();
        }

        if (user.banStatus === "active") {
          return await user.save();
        } else {
          throw CustomErrorHandler.validationError(
            "You have been banned by the admin please contact administrator gullyteam33@gmail.com"
          );
        }
      }
      return await user.save();
    } else {
      const newUser = new User({
        fullName,
        email,
        phoneNumber,
        registrationDate: new Date(),
      });

      if (coordinates) {
        // If coordinates are provided, add them to the new user's profile
        const { latitude, longitude, placeName } = coordinates;
        newUser.location.coordinates = [
          parseFloat(longitude),
          parseFloat(latitude),
        ];
        newUser.location.selectLocation = placeName;
      }

      const accessToken = jwtService.sign(
        {
          email,
          fullName,
          userId: newUser._id,
        },
        "12000s"
      );

      newUser.accessToken = accessToken;
      const newUserData = await newUser.save();
      return newUserData;
    }
  },
};

export default authServices;
