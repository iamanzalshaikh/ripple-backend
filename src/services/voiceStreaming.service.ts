import { randomUUID } from "node:crypto";
import config from "../config/config.js";
import { getOpenAIClient, isOpenAIConfigured } from "./openai.service.js";
import {
  isCloudinaryConfigured,
  uploadAudioBuffer,
} from "./cloudinary.service.js";

const MAX_STREAM_BYTES = 10 * 1024 * 1024;
const STREAM_TTL_MS = 2 * 60 * 1000;

interface VoiceStreamState {
  userId: string;
  streamId: string;
  sessionId?: string;
  chunks: Buffer[];
  byteLength: number;
  mimeType: string;
  filename: string;
  startedAt: number;
  lastChunkAt: number;
}

export interface VoiceChunkInput {
  userId: string;
  streamId?: string;
  sessionId?: string;
  chunk: Buffer;
  mimeType?: string;
  filename?: string;
}

export interface VoiceChunkResult {
  stream_id: string;
  received_bytes: number;
  total_bytes: number;
}

export interface VoiceTranscriptResult {
  stream_id: string;
  session_id?: string;
  text: string;
  language?: string;
  audio_url?: string;
  duration_ms: number;
  bytes: number;
  is_final: boolean;
}

export class VoiceStreamingError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

const streams = new Map<string, VoiceStreamState>();

function keyFor(userId: string, streamId: string): string {
  return `${userId}:${streamId}`;
}

function cleanupExpiredStreams(): void {
  const now = Date.now();
  for (const [key, stream] of streams.entries()) {
    if (now - stream.lastChunkAt > STREAM_TTL_MS) {
      streams.delete(key);
    }
  }
}

function normalizeMimeType(mimeType?: string): string {
  const m = (mimeType ?? "").trim().toLowerCase();
  if (!m) return "audio/webm";
  if (m.includes("ogg")) return "audio/ogg";
  if (m.includes("mp4") || m.includes("mpeg")) return "audio/mp4";
  if (m.includes("wav")) return "audio/wav";
  return mimeType!.split(";")[0]!.trim() || "audio/webm";
}

function filenameForMime(mimeType: string, filename?: string): string {
  if (filename?.trim()) return filename.trim();
  const m = mimeType.toLowerCase();
  const id = randomUUID();
  if (m.includes("ogg")) return `voice-${id}.ogg`;
  if (m.includes("mp4") || m.includes("mpeg")) return `voice-${id}.mp4`;
  if (m.includes("wav")) return `voice-${id}.wav`;
  return `voice-${id}.webm`;
}

function normalizeFilename(filename?: string, mimeType?: string): string {
  return filenameForMime(normalizeMimeType(mimeType), filename);
}

export function appendVoiceChunk(input: VoiceChunkInput): VoiceChunkResult {
  cleanupExpiredStreams();

  if (!input.chunk.byteLength) {
    throw new VoiceStreamingError("Audio chunk is empty", 400);
  }

  const streamId = input.streamId || randomUUID();
  const streamKey = keyFor(input.userId, streamId);
  const existing = streams.get(streamKey);
  const now = Date.now();

  const stream: VoiceStreamState =
    existing ??
    {
      userId: input.userId,
      streamId,
      sessionId: input.sessionId,
      chunks: [],
      byteLength: 0,
      mimeType: normalizeMimeType(input.mimeType),
      filename: normalizeFilename(input.filename, input.mimeType),
      startedAt: now,
      lastChunkAt: now,
    };

  if (stream.byteLength + input.chunk.byteLength > MAX_STREAM_BYTES) {
    throw new VoiceStreamingError("Audio stream too large", 413);
  }

  stream.chunks.push(input.chunk);
  stream.byteLength += input.chunk.byteLength;
  stream.lastChunkAt = now;
  stream.sessionId = input.sessionId ?? stream.sessionId;
  stream.mimeType = normalizeMimeType(input.mimeType ?? stream.mimeType);
  stream.filename = normalizeFilename(
    input.filename ?? stream.filename,
    stream.mimeType,
  );

  streams.set(streamKey, stream);

  return {
    stream_id: streamId,
    received_bytes: input.chunk.byteLength,
    total_bytes: stream.byteLength,
  };
}

export function cancelVoiceStream(userId: string, streamId: string): boolean {
  return streams.delete(keyFor(userId, streamId));
}

export async function transcribeBufferedVoice(args: {
  userId: string;
  streamId: string;
  isFinal: boolean;
  uploadAudio?: boolean;
}): Promise<VoiceTranscriptResult> {
  const stream = streams.get(keyFor(args.userId, args.streamId));
  if (!stream || stream.byteLength === 0) {
    throw new VoiceStreamingError("Audio stream not found", 404);
  }
  if (!isOpenAIConfigured()) {
    throw new VoiceStreamingError("OPENAI_API_KEY not set", 501);
  }

  const startedAt = Date.now();
  const buffer = Buffer.concat(stream.chunks, stream.byteLength);
  const mimeType = normalizeMimeType(stream.mimeType);
  const filename = filenameForMime(mimeType, stream.filename);

  if (buffer.length < 16) {
    throw new VoiceStreamingError("Audio recording too short", 400);
  }

  const audioBlob = new Blob([buffer], { type: mimeType });
  const audioFile = new File([audioBlob], filename, { type: mimeType });

  const client = getOpenAIClient();
  const ac = new AbortController();
  const timeout = setTimeout(() => ac.abort(), 15_000);

  try {
    const transcribeParams: {
      file: File;
      model: string;
      language?: string;
      prompt?: string;
    } = {
      file: audioFile,
      model: config.OPENAI_TRANSCRIBE_MODEL,
    };
    if (config.WHISPER_LANGUAGE) {
      transcribeParams.language = config.WHISPER_LANGUAGE;
    }
    if (config.WHISPER_PROMPT) {
      transcribeParams.prompt = config.WHISPER_PROMPT;
    }

    const result = await client.audio.transcriptions.create(transcribeParams, {
      signal: ac.signal,
    });

    const uploaded =
      args.uploadAudio && isCloudinaryConfigured()
        ? await uploadAudioBuffer({ buffer, filename: stream.filename })
        : undefined;

    if (args.isFinal) {
      streams.delete(keyFor(args.userId, args.streamId));
    }

    return {
      stream_id: stream.streamId,
      session_id: stream.sessionId,
      text: result.text,
      language: (result as { language?: string }).language,
      audio_url: uploaded?.url,
      duration_ms: Date.now() - startedAt,
      bytes: stream.byteLength,
      is_final: args.isFinal,
    };
  } finally {
    clearTimeout(timeout);
  }
}
