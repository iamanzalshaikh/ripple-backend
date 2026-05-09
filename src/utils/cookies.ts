import type { Response } from "express";
import config from "../config/config.js";

const ACCESS_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7d
const REFRESH_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30d

export function setAccessTokenCookie(res: Response, token: string): void {
  res.cookie(config.AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: config.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: ACCESS_MAX_AGE_MS,
    path: "/",
  });
}

export function clearAccessTokenCookie(res: Response): void {
  res.clearCookie(config.AUTH_COOKIE_NAME, { path: "/" });
}

export function setRefreshTokenCookie(res: Response, token: string): void {
  res.cookie(config.REFRESH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: config.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: REFRESH_MAX_AGE_MS,
    path: "/api/v1/auth",
  });
}

export function clearRefreshTokenCookie(res: Response): void {
  res.clearCookie(config.REFRESH_COOKIE_NAME, { path: "/api/v1/auth" });
}
