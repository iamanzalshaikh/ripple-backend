import config from "../config/config.js";
import { getOpenAIClient } from "./openai.service.js";
import { INTENT_CLASSIFIER_SYSTEM_PROMPT } from "../prompts/index.js";
import {
  INTENTS,
  MAX_STEPS,
  STEPS,
  type CommandPlan,
  type Intent,
  type Step,
} from "../types/command.types.js";
import logger from "../config/logger.js";
import { emptyUsage, usageFromOpenAI } from "./ai.service.js";
import type { TokenUsage } from "../types/command.types.js";

const INTENT_TIMEOUT_MS = 6_000;

const APP_TARGETS: Record<string, { url: string; name: string }> = {
  gmail: { url: "https://mail.google.com", name: "Gmail" },
  outlook: { url: "https://outlook.live.com", name: "Outlook" },
  whatsapp: { url: "https://web.whatsapp.com", name: "WhatsApp" },
  slack: { url: "https://app.slack.com", name: "Slack" },
  linkedin: { url: "https://www.linkedin.com", name: "LinkedIn" },
  instagram: { url: "https://www.instagram.com", name: "Instagram" },
  notion: { url: "https://www.notion.so", name: "Notion" },
  twitter: { url: "https://twitter.com", name: "Twitter" },
  youtube: { url: "https://www.youtube.com", name: "YouTube" },
  google: { url: "https://www.google.com", name: "Google" },
  github: { url: "https://github.com", name: "GitHub" },
};

export interface DetectInput {
  command: string;
  hasLastOutput: boolean;
  hasSelectedText: boolean;
}

export interface DetectResult {
  plan: CommandPlan;
  source: "rule" | "llm";
  usage: TokenUsage;
  appTarget?: { url: string; name: string };
}

const TRIM_RX = /[.\s!,?]+$/g;

function detectToneStep(cmd: string): Step | null {
  const c = cmd.toLowerCase();
  if (/(?:جذباتی|جذبات)/u.test(cmd)) return "rewrite_emotional";
  if (/(?:اعتماد|پراعتماد)/u.test(cmd)) return "rewrite_confident";
  if (/(?:بہتر|بہترین|واضح|ضرورت|طریقہ)/u.test(cmd)) return "rewrite_professional";
  if (/\b(jazbati)\b/.test(c)) return "rewrite_emotional";
  if (/\b(behtar|behtareen)\b/.test(c)) return "rewrite_professional";
  if (/\b(emotional|emotionally|warm|empathetic)\b/.test(c)) return "rewrite_emotional";
  if (/\b(confident|confidence|assertive)\b/.test(c)) return "rewrite_confident";
  if (/\b(sad|sadly|sorrow|upset)\b/.test(c)) return "rewrite_sad";
  if (/\b(angry|angrily|mad|furious)\b/.test(c)) return "rewrite_angry";
  if (/\b(professional|professionally|polished)\b/.test(c)) return "rewrite_professional";
  if (/\b(formal|formally)\b/.test(c)) return "rewrite_formal";
  if (/\b(casual|friendly|relaxed)\b/.test(c)) return "rewrite_casual";
  if (/\b(short|shorter|concise|brief)\b/.test(c)) return "rewrite_short";
  if (/\b(long|longer|expand|detailed)\b/.test(c)) return "rewrite_long";
  return null;
}

