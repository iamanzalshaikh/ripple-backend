import { Response } from "express";
import { AdminAuthRequest } from "../middlewares/adminAuth.middleware.js";
import logger from "../config/logger.js";
import RideEvent from "../models/rideEvent.model.js";
import Payment from "../models/payment.model.js";
import mongoose from "mongoose";

/**
 * Admin Payments Controller
 * Handles payment and revenue analytics for admin panel
 */

/**
 * @route   GET /api/admin/payments/events
 * @desc    Get all paid ride events with revenue calculations
 * @access  Admin
 */
export const getPaidRideEvents = async (
  req: AdminAuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = (req.query.search as string) || "";
    const status = req.query.status as string;
    const sortBy = (req.query.sortBy as string) || "scheduledAt";
    const sortOrder = (req.query.sortOrder as string) === "asc" ? 1 : -1;

    // Build match query for paid events only
    const matchQuery: any = {
      privacy: "private",
      price: { $gt: 0 },
    };

    // Filter by status if provided
    if (status) {
      matchQuery.status = status;
    }

    // Search by title if provided
    if (search) {
      matchQuery.title = { $regex: search, $options: "i" };
    }

    const skip = (page - 1) * limit;

    // Aggregation pipeline to get events with revenue
    const events = await RideEvent.aggregate([
      { $match: matchQuery },
      {
        $lookup: {
          from: "users",
          localField: "organizerId",
          foreignField: "_id",
          as: "organizer",
        },
      },
      { $unwind: "$organizer" },
      {
        $addFields: {
          participantCount: { $size: "$participants" },
          totalRevenue: {
            $multiply: ["$price", { $size: "$participants" }],
          },
        },
      },
      {
        $project: {
          _id: 1,
          title: 1,
          price: 1,
          participantCount: 1,
          totalRevenue: 1,
          status: 1,
          scheduledAt: 1,
          location: 1,
          category: 1,
          "organizer._id": 1,
          "organizer.name": 1,
          "organizer.avatarUrl": 1,
        },
      },
      { $sort: { [sortBy]: sortOrder } },
      { $skip: skip },
      { $limit: limit },
    ]);

    // Get total count for pagination
    const totalCount = await RideEvent.countDocuments(matchQuery);
    const totalPages = Math.ceil(totalCount / limit);

    logger.info(
      `[getPaidRideEvents] Retrieved ${events.length} paid events (page ${page})`,
    );

    res.status(200).json({
      success: true,
      data: {
        events,
        pagination: {
          page,
          limit,
          total: totalCount,
          totalPages,
        },
      },
    });
  } catch (error: any) {
    logger.error(`getPaidRideEvents error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Failed to fetch paid ride events",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * @route   GET /api/admin/payments/events/:eventId
 * @desc    Get detailed payment information for a specific ride event
 * @access  Admin
 */
export const getRideEventPaymentDetails = async (
  req: AdminAuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const { eventId } = req.params;

    // Validate eventId
    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      res.status(400).json({
        success: false,
        message: "Invalid event ID",
      });
      return;
    }

    // Fetch event details
    const event = await RideEvent.findById(eventId)
      .populate("organizerId", "name email avatarUrl")
      .lean();

    if (!event) {
      res.status(404).json({
        success: false,
        message: "Event not found",
      });
      return;
    }

    // Fetch all payments for this event
    const payments = await Payment.find({ rideEventId: eventId })
      .populate("userId", "name email avatarUrl")
      .sort({ createdAt: -1 })
      .lean();

    // Calculate revenue breakdown by status
    const revenueStats = await Payment.aggregate([
      { $match: { rideEventId: new mongoose.Types.ObjectId(eventId) } },
      {
        $group: {
          _id: "$status",
          total: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
    ]);

    // Format revenue breakdown
    const revenue = {
      total: (event as any).price * event.participants.length, // Calculate from event price × participants
      paid: 0,
      pending: 0,
      refunded: 0,
    };

    revenueStats.forEach((stat) => {
      if (stat._id === "paid") revenue.paid = stat.total;
      if (stat._id === "pending") revenue.pending = stat.total;
      if (stat._id === "refunded") revenue.refunded = stat.total;
    });

    // Calculate participant stats
    const stats = {
      totalParticipants: event.participants.length,
      paidParticipants: payments.filter((p: any) => p.status === "paid").length,
      pendingPayments: payments.filter((p: any) => p.status === "pending")
        .length,
    };

    logger.info(
      `[getRideEventPaymentDetails] Retrieved payment details for event ${eventId}`,
    );

    res.status(200).json({
      success: true,
      data: {
        event,
        payments,
        revenue,
        stats,
      },
    });
  } catch (error: any) {
    logger.error(`getRideEventPaymentDetails error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Failed to fetch event payment details",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * @route   GET /api/admin/payments/revenue
 * @desc    Get overall revenue analytics with optional date filtering
 * @access  Admin
 */
export const getRevenueAnalytics = async (
  req: AdminAuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const startDate = req.query.startDate
      ? new Date(req.query.startDate as string)
      : null;
    const endDate = req.query.endDate
      ? new Date(req.query.endDate as string)
      : null;
    const groupBy = (req.query.groupBy as string) || "day";

    // Build date filter
    const dateFilter: any = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.$gte = startDate;
      if (endDate) dateFilter.createdAt.$lte = endDate;
    }

    // Get overall revenue metrics
    const overallStats = await Payment.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$amount" },
          totalPayments: { $sum: 1 },
        },
      },
    ]);

    const totalRevenue = overallStats[0]?.totalRevenue || 0;
    const totalPayments = overallStats[0]?.totalPayments || 0;

    // Get revenue by status
    const revenueByStatus = await Payment.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: "$status",
          total: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
    ]);

    const statusBreakdown = {
      paid: 0,
      pending: 0,
      refunded: 0,
    };

    revenueByStatus.forEach((stat) => {
      if (stat._id === "paid") statusBreakdown.paid = stat.total;
      if (stat._id === "pending") statusBreakdown.pending = stat.total;
      if (stat._id === "refunded") statusBreakdown.refunded = stat.total;
    });

    // Count total paid events
    const totalEvents = await RideEvent.countDocuments({
      privacy: "private",
      price: { $gt: 0 },
      ...(startDate || endDate
        ? {
            createdAt: {
              ...(startDate ? { $gte: startDate } : {}),
              ...(endDate ? { $lte: endDate } : {}),
            },
          }
        : {}),
    });

    // Get total participants in paid events
    const participantStats = await RideEvent.aggregate([
      {
        $match: {
          privacy: "private",
          price: { $gt: 0 },
          ...(startDate || endDate
            ? {
                createdAt: {
                  ...(startDate ? { $gte: startDate } : {}),
                  ...(endDate ? { $lte: endDate } : {}),
                },
              }
            : {}),
        },
      },
      {
        $group: {
          _id: null,
          totalParticipants: { $sum: { $size: "$participants" } },
        },
      },
    ]);

    const totalParticipants = participantStats[0]?.totalParticipants || 0;

    // Calculate average revenue per event
    const averageRevenuePerEvent =
      totalEvents > 0 ? totalRevenue / totalEvents : 0;

    // Get revenue timeline based on groupBy parameter
    let dateFormat = "%Y-%m-%d"; // day
    if (groupBy === "week") dateFormat = "%Y-W%V";
    if (groupBy === "month") dateFormat = "%Y-%m";

    const timeline = await Payment.aggregate([
      { $match: { ...dateFilter, status: "paid" } },
      {
        $group: {
          _id: {
            $dateToString: { format: dateFormat, date: "$createdAt" },
          },
          revenue: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const formattedTimeline = timeline.map((item) => ({
      date: item._id,
      revenue: item.revenue,
      events: item.count,
    }));

    logger.info(
      `[getRevenueAnalytics] Retrieved revenue analytics (Total: ₹${totalRevenue})`,
    );

    res.status(200).json({
      success: true,
      data: {
        totalRevenue,
        totalEvents,
        totalParticipants,
        averageRevenuePerEvent: Math.round(averageRevenuePerEvent * 100) / 100,
        revenueByStatus: statusBreakdown,
        timeline: formattedTimeline,
      },
    });
  } catch (error: any) {
    logger.error(`getRevenueAnalytics error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Failed to fetch revenue analytics",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};
