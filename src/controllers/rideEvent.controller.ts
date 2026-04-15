import { Request, Response } from "express";
import RideEvent from "../models/rideEvent.model.js";
import Payment from "../models/payment.model.js";
import RideEventParticipant from "../models/rideEventParticipant.model.js";
import ChatMessage from "../models/chatMessage.model.js";
import User from "../models/user.model.js";
import Notification from "../models/notification.model.js";
import redisClient from "../config/redis.js";
import logger from "../config/logger.js";
import rideEventQueue from "../queues/rideEvent.queue.js";
import { sendNotificationToUser } from "../config/socket.js";
import {
  calculateDistance,
  simplifyPolyline,
  calculateStats,
  estimateElevationGain,
  calculateAvgSpeed,
  calculateCalories,
  calculateEstimatedDuration,
  formatDistance,
  formatDuration,
  formatSpeed,
  calculateRideDifficulty,
  getDifficultyLabel,
} from "../utils/ride.js";
import { uploadOnS3 } from "../config/s3.js";

// import rideEventQueue from '../queues/rideEvent.queue';
// import rideEventQueue from '../queues/rideEvent.queue';

interface AuthRequest extends Request {
  userId: string;
}

export const createRideEvent = (req: AuthRequest, res: Response): void => {
  (async () => {
    try {
      const {
        title,
        description,
        route,
        scheduledAt,
        rules,
        minRidingHours,
        bikeTypes,
        maxParticipants,
        timezone,
        eventType = "ride",
        // We now always treat events as private; do not trust incoming privacy.
        price,
      } = req.body;
      const organizerId = req.userId;

      logger.info(`[createRideEvent] User ${organizerId} creating: ${title}`);

      // Parse route if it's a string (from FormData)
      let parsedRoute = route;
      if (typeof route === "string") {
        try {
          parsedRoute = JSON.parse(route);
        } catch (error) {
          return res.status(400).json({
            success: false,
            error: "Invalid route format",
          });
        }
      }

      // Validation
      if (!title || !parsedRoute || !scheduledAt) {
        return res.status(400).json({
          success: false,
          error: "Title, route, and scheduledAt required",
        });
      }

      if (!parsedRoute.polyline || parsedRoute.polyline.length < 2) {
        return res.status(400).json({
          success: false,
          error: "Route must have at least 2 points",
        });
      }

      // Check organizer eligibility
      const organizer = await User.findById(organizerId);
      if (!organizer) {
        return res
          .status(404)
          .json({ success: false, error: "User not found" });
      }

      if (!organizer.verified) {
        return res
          .status(403)
          .json({ success: false, error: "Must be verified to organize" });
      }

      if (organizer.ridingHours < 0) {
        return res.status(403).json({
          success: false,
          error: "Need 0+ riding hours to organize",
        });
      }

      // ==================== HANDLE BANNER IMAGE UPLOAD ====================
      let bannerUrl: string | null = null;
      if ((req as any).file) {
        try {
          const fileBuffer = (req as any).file.buffer;
          const uploadedUrl = await uploadOnS3(
            fileBuffer,
            "heridez/events",
            (req as any).file.mimetype,
          );
          if (uploadedUrl) {
            bannerUrl = uploadedUrl;
            logger.info(`[createRideEvent] Banner uploaded: ${bannerUrl}`);
          }
        } catch (uploadError: any) {
          logger.error(
            `[createRideEvent] Banner upload failed: ${uploadError.message}`,
          );
          // Continue without banner - it's optional
        }
      }

      // ==================== CALCULATE DISTANCE & STATS USING YOUR UTILS ====================
      const totalDistance = calculateDistance(parsedRoute.polyline);
      const elevation = estimateElevationGain(parsedRoute.polyline);
      const estimatedDuration = calculateEstimatedDuration(totalDistance, 25);
      const difficulty = calculateRideDifficulty(totalDistance, elevation, 25);

      // Simplify polyline for storage (reduces data by ~80%)
      const simplifiedPolyline = simplifyPolyline(parsedRoute.polyline, 0.0001);

      // Create ride event
      const rideEvent = new RideEvent({
        title,
        description,
        organizerId,
        banner: bannerUrl,
        route: {
          startPoint: parsedRoute.startPoint,
          endPoint: parsedRoute.endPoint,
          waypoints: parsedRoute.waypoints || [],
          polyline: simplifiedPolyline,
          distance: totalDistance,
          estimatedDuration,
          elevation,
          difficulty,
        },
        scheduledAt: new Date(scheduledAt),
        rules: rules || ["Helmet mandatory"],
        minRidingHours: minRidingHours || 0,
        bikeTypes: bikeTypes || [],
        maxParticipants: maxParticipants || 50,
        timezone: timezone || "Asia/Kolkata",
        eventType,
        privacy: "private",
        price: price || 0,
        // Events require admin approval before appearing in public listings
        // approved defaults to false (set in model schema)
        status: "SCHEDULED",
        safetyLevel: "high",
        chatRoomId: `event-${Date.now()}`,
        participants: [
          {
            userId: organizerId as any,
            status: "JOINED",
            joinedAt: new Date(),
          },
        ],
      });

      await rideEvent.save();

      logger.info(
        `[createRideEvent] Ride ${rideEvent._id} created and SCHEDULED - Distance: ${totalDistance.toFixed(2)}km, Elevation: ${elevation}m`,
      );

      return res.status(201).json({
        success: true,
        data: {
          rideEventId: rideEvent._id,
          title: rideEvent.title,
          distance: formatDistance(totalDistance),
          duration: formatDuration(estimatedDuration * 60), // convert to seconds
          elevation: `${elevation}m`,
          difficulty: getDifficultyLabel(difficulty),
          eventType,
          privacy: rideEvent.privacy,
          status: rideEvent.status, // ✅ Will show "scheduled"
        },
      });
    } catch (error: any) {
      logger.error(`[createRideEvent] Error: ${error.message}`);
      return res.status(500).json({ success: false, error: error.message });
    }
  })();
};

/**
 * GET /api/v1/ride-events
 * List nearby group rides
 */
