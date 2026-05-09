# PHASE 2 — FINAL

The Ripple backend brain: Auth + Sessions + Command Engine + Voice + Realtime.

This document is the single source of truth for all Phase 2 REST endpoints, Socket.IO events, payload shapes, end-to-end user flow, environment variables, and curl examples. Use this when wiring the Electron client (Phase 3).

---

## 1. Quick Status

| Milestone | Description | Status |
|---|---|---|
| M1 | Schema + Sessions + Refresh tokens | Done |
| M2 | Command engine (REST) — intent + execution + history | Done |
| M3 | Multi-step + context memory + undo | Done (rolled into M2) |
| M4 | WebSocket + buffered voice streaming | Done |
| M5 | Final tests + docs | Done |

Tests: M1 + M2 + M4 + M5 all green.
Build: `tsc` exit 0.

---

## 2. Base URL

```
http://localhost:3001/api/v1
ws://localhost:3001
```

Swagger: `http://localhost:3001/api-docs`
Health: `GET /health`

---

## 3. Standard API Response Format

### Success
```json
{ "success": true, "data": { } }
```

### Error
```json
{ "success": false, "message": "Error message", "error": "optional details" }
```

---

## 4. Environment Variables

```bash
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:8081
CORS_ORIGIN=

# Postgres (Neon)
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require

# JWT
JWT_ACCESS_SECRET=...
JWT_REFRESH_SECRET=...
AUTH_COOKIE_NAME=token
REFRESH_COOKIE_NAME=refresh_token

# OpenAI
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
OPENAI_TRANSCRIBE_MODEL=whisper-1

# Cloudinary (optional audio storage)
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...

# Redis (optional)
REDIS_URL=
```

---

## 5. End-to-End User Flow

### 5.1 Onboarding & Setup
1. Electron app installed.
2. UI calls `POST /auth/signup` or `POST /auth/login` with `{ email, password, device }`.
3. Stores `token` + `refresh_token` securely.
4. Calls `GET /auth/me` to check `onboarding_completed`.
5. Calls `POST /user/onboarding-complete` if needed.

### 5.2 Session Start (every desktop launch)
1. `POST /session/start` with `device`, `context_type`, `action_source`, `context_metadata`.
2. Backend returns `session_id`.
3. Electron opens WebSocket: `io("ws://localhost:3001", { auth: { token } })`.

### 5.3 Voice Command Flow (always-on)
1. User presses global shortcut (e.g. `Ctrl+Shift+Space`).
2. Electron starts mic capture.
3. Each audio chunk is emitted via socket: `socket.emit("voice:chunk", { stream_id, chunk })`.
4. On release, Electron emits `socket.emit("voice:end", { stream_id })`.
5. Backend transcribes via Whisper and emits `voice:transcript` with the text.

### 5.4 Command Execution
1. Electron emits `socket.emit("command:execute", { command, session_id, context_metadata })` (or REST `POST /commands/execute`).
2. Backend runs intent detection + AI generation + builds structured actions.
3. Backend returns `command:result` with:
   - `intent`, `output_type`, `confidence`, `actions[]`, `token_usage`, `result`, `command_id`.

### 5.5 Action Execution (Electron-side)
1. Electron iterates `actions[]` and executes each locally:
   - `OPEN_APP` → opens URL or app.
   - `INSERT_TEXT` → simulates typing or pastes.
   - `COPY_TEXT` → writes to clipboard.
   - `WORKFLOW` → executes inner steps in order.
   - `SHOW_SUGGESTIONS` → renders clickable choice UI.
   - `OPEN_URL` → opens URL in default browser.
   - `NOOP` → ignore.
2. After each action, Electron emits `command:action_ack` with `executed` or `failed` + optional `error`.

### 5.6 Context Memory & Edits
1. After generation, `Session.context.last_output` is set automatically.
2. User says "make it shorter" → backend pulls from `last_output`, rewrites.
3. Old text becomes `previous_output`.
4. User says "undo" → backend returns `INSERT_TEXT` with `previous_output`.

### 5.7 Logout / Session End
1. `POST /session/end` with `session_id`.
2. `POST /auth/logout` with `refresh_token` to revoke that device.
3. `socket.disconnect()`.

---

## 6. REST API — Authentication

### 6.1 Signup

```bash
curl -X POST http://localhost:3001/api/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "Strong1Pass!",
    "name": "Anzal",
    "device": "mac-electron-v1"
  }'
```

