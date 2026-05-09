# ripple-backend

Express + PostgreSQL (Neon) + JWT cookie/Bearer auth, **folder layout aligned with Ridez** (`controllers`, `middlewares`, `models`, `routes`, `services`, `utils`, `types`, `seeds`, `queues`, `jobs`, `sockets`).

## Env

Copy `.env.example` → `.env`. `DATABASE_URL`, `JWT_ACCESS_SECRET`, and `JWT_REFRESH_SECRET` are required.

## Run

```bash
npm install
npm run dev
```

- `GET /api/v1/health`
- `GET /api/v1/public/ping`
- User auth under `/api/v1/auth/...` (same paths as Ridez: signup/login OTP × email + SMS, `me`, `logout`) — OTP handlers return **501** until implemented
- Admin auth stub: `POST /api/v1/admin/auth/login` (**501**), `POST /api/v1/admin/auth/logout`, `GET /api/v1/admin/auth/me` (**403** from middleware stub)

Folders: `config`, `controllers`, `middlewares`, `models`, `routes`, `services`, `utils`, `types`, plus empty `seeds`, `queues`, `jobs`, `sockets` for upcoming features.
