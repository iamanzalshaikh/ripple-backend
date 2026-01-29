// ==========================================
// File: src/controllers/campaignUpload.controller.ts
// Admin upload controller for campaign hero images
// ==========================================
import { Response } from "express";
import { AdminAuthRequest } from "../middlewares/adminAuth.middleware.js";
import { uploadOnCloudinary } from "../config/cloudinary.js";
import logger from "../config/logger.js";

export const uploadCampaignHeroImage = async (
  req: AdminAuthRequest,
  res: Response,
): Promise<void> => {
  try {
    if (!(req as any).file) {
      res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
      return;
    }

    const fileBuffer = (req as any).file.buffer as Buffer;
    const uploadedUrl = await uploadOnCloudinary(
      fileBuffer,
      "heridez/campaigns",
    );

    if (!uploadedUrl) {
      res.status(500).json({
        success: false,
        message: "Failed to upload image",
      });
      return;
    }

    logger.info(`[CampaignUpload] Hero image uploaded: ${uploadedUrl}`);

    res.status(201).json({
      success: true,
      message: "Hero image uploaded successfully",
      data: {
        url: uploadedUrl,
      },
    });
  } catch (error: any) {
    logger.error(`[CampaignUpload] upload error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Failed to upload image",
      error:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};


