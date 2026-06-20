/**
 * Whisper initial prompt — biases STT toward Ripple desktop vocabulary.
 * Edit this file (not code) when Whisper mishears demo phrases.
 *
 * Pipeline: Audio → Whisper → Language detect → Desktop UTF repair → NLU
 */
export const WHISPER_PROMPT_VOCAB = [
  "Ripple voice assistant.",
  "Remember, Replace, Forget, Remove.",
  "Remember work mode, open calculator, notepad and github.",
  "Remember Anzal in Downloads.",
  "Open Downloads, Open Documents, Open desktop.",
  "Open folder Followers in Downloads.",
  "Go back, Bring it back, Open it again.",
  "Create folder in downloads, named myproject.",
  "Download kholo, folder banao, downloads mein.",
  "VS Code, Chrome, Calculator, Notepad, GitHub Desktop.",
  "WhatsApp, Gmail, message, search, say, send.",
].join(" ");
