import type { Response, NextFunction } from "express";
import type { AuthRequest } from "../types/auth.types.js";
import {
  verifyUserAccessToken,
  type UserTokenPayload,
} from "../utils/jwt.js";
import logger from "../config/logger.js";
import config from "../config/config.js";

const isAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    let token: string | undefined = req.cookies?.[config.AUTH_COOKIE_NAME];

    if (!token && req.headers.authorization) {
      const parts = req.headers.authorization.split(" ");
      if (parts.length === 2 && parts[0] === "Bearer") {
        token = parts[1];
      }
    }

    if (!token) {
      res.status(401).json({ success: false, message: "No token provided" });
      return;
    }

    const decoded = verifyUserAccessToken(token) as UserTokenPayload | null;
    if (!decoded?.userId) {
      res.status(401).json({ success: false, message: "Invalid token" });
      return;
    }

    req.userId = decoded.userId;
    next();
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Auth failed";
    logger.error("Auth middleware", message);
    res.status(401).json({ success: false, message: "Authentication failed" });
  }
};

export default isAuth;
