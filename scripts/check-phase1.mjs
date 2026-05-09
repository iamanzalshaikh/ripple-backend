/* eslint-disable no-console */

/**
 * Phase 1 API smoke test
 * - health
 * - signup
 * - login
 * - me
 * - onboarding-complete
 * - transcripts CRUD
 *
 * Usage:
 *   BASE_URL=http://localhost:3000 node scripts/check-phase1.mjs
 */

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const API = `${BASE_URL.replace(/\/$/, "")}/api/v1`;

function assertOk(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function jfetch(path, opts = {}) {
  const url = `${API}${path}`;
  const res = await fetch(url, {
    ...opts,
    headers: {
      "content-type": "application/json",
      ...(opts.headers || {}),
    },
  });
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return { res, text, json };
}

async function main() {
  console.log("BASE_URL:", BASE_URL);
  console.log("API:", API);

  // 1) health
  {
    const { res, json, text } = await jfetch("/health", { method: "GET" });
    assertOk(res.ok, `/health failed: ${res.status} ${text}`);
    console.log("OK health:", json?.ok);
  }

  const rnd = Math.random().toString(16).slice(2);
  const email = `test_${Date.now()}_${rnd}@example.com`;
  const password = `Passw0rd!_${rnd}`;

  let token;

  // 2) signup
  {
    const { res, json, text } = await jfetch("/auth/signup", {
      method: "POST",
      body: JSON.stringify({ email, password, name: "Test User" }),
    });
    assertOk(res.ok, `/auth/signup failed: ${res.status} ${text}`);
    token = json?.data?.token;
    assertOk(typeof token === "string" && token.length > 10, "Missing token from signup");
    console.log("OK signup:", email);
  }

  // 3) login
  {
    const { res, json, text } = await jfetch("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    assertOk(res.ok, `/auth/login failed: ${res.status} ${text}`);
    const t = json?.data?.token;
    assertOk(typeof t === "string" && t.length > 10, "Missing token from login");
    console.log("OK login");
  }

  // 4) me
  let userId;
  {
    const { res, json, text } = await jfetch("/auth/me", {
      method: "GET",
      headers: { authorization: `Bearer ${token}` },
    });
    assertOk(res.ok, `/auth/me failed: ${res.status} ${text}`);
    userId = json?.data?.id;
    assertOk(typeof userId === "string", "Missing user id from /auth/me");
    console.log("OK me:", userId);
  }

  // 5) onboarding complete
  {
    const { res, json, text } = await jfetch("/user/onboarding-complete", {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({ preferences: { onboarding: "done" } }),
    });
    assertOk(res.ok, `/user/onboarding-complete failed: ${res.status} ${text}`);
    assertOk(json?.data?.onboarding_completed === true, "Onboarding not marked complete");
    console.log("OK onboarding");
  }

  // 6) transcripts
  let transcriptId;
  {
    const { res, json, text } = await jfetch("/transcripts", {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({
        raw_text: "hello this is raw",
        processed_text: "Hello, this is processed.",
        action: "rewrite",
        language: "en",
      }),
    });
    assertOk(res.ok, `POST /transcripts failed: ${res.status} ${text}`);
    transcriptId = json?.data?.id;
    assertOk(typeof transcriptId === "string", "Missing transcript id from create");
    console.log("OK create transcript:", transcriptId);
  }

  {
    const { res, json, text } = await jfetch("/transcripts?page=1&limit=10", {
      method: "GET",
      headers: { authorization: `Bearer ${token}` },
    });
    assertOk(res.ok, `GET /transcripts failed: ${res.status} ${text}`);
    assertOk(Array.isArray(json?.data), "Expected transcripts list array");
    console.log("OK list transcripts:", json.data.length);
  }

  {
    const { res, json, text } = await jfetch(`/transcripts/${transcriptId}`, {
      method: "GET",
      headers: { authorization: `Bearer ${token}` },
    });
    assertOk(res.ok, `GET /transcripts/:id failed: ${res.status} ${text}`);
    assertOk(json?.data?.id === transcriptId, "Transcript id mismatch");
    console.log("OK get transcript");
  }

  {
    const { res, text } = await jfetch(`/transcripts/${transcriptId}`, {
      method: "DELETE",
      headers: { authorization: `Bearer ${token}` },
    });
    assertOk(res.ok, `DELETE /transcripts/:id failed: ${res.status} ${text}`);
    console.log("OK delete transcript");
  }

  console.log("\nALL PHASE 1 CHECKS PASSED");
}

main().catch((e) => {
  console.error("\nPHASE 1 CHECK FAILED\n", e?.stack || e);
  process.exit(1);
});

