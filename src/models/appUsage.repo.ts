import { prisma } from "../config/db.js";
import type { Prisma } from "@prisma/client";
import logger from "../config/logger.js";

export interface AppUsageEvent {
  userId: string;
  sessionId?: string | null;
  event: string;
  action?: string | null;
  contextType?: string | null;
  actionSource?: string | null;
  metadata?: Record<string, unknown> | null;
}

/** Fire-and-forget analytics write — never blocks the request path. */
export function logAppUsage(evt: AppUsageEvent): void {
  prisma.appUsage
    .create({
      data: {
        userId: evt.userId,
        sessionId: evt.sessionId ?? null,
        event: evt.event,
        action: evt.action ?? null,
        contextType: evt.contextType ?? null,
        actionSource: evt.actionSource ?? null,
        metadata: (evt.metadata ?? null) as Prisma.InputJsonValue,
      },
    })
    .catch((err) => logger.warn("appUsage write failed", err));
}
