# Phase 1 API Flow (docphase1.md)

Base URL: `http://localhost:<PORT>/api/v1` (default `PORT` is from `.env`)

## 0) Setup

- Set `DATABASE_URL` in `.env` (Neon Postgres URL)
- Create tables:

```bash
npm run db:push
```

- Start server:

```bash
npm run dev
```

## 1) Health (quick check)

- `GET /health`

```bash
curl http://localhost:3000/api/v1/health
```

## 2) Auth flow (Signup → Login → Me)

### Signup
- `POST /auth/signup`

Body:

```json
{ "email": "user@example.com", "password": "Passw0rd!", "name": "User" }
```

Returns: `token` + `user` and sets httpOnly cookie `token`.

### Login
- `POST /auth/login`

Body:

```json
{ "email": "user@example.com", "password": "Passw0rd!" }
```

### Me (session restore + onboarding check)
- `GET /auth/me` (protected)

Auth:
- Cookie `token` **or**
- `Authorization: Bearer <token>`

Returns:

```json
{ "success": true, "data": { "id": "...", "email": "...", "onboarding_completed": false } }
```

## 3) Onboarding

- `POST /user/onboarding-complete` (protected)

Body:

```json
{ "preferences": { "theme": "dark" } }
```

## 4) Voice → AI

> Requires `OPENAI_API_KEY` in `.env`. Without it these return **501**.

### Transcribe
- `POST /voice/transcribe` (protected, multipart form-data)
- Form field: `audio` (file)

Validation:
- Allowed file types: `mp3`, `wav`, `webm`
- Max size: **10MB**

Response includes `temp_id` (uuid) to help frontend track UI state before saving.

Optional:
- If Cloudinary is configured (`CLOUDINARY_*`), response includes `audioUrl`.

### Rewrite
- `POST /voice/rewrite` (protected)

Body:

```json
{ "text": "hey bro what's up", "mode": "formal" }
```

### Grammar
- `POST /voice/grammar` (protected)

Body:

```json
{ "text": "I goes to market yesterday" }
```

## 5) Transcripts (Save + History)

### Save transcript
- `POST /transcripts` (protected)

Body:

```json
{
  "raw_text": "hello",
  "processed_text": "Hello.",
  "action": "rewrite",
  "language": "en"
}
```

Allowed `action` values:
- `dictate`
- `rewrite`
- `grammar`

### History
- `GET /transcripts` (protected)

Query:
- `page` (default 1)
- `limit` (default 20, max 50)
- `search` (optional)
- `sort` (`latest` default, or `oldest`)

### Single transcript
- `GET /transcripts/:id` (protected)

### Delete transcript
- `DELETE /transcripts/:id` (protected)

## Automated check script

Run:

```bash
node scripts/check-phase1.mjs
```

or:

```bash
npm run check:phase1
```

