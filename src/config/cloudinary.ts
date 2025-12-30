import { v2 as cloudinary } from "cloudinary";
import "dotenv/config";
import config from "./config";
import logger from "./logger";
import streamifier from "streamifier";

// Cloudinary Configuration
cloudinary.config({
  cloud_name: config.CLOUDINARY_CLOUD_NAME,
  api_key: config.CLOUDINARY_API_KEY,
  api_secret: config.CLOUDINARY_API_SECRET,
});

// Function to Upload Buffer to Cloudinary (Optimized)
const uploadOnCloudinary = async (
  fileBuffer: Buffer,
  folder: string = "library-books",
): Promise<string | null> => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: folder,
        resource_type: "auto",
      },
      (error, result) => {
        if (error) {
          logger.error(`Cloudinary Upload Error: ${error.message}`);
          return resolve(null);
        }
        if (result) {
          return resolve(result.secure_url);
        }
        return resolve(null);
      },
    );

    streamifier.createReadStream(fileBuffer).pipe(uploadStream);
  });
};

export { uploadOnCloudinary, cloudinary };
