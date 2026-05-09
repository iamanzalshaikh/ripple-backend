import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import app from "../../src/app.js";
import { prisma } from "../../src/config/db.js";
import { execSync } from "node:child_process";

interface AuthBundle {
  token: string;
  sessionId: string;
}

async function newUserWithSession(): Promise<AuthBundle> {
  const rnd = Math.random().toString(16).slice(2);
  const email = `p2m5_${Date.now()}_${rnd}@example.com`;
  const password = `Passw0rd!_${rnd}`;
  const signup = await request(app)
    .post("/api/v1/auth/signup")
    .send({ email, password, name: "M5", device: "test" })
    .expect(201);
  const token: string = signup.body.data.token;
  const start = await request(app)
    .post("/api/v1/session/start")
    .set("Authorization", `Bearer ${token}`)
    .send({ context_type: "general", action_source: "desktop", device: "test" })
    .expect(201);
  return { token, sessionId: start.body.data.session_id };
}

describe("Phase 2 — M5 (workflow + suggestions + token tracking)", () => {
  beforeAll(async () => {
    execSync("npx prisma db push --skip-generate", { stdio: "inherit" });
    await prisma.$connect();
  }, 60_000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it(
    "workflow — 'open whatsapp and write hi' returns WORKFLOW with OPEN_APP + INSERT_TEXT inside",
    async () => {
      const { token, sessionId } = await newUserWithSession();
      const res = await request(app)
        .post("/api/v1/commands/execute")
        .set("Authorization", `Bearer ${token}`)
        .send({
          session_id: sessionId,
          command: "open whatsapp and write a short hi message to my friend",
          action_source: "desktop",
        })
        .expect(200);

      expect(res.body.data.intent).toBe("workflow");
      expect(res.body.data.output_type).toBe("workflow");
      expect(res.body.data.actions).toHaveLength(1);

      const wrapper = res.body.data.actions[0];
      expect(wrapper.type).toBe("WORKFLOW");
      expect(wrapper.status).toBe("pending");
      expect(Array.isArray(wrapper.data?.steps)).toBe(true);
      expect(wrapper.data.steps.length).toBeGreaterThanOrEqual(2);

      const inner = wrapper.data.steps as Array<{ type: string; data?: Record<string, unknown> }>;
      expect(inner.some((a) => a.type === "OPEN_APP")).toBe(true);
      expect(inner.some((a) => a.type === "INSERT_TEXT")).toBe(true);
    },
    45_000,
  );

  it(
    "suggestions — vague command returns SHOW_SUGGESTIONS, no AI completion tokens spent",
    async () => {
      const { token, sessionId } = await newUserWithSession();
      const res = await request(app)
        .post("/api/v1/commands/execute")
        .set("Authorization", `Bearer ${token}`)
        .send({
          session_id: sessionId,
          command: "do that thing for me please",
        })
        .expect(200);

      expect(res.body.data.output_type).toBe("suggestions");
      expect(res.body.data.actions[0].type).toBe("SHOW_SUGGESTIONS");
      expect(res.body.data.actions[0].status).toBe("pending");
      expect(res.body.data.actions[0].data?.reason).toBeTruthy();
      expect(Array.isArray(res.body.data.actions[0].data?.items)).toBe(true);
      expect(res.body.data.confidence).toBeLessThan(0.7);

      // Token usage may include classifier tokens but no generation tokens.
      expect(typeof res.body.data.token_usage.prompt_tokens).toBe("number");
      expect(typeof res.body.data.token_usage.completion_tokens).toBe("number");
      expect(typeof res.body.data.token_usage.total_tokens).toBe("number");
      expect(typeof res.body.data.token_usage.estimated_cost).toBe("number");

      // Persisted as 'partial'
      const stored = await prisma.commandHistory.findUnique({
        where: { id: res.body.data.command_id },
      });
      expect(stored?.status).toBe("partial");
      expect(stored?.outputType).toBe("suggestions");
    },
    30_000,
  );

  it(
    "token tracking — generation command persists prompt_tokens, completion_tokens, total_tokens, estimated_cost",
    async () => {
      const { token, sessionId } = await newUserWithSession();
      const res = await request(app)
        .post("/api/v1/commands/execute")
        .set("Authorization", `Bearer ${token}`)
        .send({
          session_id: sessionId,
          command: "write a one sentence motivational quote",
          context_type: "general",
        })
        .expect(200);

      const usage = res.body.data.token_usage;
      expect(usage.prompt_tokens).toBeGreaterThan(0);
      expect(usage.completion_tokens).toBeGreaterThan(0);
      expect(usage.total_tokens).toBeGreaterThanOrEqual(
        usage.prompt_tokens + usage.completion_tokens,
      );
      expect(usage.estimated_cost).toBeGreaterThan(0);

      const stored = await prisma.commandHistory.findUnique({
        where: { id: res.body.data.command_id },
      });
      expect(stored?.promptTokens).toBeGreaterThan(0);
      expect(stored?.completionTokens).toBeGreaterThan(0);
      expect(stored?.totalTokens).toBeGreaterThan(0);
      expect(stored?.estimatedCost).toBeGreaterThan(0);
      expect(stored?.outputType).toBe("text");
      expect(typeof stored?.confidence).toBe("number");
    },
    45_000,
  );

  it(
    "history — exposes output_type, confidence, token_usage on every row",
    async () => {
      const { token, sessionId } = await newUserWithSession();

      await request(app)
        .post("/api/v1/commands/execute")
        .set("Authorization", `Bearer ${token}`)
        .send({ session_id: sessionId, command: "open gmail" })
        .expect(200);

      const list = await request(app)
        .get("/api/v1/commands/history?page=1&limit=10")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(list.body.data.items.length).toBeGreaterThan(0);
      const row = list.body.data.items[0];
      expect(row).toHaveProperty("output_type");
      expect(row).toHaveProperty("confidence");
      expect(row).toHaveProperty("token_usage");
      expect(row.token_usage).toHaveProperty("prompt_tokens");
      expect(row.token_usage).toHaveProperty("completion_tokens");
      expect(row.token_usage).toHaveProperty("total_tokens");
      expect(row.token_usage).toHaveProperty("estimated_cost");
    },
    30_000,
  );

  it(
    "action ack — REST endpoint updates action status and persists",
    async () => {
      const { token, sessionId } = await newUserWithSession();

      const exec = await request(app)
        .post("/api/v1/commands/execute")
        .set("Authorization", `Bearer ${token}`)
        .send({ session_id: sessionId, command: "open gmail" })
        .expect(200);

      const commandId: string = exec.body.data.command_id;

      const ack = await request(app)
        .post(`/api/v1/commands/${commandId}/actions/ack`)
        .set("Authorization", `Bearer ${token}`)
        .send({ action_index: 0, status: "executed" })
        .expect(200);

      expect(ack.body.data).toMatchObject({
        command_id: commandId,
        action_index: 0,
        status: "executed",
      });

      const stored = await prisma.commandHistory.findUnique({
        where: { id: commandId },
      });
      const actions = stored?.actions as Array<{ status: string }> | null;
      expect(actions?.[0]?.status).toBe("executed");
    },
    30_000,
  );
});
