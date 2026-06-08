import config from "../config/config.js";
import { getOpenAIClient } from "./openai.service.js";
import { pickSystemPrompt } from "../prompts/index.js";
import type { ContextType, ActionSource } from "../types/session.types.js";
import type { AITextResult, TokenUsage } from "../types/command.types.js";

const AI_TIMEOUT_MS = config.AI_TIMEOUT_MS;
const MAX_OUTPUT_CHARS = 8000;
const MODEL_PRICING_USD_PER_1M: Record<string, { input: number; output: number }> = {
  "gpt-4o-mini": { input: 0.15, output: 0.6 },
  "gpt-4o": { input: 5, output: 15 },
};

export function emptyUsage(): TokenUsage {
  return {
    prompt_tokens: 0,
    completion_tokens: 0,
    total_tokens: 0,
    estimated_cost: 0,
  };
}

export function addUsage(a: TokenUsage, b: TokenUsage): TokenUsage {
  return {
    prompt_tokens: a.prompt_tokens + b.prompt_tokens,
    completion_tokens: a.completion_tokens + b.completion_tokens,
    total_tokens: a.total_tokens + b.total_tokens,
    estimated_cost: Number((a.estimated_cost + b.estimated_cost).toFixed(8)),
  };
}

export function usageFromOpenAI(usage?: {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
}): TokenUsage {
  const prompt = usage?.prompt_tokens ?? 0;
  const completion = usage?.completion_tokens ?? 0;
  const total = usage?.total_tokens ?? prompt + completion;
  const pricing =
    MODEL_PRICING_USD_PER_1M[config.OPENAI_MODEL] ??
    MODEL_PRICING_USD_PER_1M["gpt-4o-mini"];

  return {
    prompt_tokens: prompt,
    completion_tokens: completion,
    total_tokens: total,
    estimated_cost: Number(
      (
        (prompt / 1_000_000) * pricing.input +
        (completion / 1_000_000) * pricing.output
      ).toFixed(8),
    ),
  };
}

export interface AIRunArgs {
  systemPrompt?: string;
  userPrompt: string;
  temperature?: number;
}

async function chat(args: AIRunArgs): Promise<AITextResult> {
  const client = getOpenAIClient();
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), AI_TIMEOUT_MS);
  try {
    const resp = await client.chat.completions.create(
      {
        model: config.OPENAI_MODEL,
        messages: [
          { role: "system", content: args.systemPrompt ?? "You are a helpful assistant." },
          { role: "user", content: args.userPrompt },
        ],
        temperature: args.temperature ?? 0.4,
      },
      { signal: ac.signal },
    );
    const text = resp.choices[0]?.message?.content?.trim() ?? "";
    return {
      text: text.slice(0, MAX_OUTPUT_CHARS),
      usage: usageFromOpenAI(resp.usage),
    };
  } finally {
    clearTimeout(timer);
  }
}

export interface AIContext {
  contextType?: ContextType | string;
  actionSource?: ActionSource | string;
}

function buildSystem(ctx: AIContext): string {
  const type =
    ctx.contextType === "general" && ctx.actionSource === "notion"
      ? "notion"
      : ctx.contextType;
  const base = pickSystemPrompt(type);
  return ctx.actionSource
    ? `${base}\n\nDestination app: ${ctx.actionSource}.`
    : base;
}

export async function generate(
  command: string,
  ctx: AIContext,
): Promise<AITextResult> {
  return chat({
    systemPrompt: buildSystem(ctx),
    userPrompt: `User request: ${command}\n\nWrite the requested content now.`,
    temperature: 0.6,
  });
}

const REWRITE_INSTRUCTIONS: Record<string, string> = {
  rewrite_formal: "Rewrite the text in a clear, formal tone. Keep meaning and language.",
  rewrite_casual: "Rewrite the text in a casual tone. Keep meaning and language.",
  rewrite_short: "Rewrite the text more concisely. Cut redundancy. Keep the core meaning.",
  rewrite_long: "Expand the text with clearer detail. Keep the same intent and language.",
  rewrite_emotional: "Rewrite the text with warmer, more emotional, empathetic phrasing.",
  rewrite_confident: "Rewrite the text in a confident, assured, self-assured tone.",
  rewrite_sad: "Rewrite the text in a softer, melancholy, sad tone while keeping the meaning.",
  rewrite_angry: "Rewrite the text in a firm, frustrated, angry tone while staying appropriate for messaging.",
  rewrite_professional: "Rewrite the text in a professional, polished tone.",
};

export async function rewrite(
  step: keyof typeof REWRITE_INSTRUCTIONS,
  text: string,
  ctx: AIContext,
): Promise<AITextResult> {
  const instruction = REWRITE_INSTRUCTIONS[step] ?? REWRITE_INSTRUCTIONS.rewrite_formal;
  return chat({
    systemPrompt: buildSystem(ctx),
    userPrompt: `${instruction}\n\nTEXT:\n${text}`,
    temperature: 0.3,
  });
}

export async function summarize(
  text: string,
  ctx: AIContext,
): Promise<AITextResult> {
  return chat({
    systemPrompt: buildSystem(ctx),
    userPrompt: `Summarize the following text. Be concise. Keep language.\n\nTEXT:\n${text}`,
    temperature: 0.2,
  });
}

export async function fixGrammar(
  text: string,
  ctx: AIContext,
): Promise<AITextResult> {
  return chat({
    systemPrompt: buildSystem(ctx),
    userPrompt: `Fix grammar and spelling. Keep meaning. Preserve language.\n\nTEXT:\n${text}`,
    temperature: 0.1,
  });
}

export async function translate(
  text: string,
  targetLang: string,
  ctx: AIContext,
): Promise<AITextResult> {
  return chat({
    systemPrompt: buildSystem(ctx),
    userPrompt: `Translate the following into ${targetLang}. Return only the translation.\n\nTEXT:\n${text}`,
    temperature: 0.2,
  });
}

export const REWRITE_STEPS = Object.keys(REWRITE_INSTRUCTIONS);
