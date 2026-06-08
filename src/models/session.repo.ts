import { isDbUnavailable, prisma } from "../config/db.js";
import {
  CONTEXT_MAX_BYTES,
  type SessionContext,
} from "../types/session.types.js";

function clampContext(context: SessionContext): SessionContext {
  const json = JSON.stringify(context);
  if (json.length <= CONTEXT_MAX_BYTES) return context;
  // Drop history_window first; if still too big, truncate last_output.
  const trimmed: SessionContext = { ...context, history_window: [] };
  if (JSON.stringify(trimmed).length <= CONTEXT_MAX_BYTES) return trimmed;
  const last = trimmed.last_output ?? "";
  const overflow = JSON.stringify(trimmed).length - CONTEXT_MAX_BYTES;
  trimmed.last_output = last.slice(0, Math.max(0, last.length - overflow - 16));
  return trimmed;
}

export async function createSession(args: {
  userId: string;
  device?: string;
  context?: SessionContext;
}) {
  return prisma.session.create({
    data: {
      userId: args.userId,
      device: args.device,
      context: clampContext({
        context_type: "general",
        action_source: "desktop",
        ...args.context,
        updated_at: new Date().toISOString(),
      }) as object,
    },
  });
}

export async function findSessionById(id: string) {
  return prisma.session.findUnique({ where: { id } });
}

export async function findActiveSessionForUser(userId: string, sessionId: string) {
  try {
    return await prisma.session.findFirst({
      where: { id: sessionId, userId, isActive: true, endedAt: null },
    });
  } catch (e: unknown) {
    // In dev / offline mode we want commands to still run without session context.
    if (isDbUnavailable(e)) return null;
    throw e;
  }
}

export async function touchSession(id: string) {
  try {
    return await prisma.session.update({
      where: { id },
      data: { lastActiveAt: new Date() },
    });
  } catch (e: unknown) {
    if (isDbUnavailable(e)) return null;
    throw e;
  }
}

export async function updateSessionContext(id: string, context: SessionContext) {
  try {
    return await prisma.session.update({
      where: { id },
      data: {
        context: clampContext({
          ...context,
          updated_at: new Date().toISOString(),
        }) as object,
        lastActiveAt: new Date(),
      },
    });
  } catch (e: unknown) {
    if (isDbUnavailable(e)) return null;
    throw e;
  }
}

export async function endSession(id: string) {
  return prisma.session.update({
    where: { id },
    data: { isActive: false, endedAt: new Date() },
  });
}
