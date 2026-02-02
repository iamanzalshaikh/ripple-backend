import mongoose from "mongoose";
import SubscriptionPlan from "../models/subscriptionPlan.model.js";
import logger from "../config/logger.js";
import connectDB from "../config/db.js";

const plans = [
  {
    name: "Free Plan",
    tier: "free",
    duration: 1,
    basePrice: 0,
    finalPrice: 0,
    discount: 0,
    features: {
      ridesPerMonth: 3,
      eventsAccess: "free_only",
      marketplaceAccess: false,
    },
    active: true,
  },
  {
    name: "Pro Monthly",
    tier: "pro",
    duration: 1,
    basePrice: 500,
    finalPrice: 500,
    discount: 0,
    features: {
      ridesPerMonth: -1, // unlimited
      eventsAccess: "all",
      marketplaceAccess: true,
    },
    active: true,
  },
  {
    name: "Pro 6-Month (1 Month Free)",
    tier: "pro",
    duration: 6,
    basePrice: 3000, // 6 × 500
    finalPrice: 2500, // 5 × 500
    discount: 1,
    features: {
      ridesPerMonth: -1, // unlimited
      eventsAccess: "all",
      marketplaceAccess: true,
    },
    active: true,
  },
  {
    name: "Pro Annual (2 Months Free)",
    tier: "pro",
    duration: 12,
    basePrice: 6000, // 12 × 500
    finalPrice: 5000, // 10 × 500
    discount: 2,
    features: {
      ridesPerMonth: -1, // unlimited
      eventsAccess: "all",
      marketplaceAccess: true,
    },
    active: true,
  },
];

/**
 * Seed subscription plans
 * Run: npm run seed:plans or node dist/seeds/subscriptionPlans.seed.js
 */
const seedSubscriptionPlans = async () => {
  try {
    // Connect to database
    await connectDB();
    logger.info("✅ Connected to database");

    // Clear existing plans and insert fresh ones
    await SubscriptionPlan.deleteMany({});
    logger.info("✅ Cleared existing plans");

    // Insert plans
    for (const plan of plans) {
      const newPlan = new SubscriptionPlan(plan);
      await newPlan.save();
      logger.info(`✅ Created plan: ${plan.name}`);
    }

    logger.info("✅ Subscription plans seeded successfully");
  } catch (error: any) {
    logger.error(`❌ Error seeding subscription plans: ${error.message}`);
    throw error;
  }
};

// Run if called directly via npm script
// Check if this file is being executed directly (not imported)
const runAsScript = process.argv[1]?.includes('subscriptionPlans.seed');
if (runAsScript) {
  seedSubscriptionPlans()
    .then(() => {
      logger.info("✅ Seed script completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      logger.error("❌ Seed script failed:", error);
      process.exit(1);
    });
}

export default seedSubscriptionPlans;

