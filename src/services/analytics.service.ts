import User from "../models/user.model.js";
import Bike from "../models/bike.model.js";
import logger from "../config/logger.js";

/**
 * Analytics Service
 * Provides aggregated metrics for admin dashboard
 */

export interface UserOverviewMetrics {
  totalUsers: number;
  activeUsers: number;
}

export interface VerificationMetrics {
  totalVerified: number;
  pending: number;
  rejected: number;
}

export interface RidingMetrics {
  totalRidingHours: number;
  totalDistance: number;
  totalRides: number;
  totalDuration: number;
  averageRideDistance: number;
  averageRideDuration: number;
}

export interface RidingLevelDistribution {
  Beginner: number;
  Intermediate: number;
  Advanced: number;
  Expert: number;
}

export interface GeographyMetrics {
  byCountry: Array<{ _id: string; count: number }>;
  byState: Array<{ _id: string; count: number }>;
  byCity: Array<{ _id: string; count: number }>;
  topCities: Array<{ _id: string; count: number }>;
}

export interface BikeMetrics {
  totalBikes: number;
}

export interface AccountStatusMetrics {
  activeAccounts: number;
  suspendedAccounts: number;
  creatorAccounts: number;
  onboardingCompleted: number;
  onboardingIncomplete: number;
}

export interface MarketplaceMetrics {
  usersWithListings: number;
  topSellers: Array<{
    userId: string;
    name: string;
    avatarUrl?: string;
    listingCount: number;
  }>;
}

/**
 * Get user overview metrics
 */
export async function getUserOverviewMetrics(): Promise<UserOverviewMetrics> {
  try {
    const totalUsers = await User.countDocuments();

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const activeUsers = await User.countDocuments({
      lastLoginAt: { $gte: thirtyDaysAgo },
    });

    return {
      totalUsers,
      activeUsers,
    };
  } catch (error: any) {
    logger.error(`getUserOverviewMetrics error: ${error.message}`);
    throw new Error("Failed to fetch user overview metrics");
  }
}

/**
 * Get verification status metrics
 */
export async function getVerificationMetrics(): Promise<VerificationMetrics> {
  try {
    const [totalVerified, pending, rejected] = await Promise.all([
      User.countDocuments({
        verified: true,
        verificationStatus: "approved",
      }),
      User.countDocuments({ verificationStatus: "pending" }),
      User.countDocuments({ verificationStatus: "rejected" }),
    ]);

    return {
      totalVerified,
      pending,
      rejected,
    };
  } catch (error: any) {
    logger.error(`getVerificationMetrics error: ${error.message}`);
    throw new Error("Failed to fetch verification metrics");
  }
}

/**
 * Get riding statistics
 */
export async function getRidingMetrics(): Promise<RidingMetrics> {
  try {
    const result = await User.aggregate([
      {
        $group: {
          _id: null,
          totalRidingHours: { $sum: "$ridingHours" },
          totalDistance: { $sum: "$totalDistance" },
          totalRides: { $sum: "$totalRides" },
          totalDuration: { $sum: "$totalDuration" },
        },
      },
    ]);

    const data = result[0] || {
      totalRidingHours: 0,
      totalDistance: 0,
      totalRides: 0,
      totalDuration: 0,
    };

    const averageRideDistance =
      data.totalRides > 0 ? data.totalDistance / data.totalRides : 0;
    const averageRideDuration =
      data.totalRides > 0 ? data.totalDuration / data.totalRides : 0;

    return {
      totalRidingHours: data.totalRidingHours,
      totalDistance: data.totalDistance,
      totalRides: data.totalRides,
      totalDuration: data.totalDuration,
      averageRideDistance: Math.round(averageRideDistance * 100) / 100,
      averageRideDuration: Math.round(averageRideDuration * 100) / 100,
    };
  } catch (error: any) {
    logger.error(`getRidingMetrics error: ${error.message}`);
    throw new Error("Failed to fetch riding metrics");
  }
}

/**
 * Get riding level distribution
 */
