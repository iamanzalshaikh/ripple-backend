import { Request, Response, NextFunction } from "express";
import logger from "../config/logger.js";
import { verifyAdminAccessToken } from "../utils/jwtAdmin.js";
import { AdminRole } from "../models/adminUser.model.js";

export interface AdminAuthRequest extends Request {
  adminId?: string;
  adminRole?: AdminRole;
}

const adminAuth = async (
  req: AdminAuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let token = req.cookies?.token;

    if (!token && req.headers.authorization) {
      const parts = req.headers.authorization.split(" ");
      if (parts.length === 2 && parts[0] === "Bearer") {
        token = parts[1];
      }
    }

    if (!token) {
      res.status(401).json({
        success: false,
        message: "No token provided",
      });
      return;
    }

    const decoded = verifyAdminAccessToken(token);

    if (!decoded || !decoded.adminId) {
      logger.error("Admin token invalid or missing adminId");
      res.status(401).json({
        success: false,
        message: "Invalid token",
      });
      return;
    }

    logger.info(`Admin authenticated: ${decoded.adminId} (${decoded.role})`);

    req.adminId = decoded.adminId;
    req.adminRole = decoded.role;
    next();
  } catch (error: any) {
    logger.error(`Admin auth error: ${error.message}`);
    res.status(401).json({
      success: false,
      message: "Authentication failed",
    });
  }
};

export const requireAdminRole =
  (...allowedRoles: AdminRole[]) =>
  (req: AdminAuthRequest, res: Response, next: NextFunction): void => {
    if (!req.adminId || !req.adminRole) {
      res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
      return;
    }

    if (!allowedRoles.includes(req.adminRole)) {
      res.status(403).json({
        success: false,
        message: "Forbidden: insufficient admin role",
      });
      return;
    }

    next();
  };

export default adminAuth;


