// ==========================================
// File: src/controllers/admin.sponsorship.controller.ts
// Admin Sponsorship Controller (Campaign listing + applications)
// ==========================================

import { Response } from "express";
import { AdminAuthRequest } from "../middlewares/adminAuth.middleware.js";
import Campaign from "../models/campaign.model.js";
import CreatorApplicationToCampaign from "../models/creatorApplicationToCampaign.model.js";
import logger from "../config/logger.js";

/**
 * GET /api/v1/admin/sponsorship/campaigns
 * List campaigns with basic filters for admin panel
 */
export const listCampaigns = async (
  req: AdminAuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const {
      page = "1",
      limit = "10",
      status = "",
      brandId = "",
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    const query: any = {};

    if (status) {
      query.status = status;
    }

    if (brandId) {
      query.brandId = brandId;
    }

    const [campaigns, total] = await Promise.all([
      Campaign.find(query)
        .populate("brandId", "name logo category")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Campaign.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: {
        campaigns,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error: any) {
    logger.error(`Admin listCampaigns error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Failed to fetch campaigns",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * GET /api/v1/admin/sponsorship/campaigns/:campaignId/applications
 * List creator applications for a specific campaign
 */
export const listCampaignApplications = async (
  req: AdminAuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const { campaignId } = req.params;
    const page = parseInt((req.query.page as string) || "1", 10);
    const limit = parseInt((req.query.limit as string) || "20", 10);
    const status = (req.query.status as string) || "";

    const campaign = await Campaign.findById(campaignId).populate(
      "brandId",
      "name logo category",
    );
    if (!campaign) {
      res.status(404).json({
        success: false,
        message: "Campaign not found",
      });
      return;
    }

    const query: any = { campaignId };
    if (status && status !== "all") {
      query.status = status;
    }

    const skip = (page - 1) * limit;

    const [applications, total] = await Promise.all([
      CreatorApplicationToCampaign.find(query)
        .populate("creatorId", "name email avatarUrl isCreator")
        .sort({ submittedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      CreatorApplicationToCampaign.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: {
        campaign,
        applications,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error: any) {
    logger.error(`Admin listCampaignApplications error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Failed to fetch campaign applications",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};


