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
  revokeRefreshToken,
  rotateRefreshToken,
  storeRefreshToken,
} from "../models/refreshToken.repo.js";
import { ok, fail } from "../utils/http.js";
import {
  DB_UNAVAILABLE_MESSAGE,
  isDatabaseUnreachableError,
} from "../utils/dbErrors.js";

const REFRESH_DAYS = 30;

function refreshExpiry(): Date {
  const d = new Date();
  d.setDate(d.getDate() + REFRESH_DAYS);
  return d;
}

function readRefreshFromRequest(req: AuthRequest): string | null {
  const body = req.body as { refresh_token?: string };
  if (typeof body?.refresh_token === "string" && body.refresh_token.length > 0) {
    return body.refresh_token;
  }
  const cookie = req.cookies?.[config.REFRESH_COOKIE_NAME];
  return typeof cookie === "string" && cookie.length > 0 ? cookie : null;
}

async function issueTokenPair(args: {
  res: Response;
  userId: string;
  device?: string;
}): Promise<{ access: string; refresh: string; refresh_expires_at: Date }> {
  const access = signUserAccessToken(args.userId);
  const refresh = signUserRefreshToken(args.userId);
  const refresh_expires_at = refreshExpiry();

  await storeRefreshToken({
    userId: args.userId,
    token: refresh,
    expiresAt: refresh_expires_at,
    device: args.device,
  });

  setAccessTokenCookie(args.res, access);
  setRefreshTokenCookie(args.res, refresh);

  return { access, refresh, refresh_expires_at };
}

export async function signup(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { email, password, name, device } = req.body as {
      email?: string;
      password?: string;
      name?: string;
      device?: string;
    };

    if (!email || !password) {
      return fail(res, "email and password required", 400);
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
    if (isDatabaseUnreachableError(e)) {
      return fail(res, DB_UNAVAILABLE_MESSAGE, 503);
    }
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

    if (!email || !password) {
      return fail(res, "email and password required", 400);
    }

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
    if (isDatabaseUnreachableError(e)) {
      return fail(res, DB_UNAVAILABLE_MESSAGE, 503);
    }
    fail(res, "Server error", 500, e instanceof Error ? e.message : undefined);
  }
}

export async function refresh(req: AuthRequest, res: Response): Promise<void> {
  try {
    const incoming = readRefreshFromRequest(req);
    if (!incoming) {
      return fail(res, "Refresh token required", 401);
    }

    const decoded = verifyUserRefreshToken(incoming);
    if (!decoded?.userId) {
      return fail(res, "Invalid refresh token", 401);
    }

    const row = await findValidRefreshToken(incoming);
    if (!row || row.userId !== decoded.userId) {
      return fail(res, "Invalid refresh token", 401);
    }

    const newRefresh = signUserRefreshToken(decoded.userId);
    const refresh_expires_at = refreshExpiry();
    const access = signUserAccessToken(decoded.userId);

    await rotateRefreshToken({
      oldId: row.id,
      userId: decoded.userId,
      newToken: newRefresh,
      newExpiresAt: refresh_expires_at,
      device: row.device ?? undefined,
    });

    setAccessTokenCookie(res, access);
    setRefreshTokenCookie(res, newRefresh);

    ok(res, {
      token: access,
      refresh_token: newRefresh,
      refresh_expires_at: refresh_expires_at.toISOString(),
    });
  } catch (e: unknown) {
    logger.error("refresh", e);
    if (isDatabaseUnreachableError(e)) {
      return fail(res, DB_UNAVAILABLE_MESSAGE, 503);
    }
    fail(res, "Server error", 500, e instanceof Error ? e.message : undefined);
  }
}

export async function logout(req: AuthRequest, res: Response): Promise<void> {
  try {
    const incoming = readRefreshFromRequest(req);
    if (incoming) {
      await revokeRefreshToken(incoming);
    }
    clearAccessTokenCookie(res);
    clearRefreshTokenCookie(res);
    ok(res, { logged_out: true });
  } catch (e: unknown) {
    logger.error("logout", e);
    if (isDatabaseUnreachableError(e)) {
      return fail(res, DB_UNAVAILABLE_MESSAGE, 503);
    }
    fail(res, "Server error", 500, e instanceof Error ? e.message : undefined);
  }
}

export async function getCurrentUser(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  try {
    if (!req.userId) {
      return fail(res, "Unauthorized", 401);
    }

    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) {
      return fail(res, "User not found", 404);
    }

    ok(res, {
      id: user.id,
      email: user.email,
      name: user.name,
      onboarding_completed: user.onboardingCompleted,
    });
  } catch (e: unknown) {
    logger.error("getCurrentUser", e);
    if (isDatabaseUnreachableError(e)) {
      return fail(res, DB_UNAVAILABLE_MESSAGE, 503);
    }
    fail(res, "Server error", 500, e instanceof Error ? e.message : undefined);
  }
}
