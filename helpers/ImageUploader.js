/**
 * @description
 * Handles uploading and deleting image/video files to and from
 * an Amazon S3 bucket using the AWS SDK v3.
 *
 * @usage
 * - Upload base64-encoded media (image/video) directly to S3.
 * - Delete files from S3 using their object key.
 *
 * @example
 * // Upload Example:
 * const key = await MediaUploader.Upload(base64String, "profile-images");
 *
 * @example
 * // Delete Example:
 * await MediaUploader.Delete("profile-images/1731234567890.png");
 */

import { PutObjectCommand, DeleteObjectCommand, S3Client } from "@aws-sdk/client-s3";
import {
  AWS_ACCESS_KEY_ID,
  AWS_BUCKET_NAME,
  AWS_SECRET_ACCESS_KEY,
} from "../config/index.js";

class MediaUploader {
  /**
    * @property {S3Client} s3Client
    * @description Preconfigured AWS S3 client instance for all
    * media upload and delete operations.
    */
  static s3Client = new S3Client({
    region: "ap-south-1",
    credentials: {
      accessKeyId: AWS_ACCESS_KEY_ID,
      secretAccessKey: AWS_SECRET_ACCESS_KEY,
    },
  });

  /**
   * @function Upload
   * @description Uploads an image or video file to the S3 bucket.
   * @param {string} base64Media - Base64-encoded string of the file.
   * @param {string} folderName - Target folder inside the S3 bucket.
   * @param {string} [fileName="default"] - Optional custom filename.
   * @returns {Promise<string>} S3 object key of the uploaded file.
   *
   * @throws {Error} If unsupported file type or upload fails.
   */

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
      contentType = "image/jpeg";
    }
    else if (base64Media.startsWith("data:video/mp4;base64,")) {
      contentType = "video/mp4";
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
