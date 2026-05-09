import { randomBytes } from "node:crypto";
import jwt, { type JwtPayload } from "jsonwebtoken";
import config from "../config/config.js";

const ACCESS_EXPIRES_IN = "7d";
const REFRESH_EXPIRES_IN = "30d";

export interface UserTokenPayload extends JwtPayload {
  userId: string;
}

function newJti(): string {
  return randomBytes(16).toString("hex");
}

export function signUserAccessToken(userId: string): string {
  const payload: UserTokenPayload = { userId };
  return jwt.sign(payload, config.JWT_ACCESS_SECRET, {
    expiresIn: ACCESS_EXPIRES_IN,
    jwtid: newJti(),
  });
}

export function signUserRefreshToken(userId: string): string {
  const payload: UserTokenPayload = { userId };
  return jwt.sign(payload, config.JWT_REFRESH_SECRET, {
    expiresIn: REFRESH_EXPIRES_IN,
    jwtid: newJti(),
  });
}

export function verifyUserAccessToken(token: string): UserTokenPayload | null {
  try {
    return jwt.verify(
      token,
      config.JWT_ACCESS_SECRET,
    ) as UserTokenPayload;
  } catch {
    return null;
  }
}

export function verifyUserRefreshToken(token: string): UserTokenPayload | null {
  try {
    return jwt.verify(
      token,
      config.JWT_REFRESH_SECRET,
    ) as UserTokenPayload;
  } catch {
    return null;
  }
}
