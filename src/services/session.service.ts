import {
  createSession,
  endSession,
  findActiveSessionForUser,
  findSessionById,
  touchSession,
  updateSessionContext,
} from "../models/session.repo.js";
import type { SessionContext } from "../types/session.types.js";

export interface StartSessionInput {
  userId: string;
  device?: string;
  context_type?: SessionContext["context_type"];
  action_source?: SessionContext["action_source"];
  context_metadata?: SessionContext["context_metadata"];
}

export async function startSessionForUser(input: StartSessionInput) {
  return createSession({
    userId: input.userId,
    device: input.device,
    context: {
      context_type: input.context_type ?? "general",
      action_source: input.action_source ?? "desktop",
      context_metadata: input.context_metadata,
    },
  });
}

export async function endSessionForUser(args: { userId: string; sessionId: string }) {
  const found = await findSessionById(args.sessionId);
  if (!found || found.userId !== args.userId) return null;
  if (!found.isActive) return found;
  return endSession(args.sessionId);
}

export async function getOwnedSession(args: { userId: string; sessionId: string }) {
  return findActiveSessionForUser(args.userId, args.sessionId);
}

export { touchSession, updateSessionContext };