export const listRideEvents = (req: AuthRequest, res: Response): void => {
  (async () => {
    try {
      // const { lat, lng, radius = 50, difficulty, status = 'scheduled', page = 1, limit = 10 } = req.query;
      const {
        lat,
        lng,
        radius = 50,
        difficulty,
        status = "SCHEDULED",
        page = 1,
        limit = 10,
      } = req.query;

      // Only show admin-approved events in public listings
      let query: any = { status, approved: true };

      if (lat && lng) {
        const latNum = parseFloat(lat as string);
        const lngNum = parseFloat(lng as string);
        const radiusKm = parseInt(radius as string) || 50;
        // Convert km to radians for $centerSphere (Earth radius = 6378.1 km)
        const radiusRadians = radiusKm / 6378.1;

        query["route.startPoint"] = {
          $geoWithin: {
            $centerSphere: [[lngNum, latNum], radiusRadians],
          },
        };
      }

      if (difficulty) {
        query["route.difficulty"] = difficulty;
      }

      const pageNum = Math.max(1, parseInt(page as string) || 1);
      const limitNum = Math.min(50, parseInt(limit as string) || 10);
      const skip = (pageNum - 1) * limitNum;

      // All authenticated users can see approved events regardless of tier
      // (Subscription tier only affects ability to JOIN/BOOK paid events, not visibility)
      // No additional $or filter needed since all events default to price=0

      const rides = await RideEvent.find(query)
        .populate("organizerId", "name avatarUrl verified ridingHours")
        .sort({ scheduledAt: 1 })
        .skip(skip)
        .limit(limitNum)
        .lean();

      const total = await RideEvent.countDocuments(query);

      const enriched = rides.map((ride: any) => ({
        ...ride,
        participantCount: ride.participants.length,
        spotsAvailable: ride.maxParticipants - ride.participants.length,
      }));

      logger.info(`[listRideEvents] Retrieved ${rides.length} rides`);

      return res.json({
        success: true,
        data: enriched,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
      });
    } catch (error: any) {
      logger.error(`[listRideEvents] Error: ${error.message}`);
      return res.status(500).json({ success: false, error: error.message });
    }
  })();
};

/**
 * GET /api/v1/ride-events/search
 * Search and filter ride events
 * Supports: text search (title/location), difficulty, privacy, price range, date range, status
 */
export const searchRideEvents = (req: AuthRequest, res: Response): void => {
  (async () => {
    try {
      const {
        q, // Text search query (title, location, description)
        difficulty, // Route difficulty filter
        privacy, // public or private
        priceMin, // Minimum price
        priceMax, // Maximum price
        dateFrom, // Minimum scheduled date
        dateTo, // Maximum scheduled date
        status = "SCHEDULED", // Event status
        location, // Location filter
        category, // Event category
        page = 1,
        limit = 20,
        sortBy = "scheduledAt", // Sort field
        sortOrder = "asc", // Sort order (asc/desc)
      } = req.query;

      logger.info(`[searchRideEvents] Search query: ${q || "all"}`);

      // Build query - only show admin-approved events in search
      const query: any = { approved: true };

      // Status filter (default to SCHEDULED)
      if (status) {
        query.status = status;
      }

      // Text search on title, description, and location
      if (q) {
        query.$or = [
          { title: { $regex: q, $options: "i" } },
          { description: { $regex: q, $options: "i" } },
          { location: { $regex: q, $options: "i" } },
        ];
      }

      // Location filter
      if (location && !q) {
        query.location = { $regex: location, $options: "i" };
      }

      // Difficulty filter
      if (difficulty) {
        query["route.difficulty"] = difficulty;
      }

      // Privacy filter (public/private)
      if (privacy) {
        query.privacy = privacy;
      }

      // Price range filter
      if (priceMin !== undefined || priceMax !== undefined) {
        query.price = {};
        if (priceMin !== undefined) {
          query.price.$gte = parseFloat(priceMin as string);
        }
        if (priceMax !== undefined) {
          query.price.$lte = parseFloat(priceMax as string);
        }
      }

      // Date range filter
      if (dateFrom || dateTo) {
        query.scheduledAt = {};
        if (dateFrom) {
          query.scheduledAt.$gte = new Date(dateFrom as string);
        }
        if (dateTo) {
          query.scheduledAt.$lte = new Date(dateTo as string);
        }
      }

      // Category filter
      if (category) {
        query.category = category;
      }

      // Pagination
      const pageNum = Math.max(1, parseInt(page as string) || 1);
      const limitNum = Math.min(50, parseInt(limit as string) || 20);
      const skip = (pageNum - 1) * limitNum;

      // Sort configuration
      const sortField = sortBy as string;
      const sortDirection = sortOrder === "desc" ? -1 : 1;
      const sort: any = { [sortField]: sortDirection };

      // Execute query
      const rides = await RideEvent.find(query)
        .populate("organizerId", "name avatarUrl verified ridingHours")
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean();

      const total = await RideEvent.countDocuments(query);

      // Enrich with participant counts
      const enriched = rides.map((ride: any) => ({
        ...ride,
        participantCount: ride.participants.length,
        spotsAvailable: ride.maxParticipants - ride.participants.length,
      }));

      logger.info(
        `[searchRideEvents] Found ${rides.length} rides matching criteria`,
      );

      return res.json({
        success: true,
        data: enriched,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
        filters: {
          q,
          difficulty,
          privacy,
          priceMin,
          priceMax,
          dateFrom,
          dateTo,
          status,
          location,
          category,
        },
      });
    } catch (error: any) {
      logger.error(`[searchRideEvents] Error: ${error.message}`);
      return res.status(500).json({ success: false, error: error.message });
    }
  })();
};

/**
 * GET /api/v1/ride-events/me
 * Get ride events where the logged-in user is a participant
 */
export const getMyRideEvents = (req: AuthRequest, res: Response): void => {
  (async () => {
    try {
      const userId = req.userId;
      const { status, page = 1, limit = 20 } = req.query;

      logger.info(`[getMyRideEvents] Fetching events for user ${userId}`);

      // Build query - find events where user is in participants array
      const query: any = {
        "participants.userId": userId,
      };

      // Optional status filter
      if (status) {
        query.status = status;
      }

      const pageNum = Math.max(1, parseInt(page as string) || 1);
      const limitNum = Math.min(50, parseInt(limit as string) || 20);
      const skip = (pageNum - 1) * limitNum;

      const rides = await RideEvent.find(query)
        .populate("organizerId", "name avatarUrl verified ridingHours")
        .sort({ scheduledAt: -1 }) // Most recent first
        .skip(skip)
        .limit(limitNum)
        .lean();

      const total = await RideEvent.countDocuments(query);

      const enriched = rides.map((ride: any) => {
        // Find user's participant record
        const userParticipant = ride.participants.find(
          (p: any) => p.userId?.toString() === userId,
        );

        // Check if user is the organizer
        const isOrganizer =
          ride.organizerId?._id?.toString() === userId ||
          ride.organizerId?.toString() === userId;

        return {
          ...ride,
          participantCount: ride.participants.length,
          spotsAvailable: ride.maxParticipants - ride.participants.length,
          myStatus: userParticipant?.status || "JOINED",
          joinedAt: userParticipant?.joinedAt,
          isOrganizer,
        };
      });

      logger.info(
        `[getMyRideEvents] Retrieved ${rides.length} events for user ${userId}`,
      );

      return res.json({
        success: true,
        data: enriched,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
      });
    } catch (error: any) {
      logger.error(`[getMyRideEvents] Error: ${error.message}`);
      return res.status(500).json({ success: false, error: error.message });
    }
  })();
};

