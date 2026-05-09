# 🚀 PROJECT XXX — PHASE 1 BACKEND DEVELOPMENT PLAN (FINAL)

## 🧠 OBJECTIVE

Build a complete backend for:

* Voice → Text (AI)
* AI Rewrite / Grammar
* User Authentication
* Transcript Storage
* Onboarding support

---

# 🎯 FINAL FEATURE COUNT (PHASE 1)

### 🔐 Authentication (4)

1. Signup
2. Login
3. JWT session
4. Get current user

---

### 🎙️ Voice Processing (3)

5. Record + upload audio
6. Transcribe (AI)
7. Return text

---

### 🤖 AI Processing (3)

8. Rewrite (formal/casual)
9. Grammar correction
10. Processed output

---

### 💾 Storage (1)

11. Save & fetch transcripts

---

👉 **TOTAL: 11 FEATURES**

---

# 🧭 USER FLOW (END-TO-END)

User Signup/Login
→ Onboarding check
→ Dashboard
→ Speak (mic)
→ Audio → Backend
→ AI transcription
→ Text shown
→ User clicks rewrite
→ AI response
→ Saved to DB
→ History visible

---

# 🗄️ DATABASE DESIGN (FINAL)

## 🧑 USERS TABLE

Stores user + onboarding state

Fields:

* id (UUID)
* email (unique)
* password_hash
* name
* onboarding_completed (boolean)
* preferences (JSON)
* created_at
* updated_at

---

## 📝 TRANSCRIPTS TABLE

Stores all user activity

Fields:

* id (UUID)
* user_id (FK)
* raw_text
* processed_text
* action (dictate / rewrite / grammar)
* language
* created_at

---

## 🔐 AUTH TOKENS (OPTIONAL)

* id
* user_id
* refresh_token
* expires_at

---

# 🔌 API ENDPOINTS (FINAL)

---

## 🔐 AUTH MODULE

### POST /auth/signup

Create new user

Input:

* email
* password
* name

Output:

* user data
* JWT token

---

### POST /auth/login

Authenticate user

Output:

* JWT token
* user data

---

### GET /auth/me ⭐ (CRITICAL)

Returns logged-in user

Used for:

* Session restore
* Onboarding check

Output:

```json
{
  "id": "...",
  "email": "...",
  "onboarding_completed": false
}
```

---

---

## 🧠 ONBOARDING MODULE

### POST /user/onboarding-complete

Purpose:
Mark onboarding done

Input:

* preferences (optional)

Output:

* success

---

---

## 🎙️ VOICE MODULE

### POST /voice/transcribe

Purpose:
Convert audio → text

Input:

* audio file

Output:

```json
{
  "text": "hello this is a test",
  "language": "en"
}
```

---

### Flow:

Audio → Backend → OpenAI → Text → Response

---

---

## 🤖 AI MODULE

### POST /voice/rewrite

Input:

```json
{
  "text": "hey bro what's up",
  "mode": "formal"
}
```

Output:

```json
{
  "processed_text": "Hello, how are you doing?"
}
```

---

---

### POST /voice/grammar

Input:

```json
{
  "text": "I goes to market yesterday"
}
```

Output:

```json
{
  "processed_text": "I went to the market yesterday"
}
```

---

---

## 💾 TRANSCRIPT MODULE

### POST /transcripts

Save transcript

Input:

* raw_text
* processed_text
* action

---

### GET /transcripts

Get user history

Query:

* pagination
* search

---

### GET /transcripts/:id

Get single transcript

---

### DELETE /transcripts/:id

Delete transcript

---

# 🔄 SYSTEM FLOW (IMPORTANT)

## 🎙️ Voice Flow

User speaks
→ Frontend sends audio
→ Backend processes
→ AI returns text
→ Sent back to UI

---

## 🤖 AI Flow

User clicks rewrite
→ Backend sends prompt
→ AI returns result

---

## 💾 Save Flow

After AI response
→ Save in DB
→ Return success

---

# 🧠 ONBOARDING FLOW (BACKEND ROLE)

1. User logs in

2. Call `/auth/me`

3. If:

   * onboarding_completed = false
     → Show onboarding UI

4. After onboarding:

   * Call `/user/onboarding-complete`

---

# 🔐 SECURITY

* Password hashing (bcrypt)
* JWT authentication
* Protected routes
* No API key exposure
* HTTPS in production

---

# ⚠️ ERROR HANDLING

Must handle:

* Mic issues
* API failures
* Network errors
* Invalid tokens

---

# 🧪 TESTING CHECKLIST

✔ Signup/Login works
✔ Token validation works
✔ Audio upload works
✔ Transcription works
✔ AI rewrite works
✔ Grammar works
✔ Data saved in DB
✔ History loads

---

# ⏱️ DEVELOPMENT PLAN

## Week 1

* Auth + DB setup

## Week 2

* Voice processing

## Week 3

* AI rewrite + grammar

## Week 4

* Transcripts + testing

---

# 🚫 OUT OF SCOPE (PHASE 1)

* Desktop app
* Chrome extension
* Global shortcuts
* App integrations

---

# 🎯 SUCCESS CRITERIA

Backend is complete when:

✔ Full flow works end-to-end
✔ Stable APIs
✔ Fast response (<2s)
✔ No crashes

---

# 🚀 FINAL STATUS

✅ Scope finalized
✅ API defined
✅ DB defined
👉 Ready for development

---

# 🧠 FINAL NOTE

Focus ONLY on:

👉 Voice → Text → AI → Save

That’s your entire Phase 1.
