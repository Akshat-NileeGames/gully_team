import express from "express";
const router = express.Router();
import { ProviderController } from "../controllers/index.js";
import validateUser from "../middlewares/validateUser.js";


export default router;