/**
 * GET /api/v1/ride-events/:id
 * Get ride detail
 */
export const getRideEventDetail = (req: AuthRequest, res: Response): void => {
  (async () => {
    try {
      const { id } = req.params;
      const userId = req.userId;

      const ride = await RideEvent.findById(id)
        .populate("organizerId", "name avatarUrl verified ridingHours")
        .populate("participants.userId", "name avatarUrl")
        .lean();

      if (!ride) {
        return res
          .status(404)
          .json({ success: false, error: "Ride not found" });
      }

      const organizerId =
        (ride.organizerId as any)?._id?.toString() ??
        (ride.organizerId as any)?.toString();
      const isOrganizer = !!userId && organizerId === userId;
      const userParticipant =
        userId &&
        ride.participants.find(
          (p: any) =>
            p.userId?.toString() === userId ||
            p.userId?._id?.toString() === userId,
        );
      const isParticipant = !!userParticipant;

      // If event is not yet approved, only organizer can see details
      if (!ride.approved && !isOrganizer) {
        return res.status(403).json({
          success: false,
          error: "Event is pending admin approval",
        });
      }

      return res.json({
        success: true,
        data: {
          ...ride,
          participantCount: ride.participants.length,
          spotsAvailable: ride.maxParticipants - ride.participants.length,
          isOrganizer,
          isParticipant,
          myParticipantStatus: (userParticipant as any)?.status || null,
          canJoin:
            ride.status === "SCHEDULED" &&
            ride.participants.length < ride.maxParticipants &&
            !isParticipant,
        },
      });
    } catch (error: any) {
      logger.error(`[getRideEventDetail] Error: ${error.message}`);
      return res.status(500).json({ success: false, error: error.message });
    }
  })();
};

/**
 * POST /api/v1/ride-events/:id/rsvp
 * Join a group ride
 */
export const rsvpRideEvent = (req: AuthRequest, res: Response): void => {
  (async () => {
    try {
      const { id } = req.params;
      const userId = req.userId;
      const { bikeId } = req.body;

      logger.info(`[rsvpRideEvent] User ${userId} RSVP to ${id}`);

      if (!bikeId) {
        return res
          .status(400)
          .json({ success: false, error: "bikeId required" });
      }

      const ride = await RideEvent.findById(id);
      if (!ride) {
        return res
          .status(404)
          .json({ success: false, error: "Ride not found" });
      }

      // Disallow joining events that are not yet approved by admin
      if (!ride.approved) {
        return res.status(403).json({
          success: false,
          error: "EVENT_PENDING_APPROVAL",
          message:
            "This event is awaiting admin approval and cannot be joined yet.",
        });
      }

      const user = await User.findById(userId);
      if (!user) {
        return res
          .status(404)
          .json({ success: false, error: "User not found" });
      }

      if (!user.verified) {
        return res
          .status(403)
          .json({ success: false, error: "Must be verified" });
      }

      if (user.ridingHours < ride.minRidingHours) {
        return res.status(403).json({
          success: false,
          error: `Need ${ride.minRidingHours}+ hours. You have ${user.ridingHours}`,
        });
      }

      const alreadyJoined = ride.participants.some(
        (p: any) => p.userId.toString() === userId,
      );
      if (alreadyJoined) {
        return res
          .status(400)
          .json({ success: false, error: "Already joined" });
      }

      if (ride.participants.length >= ride.maxParticipants) {
        return res.status(400).json({ success: false, error: "Ride is full" });
      }

      // ✅ Check subscription - free tier cannot join paid events
      const userSubscription =
        await User.findById(userId).select("subscription");
      if (userSubscription) {
        // Check if subscription is expired
        const isExpired =
          userSubscription.subscription.tier === "pro" &&
          userSubscription.subscription.expiryDate &&
          new Date() > userSubscription.subscription.expiryDate;

        const effectiveTier = isExpired
          ? "free"
          : userSubscription.subscription.tier;

        // Free tier cannot join events
        if (effectiveTier === "free") {
          return res.status(403).json({
            success: false,
            error: "UPGRADE_REQUIRED",
            message: "Upgrade to Pro to join ride events.",
            data: {
              tier: effectiveTier,
            },
          });
        }
      }

      // If event is private, ALWAYS block normal RSVP and force booking flow
      if (ride.privacy === "private") {
        return res.status(400).json({
          success: false,
          error: "Private event – use booking flow instead",
        });
      }

      // ride.participants.push({
      //   userId: userId as any,
      //   status: 'rsvp',
      //   joinedAt: new Date(),
      //   bikeId: bikeId as any
      // });

      ride.participants.push({
        userId: userId as any,
        status: "JOINED",
        joinedAt: new Date(),
        bikeId: bikeId as any,
      });

      await ride.save();

      // Create/update participant record (upsert to handle race conditions)
      await RideEventParticipant.findOneAndUpdate(
        { rideEventId: id, userId },
        {
          $set: {
            bikeId,
            finishedRide: false,
            crashDetected: false,
            sosTriggered: false,
          },
        },
        { upsert: true, new: true },
      );

      // Update Redis
      await redisClient.setEx(
        `ride-event-${id}:participants`,
        3600,
        JSON.stringify(ride.participants),
      );

      logger.info(`[rsvpRideEvent] RSVP successful for ride ${id}`);

      return res.json({
        success: true,
        data: {
          rideEventId: ride._id,
          status: "rsvp",
          message: "RSVP successful!",
        },
      });
    } catch (error: any) {
      logger.error(`[rsvpRideEvent] Error: ${error.message}`);
      return res.status(500).json({ success: false, error: error.message });
    }
  })();
};

/**
 * POST /api/v1/rideevents/:id/book
 * Book a seat for a (possibly paid) event.
 * For now this acts as a mock payment: immediately marks as PAID,
 * creates ticket + QR payload, and joins the event.
 */
