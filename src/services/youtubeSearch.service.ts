import config from "../config/config.js";
import { getOpenAIClient } from "./openai.service.js";
import { YOUTUBE_SEARCH_QUERY_PROMPT } from "../prompts/system.youtubeSearch.js";
import logger from "../config/logger.js";
import { emptyUsage, usageFromOpenAI } from "./ai.service.js";
import type { TokenUsage } from "../types/command.types.js";

const TIMEOUT_MS = 6_000;

export type YouTubeSearchPlan = {
  query: string;
  kind: "search" | "play";
  confidence: number;
};

const RESPONSE_FORMAT = {
  type: "json_schema" as const,
  json_schema: {
    name: "youtube_search",
    strict: true,
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        query: { type: "string" },
        kind: { type: "string", enum: ["search", "play"] },
        confidence: { type: "number", minimum: 0, maximum: 1 },
      },
      required: ["query", "kind", "confidence"],
    },
  },
};

function safeParse(raw: string): YouTubeSearchPlan | null {
  try {
    const obj = JSON.parse(raw) as YouTubeSearchPlan;
    if (
      obj &&
      typeof obj.query === "string" &&
      (obj.kind === "search" || obj.kind === "play") &&
      typeof obj.confidence === "number" &&
      obj.query.trim().length >= 2
    ) {
      return {
        query: obj.query.trim().slice(0, 200),
        kind: obj.kind,
        confidence: obj.confidence,
      };
    }
  } catch {
    /* fall through */
  }
  return null;
}

export async function extractYouTubeSearchQuery(
  command: string,
): Promise<{ plan: YouTubeSearchPlan; usage: TokenUsage } | null> {
  const trimmed = command.trim();
  if (!trimmed) return null;

  const client = getOpenAIClient();
  const ac = new AbortController();
  const timeout = setTimeout(() => ac.abort(), TIMEOUT_MS);

  try {
    const res = await client.chat.completions.create(
      {
        model: config.OPENAI_MODEL,
        temperature: 0.1,
        max_tokens: 120,
        messages: [
          { role: "system", content: YOUTUBE_SEARCH_QUERY_PROMPT },
          {
            role: "user",
            content: `Voice command: ${trimmed}`,
          },
        ],
        response_format: RESPONSE_FORMAT,
      },
      { signal: ac.signal },
    );

    const raw = res.choices[0]?.message?.content?.trim();
    if (!raw) return null;

    const plan = safeParse(raw);
    if (!plan || plan.confidence < 0.45) return null;

    return { plan, usage: usageFromOpenAI(res) };
  } catch (e: unknown) {
    logger.warn("youtubeSearch.extract", e);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
