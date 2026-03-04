import { Response, NextFunction } from "express";
import { AuthRequest } from "../types/auth.types.js";
import { verifyUserAccessToken, UserTokenPayload } from "../utils/jwt.js";

/**
 * Optional auth middleware.
 * - If a valid Bearer token is present → sets req.userId and lets request through.
 * - If token is missing or invalid → still lets request through (userId remains undefined).
 * Use this for public endpoints that need personalization for logged-in users.
 */
const optionalAuth = (
  req: AuthRequest,
  _res: Response,
  next: NextFunction,
): void => {
  try {
    let token: string | undefined;

    if (req.cookies?.token) {
      token = req.cookies.token;
    } else if (req.headers.authorization) {
      const parts = req.headers.authorization.split(" ");
      if (parts.length === 2 && parts[0] === "Bearer") {
        token = parts[1];
      }
    }

    if (token) {
      const decoded = verifyUserAccessToken(token) as UserTokenPayload;
      if (decoded?.userId) {
        req.userId = decoded.userId;
      }
    }
  } catch {
    // Ignore invalid tokens — just proceed without userId
  }

  next();
};

export default optionalAuth;
