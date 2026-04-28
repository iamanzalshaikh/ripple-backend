/**
 * Seed 20 discoverable groups from groupDiscoverList.seed.json (coverUrl on S3).
 * Creators use phone SEED_PHONE_START + creatorIndex (data-users-bikes convention).
 *
 * Clears groups whose coverUrl contained previous seed uploads (covers/seed path).
 *
 * Prereq: npm run seed:upload-discover-group-banners
 * Run:    npm run seed:discover-groups
 */

import { readFileSync, existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { v4 as uuidv4 } from "uuid";
import connectDB from "../config/db.js";
import logger from "../config/logger.js";
import User from "../models/user.model.js";
import Group from "../models/group.model.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SEED_JSON = path.join(__dirname, "data/groupDiscoverList.seed.json");

type SeedRow = {
  name: string;
  description?: string;
  location?: string;
  creatorIndex: number;
  privacy: "public" | "private" | "friends";
  tags: string[];
  coverUrl: string;
};

async function seedDiscoverGroups() {
  if (!existsSync(SEED_JSON)) {
    logger.error(
      `Missing ${SEED_JSON}. Run: npm run seed:upload-discover-group-banners`,
    );
    process.exit(1);
  }

  await connectDB();

  const cleared = await Group.deleteMany({
    coverUrl: { $regex: /\/herridez\/groups\/covers\/seed\// },
  });
  logger.info(
    `Removed ${cleared.deletedCount} prior seed discover group(s) (S3 covers/seed)`,
  );

  const rows = JSON.parse(readFileSync(SEED_JSON, "utf8")) as SeedRow[];
  const phoneStart = parseInt(process.env.SEED_PHONE_START || "9610000001", 10);

  let created = 0;
  let skipped = 0;

  for (const row of rows) {
    const phone = String(phoneStart + row.creatorIndex);
    const creator = await User.findOne({ phone }).select("_id");
    if (!creator) {
      logger.warn(
        `No user for creatorIndex=${row.creatorIndex} phone=${phone}; run seed:data-users-bikes first`,
      );
      skipped++;
      continue;
    }

    const chatRoomId = `group-${uuidv4()}`;
    const g = await Group.create({
      name: row.name,
      description: row.description ?? "",
      location: row.location ?? "",
      createdBy: creator._id,
      privacy: row.privacy,
      avatarUrl: undefined,
      coverUrl: row.coverUrl,
      tags: row.tags ?? [],
      chatRoomId,
      members: [
        {
          userId: creator._id,
          role: "admin" as const,
          joinedAt: new Date(),
        },
      ],
      joinRequests: [],
      stats: {
        totalMembers: 1,
        totalRides: 0,
      },
    });
    created++;
    logger.info(`Created group: ${g.name} (${g._id})`);
  }

  logger.info(`✅ discover-groups: created ${created}, skipped ${skipped}`);
}

const runScript = process.argv[1]?.includes("seedDiscoverGroups.seed");
if (runScript) {
  seedDiscoverGroups()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export default seedDiscoverGroups;
