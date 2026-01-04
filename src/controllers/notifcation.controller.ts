// ==========================================
// FINAL CODE - PART 3: NOTIFICATION CONTROLLER + SETUP
// ==========================================

// ==========================================
// File: src/controllers/notification.controller.ts
// ==========================================
import { Request, Response } from 'express';
import { Server as SocketIOServer } from 'socket.io';

import logger from '../config/logger.js';
import Notification from '../models/notification.model';
import app from '../app.js';

interface AuthRequest extends Request {
  userId: string;
}

/**
 * GET /api/v1/notifications
 * Get user notifications with filters
 */
export const getNotifications = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { page = 1, limit = 20, unread = false } = req.query;

    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(100, parseInt(limit as string) || 20);
    const skip = (pageNum - 1) * limitNum;

    const filter: any = { userId };
    if (unread === 'true') {
      filter.read = false;
    }

    const notifications = await Notification.find(filter)
      .populate('fromUserId', 'name avatar handle')
      .populate('postId', 'caption media')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    const total = await Notification.countDocuments(filter);
    const unreadCount = await Notification.countDocuments({ userId, read: false });

    logger.info(`[getNotifications] Retrieved ${notifications.length} for user ${userId}`);

    return res.json({
      success: true,
      data: notifications,
      unreadCount,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error: any) {
    logger.error(`[getNotifications] Error: ${error.message}`);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * PATCH /api/v1/notifications/:id/read
 * Mark single notification as read
 */
export const markNotificationRead = async (req: AuthRequest, res: Response) => {
  try {
    const notificationId = req.params.id;
    const userId = req.userId;

    const notification = await Notification.findOne({ _id: notificationId, userId });
    if (!notification) {
      return res.status(404).json({ success: false, error: 'Notification not found' });
    }

    notification.read = true;
    notification.readAt = new Date();
    await notification.save();

    logger.info(`[markNotificationRead] Notification ${notificationId} marked as read`);

    return res.json({ success: true, data: notification });
  } catch (error: any) {
    logger.error(`[markNotificationRead] Error: ${error.message}`);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * PATCH /api/v1/notifications/read-all
 * Mark all notifications as read
 */
export const markAllNotificationsRead = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;

    await Notification.updateMany(
      { userId, read: false },
      { read: true, readAt: new Date() }
    );

    logger.info(`[markAllNotificationsRead] All marked as read for user ${userId}`);

    return res.json({ success: true, data: { message: 'All marked as read' } });
  } catch (error: any) {
    logger.error(`[markAllNotificationsRead] Error: ${error.message}`);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * POST /api/v1/notifications/test
 * Test endpoint to send a real-time notification via Socket.io
 * This endpoint is for testing Socket.io functionality
 */
export const testNotification = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { message } = req.body;

    // Get Socket.io instance from app
    const io = (app as any).io as SocketIOServer | null;

    if (!io) {
      logger.warn('[testNotification] Socket.io not available');
      return res.status(503).json({
        success: false,
        error: 'Socket.io server not initialized'
      });
    }

    // Create test notification in DB
    const testNotification = await Notification.create({
      userId,
      type: 'ride_share',
      message: message || '🧪 Test notification - Socket.io is working!',
      read: false
    });

    logger.info(`[testNotification] Test notification ${testNotification._id} created in DB`);

    // Send real-time notification via Socket.io
    const notificationData = {
      _id: testNotification._id,
      type: 'ride_share' as const,
      message: message || '🧪 Test notification - Socket.io is working!',
      timestamp: new Date(),
      read: false
    };

    io.to(`user:${userId}`).emit('notification', notificationData);

    logger.info(`[testNotification] ✅ Real-time notification sent to user ${userId} via Socket.io`);

    return res.json({
      success: true,
      message: 'Test notification sent successfully',
      data: {
        notification: notificationData,
        socketConnected: true,
        socketRoom: `user:${userId}`
      }
    });
  } catch (error: any) {
    logger.error(`[testNotification] Error: ${error.message}`);
    return res.status(500).json({ success: false, error: error.message });
  }
};
