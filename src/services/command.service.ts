import logger from "../config/logger.js";
import { randomUUID } from "node:crypto";
import { isOpenAIConfigured } from "./openai.service.js";
import {
  detectIntent,
  resolveAppTarget,
  type DetectInput,
} from "./intent.service.js";
import {
  fixGrammar,
  generate,
  rewrite,
  summarize,
  translate,
} from "./ai.service.js";
import {
  actionForStep,
  isFinalProducingStep,
  suggestionAction,
  workflowAction,
} from "./execution.service.js";
import { extractRecipientFromCommand } from "../utils/extractRecipient.js";
import { addUsage, emptyUsage } from "./ai.service.js";
import {
  HISTORY_WINDOW_SIZE,
  type SessionContext,
} from "../types/session.types.js";
import type {
  AITextResult,
  ExecutionAction,
  OutputType,
  Step,
  TokenUsage,
} from "../types/command.types.js";
import {
  findActiveSessionForUser,
  updateSessionContext,
} from "../models/session.repo.js";
import { createCommandHistory } from "../models/command.repo.js";
import { logAppUsage } from "../models/appUsage.repo.js";

export interface ExecuteCommandInput {
  userId: string;
  sessionId?: string;
  command: string;
  contextType?: string;
  actionSource?: string;
  selectedText?: string | null;
  contextMetadata?: SessionContext["context_metadata"];
}

export interface ExecuteCommandResult {
  command_id: string;
  intent: string;
  steps: Step[];
  result: string | null;
  actions: ExecutionAction[];
  output_type: OutputType;
  confidence: number;
  token_usage: TokenUsage;
  context_type: string | null;
  action_source: string | null;
  duration_ms: number;
  source: "rule" | "llm";
}

export class CommandExecutionError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

async function loadContext(args: {
  userId: string;
  sessionId?: string;
  contextType?: string;
  actionSource?: string;
  contextMetadata?: SessionContext["context_metadata"];
}): Promise<{
  sessionId?: string;
  context: SessionContext;
}> {
  if (!args.sessionId) {
    return {
      context: {
        context_type: (args.contextType as SessionContext["context_type"]) ?? "general",
        action_source: (args.actionSource as SessionContext["action_source"]) ?? "desktop",
        context_metadata: args.contextMetadata,
      },
    };
  }
  const session = await findActiveSessionForUser(args.userId, args.sessionId);
  if (!session) {
    throw new CommandExecutionError("Session not found or inactive", 404);
  }
  const stored = (session.context ?? {}) as SessionContext;
  return {
    sessionId: session.id,
    context: {
      ...stored,
      context_type:
        (args.contextType as SessionContext["context_type"]) ??
        stored.context_type ??
        "general",
      action_source:
        (args.actionSource as SessionContext["action_source"]) ??
        stored.action_source ??
        "desktop",
      context_metadata: {
        ...(stored.context_metadata ?? {}),
        ...(args.contextMetadata ?? {}),
      },
    },
  };
}

async function runStep(args: {
  step: Step;
  workingText: string;
  command: string;
  contextType?: string;
  actionSource?: string;
}): Promise<AITextResult> {
  const ctx = {
    contextType: args.contextType,
    actionSource: args.actionSource,
  };

  switch (args.step) {
    case "generate":
      return generate(args.command, ctx);
    case "rewrite_formal":
    case "rewrite_casual":
    case "rewrite_short":
    case "rewrite_long":
    case "rewrite_emotional":
    case "rewrite_confident":
    case "rewrite_sad":
    case "rewrite_angry":
    case "rewrite_professional":
      if (!args.workingText) {
        throw new CommandExecutionError(
          `No prior text to ${args.step.replace("_", " ")}`,
          400,
        );
      }
      return rewrite(args.step, args.workingText, ctx);
    case "summarize":
      if (!args.workingText) {
        throw new CommandExecutionError("No text to summarize", 400);
      }
      return summarize(args.workingText, ctx);
    case "fix_grammar":
      if (!args.workingText) {
        throw new CommandExecutionError("No text to fix", 400);
      }
      return fixGrammar(args.workingText, ctx);
    case "translate":
      if (!args.workingText) {
        throw new CommandExecutionError("No text to translate", 400);
      }
      return translate(args.workingText, "English", ctx);
    case "copy":
    case "paste":
    case "open_app":
    case "undo":
      // non-AI steps — no text mutation
      return { text: args.workingText, usage: emptyUsage() };
    default:
      return { text: args.workingText, usage: emptyUsage() };
  }
}

