import { Response } from "express";
import { AuthRequest } from "../types/auth.types.js";
import RideEvent from "../models/rideEvent.model.js";
import User from "../models/user.model.js";
import logger from "../config/logger.js";

/**
 * @route   GET /api/v1/admin/ride-events
 * @desc    Get all ride events with pagination and filtering
 * @access  Admin
 */
export const getAllRideEvents = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const {
      page = "1",
      limit = "10",
      search = "",
      status = "",
      category = "",
      privacy = "",
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    logger.info(
      `[Admin] getAllRideEvents - search: ${search}, status: ${status}`,
    );

    // Build query
    const query: any = {};

    // Search by title or location
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { location: { $regex: search, $options: "i" } },
      ];
    }

    // Filter by status
    if (status) {
      query.status = status;
    }

    // Filter by category
    if (category) {
      query.category = category;
    }

    // Filter by privacy
    if (privacy) {
      query.privacy = privacy;
    }

    // Pagination
    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));
    const skip = (pageNum - 1) * limitNum;

    // Sorting
    const sortOptions: any = {};
    sortOptions[sortBy as string] = sortOrder === "asc" ? 1 : -1;

    // Execute queries in parallel
    const [rideEvents, total] = await Promise.all([
      RideEvent.find(query)
        .populate("organizerId", "name email avatarUrl verified")
        .select(
          "title description organizerId route.startPoint route.endPoint route.distance route.difficulty status scheduledAt location category privacy price participants maxParticipants createdAt approved",
        )
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      RideEvent.countDocuments(query),
    ]);

    // Enrich with participant count and payment info
    const enrichedEvents = rideEvents.map((event: any) => ({
      ...event,
      participantCount: event.participants.length,
      spotsAvailable: event.maxParticipants - event.participants.length,
      isPaid: event.privacy === "private" && event.price > 0,
      entryFee: event.privacy === "private" ? event.price : 0,
    }));

    logger.info(
      `[Admin] getAllRideEvents - Retrieved ${rideEvents.length} of ${total} events`,
    );

    res.status(200).json({
      success: true,
      data: {
        rideEvents: enrichedEvents,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error: any) {
    logger.error(`getAllRideEvents error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Failed to fetch ride events",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * @route   GET /api/v1/admin/ride-events/:id
 * @desc    Get ride event by ID with all details
 * @access  Admin
 */
export const getRideEventById = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const { id } = req.params;

    const rideEvent = await RideEvent.findById(id)
      .populate(
        "organizerId",
        "name email phone avatarUrl verified ridingHours",
      )
      .populate("participants.userId", "name email avatarUrl verified")
      .lean();

    if (!rideEvent) {
      res.status(404).json({
        success: false,
        message: "Ride event not found",
      });
      return;
    }

    // Enrich with additional data
    const enrichedEvent = {
      ...rideEvent,
      participantCount: rideEvent.participants.length,
      spotsAvailable: rideEvent.maxParticipants - rideEvent.participants.length,
    };

    res.status(200).json({
      success: true,
      data: enrichedEvent,
    });
  } catch (error: any) {
    logger.error(`getRideEventById error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Failed to fetch ride event details",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * @route   PATCH /api/v1/admin/ride-events/:id/approve
 * @desc    Approve a paid ride event
 * @access  Admin
 */
export const approveRideEvent = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const { id } = req.params;

    logger.info(`[Admin] Approving ride event ${id}`);

    const rideEvent = await RideEvent.findById(id);

    if (!rideEvent) {
      res.status(404).json({
        success: false,
        message: "Ride event not found",
      });
      return;
    }

    // Only paid events need approval
    if (rideEvent.privacy !== "private" || rideEvent.price === 0) {
      res.status(400).json({
        success: false,
        message: "Only paid events require approval",
      });
      return;
    }

    if (rideEvent.approved) {
      res.status(400).json({
        success: false,
        message: "Ride event is already approved",
      });
      return;
    }

    rideEvent.approved = true;
    await rideEvent.save();

    // TODO: Notify organizer about approval

    logger.info(`[Admin] Ride event ${id} approved successfully`);

    res.status(200).json({
      success: true,
      message: "Ride event approved successfully",
      data: rideEvent,
    });
  } catch (error: any) {
    logger.error(`approveRideEvent error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Failed to approve ride event",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * @route   PATCH /api/v1/admin/ride-events/:id/reject
 * @desc    Reject a paid ride event
 * @access  Admin
 */
export const rejectRideEvent = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    logger.info(`[Admin] Rejecting ride event ${id}`);

    const rideEvent = await RideEvent.findById(id);

    if (!rideEvent) {
      res.status(404).json({
        success: false,
        message: "Ride event not found",
      });
      return;
    }

    // Only paid events need approval/rejection
    if (rideEvent.privacy !== "private" || rideEvent.price === 0) {
      res.status(400).json({
        success: false,
        message: "Only paid events require approval",
      });
      return;
    }

    rideEvent.approved = false;
    rideEvent.status = "CANCELLED";
    await rideEvent.save();

    // TODO: Notify organizer about rejection with reason

    logger.info(`[Admin] Ride event ${id} rejected successfully`);

    res.status(200).json({
      success: true,
      message: "Ride event rejected successfully",
      data: rideEvent,
    });
  } catch (error: any) {
    logger.error(`rejectRideEvent error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Failed to reject ride event",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * @route   PATCH /api/v1/admin/ride-events/:id/cancel
 * @desc    Cancel a ride event
 * @access  Admin
 */
export const cancelRideEvent = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    logger.info(`[Admin] Cancelling ride event ${id}`);

    const rideEvent = await RideEvent.findById(id);

    if (!rideEvent) {
      res.status(404).json({
        success: false,
        message: "Ride event not found",
      });
      return;
    }

    if (rideEvent.status === "CANCELLED") {
      res.status(400).json({
        success: false,
        message: "Ride event is already cancelled",
      });
      return;
    }

    if (rideEvent.status === "COMPLETED") {
      res.status(400).json({
        success: false,
        message: "Cannot cancel a completed ride event",
      });
      return;
    }

    rideEvent.status = "CANCELLED";
    await rideEvent.save();

    // TODO: Notify all participants about cancellation
    // TODO: Process refunds if it's a paid event

    logger.info(`[Admin] Ride event ${id} cancelled successfully`);

    res.status(200).json({
      success: true,
      message: "Ride event cancelled successfully",
      data: rideEvent,
    });
  } catch (error: any) {
    logger.error(`cancelRideEvent error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Failed to cancel ride event",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * @route   GET /api/v1/admin/ride-events/stats
 * @desc    Get ride events statistics
 * @access  Admin
 */
export const getRideEventsStats = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const [
      totalEvents,
      scheduledEvents,
      liveEvents,
      completedEvents,
      cancelledEvents,
      paidEvents,
      pendingApproval,
    ] = await Promise.all([
      RideEvent.countDocuments(),
      RideEvent.countDocuments({ status: "SCHEDULED" }),
      RideEvent.countDocuments({ status: "LIVE" }),
      RideEvent.countDocuments({ status: "COMPLETED" }),
      RideEvent.countDocuments({ status: "CANCELLED" }),
      RideEvent.countDocuments({ privacy: "private", price: { $gt: 0 } }),
      RideEvent.countDocuments({
        privacy: "private",
        price: { $gt: 0 },
        approved: false,
      }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalEvents,
        scheduledEvents,
        liveEvents,
        completedEvents,
        cancelledEvents,
        paidEvents,
        pendingApproval,
      },
    });
  } catch (error: any) {
    logger.error(`getRideEventsStats error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Failed to fetch ride events statistics",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};
