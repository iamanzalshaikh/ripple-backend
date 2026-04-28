/**
 * Create marketplace listings from marketplaceListings.seed.json (S3 media URLs).
 * Sellers are users from dataUsersAndBikes seed: phone = SEED_PHONE_START + sellerIndex.
 *
 * Prereq:
 *   npm run extract:marketplace
 *   npm run upload:marketplace-images-s3
 *
 * Run:
 *   npm run seed:marketplace
 *
 * Deletes existing rows whose first image URL contains `/herridez/marketplace-seed/` (prior seed run), then inserts fresh listings.
 */

import { readFileSync, existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import connectDB from "../config/db.js";
import logger from "../config/logger.js";
import User from "../models/user.model.js";
import Listing from "../models/listing.model.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SEED_JSON = path.join(__dirname, "data/marketplaceListings.seed.json");

type SeedRow = {
  sellerIndex: number;
  title: string;
  description?: string;
  price: number;
  category: "gear" | "bike";
  subCategory?: string;
  location?: string;
  media: string[];
};

async function seedMarketplaceListings() {
  if (!existsSync(SEED_JSON)) {
    logger.error(
      `Missing ${SEED_JSON}. Run extract:marketplace then upload:marketplace-images-s3 first.`,
    );
    process.exit(1);
  }

  await connectDB();

  const rows = JSON.parse(readFileSync(SEED_JSON, "utf8")) as SeedRow[];

  /** Remove listings from earlier marketplace-seed uploads so IDs/titles rotate cleanly. */
  const cleared = await Listing.deleteMany({
    "media.0": { $regex: /\/herridez\/marketplace-seed\// },
  });
  logger.info(
    `Cleared ${cleared.deletedCount} previous seed listing(s) (S3 path marketplace-seed)`,
  );

  const phoneStart = parseInt(process.env.SEED_PHONE_START || "9610000001", 10);

  let created = 0;
  let skipped = 0;

  for (const row of rows) {
    const phone = String(phoneStart + row.sellerIndex);
    const seller = await User.findOne({ phone }).select("_id");
    if (!seller) {
      logger.warn(
        `No user for sellerIndex=${row.sellerIndex} phone=${phone}; run seed:data-users-bikes first`,
      );
      skipped++;
      continue;
    }

    await Listing.create({
      sellerId: seller._id,
      title: row.title,
      description: row.description,
      price: row.price,
      category: row.category,
      subCategory: row.subCategory,
      location: row.location,
      media: row.media,
      status: "active",
      verified: false,
    });
    created++;
  }

  logger.info(
    `✅ marketplace seed: created ${created}, skipped ${skipped}`,
  );
}

const runScript = process.argv[1]?.includes("marketplaceListings.seed");
if (runScript) {
  seedMarketplaceListings()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export default seedMarketplaceListings;
