import jwt, { JwtPayload } from "jsonwebtoken";
import config from "../config/config.js";
import { AdminRole } from "../models/adminUser.model.js";

const ADMIN_ACCESS_EXPIRES_IN = "1h";
const ADMIN_REFRESH_EXPIRES_IN = "7d";

export interface AdminTokenPayload extends JwtPayload {
  adminId: string;
  role: AdminRole;
  type: "admin";
}

export function signAdminAccessToken(adminId: string, role: AdminRole): string {
  const payload: AdminTokenPayload = { adminId, role, type: "admin" };

  return jwt.sign(payload, config.JWT_ADMIN_ACCESS_SECRET!, {
    expiresIn: ADMIN_ACCESS_EXPIRES_IN,
  });
}

export function signAdminRefreshToken(
  adminId: string,
  role: AdminRole
): string {
  const payload: AdminTokenPayload = { adminId, role, type: "admin" };

  return jwt.sign(payload, config.JWT_ADMIN_REFRESH_SECRET!, {
    expiresIn: ADMIN_REFRESH_EXPIRES_IN,
  });
}

export function verifyAdminAccessToken(
  token: string
): AdminTokenPayload | null {
  try {
    const decoded = jwt.verify(
      token,
      config.JWT_ADMIN_ACCESS_SECRET!
    ) as AdminTokenPayload;
    if (decoded.type !== "admin" || !decoded.adminId) {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
}

export function verifyAdminRefreshToken(
  token: string
): AdminTokenPayload | null {
  try {
    const decoded = jwt.verify(
      token,
      config.JWT_ADMIN_REFRESH_SECRET!
    ) as AdminTokenPayload;
    if (decoded.type !== "admin" || !decoded.adminId) {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
}
