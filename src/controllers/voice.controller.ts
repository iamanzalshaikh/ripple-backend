import type { Response } from "express";
import type { AuthRequest } from "../types/auth.types.js";
import config from "../config/config.js";
import logger from "../config/logger.js";
import { getOpenAIClient, isOpenAIConfigured } from "../services/openai.service.js";
import { uploadAudioBuffer, isCloudinaryConfigured } from "../services/cloudinary.service.js";
import { fail, ok } from "../utils/http.js";
import { randomUUID } from "node:crypto";

export async function transcribeAudio(req: AuthRequest, res: Response): Promise<void> {
  try {
    const file = (req as any).file as Express.Multer.File | undefined;
    if (!file?.buffer) {
      fail(res, "audio file required", 400);
      return;
    }
    if (!isOpenAIConfigured()) {
      fail(res, "OPENAI_API_KEY not set", 501);
      return;
    }

    const tempId = randomUUID();

    let uploaded: { url: string; publicId: string } | undefined;
    if (isCloudinaryConfigured()) {
      try {
        uploaded = await uploadAudioBuffer({
          buffer: file.buffer,
          filename: file.originalname || "audio",
        });
      } catch (uploadErr: unknown) {
        logger.warn(
          "transcribeAudio.cloudinary_skip",
          uploadErr instanceof Error ? uploadErr.message : uploadErr,
        );
      }
    }

    const client = getOpenAIClient();

    const audioBlob = new Blob([file.buffer], { type: file.mimetype || "audio/mpeg" });
    const audioFile = new File([audioBlob], file.originalname || "audio", {
      type: file.mimetype || "audio/mpeg",
    });

    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), 25_000);
    const result = await client.audio.transcriptions.create(
      { file: audioFile, model: config.OPENAI_TRANSCRIBE_MODEL },
      { signal: ac.signal },
    );
    clearTimeout(t);

    ok(res, {
      action: "dictate",
      text: result.text,
      language: (result as any).language ?? undefined,
      audioUrl: uploaded?.url,
      temp_id: tempId,
    });
  } catch (e: unknown) {
    logger.error("transcribeAudio", e);
    fail(res, "Server error", 500, e instanceof Error ? e.message : undefined);
  }
}

async function runTextTransform(args: { text: string; instruction: string }) {
  const client = getOpenAIClient();
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), 10_000);
  const resp = await client.chat.completions.create(
    {
      model: config.OPENAI_MODEL,
      messages: [
        {
          role: "system",
          content:
            "You are a helpful writing assistant. Return only the transformed text.",
        },
        { role: "user", content: `${args.instruction}\n\nTEXT:\n${args.text}` },
      ],
      temperature: 0.2,
    },
    { signal: ac.signal },
  );
  clearTimeout(t);
  return resp.choices[0]?.message?.content?.trim() ?? "";
}

export async function rewriteText(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!isOpenAIConfigured()) {
      fail(res, "OPENAI_API_KEY not set", 501);
      return;
    }
    const { text, mode } = req.body as { text?: string; mode?: string };
    if (!text) {
      fail(res, "text required", 400);
      return;
    }
    const m = (mode || "formal").toLowerCase();
    const instruction =
      m === "casual"
        ? "Rewrite the text in a casual tone, keeping meaning."
        : "Rewrite the text in a formal, clear tone, keeping meaning.";

    const processed = await runTextTransform({ text, instruction });
    ok(res, { processed_text: processed, mode: m });
  } catch (e: unknown) {
    logger.error("rewriteText", e);
    fail(res, "Server error", 500, e instanceof Error ? e.message : undefined);
  }
}

export async function grammarText(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!isOpenAIConfigured()) {
      fail(res, "OPENAI_API_KEY not set", 501);
      return;
    }
    const { text } = req.body as { text?: string };
    if (!text) {
      fail(res, "text required", 400);
      return;
    }
    const instruction = "Fix grammar and spelling. Keep meaning. Preserve language.";
    const processed = await runTextTransform({ text, instruction });
    ok(res, { processed_text: processed });
  } catch (e: unknown) {
    logger.error("grammarText", e);
    fail(res, "Server error", 500, e instanceof Error ? e.message : undefined);
  }
}

