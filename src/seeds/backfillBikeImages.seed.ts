/**
 * Set `imageUrl` on bikes from superbikeImageUrls.json (S3), in list order, cycling.
 *
 * By default only bikes with null/empty `imageUrl` are updated (seeds that never set a URL).
 * To also replace Unsplash (or any images.unsplash.com URL) with S3 URLs:
 *
 *   PowerShell: $env:SEED_BIKE_IMAGES_REPLACE_UNSPLASH="1"; npm run seed:bike-images-missing
 *   bash:       SEED_BIKE_IMAGES_REPLACE_UNSPLASH=1 npm run seed:bike-images-missing
 *
 * Default: only null/empty imageUrl.
 */

import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import connectDB from "../config/db.js";
import logger from "../config/logger.js";
import Bike from "../models/bike.model.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function seedMissingBikeImages() {
  await connectDB();

  const urls = JSON.parse(
    readFileSync(path.join(__dirname, "data/superbikeImageUrls.json"), "utf8"),
  ) as string[];

  const replaceUnsplash =
    process.env.SEED_BIKE_IMAGES_REPLACE_UNSPLASH === "1" ||
    process.env.SEED_BIKE_IMAGES_REPLACE_UNSPLASH === "true";

  const filter = replaceUnsplash
    ? {
        status: "active" as const,
        $or: [
          { imageUrl: null },
          { imageUrl: "" },
          { imageUrl: { $regex: /unsplash\.com/i } },
        ],
      }
    : {
        status: "active" as const,
        $or: [{ imageUrl: null }, { imageUrl: "" }],
      };

  const missing = await Bike.find(filter).select("_id").sort({ createdAt: 1 });

  let updated = 0;
  for (let i = 0; i < missing.length; i++) {
    const url = urls[i % urls.length];
    await Bike.updateOne({ _id: missing[i]._id }, { $set: { imageUrl: url } });
    updated++;
  }

  logger.info(
    `✅ bike-images-missing: updated ${updated} bike(s); ${urls.length} URLs in rotation (replaceUnsplash=${replaceUnsplash})`,
  );
}

const runAsScript = process.argv[1]?.includes("backfillBikeImages.seed");
if (runAsScript) {
  seedMissingBikeImages()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export default seedMissingBikeImages;
