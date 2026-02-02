import cron from "node-cron";
import User from "../models/user.model.js";
import logger from "../config/logger.js";

/**
 * Monthly reset job - runs daily, resets ride counters on 1st of each month
 * Runs at 00:00 IST (18:30 UTC previous day)
 */
export const startMonthlyResetJob = () => {
  // Run daily at 00:00 IST (18:30 UTC)
  cron.schedule("30 18 * * *", async () => {
    try {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      // Only run on 1st of month
      if (today.getTime() !== firstOfMonth.getTime()) {
        logger.info("[MonthlyReset] Not 1st of month, skipping...");
        return;
      }

      logger.info("[MonthlyReset] Starting monthly ride reset...");

      // Find all free tier users whose last reset was not this month
      const users = await User.find({
        "subscription.tier": "free",
        $or: [
          {
            "subscription.lastRideResetDate": {
              $lt: firstOfMonth,
            },
          },
          {
            "subscription.lastRideResetDate": {
              $exists: false,
            },
          },
        ],
      }).select("subscription");

      let resetCount = 0;

      for (const user of users) {
        user.subscription.ridesUsedThisMonth = 0;
        user.subscription.lastRideResetDate = today;
        await user.save();
        resetCount++;
      }

      logger.info(
        `[MonthlyReset] Reset ${resetCount} free tier users' ride counters`
      );
    } catch (error: any) {
      logger.error(`[MonthlyReset] Error: ${error.message}`);
    }
  });

  logger.info("[MonthlyReset] Monthly reset job scheduled (daily at 00:00 IST)");
};

/**
 * Auto-downgrade job - runs daily, downgrades expired Pro subscriptions
 * Runs at 00:00 IST (18:30 UTC previous day)
 */
export const startAutoDowngradeJob = () => {
  // Run daily at 00:00 IST (18:30 UTC)
  cron.schedule("30 18 * * *", async () => {
    try {
      logger.info("[AutoDowngrade] Starting auto-downgrade check...");

      const now = new Date();

      // Find all Pro users with expired subscriptions
      const expiredUsers = await User.find({
        "subscription.tier": "pro",
        "subscription.expiryDate": {
          $lt: now,
          $ne: null,
        },
      }).select("subscription");

      let downgradeCount = 0;

      for (const user of expiredUsers) {
        // Downgrade to free
        user.subscription.tier = "free";
        user.subscription.ridesUsedThisMonth = 0; // Reset ride counter
        user.subscription.lastRideResetDate = now;
        user.subscription.expiryDate = null;
        user.subscription.autoRenew = false;
        user.subscription.paymentMethod = null;

        await user.save();
        downgradeCount++;

        logger.info(
          `[AutoDowngrade] Downgraded user ${user._id} from Pro to Free`
        );
      }

      logger.info(
        `[AutoDowngrade] Downgraded ${downgradeCount} expired Pro subscriptions`
      );
    } catch (error: any) {
      logger.error(`[AutoDowngrade] Error: ${error.message}`);
    }
  });

  logger.info(
    "[AutoDowngrade] Auto-downgrade job scheduled (daily at 00:00 IST)"
  );
};

/**
 * Initialize all subscription cron jobs
 */
export const startSubscriptionJobs = () => {
  startMonthlyResetJob();
  startAutoDowngradeJob();
  logger.info("[SubscriptionJobs] All subscription cron jobs started");
};

