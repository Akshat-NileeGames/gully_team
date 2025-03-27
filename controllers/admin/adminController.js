import Joi from "joi";
import CustomErrorHandler from "../../helpers/CustomErrorHandler.js";
import { Admin } from "../../models/index.js";
import { adminService, userServices ,teamServices } from "../../services/index.js";
import randomstring from "randomstring";



const adminController = {
    async adminLogin(req, res, next) {
      console.log("These route is called");
        //validation
        const AdminSchema = Joi.object({
            email: Joi.string().min(3).max(30).required(),
            password: Joi.string().min(3).max(100).required(),
        });
    
        const { error } = AdminSchema.validate(req.body);
    
        if (error) {
          return next(error);
        }
        try {
     
          const result = await adminService.adminLogin(req.body);
    
          return res.status(200).json({
            sucess: true,
            status : true,
            message: "Admin Login suessfully",
            data: result,
          });
        } catch (err) {
          console.log("Error in adminLogin");
          return next(err);
        }
      },

      async resetPassword(req, res, next) {

        let token = req.params.token;

        //validation
        const AdminSchema = Joi.object({
          password: Joi.string().min(3).max(30).required(),
          confirmpassword: Joi.string().min(3).max(100).required().valid(Joi.ref('password')).messages({
              'any.only': 'Passwords must match',
          }),
        });
    
        const { error } = AdminSchema.validate(req.body);
    
        if (error) {
          return next(error);
        }
        try {
     
          const result = await adminService.resetPassword(req.body,token);
    
          return res.status(200).json({
            sucess: true,
            status : true,
            message: "Reset Password suessfully",
            data: result,
          });
        } catch (err) {
          console.log("Error in resetPassword");
          return next(err);
        }
      },

      async sendMailForgotPassword(req, res, next) {
        //validation
        const AdminSchema = Joi.object({
            email: Joi.string().min(3).max(30).required(),
        });
    
        const { error } = AdminSchema.validate(req.body);
    
        if (error) {
          return next(error);
        }
        try {

          const email = req.body.email;
          const userData = await Admin.findOne({ email });

          if (userData) {

            const randomString = randomstring.generate();
            userData.tokens = randomString ;
            await userData.save();
            
          }

          const userFor="forgotPassword"
     
          const result = await adminService.sendMail(userFor,userData.email,userData.name,userData.tokens);
    
          return res.status(200).json({
            sucess: true,
            status : true,
            message: "Mail send  suessfully",
          });
        } catch (err) {
          console.log("Error in sendMailForgotPassword");
          return next(err);
        }
      },

      async update(req, res, next) {

        let Id = req.params.Id;

        try {
     
          const result = await adminService.Forceupdate(req.body,Id);
    
          return res.status(200).json({
            sucess: true,
            status : true,
            message: "Data Updated update",
            data: result,
          });
        } catch (err) {
          console.log("Error in update");
          return next(err);
        }
      },

      async getupdate(req, res, next) {

        let Id = req.params.Id;

        try {
     
          const result = await adminService.getForceupdate(Id);
    
          return res.status(200).json({
            sucess: true,
            status : true,
            message: "ForceUpdate Data Retrieved Successfully",
            data: result,
          });
        } catch (err) {
          console.log("Error in update");
          return next(err);
        }
      },

      async dashboard(req, res, next) {
        try {
          const totalUserCount = await userServices.getUserCount();
          const totalOrganizerCount = await userServices.getOrganizerCount();
          const totalTeamCount = await teamServices.getTeamCount();
          // const totalUserCount = await userServices.getUserCount();
          // const totalUserCount = await userServices.getUserCount();
          return res.status(200).json({
            sucess: true,
            status : true,
            message: "DashBoard Data Retrieved Successfully",
            data: {
              totalUserCount,
              totalOrganizerCount,
              totalTeamCount
            },
          });
        } catch (err) {
          console.log("Error in dashboard");
          return next(err);
        }
      },


};

export default adminController;