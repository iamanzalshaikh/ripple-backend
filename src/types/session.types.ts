/**
 * Phase 2 — Session & context memory shapes.
 * `context_type` and `action_source` are sent by the desktop client (it knows
 * which app is focused) and drive prompt selection + output formatting.
 */

export type ContextType =
  | "general"
  | "email"
  | "whatsapp"
  | "linkedin"
  | "slack"
  | "notion"
  | "instagram"
  | "twitter"
  | "code";

export type ActionSource =
  | "desktop"
  | "web"
  | "gmail"
  | "outlook"
  | "whatsapp"
  | "slack"
  | "linkedin"
  | "notion"
  | "instagram"
  | "twitter"
  | "browser"
  | "other";

export type InputType =
  | "unknown"
  | "chatbox"
  | "email_body"
  | "email_subject"
  | "editor"
  | "form_field"
  | "search_box"
  | "code_editor";

export interface ContextMetadata {
  focused_app?: string;
  input_type?: InputType;
  device?: string;
  window_title?: string;
  url?: string;
}

/** Stored in `Session.context` — capped at 8KB. */
export interface SessionContext {
  context_type?: ContextType;
  action_source?: ActionSource;
  context_metadata?: ContextMetadata;
  last_output?: string;
  previous_output?: string;
  last_intent?: string;
  last_command?: string;
  last_steps?: string[];
  selected_text?: string | null;
  history_window?: SessionHistoryItem[];
  updated_at?: string;
}

export interface SessionHistoryItem {
  command: string;
  result: string;
  ts: string;
}

export const CONTEXT_MAX_BYTES = 8 * 1024;
export const HISTORY_WINDOW_SIZE = 3;