Response 201:
```json
{
  "success": true,
  "data": {
    "token": "<access_jwt>",
    "refresh_token": "<refresh_jwt>",
    "refresh_expires_at": "2026-06-07T10:00:00.000Z",
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "name": "Anzal",
      "onboarding_completed": false
    }
  }
}
```

Sets `httpOnly` cookies: `token`, `refresh_token`.

### 6.2 Login

```bash
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "Strong1Pass!",
    "device": "mac-electron-v1"
  }'
```

Same shape as signup, status 200.

### 6.3 Refresh (rotation)

```bash
curl -X POST http://localhost:3001/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{ "refresh_token": "<refresh_jwt>" }'
```

Response 200:
```json
{
  "success": true,
  "data": {
    "token": "<new_access_jwt>",
    "refresh_token": "<new_refresh_jwt>",
    "refresh_expires_at": "2026-06-07T10:00:00.000Z"
  }
}
```

Old refresh token is automatically revoked. Reusing it returns 401.

### 6.4 Get Current User

```bash
curl http://localhost:3001/api/v1/auth/me \
  -H "Authorization: Bearer <access_jwt>"
```

### 6.5 Logout (revokes refresh)

```bash
curl -X POST http://localhost:3001/api/v1/auth/logout \
  -H "Authorization: Bearer <access_jwt>" \
  -H "Content-Type: application/json" \
  -d '{ "refresh_token": "<refresh_jwt>" }'
```

---

## 7. REST API — Sessions

### 7.1 Start Session

```bash
curl -X POST http://localhost:3001/api/v1/session/start \
  -H "Authorization: Bearer <access_jwt>" \
  -H "Content-Type: application/json" \
  -d '{
    "device": "mac-electron-v1",
    "context_type": "email",
    "action_source": "gmail",
    "context_metadata": {
      "focused_app": "Gmail",
      "input_type": "email_body",
      "device": "MacBook Pro 14",
      "window_title": "Compose - Gmail",
      "url": "https://mail.google.com"
    }
  }'
```

Response 201:
```json
{
  "success": true,
  "data": {
    "session_id": "uuid",
    "is_active": true,
    "device": "mac-electron-v1",
    "context": {
      "context_type": "email",
      "action_source": "gmail",
      "context_metadata": {
        "focused_app": "Gmail",
        "input_type": "email_body",
        "device": "MacBook Pro 14",
        "window_title": "Compose - Gmail",
        "url": "https://mail.google.com"
      }
    },
    "created_at": "2026-05-08T10:00:00.000Z"
  }
}
```

### 7.2 End Session

```bash
curl -X POST http://localhost:3001/api/v1/session/end \
  -H "Authorization: Bearer <access_jwt>" \
  -H "Content-Type: application/json" \
  -d '{ "session_id": "<session_uuid>" }'
```

Response 200:
```json
{
  "success": true,
  "data": {
    "session_id": "uuid",
    "is_active": false,
    "ended_at": "2026-05-08T10:30:00.000Z",
    "duration_ms": 1800000
  }
}
```

### 7.3 Allowed Field Values

`context_type`: `general | email | whatsapp | linkedin | slack | notion | twitter | code`
`action_source`: `desktop | web | gmail | outlook | whatsapp | slack | linkedin | notion | twitter | browser | other`
`input_type`: `unknown | chatbox | email_body | email_subject | editor | form_field | search_box | code_editor`

---

## 8. REST API — Commands

### 8.1 Execute Command

```bash
curl -X POST http://localhost:3001/api/v1/commands/execute \
  -H "Authorization: Bearer <access_jwt>" \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": "<session_uuid>",
    "command": "write a short apology email to my team for missing the deadline",
    "context_type": "email",
    "action_source": "gmail",
    "context_metadata": {
      "focused_app": "Gmail",
      "input_type": "email_body"
    },
    "selected_text": null
  }'
```

Response 200:
```json
{
  "success": true,
  "data": {
    "command_id": "uuid",
    "intent": "generation",
    "steps": ["generate"],
    "result": "Hi team, I'm sorry...",
    "actions": [{
      "type": "INSERT_TEXT",
      "status": "pending",
      "data": { "text": "Hi team, I'm sorry..." }
    }],
    "output_type": "text",
    "confidence": 0.92,
    "token_usage": {
      "prompt_tokens": 245,
      "completion_tokens": 180,
      "total_tokens": 425,
      "estimated_cost": 0.000128
    },
    "context_type": "email",
    "action_source": "gmail",
    "duration_ms": 1840,
    "source": "llm"
  }
}
```

