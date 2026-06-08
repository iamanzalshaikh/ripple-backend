/** Light normalization after Whisper — shared concept with desktop. */
export function normalizeTranscript(text: string): string {
  return text.trim().replace(/\s+/g, " ");
}
