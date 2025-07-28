import express from "express";
import mongoose from "mongoose";
import { APP_PORT, MONGO_DB_URL } from "./config/index.js";
const app = express();
import cors from 'cors';
import fileUpload from 'express-fileupload';
import errorHandler from "./middlewares/errorHandler.js";
import emailScheduler from "./services/node_corn/node_schedular.js"
import {
  authRoute,
  matchRoute,
  otherRoute,
  teamRoute,
  tournamentRoute,
  userRoute,
  adminRoute,
  paymentRoute,
  bannerRoute,
  providerRoute,
  shopRoutes
} from "./routes/index.js";



// Database connection
mongoose.connect(MONGO_DB_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
emailScheduler.initializeCronJobs();
const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error:"));
db.once("open", () => {
  console.log("DB connected...");
});

app.use(cors());
app.use(fileUpload());
// app.use(bodyParser.json({ limit: "50mb" }));
app.use(express.json({ limit: "50mb" })); //to read json data

app.use("/api/auth", authRoute);
app.use("/api/user", userRoute);
app.use("/api/other", otherRoute);
app.use("/api/main", tournamentRoute);
app.use("/api/tournament", tournamentRoute); // Ensure this matches the import
app.use("/api/team", teamRoute);
app.use("/api/match", matchRoute);
app.use("/api/payment", paymentRoute);
app.use("/api/provider", providerRoute);
app.use("/api/shop", shopRoutes);
// app.use("/api/performances",matchRoute ) // edited
app.use('/api/banner', bannerRoute);
app.use("/admin", adminRoute);
app.use(errorHandler);
app.listen(APP_PORT, () => console.log("listening on port", APP_PORT));