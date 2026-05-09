import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import app from "../../src/app.js";
import { prisma } from "../../src/config/db.js";
import { execSync } from "node:child_process";

describe("Phase 2 — M1 (auth refresh + session)", () => {
  beforeAll(async () => {
    execSync("npx prisma db push --skip-generate", { stdio: "inherit" });
    await prisma.$connect();
  }, 60_000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it(
    "signup → refresh → session start/end → logout revokes refresh",
    async () => {
      const rnd = Math.random().toString(16).slice(2);
      const email = `p2m1_${Date.now()}_${rnd}@example.com`;
      const password = `Passw0rd!_${rnd}`;

      // Signup returns access + refresh
      const signup = await request(app)
        .post("/api/v1/auth/signup")
        .send({ email, password, name: "M1 User", device: "test-suite" })
        .expect(201);

      const access1: string = signup.body?.data?.token;
      const refresh1: string = signup.body?.data?.refresh_token;
      expect(typeof access1).toBe("string");
      expect(typeof refresh1).toBe("string");
      expect(access1.length).toBeGreaterThan(20);
      expect(refresh1.length).toBeGreaterThan(20);

      // /auth/me works with access token
      await request(app)
        .get("/api/v1/auth/me")
        .set("Authorization", `Bearer ${access1}`)
        .expect(200);

      // Refresh — get new pair, old refresh should be revoked
      const refreshRes = await request(app)
        .post("/api/v1/auth/refresh")
        .send({ refresh_token: refresh1 })
        .expect(200);

      const access2: string = refreshRes.body?.data?.token;
      const refresh2: string = refreshRes.body?.data?.refresh_token;
      expect(access2).not.toBe(access1);
      expect(refresh2).not.toBe(refresh1);

      // Old refresh token must NOT work anymore (rotated)
      await request(app)
        .post("/api/v1/auth/refresh")
        .send({ refresh_token: refresh1 })
        .expect(401);

      // /session/start with context_type + action_source
      const startRes = await request(app)
        .post("/api/v1/session/start")
        .set("Authorization", `Bearer ${access2}`)
        .send({
          device: "mac-electron-v1.2",
          context_type: "email",
          action_source: "gmail",
        })
        .expect(201);

      const sessionId: string = startRes.body?.data?.session_id;
      expect(typeof sessionId).toBe("string");
      expect(startRes.body?.data?.is_active).toBe(true);
      expect(startRes.body?.data?.context).toMatchObject({
        context_type: "email",
        action_source: "gmail",
      });

      // /session/end
      const endRes = await request(app)
        .post("/api/v1/session/end")
        .set("Authorization", `Bearer ${access2}`)
        .send({ session_id: sessionId })
        .expect(200);

      expect(endRes.body?.data?.is_active).toBe(false);
      expect(typeof endRes.body?.data?.duration_ms).toBe("number");

      // /session/end on already-ended session is idempotent (returns same row)
      await request(app)
        .post("/api/v1/session/end")
        .set("Authorization", `Bearer ${access2}`)
        .send({ session_id: sessionId })
        .expect(200);

      // Logout revokes refresh2 — refresh should now fail
      await request(app)
        .post("/api/v1/auth/logout")
        .set("Authorization", `Bearer ${access2}`)
        .send({ refresh_token: refresh2 })
        .expect(200);

      await request(app)
        .post("/api/v1/auth/refresh")
        .send({ refresh_token: refresh2 })
        .expect(401);
    },
    60_000,
  );

  it("rejects malformed refresh token", async () => {
    await request(app)
      .post("/api/v1/auth/refresh")
      .send({ refresh_token: "not-a-real-jwt" })
      .expect(401);
  });

  it("rejects /session/end without auth", async () => {
    await request(app)
      .post("/api/v1/session/end")
      .send({ session_id: "00000000-0000-0000-0000-000000000000" })
      .expect(401);
  });
});
