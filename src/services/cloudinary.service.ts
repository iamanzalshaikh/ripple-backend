import { v2 as cloudinary } from "cloudinary";
import config from "../config/config.js";

export function isCloudinaryConfigured(): boolean {
  return Boolean(
    config.CLOUDINARY_CLOUD_NAME &&
      config.CLOUDINARY_API_KEY &&
      config.CLOUDINARY_API_SECRET,
  );
}

export function initCloudinary(): void {
  if (!isCloudinaryConfigured()) return;
  cloudinary.config({
    cloud_name: config.CLOUDINARY_CLOUD_NAME,
    api_key: config.CLOUDINARY_API_KEY,
    api_secret: config.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

export async function uploadAudioBuffer(args: {
  buffer: Buffer;
  filename: string;
}): Promise<{ url: string; publicId: string }> {
  if (!isCloudinaryConfigured()) {
    throw new Error("Cloudinary not configured");
  }
  initCloudinary();

  const b64 = args.buffer.toString("base64");
  const dataUri = `data:audio/*;base64,${b64}`;

  const res = await cloudinary.uploader.upload(dataUri, {
    resource_type: "video",
    folder: "ripple/audio",
    public_id: args.filename.replace(/\.[^/.]+$/, ""),
  });

  return { url: res.secure_url, publicId: res.public_id };
}

