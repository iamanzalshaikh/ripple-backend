import request from "supertest";
import { beforeAll, afterAll, describe, expect, it } from "vitest";
import app from "../../src/app.js";
import { prisma } from "../../src/config/db.js";
import { execSync } from "node:child_process";

describe("Phase 1 API", () => {
  beforeAll(
    async () => {
      // Ensure tables exist (skip generate to avoid Windows file-lock issues)
      execSync("npx prisma db push --skip-generate", { stdio: "inherit" });
      await prisma.$connect();
    },
    60_000,
  );

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("GET /api/v1/health", async () => {
    const res = await request(app).get("/api/v1/health").expect(200);
    expect(res.body.ok).toBe(true);
  });

  it(
    "Auth → onboarding → AI (rewrite/grammar) → transcripts CRUD",
    async () => {
    const rnd = Math.random().toString(16).slice(2);
    const email = `test_${Date.now()}_${rnd}@example.com`;
    const password = `Passw0rd!_${rnd}`;

    const signup = await request(app)
      .post("/api/v1/auth/signup")
      .send({ email, password, name: "Test User" })
      .expect(201);

    const token: string = signup.body?.data?.token;
    expect(typeof token).toBe("string");
    expect(token.length).toBeGreaterThan(10);

    await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    const onboard = await request(app)
      .post("/api/v1/user/onboarding-complete")
      .set("Authorization", `Bearer ${token}`)
      .send({ preferences: { onboarding: "done" } })
      .expect(200);

    expect(onboard.body?.data?.onboarding_completed).toBe(true);

    // Voice/AI: rewrite + grammar (requires OPENAI_API_KEY)
    const rewrite = await request(app)
      .post("/api/v1/voice/rewrite")
      .set("Authorization", `Bearer ${token}`)
      .send({ text: "hey bro what's up", mode: "formal" })
      .expect(200);

    const rewritten = rewrite.body?.data?.processed_text;
    expect(typeof rewritten).toBe("string");
    expect(rewritten.length).toBeGreaterThan(0);

    const grammar = await request(app)
      .post("/api/v1/voice/grammar")
      .set("Authorization", `Bearer ${token}`)
      .send({ text: "I goes to market yesterday" })
      .expect(200);

    const corrected = grammar.body?.data?.processed_text;
    expect(typeof corrected).toBe("string");
    expect(corrected.length).toBeGreaterThan(0);

    // Transcribe validation: without file should return 400 (endpoint reachable)
    await request(app)
      .post("/api/v1/voice/transcribe")
      .set("Authorization", `Bearer ${token}`)
      .expect(400);

    const created = await request(app)
      .post("/api/v1/transcripts")
      .set("Authorization", `Bearer ${token}`)
      .send({
        raw_text: "hello this is raw",
        processed_text: rewritten,
        action: "rewrite",
        language: "en",
      })
      .expect(201);

    const id: string = created.body?.data?.id;
    expect(typeof id).toBe("string");

    await request(app)
      .get(`/api/v1/transcripts/${id}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    await request(app)
      .get("/api/v1/transcripts?page=1&limit=10")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    await request(app)
      .delete(`/api/v1/transcripts/${id}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    },
    60_000,
  );
});

