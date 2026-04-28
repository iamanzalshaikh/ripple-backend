import { faker } from "@faker-js/faker";
import connectDB from "../config/db.js";
import logger from "../config/logger.js";
import User from "../models/user.model.js";

/**
 * Bulk-create rider accounts for QA / Rider Radar / demos.
 * Phones: 9800000001 … (default 30 users). Safe to re-run: skips existing phones.
 *
 * Run:
 *   npx tsx src/seeds/dummyRiders.seed.ts
 *   DUMMY_RIDER_COUNT=40 DUMMY_PHONE_START=9800000001 npx tsx src/seeds/dummyRiders.seed.ts
 */
const count = Math.min(
  500,
  Math.max(1, parseInt(process.env.DUMMY_RIDER_COUNT || "30", 10)),
);
const phoneStart = parseInt(
  process.env.DUMMY_PHONE_START || "9800000001",
  10,
);

const seedDummyRiders = async () => {
  await connectDB();
  logger.info(
    `Seeding ${count} dummy riders from phone ${phoneStart} (DEV ONLY)`,
  );

  let created = 0;
  let skipped = 0;

  for (let i = 0; i < count; i++) {
    const phone = String(phoneStart + i);
    if (!/^[0-9]{10}$/.test(phone)) {
      logger.error(`Invalid phone derived: ${phone}`);
      break;
    }

    const exists = await User.findOne({ phone }).select("_id").lean();
    if (exists) {
      skipped++;
      continue;
    }

    const name = faker.person.fullName();
    const lat = 19.076 + (Math.random() - 0.5) * 0.12;
    const lng = 72.8777 + (Math.random() - 0.5) * 0.12;

    await User.create({
      phone,
      name,
      email: `dummy.${phone}@herridez.local`,
      handle: `dum${phone.slice(2)}`.slice(0, 20),
      bio: faker.lorem.sentence(),
      city: "Mumbai",
      state: "MH",
      country: "India",
      verified: true,
      verificationStatus: "approved",
      ridingLevel: faker.helpers.arrayElement([
        "Beginner",
        "Intermediate",
        "Advanced",
        "Expert",
      ]),
      ridingStyle: faker.helpers.arrayElements(
        ["Track", "Touring", "Street", "Commute", "Racing"],
        { min: 1, max: 3 },
      ),
      yearsOfExperience: faker.number.int({ min: 0, max: 15 }),
      currentLocation: {
        lat,
        lng,
        name: "Mumbai",
      },
      onboardingCompleted: true,
      onboardingStep: 100,
    });

    created++;
  }

  logger.info(
    `✅ Dummy riders done: created=${created}, skipped (already exist)=${skipped}`,
  );
};

const runAsScript = process.argv[1]?.includes("dummyRiders.seed");
if (runAsScript) {
  seedDummyRiders()
    .then(() => process.exit(0))
    .catch((e) => {
      logger.error(e?.message || e);
      process.exit(1);
    });
}

export default seedDummyRiders;
