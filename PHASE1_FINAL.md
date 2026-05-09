# Phase 1 Backend — FINAL (Production-Ready Checklist) 

This is the final reference doc for Phase 1.

## Standard API response format (ENFORCED)

### Success
```json
{ "success": true, "data": {} }
```

### Error
```json
{ "success": false, "message": "Error message", "error": "optional details" }
```

## Base URL

`http://localhost:<PORT>/api/v1` (your current port is from `.env`)

Swagger:
`http://localhost:<PORT>/api-docs`

## End-to-end user flow (Phase 1)

1) **Signup/Login**
- `POST /auth/signup` or `POST /auth/login`
- Save `data.token` (Bearer) for frontend use

2) **Session restore + onboarding check**
- `GET /auth/me`
- Backend returns: `onboarding_completed` + `preferences`

3) **Onboarding complete**
- `POST /user/onboarding-complete` (+ optional `preferences`)

4) **Voice → Text**
- `POST /voice/transcribe` (multipart `audio`)
- Returns: `action: dictate`, `text`, `language`, optional `audioUrl`, and `temp_id` (uuid)

5) **AI Rewrite / Grammar**
- `POST /voice/rewrite` → `action: rewrite`
- `POST /voice/grammar` → `action: grammar`

6) **Save transcript**
- `POST /transcripts` with `action` in: `dictate | rewrite | grammar`

7) **History**
- `GET /transcripts` supports `page`, `limit`, `search`, `sort=latest|oldest`

## Phase 1 endpoints (final)

### System
- `GET /health`

### Auth
- `POST /auth/signup` *(rate limit: 5/15min)*
- `POST /auth/login` *(rate limit: 10/15min)*
- `GET /auth/me`
- `POST /auth/logout`

### User
- `POST /user/onboarding-complete`
- `GET /user/preferences`

### Voice/AI (rate limit: 30/15min)
- `POST /voice/transcribe` *(multipart audio; max 10MB; mp3/wav/webm)*
- `POST /voice/rewrite` *(text required; max 5000 chars)*
- `POST /voice/grammar` *(text required; max 5000 chars)*

### Transcripts
- `POST /transcripts` *(action validated: dictate|rewrite|grammar)*
- `GET /transcripts` *(pagination format enforced; supports sort)*
- `GET /transcripts/:id`
- `DELETE /transcripts/:id`

## AI timeouts (ENFORCED)

- OpenAI calls abort at **10 seconds** and return standard error response.

## How to verify (final)

```bash
npm run test:api-phase1
```

Also available:

```bash
npm run check:phase1                           