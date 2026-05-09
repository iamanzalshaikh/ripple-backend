import type { Response } from "express";
import type { AuthRequest } from "../types/auth.types.js";
import { fail, ok } from "../utils/http.js";
import logger from "../config/logger.js";
import {
  endSessionForUser,
  startSessionForUser,
} from "../services/session.service.js";
import { logAppUsage } from "../models/appUsage.repo.js";

export async function startSession(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.userId) return fail(res, "Unauthorized", 401);
    const { device, context_type, action_source, context_metadata } = req.body as {
      device?: string;
      context_type?: string;
      action_source?: string;
      context_metadata?: Record<string, unknown>;
    };

    const session = await startSessionForUser({
      userId: req.userId,
      device,
      context_type: context_type as never,
      action_source: action_source as never,
      context_metadata: context_metadata as never,
    });

    logAppUsage({
      userId: req.userId,
      sessionId: session.id,
      event: "session_started",
      contextType: context_type ?? null,
      actionSource: action_source ?? null,
      metadata: { device: device ?? null },
    });

    ok(
      res,
      {
        session_id: session.id,
        is_active: session.isActive,
        device: session.device,
        context: session.context,
        created_at: session.createdAt,
      },
      201,
    );
  } catch (e: unknown) {
    logger.error("startSession", e);
    fail(res, "Server error", 500, e instanceof Error ? e.message : undefined);
  }
}

export async function endSession(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.userId) return fail(res, "Unauthorized", 401);
    const { session_id } = req.body as { session_id?: string };
    if (!session_id) return fail(res, "session_id required", 400);

    const ended = await endSessionForUser({
      userId: req.userId,
      sessionId: session_id,
    });
    if (!ended) return fail(res, "Session not found", 404);

    const durationMs =
      (ended.endedAt ?? new Date()).getTime() - ended.createdAt.getTime();

    logAppUsage({
      userId: req.userId,
      sessionId: ended.id,
      event: "session_ended",
      metadata: { duration_ms: durationMs },
    });

    ok(res, {
      session_id: ended.id,
      is_active: ended.isActive,
      ended_at: ended.endedAt,
      duration_ms: durationMs,
    });
  } catch (e: unknown) {
    logger.error("endSession", e);
    fail(res, "Server error", 500, e instanceof Error ? e.message : undefined);
  }
}
