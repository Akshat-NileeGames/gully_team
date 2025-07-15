//we are creating this file to import all environtments variable to  entire code by calling config folder this file automaticaaly load due index name 

import dotenv from 'dotenv';

dotenv.config();

//here we are destructing all variable 
export const {
    APP_PORT,
    DEBUG_MODE,
    MONGO_DB_URL,
    JWT_SECRET,
    BUCKET_NAME,
    AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY,
    AWS_BUCKET_NAME,
    FAST_SMS_KEY,
    SENDER_ID,
    MESSAGE_ID,
    FCM_SERVER_KEY,
    RAZORPAY_KEY_ID,
    RAZORPAY_KEY_SECRET,
    RAZORPAY_ACCOUNT_NUMBER

} = process.env;