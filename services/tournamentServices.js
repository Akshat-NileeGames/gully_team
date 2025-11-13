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

/**
 * @function isBase64Media
 * @description Checks if a string is a valid base64-encoded media (image or video) string.
 * @param {string} str - String to check
 * @returns {boolean} True if string is base64 media, false otherwise
 */
function isBase64Media(str) {
  return /^data:(image|video)\/[a-zA-Z0-9.+-]+;base64,/.test(str);
}

const tournamentServices = {

  /**
   * @function createTournament
   * @description Creates a new tournament with all necessary details including co-hosts, cover photo, and location.
   * Sets the user as an organizer and sends notification.
   * @param {Object} data - Tournament creation data
   * @param {Date} userStartDate - Tournament start date and time
   * @param {Date} userEndDate - Tournament end date and time
   * @returns {Promise<Object>} Newly created tournament and FCM token
   * @throws {Error} Throws if tournament creation fails
   */
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

  /**
   * @function setSponsor
   * @description Sets sponsorship package for a tournament and sends confirmation email after 10 seconds.
   * @param {Object} data - Sponsorship data
   * @param {string} data.tournamentId - Tournament ID
   * @param {string} data.PackageId - Package ID for sponsorship
   * @returns {Promise<Object>} Updated tournament with sponsorship details
   * @throws {Error} Throws if tournament is not found or update fails
   */
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
        const mail = await tournamentServices.sendMail("sponsorship", user, tour, order.orderId, purchasedPackage);
      }, 10000);

      return tour;
    } catch (err) {
      console.log("Error updating sponsorship:", err);
      throw err;
    }
  },

  /**
   * @function sendMail
   * @description Sends sponsorship invoice email to user with detailed invoice information including GST breakdown.
   * @param {string} userFor - Type of user (default: "")
   * @param {Object} user - User object containing email and contact details
   * @param {Object} tour - Tournament object with tournament details
   * @param {string} orderId - Order/Transaction ID for the sponsorship
   * @param {Object} purchasedPackage - Package details including name and price
   * @returns {Promise<boolean>} Returns true if email sent successfully
   */
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

  /**
   * @function editTournament
   * @description Edits an existing tournament with updated details including co-hosts, cover photo, and location.
   * Sends notifications to all accepted registered teams about the update.
   * @param {Object} data - Updated tournament data
   * @param {Date} userStartDate - Updated tournament start date and time
   * @param {Date} userEndDate - Updated tournament end date and time
   * @param {string} tournamentId - Tournament ID to edit
   * @returns {Promise<Object>} Updated tournament object
   * @throws {Error} Throws if tournament is not found or update fails
   */
  async editTournament(data, userStartDate, userEndDate, tournamentId) {
    try {
      const userInfo = global.user;

      // Find the existing tournament by ID
      // const tournament = await Tournament.findById(tournamentId);
      let tournamentImage = await Tournament.findById(tournamentId);
      if (!tournamentImage) {
        throw CustomErrorHandler.notFound("Tournament not found.");
      }


      let imagePath;
      if (data.coverPhoto) {
        if (isBase64Media(data.coverPhoto)) {
          imagePath = await ImageUploader.Upload(
            data.coverPhoto,
            "tournament"
          );
        }
      } else {
        imagePath = tournamentImage.coverPhoto;
      }
      // let coHostId1 = tournament.coHostId1;
      // let coHostId2 = tournament.coHostId2;

      let coHostId1 = tournamentId.coHostId1;
      let coHostId2 = tournamentId.coHostId2;


      // Handle coHost1 update or creation
      if (data.coHost1Phone != null) {
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
      } else {
        coHostId1 = null;
      }

      // Handle coHost2 update or creation
      if (data.coHost2Phone != null) {
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
      } else {
        coHostId2 = null;
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
        isSponsorshippurchase: tournamentImage.isSponsorshippurchase,
        SponsorshipPackageId: tournamentImage.SponsorshipPackageId,
        TotalEditDone: tournamentImage.TotalEditDone,
      };
      // Update tournament data in the database
      const updatedTournament = await Tournament.findByIdAndUpdate(tournamentId, updatedData);

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
    } catch (error) {
      console.log(`The error is:${error}`);
    }
  },

  /**
   * @function getTournament
   * @description Retrieves tournaments based on location, date filters, and sport type using geospatial queries.
   * Returns tournaments within 10km radius along with registered team counts and match details.
   * @param {Object} data - Filter criteria
   * @param {number} data.latitude - User's latitude
   * @param {number} data.longitude - User's longitude
   * @param {string} data.startDate - Start date for filtering
   * @param {string} data.filter - Filter type ('past', 'upcoming', 'current')
   * @param {string} data.sport - Sport type for filtering
   * @returns {Promise<Object>} Tournament data with matches
   */
  async getTournament(data) {
    const { latitude, longitude, startDate, filter, sport } = data;
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
            tournamentfor: sport,
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

  /**
   * @function getTournamentByName
   * @description Searches for active tournaments by name using text search.
   * Returns tournaments with registered team counts and organizer details.
   * @param {string} query - Search query string for tournament name
   * @returns {Promise<Array>} Array of matching tournament objects
   */
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

  /**
   * @function getCurrentTournamentByOrganizer
   * @description Retrieves all current (active and not completed) tournaments created by or co-hosted by the logged-in user.
   * @returns {Promise<Array>} Array of current tournament objects with team counts
   * @throws {Error} Throws if no tournaments are found
   */
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

  /**
   * @function getAllTournamentByOrganizer
   * @description Retrieves all tournaments (including completed and inactive) created by or co-hosted by the logged-in user.
   * @returns {Promise<Array>} Array of all tournament objects with team counts and co-host details
   * @throws {Error} Throws if no tournaments are found
   */
  async getAllTournamentByOrganizer() {
    let userInfo = global.user;

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

  /**
   * @function deleteTournament
   * @description Soft deletes a tournament by setting its isDeleted flag to true.
   * @param {string} TournamentId - Tournament ID to delete
   * @returns {Promise<Object>} Updated tournament object
   * @throws {Error} Throws if tournament is not found
   */
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

  /**
   * @function createEntryForm
   * @description Creates an entry form for a team to join a tournament. Validates team has minimum 11 players.
   * Sends notification to tournament organizer about the join request.
   * @param {string} teamID - Team ID requesting to join
   * @param {string} tournamentID - Tournament ID to join
   * @returns {Promise<Object>} Created entry form object
   * @throws {Error} Throws if team has insufficient members or already exists
   */
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
    const user = await User.findOne({ _id: userId });
    if (!user) {
      throw CustomErrorHandler.notFound("User not found.");
    }
    const fcmToken = user.fcmToken;
    if (fcmToken) {
      const notificationData = {
        title: "Gully Team",
        body: `${team.teamName} has sent you a join request for the ${tournament.tournamentName} tournament.`,
      };

      try {
        const response = await firebaseNotification.sendNotification(fcmToken, notificationData);
      } catch (error) {
        console.error("Error sending notification:", error);
      }
    } else {
      console.error("No FCM token found for the organizer.");
    }

    return entryForm;
  },

  /**
   * @function teamRequest
   * @description Retrieves all team registration requests for a tournament filtered by status.
   * @param {string} tournamentID - Tournament ID
   * @param {string} status - Registration status ('Pending', 'Accepted', 'Denied')
   * @returns {Promise<Object>} Object containing array of tournament registration data
   */
  async teamRequest(tournamentID, status) {
    const userInfo = global.user;

    const tournament_data = await RegisteredTeam.find({
      tournament: tournamentID,
      status: status,
      // isEliminated:false,
    });

    return { tournament_data };
  },

  /**
   * @function updateTeamRequest
   * @description Updates the status of a team registration request (Accept/Deny). Sends notification to team captain.
   * Validates user has authority to update and checks tournament capacity.
   * @param {string} teamID - Team ID to update
   * @param {string} tournamentID - Tournament ID
   * @param {string} action - Action to take ('Accepted' or 'Denied')
   * @returns {Promise<Object>} Updated registered team object
   * @throws {Error} Throws if user lacks permission, tournament not found, or tournament is full
   */
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

  /**
   * @function getCount
   * @description Gets aggregate counts of pending, accepted, and total registered teams for all current tournaments of the user.
   * @returns {Promise<Object>} Object with totalPendingTeams, totalAcceptedTeams, and currentTournamentCount
   */
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

  /**
   * @function getTournamentByUser
   * @description Gets aggregate counts for tournaments created by or co-hosted by the logged-in user.
   * Includes pending, accepted teams count and total current tournament count.
   * @returns {Promise<Object>} Object with totalPendingTeams, totalAcceptedTeams, and currentTournamentCount
   */
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

  /**
   * @function updateAutority
   * @description Updates the authority (admin rights) for a tournament. Only the original organizer can transfer authority.
   * @param {string} tournamentID - Tournament ID
   * @param {string} UserId - New authority user ID
   * @returns {Promise<string>} New authority user ID
   * @throws {Error} Throws if tournament not found or user is not the original organizer
   */
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

  /**
   * @function getAllTournament
   * @description Admin function to retrieve all active tournaments with pagination and search functionality.
   * @param {number} pageSize - Number of tournaments per page
   * @param {number} skip - Number of tournaments to skip
   * @param {string} search - Search query for tournament name
   * @returns {Promise<Object>} Object with tournament data array and total count
   */
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


    return {
      data: tournament,
      count: totalTournament,
    };
  },

  /**
   * @function getAllTournamentLive
   * @description Admin function to retrieve all live tournaments (currently running today) with pagination.
   * @param {number} pageSize - Number of tournaments per page
   * @param {number} skip - Number of tournaments to skip
   * @returns {Promise<Object>} Object with tournament data array and total count
   */
  async getAllTournamentLive(pageSize, skip) {
    const currentDate = new Date();
    let startDateTime, endDateTime;
    startDateTime = new Date(currentDate);
    startDateTime.setHours(0, 0, 0, 0); // Set time to midnight
    endDateTime = new Date(currentDate);
    endDateTime.setHours(23, 59, 59, 999);


    // Query to count the total number of subadmins
    const totalTournament = await Tournament.countDocuments();


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

  /**
   * @function getTournamentById
   * @description Admin function to retrieve a specific tournament by ID with user details populated.
   * @param {string} tournamentId - Tournament ID
   * @returns {Promise<Object>} Tournament object with populated user information
   */
  async getTournamentById(tournamentId) {
    // Query to retrieve subadmins for the current page
    let tournament = await Tournament.findOne({ _id: tournamentId }).populate({
      path: "user",
      select: "email phoneNumber fullName locations.placeName", // Replace with the actual fields you want to include
    }); // Limit the number of documents per page

    return tournament;
  },

  /**
   * @function getMatchesByTournamentId
   * @description Retrieves all matches for a specific tournament.
   * @param {string} TournamentId - Tournament ID
   * @returns {Promise<Array>} Array of match objects with basic details
   */
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
    }).select("_id tournament status team1 team2");


    return Matches;
  },

  /**
   * @function updateTournamentById
   * @description Admin function to update tournament details by ID.
   * @param {string} TournamentId - Tournament ID to update
   * @param {Object} data - Updated tournament data
   * @returns {Promise<Object>} Updated tournament object
   * @throws {Error} Throws if tournament is not found
   */
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

  /**
   * @function getMatchesHistoryByTournamentId
   * @description Retrieves match history for a specific tournament.
   * @param {string} TournamentId - Tournament ID
   * @returns {Promise<Array>} Array of match objects with basic details
   */
  async getMatchesHistoryByTournamentId(TournamentId) {

    const Match = await Match.find({
      tournament: TournamentId,

    }).select("_id tournament status team1 team2");


    return Match;
  },

  /**
   * @function eliminateTeams
   * @description Toggles elimination status for specified teams in a tournament. Teams can be eliminated even if they haven't played matches.
   * Returns remaining non-eliminated teams.
   * @param {string} tournamentId - Tournament ID
   * @param {Array<string>} eliminatedTeamIds - Array of team IDs to eliminate/restore
   * @returns {Promise<Object>} Object containing array of remaining teams with details
   * @throws {Error} Throws if tournament or team is not found
   */
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

  /**
   * @function getEliminatedTeams
   * @description Retrieves all eliminated teams for a specific tournament with details about elimination round.
   * @param {string} tournamentId - Tournament ID
   * @returns {Promise<Array>} Array of eliminated team objects with team details and elimination information
   * @throws {Error} Throws if no eliminated teams are found
   */
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
