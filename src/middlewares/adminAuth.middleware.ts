import type { Response, NextFunction } from "express";
import type { AuthRequest } from "../types/auth.types.js";

/** Stub — replace with admin JWT verification (Ridez-style) when you add admin users. */
const adminAuth = async (
  _req: AuthRequest,
  res: Response,
  _next: NextFunction,
): Promise<void> => {
  res.status(403).json({
    success: false,
    message: "Admin routes not enabled in scaffold.",
  });
};

export default adminAuth;
