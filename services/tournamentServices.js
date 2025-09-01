import { Types } from "mongoose";
import CustomErrorHandler from "../helpers/CustomErrorHandler.js";
import {
  EntryForm,
  Match,
  RegisteredTeam,
  Team,
  Tournament,
  User,
  EliminatedTeam,
  Package,
  OrderHistory
} from "../models/index.js";
import nodemailer from "nodemailer";
import ImageUploader from "../helpers/ImageUploader.js";
import firebaseNotification from "../helpers/firebaseNotification.js";

import moment from "moment";
const tournamentServices = {

  async createTournament(data, userStartDate, userEndDate) {
    const userInfo = global.user;
    let coHostId1;
    let coHostId2;

    if (data.coHost1Phone) {
      const existingUser = await User.findOne({ phoneNumber: data.coHost1Phone });

      if (existingUser) {
        coHostId1 = existingUser._id;
      } else {
        const newUser = new User({
          fullName: data.coHost1Name || "",
          phoneNumber: data.coHost1Phone,
          registrationDate: new Date(),
        });

        const newUserData = await newUser.save();
        coHostId1 = newUserData._id;
      }
    }

    if (data.coHost2Phone) {
      const existingUser = await User.findOne({ phoneNumber: data.coHost2Phone });

      if (existingUser) {
        coHostId2 = existingUser._id;
      } else {
        const newUser = new User({
          fullName: data.coHost2Name || "",
          phoneNumber: data.coHost2Phone,
          registrationDate: new Date(),
        });

        const newUserData = await newUser.save();
        coHostId2 = newUserData._id;
      }
    }

    let imagePath = "";
    // if (data.coverPhoto) {
    //   imagePath = await ImageUploader.Upload(data.coverPhoto, "tournament");
    // }

    const tournament = new Tournament({
      tournamentStartDateTime: userStartDate,
      tournamentEndDateTime: userEndDate,
      tournamentName: data.tournamentName,
      tournamentCategory: { name: data.tournamentCategory },
      ballType: data.ballType ? { name: data.ballType } : { name: "rubber" },

      pitchType: { name: data.pitchType },
      email: userInfo.email,
      matchType: { name: data.matchType },
      tournamentPrize: { name: data.tournamentPrize },
      rules: data.rules,
      tournamentfor: data.tournamentfor,
      disclaimer: data.disclaimer,
      fees: data.fees,
      ballCharges: data.ballCharges,
      breakfastCharges: data.breakfastCharges,
      stadiumAddress: data.stadiumAddress,
      tournamentLimit: data.tournamentLimit,
      gameType: { name: data.gameType },
      coverPhoto: imagePath,
      locationHistory: {
        point: {
          coordinates: [parseFloat(data.longitude), parseFloat(data.latitude)],
        },
        selectLocation: data.selectLocation,
      },
      // eliminatedTeamIds: data.eliminatedTeamIds || [], // Added eliminatedTeamIds field
      user: userInfo.userId,
      coHostId1: coHostId1,
      coHostId2: coHostId2,
      authority: userInfo.userId,
      isActive: true, // Set active status to true during creation
    });

    const newTournament = await tournament.save();
    await newTournament.populate("user");

    const user = await User.findById(userInfo.userId);
    user.isOrganizer = true;
    const fcmToken = user.fcmToken;

    await user.save();

    return { newTournament, fcmToken };
  },

  async setSponsor(data) {
    const userInfo = global.user;
    const { tournamentId, PackageId } = data;

    try {
      const tour = await Tournament.findById(tournamentId);

      if (!tour) {
        throw new Error("Tournament not found");
      }

      tour.isSponsorshippurchase = true;
      tour.SponsorshipPackageId = PackageId;
      const purchasedPackage = await Package.findById(PackageId);
      const user = await User.findById(userInfo.userId);


      await tour.save();

      setTimeout(async () => {
        console.log("Sending email after 10 seconds...");
        const order = await OrderHistory.findOne({ tournamentId: tournamentId });
        console.log(order);
        const mail = await tournamentServices.sendMail("sponsorship", user, tour, order.orderId, purchasedPackage);
        console.log(mail);
      }, 10000);

      return tour;
    } catch (err) {
      console.log("Error updating sponsorship:", err);
      throw err;
    }
  },

  async sendMail(userFor = "", user, tour, orderId, purchasedPackage) {
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

    let mailOptions;
    mailOptions = {
      from: "gullyteam33@gmail.com",
      to: user.email,
      subject: "Sponsorship Invoice",
      html: `<!DOCTYPE html>
        <html lang="en">
        <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Invoice</title>
        <style>
        body {
        font-family: 'Arial', sans-serif;
        margin: 0;
            padding: 0;
            background-color: #f8f9fa;
            color: #333;
        }
        .invoice-container {
            width: 100%;
            margin: 0;
            background-color: #fff;
            box-shadow: 0 0 20px rgba(0, 0, 0, 0.1);
        }
        .invoice-header {
            background-color: #2c3e50;
            color: white;
            padding: 20px 40px;
            text-align: center;
        }
        .invoice-title {
            font-size: 28px;
            font-weight: bold;
            margin: 0;
        }
        .order-id {
            font-size: 16px;
            margin-top: 10px;
        }
        .invoice-body {
            padding: 30px 5px;
        }
        .company-customer {
            margin-bottom: 30px;
            width: 100%;
        }
        .company-info, .customer-info {
            width: 100%;
            margin-bottom: 20px;
        }
        .section-title {
            font-size: 16px;
            font-weight: bold;
            color: #2c3e50;
            margin-bottom: 10px;
            text-transform: uppercase;
            border-bottom: 2px solid #eee;
            padding-bottom: 5px;
        }
        .info-content {
            font-size: 14px;
            line-height: 1.6;
        }
        .tournament-info {
            background-color: #f8f9fa;
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 30px;
            border-left: 4px solid #2c3e50;
        }
        .tournament-name {
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 5px;
        }
        .item-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
        }
        .item-table th, .item-table td {
            padding: 12px;
            text-align: left;
            border: 1px solid #ddd;
        }
        .item-table th {
            background-color: #2c3e50;
            color: white;
            text-transform: uppercase;
            font-size: 14px;
        }
        .item-table td {
            font-size: 14px;
        }
        .total-section {
            background-color: #f8f9fa;
            padding: 20px;
            border-radius: 5px;
            margin-bottom: 30px;
        }
        .total-row {
            display: flex;
            justify-content: space-between;
            font-weight: bold;
        }
        .total-row.final {
            font-size: 18px;
            font-weight: bold;
            color: #2c3e50;
            border-top: 2px solid #ddd;
            padding-top: 15px;
            margin-top: 10px;
        }
        .invoice-footer {
            background-color: #f8f9fa;
            padding: 20px 40px;
            font-size: 14px;
            color: #666;
            border-top: 1px solid #eee;
        }
        .thank-you {
            text-align: center;
            margin-top: 20px;
            font-weight: bold;
            color: #2c3e50;
        }
        .contact-info {
            text-align: center;
            margin-top: 10px;
        }
        .contact-info a {
            color: #2c3e50;
            text-decoration: none;
        }
        .contact-info a:hover {
            text-decoration: underline;
        }
        @media print {
            body {
                background-color: #fff;
                padding: 0;
            }
            .invoice-container {
                box-shadow: none;
                width: 100%;
            }
        }
    </style>
</head>
<body>
    <div class="invoice-container">
        <div class="invoice-header">
            <h1 class="invoice-title">INVOICE</h1>
            <p class="order-id">Transaction ID: ${orderId}</p> <!-- Display Transaction ID -->
        </div>
        <div class="invoice-body">
            <div class="company-customer">
                <!-- Customer Info Section -->
                <div class="customer-info">
                    <div class="section-title">Bill To</div>
                    <div class="info-content">
                        <strong>Name: ${user.fullName || 'Customer Name'}</strong><br>
                        Phone: ${user.phoneNumber || 'Unknown Phone'}<br>
                        Email: ${user.email || 'Unknown Email'}
                    </div>
                </div>
            </div>

            <div class="tournament-info">
                <div class="tournament-name">Sponsorship for Tournament:</div>
                <div>${tour.tournamentName}</div>
            </div>

            <div class="section-title">Invoice Items</div>
            
            <!-- Invoice Items in Table -->
            <table class="item-table">
                <thead>
                    <tr>
                        <th>Description</th>
                        <th>Base Amount</th>
                        <th>GST (18%)</th>
                        <th>Total Amount</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>${purchasedPackage.name}</td>
                        <td>₹${(purchasedPackage.price * 0.82).toFixed(2)}</td>
                        <td>₹${(purchasedPackage.price * 0.18).toFixed(2)}</td>
                        <td>₹${purchasedPackage.price.toFixed(2)}</td>
                    </tr>
                </tbody>
            </table>

            <div class="total-section">
                <div class="total-row final">
                    <div>Total:</div>
                    <div>₹${purchasedPackage.price.toFixed(2)}</div>
                </div>
            </div>
        </div>

        <div class="invoice-footer">
            <!-- Company Info Section -->
            <div class="company-info">
                <div class="section-title">From</div>
                <div class="info-content">
                    <strong>Nilee Games and Future Technologies Pvt. Ltd</strong><br>
                    508, 5th, Fly Edge, Building, Swami Vivekananda Rd,<br>
                    Meghdoot, Hari Om Nagar, Borivali West,<br>
                    Mumbai, Maharashtra 400092<br>
                    Email: gullyteam33@gmail.com<br>
                </div>
            </div>

            <div class="thank-you">Thank you for your business!</div>
            <div class="contact-info">
                For any queries, please contact us at <a href="mailto:gullyteam33@gmail.com">gullyteam33@gmail.com</a>
            </div>
        </div>
    </div>
</body>
</html>
`,
    };

    transporter.sendMail(mailOptions, function (error, info) {
      if (error) {
        console.log(error);
      } else {
        console.log("Mail sent: " + info.response);
        return true;
      }
    });
  },



  async editTournament(data, userStartDate, userEndDate, tournamentId) {
    const userInfo = global.user;

    // Find the existing tournament by ID
    // const tournament = await Tournament.findById(tournamentId);
    let tournamentImage = await Tournament.findOne({ tournamentId });
    if (!tournamentId) {
      throw CustomErrorHandler.notFound("Tournament not found.");
    }

    // let imagePath;
    // if (data.coverPhoto) {
    //   // Handle image upload
    //   imagePath = await ImageUploader.Upload(data.coverPhoto, "tournament", tournament.coverPhoto);
    // } else {
    //   imagePath = tournament.coverPhoto; // Retain the existing cover photo if none provided
    // }

    let imagePath;
    if (data.coverPhoto) {
      imagePath = await ImageUploader.Upload(
        data.coverPhoto,
        "tournament",
        tournamentImage.coverPhoto,
      );
    } else {
      imagePath = tournamentImage.coverPhoto;
    }
    // let coHostId1 = tournament.coHostId1;
    // let coHostId2 = tournament.coHostId2;

    let coHostId1 = tournamentId.coHostId1;
    let coHostId2 = tournamentId.coHostId2;

    // Handle coHost1 update or creation
    if (data.coHost1Phone) {
      const existingUser = await User.findOne({ phoneNumber: data.coHost1Phone });
      if (existingUser) {
        coHostId1 = existingUser._id;
      } else {
        const newUser = new User({
          fullName: data.coHost1Name || "",
          phoneNumber: data.coHost1Phone,
          registrationDate: new Date(),
        });
        const newUserData = await newUser.save();
        coHostId1 = newUserData._id;
      }
    }

    // Handle coHost2 update or creation
    if (data.coHost2Phone) {
      const existingUser = await User.findOne({ phoneNumber: data.coHost2Phone });
      if (existingUser) {
        coHostId2 = existingUser._id;
      } else {
        const newUser = new User({
          fullName: data.coHost2Name || "",
          phoneNumber: data.coHost2Phone,
          registrationDate: new Date(),
        });
        const newUserData = await newUser.save();
        coHostId2 = newUserData._id;
      }
    }

    // Prepare updated data
    const updatedData = {
      tournamentStartDateTime: userStartDate,
      tournamentEndDateTime: userEndDate,
      tournamentName: data.tournamentName,
      tournamentCategory: { name: data.tournamentCategory },
      ballType: { name: data.ballType },
      pitchType: { name: data.pitchType },
      email: userInfo.email,
      matchType: { name: data.matchType },
      tournamentPrize: { name: data.tournamentPrize },
      rules: data.rules,
      disclaimer: data.disclaimer,
      fees: data.fees,
      ballCharges: data.ballCharges,
      breakfastCharges: data.breakfastCharges,
      stadiumAddress: data.stadiumAddress,
      tournamentLimit: data.tournamentLimit,
      gameType: { name: data.gameType },
      coverPhoto: imagePath,
      locationHistory: {
        point: {
          type: "Point",
          coordinates: [parseFloat(data.longitude), parseFloat(data.latitude)],
        },
        selectLocation: data.selectLocation,
      },
      // eliminatedTeamIds: data.eliminatedTeamIds || [], // Added eliminatedTeamIds field
      user: userInfo.userId,
      coHostId1: coHostId1,
      coHostId2: coHostId2,
      isSponsorshippurchase: false
    };

    // Update tournament data in the database
    const updatedTournament = await Tournament.findByIdAndUpdate(tournamentId, updatedData, {
      new: true,
    });

    if (!updatedTournament) {
      throw CustomErrorHandler.notFound("Tournament not found.");
    }

    // Send notifications to registered teams about the update
    const notificationData = {
      title: "Gully Team",
      body: `${updatedTournament.tournamentName} Tournament has been updated! Check the changes in the app.`,
      image: "",
    };

    const registeredTeams = await RegisteredTeam.find({
      tournament: tournamentId,
      status: "Accepted",
    });

    const notificationPromises = registeredTeams.map((team) => {
      if (team.user?.fcmToken) {
        return firebaseNotification.sendNotification(team.user.fcmToken, notificationData);
      }
    });

    try {
      await Promise.all(notificationPromises);
      console.log("Notifications sent successfully.");
    } catch (error) {
      console.error("Error sending notifications:", error);
    }

    return updatedTournament;
  },

  // async editTournament(data, userStartDate, userEndDate, TournamentId) {
  //   const userInfo = global.user;

  // let tournamentImage = await Tournament.findOne({ TournamentId });

  // let imagePath;
  // if (data.coverPhoto) {
  //   imagePath = await ImageUploader.Upload(
  //     data.coverPhoto,
  //     "tournament",
  //     tournamentImage.coverPhoto,
  //   );
  // } else {
  //   imagePath = tournamentImage.coverPhoto;
  // }

  //   let coHostId1;
  //   let coHostId2;

  //   if (data.coHost1Phone) {
  //     const existingUser = await User.exists({
  //       phoneNumber: data.coHost1Phone,
  //     });

  //     if (existingUser) {
  //       coHostId1 = existingUser._id;
  //     } else {
  //       const newUser = new User({
  //         fullName: data.coHost1Name,
  //         phoneNumber: data.coHost1Phone,
  //         registrationDate: new Date(),
  //       });

  //       const newUserData = await newUser.save();
  //       coHostId1 = newUserData._id;
  //     }
  //   }

  //   if (data.coHost2Phone) {
  //     const existingUser = await User.exists({
  //       phoneNumber: data.coHost2Phone,
  //     });

  //     if (existingUser) {
  //       coHostId2 = existingUser._id;
  //     } else {
  //       const newUser = new User({
  //         fullName: data.coHost2Name,
  //         phoneNumber: data.coHost2Phone,
  //         registrationDate: new Date(),
  //       });

  //       const newUserData = await newUser.save();
  //       coHostId2 = newUserData._id;
  //     }
  //   }

  //   // Update data
  //   const updatedData = {
  //     tournamentStartDateTime: userStartDate,
  //     tournamentEndDateTime: userEndDate,
  //     tournamentName: data.tournamentName,
  //     tournamentCategory: { name: data.tournamentCategory },
  //     ballType: { name: data.ballType },
  //     pitchType: { name: data.pitchType },
  //     email: userInfo.email,
  //     matchType: { name: data.matchType },
  //     tournamentPrize: { name: data.tournamentPrize },
  //     rules: data.rules,
  //     disclaimer: data.disclaimer,
  //     fees: data.fees,
  //     ballCharges: data.ballCharges,
  //     breakfastCharges: data.breakfastCharges,
  //     stadiumAddress: data.stadiumAddress,
  //     tournamentLimit: data.tournamentLimit,
  //     gameType: { name: data.gameType },
  //     coverPhoto: imagePath,
  //     locationHistory: {
  //       point: {
  //         type: "Point",
  //         coordinates: [parseFloat(data.longitude), parseFloat(data.latitude)],
  //       },
  //       selectLocation: data.selectLocation,
  //     },
  //     user: userInfo.userId,
  //     coHostId1: coHostId1,
  //     coHostId2: coHostId2,
  //   };

  //   // Use findByIdAndUpdate to update the tournament
  //   const updatedTournament = await Tournament.findByIdAndUpdate(
  //     TournamentId,
  //     updatedData,
  //     { new: true },
  //   );

  //   // Check if the tournament was found and updated
  //   if (!updatedTournament) {
  //     // Handle the case where the tournament is not found
  //     throw CustomErrorHandler.notFound("Tournament Not Found");
  //   }

  //   //notification
  //   const notificationData = {
  //     title: "Gully Team",
  //     body: `${tournamentImage.tournamentName} Tournament has been Change.! please check your email for more details.`,
  //     image: "",
  //   };

  //   const notificationPromises = [];

  //   //find all the registere Team in that tournament to notify about change in tournament.
  //   const registeredTeam = await RegisteredTeam.find({
  //     tournament: TournamentId,
  //     status: "Accepted",
  //   });

  //   registeredTeam.forEach(async function (team) {
  //     if (team && team.user && team.user.fcmToken) {
  //       notificationPromises.push(
  //         firebaseNotification.sendNotification(
  //           team?.user?.fcmToken,
  //           notificationData,
  //         ),
  //       );
  //     }
  //   });

  //   try {
  //     await Promise.all(notificationPromises);
  //     console.log("Notifications sent successfully");
  //   } catch (error) {
  //     console.error("Error sending notifications:", error);
  //   }

  //   return updatedTournament;
  // },

  async getTournament(data) {
    const { latitude, longitude, startDate, filter } = data;

    console.log("startDate", startDate);
    let startDateTime, endDateTime;

    let currentDate = new Date();
    let formattedDate = currentDate.toISOString().split("T")[0];

    let checkcondition = false;

    if (filter === "past") {
      // If startDate and endDate are not provided, get tournaments for the past 7 days, current date, and future 7 days
      startDateTime = new Date(`${formattedDate}T00:00:00.000Z`);
      startDateTime.setDate(startDateTime.getDate() - 7);

      endDateTime = new Date(`${formattedDate}T23:59:59.999Z`);
    } else if (filter === "upcoming") {
      // If startDate and endDate are not provided, get tournaments for the past 7 days, current date, and future 7 days
      startDateTime = new Date(`${formattedDate}T00:00:00.000Z`);
      startDateTime.setDate(startDateTime.getDate());

      endDateTime = new Date(`${formattedDate}T23:59:59.999Z`);
      endDateTime.setDate(endDateTime.getDate() + 7);
    } else if (startDate) {
      checkcondition = true;

      startDateTime = new Date(`${startDate}T00:00:00.000Z`);
      endDateTime = new Date(`${startDate}T23:59:59.999Z`);
      // endDateTime.setDate(endDateTime.getDate() - 1);
    } else {
      startDateTime = new Date(`${formattedDate}T00:00:00.000Z`);
      endDateTime = new Date(`${formattedDate}T23:59:59.999Z`);
    }

    //     let currentDate = new Date();
    // let formattedDate = currentDate.toISOString().split('T')[0];
    //     }
    //     startDateTime = new Date(`${formattedDate}T00:00:00.000Z`);
    //     //to get tournament of same day i am convertin enddate to the same date
    //     endDateTime = new Date(`${formattedDate}T23:59:59.999Z`);
    //     endDateTime.setDate(endDateTime.getDate() -1);

    console.log("startDateTime", startDateTime);
    console.log("endDateTime", endDateTime);
    console.log("latitude", latitude);
    console.log("longitude", longitude);

    let orCondition = [
      {
        tournamentStartDateTime: {
          $gte: startDateTime,
          $lt: endDateTime,
        },
      },
      {
        tournamentEndDateTime: {
          $gte: startDateTime,
          $lt: endDateTime,
        },
      },
    ];

    // for current Tournament
    // Condition to use $or or an empty array based on a certain condition
    if (checkcondition || filter == "current") {
      orCondition = [
        {
          tournamentStartDateTime: {
            $lte: startDateTime,
          },
          tournamentEndDateTime: {
            $gte: endDateTime,
          },
        },
      ];
    }

    // for Past Tournament
    // if ( filter=="past") {
    //   orCondition = [
    //     {
    //       tournamentStartDateTime: {
    //         $lt: endDateTime,
    //       },
    //     },
    //   ];
    // }

    let tournament_data = await Tournament.aggregate([
      {
        $geoNear: {
          near: {
            type: "Point",
            coordinates: [longitude, latitude],
          },
          distanceField: "distance",
          spherical: true,
          // maxDistance: parseFloat(10) * 10000, // Convert kilometers to meters 10km * 1000m
          query: {
            isDeleted: false,
            isActive: true,
            $or: orCondition,
            // $or: [
            //   {
            //     tournamentStartDateTime: {
            //       $gte: startDateTime,
            //       $lt: endDateTime,
            //     },
            //   },
            //   {
            //     tournamentEndDateTime: {
            //       $gte: startDateTime,
            //       $lt: endDateTime,
            //     },
            //   },

            //   {
            //     tournamentStartDateTime: {
            //       $lte: startDateTime, // Start date is less than or equal to the current date
            //     },
            //     tournamentEndDateTime: {
            //       $gte: endDateTime, // End date is greater than or equal to the current date
            //     },
            //   },
            // ],
          },
          // key: "locationHistory.currentLocation.coordinates",
        },
      },
      {
        $addFields: {
          distanceInKm: {
            $divide: ["$distance", 1000],
          },
        },
      },
      {
        $match: {
          distanceInKm: { $lt: 10 }, // Adjust as needed 3000 meaks 3km
        },
      },
      {
        $lookup: {
          from: "registeredteams",
          foreignField: "tournament",
          localField: "_id",
          as: "registeredTeams",
        },
      },
      {
        $addFields: {
          //It is Accepted Team Count
          registeredTeamsCount: {
            $size: {
              $filter: {
                input: "$registeredTeams",
                as: "registeredTeam",
                cond: { $eq: ["$$registeredTeam.status", "Accepted"] },
              },
            },
          },
          pendingTeamsCount: {
            $size: {
              $filter: {
                input: "$registeredTeams",
                as: "registeredTeam",
                cond: { $eq: ["$$registeredTeam.status", "Pending"] },
              },
            },
          },

          // isFull:
          //   $gte: ["$tournamentLimit", { $size: "$registeredTeams" }],
          // },
          timeLeft: {
            $max: [
              0,
              {
                $ceil: {
                  $divide: [
                    {
                      $subtract: ["$tournamentStartDateTime", new Date()],
                    },
                    1000 * 60 * 60 * 24, // Convert milliseconds to days
                  ],
                },
              },
            ],
          },
        },
      },
      {
        $lookup: {
          from: "matches",
          foreignField: "tournament",
          localField: "_id",
          as: "matches",
          pipeline: [
            {
              $match: {
                dateTime: {
                  $gte: startDateTime,
                  $lt: endDateTime,
                },
              },
            },
            {
              $lookup: {
                from: "teams",
                foreignField: "_id",
                localField: "team1",
                as: "team1",
              },
            },
            {
              $lookup: {
                from: "tournaments",
                foreignField: "_id",
                localField: "tournament",
                as: "tournament",
              },
            },
            {
              $lookup: {
                from: "teams",
                foreignField: "_id",
                localField: "team2",
                as: "team2",
              },
            },
            {
              $addFields: {
                "team1.players": [],
                "team2.players": [],
              },
            },
            {
              $unwind: {
                path: "$team1",
                preserveNullAndEmptyArrays: true,
              },
            },
            {
              $unwind: {
                path: "$team2",
                preserveNullAndEmptyArrays: true,
              },
            },
            {
              $unwind: {
                path: "$tournament",
                preserveNullAndEmptyArrays: true,
              },
            },
            {
              $addFields: {
                tournamentName: "$tournament.tournamentName",
                tournamentId: "$tournament._id",
              },
            },
            {
              $project: {
                tournament: 0,
              },
            },
          ],
        },
      },
      {
        $lookup: {
          from: "users",
          foreignField: "_id",
          localField: "user",
          as: "user",
          pipeline: [
            {
              $project: {
                _id: 1,
                fullName: 1,
                phoneNumber: 1,
              },
            },
          ],
        },
      },
      {
        $unwind: {
          path: "$user",
          preserveNullAndEmptyArrays: true,
        },
      },

      {
        $addFields: {
          organizerName: "$user.fullName",
          phoneNumber: "$user.phoneNumber",
        },
      },
      {
        $sort: {
          tournamentStartDateTime: 1, // Sort by fieldName1 in ascending order
          // fieldName2: -1 // Sort by fieldName2 in descending order
        },
      },
      // {
      //   $project: {
      //     distance: 0,
      //   },
      // },
    ]);
    // console.log("tournament_data", tournament_data);

    const matches = tournament_data.map((tournament) => tournament.matches);
    return { tournament_data, matches: matches.flat(1) };
  },

  async getTournamentByName(query) {
    let tournament_data = await Tournament.aggregate([
      {
        $match: {
          $text: { $search: query },
        },
      },
      {
        $match: {
          //user: new Types.ObjectId(userInfo.userId),
          isDeleted: false,
          isCompleted: false,
          isActive: true,
          //tournamentEndDateTime: { $gt: currentDate },
        },
      },
      {
        $lookup: {
          from: "registeredteams",
          foreignField: "tournament",
          localField: "_id",
          as: "registeredTeams",
        },
      },
      {
        $addFields: {
          //It is Accepted Team Count
          registeredTeamsCount: {
            $size: {
              $filter: {
                input: "$registeredTeams",
                as: "registeredTeam",
                cond: { $eq: ["$$registeredTeam.status", "Accepted"] },
              },
            },
          },
          pendingTeamsCount: {
            $size: {
              $filter: {
                input: "$registeredTeams",
                as: "registeredTeam",
                cond: { $eq: ["$$registeredTeam.status", "Pending"] },
              },
            },
          },

          // isFull:
          //   $gte: ["$tournamentLimit", { $size: "$registeredTeams" }],
          // },
          timeLeft: {
            $max: [
              0,
              {
                $ceil: {
                  $divide: [
                    {
                      $subtract: ["$tournamentStartDateTime", new Date()],
                    },
                    1000 * 60 * 60 * 24, // Convert milliseconds to days
                  ],
                },
              },
            ],
          },
        },
      },

      {
        $lookup: {
          from: "users",
          foreignField: "_id",
          localField: "user",
          as: "user",
          pipeline: [
            {
              $project: {
                _id: 1,
                fullName: 1,
                phoneNumber: 1,
              },
            },
          ],
        },
      },
      {
        $unwind: {
          path: "$user",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          organizerName: "$user.fullName",
          phoneNumber: "$user.phoneNumber",
        },
      },
      // {
      //   $project: {
      //     distance: 0,
      //   },
      // },
      // Other stages of your aggregation pipeline
    ]);

    return tournament_data;
  },
  //to get current Tournament Created by organizer
  async getCurrentTournamentByOrganizer() {
    let userInfo = global.user;
    const currentDate = new Date();

    let TournamentData = await Tournament.aggregate([
      {
        $match: {
          $or: [
            { user: new Types.ObjectId(userInfo.userId) },
            { coHostId1: new Types.ObjectId(userInfo.userId) },
            { coHostId2: new Types.ObjectId(userInfo.userId) }, // New condition for coHostId2
          ],
          isDeleted: false,
          isCompleted: false,
          isActive: true,
          tournamentEndDateTime: { $gt: currentDate },
        },
      },
      {
        $lookup: {
          from: "registeredteams",
          foreignField: "tournament",
          localField: "_id",
          as: "registeredTeams",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "user",
          foreignField: "_id",
          as: "user",
          pipeline: [
            {
              $project: {
                _id: 1,
                fullName: 1,
                phoneNumber: 1,
              },
            },
          ],
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "coHostId1",
          foreignField: "_id",
          as: "coHost1",
          pipeline: [
            {
              $project: {
                _id: 1,
                fullName: 1,
                phoneNumber: 1,
              },
            },
          ],
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "coHostId2",
          foreignField: "_id",
          as: "coHost2",
          pipeline: [
            {
              $project: {
                _id: 1,
                fullName: 1,
                phoneNumber: 1,
              },
            },
          ],
        },
      },
      {
        $unwind: {
          path: "$user",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $unwind: {
          path: "$coHost1",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $unwind: {
          path: "$coHost2",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          //It is Accepted Team Count
          registeredTeamsCount: {
            $size: {
              $filter: {
                input: "$registeredTeams",
                as: "registeredTeam",
                cond: { $eq: ["$$registeredTeam.status", "Accepted"] },
              },
            },
          },
          pendingTeamsCount: {
            $size: {
              $filter: {
                input: "$registeredTeams",
                as: "registeredTeam",
                cond: { $eq: ["$$registeredTeam.status", "Pending"] },
              },
            },
          },
        },
      },
    ]);

    if (!TournamentData) {
      // Handle the case where the user is not found
      throw CustomErrorHandler.notFound("Team Not Found");
    }
    return TournamentData;
  },
  //to get all Tournament Created by organizer
  async getAllTournamentByOrganizer() {
    let userInfo = global.user;
    console.log("User ID from Token:", userInfo.userId);  // Log userId

    const currentDate = new Date();

    let TournamentData = await Tournament.aggregate([
      // {
      //   $match: {
      //     $or: [
      //       { user: ObjectId("userId_here") },
      //       { coHostId1: ObjectId("userId_here") },
      //       { coHostId2: ObjectId("userId_here") }
      //     ],
      //     isDeleted: false
      //   }
      // },

      {
        $match: {
          $or: [
            { user: new Types.ObjectId(userInfo.userId) },
            { coHostId1: new Types.ObjectId(userInfo.userId) },
            { coHostId2: new Types.ObjectId(userInfo.userId) }, // New condition for coHostId2
          ],
          isDeleted: false,
          // isCompleted: false,
          // isActive: true,
          // tournamentEndDateTime: { $gt: currentDate },
        },
      },
      {
        $lookup: {
          from: "registeredteams",
          foreignField: "tournament",
          localField: "_id",
          as: "registeredTeams",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "user",
          foreignField: "_id",
          as: "user",
          pipeline: [
            {
              $project: {
                _id: 1,
                fullName: 1,
                phoneNumber: 1,
              },
            },
          ],
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "coHostId1",
          foreignField: "_id",
          as: "coHost1",
          pipeline: [
            {
              $project: {
                _id: 1,
                fullName: 1,
                phoneNumber: 1,
              },
            },
          ],
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "coHostId2",
          foreignField: "_id",
          as: "coHost2",
          pipeline: [
            {
              $project: {
                _id: 1,
                fullName: 1,
                phoneNumber: 1,
              },
            },
          ],
        },
      },
      {
        $unwind: {
          path: "$user",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $unwind: {
          path: "$coHost1",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $unwind: {
          path: "$coHost2",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          //It is Accepted Team Count
          registeredTeamsCount: {
            $size: {
              $filter: {
                input: "$registeredTeams",
                as: "registeredTeam",
                cond: { $eq: ["$$registeredTeam.status", "Accepted"] },
              },
            },
          },
          pendingTeamsCount: {
            $size: {
              $filter: {
                input: "$registeredTeams",
                as: "registeredTeam",
                cond: { $eq: ["$$registeredTeam.status", "Pending"] },
              },
            },
          },
        },
      },
    ]);

    if (!TournamentData) {
      // Handle the case where the user is not found
      throw CustomErrorHandler.notFound("Team Not Found");
    }
    return TournamentData;
  },

  async deleteTournament(TournamentId) {
    // Find the tournament by ID
    const tournament = await Tournament.findById(TournamentId);

    if (!tournament) {
      // Handle the case where the tournament is not found
      throw CustomErrorHandler.notFound("tournament Not Found");
    }

    // Update the tournament's isDeleted is true;
    tournament.isDeleted = true;
    // Save the updated user document
    let tournamentdata = await tournament.save();
    return tournamentdata;
  },


  async createEntryForm(teamID, tournamentID) {
    const userInfo = global.user;

    // Fetch the team details
    const team = await Team.findById(teamID);

    if (team.players.length < 11) {
      throw CustomErrorHandler.badRequest("Team Member is Insufficient");
    }

    // Create a new entry form
    const entryForm = new EntryForm({
      captainId: userInfo.userId,
      team: teamID,
    });

    // Check if the team already exists in the tournament
    const teamExist = await RegisteredTeam.exists({
      team: teamID,
      tournament: tournamentID,
    });

    if (teamExist) {
      const registeredTeam = await RegisteredTeam.findOne({
        tournament: tournamentID,
        team: teamID,
        status: "Denied",
      });

      if (registeredTeam) {
        registeredTeam.status = "Pending";
        await registeredTeam.save();
      } else {
        throw CustomErrorHandler.badRequest("Team Already Exist");
      }
    } else {
      const registeredTeam = new RegisteredTeam({
        team: teamID,
        user: userInfo.userId,
        tournament: tournamentID,
      });

      await registeredTeam.save();
      await entryForm.save();
    }

    // Send notification to the tournament organizer
    const tournament = await Tournament.findById(tournamentID);
    const userId = tournament.user._id;
    console.log("User id:", userId);
    const user = await User.findOne({ _id: userId });
    if (!user) {
      throw CustomErrorHandler.notFound("User not found.");
    }
    const fcmToken = user.fcmToken;
    console.log("Organizer FCM Token:", fcmToken);
    if (fcmToken) {
      const notificationData = {
        title: "Gully Team",
        body: `${team.teamName} has sent you a join request for the ${tournament.tournamentName} tournament.`,
      };

      console.log("Sending notification to organizer with token:", user.fcmToken);  // Log the FCM token

      try {
        const response = await firebaseNotification.sendNotification(fcmToken, notificationData);
        console.log("Notification sent to the organizer successfully:", response);
      } catch (error) {
        console.error("Error sending notification:", error);
      }
    } else {
      console.error("No FCM token found for the organizer.");
    }

    return entryForm;
  },


  // async createEntryForm(teamID, tournamentID) {
  //   const userInfo = global.user;

  //   const team = await Team.findById(teamID);

  //   console.log(team.players.length);

  //   if (team.players.length < 11) {
  //     throw CustomErrorHandler.badRequest("Team Member is Insufficient");
  //   }

  //   const entryForm = new EntryForm({
  //     captainId: userInfo.userId,
  //     team: teamID,
  //   });

  //   // Save the new HelpdeskTicket and wait for the operation to complete

  //   // const tournament = await Tournament.findById(tournamentID);

  //   const teamExist = a wait RegisteredTeam.exists({
  //     team: teamID,
  //     tournament: tournamentID,
  //   });

  //   if (teamExist) {
  //     const registeredTeam = await RegisteredTeam.findOne({
  //       tournament: tournamentID,
  //       team: teamID,
  //       status: "Denied",
  //     });

  //     if (registeredTeam) {
  //       registeredTeam.status = "Pending";
  //       registeredTeam.save();
  //     } else {
  //       throw CustomErrorHandler.badRequest("Team Already Exist");
  //     }
  //   } else {
  //     const registeredTeam = new RegisteredTeam({
  //       team: teamID,
  //       user: userInfo.userId,
  //       tournament: tournamentID,
  //     });

  //     await registeredTeam.save();
  //     await entryForm.save();
  //   }
  //   return entryForm;
  // },

  async teamRequest(tournamentID, status) {
    const userInfo = global.user;

    const tournament_data = await RegisteredTeam.find({
      tournament: tournamentID,
      status: status,
      // isEliminated:false,
    });

    return { tournament_data };
  },

  async updateTeamRequest(teamID, tournamentID, action) {
    const userInfo = global.user;

    const registeredTeam = await RegisteredTeam.findOne({
      tournament: tournamentID,
      team: teamID,
      status: "Pending",
    });

    const tournament = await Tournament.findById(tournamentID);

    if (tournament?.authority != userInfo.userId) {
      throw CustomErrorHandler.badRequest("You do not have permission.");
    }

    if (!registeredTeam) {
      // Handle the case where the user is not found
      throw CustomErrorHandler.notFound("tournament or team Not Found");
    }
    const acceptedTeamCount = await RegisteredTeam.count({
      tournament: tournamentID,
      status: "Accepted",
    });

    if (action == "Accepted") {
      if (acceptedTeamCount >= registeredTeam.tournament.tournamentLimit) {
        throw CustomErrorHandler.notFound("Tournament Already Full.");
      }
    }

    registeredTeam.status = action;
    registeredTeam.save();

    //notification

    const captainUserId = registeredTeam.user._id.toString();

    const user = await User.findOne({ _id: captainUserId }).select("fcmToken");
    console.log("User FMC Token", user.fcmToken);
    if (user) {
      if (user?.fcmToken) {
        const notificationData = {
          title: "Gully Team",
          body: `${action == "Accepted" ? "Congratulations!" : "Oops !"} Your registration for the ${tournament?.tournamentName} tournament is ${action}.🏆`,
          image: "",
        };

        await firebaseNotification.sendNotification(
          user?.fcmToken,
          notificationData,
        );
      }
    }

    return registeredTeam;
  },

  async getCount() {
    const userInfo = global.user;

    // Fetch all tournaments
    const allTournaments = await Tournament.find({
      user: userInfo.userId,
      isDeleted: false,
      isCompleted: false,
      isActive: true,
    });

    // Iterate through all tournaments and accumulate counts
    const totalPendingTeams = await RegisteredTeam.count({
      status: "Pending",
      tournament: { $in: allTournaments },
    });
    const totalRegisteredTeams = await RegisteredTeam.count({
      tournament: { $in: allTournaments },
    });
    const totalAcceptedTeams = await RegisteredTeam.count({
      status: "Accepted",
      tournament: { $in: allTournaments },
    });
    let data = {
      totalPendingTeams,
      totalAcceptedTeams,
      currentTournamentCount: allTournaments.length,
    };

    return data;
  },

  async getTournamentByUser() {
    const userInfo = global.user;

    // Fetch all tournaments
    const allTournaments = await Tournament.find({
      $or: [
        { user: userInfo.userId },
        { coHostId1: userInfo.userId },
        { coHostId2: userInfo.userId }, // New condition for coHostId2
      ],
      isDeleted: false,
      isCompleted: false,
      isActive: true,
    });

    // Iterate through all tournaments and accumulate counts
    const totalPendingTeams = await RegisteredTeam.count({
      status: "Pending",
      tournament: { $in: allTournaments },
    });
    const totalRegisteredTeams = await RegisteredTeam.count({
      tournament: { $in: allTournaments },
    });
    const totalAcceptedTeams = await RegisteredTeam.count({
      status: "Accepted",
      tournament: { $in: allTournaments },
    });
    let data = {
      totalPendingTeams,
      totalAcceptedTeams,
      currentTournamentCount: allTournaments.length,
    };

    return data;
  },

  async updateAutority(tournamentID, UserId) {
    const tournament = await Tournament.findById(tournamentID).select("user");

    if (!tournament) {
      // Handle the case where the user is not found
      throw CustomErrorHandler.notFound("tournament Not Found");
    }

    console.log("organizer id", tournament.user);
    console.log("User id", global.user.userId);

    if (tournament.user != global.user.userId) {
      throw CustomErrorHandler.badRequest("You are not allowed to change.");
    }

    tournament.authority = UserId;
    await tournament.save();

    return UserId;
  },

  // ***********************    admin releated services     ****************************

  async getAllTournament(pageSize, skip, search) {
    // Query to count the total number of subadmins
    const totalTournament = await Tournament.countDocuments({ isActive: true });

    const aggregationPipeline = [];

    // Match stage for search
    if (search) {
      aggregationPipeline.push({
        $match: {
          $or: [{ tournamentName: { $regex: search, $options: "i" } }],
        },
      });
    }

    // Match stage for isActive
    aggregationPipeline.push({
      $match: {
        isActive: true
      }
    });
    // Skip and Limit stages
    if (!search) {
      aggregationPipeline.push({ $skip: skip });
      aggregationPipeline.push({ $limit: pageSize });
    }

    aggregationPipeline.push(
      {
        $lookup: {
          from: "users", // assuming the user model is named 'users'
          localField: "user",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $unwind: "$user",
      },
      {
        $project: {
          _id: 1,
          tournamentName: 1,
          tournamentStartDateTime: 1, // include specific tournament fields
          tournamentEndDateTime: 1, // include specific tournament fields
          stadiumAddress: 1,
          email: 1,
          isDeleted: 1,
          isCompleted: 1,
          fees: 1,
          gameType: "$gameType.name",
          phoneNumber: "$user.phoneNumber",
          fullName: "$user.fullName",
          locations: { $arrayElemAt: ["$user.locations.placeName", 0] },
        },
      },
    );

    const tournament = await Tournament.aggregate(aggregationPipeline);

    // const tournament = await Tournament.aggregate([
    //   {
    //     $skip: skip,
    //   },
    //   {
    //     $limit: pageSize,
    //   },
    //   {
    //     $lookup: {
    //       from: "users", // assuming the user model is named 'users'
    //       localField: "user",
    //       foreignField: "_id",
    //       as: "user",
    //     },
    //   },
    //   {
    //     $unwind: "$user",
    //   },
    //   {
    //     $project: {
    //       _id: 1,
    //       tournamentName: 1,
    //       tournamentStartDateTime: 1, // include specific tournament fields
    //       tournamentEndDateTime: 1, // include specific tournament fields
    //       stadiumAddress: 1,
    //       email: 1,
    //       isDeleted: 1,
    //       isCompleted: 1,
    //       fees: 1,
    //       gameType: "$gameType.name",
    //       phoneNumber: "$user.phoneNumber",
    //       fullName: "$user.fullName",
    //       locations: { $arrayElemAt: ["$user.locations.placeName", 0] },
    //     },
    //   },
    // ]);

    return {
      data: tournament,
      count: totalTournament,
    };
  },

  async getAllTournamentLive(pageSize, skip) {
    const currentDate = new Date();
    let startDateTime, endDateTime;
    startDateTime = new Date(currentDate);
    startDateTime.setHours(0, 0, 0, 0); // Set time to midnight
    endDateTime = new Date(currentDate);
    endDateTime.setHours(23, 59, 59, 999);

    // let startDate = "2024-02-13";
    // let endDate = "2024-02-17";

    // console.log("startDateTime",startDateTime);
    // console.log("endDateTime",endDateTime);

    // startDateTime = new Date(`${startDate}T00:00:00.000Z`);
    // endDateTime = new Date(`${endDate}T23:59:59.999Z`);

    // Query to count the total number of subadmins
    const totalTournament = await Tournament.countDocuments();

    // const tournament = await Tournament.find({
    //   isDeleted: false,
    //   $or: [
    //     {
    //       tournamentStartDateTime: {
    //         $gte: startDateTime,
    //         $lt: endDateTime,
    //       },
    //     },
    //     {
    //       tournamentEndDateTime: {
    //         $gte: startDateTime,
    //         $lt: endDateTime,
    //       },
    //     },
    //   ],
    // })
    //   .skip(skip)
    //   .limit(pageSize)
    //   .populate({
    //     path: 'user',
    //     select: 'email phoneNumber fullName locations.placeName',
    //   });

    const tournament = await Tournament.aggregate([
      {
        $match: {
          isDeleted: false,
          $or: [
            {
              tournamentStartDateTime: {
                $gte: startDateTime,
                $lt: endDateTime,
              },
            },
            {
              tournamentEndDateTime: {
                $gte: startDateTime,
                $lt: endDateTime,
              },
            },
          ],
        },
      },
      {
        $skip: skip,
      },
      {
        $limit: pageSize,
      },
      {
        $lookup: {
          from: "users",
          localField: "user",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $unwind: "$user",
      },
      {
        $project: {
          _id: 1,
          tournamentName: 1,
          tournamentStartDateTime: 1,
          tournamentEndDateTime: 1,
          stadiumAddress: 1,
          email: 1,
          isDeleted: 1,
          isCompleted: 1,
          fees: 1,
          gameType: "$gameType.name",
          phoneNumber: "$user.phoneNumber",
          fullName: "$user.fullName",
          locations: { $arrayElemAt: ["$user.locations.placeName", 0] },
        },
      },
    ]);

    return {
      data: tournament,
      count: totalTournament,
    };
  },

  async getTournamentById(tournamentId) {
    // Query to retrieve subadmins for the current page
    let tournament = await Tournament.find({ _id: tournamentId }).populate({
      path: "user",
      select: "email phoneNumber fullName locations.placeName", // Replace with the actual fields you want to include
    }); // Limit the number of documents per page

    let tournamentData = tournament.map((entry) => ({
      tournamentName: entry.tournamentName,
      ballCharges: entry.ballCharges,
      ballType: entry.ballType.name,
      fees: entry.fees,
      gameType: entry.gameType.name,
      pitchType: entry.pitchType.name,
      matchType: entry.matchType.name,
      breakfastCharges: entry.breakfastCharges,
      // latestLocation: entry.locationHistory.currentLocation.selectLocation,
      stadiumAddress: entry.stadiumAddress,
      tournamentCategory: entry.tournamentCategory.name,
      tournamentStartDateTime: moment(entry.tournamentStartDateTime).format(
        "DD-MM-YYYY",
      ),
      tournamentEndDateTime: moment(entry.tournamentEndDateTime).format(
        "DD-MM-YYYY",
      ),
      tournamentLimit: entry.tournamentLimit,
      tournamentPrize: entry.tournamentPrize.name,
    }));

    return tournamentData[0];
  },

  async getMatchesByTournamentId(TournamentId) {
    // let startDate = "2024-02-13";
    // let endDate = "2024-02-17";

    const currentDate = new Date();
    let startDateTime, endDateTime;
    startDateTime = new Date(currentDate);
    startDateTime.setHours(0, 0, 0, 0); // Set time to midnight
    endDateTime = new Date(currentDate);
    endDateTime.setHours(23, 59, 59, 999);

    // startDateTime = new Date(`${startDate}T00:00:00.000Z`);
    // endDateTime = new Date(`${endDate}T23:59:59.999Z`);

    const Matches = await Match.find({
      tournament: TournamentId,
      // $or: [
      //   {
      //     dateTime: {
      //       $gte: startDateTime,
      //       $lt: endDateTime,
      //     },
      //   },
      // ],
    }).select("_id tournament status team1 team2");

    // const tournament = await Tournament.aggregate([
    //   {
    //     $match: {
    //       isDeleted: false,
    //       $or: [
    //         {
    //           tournamentStartDateTime: {
    //             $gte: startDateTime,
    //             $lt: endDateTime,
    //           },
    //         },
    //         {
    //           tournamentEndDateTime: {
    //             $gte: startDateTime,
    //             $lt: endDateTime,
    //           },
    //         },
    //       ],
    //     },
    //   },
    //   {
    //     $skip: skip,
    //   },
    //   {
    //     $limit: pageSize,
    //   },
    //   {
    //     $lookup: {
    //       from: "users",
    //       localField: "user",
    //       foreignField: "_id",
    //       as: "user",
    //     },
    //   },
    //   {
    //     $unwind: "$user",
    //   },
    //   {
    //     $project: {
    //       _id: 1,
    //       tournamentName: 1,
    //       tournamentStartDateTime: 1,
    //       tournamentEndDateTime: 1,
    //       stadiumAddress: 1,
    //       email: 1,
    //       isDeleted: 1,
    //       isCompleted: 1,
    //       fees: 1,
    //       gameType: "$gameType.name",
    //       phoneNumber: "$user.phoneNumber",
    //       fullName: "$user.fullName",
    //       locations: { $arrayElemAt: ["$user.locations.placeName", 0] },
    //     },
    //   },
    // ]);

    return Matches;
  },

  async updateTournamentById(TournamentId, data) {
    const userInfo = global.user;
    // Update data
    const updatedData = {
      tournamentName: data.tournamentName,
      ballCharges: data.ballCharges,
      ballType: { name: data.ballType },
      breakfastCharges: data.breakfastCharges,
      fees: data.fees,
      matchType: { name: data.matchType },
      pitchType: { name: data.pitchType },
      tournamentCategory: { name: data.tournamentCategory },

      tournamentStartDateTime: new Date(
        data.tournamentStartDateTime.replace(
          /(\d{2})-(\d{2})-(\d{4})/,
          "$3-$2-$1T00:00:00.000Z",
        ),
      ),
      tournamentEndDateTime: new Date(
        data.tournamentEndDateTime.replace(
          /(\d{2})-(\d{2})-(\d{4})/,
          "$3-$2-$1T00:00:00.000Z",
        ),
      ),
      tournamentPrize: { name: data.tournamentPrize },
    };

    // Use findByIdAndUpdate to update the tournament
    const updatedTournament = await Tournament.findByIdAndUpdate(
      TournamentId,
      updatedData,
      { new: true },
    );

    // Check if the tournament was found and updated
    if (!updatedTournament) {
      // Handle the case where the tournament is not found
      throw CustomErrorHandler.notFound("Tournament Not Found");
    }

    return updatedTournament;
  },

  async getMatchesHistoryByTournamentId(TournamentId) {

    const Match = await Match.find({
      tournament: TournamentId,

    }).select("_id tournament status team1 team2");


    return Match;
  },


  //DG-original
  // async eliminateTeams(tournamentId, eliminatedTeamIds) {
  //   // Fetch the tournament to ensure it exists
  //   const tournament = await Tournament.findById(tournamentId);
  //   if (!tournament) {
  //     throw new Error("Tournament not found.");
  //   }

  //   for (const teamId of eliminatedTeamIds) {
  //     const registeredTeam = await RegisteredTeam.findOne({
  //       tournament: tournamentId,
  //       team: teamId,
  //     });

  //     if (!registeredTeam) {
  //       throw new Error(`Team with ID ${teamId} not found in this tournament.`);
  //     }

  //     const match = await Match.findOne({
  //       tournament: tournamentId,
  //       $or: [{ team1: teamId }, { team2: teamId }],
  //     }).select("Round");

  //     if (!match) {
  //       throw new Error(`Match not found for team with ID ${teamId}.`);
  //     }
  //     // registeredTeam.isEliminated = true;
  //     registeredTeam.isEliminated==true? registeredTeam.isEliminated = false : registeredTeam.isEliminated = true;
  //     registeredTeam.eliminatedInRound = match.Round; 
  //     await registeredTeam.save();
  //   }


  //   const remainingTeams = await RegisteredTeam.find({
  //     tournament: tournamentId,
  //     isEliminated: false,
  //   }).populate({ path: "team", select: "teamName teamLogo" });

  //   return {
  //     remainingTeams: remainingTeams.map((team) => ({
  //       teamId: team.team._id,
  //       teamName: team.team.teamName,
  //       teamLogo: team.team.teamLogo,
  //     })),
  //   };
  // },

  //Team which haven't played any match still can be eliminated (updated:17 Jan 25)
  async eliminateTeams(tournamentId, eliminatedTeamIds) {
    // Fetch the tournament to ensure it exists
    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) {
      throw new Error("Tournament not found.");
    }

    for (const teamId of eliminatedTeamIds) {
      const registeredTeam = await RegisteredTeam.findOne({
        tournament: tournamentId,
        team: teamId,
      });

      if (!registeredTeam) {
        throw new Error(`Team with ID ${teamId} not found in this tournament.`);
      }

      // Try to find a match involving the team
      const match = await Match.findOne({
        tournament: tournamentId,
        $or: [{ team1: teamId }, { team2: teamId }],
      }).select("Round");

      // Update elimination status and round
      registeredTeam.isEliminated = !registeredTeam.isEliminated; // Toggle elimination status
      registeredTeam.eliminatedInRound = match ? match.Round : null; // Set round if match exists, otherwise null
      await registeredTeam.save();
    }

    // Fetch remaining teams that are not eliminated
    const remainingTeams = await RegisteredTeam.find({
      tournament: tournamentId,
      isEliminated: false,
    }).populate({ path: "team", select: "teamName teamLogo" });

    return {
      remainingTeams: remainingTeams.map((team) => ({
        teamId: team.team._id,
        teamName: team.team.teamName,
        teamLogo: team.team.teamLogo,
      })),
    };
  },


  //getEliminatedTeams api DG
  async getEliminatedTeams(tournamentId) {
    const eliminatedTeams = await EliminatedTeam.find({ tournamentId })
      .populate({ path: "teamId", select: "teamName" })
      .populate({ path: "matchId", select: "eliminatedInRound" }); // Populate Round from Match schema

    if (eliminatedTeams.length === 0) {
      throw new Error("No eliminated teams found for this tournament.");
    }

    // Map the results to include team details and the round in which they were eliminated
    return eliminatedTeams.map((eliminatedTeam) => ({
      teamId: eliminatedTeam.teamId._id,
      teamName: eliminatedTeam.teamId.teamName,
      eliminatedInRound: eliminatedTeam.matchId ? eliminatedTeam.matchId.eliminatedInRound : null, // Round info from Match schema
      eliminatedAt: eliminatedTeam.eliminatedAt,
    }));
  },

};

export default tournamentServices;
