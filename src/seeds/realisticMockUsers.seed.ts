/**
 * Seeds users from the 5-city realistic mock dataset (`src/seeds/data/r5c_mock_users.json`).
 *
 * Phones: default `9710000000` … (avoids overlap with `961…` data-users-bikes seeds).
 *
 * Run (from `HerRidez-backend` with `.env` / `MONGO_URI` set):
 *   npm run seed:mock-city-users
 *   SEED_MOCK_PHONE_START=9710000000 npm run seed:mock-city-users
 *   CLEAR_MOCK_CITY_USERS=1 npm run seed:mock-city-users
 */

import { readFileSync, existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import connectDB from "../config/db.js";
import logger from "../config/logger.js";
import User from "../models/user.model.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

type MockUserRow = {
  userId: string;
  name: string;
  gender: string;
  age: number;
  city: string;
  state: string;
  country: string;
  area?: string;
  ridingLevel: string;
  ridingStyle: string[];
  yearsOfExperience: number;
  verified: boolean;
  subscription: string;
  xp: number;
  followers: number;
  following: number;
  latitude: number;
  longitude: number;
};

const ALLOWED_STYLES = new Set([
  "Track",
  "Touring",
  "Street",
  "Commute",
  "Racing",
]);

function mapRidingStyles(styles: string[]): string[] {
  const map: Record<string, string> = {
    Sport: "Racing",
    City: "Commute",
    Adventure: "Touring",
    Cruiser: "Street",
  };
  const out: string[] = [];
  for (const s of styles || []) {
    const m = map[s] ?? (ALLOWED_STYLES.has(s) ? s : "Commute");
    if (!out.includes(m)) out.push(m);
  }
  return out.length ? out : ["Commute"];
}

function mapRidingLevel(
  level: string,
): "Beginner" | "Intermediate" | "Advanced" | "Expert" {
  const l = (level || "").trim();
  if (l === "Pro") return "Expert";
  if (
    l === "Beginner" ||
    l === "Intermediate" ||
    l === "Advanced" ||
    l === "Expert"
  ) {
    return l;
  }
  return "Beginner";
}

function mapSubscriptionTier(s: string): "free" | "pro" {
  const u = (s || "Free").toLowerCase();
  if (u === "free") return "free";
  return "pro";
}

function handleFromMockUserId(userId: string): string {
  return userId.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 20);
}

async function uniqueHandle(base: string, phone: string): Promise<string> {
  let h = base;
  if (h.length < 3) {
    h = `u${phone.replace(/\D/g, "").slice(-9)}`.slice(0, 20);
  }
  let candidate = h;
  for (let n = 0; n < 500; n++) {
    const existing = await User.findOne({ handle: candidate }).select("_id").lean();
    if (!existing) return candidate;
    const suffix = n === 0 ? phone.slice(-2) : String(n);
    candidate = `${h}${suffix}`.replace(/[^a-z0-9]/g, "").slice(0, 20);
    if (candidate.length < 3) candidate = `r${phone.slice(-6)}${suffix}`.slice(0, 20);
  }
  throw new Error(`Could not allocate unique handle for phone ${phone}`);
}

async function seedRealisticMockUsers() {
  const jsonPath = path.join(__dirname, "data", "r5c_mock_users.json");
  if (!existsSync(jsonPath)) {
    throw new Error(`Missing ${jsonPath}`);
  }

  await connectDB();

  const rows = JSON.parse(readFileSync(jsonPath, "utf8")) as MockUserRow[];

  const phoneStart = parseInt(
    process.env.SEED_MOCK_PHONE_START || "9710000000",
    10,
  );
  const plainPassword = process.env.SEED_MOCK_PASSWORD || "MockSeed#2026";

  const lastPhone = phoneStart + rows.length - 1;
  if (!/^[0-9]{10}$/.test(String(phoneStart)) || lastPhone > 9999999999) {
    throw new Error(
      `Invalid SEED_MOCK_PHONE_START or row count pushes past 10-digit phone space`,
    );
  }

  if (process.env.CLEAR_MOCK_CITY_USERS === "1") {
    const del = await User.deleteMany({
      phone: {
        $gte: String(phoneStart),
        $lte: String(lastPhone),
      },
    });
    logger.info(
      `CLEAR_MOCK_CITY_USERS: removed ${del.deletedCount} users in phone range ${phoneStart}–${lastPhone}`,
    );
  }

  let created = 0;
  let skipped = 0;

  for (let i = 0; i < rows.length; i++) {
    const m = rows[i];
    const phone = String(phoneStart + i);

    if (!/^[0-9]{10}$/.test(phone)) {
      logger.error(`Skip invalid phone derivation: ${phone}`);
      skipped++;
      continue;
    }

    const exists = await User.findOne({ phone }).select("_id").lean();
    if (exists) {
      skipped++;
      continue;
    }

    const handle = await uniqueHandle(handleFromMockUserId(m.userId), phone);
    const email = `mock.${phone}@herridez.seed`;
    const tier = mapSubscriptionTier(m.subscription);
    const areaSuffix = m.area ? ` · ${m.area}` : "";
    const bioParts = [
      `${m.name} · ${m.age} · ${m.gender}${areaSuffix}`,
      m.city && m.state ? `${m.city}, ${m.state}` : m.city || m.state || "",
    ];
    const bio = bioParts.filter(Boolean).join(". ").slice(0, 500);

    try {
      await User.create({
        phone,
        email,
        handle,
        name: m.name,
        password: plainPassword,
        country: m.country || "India",
        state: m.state,
        city: m.city,
        bio,
        verified: Boolean(m.verified),
        verificationStatus: m.verified ? "approved" : "unverified",
        ridingLevel: mapRidingLevel(m.ridingLevel),
        ridingStyle: mapRidingStyles(m.ridingStyle),
        yearsOfExperience: Math.max(
          0,
          Math.min(60, Number(m.yearsOfExperience) || 0),
        ),
        ridingHours: Math.round(
          Math.max(0, Number(m.yearsOfExperience) || 0) * 50,
        ),
        currentLocation: {
          lat: m.latitude,
          lng: m.longitude,
          name: m.area ? `${m.area}, ${m.city}` : m.city,
        },
        followerCount: Math.max(0, Math.floor(Number(m.followers) || 0)),
        followingCount: Math.max(0, Math.floor(Number(m.following) || 0)),
        followers: [],
        following: [],
        emergencyContacts: [],
        onboardingCompleted: true,
        onboardingStep: 100,
        subscription: {
          tier,
          startDate: new Date(),
          expiryDate: null,
          ridesUsedThisMonth: 0,
          lastRideResetDate: new Date(),
          autoRenew: false,
        },
        totalDistance: Math.round(Math.max(0, Number(m.xp) || 0) * 0.1),
        totalRides: Math.round(Math.max(0, Number(m.xp) || 0) / 100),
      });
      created++;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      logger.error(`Failed ${m.userId} (${phone}): ${msg}`);
      skipped++;
    }
  }

  logger.info(
    `mockCityUsers: created=${created}, skipped=${skipped}. Default password: ${plainPassword}`,
  );

  await mongoose.disconnect().catch(() => {});
}

const runAsScript = process.argv[1]?.includes("realisticMockUsers.seed");
if (runAsScript) {
  seedRealisticMockUsers()
    .then(() => process.exit(0))
    .catch((e) => {
      logger.error(e);
      process.exit(1);
    });
}

export default seedRealisticMockUsers;
