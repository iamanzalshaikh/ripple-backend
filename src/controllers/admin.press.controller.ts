// ==========================================
// File: src/controllers/admin.press.controller.ts
// Admin Press Requests Controller
// ==========================================
import { Response } from "express";
import { AdminAuthRequest } from "../middlewares/adminAuth.middleware.js";
import logger from "../config/logger.js";
import PressRequest from "../models/pressRequest.model.js";

/**
 * GET /api/admin/press/requests
 * List press requests with optional status/type filter
 */
export const getPressRequests = async (
  req: AdminAuthRequest,
  res: Response
): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string;
    const type = req.query.type as string;
    const search = (req.query.search as string) || "";

    const query: any = {};

    if (status) {
      query.status = status;
    }
    if (type) {
      query.type = type;
    }
    if (search) {
      const regex = new RegExp(search, "i");
      query.$or = [{ requesterName: regex }, { email: regex }, { organization: regex }];
    }

    const skip = (page - 1) * limit;

    const [requests, total] = await Promise.all([
      PressRequest.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      PressRequest.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: {
        requests,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error: any) {
    logger.error(`[AdminPress] getPressRequests error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Failed to fetch press requests",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * PATCH /api/admin/press/requests/:id/status
 * Update status and notes for a press request
 */
export const updatePressRequestStatus = async (
  req: AdminAuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    if (!status || !["pending", "approved", "rejected", "contacted"].includes(status)) {
      res.status(400).json({
        success: false,
        message: "Invalid status value",
      });
      return;
    }

    const request = await PressRequest.findById(id);
    if (!request) {
      res.status(404).json({
        success: false,
        message: "Press request not found",
      });
      return;
    }

    request.status = status as any;
    request.notes = notes || request.notes;
    request.reviewedAt = new Date();
    request.reviewedBy = req.adminId as any;

    await request.save();

    logger.info(
      `[AdminPress] Updated press request ${id} to status ${status} by admin ${req.adminId}`
    );

    res.status(200).json({
      success: true,
      message: "Press request updated successfully",
      data: request,
    });
  } catch (error: any) {
    logger.error(
      `[AdminPress] updatePressRequestStatus error: ${error.message}`
    );
    res.status(500).json({
      success: false,
      message: "Failed to update press request",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};