export function ruleClassify(input: DetectInput): DetectResult | null {
  const cmd = input.command.trim().toLowerCase().replace(TRIM_RX, "");
  if (!cmd) return null;

  if (
    /(?:بہتر|بہترین|جذباتی|اعتماد|واضح|تبدیل|دوبارہ|لکھ|ضرورت|ای\s*میل|طریقہ)/u.test(
      input.command,
    )
  ) {
    const tone = detectToneStep(input.command);
    return {
      plan: {
        intent: "edit",
        steps: [tone ?? "generate"],
        uses_context: !input.hasSelectedText,
        needs_input: false,
        confidence: 0.9,
      },
      source: "rule",
      usage: emptyUsage(),
    };
  }

  if (/\b(rephrase|rewrite|reword|revise)\b/.test(cmd)) {
    const tone = detectToneStep(cmd);
    const hasInlineText = /\b(rephrase|rewrite|reword|revise)\s*[,]?\s+\w/.test(
      input.command,
    );
    return {
      plan: {
        intent: "edit",
        steps: [tone ?? "generate"],
        uses_context: !hasInlineText && !input.hasSelectedText,
        needs_input: false,
        confidence: 0.92,
      },
      source: "rule",
      usage: emptyUsage(),
    };
  }

  if (/\bmake\s+it\s+(more\s+)?(emotional|confident|sad|angry|formal|casual|professional|friendly|short|long)\b/.test(cmd)) {
    const tone = detectToneStep(cmd);
    if (tone) {
      const hasInlineBody = /^.+\s+make\s+it\s+(?:more\s+)?(?:emotional|confident|sad|angry|formal|casual|professional|friendly|short|long)\b/i.test(
        input.command.trim(),
      );
      return {
        plan: {
          intent: "edit",
          steps: [tone],
          uses_context: !hasInlineBody && !input.hasSelectedText,
          needs_input: false,
          confidence: 0.9,
        },
        source: "rule",
        usage: emptyUsage(),
      };
    }
  }

  if (
    /\bmake\s+(?:this|that|these)\s+texts?\s+(?:more\s+)?(emotional|confident|sad|angry|formal|casual|professional|friendly|short|long)\b/.test(
      cmd,
    )
  ) {
    const tone = detectToneStep(cmd);
    if (tone) {
      const hasInlineBody =
        /^.+\s+make\s+(?:this|that|these)\s+texts?\s+(?:more\s+)?/i.test(
          input.command.trim(),
        );
      return {
        plan: {
          intent: "edit",
          steps: [tone],
          uses_context: !hasInlineBody && !input.hasSelectedText,
          needs_input: false,
          confidence: 0.92,
        },
        source: "rule",
        usage: emptyUsage(),
      };
    }
  }

  if (/\b(refresh|improve|fix)\b/.test(cmd) && detectToneStep(cmd)) {
    const tone = detectToneStep(cmd)!;
    return {
      plan: {
        intent: "edit",
        steps: [tone],
        uses_context: !input.hasSelectedText,
        needs_input: false,
        confidence: 0.88,
      },
      source: "rule",
      usage: emptyUsage(),
    };
  }

  if (cmd === "undo" || cmd === "revert" || cmd === "remove last line") {
    return {
      plan: {
        intent: "undo",
        steps: ["undo"],
        uses_context: true,
        needs_input: false,
        confidence: 1,
      },
      source: "rule",
      usage: emptyUsage(),
    };
  }

  if (cmd === "copy" || cmd === "copy this" || cmd === "copy that") {
    return {
      plan: {
        intent: "typing",
        steps: ["copy"],
        uses_context: true,
        needs_input: false,
        confidence: 1,
      },
      source: "rule",
      usage: emptyUsage(),
    };
  }

  if (cmd === "paste" || cmd === "paste this" || cmd === "paste that") {
    return {
      plan: {
        intent: "typing",
        steps: ["paste"],
        uses_context: true,
        needs_input: false,
        confidence: 1,
      },
      source: "rule",
      usage: emptyUsage(),
    };
  }

  if (cmd === "help" || cmd === "what can you do") {
    return {
      plan: {
        intent: "generation",
        steps: ["generate"],
        uses_context: false,
        needs_input: false,
        confidence: 0.25,
      },
      source: "rule",
      usage: emptyUsage(),
    };
  }

  const workflowMatch = cmd.match(/^open\s+(\w+)\s+and\s+(.+)$/);
  if (workflowMatch) {
    const known = APP_TARGETS[workflowMatch[1]];
    if (known) {
      return {
        plan: {
          intent: "workflow",
          steps: ["open_app", "generate"],
          uses_context: false,
          needs_input: false,
          confidence: 0.95,
        },
        source: "rule",
        usage: emptyUsage(),
        appTarget: known,
      };
    }
  }

  const navMatch = cmd.match(/^open\s+(.+?)$/);
  if (navMatch) {
    const target = navMatch[1].trim().split(/\s+/)[0]; // single token target
    const known = APP_TARGETS[target];
    if (known) {
      return {
        plan: {
          intent: "navigation",
          steps: ["open_app"],
          uses_context: false,
          needs_input: false,
          confidence: 1,
        },
        source: "rule",
        usage: emptyUsage(),
        appTarget: known,
      };
    }
  }

  return null;
}

