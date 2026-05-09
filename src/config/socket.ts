import type { Server as HTTPServer } from "http";
import { Server as SocketIOServer, type Socket } from "socket.io";
import config from "./config.js";
import logger from "./logger.js";
import { verifyUserAccessToken } from "../utils/jwt.js";
import {
  CommandExecutionError,
  executeCommand,
} from "../services/command.service.js";
import { updateCommandActionStatus } from "../models/command.repo.js";
import { logAppUsage } from "../models/appUsage.repo.js";
import {
  appendVoiceChunk,
  cancelVoiceStream,
  transcribeBufferedVoice,
  VoiceStreamingError,
} from "../services/voiceStreaming.service.js";

type SocketAck = (response: Record<string, unknown>) => void;

interface CommandExecutePayload {
  session_id?: string;
  command?: string;
  context_type?: string;
  action_source?: string;
  context_metadata?: Record<string, unknown>;
  selected_text?: string | null;
}

interface CommandAckPayload {
  command_id?: string;
  action_index?: number;
  status?: "pending" | "executed" | "failed";
  error?: string;
}

interface VoiceChunkPayload {
  stream_id?: string;
  session_id?: string;
  chunk?: unknown;
  mime_type?: string;
  filename?: string;
  is_final?: boolean;
  upload_audio?: boolean;
}

interface VoiceStreamPayload {
  stream_id?: string;
  upload_audio?: boolean;
}

function emitOrAck(
  socket: Socket,
  event: string,
  payload: Record<string, unknown>,
  ack?: SocketAck,
): void {
  if (ack) {
    ack(payload);
    return;
  }
  socket.emit(event, payload);
}

function socketError(
  socket: Socket,
  message: string,
  status = 400,
  ack?: SocketAck,
): void {
  emitOrAck(
    socket,
    "socket:error",
    { success: false, message, status },
    ack,
  );
}

function userIdFromSocket(socket: Socket): string {
  return String(socket.data.userId);
}

function bufferFromChunk(chunk: unknown): Buffer | null {
  if (Buffer.isBuffer(chunk)) return chunk;
  if (chunk instanceof ArrayBuffer) return Buffer.from(chunk);
  if (ArrayBuffer.isView(chunk)) {
    return Buffer.from(chunk.buffer, chunk.byteOffset, chunk.byteLength);
  }
  return null;
}

function registerCommandHandlers(socket: Socket): void {
  socket.on(
    "command:execute",
    async (payload: CommandExecutePayload, ack?: SocketAck) => {
      try {
        const userId = userIdFromSocket(socket);
        if (!payload?.command) {
          socketError(socket, "command required", 400, ack);
          return;
        }

        const result = await executeCommand({
          userId,
          sessionId: payload.session_id,
          command: payload.command,
          contextType: payload.context_type,
          actionSource: payload.action_source,
          contextMetadata: payload.context_metadata as never,
          selectedText: payload.selected_text ?? null,
        });

        emitOrAck(socket, "command:result", { success: true, data: result }, ack);
      } catch (e: unknown) {
        if (e instanceof CommandExecutionError) {
          logAppUsage({
            userId: userIdFromSocket(socket),
            event: "command_error",
            metadata: { message: e.message, status: e.status, source: "socket" },
          });
          socketError(socket, e.message, e.status, ack);
          return;
        }
        logger.error("socket.command.execute", e);
        socketError(
          socket,
          "Server error",
          500,
          ack,
        );
      }
    },
  );

  socket.on(
    "command:action_ack",
    async (payload: CommandAckPayload, ack?: SocketAck) => {
      try {
        const userId = userIdFromSocket(socket);
        if (!payload?.command_id) {
          socketError(socket, "command_id required", 400, ack);
          return;
        }
        if (typeof payload.action_index !== "number") {
          socketError(socket, "action_index required", 400, ack);
          return;
        }
        if (!payload.status) {
          socketError(socket, "status required", 400, ack);
          return;
        }

        const result = await updateCommandActionStatus({
          userId,
          commandId: payload.command_id,
          actionIndex: payload.action_index,
          status: payload.status,
          error: payload.error,
        });

        if (!result) {
          socketError(socket, "Command not found", 404, ack);
          return;
        }
        if (!result.updated) {
          socketError(socket, "Action index out of range", 400, ack);
          return;
        }

        logAppUsage({
          userId,
          event: "action_acknowledged",
          metadata: {
            command_id: payload.command_id,
            action_index: payload.action_index,
            status: payload.status,
            error: payload.error,
            source: "socket",
          },
        });

        emitOrAck(
          socket,
          "command:action_ack:result",
          {
            success: true,
            data: {
              command_id: payload.command_id,
              action_index: payload.action_index,
              status: payload.status,
            },
          },
          ack,
        );
      } catch (e: unknown) {
        logger.error("socket.command.action_ack", e);
        socketError(socket, "Server error", 500, ack);
      }
    },
  );
}

