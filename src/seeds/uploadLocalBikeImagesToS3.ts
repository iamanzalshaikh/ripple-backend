/**
 * Upload every image in ../../HerRidez/uploads/ to S3 and write URLs to:
 *   - src/seeds/data/superbikeImageUrls.json
 *   - (copy) HerRidez/bikeimage/urls.json  (when run from repo root paths resolve)
 *
 * Requires .env: AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_S3_BUCKET_NAME
 *
 *   cd HerRidez-backend
 *   npm run upload:bike-images-s3
 */

import { readFileSync, readdirSync, writeFileSync, existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import logger from "../config/logger.js";
import { uploadOnS3 } from "../config/s3.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** .../HerRidez-backend/src/seeds -> ../../../HerRidez/uploads */
const UPLOADS_DIR = path.resolve(
  __dirname,
  "../../../HerRidez/uploads",
);

const OUT_SEED = path.join(__dirname, "data/superbikeImageUrls.json");
const OUT_APP = path.resolve(
  __dirname,
  "../../../HerRidez/bikeimage/urls.json",
);

const EXT_MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

function listImageFiles(dir: string): string[] {
  if (!existsSync(dir)) {
    return [];
  }
  const names = readdirSync(dir).filter((n) => {
    const low = n.toLowerCase();
    return (
      low.endsWith(".jpg") ||
      low.endsWith(".jpeg") ||
      low.endsWith(".png") ||
      low.endsWith(".webp")
    );
  });
  return names.sort((a, b) => {
    const na = parseInt(a.match(/\d+/)?.[0] ?? "0", 10);
    const nb = parseInt(b.match(/\d+/)?.[0] ?? "0", 10);
    if (na !== nb) return na - nb;
    return a.localeCompare(b);
  });
}

async function run() {
  const files = listImageFiles(UPLOADS_DIR);
  if (files.length === 0) {
    logger.error(
      `No images found in ${UPLOADS_DIR}. Add .jpg/.png files to HerRidez/uploads and run again.`,
    );
    process.exit(1);
  }

  const urls: string[] = [];
  for (const name of files) {
    const full = path.join(UPLOADS_DIR, name);
    const buf = readFileSync(full);
    const ext = path.extname(name).toLowerCase();
    const mimetype = EXT_MIME[ext] || "image/jpeg";
    const url = await uploadOnS3(
      buf,
      "herridez/bike-seed-images",
      mimetype,
    );
    if (!url) {
      logger.error(`S3 upload failed for ${name}`);
      process.exit(1);
    }
    logger.info(`${name} -> ${url}`);
    urls.push(url);
  }

  const body = JSON.stringify(urls, null, 2) + "\n";
  writeFileSync(OUT_SEED, body, "utf8");
  logger.info(`Wrote ${urls.length} URLs to ${OUT_SEED}`);

  if (existsSync(path.dirname(OUT_APP))) {
    writeFileSync(OUT_APP, body, "utf8");
    logger.info(`Wrote ${urls.length} URLs to ${OUT_APP}`);
  } else {
    logger.warn(`Skip app mirror (folder missing): ${path.dirname(OUT_APP)}`);
  }
}

run()
  .then(() => process.exit(0))
  .catch((e) => {
    logger.error(e?.message || e);
    process.exit(1);
  });