#### `output_type` cases

| Value | When |
|---|---|
| `text` | Normal generation/edit/navigation/typing |
| `workflow` | `intent === "workflow"` and 2+ actions wrapped |
| `suggestions` | Confidence < 0.7 OR `needs_input === true` |

#### `intent` values

`generation | edit | navigation | typing | workflow | undo`

#### `source`

`rule` (regex matched) or `llm` (OpenAI classified).

### 8.2 Action Examples by Intent

#### Navigation
Command: `"open gmail"`
```json
{
  "intent": "navigation",
  "source": "rule",
  "confidence": 1,
  "actions": [{
    "type": "OPEN_APP",
    "status": "pending",
    "data": { "target": "Gmail", "url": "https://mail.google.com" }
  }]
}
```

#### Typing
Command: `"copy this"` with `selected_text`
```json
{
  "intent": "typing",
  "source": "rule",
  "confidence": 1,
  "actions": [{
    "type": "COPY_TEXT",
    "status": "pending",
    "data": { "text": "<selected text>" }
  }]
}
```

#### Workflow
Command: `"open whatsapp and write hi to my friend"`
```json
{
  "intent": "workflow",
  "output_type": "workflow",
  "actions": [{
    "type": "WORKFLOW",
    "status": "pending",
    "data": {
      "steps": [
        { "type": "OPEN_APP", "data": { "target": "WhatsApp", "url": "https://web.whatsapp.com" }, "status": "pending" },
        { "type": "INSERT_TEXT", "data": { "text": "Hi! ..." }, "status": "pending" }
      ]
    }
  }]
}
```

#### Suggestions (low confidence fallback)
Command: `"do that thing"`
```json
{
  "intent": "generation",
  "output_type": "suggestions",
  "confidence": 0.35,
  "actions": [{
    "type": "SHOW_SUGGESTIONS",
    "status": "pending",
    "data": {
      "reason": "Low confidence intent classification. Please confirm what you want.",
      "items": [
        { "label": "Rewrite selected text", "command": "Rewrite selected text" },
        { "label": "Generate new text", "command": "Generate new text" },
        { "label": "Open an app", "command": "Open an app" }
      ]
    }
  }]
}
```

#### Undo
Command: `"undo"`
```json
{
  "intent": "undo",
  "source": "rule",
  "actions": [{
    "type": "INSERT_TEXT",
    "status": "pending",
    "data": { "text": "<previous_output>" }
  }]
}
```

### 8.3 List Command History

```bash
curl "http://localhost:3001/api/v1/commands/history?page=1&limit=20&sort=latest&intent=generation" \
  -H "Authorization: Bearer <access_jwt>"
```

Query params:
- `page` (default 1, max via limit cap)
- `limit` (default 20, max 100)
- `sort` = `latest | oldest`
- `intent` (filter)
- `context_type` (filter)
- `action_source` (filter)

Response 200:
```json
{
  "success": true,
  "data": {
    "items": [{
      "id": "uuid",
      "command": "write apology email",
      "intent": "generation",
      "steps": ["generate"],
      "result": "Hi team...",
      "actions": [{ "type": "INSERT_TEXT", "status": "executed", "data": { "text": "Hi team..." } }],
      "output_type": "text",
      "confidence": 0.92,
      "context_type": "email",
      "action_source": "gmail",
      "token_usage": {
        "prompt_tokens": 245,
        "completion_tokens": 180,
        "total_tokens": 425,
        "estimated_cost": 0.000128
      },
      "duration_ms": 1840,
      "status": "success",
      "created_at": "2026-05-08T10:00:00.000Z"
    }],
    "total": 42,
    "page": 1,
    "limit": 20,
    "sort": "latest"
  }
}
```

### 8.4 Acknowledge Action Status

After Electron executes an action locally:

```bash
curl -X POST http://localhost:3001/api/v1/commands/<command_id>/actions/ack \
  -H "Authorization: Bearer <access_jwt>" \
  -H "Content-Type: application/json" \
  -d '{
    "action_index": 0,
    "status": "executed"
  }'
```

Or for failure:
```json
{
  "action_index": 0,
  "status": "failed",
  "error": "WhatsApp not installed"
}
```

`status` values: `pending | executed | failed`

