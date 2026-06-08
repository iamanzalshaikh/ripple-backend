/** True when Prisma/pg failed to reach PostgreSQL (Neon down, bad URL, network). */
export function isDatabaseUnreachableError(error: unknown): boolean {
  const msg =
    error instanceof Error
      ? `${error.message} ${(error as { cause?: Error }).cause?.message ?? ""}`
      : String(error);

  return (
    /can't reach database server/i.test(msg) ||
    /connection terminated/i.test(msg) ||
    /ECONNREFUSED/i.test(msg) ||
    /ENOTFOUND/i.test(msg) ||
    /ETIMEDOUT/i.test(msg) ||
    /Connection timed out/i.test(msg) ||
    /P1001/i.test(msg)
  );
}

export const DB_UNAVAILABLE_MESSAGE =
  "Database is unreachable. Open your Neon dashboard and resume the project, then verify DATABASE_URL in ripple-backend/.env (use sslmode=require, no channel_binding).";
