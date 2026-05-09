# Phase 1 API — Curl Guide + End‑to‑End User Flow

Base URL:
- `BASE_URL=http://localhost:3009`
- API prefix: `${BASE_URL}/api/v1`

> Tip (PowerShell): you can set once per terminal:
>
> `\$env:BASE_URL="http://localhost:3009"`

---

## 1) Health / Quick Check

### `GET /health`

```bash
curl "%BASE_URL%/api/v1/health"
```

---

## 2) Auth (Phase 1)

### 2.1 Signup
**POST** `/auth/signup`

```bash
curl -X POST "%BASE_URL%/api/v1/auth/signup" ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"user@example.com\",\"password\":\"Passw0rd!\",\"name\":\"User\"}"
```

Response contains:
- `data.token` (JWT)
- `data.user`
- also sets cookie `token` (httpOnly)

### 2.2 Login
**POST** `/auth/login`

```bash
curl -X POST "%BASE_URL%/api/v1/auth/login" ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"user@example.com\",\"password\":\"Passw0rd!\"}"
```

### 2.3 Save token to env (recommended)
Copy the token from signup/login response and set it as `TOKEN`.

PowerShell:

```powershell
$env:TOKEN="PASTE_TOKEN_HERE"
```

### 2.4 Current user (session restore + onboarding check)
**GET** `/auth/me` (protected)

Bearer token:

```bash
curl "%BASE_URL%/api/v1/auth/me" ^
  -H "Authorization: Bearer %TOKEN%"
```

### 2.5 Logout
**POST** `/auth/logout` (protected)

```bash
curl -X POST "%BASE_URL%/api/v1/auth/logout" ^
  -H "Authorization: Bearer %TOKEN%"
```

---

## 3) Onboarding (Phase 1)

### `POST /user/onboarding-complete` (protected)

```bash
curl -X POST "%BASE_URL%/api/v1/user/onboarding-complete" ^
  -H "Authorization: Bearer %TOKEN%" ^
  -H "Content-Type: application/json" ^
  -d "{\"preferences\":{\"language\":\"en\",\"theme\":\"dark\"}}"
```

---

## 4) Voice + AI (Phase 1)

> Requires `OPENAI_API_KEY` in `.env`.
> Optional: Cloudinary `CLOUDINARY_*` will store audio and return `audioUrl`.
>
> Audio validation:
> - Allowed: **mp3, wav, webm**
> - Max size: **10MB**

### 4.1 Transcribe audio
**POST** `/voice/transcribe` (protected, multipart)

- Form field name must be: **`audio`**

```bash
curl -X POST "%BASE_URL%/api/v1/voice/transcribe" ^
  -H "Authorization: Bearer %TOKEN%" ^
  -F "audio=@C:\path\to\audio.mp3"
```

Response:
- `data.text`
- `data.language` (if available)
- `data.audioUrl` (only if Cloudinary configured)
- `data.temp_id` (uuid for frontend UI tracking)

### 4.2 Rewrite text
**POST** `/voice/rewrite` (protected)

Modes supported:
- `formal`
- `casual`

```bash
curl -X POST "%BASE_URL%/api/v1/voice/rewrite" ^
  -H "Authorization: Bearer %TOKEN%" ^
  -H "Content-Type: application/json" ^
  -d "{\"text\":\"hey bro what's up\",\"mode\":\"formal\"}"
```

Response:
- `data.processed_text`

### 4.3 Grammar correction
**POST** `/voice/grammar` (protected)

```bash
curl -X POST "%BASE_URL%/api/v1/voice/grammar" ^
  -H "Authorization: Bearer %TOKEN%" ^
  -H "Content-Type: application/json" ^
  -d "{\"text\":\"I goes to market yesterday\"}"
```

Response:
- `data.processed_text`

---

## 5) Transcripts (Phase 1)

### 5.1 Save transcript
**POST** `/transcripts` (protected)

Allowed `action`:
- `dictate`
- `rewrite`
- `grammar`

```bash
curl -X POST "%BASE_URL%/api/v1/transcripts" ^
  -H "Authorization: Bearer %TOKEN%" ^
  -H "Content-Type: application/json" ^
  -d "{\"raw_text\":\"hello\",\"processed_text\":\"Hello.\",\"action\":\"rewrite\",\"language\":\"en\"}"
```

### 5.2 List transcripts (history)
**GET** `/transcripts` (protected)

```bash
curl "%BASE_URL%/api/v1/transcripts?page=1&limit=10" ^
  -H "Authorization: Bearer %TOKEN%"
```

Response format:

```json
{
  "success": true,
  "data": {
    "items": [],
    "total": 0,
    "page": 1,
    "limit": 10,
    "sort": "latest"
  }
}
```

Sorting:

```bash
curl "%BASE_URL%/api/v1/transcripts?page=1&limit=10&sort=oldest" ^
  -H "Authorization: Bearer %TOKEN%"
```

Search:

```bash
curl "%BASE_URL%/api/v1/transcripts?page=1&limit=10&search=hello" ^
  -H "Authorization: Bearer %TOKEN%"
```

### 5.3 Get single transcript
**GET** `/transcripts/:id` (protected)

```bash
curl "%BASE_URL%/api/v1/transcripts/TRANSCRIPT_ID_HERE" ^
  -H "Authorization: Bearer %TOKEN%"
```

### 5.4 Delete transcript
**DELETE** `/transcripts/:id` (protected)

```bash
curl -X DELETE "%BASE_URL%/api/v1/transcripts/TRANSCRIPT_ID_HERE" ^
  -H "Authorization: Bearer %TOKEN%"
```

---

## 6) Full End‑to‑End User Flow (Phase 1)

### Step A — Signup/Login
1. Frontend collects `email + password (+ name for signup)`.
2. Call:
   - `POST /api/v1/auth/signup` *(new user)* OR
   - `POST /api/v1/auth/login` *(existing user)*
3. Save the returned `token` in memory (or rely on cookie if you choose cookie-based auth).

### Step B — Restore session + check onboarding
1. On app start, call:
   - `GET /api/v1/auth/me` with Bearer token (or cookie)
2. Backend returns:
   - `onboarding_completed`
3. If false → show onboarding screens.

### Step C — Complete onboarding
1. Call:
   - `POST /api/v1/user/onboarding-complete`
2. Optionally store `preferences` JSON.

### Step D — Voice → Text (Transcribe)
1. User records audio on device.
2. Frontend uploads audio file as multipart:
   - `POST /api/v1/voice/transcribe` with form field `audio`
3. Backend:
   - (optional) uploads audio to Cloudinary
   - sends audio to OpenAI transcription model
4. Backend returns `text`.

### Step E — AI Rewrite / Grammar
1. If user taps “Rewrite”:
   - `POST /api/v1/voice/rewrite` with `{ text, mode }`
2. If user taps “Grammar”:
   - `POST /api/v1/voice/grammar` with `{ text }`
3. Backend returns `processed_text`.

### Step F — Save transcript
After transcribe/rewrite/grammar, frontend saves it:
- `POST /api/v1/transcripts`
  - `raw_text` = original transcript
  - `processed_text` = rewrite/grammar result (optional)
  - `action` = `dictate` / `rewrite` / `grammar`
  - `language` = optional

### Step G — History
1. Load list:
   - `GET /api/v1/transcripts?page=1&limit=20`
2. View one:
   - `GET /api/v1/transcripts/:id`
3. Delete:
   - `DELETE /api/v1/transcripts/:id`

---

## 7) Swagger UI

Open:
- `http://localhost:3009/api-docs`