---

## 9. REST API — Voice (Phase 1, still active)

### 9.1 One-shot Transcription

```bash
curl -X POST http://localhost:3001/api/v1/voice/transcribe \
  -H "Authorization: Bearer <access_jwt>" \
  -F "audio=@/path/to/audio.webm"
```

Allowed types: `audio/mpeg, audio/mp3, audio/wav, audio/x-wav, audio/webm, video/webm`. Max 10 MB.

### 9.2 Rewrite Text (REST)

```bash
curl -X POST http://localhost:3001/api/v1/voice/rewrite \
  -H "Authorization: Bearer <access_jwt>" \
  -H "Content-Type: application/json" \
  -d '{ "text": "hi", "mode": "formal" }'
```

`mode`: `formal | casual`

### 9.3 Grammar Fix (REST)

```bash
curl -X POST http://localhost:3001/api/v1/voice/grammar \
  -H "Authorization: Bearer <access_jwt>" \
  -H "Content-Type: application/json" \
  -d '{ "text": "i goes to school" }'
```

---

## 10. WebSocket Events (Socket.IO)

### 10.1 Connection

Client (Electron):
```js
import { io } from "socket.io-client";

const socket = io("ws://localhost:3001", {
  auth: { token: ACCESS_JWT },
  transports: ["websocket"],
});

socket.on("connect", () => console.log("connected"));
socket.on("connect_error", (err) => console.error(err.message));
```

Authentication is required. Invalid/missing token → connection rejected with `Authentication failed`.
On connect, the socket joins a personal room: `user:<userId>`.

### 10.2 Health Check

```js
socket.emit("ping");
socket.on("pong", () => console.log("alive"));
```

### 10.3 Command Execution

```js
const result = await socket.emitWithAck("command:execute", {
  session_id: SESSION_ID,
  command: "write a thank you note to my mentor",
  context_type: "email",
  action_source: "gmail",
  context_metadata: {
    focused_app: "Gmail",
    input_type: "email_body"
  },
  selected_text: null
});
// result = { success: true, data: { command_id, intent, actions, ... } }
```

If you don't use ack, listen instead:
```js
socket.emit("command:execute", payload);
socket.on("command:result", (msg) => { /* msg.data === result */ });
```

Errors come back as `socket:error` events: `{ success: false, message, status }`.

### 10.4 Action Acknowledgement

```js
const ack = await socket.emitWithAck("command:action_ack", {
  command_id: COMMAND_ID,
  action_index: 0,
  status: "executed"
});
```

For failure:
```js
{
  command_id: COMMAND_ID,
  action_index: 1,
  status: "failed",
  error: "WhatsApp web not loaded"
}
```

### 10.5 Voice — Buffered Streaming

Audio chunks are buffered server-side per `userId:stream_id` and transcribed with Whisper on flush/end.

#### Send a chunk
```js
const ack = await socket.emitWithAck("voice:chunk", {
  stream_id: "stream_001",          // optional; backend will create one if omitted
  session_id: SESSION_ID,            // optional; included in transcript response
  chunk: arrayBufferOfAudio,         // Buffer | ArrayBuffer | TypedArray
  mime_type: "audio/webm",
  filename: "voice.webm",
  is_final: false                    // set true to auto-finalize and transcribe
});
// ack = { success: true, data: { stream_id, received_bytes, total_bytes } }
```

#### Get a partial transcript without ending the stream
```js
const partial = await socket.emitWithAck("voice:flush", {
  stream_id: "stream_001"
});
// partial.data: { stream_id, session_id, text, language, duration_ms, bytes, is_final: false }
```

#### Finalize and clear buffer
```js
const final = await socket.emitWithAck("voice:end", {
  stream_id: "stream_001",
  upload_audio: false               // true to also upload to Cloudinary
});
// final.data: { stream_id, session_id, text, language, audio_url?, duration_ms, bytes, is_final: true }
```

#### Cancel a stream
```js
await socket.emitWithAck("voice:cancel", { stream_id: "stream_001" });
```

#### Server limits
- Max stream size: 10 MB per stream.
- TTL: 2 minutes idle → auto-deleted.
- One stream per `userId:stream_id`.

---

## 11. Database Models (Prisma)

### Session
```
id, userId, isActive, device, context (JSON), lastActiveAt,
createdAt, endedAt
```

