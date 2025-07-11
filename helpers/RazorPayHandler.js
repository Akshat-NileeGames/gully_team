import Razorpay from "razorpay";
import { RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET } from "../config/index.js";


var razorpay = new Razorpay({
  key_id: RAZORPAY_KEY_ID,
  key_secret: RAZORPAY_KEY_SECRET,
});

class RazorpayHandler {
  static createOrder(paymentData) {


    return new Promise((resolve, reject) => {
      razorpay.orders.create(paymentData, (err, order) => {
        if (err) {
          console.error(err);
          reject(err); // Reject the promise with the error
        } else {
          console.log("order", order);
          resolve(order); // Resolve the promise with the order
        }
      });
    });
  }
  

  //DG
  // static async verifyPayment(paymentId) {
  //   try {
  //     const paymentDetails = await razorpay.payments.fetch(paymentId); // Fetch payment details
  //     return paymentDetails; // Return the payment details
  //   } catch (error) {
  //     console.error("Error verifying payment:", error);
  //     throw error;
  //   }
  // }
}



export default RazorpayHandler;