const RESPONSE_FORMAT = {
  type: "json_schema" as const,
  json_schema: {
    name: "command_plan",
    strict: true,
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        intent: { type: "string", enum: INTENTS as unknown as string[] },
        steps: {
          type: "array",
          minItems: 1,
          maxItems: MAX_STEPS,
          items: { type: "string", enum: STEPS as unknown as string[] },
        },
        uses_context: { type: "boolean" },
        needs_input: { type: "boolean" },
        confidence: { type: "number", minimum: 0, maximum: 1 },
      },
      required: ["intent", "steps", "uses_context", "needs_input", "confidence"],
    },
  },
};

function safeParsePlan(raw: string): CommandPlan | null {
  try {
    const obj = JSON.parse(raw);
    if (
      obj &&
      typeof obj.intent === "string" &&
      INTENTS.includes(obj.intent as Intent) &&
      Array.isArray(obj.steps) &&
      obj.steps.length > 0 &&
      obj.steps.length <= MAX_STEPS &&
      obj.steps.every(
        (s: unknown) =>
          typeof s === "string" && STEPS.includes(s as Step),
      ) &&
      typeof obj.uses_context === "boolean" &&
      typeof obj.needs_input === "boolean" &&
      typeof obj.confidence === "number" &&
      obj.confidence >= 0 &&
      obj.confidence <= 1
    ) {
      return obj as CommandPlan;
    }
  } catch {
    /* fall through */
  }
  return null;
}

export async function llmClassify(input: DetectInput): Promise<DetectResult> {
  const client = getOpenAIClient();
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), INTENT_TIMEOUT_MS);
  try {
    const resp = await client.chat.completions.create(
      {
        model: config.OPENAI_MODEL,
        messages: [
          { role: "system", content: INTENT_CLASSIFIER_SYSTEM_PROMPT },
          {
            role: "user",
            content: JSON.stringify({
              command: input.command,
              has_last_output: input.hasLastOutput,
              has_selected_text: input.hasSelectedText,
            }),
          },
        ],
        temperature: 0,
        response_format: RESPONSE_FORMAT,
      },
      { signal: ac.signal },
    );
    const raw = resp.choices[0]?.message?.content ?? "";
    const plan = safeParsePlan(raw);
    if (plan) return { plan, source: "llm", usage: usageFromOpenAI(resp.usage) };
    logger.warn("intent.llm.invalid_json", { raw });
  } finally {
    clearTimeout(timer);
  }
  // Fallback: treat as plain generation
  return {
    plan: {
      intent: "generation",
      steps: ["generate"],
      uses_context: false,
      needs_input: false,
      confidence: 0.35,
    },
    source: "llm",
    usage: emptyUsage(),
  };
}

export async function detectIntent(input: DetectInput): Promise<DetectResult> {
  const ruled = ruleClassify(input);
  if (ruled) return ruled;
  return llmClassify(input);
}

export function resolveAppTarget(command: string): { url: string; name: string } | undefined {
  const cmd = command.trim().toLowerCase();
  for (const key of Object.keys(APP_TARGETS)) {
    if (cmd.includes(key)) return APP_TARGETS[key];
  }
  return undefined;
}
