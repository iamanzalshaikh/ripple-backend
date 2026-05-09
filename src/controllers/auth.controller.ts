import type { Response } from "express";
import type { AuthRequest } from "../types/auth.types.js";
import {
  clearAccessTokenCookie,
  clearRefreshTokenCookie,
  setAccessTokenCookie,
  setRefreshTokenCookie,
} from "../utils/cookies.js";
import logger from "../config/logger.js";
import config from "../config/config.js";
import { prisma } from "../config/db.js";
import bcrypt from "bcryptjs";
import {
  signUserAccessToken,
  signUserRefreshToken,
  verifyUserRefreshToken,
} from "../utils/jwt.js";
import { createUser, findUserByEmail } from "../models/user.repo.js";
import {
  findValidRefreshToken,
  hashRefreshToken,
  revokeRefreshToken,
  rotateRefreshToken,
  storeRefreshToken,
} from "../models/refreshToken.repo.js";
import { fail, ok } from "../utils/http.js";
import { z } from "zod";

const passwordRule = z
  .string()
  .min(8)
  .refine((s) => /[A-Z]/.test(s), "Must contain 1 uppercase letter")
  .refine((s) => /[a-z]/.test(s), "Must contain 1 lowercase letter")
  .refine((s) => /[0-9]/.test(s), "Must contain 1 number");

const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function readRefreshFromRequest(req: AuthRequest): string | undefined {
  const cookieToken = req.cookies?.[config.REFRESH_COOKIE_NAME];
  if (typeof cookieToken === "string" && cookieToken.length > 0) return cookieToken;
  const body = req.body as { refresh_token?: unknown } | undefined;
  if (body && typeof body.refresh_token === "string" && body.refresh_token.length > 0) {
    return body.refresh_token;
  }
  return undefined;
}

async function issueTokenPair(args: {
  res: Response;
  userId: string;
  device?: string;
}): Promise<{ access: string; refresh: string; refresh_expires_at: Date }> {
  const access = signUserAccessToken(args.userId);
  const refresh = signUserRefreshToken(args.userId);
  const expiresAt = new Date(Date.now() + REFRESH_TTL_MS);

  await storeRefreshToken({
    userId: args.userId,
    token: refresh,
    expiresAt,
    device: args.device,
  });

  setAccessTokenCookie(args.res, access);
  setRefreshTokenCookie(args.res, refresh);

  return { access, refresh, refresh_expires_at: expiresAt };
}

export async function signup(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { email, password, name, device } = req.body as {
      email?: string;
      password?: string;
      name?: string;
      device?: string;
    };

    if (!email || !password) return fail(res, "email and password required", 400);
    const pwCheck = passwordRule.safeParse(password);
    if (!pwCheck.success) {
      return fail(res, "Password too weak", 400, pwCheck.error.issues[0]?.message);
    }

    const normalized = email.trim().toLowerCase();
    const existing = await findUserByEmail(normalized);
    if (existing) {
      return fail(res, "Email already exists", 409);
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await createUser({
      email: normalized,
      passwordHash,
      name: name?.trim() || undefined,
    });

    const { access, refresh, refresh_expires_at } = await issueTokenPair({
      res,
      userId: user.id,
      device,
    });

    ok(
      res,
      {
        token: access,
        refresh_token: refresh,
        refresh_expires_at: refresh_expires_at.toISOString(),
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          onboarding_completed: user.onboardingCompleted,
        },
      },
      201,
    );
  } catch (e: unknown) {
    logger.error("signup", e);
    fail(res, "Server error", 500, e instanceof Error ? e.message : undefined);
  }
}

export async function login(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { email, password, device } = req.body as {
      email?: string;
      password?: string;
      device?: string;
    };

    if (!email || !password) return fail(res, "email and password required", 400);

    const normalized = email.trim().toLowerCase();
    const user = await prisma.user.findUnique({ where: { email: normalized } });
    if (!user) {
      return fail(res, "Invalid credentials", 401);
    }

    const passwordOk = await bcrypt.compare(password, user.passwordHash);
    if (!passwordOk) {
      return fail(res, "Invalid credentials", 401);
    }

    const { access, refresh, refresh_expires_at } = await issueTokenPair({
      res,
      userId: user.id,
      device,
    });

    ok(res, {
      token: access,
      refresh_token: refresh,
      refresh_expires_at: refresh_expires_at.toISOString(),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        onboarding_completed: user.onboardingCompleted,
      },
    });
  } catch (e: unknown) {
    logger.error("login", e);
    fail(res, "Server error", 500, e instanceof Error ? e.message : undefined);
  }
}

export async function refresh(req: AuthRequest, res: Response): Promise<void> {
  try {
    const incoming = readRefreshFromRequest(req);
    if (!incoming) return fail(res, "Refresh token required", 401);

    const decoded = verifyUserRefreshToken(incoming);
    if (!decoded?.userId) return fail(res, "Invalid refresh token", 401);

    const stored = await findValidRefreshToken(incoming);
    if (!stored || stored.userId !== decoded.userId) {
      return fail(res, "Refresh token expired or revoked", 401);
    }

    const access = signUserAccessToken(decoded.userId);
    const newRefresh = signUserRefreshToken(decoded.userId);
    const expiresAt = new Date(Date.now() + REFRESH_TTL_MS);

    await rotateRefreshToken({
      oldId: stored.id,
      userId: decoded.userId,
      newToken: newRefresh,
      newExpiresAt: expiresAt,
      device: stored.device ?? undefined,
    });

    setAccessTokenCookie(res, access);
    setRefreshTokenCookie(res, newRefresh);

    ok(res, {
      token: access,
      refresh_token: newRefresh,
      refresh_expires_at: expiresAt.toISOString(),
    });
  } catch (e: unknown) {
    logger.error("refresh", e);
    fail(res, "Server error", 500, e instanceof Error ? e.message : undefined);
  }
}

export async function logout(req: AuthRequest, res: Response): Promise<void> {
  try {
    const incoming = readRefreshFromRequest(req);
    if (incoming) {
      await revokeRefreshToken(incoming).catch((err) =>
        logger.warn("logout revoke failed", err),
      );
    }
    clearAccessTokenCookie(res);
    clearRefreshTokenCookie(res);
    ok(res, { message: "Logged out" });
  } catch (e: unknown) {
    logger.error("logout", e);
    fail(res, "Server error", 500, e instanceof Error ? e.message : undefined);
  }
}

export async function getCurrentUser(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) {
      return fail(res, "User not found", 404);
    }
    ok(res, {
      id: user.id,
      email: user.email,
      onboarding_completed: user.onboardingCompleted,
      preferences: user.preferences ?? {},
    });
  } catch (e: unknown) {
    logger.error("getCurrentUser", e);
    fail(res, "Server error", 500, e instanceof Error ? e.message : undefined);
  }
}

export async function getSuggestedUsers(
  _req: AuthRequest,
  res: Response,
): Promise<void> {
  res.json({ success: true, data: { users: [] } });
}

export async function searchUsers(
  _req: AuthRequest,
  res: Response,
): Promise<void> {
  res.json({ success: true, data: { users: [] } });
}

// Silence unused-export warnings if any; re-export hash helper for tests/services.
export { hashRefreshToken };
