import { PutObjectCommand, DeleteObjectCommand, S3Client } from "@aws-sdk/client-s3";
import {
  AWS_ACCESS_KEY_ID,
  AWS_BUCKET_NAME,
  AWS_SECRET_ACCESS_KEY,
} from "../config/index.js";

class MediaUploader {

  static s3Client = new S3Client({
    region: "ap-south-1",
    credentials: {
      accessKeyId: AWS_ACCESS_KEY_ID,
      secretAccessKey: AWS_SECRET_ACCESS_KEY,
    },
  });

  // Method to Upload image or video to S3 bucket
  static async Upload(base64Media, folderName, fileName = "default") {
    if (!this.s3Client) {
      throw new Error("S3 client is not initialized correctly.");
    }

    // Check if the base64Media starts with a valid image or video prefix
    let contentType;
    if (base64Media.startsWith("data:image/png;base64,")) {
      contentType = "image/png";
    } else if (base64Media.startsWith("data:image/jpeg;base64,")) {
      contentType = "image/jpeg";
    } else if (base64Media.startsWith("data:image/jpg;base64,")) {
      contentType = "image/jpg";
    } 
    else if (base64Media.startsWith("data:video/mp4;base64,")) {
      contentType = "video/mp4";
    // } else if (base64Media.startsWith("data:video/quicktime;base64,")) {
    //   contentType = "video/quicktime"; // .mov videos
    // } else if (base64Media.startsWith("data:video/x-msvideo;base64,")) {
    //   contentType = "video/x-msvideo"; // .avi videos
    // } 
    }
    else {
      throw new Error("Unsupported media format");
    }

    // Decode the base64 string to a buffer
    const buffer = Buffer.from(
      base64Media.replace(/^data:image\/\w+;base64,/, "").replace(/^data:video\/\w+;base64,/, ""),
      "base64"
    );

    let key = "";
    if (fileName === "default") {
      key = `${folderName}/${Date.now().toString()}.${contentType.split("/")[1]}`;
    } else {
      key = fileName;
    }

    const uploadParams = {
      Bucket: AWS_BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    };

    // Upload the media to the S3 bucket
    try {
      const command = new PutObjectCommand(uploadParams);
      await this.s3Client.send(command);
      return key;
    } catch (error) {
      throw new Error(`Failed to upload media to S3: ${error.message}`);
    }
  }

  // Method to delete media from S3 bucket
  static async Delete(s3Key) {
    const deleteParams = {
      Bucket: AWS_BUCKET_NAME,
      Key: s3Key,
    };

    try {
      const command = new DeleteObjectCommand(deleteParams);
      await this.s3Client.send(command);
    } catch (error) {
      throw new Error(`Failed to delete media from S3: ${error.message}`);
    }
  }
}

export default MediaUploader;