### CommandHistory
```
id, userId, sessionId, command, intent, steps (JSON), result,
actions (JSON), outputType, confidence,
contextType, actionSource,
promptTokens, completionTokens, totalTokens, estimatedCost,
durationMs, status, errorMessage, createdAt
```

`status` values stored: `success | partial | failed`

### AppUsage
```
id, userId, sessionId, event, action, contextType, actionSource,
metadata (JSON), createdAt
```

Events emitted:
- `session_started`
- `session_ended`
- `command_executed`
- `command_error`
- `action_acknowledged`
- `intent_classified`

### RefreshToken
```
id, userId, tokenHash (unique SHA256), expiresAt, revokedAt,
replacedById, device, createdAt
```

---

## 12. Token Pricing

`MODEL_PRICING_USD_PER_1M` is used to compute `estimated_cost`. Update there if OpenAI changes pricing:

```ts
{ "gpt-4o-mini": { input: 0.15, output: 0.60 }, ... }
```

---

## 13. Rate Limits

| Endpoint | Limit |
|---|---|
| `/auth/signup` | 5 / 15 min |
| `/auth/login` | 10 / 15 min |
| `/voice/*` | 30 / 15 min |
| `/commands/execute` | 60 / 15 min |

Disabled in `NODE_ENV=test`.

---

## 14. Test Suites

```bash
npm run test:api-phase1            # Phase 1 regression
npm run test:api-phase2-m1         # M1 — auth refresh + sessions
npm run test:api-phase2-m2         # M2 — REST command engine
npm run test:api-phase2-m4         # M4 — WebSocket + voice
npm run test:api-phase2-m5         # M5 — workflow + suggestions + tokens
npm run test:phase2-all            # M1 + M2 + M4 + M5
```

All green at Phase 2 closure.

---

## 15. Architecture Summary

```
Electron Desktop Client (Phase 3)
  - global shortcuts, mic capture, tray icon
  - simulates typing / opens apps locally
  - executes structured actions returned by backend
  - sends ACK after each action

        ▲ HTTP + WebSocket (JWT)
        ▼

Ripple Backend (Phase 2 — DONE)
  REST + Socket.IO (transport)
   └── Express routes / Socket events
  Command Engine
   └── intent.service (rules + LLM)
   └── command.service (orchestrator: confidence, steps, actions)
   └── execution.service (build action shapes)
   └── ai.service (OpenAI calls + token tracking)
  Voice
   └── voiceStreaming.service (buffered chunks → Whisper)
  Persistence (Prisma + PostgreSQL)
   └── User / Session / CommandHistory / AppUsage / RefreshToken
```

Backend NEVER touches OS. It plans. Electron executes.

---

## 16. What Phase 2 Does NOT Include (intentionally)

These belong to Electron / Phase 3+:
- Global shortcut listener
- Mic capture
- Active-app / window detection
- Selected-text extraction
- Typing / paste simulation
- Tray icon, auto-start on boot
- Per-app UI automation (search Saliq in WhatsApp, focus chat box, press Enter)
- Voice Activity Detection

These are advanced backend features for Phase 4+:
- Token-by-token AI response streaming
- Realtime (non-buffered) voice
- Clarification flow (`CLARIFY_CHOICE`)
- Prompt-injection guard / action allowlists
- Model routing (mini vs full)
- Workflow retries / cancellation / queue (most logic lives in Electron)

---

## 17. Phase 2 Feature Inventory

| # | Feature |
|---|---|
| 1 | Auth + Refresh Token Rotation |
| 2 | Sessions + Context Memory |
| 3 | Hybrid Intent Detection (rules + LLM) |
| 4 | Confidence Enforcement |
| 5 | SHOW_SUGGESTIONS Fallback |
| 6 | WORKFLOW Action Wrapping |
| 7 | Context-Aware Prompts (5 prompt families) |
| 8 | Structured Execution Actions (7 types) |
| 9 | Action ACK (REST + Socket) |
| 10 | Token + Cost Tracking |
| 11 | Command History (paginated, filterable) |
| 12 | AppUsage Analytics |
| 13 | WebSocket Realtime Commands |
| 14 | Buffered Voice Streaming |
| 15 | Undo / Previous Output |
| 16 | Rate Limiting |

---

## 18. Phase 2 Done — Tag

After running:
```bash
npm run build           # tsc — exit 0
npm run test:phase2-all # all green
```

Phase 2 is officially **CLOSED**. Move to Phase 3 (Electron).
