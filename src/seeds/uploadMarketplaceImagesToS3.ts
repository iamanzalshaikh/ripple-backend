/**
 * Upload local images referenced in marketplaceListings.json to S3, then write
 * marketplaceListings.seed.json (same rows + `media` URLs, no `imageFiles`).
 *
 * Images directory: ../../HerRidez/marketplace/
 *
 *   cd HerRidez-backend
 *   npm run extract:marketplace
 *   npm run upload:marketplace-images-s3
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import logger from "../config/logger.js";
import { uploadOnS3 } from "../config/s3.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const IN_JSON = path.join(__dirname, "data/marketplaceListings.json");
const OUT_JSON = path.join(__dirname, "data/marketplaceListings.seed.json");
const IMAGES_DIR = path.resolve(__dirname, "../../../HerRidez/marketplace");

const EXT_MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

type RowIn = {
  sellerIndex: number;
  title: string;
  description?: string;
  price: number;
  category: "gear" | "bike";
  subCategory?: string;
  location?: string;
  imageFiles: string[];
};

type RowOut = Omit<RowIn, "imageFiles"> & { media: string[] };

async function run() {
  if (!existsSync(IN_JSON)) {
    logger.error(`Missing ${IN_JSON}. Run: npm run extract:marketplace`);
    process.exit(1);
  }
  if (!existsSync(IMAGES_DIR)) {
    logger.error(`Missing marketplace images folder: ${IMAGES_DIR}`);
    process.exit(1);
  }

  const rows = JSON.parse(readFileSync(IN_JSON, "utf8")) as RowIn[];
  const out: RowOut[] = [];

  for (const row of rows) {
    const media: string[] = [];
    for (const name of row.imageFiles) {
      const full = path.join(IMAGES_DIR, name);
      if (!existsSync(full)) {
        logger.error(`Image not found: ${full}`);
        process.exit(1);
      }
      const buf = readFileSync(full);
      const ext = path.extname(name).toLowerCase();
      const mimetype = EXT_MIME[ext] || "image/jpeg";
      const url = await uploadOnS3(buf, "herridez/marketplace-seed", mimetype);
      if (!url) {
        logger.error(`S3 upload failed: ${name}`);
        process.exit(1);
      }
      logger.info(`${name} -> ${url}`);
      media.push(url);
    }
    const { imageFiles: _i, ...rest } = row;
    out.push({ ...rest, media });
  }

  writeFileSync(OUT_JSON, JSON.stringify(out, null, 2) + "\n", "utf8");
  logger.info(`Wrote ${out.length} listing(s) to ${OUT_JSON}`);
}

run()
  .then(() => process.exit(0))
  .catch((e) => {
    logger.error(e?.message || e);
    process.exit(1);
  });
