import express from "express";

const router = express.Router();

import { userController } from "../controllers/index.js";
import validateUser from "../middlewares/validateUser.js"

router.post("/createProfile",validateUser, userController.createProfile);

router.get("/getProfile",validateUser, userController.getProfile);

router.delete("/deleteProfile",validateUser, userController.deleteProfile);

//to edit ProfilePhoto,nickname or edit ProfilePhoto only.
router.post("/editProfile",validateUser, userController.editProfile);

router.post("/sendOTP",validateUser, userController.sendOTP);


router.post("/verifyOTP",validateUser, userController.verifyOTP);

router.post("/updateLocation",validateUser, userController.updateLocation);

router.post("/send", userController.send);

router.get("/testapi", userController.testapi);



export default router;
