/**
 * Phase 2 — Command Engine vocabulary.
 * Closed sets so the LLM tool-call output and the ExecutionService stay aligned.
 */

export const INTENTS = [
  "generation",
  "edit",
  "navigation",
  "typing",
  "workflow",
  "undo",
] as const;
export type Intent = (typeof INTENTS)[number];

export const STEPS = [
  "generate",
  "rewrite_formal",
  "rewrite_casual",
  "rewrite_short",
  "rewrite_long",
  "rewrite_emotional",
  "rewrite_professional",
  "summarize",
  "translate",
  "fix_grammar",
  "copy",
  "paste",
  "open_app",
  "undo",
] as const;
export type Step = (typeof STEPS)[number];

export const ACTION_TYPES = [
  "INSERT_TEXT",
  "COPY_TEXT",
  "OPEN_APP",
  "OPEN_URL",
  "SHOW_SUGGESTIONS",
  "WORKFLOW",
  "NOOP",
] as const;
export type ActionType = (typeof ACTION_TYPES)[number];

export type ExecutionStatus = "pending" | "executed" | "failed";
export type OutputType = "text" | "workflow" | "suggestions";

export interface ExecutionAction {
  type: ActionType;
  status?: ExecutionStatus;
  data?: Record<string, unknown>;
}

export interface CommandPlan {
  intent: Intent;
  steps: Step[];
  uses_context: boolean;
  needs_input: boolean;
  confidence: number;
}

export interface TokenUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  estimated_cost: number;
}

export interface AITextResult {
  text: string;
  usage: TokenUsage;
}

export const MAX_STEPS = 4;
