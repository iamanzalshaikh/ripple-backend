import { prisma } from "../config/db.js";
import type { Prisma } from "@prisma/client";

export async function createCommandHistory(args: {
  userId: string;
  sessionId?: string | null;
  command: string;
  intent: string;
  steps: string[];
  result?: string | null;
  actions?: unknown;
  outputType?: string;
  confidence?: number | null;
  contextType?: string | null;
  actionSource?: string | null;
  promptTokens?: number | null;
  completionTokens?: number | null;
  totalTokens?: number | null;
  estimatedCost?: number | null;
  durationMs?: number | null;
  status?: "success" | "error" | "partial";
  errorMessage?: string | null;
}) {
  return prisma.commandHistory.create({
    data: {
      userId: args.userId,
      sessionId: args.sessionId ?? null,
      command: args.command,
      intent: args.intent,
      steps: args.steps as unknown as Prisma.InputJsonValue,
      result: args.result ?? null,
      actions: (args.actions ?? null) as Prisma.InputJsonValue,
      outputType: args.outputType ?? "text",
      confidence: args.confidence ?? null,
      contextType: args.contextType ?? null,
      actionSource: args.actionSource ?? null,
      promptTokens: args.promptTokens ?? null,
      completionTokens: args.completionTokens ?? null,
      totalTokens: args.totalTokens ?? null,
      estimatedCost: args.estimatedCost ?? null,
      durationMs: args.durationMs ?? null,
      status: args.status ?? "success",
      errorMessage: args.errorMessage ?? null,
    },
  });
}

export async function listCommandHistory(args: {
  userId: string;
  page: number;
  limit: number;
  contextType?: string;
  actionSource?: string;
  intent?: string;
  sort?: "latest" | "oldest";
}) {
  const where: Prisma.CommandHistoryWhereInput = { userId: args.userId };
  if (args.contextType) where.contextType = args.contextType;
  if (args.actionSource) where.actionSource = args.actionSource;
  if (args.intent) where.intent = args.intent;

  const [items, total] = await Promise.all([
    prisma.commandHistory.findMany({
      where,
      orderBy: { createdAt: args.sort === "oldest" ? "asc" : "desc" },
      skip: (args.page - 1) * args.limit,
      take: args.limit,
    }),
    prisma.commandHistory.count({ where }),
  ]);
  return { items, total };
}

export async function updateCommandActionStatus(args: {
  userId: string;
  commandId: string;
  actionIndex: number;
  status: "pending" | "executed" | "failed";
  error?: string;
}) {
  const row = await prisma.commandHistory.findFirst({
    where: { id: args.commandId, userId: args.userId },
  });
  if (!row) return null;

  const actions = Array.isArray(row.actions) ? [...row.actions] : [];
  if (args.actionIndex < 0 || args.actionIndex >= actions.length) {
    return { row, updated: false as const };
  }

  const current = actions[args.actionIndex];
  if (current && typeof current === "object" && !Array.isArray(current)) {
    actions[args.actionIndex] = {
      ...current,
      status: args.status,
      ...(args.error ? { error: args.error } : {}),
      acknowledged_at: new Date().toISOString(),
    };
  }

  const updated = await prisma.commandHistory.update({
    where: { id: args.commandId },
    data: { actions: actions as unknown as Prisma.InputJsonValue },
  });

  return { row: updated, updated: true as const };
}
