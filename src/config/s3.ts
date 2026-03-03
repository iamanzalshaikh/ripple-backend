import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from "uuid";
import "dotenv/config";
import config from "./config.js";
import logger from "./logger.js";
import path from "path";

// Initialize S3 Client
const s3Client = new S3Client({
  region: config.AWS_REGION,
  credentials: {
    accessKeyId: config.AWS_ACCESS_KEY_ID,
    secretAccessKey: config.AWS_SECRET_ACCESS_KEY,
  },
});

/**
 * Function to Upload Buffer to AWS S3
 * @param fileBuffer Buffer of the file
 * @param folder Folder path inside the S3 bucket
 * @param mimetype Make sure to pass the mime type from multer (e.g. image/jpeg)
 * @returns Promise<string | null> The public URL of the uploaded image
 */
const uploadOnS3 = async (
  fileBuffer: Buffer,
  folder: string = "library-books",
  mimetype: string = "application/octet-stream"
): Promise<string | null> => {
  try {
    // Determine the file extension based on mimetype. Default to empty if not known, or just use a generic one
    const getExtension = (mime: string) => {
      switch (mime) {
        case "image/jpeg": return ".jpg";
        case "image/png": return ".png";
        case "image/webp": return ".webp";
        case "image/gif": return ".gif";
        case "video/mp4": return ".mp4";
        default: return "";
      }
    };

    const extension = getExtension(mimetype);
    const fileName = `${folder}/${uuidv4()}${extension}`;

    const command = new PutObjectCommand({
      Bucket: config.AWS_S3_BUCKET_NAME,
      Key: fileName,
      Body: fileBuffer,
      ContentType: mimetype,
      // For a public bucket, we can optionally use ACL, but usually modern buckets use Bucket Policies. 
      // Making it public-read if Bucket Ownership allows ACLs, but it's safer not to include ACL if using policies.
      // ACL: "public-read",
    });

    await s3Client.send(command);

    // Return the public URL
    const publicUrl = `https://${config.AWS_S3_BUCKET_NAME}.s3.${config.AWS_REGION}.amazonaws.com/${fileName}`;
    return publicUrl;
  } catch (error: any) {
    logger.error(`AWS S3 Upload Error: ${error.message}`);
    return null;
  }
};

export { uploadOnS3, s3Client };