export const bookRideEvent = (req: AuthRequest, res: Response): void => {
  (async () => {
    try {
      const { id } = req.params;
      const userId = req.userId;
      const { bikeId } = req.body || {};

      logger.info(`[bookRideEvent] User ${userId} booking event ${id}`);

      const ride = await RideEvent.findById(id);
      if (!ride) {
        return res
          .status(404)
          .json({ success: false, error: "Event not found" });
      }

      // Disallow booking events that are not yet approved by admin
      if (!ride.approved) {
        return res.status(403).json({
          success: false,
          error: "EVENT_PENDING_APPROVAL",
          message:
            "This event is awaiting admin approval and cannot be booked yet.",
        });
      }

      if (ride.status !== "SCHEDULED") {
        return res.status(400).json({
          success: false,
          error: `Event is ${ride.status}, booking closed`,
        });
      }

      if (ride.participants.length >= ride.maxParticipants) {
        return res.status(400).json({
          success: false,
          error: "Event is full",
        });
      }

      const user = await User.findById(userId);
      if (!user) {
        return res
          .status(404)
          .json({ success: false, error: "User not found" });
      }

      // Eligibility: verified rider
      if (!user.verified) {
        return res
          .status(403)
          .json({ success: false, error: "Verification required to join" });
      }

      // Check subscription - free tier cannot book events
      const userSubscription = await User.findById(userId).select("subscription");
      if (userSubscription) {
        const isExpired =
          userSubscription.subscription.tier === "pro" &&
          userSubscription.subscription.expiryDate &&
          new Date() > userSubscription.subscription.expiryDate;

        const effectiveTier = isExpired ? "free" : userSubscription.subscription.tier;

        if (effectiveTier === "free") {
          return res.status(403).json({
            success: false,
            error: "UPGRADE_REQUIRED",
            message: "Upgrade to Pro to book ride events.",
            data: {
              tier: effectiveTier,
            },
          });
        }
      }

      const alreadyParticipant = ride.participants.find(
        (p: any) => p.userId.toString() === userId,
      );
      if (alreadyParticipant) {
        // If they already have a ticket (previously booked), return it
        if (alreadyParticipant.ticketId && alreadyParticipant.qrCode) {
          return res.status(200).json({
            success: true,
            data: {
              rideEventId: ride._id,
              ticketId: alreadyParticipant.ticketId,
              qrPayload: alreadyParticipant.qrCode,
              amount: 0,
              paymentStatus: "paid",
              alreadyJoined: true,
            },
          });
        }
        // If they are already joined (e.g. organizer auto-joined) but have no ticket yet, create one
        const ticketId = `TCKT-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const qrPayload = `event:${ride._id}:user:${userId}:ticket:${ticketId}`;

        await Payment.create({
          userId,
          rideEventId: ride._id,
          amount: 0,
          status: "paid",
          provider: "mock",
          metadata: { ticketId },
        });

        // Update participant record with ticket info
        await RideEvent.updateOne(
          { _id: ride._id, "participants.userId": userId },
          {
            $set: {
              "participants.$.ticketId": ticketId,
              "participants.$.qrCode": qrPayload,
            },
          },
        );

        return res.status(200).json({
          success: true,
          data: {
            rideEventId: ride._id,
            ticketId,
            qrPayload,
            amount: 0,
            paymentStatus: "paid",
          },
        });
      }

      const amount = ride.price || 0;

      // Create mock payment marked as PAID immediately (can be replaced with real gateway)
      const ticketId = `TCKT-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}`;
      const qrPayload = `event:${ride._id}:user:${userId}:ticket:${ticketId}`;

      const payment = await Payment.create({
        userId,
        rideEventId: ride._id,
        amount: 0, // no charge — free join
        status: "paid",
        provider: "mock",
        metadata: {
          ticketId,
        },
      });

      // Join as participant with ticket + QR
      ride.participants.push({
        userId: userId as any,
        status: "JOINED",
        joinedAt: new Date(),
        bikeId: bikeId ? (bikeId as any) : undefined,
        ticketId,
        qrCode: qrPayload,
        paymentId: payment._id,
      } as any);

      await ride.save();

      logger.info(
        `[bookRideEvent] Booking successful for user ${userId} on event ${id}`,
      );

      return res.status(201).json({
        success: true,
        data: {
          rideEventId: ride._id,
          ticketId,
          qrPayload,
          amount,
          paymentStatus: payment.status,
        },
      });
    } catch (error: any) {
      logger.error(`[bookRideEvent] Error: ${error.message}`);
      return res.status(500).json({ success: false, error: error.message });
    }
  })();
};

/**
 * GET /api/v1/rideevents/:id/pass
 * Get the current user's event pass (ticket + QR)
 */
export const getRideEventPass = (req: AuthRequest, res: Response): void => {
  (async () => {
    try {
      const { id } = req.params;
      const userId = req.userId;

      const ride = await RideEvent.findById(id).lean();
      if (!ride) {
        return res
          .status(404)
          .json({ success: false, error: "Event not found" });
      }

      const participant = ride.participants.find(
        (p: any) => p.userId.toString() === userId,
      );

      if (!participant) {
        return res.status(404).json({
          success: false,
          error: "You are not a participant in this event",
        });
      }

      if (!participant.ticketId || !participant.qrCode) {
        // Organizer/participant may exist without ticket in older records.
        // Auto-generate a pass so "View My Pass" works reliably.
        const ticketId = `TCKT-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 8)}`;
        const qrPayload = `event:${ride._id}:user:${userId}:ticket:${ticketId}`;

        await Payment.create({
          userId,
          rideEventId: ride._id,
          amount: 0,
          status: "paid",
          provider: "mock",
          metadata: { ticketId },
        });

        await RideEvent.updateOne(
          { _id: ride._id, "participants.userId": userId },
          {
            $set: {
              "participants.$.ticketId": ticketId,
              "participants.$.qrCode": qrPayload,
            },
          },
        );

        return res.json({
          success: true,
          data: {
            event: {
              id: ride._id,
              title: ride.title,
              scheduledAt: ride.scheduledAt,
              location: (ride as any).location || null,
            },
            pass: {
              ticketId,
              qrPayload,
              status: participant.status || "JOINED",
            },
          },
        });
      }

      return res.json({
        success: true,
        data: {
          event: {
            id: ride._id,
            title: ride.title,
            scheduledAt: ride.scheduledAt,
            location: (ride as any).location || null,
          },
          pass: {
            ticketId: participant.ticketId,
            qrPayload: participant.qrCode,
            status: participant.status,
          },
        },
      });
    } catch (error: any) {
      logger.error(`[getRideEventPass] Error: ${error.message}`);
      return res.status(500).json({ success: false, error: error.message });
    }
  })();
};

/**
 * POST /api/v1/ride-events/:id/start
 * Start group ride (Organizer only)
 */
// export const startRideEvent = (req: AuthRequest, res: Response) : void => {
//   (async () => {
//     try {
//     const { id } = req.params;
//     const organizerId = req.userId;

//     logger.info(`[startRideEvent] Starting ride ${id}`);

//     const ride = await RideEvent.findById(id);
//     if (!ride) {
//       return res.status(404).json({ success: false, error: 'Ride not found' });
//     }

//     if (ride.organizerId.toString() !== organizerId) {
//       return res.status(403).json({ success: false, error: 'Only organizer can start' });
//     }

//     ride.status = 'live';
//     ride.liveStartedAt = new Date();

//     ride.participants = ride.participants.map((p: any) => ({
//       ...p,
//       status: 'joined'
//     }));

//     await ride.save();

//     // Initialize Redis storage
//     await redisClient.setEx(
//       `ride-event-${id}:locations`,
//       86400,
//       JSON.stringify({})
//     );

//     await redisClient.setEx(
//       `ride-event-${id}:stats`,
//       86400,
//       JSON.stringify({
//         startedAt: ride.liveStartedAt,
//         totalDistance: 0,
//         avgGroupSpeed: 0,
//         maxSpeed: 0
//       })
//     );

//     logger.info(`[startRideEvent] Ride ${id} is LIVE`);

//     return res.json({
//       success: true,
//       data: {
//         rideEventId: ride._id,
//         status: 'live',
//         startedAt: ride.liveStartedAt
//       }
//     });
//   } catch (error: any) {
//     logger.error(`[startRideEvent] Error: ${error.message}`);
//     return res.status(500).json({ success: false, error: error.message });
//   }
// })();;
// };

export const startRideEvent = (req: AuthRequest, res: Response): void => {
  (async () => {
    try {
      const { id } = req.params;
      const organizerId = req.userId;

      logger.info(`[startRideEvent] Starting ride ${id}`);

      const ride = await RideEvent.findById(id);
      if (!ride) {
        return res
          .status(404)
          .json({ success: false, error: "Ride not found" });
      }

      if (ride.organizerId.toString() !== organizerId) {
        return res
          .status(403)
          .json({ success: false, error: "Only organizer can start" });
      }

      if (ride.status !== "SCHEDULED") {
        return res.status(400).json({
          success: false,
          error: `Ride is ${ride.status}, cannot start`,
        });
      }

      ride.status = "LIVE";
      ride.liveStartedAt = new Date();

      // DON'T auto-mark as joined - they stay JOINED until they tap "Start My Ride"

      await ride.save();

      // Initialize Redis storage
      await redisClient.setEx(
        `ride-event-${id}:locations`,
        86400,
        JSON.stringify({}),
      );

      await redisClient.setEx(
        `ride-event-${id}:stats`,
        86400,
        JSON.stringify({
          startedAt: ride.liveStartedAt,
          totalDistance: 0,
          avgGroupSpeed: 0,
          maxSpeed: 0,
        }),
      );

      // SEND NOTIFICATIONS TO ALL PARTICIPANTS
      const io = (req.app as any).io;

      // Get organizer info
      const organizer = await User.findById(organizerId).select("name").lean();
      const organizerName = organizer?.name || "Organizer";

      // Get all participants (excluding organizer)
      const participantUserIds = ride.participants
        .filter((p: any) => p.userId.toString() !== organizerId)
        .map((p: any) => p.userId.toString());

      const notificationMessage = `🚴 "${ride.title}" has started! Tap to begin your ride.`;

      // Create notifications in DB for each participant
      const notifications = participantUserIds.map((userId: string) => ({
        userId,
        type: "ride" as const,
        fromUserId: organizerId,
        fromUserName: organizerName,
        rideEventId: id,
        message: notificationMessage,
        read: false,
      }));

      if (notifications.length > 0) {
        await Notification.insertMany(notifications);
        logger.info(
          `[startRideEvent] Created ${notifications.length} notifications`,
        );
      }

      // Send real-time socket notifications to each participant's user room
      if (io) {
        // Broadcast to ride room (for anyone currently on ride screens)
        io.to(`ride:${id}`).emit("host-started-ride", {
          rideEventId: id,
          title: ride.title,
          startedAt: ride.liveStartedAt,
          message: notificationMessage,
          status: "LIVE",
          timestamp: new Date(),
        });

        // Also send to each participant's personal notification channel
        participantUserIds.forEach((userId: string) => {
          sendNotificationToUser(io, userId, {
            type: "ride",
            message: notificationMessage,
            fromUserId: organizerId,
            fromUserName: organizerName,
            rideEventId: id,
          });
        });
      }

      logger.info(`[startRideEvent] Ride ${id} is LIVE`);

      return res.json({
        success: true,
        data: {
          rideEventId: ride._id,
          status: "LIVE",
          startedAt: ride.liveStartedAt,
        },
      });
    } catch (error: any) {
      logger.error(`[startRideEvent] Error: ${error.message}`);
      return res.status(500).json({ success: false, error: error.message });
    }
  })();
};

/**
 * POST /api/v1/ride-events/:id/stream
 * Stream ride event location
 */

export const streamRideEventLocation = (
  req: AuthRequest,
  res: Response,
): void => {
  (async () => {
    try {
      const { id } = req.params;
      const userId = req.userId;
      const { chunk } = req.body;

      if (!Array.isArray(chunk) || chunk.length === 0) {
        return res.status(400).json({ success: false, error: "Invalid chunk" });
      }

      const ride = await RideEvent.findOne({ _id: id, status: "LIVE" });
      if (!ride) {
        return res.status(404).json({ success: false, error: "Ride not live" });
      }

      const isParticipant = ride.participants.some(
        (p: any) => p.userId.toString() === userId,
      );
      if (!isParticipant) {
        return res
          .status(403)
          .json({ success: false, error: "Not a participant" });
      }

      // Store current location
      const lastPoint = chunk[chunk.length - 1];
      const userLocation = {
        userId,
        lat: lastPoint.lat,
        lng: lastPoint.lng,
        speed: lastPoint.speed || 0,
        timestamp: lastPoint.timestamp || Date.now(),
      };

      const locationsKey = `ride-event-${id}:locations`;
      const locations = await redisClient.get(locationsKey);
      const locationData = locations ? JSON.parse(locations) : {};
      locationData[userId] = userLocation;
      await redisClient.setEx(
        locationsKey,
        86400,
        JSON.stringify(locationData),
      );

      // ==================== CALCULATE DISTANCE USING YOUR UTILS ====================
      const statsKey = `ride-event-${id}:user-${userId}:stats`;
      const existingStats = await redisClient.get(statsKey);
      const userStats = existingStats
        ? JSON.parse(existingStats)
        : {
            points: [],
            speeds: [],
            totalDistance: 0,
            maxSpeed: 0,
            avgSpeed: 0,
          };

      // Add new points to tracking
      chunk.forEach((point: any) => {
        userStats.points.push({
          lat: point.lat,
          lng: point.lng,
          timestamp: point.timestamp,
          speed: point.speed || 0,
        });

        if (point.speed) {
          userStats.speeds.push(point.speed);
        }
      });

      // ==================== CALCULATE STATS USING YOUR calculateStats ====================
      if (userStats.points.length >= 2) {
        const stats = calculateStats(userStats.points);
        userStats.totalDistance = stats.distance;
        userStats.maxSpeed = stats.maxSpeed;
        userStats.avgSpeed = stats.avgSpeed;
      }

      await redisClient.setEx(statsKey, 86400, JSON.stringify(userStats));

      logger.info(
        `[streamRideEventLocation] User ${userId} - Distance: ${userStats.totalDistance.toFixed(2)}km, Avg Speed: ${userStats.avgSpeed.toFixed(2)} km/h, Max Speed: ${userStats.maxSpeed.toFixed(2)} km/h`,
      );

      return res.json({
        success: true,
        data: {
          pointsReceived: chunk.length,
          totalDistance: formatDistance(userStats.totalDistance),
          avgSpeed: formatSpeed(userStats.avgSpeed),
          maxSpeed: formatSpeed(userStats.maxSpeed),
          stored: true,
        },
      });
    } catch (error: any) {
      logger.error(`[streamRideEventLocation] Error: ${error.message}`);
      return res.status(500).json({ success: false, error: error.message });
    }
  })();
};

export const getRideEventLive = (req: AuthRequest, res: Response): void => {
  (async () => {
    try {
      const { id } = req.params;

      const ride = await RideEvent.findById(id).lean();
      if (!ride) {
        return res
          .status(404)
          .json({ success: false, error: "Ride not found" });
      }

      const locationsKey = `ride-event-${id}:locations`;
      const locationsData = await redisClient.get(locationsKey);
      const locations = locationsData ? JSON.parse(locationsData) : {};

      // Get all participant stats
      const participants = await Promise.all(
        ride.participants.map(async (p: any) => {
          const statsKey = `ride-event-${id}:user-${p.userId}:stats`;
          const statsData = await redisClient.get(statsKey);
          const stats = statsData
            ? JSON.parse(statsData)
            : { totalDistance: 0, avgSpeed: 0, maxSpeed: 0 };

          return {
            userId: p.userId,
            status: p.status,
            distance: formatDistance(stats.totalDistance),
            avgSpeed: formatSpeed(stats.avgSpeed),
            maxSpeed: formatSpeed(stats.maxSpeed),
          };
        }),
      );

      const messages = await ChatMessage.find({ rideEventId: id })
        .populate("senderId", "name avatarUrl")
        .sort({ timestamp: -1 })
        .limit(20)
        .lean();

      logger.info(`[getRideEventLive] Fetched live data for ride ${id}`);

      return res.json({
        success: true,
        data: {
          rideEventId: ride._id,
          title: ride.title,
          status: ride.status,
          eventType: (ride as any).eventType || "group_ride",
          totalDistance: formatDistance(ride.route.distance),
          estimatedDuration: formatDuration(ride.route.estimatedDuration * 60),
          difficulty: getDifficultyLabel(ride.route.difficulty),
          participantCount: ride.participants.length,
          participantStats: participants,
          locations: Object.values(locations),
          messages: messages.reverse(),
          liveStartedAt: ride.liveStartedAt,
        },
      });
    } catch (error: any) {
      logger.error(`[getRideEventLive] Error: ${error.message}`);
      return res.status(500).json({ success: false, error: error.message });
    }
  })();
};

export const riderStartsRide = (req: AuthRequest, res: Response): void => {
  (async () => {
    try {
      const { id } = req.params;
      const userId = req.userId;
      const { location, emergencyContacts } = req.body;

      logger.info(`[riderStartsRide] Rider ${userId} starting ride ${id}`);

      const ride = await RideEvent.findById(id);
      if (!ride) {
        return res
          .status(404)
          .json({ success: false, error: "Ride not found" });
      }

      if (ride.status !== "LIVE") {
        return res
          .status(400)
          .json({ success: false, error: "Ride is not live yet" });
      }

      const participantIndex = ride.participants.findIndex(
        (p: any) => p.userId.toString() === userId,
      );

      if (participantIndex === -1) {
        return res
          .status(403)
          .json({ success: false, error: "Not a participant" });
      }

      const timeElapsedMinutes =
        (Date.now() - ride.liveStartedAt!.getTime()) / (1000 * 60);
      let distanceFromStart = 0;

      if (location) {
        const lat1 = ride.route.startPoint.coordinates[1];
        const lon1 = ride.route.startPoint.coordinates[0];
        const lat2 = location.lat;
        const lon2 = location.lng;
        const R = 6371;
        const dLat = ((lat2 - lat1) * Math.PI) / 180;
        const dLon = ((lon2 - lon1) * Math.PI) / 180;
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos((lat1 * Math.PI) / 180) *
            Math.cos((lat2 * Math.PI) / 180) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        distanceFromStart = R * c;
      }

      const isLateJoin =
        timeElapsedMinutes > ride.lateJoinConfig.lateJoinWindowMinutes ||
        distanceFromStart > ride.lateJoinConfig.maxDistanceFromStartKm;

      ride.participants[participantIndex].status = "ACTIVE";
      ride.participants[participantIndex].personalStartTime = new Date();
      ride.participants[participantIndex].liveLocationEnabled = true;
      ride.participants[participantIndex].sosEnabled = true;
      ride.participants[participantIndex].emergencyContacts =
        emergencyContacts || [];
      ride.participants[participantIndex].wasLateJoin = isLateJoin;
      ride.participants[participantIndex].lateJoinReason = isLateJoin
        ? `${Math.round(timeElapsedMinutes)}min late, ${distanceFromStart.toFixed(1)}km away`
        : undefined;

      await ride.save();

      await RideEventParticipant.updateOne(
        { rideEventId: id, userId },
        {
          status: "ACTIVE",
          personalStartTime: new Date(),
          liveLocationEnabled: true,
          sosEnabled: true,
          emergencyContacts: emergencyContacts || [],
          wasLateJoin: isLateJoin,
          lateJoinReason: isLateJoin
            ? `${Math.round(timeElapsedMinutes)}min late`
            : undefined,
        },
        { upsert: true },
      );

      logger.info(`[riderStartsRide] Rider ${userId} is now ACTIVE`);

      return res.json({
        success: true,
        data: {
          rideEventId: id,
          status: "ACTIVE",
          personalStartTime: new Date(),
          wasLateJoin: isLateJoin,
        },
      });
    } catch (error: any) {
      logger.error(`[riderStartsRide] Error: ${error.message}`);
      return res.status(500).json({ success: false, error: error.message });
    }
  })();
};

export const riderEndsRide = (req: AuthRequest, res: Response): void => {
  (async () => {
    try {
      const { id } = req.params;
      const userId = req.userId;

      logger.info(`[riderEndsRide] Rider ${userId} ending ride ${id}`);

      const ride = await RideEvent.findById(id);
      if (!ride) {
        return res
          .status(404)
          .json({ success: false, error: "Ride not found" });
      }

      const participantIndex = ride.participants.findIndex(
        (p: any) => p.userId.toString() === userId,
      );

      if (participantIndex === -1) {
        return res
          .status(403)
          .json({ success: false, error: "Not a participant" });
      }

      if (ride.participants[participantIndex].status === "ACTIVE") {
        ride.participants[participantIndex].status = "COMPLETED";
        ride.participants[participantIndex].personalEndTime = new Date();
      }

      await ride.save();

      await RideEventParticipant.updateOne(
        { rideEventId: id, userId },
        {
          status: "COMPLETED",
          personalEndTime: new Date(),
          finishedRide: true,
        },
      );

      logger.info(`[riderEndsRide] Rider ${userId} completed ride ${id}`);

      return res.json({
        success: true,
        data: {
          rideEventId: id,
          status: "COMPLETED",
          message: "✅ Ride completed!",
        },
      });
    } catch (error: any) {
      logger.error(`[riderEndsRide] Error: ${error.message}`);
      return res.status(500).json({ success: false, error: error.message });
    }
  })();
};

/**
 * GET /api/v1/ride-events/:id/summary
 * Get completed ride summary with all stats
 */
export const getRideEventSummary = (req: AuthRequest, res: Response): void => {
  (async () => {
    try {
      const { id } = req.params;
      const userId = req.userId;

      const ride = await RideEvent.findById(id)
        .populate("organizerId", "name avatarUrl")
        .lean();

      if (!ride || ride.status !== "COMPLETED") {
        return res
          .status(404)
          .json({ success: false, error: "Ride not completed" });
      }

      const participantStats = await RideEventParticipant.find({
        rideEventId: id,
      }).lean();

      const finishedCount = participantStats.filter(
        (p: any) => p.finishedRide,
      ).length;
      const avgSpeed =
        participantStats.reduce(
          (sum: number, p: any) => sum + (p.avgSpeed || 0),
          0,
        ) / participantStats.length || 0;
      const maxSpeed = Math.max(
        ...participantStats.map((p: any) => p.maxSpeed || 0),
        0,
      );
      const totalElevation =
        participantStats.reduce(
          (sum: number, p: any) => sum + (p.elevation || 0),
          0,
        ) / participantStats.length || 0;

      const userStats = participantStats.find(
        (p: any) => p.userId.toString() === userId,
      );

      logger.info(`[getRideEventSummary] Summary for ride ${id}`);

      return res.json({
        success: true,
        data: {
          ride: {
            title: ride.title,
            distance: formatDistance(ride.route.distance),
            duration: formatDuration(ride.route.estimatedDuration * 60),
            elevation: `${ride.route.elevation}m`,
            difficulty: getDifficultyLabel(ride.route.difficulty),
            participants: ride.participants.length,
            finished: finishedCount,
            organizer: ride.organizerId,
          },
          groupStats: {
            avgDistance: formatDistance(
              participantStats.reduce(
                (sum: number, p: any) => sum + (p.distance || 0),
                0,
              ) / participantStats.length || 0,
            ),
            avgSpeed: formatSpeed(avgSpeed),
            maxSpeed: formatSpeed(maxSpeed),
            avgElevation: `${Math.round(totalElevation)}m`,
          },
          yourStats: userStats
            ? {
                distance: formatDistance(userStats.distance ?? 0),
                duration: formatDuration(userStats.duration ?? 0),
                avgSpeed: formatSpeed(userStats.avgSpeed ?? 0),
                maxSpeed: formatSpeed(userStats.maxSpeed ?? 0),
                elevation: `${(userStats as any).elevation ?? 0}m`,
                calories: `${(userStats as any).calories ?? 0}`,
                completed: userStats.finishedRide,
                rating: userStats.riderRating || null,
              }
            : null,
          badges: ride.badgeRewards || [],
        },
      });
    } catch (error: any) {
      logger.error(`[getRideEventSummary] Error: ${error.message}`);
      return res.status(500).json({ success: false, error: error.message });
    }
  })();
};

/**
 * POST /api/v1/ride-events/:id/end
 * End group ride (Organizer only)
 */
// export const endRideEvent =  (req: AuthRequest, res: Response) : void => {
//     (async () => {
//     try {
//       const { id } = req.params;
//       const organizerId = req.userId;

//       logger.info(`[endRideEvent] Ending ride ${id}`);

//       const ride = await RideEvent.findById(id);
//       if (!ride) {
//         return res.status(404).json({ success: false, error: 'Ride not found' });
//       }

//       if (ride.organizerId.toString() !== organizerId) {
//         return res.status(403).json({ success: false, error: 'Only organizer can end' });
//       }

//       ride.status = 'completed';
//       ride.liveEndedAt = new Date();
//       await ride.save();

//       // Queue background job
//       await rideEventQueue.add('process-group-ride', { rideEventId: ride._id }, { priority: 1 });

//       // Cleanup Redis
//       await redisClient.del(`ride-event-${id}:locations`);
//       await redisClient.del(`ride-event-${id}:stats`);
//       await redisClient.del(`ride-event-${id}:participants`);

//       logger.info(`[endRideEvent] Ride ${id} completed`);

//       return res.json({
//         success: true,
//         data: {
//           rideEventId: ride._id,
//           status: 'completed',
//           endedAt: ride.liveEndedAt
//         }
//       });
//     } catch (error: any) {
//       logger.error(`[endRideEvent] Error: ${error.message}`);
//       return res.status(500).json({ success: false, error: error.message });
//     }
//     })();
//   };

export const endRideEvent = (req: AuthRequest, res: Response): void => {
  (async () => {
    try {
      const { id } = req.params;
      const organizerId = req.userId;

      logger.info(`[endRideEvent] Ending ride ${id}`);

      const ride = await RideEvent.findById(id);
      if (!ride) {
        return res
          .status(404)
          .json({ success: false, error: "Ride not found" });
      }

      if (ride.organizerId.toString() !== organizerId) {
        return res
          .status(403)
          .json({ success: false, error: "Only organizer can end" });
      }

      ride.status = "COMPLETED";
      ride.liveEndedAt = new Date();

      // Mark no-shows (who were JOINED but never ACTIVE)
      ride.participants = ride.participants.map((p: any) => ({
        ...p,
        status: p.status === "JOINED" ? "NO_SHOW" : p.status,
        isNoShow: p.status === "JOINED",
        noShowReason: p.status === "JOINED" ? "Did not start tracking" : null,
      }));

      await ride.save();

      // Update all no-shows in participant table
      await RideEventParticipant.updateMany(
        { rideEventId: id, status: "JOINED" },
        {
          status: "NO_SHOW",
          isNoShow: true,
          noShowReason: "Did not start tracking",
        },
      );

      // Broadcast to all
      const io = (req.app as any).io;
      if (io) {
        io.to(`ride:${id}`).emit("ride-ended", {
          rideEventId: id,
          endedAt: ride.liveEndedAt,
          message: "🏁 Ride has ended!",
          timestamp: new Date(),
        });
      }

      // Queue background job
      await rideEventQueue.add(
        "process-group-ride",
        { rideEventId: ride._id },
        { priority: 1 },
      );

      // Cleanup Redis
      await redisClient.del(`ride-event-${id}:locations`);
      await redisClient.del(`ride-event-${id}:stats`);
      await redisClient.del(`ride-event-${id}:participants`);

      logger.info(`[endRideEvent] Ride ${id} completed`);

      return res.json({
        success: true,
        data: {
          rideEventId: ride._id,
          status: "COMPLETED",
          endedAt: ride.liveEndedAt,
        },
      });
    } catch (error: any) {
      logger.error(`[endRideEvent] Error: ${error.message}`);
      return res.status(500).json({ success: false, error: error.message });
    }
  })();
};

/**
 * POST /api/v1/ride-events/:id/rate/:targetUserId
 * Rate another rider
 */
export const rateRider = (req: AuthRequest, res: Response): void => {
  (async () => {
    try {
      const { id, targetUserId } = req.params;
      const userId = req.userId;
      const { rating, feedback } = req.body;

      if (!rating || rating < 1 || rating > 5) {
        return res
          .status(400)
          .json({ success: false, error: "Rating must be 1-5" });
      }

      await RideEventParticipant.updateOne(
        { rideEventId: id, userId: targetUserId },
        {
          riderRating: rating,
          feedback,
          ratedBy: userId,
          ratedAt: new Date(),
        },
      );

      logger.info(`[rateRider] ${userId} rated ${targetUserId}`);

      return res.json({
        success: true,
        data: { message: "Rating saved" },
      });
    } catch (error: any) {
      logger.error(`[rateRider] Error: ${error.message}`);
      return res.status(500).json({ success: false, error: error.message });
    }
  })();
};

/**
 * POST /api/v1/ride-events/:id/chat
 * Send chat message
 */
export const sendChatMessage = (req: AuthRequest, res: Response): void => {
  (async () => {
    try {
      const { id } = req.params;
      const userId = req.userId;
      const { text } = req.body;

      if (!text || text.trim().length === 0) {
        return res
          .status(400)
          .json({ success: false, error: "Message cannot be empty" });
      }

      if (text.length > 500) {
        return res
          .status(400)
          .json({ success: false, error: "Message too long (max 500 chars)" });
      }

      const ride = await RideEvent.findById(id);
      if (!ride) {
        return res
          .status(404)
          .json({ success: false, error: "Ride not found" });
      }

      const isParticipant = ride.participants.some(
        (p: any) => p.userId.toString() === userId,
      );
      if (!isParticipant) {
        return res
          .status(403)
          .json({ success: false, error: "Not a participant" });
      }

      const sender = await User.findById(userId)
        .select("name avatarUrl")
        .lean();

      const message = await ChatMessage.create({
        rideEventId: id,
        roomType: "ride",
        senderId: userId,
        text: text.trim(),
        timestamp: new Date(),
      });

      logger.info(`[sendChatMessage] Message sent in ride ${id}`);

      return res.status(201).json({
        success: true,
        data: {
          _id: message._id,
          rideEventId: message.rideEventId,
          senderId: userId,
          senderName: sender?.name,
          senderAvatar: sender?.avatarUrl,
          text: message.text,
          timestamp: message.timestamp,
        },
      });
    } catch (error: any) {
      logger.error(`[sendChatMessage] Error: ${error.message}`);
      return res.status(500).json({ success: false, error: error.message });
    }
  })();
};

/**
 * GET /api/v1/ride-events/:id/chat
 * Get chat messages (COMPLETE)
 */
export const getChatMessages = (req: AuthRequest, res: Response): void => {
  (async () => {
    try {
      const { id } = req.params;
      const { page = 1, limit = 50 } = req.query;

      const pageNum = Math.max(1, parseInt(page as string) || 1);
      const limitNum = Math.min(100, parseInt(limit as string) || 50);
      const skip = (pageNum - 1) * limitNum;

      const messages = await ChatMessage.find({ rideEventId: id })
        .populate("senderId", "name avatarUrl")
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean();

      const total = await ChatMessage.countDocuments({ rideEventId: id });

      logger.info(`[getChatMessages] Retrieved messages for ride ${id}`);

      return res.json({
        success: true,
        data: messages.reverse(),
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
      });
    } catch (error: any) {
      logger.error(`[getChatMessages] Error: ${error.message}`);
      return res.status(500).json({ success: false, error: error.message });
    }
  })();
};
