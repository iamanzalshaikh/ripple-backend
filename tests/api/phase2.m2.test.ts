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
  const email = `p2m2_${Date.now()}_${rnd}@example.com`;
  const password = `Passw0rd!_${rnd}`;
  const signup = await request(app)
    .post("/api/v1/auth/signup")
    .send({ email, password, name: "M2", device: "test" })
    .expect(201);
  const token: string = signup.body.data.token;
  const start = await request(app)
    .post("/api/v1/session/start")
    .set("Authorization", `Bearer ${token}`)
    .send({ context_type: "email", action_source: "gmail", device: "test" })
    .expect(201);
  return { token, sessionId: start.body.data.session_id };
}

describe("Phase 2 — M2 (Command Engine REST)", () => {
  beforeAll(async () => {
    execSync("npx prisma db push --skip-generate", { stdio: "inherit" });
    await prisma.$connect();
  }, 60_000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it(
    "navigation — 'open gmail' is rule-classified, no AI call, returns OPEN_APP",
    async () => {
      const { token, sessionId } = await newUserWithSession();
      const res = await request(app)
        .post("/api/v1/commands/execute")
        .set("Authorization", `Bearer ${token}`)
        .send({
          session_id: sessionId,
          command: "open gmail",
          action_source: "desktop",
        })
        .expect(200);

      expect(res.body.data.intent).toBe("navigation");
      expect(res.body.data.steps).toEqual(["open_app"]);
      expect(res.body.data.source).toBe("rule");
      expect(res.body.data.actions).toHaveLength(1);
      expect(res.body.data.actions[0]).toMatchObject({
        type: "OPEN_APP",
        data: { url: "https://mail.google.com" },
      });
    },
    30_000,
  );

  it(
    "typing — 'copy' is rule-classified, returns COPY_TEXT",
    async () => {
      const { token, sessionId } = await newUserWithSession();
      const res = await request(app)
        .post("/api/v1/commands/execute")
        .set("Authorization", `Bearer ${token}`)
        .send({
          session_id: sessionId,
          command: "copy this",
          selected_text: "Hello world",
        })
        .expect(200);

      expect(res.body.data.intent).toBe("typing");
      expect(res.body.data.steps).toEqual(["copy"]);
      expect(res.body.data.actions[0]).toMatchObject({
        type: "COPY_TEXT",
        data: { text: "Hello world" },
      });
    },
    30_000,
  );

  it(
    "generation — 'write apology email' uses LLM, returns INSERT_TEXT with content",
    async () => {
      const { token, sessionId } = await newUserWithSession();
      const res = await request(app)
        .post("/api/v1/commands/execute")
        .set("Authorization", `Bearer ${token}`)
        .send({
          session_id: sessionId,
          command: "write a short apology email to my team for missing the deadline",
          context_type: "email",
          action_source: "gmail",
        })
        .expect(200);

      expect(res.body.data.intent).toMatch(/generation|workflow/);
      expect(Array.isArray(res.body.data.steps)).toBe(true);
      expect(typeof res.body.data.result).toBe("string");
      expect(res.body.data.result.length).toBeGreaterThan(20);
      expect(res.body.data.actions.some((a: { type: string }) => a.type === "INSERT_TEXT")).toBe(true);
      expect(res.body.data.context_type).toBe("email");
      expect(res.body.data.action_source).toBe("gmail");
    },
    45_000,
  );

  it(
    "edit + context memory — 'make it shorter' uses last_output from session",
    async () => {
      const { token, sessionId } = await newUserWithSession();

      // Step 1: generate
      await request(app)
        .post("/api/v1/commands/execute")
        .set("Authorization", `Bearer ${token}`)
        .send({
          session_id: sessionId,
          command: "write 3 sentences about the importance of sleep",
          context_type: "general",
        })
        .expect(200);

      // Step 2: edit (no selected_text — must pull from session.last_output)
      const res = await request(app)
        .post("/api/v1/commands/execute")
        .set("Authorization", `Bearer ${token}`)
        .send({
          session_id: sessionId,
          command: "make it shorter",
        })
        .expect(200);

      expect(res.body.data.intent).toMatch(/edit|generation/);
      expect(typeof res.body.data.result).toBe("string");
      expect(res.body.data.result.length).toBeGreaterThan(0);
    },
    60_000,
  );

  it(
    "undo — restores previous_output",
    async () => {
      const { token, sessionId } = await newUserWithSession();

      const first = await request(app)
        .post("/api/v1/commands/execute")
        .set("Authorization", `Bearer ${token}`)
        .send({
          session_id: sessionId,
          command: "write a one sentence greeting for a friend",
          context_type: "general",
        })
        .expect(200);
      const firstResult: string = first.body.data.result;

      await request(app)
        .post("/api/v1/commands/execute")
        .set("Authorization", `Bearer ${token}`)
        .send({
          session_id: sessionId,
          command: "make it more formal",
        })
        .expect(200);

      const undo = await request(app)
        .post("/api/v1/commands/execute")
        .set("Authorization", `Bearer ${token}`)
        .send({
          session_id: sessionId,
          command: "undo",
        })
        .expect(200);

      expect(undo.body.data.intent).toBe("undo");
      expect(undo.body.data.steps).toEqual(["undo"]);
      expect(undo.body.data.actions[0]?.type).toBe("INSERT_TEXT");
      expect(undo.body.data.actions[0]?.data?.text).toBe(firstResult);
    },
    90_000,
  );

  it(
    "history — saves & lists with pagination + intent filter",
    async () => {
      const { token, sessionId } = await newUserWithSession();

      await request(app)
        .post("/api/v1/commands/execute")
        .set("Authorization", `Bearer ${token}`)
        .send({ session_id: sessionId, command: "open whatsapp" })
        .expect(200);

      await request(app)
        .post("/api/v1/commands/execute")
        .set("Authorization", `Bearer ${token}`)
        .send({ session_id: sessionId, command: "copy that", selected_text: "Hi" })
        .expect(200);

      const all = await request(app)
        .get("/api/v1/commands/history?page=1&limit=10")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(all.body.data.total).toBeGreaterThanOrEqual(2);
      expect(all.body.data.items.length).toBeGreaterThanOrEqual(2);

      const navOnly = await request(app)
        .get("/api/v1/commands/history?intent=navigation")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(navOnly.body.data.items.every((i: { intent: string }) => i.intent === "navigation")).toBe(true);
    },
    30_000,
  );

  it("rejects unauthenticated", async () => {
    await request(app)
      .post("/api/v1/commands/execute")
      .send({ command: "hello" })
      .expect(401);
  });

  it("rejects empty command", async () => {
    const { token } = await newUserWithSession();
    await request(app)
      .post("/api/v1/commands/execute")
      .set("Authorization", `Bearer ${token}`)
      .send({ command: "" })
      .expect(400);
  });
});
