import config from "../config/config.js";
import { getOpenAIClient } from "./openai.service.js";
import { DESKTOP_INTENT_SYSTEM_PROMPT } from "../prompts/system.desktopIntent.js";
import {
  DESKTOP_INTENT_ACTIONS,
  type DesktopIntentPlan,
} from "../types/desktopIntent.types.js";
import logger from "../config/logger.js";
import { emptyUsage, usageFromOpenAI } from "./ai.service.js";
import type { TokenUsage } from "../types/command.types.js";

const TIMEOUT_MS = 5_000;

const RESPONSE_FORMAT = {
  type: "json_schema" as const,
  json_schema: {
    name: "desktop_intent",
    strict: true,
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        action: { type: "string", enum: DESKTOP_INTENT_ACTIONS as unknown as string[] },
        entities: {
          type: "object",
          additionalProperties: false,
          properties: {
            folder: { type: "string", enum: ["downloads", "documents", "desktop"] },
            from_folder: { type: "string", enum: ["downloads", "documents", "desktop"] },
            to_folder: { type: "string", enum: ["downloads", "documents", "desktop"] },
            item_name: { type: "string" },
            file_token: { type: "string" },
            app_name: { type: "string" },
            new_name: { type: "string" },
            extension: { type: "string" },
            time: { type: "string", enum: ["yesterday", "today", "last_week"] },
            recall_target: {
              type: "string",
              enum: ["auto", "file", "folder", "app", "workspace"],
            },
            system_action: {
              type: "string",
              enum: [
                "lock",
                "settings",
                "bluetooth",
                "network",
                "wifi",
                "control_panel",
                "task_manager",
              ],
            },
          },
          required: [],
        },
        confidence: { type: "number", minimum: 0, maximum: 1 },
        language: { type: "string" },
      },
      required: ["action", "entities", "confidence"],
    },
  },
};

function safeParsePlan(raw: string): DesktopIntentPlan | null {
  try {
    const obj = JSON.parse(raw) as DesktopIntentPlan;
    if (
      obj &&
      typeof obj.action === "string" &&
      DESKTOP_INTENT_ACTIONS.includes(obj.action) &&
      obj.entities &&
      typeof obj.confidence === "number"
    ) {
      return obj;
    }
  } catch {
    /* fall through */
  }
  return null;
}

export interface DesktopIntentResult {
  plan: DesktopIntentPlan;
  usage: TokenUsage;
}

export async function extractDesktopIntent(
  command: string,
  nlu?: string,
  session?: {
    lastCommand?: string;
    lastIntent?: string;
    lastFile?: string;
    lastFolder?: string;
    lastContact?: string;
    recentTurns?: Array<{
      command: string;
      intent?: string;
      resolved_path?: string;
      outcome: string;
    }>;
  },
): Promise<DesktopIntentResult | null> {
  if (!config.OPENAI_API_KEY) {
    logger.warn("desktopIntent.no_openai_key");
    return null;
  }

  const sessionLines: string[] = [];
  if (session?.lastCommand) {
    sessionLines.push(`Previous command: ${session.lastCommand}`);
  }
  if (session?.lastIntent) {
    sessionLines.push(`Previous intent: ${session.lastIntent}`);
  }
  if (session?.lastFile) {
    sessionLines.push(`Last opened file path: ${session.lastFile}`);
  }
  if (session?.lastFolder) {
    sessionLines.push(`Last opened folder path: ${session.lastFolder}`);
  }
  if (session?.lastContact) {
    sessionLines.push(`Last contact: ${session.lastContact}`);
  }
  if (session?.recentTurns?.length) {
    const turns = session.recentTurns
      .slice(0, 3)
      .map(
        (t, i) =>
          `${i + 1}. "${t.command}" → ${t.intent ?? "unknown"} (${t.outcome})`,
      )
      .join("\n");
    sessionLines.push(`Recent turns:\n${turns}`);
  }

function isRegionalScript(text: string): boolean {
  return /[\u0900-\u097F\u0600-\u06FF\u0B80-\u0BFF]/u.test(text);
}

  const cleanNlu =
    nlu &&
    nlu !== command &&
    !isRegionalScript(command) &&
    !/\b(?:banao|naam|karo|ke\s+anda?r?|andar|kahande|mein|naya)\b/i.test(nlu)
      ? nlu.trim()
      : undefined;

  const userContent = [
    sessionLines.length ? sessionLines.join("\n") : null,
    cleanNlu
      ? `Raw speech: ${command.trim()}\nNormalized English: ${cleanNlu}`
      : command.trim(),
  ]
    .filter(Boolean)
    .join("\n\n");

  const client = getOpenAIClient();
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), TIMEOUT_MS);

  try {
    const resp = await client.chat.completions.create(
      {
        model: config.OPENAI_MODEL,
        messages: [
          { role: "system", content: DESKTOP_INTENT_SYSTEM_PROMPT },
          { role: "user", content: userContent },
        ],
        temperature: 0,
        response_format: RESPONSE_FORMAT,
      },
      { signal: ac.signal },
    );

    const raw = resp.choices[0]?.message?.content ?? "";
    const plan = safeParsePlan(raw);
    if (!plan || plan.action === "none" || plan.confidence < 0.45) {
      logger.info("desktopIntent.rejected", {
        command: command.slice(0, 80),
        action: plan?.action,
        confidence: plan?.confidence,
        hadNlu: Boolean(cleanNlu),
      });
      return null;
    }

    return { plan, usage: usageFromOpenAI(resp.usage) };
  } catch (e: unknown) {
    logger.warn("desktopIntent.failed", {
      err: e instanceof Error ? e.message : String(e),
    });
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export { emptyUsage };
