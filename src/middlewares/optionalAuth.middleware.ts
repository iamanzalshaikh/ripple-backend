import type { Response, NextFunction } from "express";
import type { AuthRequest } from "../types/auth.types.js";
import { verifyUserAccessToken } from "../utils/jwt.js";
import config from "../config/config.js";

/** Attaches req.userId when a valid Bearer/cookie token is present; never 401s. */
const optionalAuth = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    let token: string | undefined = req.cookies?.[config.AUTH_COOKIE_NAME];
    if (!token && req.headers.authorization) {
      const parts = req.headers.authorization.split(" ");
      if (parts.length === 2 && parts[0] === "Bearer") token = parts[1];
    }
    if (token) {
      const decoded = verifyUserAccessToken(token);
      if (decoded?.userId) req.userId = decoded.userId;
    }
  } catch {
    /* ignore */
  }
  next();
};

export default optionalAuth;
