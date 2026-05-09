import type { Response } from "express";
import type { AuthRequest } from "../types/auth.types.js";
import logger from "../config/logger.js";
import { prisma } from "../config/db.js";
import { fail, ok } from "../utils/http.js";

const allowedActions = new Set(["dictate", "rewrite", "grammar"]);

export async function createTranscriptHandler(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  try {
    const { raw_text, processed_text, action, language } = req.body as {
      raw_text?: string;
      processed_text?: string;
      action?: string;
      language?: string;
    };

    if (!raw_text || !action) {
      fail(res, "raw_text and action required", 400);
      return;
    }
    if (!allowedActions.has(action)) {
      fail(res, "Invalid action. Allowed: dictate, rewrite, grammar", 400);
      return;
    }

    const t = await prisma.transcript.create({
      data: {
        userId: req.userId!,
        rawText: raw_text,
        processedText: processed_text,
        action,
        language,
      },
    });

    ok(res, t, 201);
  } catch (e: unknown) {
    logger.error("createTranscript", e);
    fail(res, "Server error", 500, e instanceof Error ? e.message : undefined);
  }
}

export async function listTranscriptsHandler(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  try {
    const page = Math.max(1, Number(req.query.page ?? 1));
    const limit = Math.min(50, Math.max(1, Number(req.query.limit ?? 20)));
    const q = (req.query.search ?? "").toString().trim();
    const sort = (req.query.sort ?? "latest").toString();
    const orderBy =
      sort === "oldest" ? { createdAt: "asc" as const } : { createdAt: "desc" as const };

    const where = {
      userId: req.userId!,
      ...(q
        ? {
            OR: [
              { rawText: { contains: q, mode: "insensitive" as const } },
              { processedText: { contains: q, mode: "insensitive" as const } },
              { action: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const [total, items] = await Promise.all([
      prisma.transcript.count({ where }),
      prisma.transcript.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    ok(res, { items, total, page, limit, sort });
  } catch (e: unknown) {
    logger.error("listTranscripts", e);
    fail(res, "Server error", 500, e instanceof Error ? e.message : undefined);
  }
}

export async function getTranscriptHandler(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  try {
    const rawId = req.params.id;
    const id = Array.isArray(rawId) ? rawId[0] : rawId;
    const t = await prisma.transcript.findFirst({
      where: { id, userId: req.userId! },
    });
    if (!t) {
      fail(res, "Not found", 404);
      return;
    }
    ok(res, t);
  } catch (e: unknown) {
    logger.error("getTranscript", e);
    fail(res, "Server error", 500, e instanceof Error ? e.message : undefined);
  }
}

export async function deleteTranscriptHandler(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  try {
    const rawId = req.params.id;
    const id = Array.isArray(rawId) ? rawId[0] : rawId;
    const t = await prisma.transcript.findFirst({
      where: { id, userId: req.userId! },
    });
    if (!t) {
      fail(res, "Not found", 404);
      return;
    }
    await prisma.transcript.delete({ where: { id } });
    ok(res, { message: "Deleted" });
  } catch (e: unknown) {
    logger.error("deleteTranscript", e);
    fail(res, "Server error", 500, e instanceof Error ? e.message : undefined);
  }
}

