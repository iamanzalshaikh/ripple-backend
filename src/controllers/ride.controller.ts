import { Request, Response } from "express";

import RideTelemetry from "../models/ridetelemetry.model.js";
import Ride from "../models/ride.model.js";

import User from "../models/user.model.js";
import redisClient from "../config/redis.js"; // ✅ YOUR REDIS SETUP

import logger from "../config/logger.js";
import { simplifyPolyline } from "../utils/ride.js";
import { calculateDistance } from "../utils/ride.js";
import { generateToken } from "../utils/token.js";
import rideQueue from "../queues/ride.queue.js";
import Bike from "../models/bike.model.js";

// ✅ Match your AuthRequest type
interface AuthRequest extends Request {
  userId: string;
}

/**
 * POST /api/v1/rides/start
 * Start a new ride
 */
export const startRide = async (req: AuthRequest, res: Response) => {
  try {
    const { bikeId, liveShare = false } = req.body;
    const userId = req.userId;

    logger.info(`[startRide] User ${userId} starting ride with bike ${bikeId}`);

    // Validation
    if (!bikeId) {
      return res
        .status(400)
        .json({ success: false, error: "bikeId is required" });
    }

    // Verify bike belongs to user
    const bike = await Bike.findOne({ _id: bikeId, userId });
    if (!bike) {
      logger.warn(`[startRide] Bike ${bikeId} not found for user ${userId}`);
      return res.status(404).json({ success: false, error: "Bike not found" });
    }

    // Check for active ride
    const existingRide = await Ride.findOne({ userId, status: "active" });
    if (existingRide) {
      logger.warn(`[startRide] User ${userId} already has active ride`);
      return res.status(400).json({
        success: false,
        error: "You already have an active ride. End it first.",
      });
    }

    // Generate live share token if enabled
    let liveShareToken: string | null = null;
    if (liveShare) {
      liveShareToken = generateToken(32);
    }

    // Create ride
    const ride = new Ride({
      userId,
      bikeId,
      startedAt: new Date(),
      liveShareEnabled: liveShare,
      liveShareToken,
      status: "active",
      privacy: "friends",
      distance: 0,
      duration: 0,
      avgSpeed: 0,
      maxSpeed: 0,
      simplifiedPolyline: [],
    });

    await ride.save();
    logger.info(`[startRide] Ride ${ride._id} created for user ${userId}`);

    // ✅ Initialize Redis key for GPS points (24h TTL)
    if (liveShareToken) {
      await redisClient.setEx(
        `live:${liveShareToken}`,
        86400, // 24 hours
        JSON.stringify({
          rideId: ride._id,
          userId,
          lastLocation: null,
          pointsCount: 0,
          startedAt: new Date(),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        }),
      );
    }

    return res.status(201).json({
      success: true,
      data: {
        rideId: ride._id,
        liveToken: liveShareToken,
        startedAt: ride.startedAt,
      },
    });
  } catch (error: any) {
    logger.error(`[startRide] Error: ${error.message}`);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * PATCH /api/v1/rides/:id/stream
 * Stream GPS chunks during ride
 * ✅ FIX: Only accept if status is 'active' (NOT paused)
 */
export const streamChunk = async (req: AuthRequest, res: Response) => {
  try {
    const { chunk } = req.body;
    const rideId = req.params.id;
    const userId = req.userId;

    // Validation
    if (!Array.isArray(chunk) || chunk.length === 0) {
      return res.status(400).json({ success: false, error: "Invalid chunk" });
    }

    if (chunk.length > 300) {
      return res
        .status(400)
        .json({ success: false, error: "Chunk too large (max 300 points)" });
    }

    // ✅ Rate limit streamChunk (prevent spam)
    const rateKey = `stream:${userId}:${rideId}`;
    const requestCount = await redisClient.incr(rateKey);
    if (requestCount === 1) {
      await redisClient.expire(rateKey, 60);
    }
    if (requestCount > 300) {
      logger.warn(
        `[streamChunk] Rate limit exceeded for user ${userId} ride ${rideId}`,
      );
      return res.status(429).json({
        success: false,
        error: "Too many stream requests. Try again in 60 seconds.",
      });
    }

    // ✅ FIX #1: ONLY accept if status is 'active' (NOT paused or completed)
    const ride = await Ride.findOne({ _id: rideId, userId, status: "active" });
    if (!ride) {
      logger.warn(`[streamChunk] Ride ${rideId} not active for user ${userId}`);
      return res.status(404).json({
        success: false,
        error: "Ride is not active. Resume it first.",
      });
    }

    // ✅ Normalize and validate each point
    const validChunk = chunk.map((point: any) => {
      const lat = parseFloat(point.lat);
      const lng = parseFloat(point.lng);

      // Sanity check coordinates
      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        throw new Error(`Invalid coordinates: ${lat}, ${lng}`);
      }

      return {
        timestamp: point.timestamp || Date.now(),
        lat,
        lng,
        speed: point.speed ? parseFloat(point.speed) : 0,
        accuracy: point.accuracy ? parseFloat(point.accuracy) : 10,
        bearing: point.bearing ? parseFloat(point.bearing) : 0,
        accel: {
          x: point.accel?.x ? parseFloat(point.accel.x) : 0,
          y: point.accel?.y ? parseFloat(point.accel.y) : 0,
          z: point.accel?.z ? parseFloat(point.accel.z) : 0,
        },
      };
    });

    // ✅ Store in Redis (fast append)
    const redisKey = `ride:${rideId}:points`;
    const pointsJson = validChunk.map((p: any) => JSON.stringify(p));

    // Push all points to Redis list
    for (const point of pointsJson) {
      await redisClient.rPush(redisKey, point);
    }

    // Set expiry to 24 hours
    await redisClient.expire(redisKey, 86400);

    // ✅ Backup to MongoDB every 100 points
    const totalPoints = await redisClient.lLen(redisKey);
    if (totalPoints % 100 === 0) {
      await RideTelemetry.create({
        rideId,
        chunkIndex: Math.floor(totalPoints / 100),
        points: validChunk,
        createdAt: new Date(),
      });
      logger.info(
        `[streamChunk] Backed up chunk ${Math.floor(totalPoints / 100)} for ride ${rideId}`,
      );
    }

    // ✅ Update live tracking token
    if (ride.liveShareToken) {
      const lastPoint = validChunk[validChunk.length - 1];
      await redisClient.setEx(
        `live:${ride.liveShareToken}`,
        86400,
        JSON.stringify({
          rideId: ride._id,
          userId,
          lastLocation: {
            lat: lastPoint.lat,
            lng: lastPoint.lng,
            speed: (lastPoint.speed * 3.6).toFixed(1),
          },
          pointsCount: totalPoints,
          updatedAt: new Date(),
        }),
      );
    }

    logger.info(
      `[streamChunk] Received ${validChunk.length} points for ride ${rideId}`,
    );

    return res.status(200).json({
      success: true,
      data: {
        pointsReceived: validChunk.length,
        totalPoints,
        live: ride.liveShareEnabled,
      },
    });
  } catch (error: any) {
    logger.error(`[streamChunk] Error: ${error.message}`);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * PATCH /api/v1/rides/:id/pause
 * Pause current ride
 */
export const pauseRide = async (req: AuthRequest, res: Response) => {
  try {
    const ride = await Ride.findOne({
      _id: req.params.id,
      userId: req.userId,
      status: "active",
    });
    if (!ride) {
      logger.warn(`[pauseRide] Ride ${req.params.id} not found or not active`);
      return res
        .status(404)
        .json({ success: false, error: "Ride not found or not active" });
    }

    ride.status = "paused";
    await ride.save();

    logger.info(`[pauseRide] Ride ${ride._id} paused`);

    return res.json({ success: true, data: { status: "paused" } });
  } catch (error: any) {
    logger.error(`[pauseRide] Error: ${error.message}`);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * PATCH /api/v1/rides/:id/resume
 * Resume paused ride
 */
export const resumeRide = async (req: AuthRequest, res: Response) => {
  try {
    const ride = await Ride.findOne({
      _id: req.params.id,
      userId: req.userId,
      status: "paused",
    });
    if (!ride) {
      logger.warn(`[resumeRide] Ride ${req.params.id} not found or not paused`);
      return res
        .status(404)
        .json({ success: false, error: "Ride not found or not paused" });
    }

    ride.status = "active";
    await ride.save();

    logger.info(`[resumeRide] Ride ${ride._id} resumed`);

    return res.json({ success: true, data: { status: "active" } });
  } catch (error: any) {
    logger.error(`[resumeRide] Error: ${error.message}`);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * PATCH /api/v1/rides/:id/end
 * End ride, calculate stats, trigger background jobs
 */
// export const endRide = async (req: AuthRequest, res: Response) => {
//   try {
//     const rideId = req.params.id;
//     const userId = req.userId;
//     const { privacy = 'friends' } = req.body;

//     logger.info(`[endRide] User ${userId} ending ride ${rideId}`);

//     // Validation
//     if (!['private', 'friends', 'public'].includes(privacy)) {
//       return res.status(400).json({ success: false, error: 'Invalid privacy setting' });
//     }

//     // Get ride
//     const ride = await Ride.findOne({ _id: rideId, userId });
//     if (!ride || !['active', 'paused'].includes(ride.status)) {
//       logger.warn(`[endRide] Ride ${rideId} not found or already ended for user ${userId}`);
//       return res.status(404).json({ success: false, error: 'Ride not found or already ended' });
//     }

//     // ✅ Fetch GPS points from Redis
//     const redisKey = `ride:${rideId}:points`;
//     const pointsData = await redisClient.lRange(redisKey, 0, -1);

//     // Guard: no GPS data
//     if (pointsData.length === 0) {
//       logger.warn(`[endRide] No GPS data for ride ${rideId}`);
//       return res.status(400).json({ success: false, error: 'No GPS data recorded' });
//     }

//     // Parse points
//     const allPoints = pointsData.map((p: string) => JSON.parse(p));
//     logger.info(`[endRide] Processing ${allPoints.length} GPS points for ride ${rideId}`);

//     // ✅ Calculate stats
//     const polyline = allPoints.map((p: any) => ({ lat: p.lat, lng: p.lng }));
//     const distanceKm = calculateDistance(polyline);
//     const distanceMeters = Math.round(distanceKm * 1000);
//     const duration = Math.round((allPoints[allPoints.length - 1].timestamp - allPoints[0].timestamp) / 1000);
//     const speeds = allPoints.map((p: any) => p.speed * 3.6);
//     const maxSpeed = Math.max(...speeds);
//     const avgSpeed = speeds.reduce((a: number, b: number) => a + b, 0) / speeds.length;

//     logger.info(`[endRide] Stats - Distance: ${distanceKm}km, Duration: ${duration}s, Avg Speed: ${avgSpeed}km/h`);

//     // Simplify polyline
//     const simplifiedPolyline = polyline.length > 100
//       ? simplifyPolyline(polyline, 0.0001)
//       : polyline;

//     // ✅ Update Ride with final stats
//     ride.endedAt = new Date();
//     ride.status = 'completed';
//     ride.privacy = privacy;
//     ride.distance = distanceMeters;
//     ride.duration = duration;
//     ride.maxSpeed = parseFloat(maxSpeed.toFixed(2));
//     ride.avgSpeed = parseFloat(avgSpeed.toFixed(2));
//     ride.simplifiedPolyline = simplifiedPolyline;

//     await ride.save();
//     logger.info(`[endRide] Ride ${rideId} saved to database`);

//     // ✅ Cleanup Redis
//     await redisClient.del(redisKey);
//     if (ride.liveShareToken) {
//       await redisClient.del(`live:${ride.liveShareToken}`);
//     }

//     // ✅ Queue background jobs
//     await rideQueue.add('analyze-ride', { rideId: ride._id, userId }, { priority: 1 });
//     await rideQueue.add(
//       'award-badges',
//       {
//         rideId: ride._id,
//         userId,
//         distanceMeters,
//         duration
//       },
//       { priority: 1 }
//     );

//     // Cleanup old telemetry after 7 days
//     await rideQueue.add(
//       'cleanup-telemetry',
//       { rideId: ride._id },
//       { delay: 7 * 24 * 60 * 60 * 1000 }
//     );

//     logger.info(`[endRide] Queued background jobs for ride ${rideId}`);

//     // ✅ Update user stats
//     // await User.updateOne(
//     //   { _id: userId },
//     //   {
//     //     $inc: {
//     //       'stats.totalDistance': distanceMeters,
//     //       'stats.totalRides': 1,
//     //       'stats.totalDuration': duration
//     //     }
//     //   }
//     // );

//     await User.updateOne(
//         { _id: userId },
//         {
//           $inc: {
//             totalDistance: distanceMeters,
//             totalRides: 1,
//             totalDuration: duration
//           }
//         }
//       );

//     logger.info(`[endRide] Updated user ${userId} stats`);

//     return res.json({
//       success: true,
//       data: {
//         rideId: ride._id,
//         distance: (distanceMeters / 1000).toFixed(2),
//         distanceMeters,
//         duration,
//         avgSpeed: avgSpeed.toFixed(2),
//         maxSpeed: maxSpeed.toFixed(2),
//         pointsRecorded: allPoints.length
//       }
//     });
//   } catch (error: any) {
//     logger.error(`[endRide] Error: ${error.message}`);
//     return res.status(500).json({ success: false, error: error.message });
//   }
// };

export const endRide = async (req: AuthRequest, res: Response) => {
  try {
    const rideId = req.params.id;
    const userId = req.userId;
    const { privacy = "friends" } = req.body;

    logger.info(`[endRide] User ${userId} ending ride ${rideId}`);

    // Validation
    if (!["private", "friends", "public"].includes(privacy)) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid privacy setting" });
    }

    // Get ride
    const ride = await Ride.findOne({ _id: rideId, userId });
    if (!ride || !["active", "paused"].includes(ride.status)) {
      logger.warn(
        `[endRide] Ride ${rideId} not found or already ended for user ${userId}`,
      );
      return res
        .status(404)
        .json({ success: false, error: "Ride not found or already ended" });
    }

    // ✅ Fetch GPS points from Redis
    const redisKey = `ride:${rideId}:points`;
    const pointsData = await redisClient.lRange(redisKey, 0, -1);

    // Guard: no GPS data - return special indicator instead of error
    if (pointsData.length === 0) {
      logger.warn(
        `[endRide] No GPS data for ride ${rideId}, returning no-data indicator`,
      );

      // Return success with special flag indicating no GPS data
      // Frontend will show dialog asking user to discard or keep the ride
      return res.status(200).json({
        success: true,
        noGpsData: true,
        data: {
          rideId: ride._id,
          message: "No movement detected",
        },
      });
    }

    // Parse points
    const allPoints = pointsData.map((p: string) => JSON.parse(p));
    logger.info(
      `[endRide] Processing ${allPoints.length} GPS points for ride ${rideId}`,
    );

    // ✅ FILTER GPS DRIFT - Remove stationary/inaccurate points
    const MIN_SPEED_MS = 1.0; // m/s (~3.6 km/h) - filter stationary drift
    const MAX_ACCURACY_M = 30; // meters - filter inaccurate points

    const filteredPoints = allPoints.filter((p: any) => {
      // Remove points with poor accuracy
      if (p.accuracy && p.accuracy > MAX_ACCURACY_M) {
        return false;
      }
      // Remove stationary points (prevent GPS drift from counting as movement)
      if (p.speed < MIN_SPEED_MS) {
        return false;
      }
      return true;
    });

    logger.info(
      `[endRide] Filtered ${allPoints.length} → ${filteredPoints.length} points (removed ${allPoints.length - filteredPoints.length} stationary/inaccurate)`,
    );

    // Guard: insufficient GPS data after filtering
    if (filteredPoints.length < 2) {
      logger.warn(
        `[endRide] Insufficient GPS data after filtering for ride ${rideId}`,
      );

      // Return success with no-data flag (same as above)
      return res.status(200).json({
        success: true,
        noGpsData: true,
        data: {
          rideId: ride._id,
          message: "No movement detected",
        },
      });
    }

    // ✅ Calculate stats USING FILTERED POINTS
    const polyline = filteredPoints.map((p: any) => ({
      lat: p.lat,
      lng: p.lng,
    }));
    const distanceKm = calculateDistance(polyline);
    const distanceMeters = Math.round(distanceKm * 1000);
    const duration = Math.round(
      (filteredPoints[filteredPoints.length - 1].timestamp -
        filteredPoints[0].timestamp) /
        1000,
    );

    // ✅ GEOMETRY-BASED SPEED CALCULATION (Don't trust client speed)
    // Calculate speed from distance between consecutive points
    const MIN_TIME_INTERVAL = 5; // seconds - ignore very short intervals
    const MAX_REALISTIC_SPEED_KMH = 200; // km/h - sanity check for bikes

    let maxSpeed = 0;
    let totalWeightedSpeed = 0;
    let totalTimeForAvg = 0;

    for (let i = 1; i < filteredPoints.length; i++) {
      const timeDelta =
        (filteredPoints[i].timestamp - filteredPoints[i - 1].timestamp) / 1000;

      // Skip very short intervals (unreliable)
      if (timeDelta < MIN_TIME_INTERVAL) {
        continue;
      }

      // Calculate distance between consecutive points
      const segmentDistanceKm = calculateDistance([
        { lat: filteredPoints[i - 1].lat, lng: filteredPoints[i - 1].lng },
        { lat: filteredPoints[i].lat, lng: filteredPoints[i].lng },
      ]);

      // Calculate speed from distance/time
      const speedKmh = segmentDistanceKm / (timeDelta / 3600);

      // Apply sanity check
      if (speedKmh <= MAX_REALISTIC_SPEED_KMH) {
        maxSpeed = Math.max(maxSpeed, speedKmh);
        totalWeightedSpeed += speedKmh * timeDelta;
        totalTimeForAvg += timeDelta;
      } else {
        logger.warn(
          `[endRide] Unrealistic speed detected: ${speedKmh.toFixed(1)} km/h, ignoring`,
        );
      }
    }

    // Calculate average speed from total distance/time (most accurate)
    const avgSpeed = duration > 0 ? distanceKm / (duration / 3600) : 0;

    logger.info(
      `[endRide] Stats - Distance: ${distanceKm}km, Duration: ${duration}s, Avg: ${avgSpeed.toFixed(2)}km/h, Max: ${maxSpeed.toFixed(2)}km/h (geometry-based)`,
    );

    // Simplify polyline
    const simplifiedPolyline =
      polyline.length > 100 ? simplifyPolyline(polyline, 0.0001) : polyline;

    // ✅ Update Ride with final stats
    ride.endedAt = new Date();
    ride.status = "completed";
    ride.privacy = privacy;
    ride.distance = distanceMeters;
    ride.duration = duration;
    ride.maxSpeed = parseFloat(maxSpeed.toFixed(2));
    ride.avgSpeed = parseFloat(avgSpeed.toFixed(2));
    ride.simplifiedPolyline = simplifiedPolyline;

    await ride.save();
    logger.info(`[endRide] Ride ${rideId} saved to database`);

    // ✅ Cleanup Redis
    await redisClient.del(redisKey);
    if (ride.liveShareToken) {
      await redisClient.del(`live:${ride.liveShareToken}`);
    }

    // ✅✅✅ UPDATE USER STATS FIRST (BEFORE QUEUEING JOBS) ✅✅✅
    await User.updateOne(
      { _id: userId },
      {
        $inc: {
          totalDistance: distanceMeters,
          totalRides: 1,
          totalDuration: duration,
        },
      },
    );

    logger.info(`[endRide] Updated user ${userId} stats`);

    // ✅ NOW queue background jobs (worker will read updated stats)
    await rideQueue.add(
      "analyze-ride",
      { rideId: ride._id, userId },
      { priority: 1 },
    );
    await rideQueue.add(
      "award-badges",
      {
        rideId: ride._id,
        userId,
        distanceMeters,
        duration,
      },
      { priority: 1 },
    );

    // Cleanup old telemetry after 7 days
    await rideQueue.add(
      "cleanup-telemetry",
      { rideId: ride._id },
      { delay: 7 * 24 * 60 * 60 * 1000 },
    );

    logger.info(`[endRide] Queued background jobs for ride ${rideId}`);

    return res.json({
      success: true,
      data: {
        rideId: ride._id,
        distance: (distanceMeters / 1000).toFixed(2),
        distanceMeters,
        duration,
        avgSpeed: avgSpeed.toFixed(2),
        maxSpeed: maxSpeed.toFixed(2),
        pointsRecorded: allPoints.length,
      },
    });
  } catch (error: any) {
    logger.error(`[endRide] Error: ${error.message}`);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * GET /api/v1/rides/active
 * Check if user has an active or paused ride
 */
export const getActiveRide = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;

    const activeRide = await Ride.findOne({
      userId,
      status: { $in: ["active", "paused"] },
    })
      .populate("bikeId", "brand model year")
      .lean();

    if (!activeRide) {
      logger.info(`[getActiveRide] No active ride for user ${userId}`);
      return res.json({ success: true, data: null });
    }

    logger.info(
      `[getActiveRide] Found active ride ${activeRide._id} for user ${userId}`,
    );

    return res.json({
      success: true,
      data: {
        rideId: activeRide._id,
        bikeId: activeRide.bikeId,
        status: activeRide.status,
        startedAt: activeRide.startedAt,
        liveShareToken: activeRide.liveShareToken,
        liveShareEnabled: activeRide.liveShareEnabled,
        distance: activeRide.distance,
        duration: activeRide.duration,
        avgSpeed: activeRide.avgSpeed,
        maxSpeed: activeRide.maxSpeed,
      },
    });
  } catch (error: any) {
    logger.error(`[getActiveRide] Error: ${error.message}`);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * GET /api/v1/rides/me
 * Get user's rides with pagination
 */
export const getMyRides = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { page = 1, limit = 10 } = req.query;

    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(50, parseInt(limit as string) || 10);
    const skip = (pageNum - 1) * limitNum;

    const rides = await Ride.find({ userId })
      .populate("bikeId", "brand model year")
      .sort({ startedAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    const total = await Ride.countDocuments({ userId });

    logger.info(
      `[getMyRides] Retrieved ${rides.length} rides for user ${userId}`,
    );

    return res.json({
      success: true,
      data: rides,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error: any) {
    logger.error(`[getMyRides] Error: ${error.message}`);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * DELETE /api/v1/rides/:id/cancel
 * Cancel a ride (used when no GPS data exists)
 */
export const cancelRide = async (req: AuthRequest, res: Response) => {
  try {
    const rideId = req.params.id;
    const userId = req.userId;

    logger.info(`[cancelRide] User ${userId} cancelling ride ${rideId}`);

    // Get ride
    const ride = await Ride.findOne({ _id: rideId, userId });
    if (!ride || !["active", "paused"].includes(ride.status)) {
      logger.warn(
        `[cancelRide] Ride ${rideId} not found or already ended for user ${userId}`,
      );
      return res
        .status(404)
        .json({ success: false, error: "Ride not found or already ended" });
    }

    // Mark as cancelled
    ride.status = "cancelled";
    ride.endedAt = new Date();
    await ride.save();

    logger.info(`[cancelRide] Ride ${rideId} marked as cancelled`);

    // Cleanup Redis
    const redisKey = `ride:${rideId}:points`;
    await redisClient.del(redisKey);
    if (ride.liveShareToken) {
      await redisClient.del(`live:${ride.liveShareToken}`);
    }

    logger.info(`[cancelRide] Cleaned up Redis keys for ride ${rideId}`);

    // Do NOT update user stats - this ride is cancelled
    // Do NOT trigger background jobs

    return res.json({
      success: true,
      data: {
        message: "Ride cancelled",
        rideId: ride._id,
      },
    });
  } catch (error: any) {
    logger.error(`[cancelRide] Error: ${error.message}`);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * GET /api/v1/rides/:id
 * Get single ride details
 */
export const getRideById = async (req: AuthRequest, res: Response) => {
  try {
    const ride = await Ride.findById(req.params.id)
      .populate("bikeId")
      .populate("userId", "name avatar");

    if (!ride) {
      return res.status(404).json({ success: false, error: "Ride not found" });
    }

    // Privacy check
    if (
      ride.privacy === "private" &&
      (ride.userId as any)._id.toString() !== req.userId
    ) {
      logger.warn(
        `[getRideById] Access denied for user ${req.userId} to ride ${ride._id}`,
      );
      return res.status(403).json({ success: false, error: "Access denied" });
    }

    logger.info(`[getRideById] Retrieved ride ${ride._id}`);

    return res.json({ success: true, data: ride });
  } catch (error: any) {
    logger.error(`[getRideById] Error: ${error.message}`);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * GET /api/v1/rides/live/:token
 * Public live ride tracking (NO AUTH)
 */
export const getLiveRide = async (req: Request, res: Response) => {
  try {
    const token = req.params.token;

    // ✅ Get from Redis
    const liveData = await redisClient.get(`live:${token}`);
    if (!liveData) {
      return res
        .status(404)
        .json({ success: false, error: "Live ride not found" });
    }

    const live = JSON.parse(liveData);

    // Verify ride is still active
    const ride = await Ride.findOne({
      _id: live.rideId,
      liveShareToken: token,
      liveShareEnabled: true,
      status: { $in: ["active", "paused"] },
    })
      .populate("userId", "name avatar")
      .populate("bikeId", "brand model");

    if (!ride) {
      return res
        .status(404)
        .json({ success: false, error: "Ride is not live" });
    }

    logger.info(`[getLiveRide] Public view for ride ${ride._id}`);

    return res.json({
      success: true,
      data: {
        rideId: ride._id,
        riderName: (ride.userId as any).name,
        riderAvatar: (ride.userId as any).avatar,
        bike: `${(ride.bikeId as any).brand} ${(ride.bikeId as any).model}`,
        currentLocation: live.lastLocation,
        distance: (ride.distance / 1000).toFixed(2),
        duration: ride.duration,
        avgSpeed: ride.avgSpeed,
        updatedAt: live.updatedAt,
      },
    });
  } catch (error: any) {
    logger.error(`[getLiveRide] Error: ${error.message}`);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * DELETE /api/v1/rides/:id
 * Delete a ride
 */
export const deleteRide = async (req: AuthRequest, res: Response) => {
  try {
    const ride = await Ride.findOne({ _id: req.params.id, userId: req.userId });
    if (!ride) {
      return res.status(404).json({ success: false, error: "Ride not found" });
    }

    await RideTelemetry.deleteMany({ rideId: ride._id });
    await redisClient.del(`ride:${ride._id}:points`);
    if (ride.liveShareToken) {
      await redisClient.del(`live:${ride.liveShareToken}`);
    }
    await Ride.deleteOne({ _id: ride._id });

    logger.info(`[deleteRide] Deleted ride ${ride._id} for user ${req.userId}`);

    return res.json({ success: true, data: { message: "Ride deleted" } });
  } catch (error: any) {
    logger.error(`[deleteRide] Error: ${error.message}`);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// import { Request, Response } from 'express';

// // import RideTelemetry from '../models/ridetelemetry.model.ts';
// // import Ride from '../models/ride.model.ts';

// // import User from "../models/user.model.ts";
// // import redisClient from '../config/redis.ts'; // ✅ YOUR REDIS SETUP

// // import logger from '../config/logger.ts';
// // import { simplifyPolyline , calculateDistance } from '../utils/ride.ts';
// // import { generateToken } from '../utils/token.ts';
// // import rideQueue from '../queues/ride.queue.ts';
// // import Bike from '../models/bike.model.ts';

// import RideTelemetry from '../models/ridetelemetry.model';
// import Ride from '../models/ride.model';

// import User from "../models/user.model";
// import redisClient from '../config/redis.js'; // ✅ YOUR REDIS SETUP

// import logger from '../config/logger.js';
// import { simplifyPolyline , calculateDistance } from '../utils/ride.js';
// import { generateToken } from '../utils/token.js';
// import rideQueue from '../queues/ride.queue';

// import Bike from '../models/bike.model.js';
// // import Bike from '../models/bike.model';

// // ✅ Match your AuthRequest type
// interface AuthRequest extends Request {
//   userId: string;
// }

// /**
//  * POST /api/v1/rides/start
//  * Start a new ride
//  */
// export const startRide = async (req: AuthRequest, res: Response) => {
//   try {
//     const { bikeId, liveShare = false } = req.body;
//     const userId = req.userId;

//     logger.info(`[startRide] User ${userId} starting ride with bike ${bikeId}`);

//     // Validation
//     if (!bikeId) {
//       return res.status(400).json({ success: false, error: 'bikeId is required' });
//     }

//     // Verify bike belongs to user
//     const bike = await Bike.findOne({ _id: bikeId, userId });
//     if (!bike) {
//       logger.warn(`[startRide] Bike ${bikeId} not found for user ${userId}`);
//       return res.status(404).json({ success: false, error: 'Bike not found' });
//     }

//     // Check for active ride
//     const existingRide = await Ride.findOne({ userId, status: 'active' });
//     if (existingRide) {
//       logger.warn(`[startRide] User ${userId} already has active ride`);
//       return res.status(400).json({
//         success: false,
//         error: 'You already have an active ride. End it first.'
//       });
//     }

//     // Generate live share token if enabled
//     let liveShareToken: string | null = null;
//     if (liveShare) {
//       liveShareToken = generateToken(32);
//     }

//     // Create ride
//     const ride = new Ride({
//       userId,
//       bikeId,
//       startedAt: new Date(),
//       liveShareEnabled: liveShare,
//       liveShareToken,
//       status: 'active',
//       privacy: 'friends',
//       distance: 0,
//       duration: 0,
//       avgSpeed: 0,
//       maxSpeed: 0,
//       simplifiedPolyline: []
//     });

//     await ride.save();
//     logger.info(`[startRide] Ride ${ride._id} created for user ${userId}`);

//     // ✅ Initialize Redis key for GPS points (24h TTL)
//     if (liveShareToken) {
//       await redisClient.setEx(
//         `live:${liveShareToken}`,
//         86400, // 24 hours
//         JSON.stringify({
//           rideId: ride._id,
//           userId,
//           lastLocation: null,
//           pointsCount: 0,
//           startedAt: new Date(),
//           expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
//         })
//       );
//     }

//     return res.status(201).json({
//       success: true,
//       data: {
//         rideId: ride._id,
//         liveToken: liveShareToken,
//         startedAt: ride.startedAt
//       }
//     });
//   } catch (error: any) {
//     logger.error(`[startRide] Error: ${error.message}`);
//     return res.status(500).json({ success: false, error: error.message });
//   }
// };

// /**
//  * PATCH /api/v1/rides/:id/stream
//  * Stream GPS chunks during ride
//  * ✅ FIX: Only accept if status is 'active' (NOT paused)
//  */
// export const streamChunk = async (req: AuthRequest, res: Response) => {
//   try {
//     const { chunk } = req.body;
//     const rideId = req.params.id;
//     const userId = req.userId;

//     // Validation
//     if (!Array.isArray(chunk) || chunk.length === 0) {
//       return res.status(400).json({ success: false, error: 'Invalid chunk' });
//     }

//     if (chunk.length > 300) {
//       return res.status(400).json({ success: false, error: 'Chunk too large (max 300 points)' });
//     }

//     // ✅ Rate limit streamChunk (prevent spam)
//     const rateKey = `stream:${userId}:${rideId}`;
//     const requestCount = await redisClient.incr(rateKey);
//     if (requestCount === 1) {
//       await redisClient.expire(rateKey, 60);
//     }
//     if (requestCount > 300) {
//       logger.warn(`[streamChunk] Rate limit exceeded for user ${userId} ride ${rideId}`);
//       return res.status(429).json({
//         success: false,
//         error: 'Too many stream requests. Try again in 60 seconds.'
//       });
//     }

//     // ✅ FIX #1: ONLY accept if status is 'active' (NOT paused or completed)
//     const ride = await Ride.findOne({ _id: rideId, userId, status: 'active' });
//     if (!ride) {
//       logger.warn(`[streamChunk] Ride ${rideId} not active for user ${userId}`);
//       return res.status(404).json({ success: false, error: 'Ride is not active. Resume it first.' });
//     }

//     // ✅ Normalize and validate each point
//     const validChunk = chunk.map((point: any) => {
//       const lat = parseFloat(point.lat);
//       const lng = parseFloat(point.lng);

//       // Sanity check coordinates
//       if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
//         throw new Error(`Invalid coordinates: ${lat}, ${lng}`);
//       }

//       return {
//         timestamp: point.timestamp || Date.now(),
//         lat,
//         lng,
//         speed: point.speed ? parseFloat(point.speed) : 0,
//         accuracy: point.accuracy ? parseFloat(point.accuracy) : 10,
//         bearing: point.bearing ? parseFloat(point.bearing) : 0,
//         accel: {
//           x: point.accel?.x ? parseFloat(point.accel.x) : 0,
//           y: point.accel?.y ? parseFloat(point.accel.y) : 0,
//           z: point.accel?.z ? parseFloat(point.accel.z) : 0
//         }
//       };
//     });

//     // ✅ Store in Redis (fast append)
//     const redisKey = `ride:${rideId}:points`;
//     const pointsJson = validChunk.map((p: any) => JSON.stringify(p));

//     // Push all points to Redis list
//     for (const point of pointsJson) {
//       await redisClient.rPush(redisKey, point);
//     }

//     // Set expiry to 24 hours
//     await redisClient.expire(redisKey, 86400);

//     // ✅ Backup to MongoDB every 100 points
//     const totalPoints = await redisClient.lLen(redisKey);
//     if (totalPoints % 100 === 0) {
//       await RideTelemetry.create({
//         rideId,
//         chunkIndex: Math.floor(totalPoints / 100),
//         points: validChunk,
//         createdAt: new Date()
//       });
//       logger.info(`[streamChunk] Backed up chunk ${Math.floor(totalPoints / 100)} for ride ${rideId}`);
//     }

//     // ✅ Update live tracking token
//     if (ride.liveShareToken) {
//       const lastPoint = validChunk[validChunk.length - 1];
//       await redisClient.setEx(
//         `live:${ride.liveShareToken}`,
//         86400,
//         JSON.stringify({
//           rideId: ride._id,
//           userId,
//           lastLocation: {
//             lat: lastPoint.lat,
//             lng: lastPoint.lng,
//             speed: (lastPoint.speed * 3.6).toFixed(1)
//           },
//           pointsCount: totalPoints,
//           updatedAt: new Date()
//         })
//       );
//     }

//     logger.info(`[streamChunk] Received ${validChunk.length} points for ride ${rideId}`);

//     return res.status(200).json({
//       success: true,
//       data: {
//         pointsReceived: validChunk.length,
//         totalPoints,
//         live: ride.liveShareEnabled
//       }
//     });
//   } catch (error: any) {
//     logger.error(`[streamChunk] Error: ${error.message}`);
//     return res.status(500).json({ success: false, error: error.message });
//   }
// };

// /**
//  * PATCH /api/v1/rides/:id/pause
//  * Pause current ride
//  */
// export const pauseRide = async (req: AuthRequest, res: Response) => {
//   try {
//     const ride = await Ride.findOne({ _id: req.params.id, userId: req.userId, status: 'active' });
//     if (!ride) {
//       logger.warn(`[pauseRide] Ride ${req.params.id} not found or not active`);
//       return res.status(404).json({ success: false, error: 'Ride not found or not active' });
//     }

//     ride.status = 'paused';
//     await ride.save();

//     logger.info(`[pauseRide] Ride ${ride._id} paused`);

//     return res.json({ success: true, data: { status: 'paused' } });
//   } catch (error: any) {
//     logger.error(`[pauseRide] Error: ${error.message}`);
//     return res.status(500).json({ success: false, error: error.message });
//   }
// };

// /**
//  * PATCH /api/v1/rides/:id/resume
//  * Resume paused ride
//  */
// export const resumeRide = async (req: AuthRequest, res: Response) => {
//   try {
//     const ride = await Ride.findOne({ _id: req.params.id, userId: req.userId, status: 'paused' });
//     if (!ride) {
//       logger.warn(`[resumeRide] Ride ${req.params.id} not found or not paused`);
//       return res.status(404).json({ success: false, error: 'Ride not found or not paused' });
//     }

//     ride.status = 'active';
//     await ride.save();

//     logger.info(`[resumeRide] Ride ${ride._id} resumed`);

//     return res.json({ success: true, data: { status: 'active' } });
//   } catch (error: any) {
//     logger.error(`[resumeRide] Error: ${error.message}`);
//     return res.status(500).json({ success: false, error: error.message });
//   }
// };

// /**
//  * PATCH /api/v1/rides/:id/end
//  * End ride, calculate stats, trigger background jobs
//  */
// export const endRide = async (req: AuthRequest, res: Response) => {
//     try {
//       const rideId = req.params.id;
//       const userId = req.userId;
//       const { privacy = 'friends' } = req.body;

//       logger.info(`[endRide] User ${userId} ending ride ${rideId}`);

//       // Validation
//       if (!['private', 'friends', 'public'].includes(privacy)) {
//         return res.status(400).json({ success: false, error: 'Invalid privacy setting' });
//       }

//       // Get ride
//       const ride = await Ride.findOne({ _id: rideId, userId });
//       if (!ride || !['active', 'paused'].includes(ride.status)) {
//         logger.warn(`[endRide] Ride ${rideId} not found or already ended for user ${userId}`);
//         return res.status(404).json({ success: false, error: 'Ride not found or already ended' });
//       }

//       // ✅ Fetch GPS points from Redis
//       const redisKey = `ride:${rideId}:points`;
//       const pointsData = await redisClient.lRange(redisKey, 0, -1);

//       // Guard: no GPS data
//       if (pointsData.length === 0) {
//         logger.warn(`[endRide] No GPS data for ride ${rideId}`);
//         return res.status(400).json({ success: false, error: 'No GPS data recorded' });
//       }

//       // Parse points
//       const allPoints = pointsData.map((p: string) => JSON.parse(p));
//       logger.info(`[endRide] Processing ${allPoints.length} GPS points for ride ${rideId}`);

//       // ✅ Calculate stats
//       const polyline = allPoints.map((p: any) => ({ lat: p.lat, lng: p.lng }));
//       const distanceKm = calculateDistance(polyline);
//       const distanceMeters = Math.round(distanceKm * 1000);
//       const duration = Math.round((allPoints[allPoints.length - 1].timestamp - allPoints[0].timestamp) / 1000);
//       const speeds = allPoints.map((p: any) => p.speed * 3.6);
//       const maxSpeed = Math.max(...speeds);
//       const avgSpeed = speeds.reduce((a: number, b: number) => a + b, 0) / speeds.length;

//       logger.info(`[endRide] Stats - Distance: ${distanceKm}km, Duration: ${duration}s, Avg Speed: ${avgSpeed}km/h`);

//       // Simplify polyline
//       const simplifiedPolyline = polyline.length > 100
//         ? simplifyPolyline(polyline, 0.0001)
//         : polyline;

//       // ✅ Update Ride with final stats
//       ride.endedAt = new Date();
//       ride.status = 'completed';
//       ride.privacy = privacy;
//       ride.distance = distanceMeters;
//       ride.duration = duration;
//       ride.maxSpeed = parseFloat(maxSpeed.toFixed(2));
//       ride.avgSpeed = parseFloat(avgSpeed.toFixed(2));
//       ride.simplifiedPolyline = simplifiedPolyline;

//       await ride.save();
//       logger.info(`[endRide] Ride ${rideId} saved to database`);

//       // ✅ Cleanup Redis
//       await redisClient.del(redisKey);
//       if (ride.liveShareToken) {
//         await redisClient.del(`live:${ride.liveShareToken}`);
//       }

//       // ✅✅✅ UPDATE USER STATS FIRST (BEFORE QUEUEING JOBS) ✅✅✅
//       await User.updateOne(
//         { _id: userId },
//         {
//           $inc: {
//             totalDistance: distanceMeters,
//             totalRides: 1,
//             totalDuration: duration
//           }
//         }
//       );

//       logger.info(`[endRide] Updated user ${userId} stats`);

//       // ✅ NOW queue background jobs (worker will read updated stats)
//       await rideQueue.add('analyze-ride', { rideId: ride._id, userId }, { priority: 1 });
//       await rideQueue.add(
//         'award-badges',
//         {
//           rideId: ride._id,
//           userId,
//           distanceMeters,
//           duration
//         },
//         { priority: 1 }
//       );

//       // Cleanup old telemetry after 7 days
//       await rideQueue.add(
//         'cleanup-telemetry',
//         { rideId: ride._id },
//         { delay: 7 * 24 * 60 * 60 * 1000 }
//       );

//       logger.info(`[endRide] Queued background jobs for ride ${rideId}`);

//       return res.json({
//         success: true,
//         data: {
//           rideId: ride._id,
//           distance: (distanceMeters / 1000).toFixed(2),
//           distanceMeters,
//           duration,
//           avgSpeed: avgSpeed.toFixed(2),
//           maxSpeed: maxSpeed.toFixed(2),
//           pointsRecorded: allPoints.length
//         }
//       });
//     } catch (error: any) {
//       logger.error(`[endRide] Error: ${error.message}`);
//       return res.status(500).json({ success: false, error: error.message });
//     }
//   };

// /**
//  * GET /api/v1/rides/me
//  * Get user's rides with pagination
//  */
// export const getMyRides = async (req: AuthRequest, res: Response) => {
//   try {
//     const userId = req.userId;
//     const { page = 1, limit = 10 } = req.query;

//     const pageNum = Math.max(1, parseInt(page as string) || 1);
//     const limitNum = Math.min(50, parseInt(limit as string) || 10);
//     const skip = (pageNum - 1) * limitNum;

//     const rides = await Ride.find({ userId })
//       .populate('bikeId', 'brand model year')
//       .sort({ startedAt: -1 })
//       .skip(skip)
//       .limit(limitNum)
//       .lean();

//     const total = await Ride.countDocuments({ userId });

//     logger.info(`[getMyRides] Retrieved ${rides.length} rides for user ${userId}`);

//     return res.json({
//       success: true,
//       data: rides,
//       pagination: {
//         page: pageNum,
//         limit: limitNum,
//         total,
//         pages: Math.ceil(total / limitNum)
//       }
//     });
//   } catch (error: any) {
//     logger.error(`[getMyRides] Error: ${error.message}`);
//     return res.status(500).json({ success: false, error: error.message });
//   }
// };

// /**
//  * GET /api/v1/rides/:id
//  * Get single ride details
//  */
// export const getRideById = async (req: AuthRequest, res: Response) => {
//   try {
//     const ride = await Ride.findById(req.params.id)
//       .populate('bikeId')
//       .populate('userId', 'name avatar');

//     if (!ride) {
//       return res.status(404).json({ success: false, error: 'Ride not found' });
//     }

//     // Privacy check
//     if (ride.privacy === 'private' && (ride.userId as any)._id.toString() !== req.userId) {
//       logger.warn(`[getRideById] Access denied for user ${req.userId} to ride ${ride._id}`);
//       return res.status(403).json({ success: false, error: 'Access denied' });
//     }

//     logger.info(`[getRideById] Retrieved ride ${ride._id}`);

//     return res.json({ success: true, data: ride });
//   } catch (error: any) {
//     logger.error(`[getRideById] Error: ${error.message}`);
//     return res.status(500).json({ success: false, error: error.message });
//   }
// };

// /**
//  * GET /api/v1/rides/live/:token
//  * Public live ride tracking (NO AUTH)
//  */
// export const getLiveRide = async (req: Request, res: Response) => {
//   try {
//     const token = req.params.token;

//     // ✅ Get from Redis
//     const liveData = await redisClient.get(`live:${token}`);
//     if (!liveData) {
//       return res.status(404).json({ success: false, error: 'Live ride not found' });
//     }

//     const live = JSON.parse(liveData);

//     // Verify ride is still active
//     const ride = await Ride.findOne({
//       _id: live.rideId,
//       liveShareToken: token,
//       liveShareEnabled: true,
//       status: { $in: ['active', 'paused'] }
//     })
//       .populate('userId', 'name avatar')
//       .populate('bikeId', 'brand model');

//     if (!ride) {
//       return res.status(404).json({ success: false, error: 'Ride is not live' });
//     }

//     logger.info(`[getLiveRide] Public view for ride ${ride._id}`);

//     return res.json({
//       success: true,
//       data: {
//         rideId: ride._id,
//         riderName: (ride.userId as any).name,
//         riderAvatar: (ride.userId as any).avatar,
//         bike: `${(ride.bikeId as any).brand} ${(ride.bikeId as any).model}`,
//         currentLocation: live.lastLocation,
//         distance: (ride.distance / 1000).toFixed(2),
//         duration: ride.duration,
//         avgSpeed: ride.avgSpeed,
//         updatedAt: live.updatedAt
//       }
//     });
//   } catch (error: any) {
//     logger.error(`[getLiveRide] Error: ${error.message}`);
//     return res.status(500).json({ success: false, error: error.message });
//   }
// };

// /**
//  * DELETE /api/v1/rides/:id
//  * Delete a ride
//  */
// export const deleteRide = async (req: AuthRequest, res: Response) => {
//   try {
//     const ride = await Ride.findOne({ _id: req.params.id, userId: req.userId });
//     if (!ride) {
//       return res.status(404).json({ success: false, error: 'Ride not found' });
//     }

//     await RideTelemetry.deleteMany({ rideId: ride._id });
//     await redisClient.del(`ride:${ride._id}:points`);
//     if (ride.liveShareToken) {
//       await redisClient.del(`live:${ride.liveShareToken}`);
//     }
//     await Ride.deleteOne({ _id: ride._id });

//     logger.info(`[deleteRide] Deleted ride ${ride._id} for user ${req.userId}`);

//     return res.json({ success: true, data: { message: 'Ride deleted' } });
//   } catch (error: any) {
//     logger.error(`[deleteRide] Error: ${error.message}`);
//     return res.status(500).json({ success: false, error: error.message });
//   }
// };
