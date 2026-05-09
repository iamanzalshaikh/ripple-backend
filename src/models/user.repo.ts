import { prisma } from "../config/db.js";

export async function findUserByEmail(email: string) {
  return prisma.user.findUnique({ where: { email } });
}

export async function createUser(args: {
  email: string;
  passwordHash: string;
  name?: string;
}) {
  return prisma.user.create({
    data: {
      email: args.email,
      passwordHash: args.passwordHash,
      name: args.name,
    },
  });
}