function outputTypeFor(actions: ExecutionAction[], intent: string): OutputType {
  if (actions.some((a) => a.type === "SHOW_SUGGESTIONS")) return "suggestions";
  if (intent === "workflow" || actions.some((a) => a.type === "WORKFLOW")) {
    return "workflow";
  }
  return "text";
}

export async function executeCommand(
  input: ExecuteCommandInput,
): Promise<ExecuteCommandResult> {
  const startedAt = Date.now();

  if (!isOpenAIConfigured()) {
    throw new CommandExecutionError("OPENAI_API_KEY not set", 501);
  }

  const { sessionId, context } = await loadContext({
    userId: input.userId,
    sessionId: input.sessionId,
    contextType: input.contextType,
    actionSource: input.actionSource,
    contextMetadata: input.contextMetadata,
  });

  const detectInput: DetectInput = {
    command: input.command,
    hasLastOutput: Boolean(context.last_output),
    hasSelectedText: Boolean(input.selectedText),
  };
  const detection = await detectIntent(detectInput);
  const plan = detection.plan;
  let tokenUsage = detection.usage;

  if (plan.confidence < 0.7 || plan.needs_input) {
    const reason = plan.needs_input
      ? "More input is needed before running this command."
      : "Low confidence intent classification. Please confirm what you want.";
    const actions = [
      suggestionAction({
        reason,
        suggestions: [
          "Rewrite selected text",
          "Generate new text",
          "Open an app",
        ],
      }),
    ];
    const durationMs = Date.now() - startedAt;
    const history = await createCommandHistory({
      userId: input.userId,
      sessionId: sessionId ?? null,
      command: input.command,
      intent: plan.intent,
      steps: plan.steps as unknown as string[],
      result: null,
      actions,
      outputType: "suggestions",
      confidence: plan.confidence,
      contextType: context.context_type ?? null,
      actionSource: context.action_source ?? null,
      promptTokens: tokenUsage.prompt_tokens,
      completionTokens: tokenUsage.completion_tokens,
      totalTokens: tokenUsage.total_tokens,
      estimatedCost: tokenUsage.estimated_cost,
      durationMs,
      status: "partial",
    });
    const commandId = history?.id ?? randomUUID();

    return {
      command_id: commandId,
      intent: plan.intent,
      steps: plan.steps as Step[],
      result: null,
      actions,
      output_type: "suggestions",
      confidence: plan.confidence,
      token_usage: tokenUsage,
      context_type: context.context_type ?? null,
      action_source: context.action_source ?? null,
      duration_ms: durationMs,
      source: detection.source,
    };
  }

  // Initial working text for the chain.
  const startingText =
    input.selectedText ?? (plan.uses_context ? context.last_output ?? "" : "");

  let workingText = startingText;
  const actions: ExecutionAction[] = [];

  for (let i = 0; i < plan.steps.length; i++) {
    const step = plan.steps[i] as Step;

    if (step === "undo") {
      workingText = context.previous_output ?? "";
      const action = actionForStep({ step, text: workingText });
      if (action) actions.push(action);
      continue;
    }
    if (step === "copy") {
      const text = context.last_output ?? workingText;
      const action = actionForStep({ step, text });
      if (action) actions.push(action);
      workingText = text;
      continue;
    }
    if (step === "paste") {
      const text = context.last_output ?? workingText;
      const action = actionForStep({ step, text });
      if (action) actions.push(action);
      workingText = text;
      continue;
    }
    if (step === "open_app") {
      const target = detection.appTarget ?? resolveAppTarget(input.command);
      const action = actionForStep({ step, appTarget: target });
      if (action) actions.push(action);
      continue;
    }

    // AI step
    const stepResult = await runStep({
      step,
      workingText,
      command: input.command,
      contextType: context.context_type,
      actionSource: context.action_source,
    });
    workingText = stepResult.text;
    tokenUsage = addUsage(tokenUsage, stepResult.usage);

    const isLastAiStep =
      isFinalProducingStep(step) &&
      !plan.steps.slice(i + 1).some((s) => isFinalProducingStep(s as Step));

    if (isLastAiStep) {
      const action = actionForStep({ step, text: workingText });
      if (action) {
        if (action.type === "INSERT_TEXT") {
          const recipient = extractRecipientFromCommand(input.command);
          if (recipient) {
            action.data = { ...action.data, recipient, text: workingText };
          }
        }
        actions.push(action);
      }
    }
  }

  const finalResult =
    plan.intent === "navigation" && !workingText ? null : workingText || null;
  const durationMs = Date.now() - startedAt;
  const finalActions =
    plan.intent === "workflow" && actions.length > 1
      ? [workflowAction(actions)]
      : actions;
  const outputType = outputTypeFor(finalActions, plan.intent);

  // Persist CommandHistory
  const history = await createCommandHistory({
    userId: input.userId,
    sessionId: sessionId ?? null,
    command: input.command,
    intent: plan.intent,
    steps: plan.steps as unknown as string[],
    result: finalResult,
    actions: finalActions,
    outputType,
    confidence: plan.confidence,
    contextType: context.context_type ?? null,
    actionSource: context.action_source ?? null,
    promptTokens: tokenUsage.prompt_tokens,
    completionTokens: tokenUsage.completion_tokens,
    totalTokens: tokenUsage.total_tokens,
    estimatedCost: tokenUsage.estimated_cost,
    durationMs,
    status: "success",
  });
  const commandId = history?.id ?? randomUUID();

  // Analytics — fire and forget
  logAppUsage({
    userId: input.userId,
    sessionId: sessionId ?? null,
    event: "command_executed",
    action: plan.intent,
    contextType: context.context_type ?? null,
    actionSource: context.action_source ?? null,
    metadata: {
      steps: plan.steps,
      duration_ms: durationMs,
      source: detection.source,
      command_id: commandId,
      confidence: plan.confidence,
      output_type: outputType,
      token_usage: tokenUsage,
    },
  });
  logAppUsage({
    userId: input.userId,
    sessionId: sessionId ?? null,
    event: "intent_classified",
    action: plan.intent,
    metadata: { source: detection.source, confidence: plan.confidence },
  });

  // Update session context (rotate last_output → previous_output if changed)
  if (sessionId) {
    const newLast = finalResult ?? context.last_output ?? "";
    const newPrev =
      newLast && newLast !== context.last_output
        ? context.last_output ?? context.previous_output ?? ""
        : context.previous_output ?? "";

    const window = [
      ...(context.history_window ?? []),
      {
        command: input.command,
        result: finalResult ?? "",
        ts: new Date().toISOString(),
      },
    ].slice(-HISTORY_WINDOW_SIZE);

    try {
      await updateSessionContext(sessionId, {
        ...context,
        last_output: newLast || undefined,
        previous_output: newPrev || undefined,
        last_intent: plan.intent,
        last_command: input.command,
        last_steps: plan.steps as unknown as string[],
        history_window: window,
      });
    } catch (e) {
      logger.warn("session.context.update.failed", e);
    }
  }

  return {
    command_id: commandId,
    intent: plan.intent,
    steps: plan.steps as Step[],
    result: finalResult,
    actions: finalActions,
    output_type: outputType,
    confidence: plan.confidence,
    token_usage: tokenUsage,
    context_type: context.context_type ?? null,
    action_source: context.action_source ?? null,
    duration_ms: durationMs,
    source: detection.source,
  };
}
