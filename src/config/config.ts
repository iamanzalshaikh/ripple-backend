import "dotenv/config";

const raw = process.env.PORT;
const port = raw ? Number(raw) : 3001;
if (!Number.isFinite(port) || port <= 0) {
  throw new Error("PORT must be a positive number");
}

function req(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env: ${name}`);
  return v;
}

function opt(name: string): string | undefined {
  const v = process.env[name];
  return v && v.length > 0 ? v : undefined;
}

export default {
  PORT: port,
  NODE_ENV: process.env.NODE_ENV ?? "development",
  FRONTEND_URL: process.env.FRONTEND_URL ?? "http://localhost:8081",
  MASTER_URL: opt("MASTER_URL"),
  CORS_ORIGIN: opt("CORS_ORIGIN"),

  DATABASE_URL: req("DATABASE_URL"),

  JWT_ACCESS_SECRET: req("JWT_ACCESS_SECRET"),
  JWT_REFRESH_SECRET: req("JWT_REFRESH_SECRET"),
  JWT_ADMIN_ACCESS_SECRET: opt("JWT_ADMIN_ACCESS_SECRET"),
  JWT_ADMIN_REFRESH_SECRET: opt("JWT_ADMIN_REFRESH_SECRET"),

  /** HttpOnly cookie name for access JWT (same convention as Ridez-style clients). */
  AUTH_COOKIE_NAME: process.env.AUTH_COOKIE_NAME ?? "token",
  REFRESH_COOKIE_NAME: process.env.REFRESH_COOKIE_NAME ?? "refresh_token",

  // Phase 1 AI
  OPENAI_API_KEY: opt("OPENAI_API_KEY"),
  OPENAI_MODEL: opt("OPENAI_MODEL") ?? "gpt-4o-mini",
  OPENAI_TRANSCRIBE_MODEL: opt("OPENAI_TRANSCRIBE_MODEL") ?? "whisper-1",

  // Cloudinary (uploads)
  CLOUDINARY_CLOUD_NAME: opt("CLOUDINARY_CLOUD_NAME"),
  CLOUDINARY_API_KEY: opt("CLOUDINARY_API_KEY"),
  CLOUDINARY_API_SECRET: opt("CLOUDINARY_API_SECRET"),

  // SMTP
  SMTP_HOST: opt("SMTP_HOST"),
  SMTP_PORT: opt("SMTP_PORT"),
  SMTP_USER: opt("SMTP_USER"),
  SMTP_PASS: opt("SMTP_PASS"),
  EMAIL_FROM: opt("EMAIL_FROM"),

  // AWS (if you use S3 later)
  AWS_REGION: opt("AWS_REGION"),
  AWS_ACCESS_KEY_ID: opt("AWS_ACCESS_KEY_ID"),
  AWS_SECRET_ACCESS_KEY: opt("AWS_SECRET_ACCESS_KEY"),
  AWS_S3_BUCKET_NAME: opt("AWS_S3_BUCKET_NAME"),

  // Redis (optional)
  REDIS_URL: opt("REDIS_URL"),

  // Techmore SMS (optional)
  TECHMORE_AUTH_KEY: opt("TECHMORE_AUTH_KEY"),
  TECHMORE_SENDER_ID: opt("TECHMORE_SENDER_ID"),
  TECHMORE_ROUTE: opt("TECHMORE_ROUTE"),
  TECHMORE_TEMPLATE_ID: opt("TECHMORE_TEMPLATE_ID"),
};
