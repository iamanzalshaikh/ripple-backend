/**
 * Download banner images from `groupDiscoverList.json` (Unsplash URLs), upload to S3
 * under herridez/groups/covers/seed/, write `groupDiscoverList.seed.json` with `coverUrl`.
 *
 *   cd HerRidez-backend
 *   npm run seed:upload-discover-group-banners
 */

import axios from "axios";
import { readFileSync, writeFileSync, existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import logger from "../config/logger.js";
import { uploadOnS3 } from "../config/s3.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SOURCE = path.join(__dirname, "data/groupDiscoverList.json");
const OUT = path.join(__dirname, "data/groupDiscoverList.seed.json");

type SourceRow = {
  name: string;
  description?: string;
  location?: string;
  creatorIndex: number;
  privacy: "public" | "private" | "friends";
  tags: string[];
  bannerSourceUrl: string;
};

type SeedRow = Omit<SourceRow, "bannerSourceUrl"> & { coverUrl: string };

function mimeFromUrlOrHeader(url: string, header: string | undefined): string {
  const ct = header?.split(";")[0]?.trim().toLowerCase();
  if (ct?.startsWith("image/")) return ct;
  const low = url.toLowerCase();
  if (low.includes(".png")) return "image/png";
  if (low.includes(".webp")) return "image/webp";
  return "image/jpeg";
}

async function run() {
  if (!existsSync(SOURCE)) {
    logger.error(`Missing ${SOURCE}`);
    process.exit(1);
  }

  const rows = JSON.parse(readFileSync(SOURCE, "utf8")) as SourceRow[];
  const outRows: SeedRow[] = [];

  for (const row of rows) {
    const { bannerSourceUrl, ...rest } = row;
    const resp = await axios.get<ArrayBuffer>(bannerSourceUrl, {
      responseType: "arraybuffer",
      timeout: 45000,
      maxRedirects: 5,
      validateStatus: (s) => s >= 200 && s < 400,
    });
    const buf = Buffer.from(resp.data);
    const ct = resp.headers["content-type"];
    const mimetype = mimeFromUrlOrHeader(bannerSourceUrl, ct);
    const url = await uploadOnS3(buf, "herridez/groups/covers/seed", mimetype);
    if (!url) {
      logger.error(`S3 upload failed for group: ${row.name}`);
      process.exit(1);
    }
    logger.info(`${row.name} -> ${url}`);
    outRows.push({ ...rest, coverUrl: url });
  }

  writeFileSync(OUT, JSON.stringify(outRows, null, 2) + "\n", "utf8");
  logger.info(`Wrote ${outRows.length} rows to ${OUT}`);
}

run()
  .then(() => process.exit(0))
  .catch((e) => {
    logger.error(e?.message || e);
    process.exit(1);
  });
