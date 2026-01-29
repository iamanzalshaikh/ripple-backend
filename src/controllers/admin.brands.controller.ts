// ==========================================
// File: src/controllers/admin.brands.controller.ts
// Admin Brands Controller (for Sponsorship campaigns)
// ==========================================
import { Response } from "express";
import { AdminAuthRequest } from "../middlewares/adminAuth.middleware.js";
import logger from "../config/logger.js";
import Brand from "../models/brand.model.js";

/**
 * GET /api/admin/brands
 * List brands with optional category filter
 */
export const getBrands = async (
  req: AdminAuthRequest,
  res: Response
): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const category = req.query.category as string;
    const search = (req.query.search as string) || "";

    const query: any = {};
    if (category) {
      query.category = category;
    }
    if (search) {
      const regex = new RegExp(search, "i");
      query.name = regex;
    }

    const skip = (page - 1) * limit;

    const [brands, total] = await Promise.all([
      Brand.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Brand.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: {
        brands,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error: any) {
    logger.error(`[AdminBrands] getBrands error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Failed to fetch brands",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * POST /api/admin/brands
 * Create a new brand
 */
export const createBrand = async (
  req: AdminAuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { name, logo, category, description, website, contactEmail, verified } = req.body;

    if (!name) {
      res.status(400).json({
        success: false,
        message: "Brand name is required",
      });
      return;
    }

    const existing = await Brand.findOne({ name: name.trim() });
    if (existing) {
      res.status(400).json({
        success: false,
        message: "Brand with this name already exists",
      });
      return;
    }

    const brand = new Brand({
      name: name.trim(),
      logo,
      category: category || "other",
      description,
      website,
      contactEmail,
      verified: verified ?? false,
      createdByAdmin: req.adminId as any,
    });

    await brand.save();

    logger.info(`[AdminBrands] Brand created: ${brand._id} by admin ${req.adminId}`);

    res.status(201).json({
      success: true,
      message: "Brand created successfully",
      data: brand,
    });
  } catch (error: any) {
    logger.error(`[AdminBrands] createBrand error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Failed to create brand",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};