function registerVoiceHandlers(socket: Socket): void {
  socket.on(
    "voice:chunk",
    async (payload: VoiceChunkPayload, ack?: SocketAck) => {
      try {
        const chunk = bufferFromChunk(payload?.chunk);
        if (!chunk) {
          socketError(socket, "audio chunk required", 400, ack);
          return;
        }

        const result = appendVoiceChunk({
          userId: userIdFromSocket(socket),
          streamId: payload.stream_id,
          sessionId: payload.session_id,
          chunk,
          mimeType: payload.mime_type,
          filename: payload.filename,
        });

        emitOrAck(socket, "voice:chunk:ack", { success: true, data: result }, ack);

        if (payload.is_final) {
          const transcript = await transcribeBufferedVoice({
            userId: userIdFromSocket(socket),
            streamId: result.stream_id,
            isFinal: true,
            uploadAudio: payload.upload_audio,
          });
          socket.emit("voice:transcript", { success: true, data: transcript });
        }
      } catch (e: unknown) {
        if (e instanceof VoiceStreamingError) {
          socketError(socket, e.message, e.status, ack);
          return;
        }
        logger.error("socket.voice.chunk", e);
        socketError(socket, "Server error", 500, ack);
      }
    },
  );

  socket.on(
    "voice:flush",
    async (payload: VoiceStreamPayload, ack?: SocketAck) => {
      try {
        if (!payload?.stream_id) {
          socketError(socket, "stream_id required", 400, ack);
          return;
        }

        const transcript = await transcribeBufferedVoice({
          userId: userIdFromSocket(socket),
          streamId: payload.stream_id,
          isFinal: false,
          uploadAudio: payload.upload_audio,
        });

        emitOrAck(
          socket,
          "voice:partial_transcript",
          { success: true, data: transcript },
          ack,
        );
      } catch (e: unknown) {
        if (e instanceof VoiceStreamingError) {
          socketError(socket, e.message, e.status, ack);
          return;
        }
        logger.error("socket.voice.flush", e);
        socketError(socket, "Server error", 500, ack);
      }
    },
  );

  socket.on(
    "voice:end",
    async (payload: VoiceStreamPayload, ack?: SocketAck) => {
      try {
        if (!payload?.stream_id) {
          socketError(socket, "stream_id required", 400, ack);
          return;
        }

        const transcript = await transcribeBufferedVoice({
          userId: userIdFromSocket(socket),
          streamId: payload.stream_id,
          isFinal: true,
          uploadAudio: payload.upload_audio,
        });

        emitOrAck(socket, "voice:transcript", { success: true, data: transcript }, ack);
      } catch (e: unknown) {
        if (e instanceof VoiceStreamingError) {
          socketError(socket, e.message, e.status, ack);
          return;
        }
        logger.error("socket.voice.end", e);
        socketError(socket, "Server error", 500, ack);
      }
    },
  );

  socket.on("voice:cancel", (payload: VoiceStreamPayload, ack?: SocketAck) => {
    if (!payload?.stream_id) {
      socketError(socket, "stream_id required", 400, ack);
      return;
    }
    const cancelled = cancelVoiceStream(userIdFromSocket(socket), payload.stream_id);
    emitOrAck(
      socket,
      "voice:cancelled",
      { success: true, data: { stream_id: payload.stream_id, cancelled } },
      ack,
    );
  });
}

export const initializeSocket = (httpServer: HTTPServer): SocketIOServer => {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin:
        config.NODE_ENV === "development"
          ? true
          : config.CORS_ORIGIN || config.FRONTEND_URL,
      methods: ["GET", "POST"],
      credentials: true,
    },
    transports: ["websocket", "polling"],
    pingInterval: 25_000,
    pingTimeout: 20_000,
  });

  io.use((socket, next) => {
    try {
      const token = (socket.handshake.auth as any)?.token as string | undefined;
      if (!token) return next(new Error("No token provided"));
      const decoded = verifyUserAccessToken(token);
      if (!decoded?.userId) return next(new Error("Invalid token"));
      (socket.data as any).userId = decoded.userId;
      return next();
    } catch (e: unknown) {
      logger.error("Socket auth error", e);
      return next(new Error("Authentication failed"));
    }
  });

  io.on("connection", (socket) => {
    const userId = (socket.data as any).userId as string;
    socket.join(`user:${userId}`);
    logger.info(`[socket] connected user=${userId}`);

    socket.on("ping", () => socket.emit("pong"));
    registerCommandHandlers(socket);
    registerVoiceHandlers(socket);
  });

  return io;
};