export async function getRidingLevelDistribution(): Promise<RidingLevelDistribution> {
  try {
    const result = await User.aggregate([
      {
        $group: {
          _id: "$ridingLevel",
          count: { $sum: 1 },
        },
      },
    ]);

    const distribution: RidingLevelDistribution = {
      Beginner: 0,
      Intermediate: 0,
      Advanced: 0,
      Expert: 0,
    };

    result.forEach((item) => {
      if (item._id in distribution) {
        distribution[item._id as keyof RidingLevelDistribution] = item.count;
      }
    });

    return distribution;
  } catch (error: any) {
    logger.error(`getRidingLevelDistribution error: ${error.message}`);
    throw new Error("Failed to fetch riding level distribution");
  }
}

/**
 * Get geography metrics
 */
export async function getGeographyMetrics(): Promise<GeographyMetrics> {
  try {
    const [byCountry, byState, byCity, topCities] = await Promise.all([
      // Group by country
      User.aggregate([
        {
          $group: {
            _id: "$country",
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
      ]),

      // Group by state (filter out null/undefined)
      User.aggregate([
        { $match: { state: { $exists: true, $nin: [null, ""] } } },
        {
          $group: {
            _id: "$state",
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
      ]),

      // Group by city (filter out null/undefined)
      User.aggregate([
        { $match: { city: { $exists: true, $nin: [null, ""] } } },
        {
          $group: {
            _id: "$city",
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
      ]),

      // Top 10 cities
      User.aggregate([
        { $match: { city: { $exists: true, $nin: [null, ""] } } },
        {
          $group: {
            _id: "$city",
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
    ]);

    return {
      byCountry,
      byState,
      byCity,
      topCities,
    };
  } catch (error: any) {
    logger.error(`getGeographyMetrics error: ${error.message}`);
    throw new Error("Failed to fetch geography metrics");
  }
}

/**
 * Get bike ownership metrics
 */
export async function getBikeMetrics(): Promise<BikeMetrics> {
  try {
    const totalBikes = await Bike.countDocuments();

    return {
      totalBikes,
    };
  } catch (error: any) {
    logger.error(`getBikeMetrics error: ${error.message}`);
    throw new Error("Failed to fetch bike metrics");
  }
}

/**
 * Get account status metrics
 */
export async function getAccountStatusMetrics(): Promise<AccountStatusMetrics> {
  try {
    const [
      activeAccounts,
      suspendedAccounts,
      creatorAccounts,
      onboardingCompleted,
      onboardingIncomplete,
    ] = await Promise.all([
      User.countDocuments({ isSuspended: false }),
      User.countDocuments({ isSuspended: true }),
      User.countDocuments({ isCreator: true }),
      User.countDocuments({ onboardingCompleted: true }),
      User.countDocuments({ onboardingCompleted: false }),
    ]);

    return {
      activeAccounts,
      suspendedAccounts,
      creatorAccounts,
      onboardingCompleted,
      onboardingIncomplete,
    };
  } catch (error: any) {
    logger.error(`getAccountStatusMetrics error: ${error.message}`);
    throw new Error("Failed to fetch account status metrics");
  }
}

/**
 * Get marketplace metrics
 */
export async function getMarketplaceMetrics(): Promise<MarketplaceMetrics> {
  try {
    // Users with listings
    const usersWithListings = await User.countDocuments({
      listings: { $exists: true, $ne: [] },
    });

    // Top 10 sellers
    const topSellersResult = await User.aggregate([
      {
        $match: {
          listings: { $exists: true, $ne: [] },
        },
      },
      {
        $project: {
          name: 1,
          avatarUrl: 1,
          listingCount: { $size: "$listings" },
        },
      },
      { $sort: { listingCount: -1 } },
      { $limit: 10 },
    ]);

    const topSellers = topSellersResult.map((seller) => ({
      userId: seller._id.toString(),
      name: seller.name || "Unknown",
      avatarUrl: seller.avatarUrl,
      listingCount: seller.listingCount,
    }));

    return {
      usersWithListings,
      topSellers,
    };
  } catch (error: any) {
    logger.error(`getMarketplaceMetrics error: ${error.message}`);
    throw new Error("Failed to fetch marketplace metrics");
  }
}
