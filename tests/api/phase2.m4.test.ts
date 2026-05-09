import request from "supertest";
import { createServer, type Server as HTTPServer } from "node:http";
import { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { io as createClient, type Socket as ClientSocket } from "socket.io-client";
import { execSync } from "node:child_process";
import app from "../../src/app.js";
import { prisma } from "../../src/config/db.js";
import { initializeSocket } from "../../src/config/socket.js";

vi.mock("../../src/services/openai.service.js", () => ({
  isOpenAIConfigured: () => true,
  getOpenAIClient: () => ({
    audio: {
      transcriptions: {
        create: async () => ({ text: "hello from mocked voice", language: "en" }),
      },
    },
  }),
}));

interface AuthBundle {
  token: string;
  sessionId: string;
}

function waitForConnect(socket: ClientSocket): Promise<void> {
  return new Promise((resolve, reject) => {
    socket.once("connect", () => resolve());
    socket.once("connect_error", reject);
  });
}

function waitForConnectError(socket: ClientSocket): Promise<Error> {
  return new Promise((resolve) => {
    socket.once("connect_error", (err) => resolve(err));
  });
}

async function newUserWithSession(): Promise<AuthBundle> {
  const rnd = Math.random().toString(16).slice(2);
  const email = `p2m4_${Date.now()}_${rnd}@example.com`;
  const password = `Passw0rd!_${rnd}`;

  const signup = await request(app)
    .post("/api/v1/auth/signup")
    .send({ email, password, name: "M4", device: "socket-test" })
    .expect(201);

  const token: string = signup.body.data.token;
  const start = await request(app)
    .post("/api/v1/session/start")
    .set("Authorization", `Bearer ${token}`)
    .send({
      context_type: "general",
      action_source: "desktop",
      device: "socket-test",
      context_metadata: { focused_app: "test", input_type: "chatbox" },
    })
    .expect(201);

  return { token, sessionId: start.body.data.session_id };
}

describe("Phase 2 — M4 (WebSocket + buffered voice)", () => {
  let httpServer: HTTPServer;
  let baseUrl: string;

  beforeAll(async () => {
    execSync("npx prisma db push --skip-generate", { stdio: "inherit" });
    await prisma.$connect();

    httpServer = createServer(app);
    initializeSocket(httpServer);
    await new Promise<void>((resolve) => httpServer.listen(0, resolve));

    const address = httpServer.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
  }, 60_000);

  afterAll(async () => {
    await prisma.$disconnect();
    await new Promise<void>((resolve) => httpServer.close(() => resolve()));
  });

  it("rejects socket connection without access token", async () => {
    const socket = createClient(baseUrl, {
      transports: ["websocket"],
      reconnection: false,
      timeout: 2_000,
    });

    const err = await waitForConnectError(socket);
    expect(err.message).toMatch(/No token provided|Authentication failed/);
    socket.close();
  });

  it("connects with JWT and responds to ping", async () => {
    const { token } = await newUserWithSession();
    const socket = createClient(baseUrl, {
      auth: { token },
      transports: ["websocket"],
      reconnection: false,
    });

    await waitForConnect(socket);

    const pong = await new Promise<string>((resolve) => {
      socket.once("pong", () => resolve("pong"));
      socket.emit("ping");
    });

    expect(pong).toBe("pong");
    socket.close();
  });

  it("executes command and persists action ACK over socket", async () => {
    const { token, sessionId } = await newUserWithSession();
    const socket = createClient(baseUrl, {
      auth: { token },
      transports: ["websocket"],
      reconnection: false,
    });
    await waitForConnect(socket);

    const commandResponse = await socket.emitWithAck("command:execute", {
      session_id: sessionId,
      command: "open gmail",
      action_source: "desktop",
    });

    expect(commandResponse.success).toBe(true);
    expect(commandResponse.data.intent).toBe("navigation");
    expect(commandResponse.data.source).toBe("rule");
    expect(commandResponse.data.actions[0]).toMatchObject({
      type: "OPEN_APP",
      status: "pending",
      data: { url: "https://mail.google.com" },
    });

    const ackResponse = await socket.emitWithAck("command:action_ack", {
      command_id: commandResponse.data.command_id,
      action_index: 0,
      status: "executed",
    });

    expect(ackResponse.success).toBe(true);
    expect(ackResponse.data).toMatchObject({
      command_id: commandResponse.data.command_id,
      action_index: 0,
      status: "executed",
    });

    const history = await prisma.commandHistory.findFirstOrThrow({
      where: { id: commandResponse.data.command_id },
    });
    expect(history.actions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ status: "executed" }),
      ]),
    );

    socket.close();
  });

  it("buffers voice chunks and returns final transcript on voice:end", async () => {
    const { token, sessionId } = await newUserWithSession();
    const socket = createClient(baseUrl, {
      auth: { token },
      transports: ["websocket"],
      reconnection: false,
    });
    await waitForConnect(socket);

    const chunkResponse = await socket.emitWithAck("voice:chunk", {
      session_id: sessionId,
      stream_id: "test-stream-1",
      chunk: Buffer.from("fake-audio-chunk"),
      mime_type: "audio/webm",
      filename: "test.webm",
    });

    expect(chunkResponse.success).toBe(true);
    expect(chunkResponse.data).toMatchObject({
      stream_id: "test-stream-1",
      received_bytes: Buffer.byteLength("fake-audio-chunk"),
      total_bytes: Buffer.byteLength("fake-audio-chunk"),
    });

    const transcriptResponse = await socket.emitWithAck("voice:end", {
      stream_id: "test-stream-1",
    });

    expect(transcriptResponse.success).toBe(true);
    expect(transcriptResponse.data).toMatchObject({
      stream_id: "test-stream-1",
      session_id: sessionId,
      text: "hello from mocked voice",
      language: "en",
      is_final: true,
      bytes: Buffer.byteLength("fake-audio-chunk"),
    });

    socket.close();
  });

  it("cancels a buffered voice stream", async () => {
    const { token } = await newUserWithSession();
    const socket = createClient(baseUrl, {
      auth: { token },
      transports: ["websocket"],
      reconnection: false,
    });
    await waitForConnect(socket);

    await socket.emitWithAck("voice:chunk", {
      stream_id: "cancel-stream-1",
      chunk: Buffer.from("fake-audio-chunk"),
      mime_type: "audio/webm",
    });

    const cancelResponse = await socket.emitWithAck("voice:cancel", {
      stream_id: "cancel-stream-1",
    });

    expect(cancelResponse.success).toBe(true);
    expect(cancelResponse.data).toEqual({
      stream_id: "cancel-stream-1",
      cancelled: true,
    });

    socket.close();
  });
});
