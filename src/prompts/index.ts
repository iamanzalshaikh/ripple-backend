import type { ContextType } from "../types/session.types.js";
import { GENERIC_SYSTEM_PROMPT } from "./system.generic.js";
import { EMAIL_SYSTEM_PROMPT } from "./system.email.js";
import { WHATSAPP_SYSTEM_PROMPT } from "./system.whatsapp.js";
import { LINKEDIN_SYSTEM_PROMPT } from "./system.linkedin.js";
import { SLACK_SYSTEM_PROMPT } from "./system.slack.js";
import { NOTION_SYSTEM_PROMPT } from "./system.notion.js";
import { INSTAGRAM_SYSTEM_PROMPT } from "./system.instagram.js";

export function pickSystemPrompt(contextType?: ContextType | string): string {
  switch (contextType) {
    case "email":
      return EMAIL_SYSTEM_PROMPT;
    case "whatsapp":
      return WHATSAPP_SYSTEM_PROMPT;
    case "linkedin":
      return LINKEDIN_SYSTEM_PROMPT;
    case "slack":
      return SLACK_SYSTEM_PROMPT;
    case "notion":
      return NOTION_SYSTEM_PROMPT;
    case "instagram":
      return INSTAGRAM_SYSTEM_PROMPT;
    default:
      return GENERIC_SYSTEM_PROMPT;
  }
}

export const INTENT_CLASSIFIER_SYSTEM_PROMPT = `You are an intent classifier for a desktop AI assistant.
Given a short user command, classify it into a structured plan.

INTENTS:
- "navigation"  : open an app or website (e.g. "open gmail")
- "generation"  : create new content from scratch (e.g. "write apology email")
- "edit"        : modify the user's last output or selected text (e.g. "make it shorter")
- "typing"      : copy/paste/insert without AI ("copy that", "paste")
- "workflow"    : multi-step combining navigation + generation (e.g. "open gmail and write apology")
- "undo"        : revert to previous output ("undo", "revert")

STEPS (closed vocabulary, in execution order):
generate, rewrite_formal, rewrite_casual, rewrite_short, rewrite_long,
rewrite_emotional, rewrite_confident, rewrite_sad, rewrite_angry, rewrite_professional, summarize, translate, fix_grammar,
copy, paste, open_app, undo

RULES:
- Maximum 4 steps.
- "uses_context" = true only when the command references prior output ("it", "that", "this", "the email", "shorter", "more formal").
- "needs_input" = true when the user references selected text they haven't pasted ("translate this").
- "confidence" is 0 to 1. Use high confidence (0.85+) only when the intent and steps are obvious.
- Use low confidence (<0.7) for ambiguous, incomplete, noisy, or potentially unsafe commands.
- For pure navigation, steps = ["open_app"].
- For "make it X" without explicit content, steps start at the rewrite verb (no "generate").
- For multi-step like "write email and make it short and formal", chain: ["generate","rewrite_short","rewrite_formal"].

Return ONLY JSON matching the schema. No prose.`;
