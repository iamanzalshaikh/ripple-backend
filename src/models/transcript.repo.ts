import { prisma } from "../config/db.js";

export async function createTranscript(args: {
  userId: string;
  rawText: string;
  processedText?: string;
  action: string;
  language?: string;
}) {
  return prisma.transcript.create({
    data: {
      userId: args.userId,
      rawText: args.rawText,
      processedText: args.processedText,
      action: args.action,
      language: args.language,
    },
  });
}

