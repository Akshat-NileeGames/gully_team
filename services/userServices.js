import axios from "axios";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { FAST_SMS_KEY, SENDER_ID, MESSAGE_ID } from "../config/index.js";
import CustomErrorHandler from "../helpers/CustomErrorHandler.js";
import jwtService from "../helpers/jwtService.js";
import { Admin, OTP, User, Team } from "../models/index.js";
import Player from "../models/players.js";


import ImageUploader from "../helpers/ImageUploader.js";
import firebaseNotification from "../helpers/firebaseNotification.js";

import RazorpayHandler from "../helpers/RazorPayHandler.js";

const userServices = {

  async createProfile(data) {
    const { base64Image, nickName, phoneNumber } = data;
    const userInfo = global.user;
    //Find the user by ID
    let user = await User.findById(userInfo.userId);

    if (!user) {
      // Handle the case where the user is not found
      throw CustomErrorHandler.notFound("User Not Found");
    }

    const imagePath = await ImageUploader.Upload(base64Image, "profile_photos");
    // Update the user's profilePhoto and nickname,phoneNumber fields with the S3 URL and nickname,phoneNumber
    user.profilePhoto = imagePath;
    user.nickName = nickName;
    user.phoneNumber = phoneNumber;

    // Save the updated user document
    user = await user.save();
    return user;
  },

  // async createProfile(data) {
  //   const { base64Image, nickName, phoneNumber } = data;
  //   // const userInfo = global.user;
  //   // //Find the user by ID
  //   // let user = await User.findById(userInfo.userId);

  //   // if (!user) {
  //   //   // Handle the case where the user is not found
  //   //   throw CustomErrorHandler.notFound("User Not Found");
  //   // }

  //   const imagePath = await ImageUploader.Upload(base64Image, "profile_photos");
  //   // Update the user's profilePhoto and nickname,phoneNumber fields with the S3 URL and nickname,phoneNumber
  //   user.profilePhoto = imagePath;
  //   user.nickName = nickName;
  //   user.phoneNumber = phoneNumber;

  //   // Save the updated user document
  //   user = await user.save();
  //   return user;
  // },
  // async createProfile(data) {
  //   const { base64Image, nickName, phoneNumber } = data;
  //   const userInfo = global.user;
  //   //Find the user by ID
  //   let user = await User.findById(userInfo.userId);

  //   if (!user) {
  //     // Handle the case where the user is not found
  //     throw CustomErrorHandler.notFound("User Not Found");
  //   }

  //   const imagePath = await ImageUploader.Upload(base64Image, "profile_photos");
  //   // Update the user's profilePhoto and nickname,phoneNumber fields with the S3 URL and nickname,phoneNumber
  //   user.profilePhoto = imagePath;
  //   user.nickName = nickName;
  //   user.phoneNumber = phoneNumber;

  //   // Save the updated user document
  //   user = await user.save();
  //   return user;
  // },

  //Sheetal
  // async createProfile(data) {
  //   const { base64Image, nickName, phoneNumber } = data;
  //   const userInfo = global.user;
  //   // Find the user by ID
  //   let user = await User.findById(userInfo.userId);
  //   if (!user) {
  //     throw CustomErrorHandler.notFound("User Not Found");
  //   }

  //   // Check if a player exists with this phoneNumber in the Player collection
  //   const player = await Player.findOne({ phoneNumber });

  //   if (player) {
  //     // Update the player document to reference the correct userId
  //     player.userId = user._id;
  //     await player.save();
  //   }

  //   // Update the user's profile in the User collection
  //   const imagePath = await ImageUploader.Upload(base64Image, "profile_photos");

  //   user.profilePhoto = imagePath;
  //   user.nickName = nickName;
  //   user.phoneNumber = phoneNumber;

  //   // Save the updated user document
  //   user = await user.save();

  //   return user;
  // },  
  // 
  //recent commented//
  // async createProfile(data) {
  //   const { base64Image, nickName, phoneNumber } = data;
  //   // const userInfo = global.user;
  //   // //Find the user by ID
  //   // let user = await User.findById(userInfo.userId);
  //   // if (!user) {

  //   //   // Handle the case where the user is not found
  //   //   throw CustomErrorHandler.notFound("User Not Found");
  //   // }
  //   const imagePath = await ImageUploader.Upload(base64Image, "profile_photos");
  //   // Update the user's profilePhoto and nickname,phoneNumber fields with the S3 URL and nickname,phoneNumber
  //   user.profilePhoto = imagePath;
  //   user.nickName = nickName;
  //   user.phoneNumber = phoneNumber;
  //   // Save the updated user document
  //   user = await user.save();

  //   return user;
  // },

  async editProfile(data) {
    const { base64Image, nickName, fcmToken } = data;
    const userInfo = global.user;

    //Find the user by ID
    let user = await User.findById(userInfo.userId);

    if (!user) {
      // Handle the case where the user is not found
      throw CustomErrorHandler.notFound("User Not Found");
    }

    if (base64Image) {
      const imagePath = await ImageUploader.Upload(
        base64Image,
        "profile_photos",
        user.profilePhoto
      );

      user.profilePhoto = imagePath;
    }

    if (nickName) {
      user.nickName = nickName;
    }

    // Update the user's profilePhoto and nickname,phoneNumber fields with the S3 URL and nickname,phoneNumber

    user.fcmToken = fcmToken;

    // Save the updated user document
    user = await user.save();
    return user;
  },

  async deleteProfile(userId) {
    //Find the user by ID
    const userInfo = global.user;
    let user = await User.findById(userInfo.userId);
    if (!user) {
      // Handle the case where the user is not found
      throw CustomErrorHandler.notFound("User Not Found");
    }

    user.isDeleted = true;
    user.email = crypto.randomBytes(10).toString("hex") + "@deleted.com";
    user.phoneNumber = crypto.randomBytes(10).toString("hex");

    // Save the updated user document
    user = await user.save();
    return user;
  },

  async sendOTP(userId, phoneNumber, otpExpiryMinutes) {
    const mode = "prod";
    const apiUrl = "https://www.fast2sms.com/dev/bulkV2";
    const apiKey = FAST_SMS_KEY;
    const otpLength = 5; // You can change this to the desired length of your OTP
    // Generate a random string of numeric characters
    const otp = Array.from(crypto.randomBytes(otpLength))
      .map((byte) => (byte % 10).toString())
      .join("")
      .slice(0, otpLength);

    const route = "dlt";

    const config = {
      params: {
        authorization: apiKey,
        sender_id: SENDER_ID,
        message: MESSAGE_ID,
        variables_values: otp,
        route: route,
        numbers: phoneNumber,
        flash: 0
      },

      headers: {
        "cache-control": "no-cache",
      },
    };

    const expiryTime = new Date();
    expiryTime.setMinutes(expiryTime.getMinutes() + otpExpiryMinutes);

    const otpexist = await OTP.findOne({ userId });

    if (otpexist) {
      if (otpexist.attempts > 2) {
        // Current date-time
        const currentDate = new Date();

        const expiredDate = otpexist.expiryTime;

        console.log("expiredDate  ", expiredDate);

        console.log("currentDate  ", currentDate);

        // Calculate the difference in milliseconds
        const timeDifference = currentDate.getTime() - expiredDate.getTime();

        // Convert the difference to hours
        const hoursDifference = timeDifference / (1000 * 60 * 60);

        console.log("hoursDifference  ", hoursDifference);

        if (hoursDifference > 5) {
          await OTP.updateOne({ _id: otpexist._id }, { attempts: 0 });
        } else {
          throw CustomErrorHandler.notFound("Maximum attempts exceeded");
        }
      }

      await OTP.updateOne(
        { _id: otpexist._id },
        { otp, expiryTime, $inc: { attempts: 1 } }
      );
    } else {
      // Store OTP and related data in MongoDB
      await OTP.create({ userId, otp, expiryTime });
    }
    try {
      if (mode == "prod") {
        const response = await axios.get(apiUrl, config);
        if (response) {
          // console.log("responce",response);
          return true;
        }
      } else {
        return true;
      }
      console.log(response);
    } catch (error) {
      console.log(error.response.data);
      console.log(error?.data?.message);
      console.log(error?.data);
      throw CustomErrorHandler.serverError(
        error?.response?.data?.message ?? "Phone Number not valid"
      );
    }
  },

  async verifyOTP(data) {
    console.log(data);
    const otp = data.OTP;
    const userInfo = global.user;
    const userId = userInfo.userId;
    const maxAttempts = 5;

    // Retrieve OTP data from MongoDB
    const otpData = await OTP.findOne({ userId });

    console.log(otpData);
    if (!otpData) {
      throw CustomErrorHandler.notFound("Invalid OTP or OTP expired");
    }

    const { attempts, expiryTime } = otpData;

    // Check if the number of attempts has reached the maximum limit
    if (attempts >= maxAttempts) {
      throw CustomErrorHandler.notFound("Maximum attempts exceeded");
    }

    // Verify OTP and Expiry Time
    if (otp === otpData.otp && new Date() <= new Date(expiryTime)) {
      // OTP is valid
      await OTP.deleteOne({ userId });
      let user = await User.findById(userInfo.userId);
      user.isNewUser = false;
      user.isPhoneNumberVerified = true;
      user.save();
      return user;
    } else {
      // Increment attempts in MongoDB
      await OTP.updateOne({ userId }, { $inc: { attempts: 1 } });
      throw CustomErrorHandler.notFound("Invalid OTP or OTP expired");
    }
  },

  async getProfile() {
    const userInfo = global.user;
    //Find the User
    let userData = await User.findOne({ _id: userInfo.userId });

    if (!userData) {
      // Handle the case where the user is not found
      throw CustomErrorHandler.notFound("User Not Found");
    }
    return userData;
  },
  async getUser(data) {
    const userInfo = data.userId;
    //Find the User
    let userData = await User.findOne({ _id: userInfo }, {
      fullName: 1,
      email: 1,
      phoneNumber: 1,
      isNewUser: 1,
      profilePhoto: 1,
      isOrganizer: 1,
    });

    if (!userData) {
      // Handle the case where the user is not found
      throw CustomErrorHandler.notFound("User Not Found");
    }
    console.log(userData);
    return userData;
  },

  async updateLocation(data) {
    const { latitude, longitude, placeName } = data;
    const userInfo = global.user;
    //Find the user by ID
    let user = await User.findById(userInfo.userId);

    if (!user) {
      // Handle the case where the user is not found
      throw CustomErrorHandler.notFound("User Not Found");
    }

    user.locations = [{ latitude, longitude, placeName }];
    // Save the updated user document
    user = await user.save();
    return user;
  },

  // ***********************    admin releated services     ****************************

  async getAllUser(pageSize, skip, search) {
    // Query to count the total number of subadmins
    const totalusers = await User.countDocuments();

    // Query to retrieve subadmins for the current page
    // const Users = await User.find()
    //   .skip(skip) // Skip the calculated number of documents
    //   .limit(pageSize) // Limit the number of documents per page
    //   .select('_id fullName nickName email profilePhoto createdAt isOrganizer isDeleted locations.placeName as placename ');

    const aggregationPipeline = [];

    // Match stage for search
    if (search) {
      aggregationPipeline.push({
        $match: {
          $or: [
            { fullName: { $regex: search, $options: "i" } },
            { phoneNumber: { $regex: search, $options: "i" } },
            { email: { $regex: search, $options: "i" } }
          ]
        }
      });
    }

    // Skip and Limit stages
    if (!search) {
      aggregationPipeline.push({ $skip: skip });
      aggregationPipeline.push({ $limit: pageSize });
    }

    aggregationPipeline.push({
      $project: {
        _id: 1,
        fullName: 1,
        isOrganizer: 1,
        isDeleted: 1,
        email: 1,
        createdAt: 1,
        profilePhoto: 1,
        nickName: 1,
        phoneNumber: 1,
        banStatus: 1,
        locations: { $arrayElemAt: ["$locations.placeName", 0] },
      },
    });



    const Users = await User.aggregate(aggregationPipeline);

    return {
      data: Users,
      count: totalusers,
    };
  },

  async getAllSubAdmin(pageSize, skip) {
    // Query to count the total number of subadmins
    const totalusers = await Admin.countDocuments();

    // Query to retrieve subadmins for the current page
    const Users = await Admin.find({ role: "subAdmin" })
      .skip(skip) // Skip the calculated number of documents
      .limit(pageSize)
      .select("_id email phoneNumber firstname lastname rights"); // Limit the number of documents per page

    const data = {
      data: Users,
      count: totalusers,
    };
    return data;
  },

  async getSubAdminById(userId) {
    //Find the Banner
    let SubAdminData = await Admin.findOne({ _id: userId }).select(
      "firstname lastname email role rights _id phoneNumber "
    );
    return SubAdminData;
  },

  async editUserStatus(userId, data) {
    let { action, duration } = data;

    if (action === "ban") {
      let currentDate = new Date();
      let DateTime = new Date(currentDate);

      if (duration === "24hr") {
        DateTime.setDate(currentDate.getDate() + 1); // 7 days from now
        duration = DateTime;
      } else if (duration === "7day") {
        DateTime.setDate(currentDate.getDate() + 7); // 7 days from now
        duration = DateTime;
      } else if (duration === "1month") {
        DateTime.setDate(currentDate.getDate() + 30); // 7 days from now
        duration = DateTime;
      }
    } else {
      duration = null;
    }

    //Find the user by ID
    let user = await User.findById(userId);

    if (!user) {
      // Handle the case where the user is not found
      throw CustomErrorHandler.notFound("User Not Found");
    }

    user.banStatus = action;
    user.banExpiresAt = duration;
    // Save the updated user document
    user = await user.save();
    return user;
  },

  async addSubAdmin(data) {
    let { email, password, phoneNumber, firstname } = data;

    const accessToken = jwtService.sign(
      {
        email,
        password,
        phoneNumber,
        firstname,
      },
      {
        // never expires
        expiresIn: "12000s",
      }
    );

    const hashedPassword = await bcrypt.hash(password, 10);

    // Create a new instance of the SubAdmin model
    const newSubAdmin = new Admin({
      firstname: data.firstname,
      lastname: data.lastname,
      email: data.email,
      phoneNumber: data.phoneNumber,
      password: hashedPassword,
      role: data.role,
      rights: data.rights,
      accessToken: accessToken,
    });

    // Save the new Match and wait for the operation to complete
    const subAdmin = await newSubAdmin.save();
    return subAdmin;
  },

  async editSubAdmin(userId, data) {
    let { firstname, lastname, email, phoneNumber, role, rights } = data;

    //Find the user by ID
    let subAdmin = await Admin.findById(userId);

    if (!subAdmin) {
      // Handle the case where the user is not found
      throw CustomErrorHandler.notFound("SubAdmin Not Found");
    }

    subAdmin.firstname = firstname;
    subAdmin.lastname = lastname;
    subAdmin.email = email;
    subAdmin.phoneNumber = phoneNumber;
    subAdmin.role = role;
    subAdmin.rights = rights;
    // Save the updated user document
    subAdmin = await subAdmin.save();
    return subAdmin;
  },

  async getUserCount() {
    //Find the Banner
    const totalusers = await User.countDocuments();
    return totalusers;
  },

  async getOrganizerCount() {
    //Find the Banner
    const totalusers = await User.countDocuments({ isOrganizer: true });
    return totalusers;
  },

  async testapi() {
    //const userInfo = global.user;
    const result = await RazorpayHandler.createOrder();

    return result;

  },


};

export default userServices;
