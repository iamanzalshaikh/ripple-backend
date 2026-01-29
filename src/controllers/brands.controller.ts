// ==========================================
// File: src/controllers/brands.controller.ts
// Public Brands Controller (for user app)
// ==========================================
import { Response } from "express";
import Brand from "../models/brand.model.js";
import logger from "../config/logger.js";
import { AuthRequest } from "../types/auth.types.js";

/**
 * GET /api/v1/brands
 * Public list of verified brands for Explore > Creators & Brands
 */
export const listPublicBrands = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const limit = parseInt((req.query.limit as string) || "50", 10);

    const brands = await Brand.find({ verified: true })
      .sort({ createdAt: -1 })
      .limit(Math.min(limit, 100))
      .lean();

    res.status(200).json({
      success: true,
      data: brands.map((b) => ({
        _id: b._id,
        name: b.name,
        logo: b.logo,
        category: b.category,
        description: b.description,
        website: b.website,
      })),
    });
  } catch (error: any) {
    logger.error(`[Brands] listPublicBrands error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Failed to fetch brands",
      error:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};


