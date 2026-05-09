import { createHash } from "node:crypto";
import { prisma } from "../config/db.js";

export function hashRefreshToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function storeRefreshToken(args: {
  userId: string;
  token: string;
  expiresAt: Date;
  device?: string;
}) {
  return prisma.refreshToken.create({
    data: {
      userId: args.userId,
      tokenHash: hashRefreshToken(args.token),
      expiresAt: args.expiresAt,
      device: args.device,
    },
  });
}

export async function findValidRefreshToken(token: string) {
  const row = await prisma.refreshToken.findUnique({
    where: { tokenHash: hashRefreshToken(token) },
  });
  if (!row) return null;
  if (row.revokedAt) return null;
  if (row.expiresAt.getTime() <= Date.now()) return null;
  return row;
}

export async function rotateRefreshToken(args: {
  oldId: string;
  userId: string;
  newToken: string;
  newExpiresAt: Date;
  device?: string;
}) {
  const newRow = await prisma.refreshToken.create({
    data: {
      userId: args.userId,
      tokenHash: hashRefreshToken(args.newToken),
      expiresAt: args.newExpiresAt,
      device: args.device,
    },
  });
  await prisma.refreshToken.update({
    where: { id: args.oldId },
    data: { revokedAt: new Date(), replacedById: newRow.id },
  });
  return newRow;
}

export async function revokeRefreshToken(token: string) {
  return prisma.refreshToken.updateMany({
    where: { tokenHash: hashRefreshToken(token), revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function revokeAllUserRefreshTokens(userId: string) {
  return prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
