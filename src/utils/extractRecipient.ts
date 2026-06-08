import { normalizeTranscript } from "./normalizeTranscript.js";

function cleanContactName(raw: string): string {
  return raw.trim().replace(/^[,.\s]+|[,.\s]+$/g, "").replace(/^to\s+/i, "");
}

/**
 * Pull contact name from voice command text (slot extraction — desktop does fuzzy match).
 */
export function extractRecipientFromCommand(command: string): string | null {
  const cmd = normalizeTranscript(command);
  if (!cmd) return null;

  const messageTo = cmd.match(
    /\bmessage\s+to\s+([A-Za-z][A-Za-z0-9'.\s-]{0,40}?)\s+(?:saying|say|ask)\b/i,
  )?.[1];
  if (messageTo) return cleanContactName(messageTo);

  const searchToken = cmd.match(
    /\bsearch\s+([A-Za-z0-9][A-Za-z0-9'.-]*)\s+and\b/i,
  )?.[1];
  if (searchToken) return cleanContactName(searchToken);

  const patterns = [
    /\bsearch\s+(.+?)\s+and\s+(?:say|ask|tell)\b/i,
    /\bmessage\s+([A-Za-z][\w'-]{1,40}?)(?:\s+(?:saying|that|to say))/i,
    /\b(?:whatsapp|message)\s+([A-Za-z][\w'-]{1,30})\s+(?:saying|hello|hi)/i,
  ];

  for (const re of patterns) {
    const m = cmd.match(re);
    if (m?.[1]) {
      const name = cleanContactName(m[1]);
      if (name.length >= 1 && !/^to$/i.test(name)) return name;
    }
  }

  return null;
}
