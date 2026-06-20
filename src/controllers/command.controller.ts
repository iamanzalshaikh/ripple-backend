import type { Response } from "express";
import type { AuthRequest } from "../types/auth.types.js";
import { fail, ok } from "../utils/http.js";
import logger from "../config/logger.js";
import {
  CommandExecutionError,
  executeCommand,
} from "../services/command.service.js";
import { extractDesktopIntent } from "../services/desktopIntent.service.js";
import { extractYouTubeSearchQuery } from "../services/youtubeSearch.service.js";
import {
  listCommandHistory,
  updateCommandActionStatus,
} from "../models/command.repo.js";
import { logAppUsage } from "../models/appUsage.repo.js";

export async function executeCommandHandler(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  try {
    if (!req.userId) return fail(res, "Unauthorized", 401);
    const {
      session_id,
      command,
      context_type,
      action_source,
      context_metadata,
      selected_text,
    } = req.body as {
      session_id?: string;
      command?: string;
      context_type?: string;
      action_source?: string;
      context_metadata?: Record<string, unknown>;
      selected_text?: string | null;
    };

    if (!command) return fail(res, "command required", 400);

    const result = await executeCommand({
      userId: req.userId,
      sessionId: session_id,
      command,
      contextType: context_type,
      actionSource: action_source,
      contextMetadata: context_metadata as never,
      selectedText: selected_text ?? null,
    });

    ok(res, result);
  } catch (e: unknown) {
    if (e instanceof CommandExecutionError) {
      logAppUsage({
        userId: req.userId ?? "anon",
        event: "command_error",
        metadata: { message: e.message, status: e.status },
      });
      return fail(res, e.message, e.status);
    }
    logger.error("executeCommand", e);
    fail(res, "Server error", 500, e instanceof Error ? e.message : undefined);
  }
}

export async function listCommandHistoryHandler(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  try {
    if (!req.userId) return fail(res, "Unauthorized", 401);
    const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10) || 1);
    const limit = Math.min(
      100,
      Math.max(1, parseInt(String(req.query.limit ?? "20"), 10) || 20),
    );
    const sort = (req.query.sort as "latest" | "oldest" | undefined) ?? "latest";
    const contextType = req.query.context_type
      ? String(req.query.context_type)
      : undefined;
    const actionSource = req.query.action_source
      ? String(req.query.action_source)
      : undefined;
    const intent = req.query.intent ? String(req.query.intent) : undefined;

    const { items, total } = await listCommandHistory({
      userId: req.userId,
      page,
      limit,
      contextType,
      actionSource,
      intent,
      sort,
    });

    ok(res, {
      items: items.map((row) => ({
        id: row.id,
        command: row.command,
        intent: row.intent,
        steps: row.steps,
        result: row.result,
        actions: row.actions,
        output_type: row.outputType,
        confidence: row.confidence,
        context_type: row.contextType,
        action_source: row.actionSource,
        token_usage: {
          prompt_tokens: row.promptTokens ?? 0,
          completion_tokens: row.completionTokens ?? 0,
          total_tokens: row.totalTokens ?? 0,
          estimated_cost: row.estimatedCost ?? 0,
        },
        duration_ms: row.durationMs,
        status: row.status,
        created_at: row.createdAt,
      })),
      total,
      page,
      limit,
      sort,
    });
  } catch (e: unknown) {
    logger.error("listCommandHistory", e);
    fail(res, "Server error", 500, e instanceof Error ? e.message : undefined);
  }
}

export async function ackCommandActionHandler(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  try {
    if (!req.userId) return fail(res, "Unauthorized", 401);
    const commandId = String(req.params.commandId);
    const { action_index, status, error } = req.body as {
      action_index?: number;
      status?: "pending" | "executed" | "failed";
      error?: string;
    };

    if (!commandId) return fail(res, "commandId required", 400);
    if (typeof action_index !== "number") {
      return fail(res, "action_index required", 400);
    }
    if (!status) return fail(res, "status required", 400);

    const result = await updateCommandActionStatus({
      userId: req.userId,
      commandId,
      actionIndex: action_index,
      status,
      error,
    });

    if (!result) return fail(res, "Command not found", 404);
    if (!result.updated) return fail(res, "Action index out of range", 400);

    logAppUsage({
      userId: req.userId,
      event: "action_acknowledged",
      metadata: { command_id: commandId, action_index, status, error },
    });

    ok(res, { command_id: commandId, action_index, status });
  } catch (e: unknown) {
    logger.error("ackCommandAction", e);
    fail(res, "Server error", 500, e instanceof Error ? e.message : undefined);
  }
}

/** Phase 4.6 — structured desktop intent for local execution (no OPEN_APP). */
export async function desktopIntentHandler(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  try {
    if (!req.userId) return fail(res, "Unauthorized", 401);
    const { command, nlu, last_command, last_intent, last_file, last_folder, last_contact, recent_turns } = req.body as {
      command?: string;
      nlu?: string;
      last_command?: string;
      last_intent?: string;
      last_file?: string;
      last_folder?: string;
      last_contact?: string;
      recent_turns?: Array<{
        command: string;
        intent?: string;
        resolved_path?: string;
        outcome: string;
      }>;
    };
    if (!command?.trim()) return fail(res, "command required", 400);

    const result = await extractDesktopIntent(command.trim(), nlu?.trim(), {
      lastCommand: last_command?.trim(),
      lastIntent: last_intent?.trim(),
      lastFile: last_file?.trim(),
      lastFolder: last_folder?.trim(),
      lastContact: last_contact?.trim(),
      recentTurns: recent_turns,
    });
    if (!result) {
      return fail(res, "Not a desktop command or low confidence", 422);
    }

    ok(res, { plan: result.plan, usage: result.usage });
  } catch (e: unknown) {
    logger.error("desktopIntent", e);
    fail(res, "Server error", 500, e instanceof Error ? e.message : undefined);
  }
}

/** LLM — extract English YouTube search query from voice (any language / encoding). */
export async function youtubeSearchQueryHandler(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  try {
    if (!req.userId) return fail(res, "Unauthorized", 401);
    const { command } = req.body as { command?: string };
    if (!command?.trim()) return fail(res, "command required", 400);

    const result = await extractYouTubeSearchQuery(command.trim());
    if (!result) {
      return fail(res, "Not a YouTube search or low confidence", 422);
    }

    ok(res, { plan: result.plan, usage: result.usage });
  } catch (e: unknown) {
    logger.error("youtubeSearchQuery", e);
    fail(res, "Server error", 500, e instanceof Error ? e.message : undefined);
  }
}
