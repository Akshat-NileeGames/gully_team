import { Promotional_Banner_model, Banner, Package, User, OrderHistory } from '../models/index.js';
import ImageUploader from '../helpers/ImageUploader.js';
import { DateTime } from "luxon";
import nodemailer from "nodemailer";
function isBase64Image(str) {
  return /^data:image\/[a-zA-Z]+;base64,/.test(str);
}
const PromotionalbannerService = {

  async createBanner(data) {
    try {
      const userInfo = global.user;

      let imageUrl = "";
      if (data.banner_image) {
        imageUrl = await ImageUploader.Upload(
          data.banner_image,
          "Banner_Promotion",
        );
      }
      const startDate = DateTime.fromISO(data.startDate, { zone: 'utc' }).startOf('day').toJSDate();
      const endDate = DateTime.fromISO(data.endDate, { zone: 'utc' }).startOf('day').toJSDate();
      const purchasedPackage = await Package.findById(data.packageId);
      const bannerData = new Promotional_Banner_model({
        banner_title: data.banner_title,
        banner_image: imageUrl,
        startDate: startDate,
        endDate: endDate,
        bannerlocationaddress: data.bannerlocationaddress,
        locationHistory: {
          point: {
            type: "Point",
            coordinates: [parseFloat(data.longitude), parseFloat(data.latitude)],
          },
          selectLocation: data.selectLocation,
        },
        packageId: data.packageId,
        bannerforsports: data.bannerforsports,
        userId: userInfo.userId
      });
      const banner = await bannerData.save();
      setTimeout(async () => {
        console.log("Sending email after 10 seconds... with banner id", banner._id);
        const order = await OrderHistory.findOne({ bannerId: banner._id });
        const retrivedBanner = await Promotional_Banner_model.findById(banner._id);
        const user = await User.findById(userInfo.userId);
        await PromotionalbannerService.sendMail("Banner", user, retrivedBanner, order.orderId, purchasedPackage);
      }, 10000);
      return banner;
    } catch (error) {
      console.log(`Failed to create banner:${error}`);
    }
  },

  async sendMail(userFor = "", user, promotionalBanner, orderId, purchasedPackage) {
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

    let mailOptions = {
      from: "gullyteam33@gmail.com",
      to: user.email,
      subject: "Invoice for Promotional Banner",
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
                .banner-info {
            background-color: #fff;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
            margin-bottom: 30px;
        }
                .banner-name {
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
                    <p class="order-id">Transaction ID: ${orderId}</p>
                </div>
                <div class="invoice-body">
                    <div class="company-customer">
                        <div class="customer-info">
                            <div class="section-title">Bill To</div>
                            <div class="info-content">
                                <strong>Name: ${user.fullName || 'Customer Name'}</strong><br>
                                Phone: ${user.phoneNumber || 'Unknown Phone'}<br>
                                Email: ${user.email || 'Unknown Email'}
                            </div>
                        </div>
                    </div>
                      <div class="banner-info">
                <div class="banner-name">Promotional Banner Details</div>
                <div><strong>Banner Name:</strong> ${promotionalBanner.banner_title}</div>
                <div><strong>Location:</strong> ${promotionalBanner.bannerlocationaddress}</div>
                <div><strong>Banner Start Date:</strong> ${new Date(promotionalBanner.startDate).toLocaleDateString()}</div>
                <div><strong>Banner End Date:</strong> ${new Date(promotionalBanner.endDate).toLocaleDateString()}</div>
            </div>
                    <div class="section-title">Invoice Items</div>
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
        </html>`
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

  async getbanner() {
    const userinfo = global.user;
    const myBanner = await Promotional_Banner_model.find({
      userId: userinfo.userId
    }, {
      bannerlocationHistory: 0
    }).populate('packageId');
    return myBanner;
  },


  async getBannersWithinRadius(data) {
    try {
      const { longitude, latitude, bannerforsports } = data;
      const radiusKm = 15;
      const desiredBannerCount = 7;
      const today = new Date();
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999)
      today.setHours(0, 0, 0, 0);
      const promotionalBanners = await Promotional_Banner_model.aggregate([
        {
          $geoNear: {
            near: {
              type: "Point",
              coordinates: [longitude, latitude],
            },
            distanceField: "distance",
            spherical: true,
            maxDistance: radiusKm * 1000,
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
            distanceInKm: { $lt: radiusKm },
            startDate: { $lte: todayEnd },
            endDate: { $gte: todayStart },
            bannerforsports: { $in: [bannerforsports, "others"] },
          },
        },
        {
          $project: {
            locationHistory: 0,
          },
        },
      ]);


      const regularBannersNeeded = desiredBannerCount - promotionalBanners.length;

      const regularBanners = await Banner.find({
        isActive: true,
      })
        .limit(regularBannersNeeded)
        .select('-__v');

      const combinedBanners = promotionalBanners.map(banner => ({
        ...banner,
        bannerType: 'promotional',
      }))
        .concat(
          regularBanners.slice(0, regularBannersNeeded).map(banner => ({
            ...banner.toObject(),
            bannerType: 'regular',
          }))
        );

      return combinedBanners;

    } catch (err) {
      console.log("Error fetching banners within radius:", err);
      throw err;
    }
  },

  async updateBanner(bannerId, data) {
    try {
      const banner = await Promotional_Banner_model.findById(bannerId);
      let imageUrl = "";
      if (data.banner_image) {
        if (isBase64Image(data.banner_image)) {
          imageUrl = await ImageUploader.Upload(
            data.banner_image,
            "Banner_Promotion",
          );
          // await ImageUploader.Delete(data.banner);
        } else {
          imageUrl = banner.banner_image;
        }
      }
      banner.banner_title = data.banner_title;
      banner.banner_image = imageUrl;

      banner.save();
      return banner;
    } catch (error) {
      console.log(`Failed to Update banner:${error}`);
    }
  },

};

export default PromotionalbannerService;

