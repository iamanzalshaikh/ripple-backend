import type { Response } from "express";
import type { AuthRequest } from "../types/auth.types.js";
import logger from "../config/logger.js";
import { prisma } from "../config/db.js";
import { fail, ok } from "../utils/http.js";

export async function onboardingComplete(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  try {
    const preferences = (req.body as { preferences?: unknown }).preferences;

    const user = await prisma.user.update({
      where: { id: req.userId },
      data: {
        onboardingCompleted: true,
        preferences: preferences ?? undefined,
      },
    });

    ok(res, { id: user.id, onboarding_completed: user.onboardingCompleted });
  } catch (e: unknown) {
    logger.error("onboardingComplete", e);
    fail(res, "Server error", 500, e instanceof Error ? e.message : undefined);
  }
}

export async function getPreferences(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { preferences: true },
    });
    if (!user) {
      fail(res, "User not found", 404);
      return;
    }
    ok(res, { preferences: user.preferences ?? {} });
  } catch (e: unknown) {
    logger.error("getPreferences", e);
    fail(res, "Server error", 500, e instanceof Error ? e.message : undefined);
  }
}

