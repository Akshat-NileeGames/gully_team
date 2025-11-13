/**
 * @description
 * Provides utility methods for sending push notifications
 * to individual devices or topics using Firebase Cloud Messaging (FCM).
 * @usage
 * - Used to send notifications to users by their device tokens.
 * - Also supports broadcasting messages to subscribed FCM topics.
 *
 * @example
 * await firebaseNotification.sendNotification(token, {
 *   title: "Match Update",
 *   body: "Your match starts in 30 minutes!",
 *   data: { matchId: "abc123" }
 * });
 *
 * @example
 * await firebaseNotification.sendToTopic("all-users", {
 *   title: "System Notice",
 *   body: "Server maintenance scheduled at midnight."
 * });
 *
 * @dependencies
 * - firebase-admin: for FCM integration
 * - fs: to read Firebase credentials from JSON file
 */


import admin from "firebase-admin";
import fs from 'fs';

const serviceAccount = JSON.parse(
  fs.readFileSync(new URL('../firebase.json', import.meta.url))
);


admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const messaging = admin.messaging();

class firebaseNotification {
  // to create a new jwt token
  static async sendNotification(registrationToken, notificationData) {

    const message = {
      data: notificationData.data || {},
      notification: {
        title: notificationData.title || 'Gully Team',
        body: notificationData.body || 'Default Body',
        image: notificationData.image
      },
      token: registrationToken,
    };

    let response = "failed";
    try {
      response = await messaging.send(message);
      console.log('Successfully sent message:', response);
      console.log("send message");
    } catch (error) {
      console.error('Error sending message:', error);
      return response;
    }

    return response;

  }

  // Send notification to a topic
  static async sendToTopic(topic = "golbal notification", notificationData) {
    const message = {
      data: notificationData.data || {},
      notification: {
        title: notificationData.title || 'Gully Team',
        body: notificationData.body || 'Default Body',
        //image: notificationData.image 
      },
      topic: topic,
    };

    try {
      const response = await messaging.send(message);
      return response;
    } catch (error) {
      console.error("Error sending notification to topic:", error);
      return "failed";
    }
  }

}

export default firebaseNotification;
