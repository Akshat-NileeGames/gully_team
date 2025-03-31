import admin from "firebase-admin";
import serviceAccount from "../firebase.json" assert { type: "json" };


admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });

  const messaging = admin.messaging();

class firebaseNotification {
  // to create a new jwt token
  static async sendNotification(registrationToken,notificationData) {

    const message = {
        data: notificationData.data || {},
        notification: {
          title: notificationData.title || 'Gully Team',
          body: notificationData.body || 'Default Body',
          image: notificationData.image 
        },
        token: registrationToken,
      };

      let response="failed";
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
  static async sendToTopic(topic="golbal notification", notificationData) {
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
