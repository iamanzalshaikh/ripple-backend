// ==========================================
// File: src/controllers/press.controller.ts
// Press & Collaboration Requests Controller (Step 110)
// ==========================================
import { Request, Response } from "express";
import PressRequest from "../models/pressRequest.model.js";
import logger from "../config/logger.js";

/**
 * POST /api/v1/press/request
 * Submit press/collaboration request (Public, no auth required)
 */
export const submitPressRequest = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { requesterName, email, type, description, organization } = req.body;

    if (!requesterName || !email || !type || !description) {
      res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({
        success: false,
        message: "Invalid email format",
      });
      return;
    }

    const request = new PressRequest({
      requesterName,
      email: email.toLowerCase(),
      type,
      description,
      organization,
      status: "pending",
    });

    await request.save();

    logger.info(`Press request submitted: ${request._id} from ${email}`);

    // TODO: Notify admin (email or in-app notification)

    res.status(201).json({
      success: true,
      message: "Request submitted successfully! We'll get back to you soon.",
      data: {
        requestId: request._id,
      },
    });
  } catch (error: any) {
    logger.error(`Error in submitPressRequest: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Failed to submit request",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};




