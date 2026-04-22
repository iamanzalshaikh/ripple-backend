/**
 * Unified Notification Service
 * Handles all notification types consistently:
 * - Saves to MongoDB
 * - Sends Socket.io notifications (if user online)
 * - Sends push notifications via Expo
 * - Implements chat message batching to reduce spam
 */

import { Types } from "mongoose";
import Notification from "../models/notification.model.js";
import {
  sendPushNotificationToUser,
  formatNotification,
} from "./push-notification.service.js";
import { sendNotificationToUser as sendSocketNotification } from "../config/socket.js";
import logger from "../config/logger.js";
import type { Server as SocketIOServer } from "socket.io";

// ============================================
// TYPES
// ============================================

export interface SendNotificationOptions {
  userId: string; // Recipient user ID
  type:
    | "follow"
    | "unfollow"
    | "like"
    | "comment"
    | "tag"
    | "sos"
    | "ride"
    | "event"
    | "group"
    | "mentor"
    | "chat";
  fromUserId?: string; // Sender user ID
  fromUserName?: string; // Sender name
  message: string; // Human-readable message
  data?: Record<string, any>; // Additional data (postId, commentId, etc.)
  io?: SocketIOServer | null; // Socket.io instance
  priority?: "default" | "normal" | "high";
  batching?: {
    enabled: boolean;
    windowMs?: number; // Batching window (default 20000ms / 20 seconds)
    threadId?: string; // Grouping ID for batching
  };
}

// ============================================
// MESSAGE BATCHING
// ============================================

interface BatchedMessage {
  messages: string[];
  sender: { id: string; name: string };
  timeout: NodeJS.Timeout;
  count: number;
  data: Record<string, any>;
  userId: string;
  type: string;
  io?: SocketIOServer | null;
  priority?: string;
}

// In-memory cache for batching messages
const messageBatches = new Map<string, BatchedMessage>();

/**
 * Add message to batch or send immediately if batching disabled
 */
const handleBatchedNotification = async (
  options: SendNotificationOptions
): Promise<void> => {
  const {
    batching,
    userId,
    fromUserId,
    fromUserName,
    message,
    data,
    type,
    io,
    priority,
  } = options;

  if (!batching?.enabled || !batching.threadId) {
    // No batching - send immediately
    await sendNotificationImmediately(options);
    return;
  }

  const batchKey = `${userId}:${batching.threadId}`;
  const existingBatch = messageBatches.get(batchKey);

  if (existingBatch) {
    // Add to existing batch
    existingBatch.messages.push(message);
    existingBatch.count++;

    // Clear old timeout
    clearTimeout(existingBatch.timeout);

    // Set new timeout
    existingBatch.timeout = setTimeout(() => {
      sendBatchedMessages(batchKey);
    }, batching.windowMs || 20000); // Default 20 seconds
  } else {
    // Create new batch
    const timeout = setTimeout(() => {
      sendBatchedMessages(batchKey);
    }, batching.windowMs || 20000); // Default 20 seconds

    messageBatches.set(batchKey, {
      messages: [message],
      sender: { id: fromUserId!, name: fromUserName! },
      timeout,
      count: 1,
      data: data || {},
      userId,
      type,
      io,
      priority,
    });
  }

  logger.info(
    `[Notification] Added message to batch: ${batchKey} (${existingBatch ? existingBatch.count : 1} messages)`
  );
};

/**
 * Send batched messages as single notification
 */
const sendBatchedMessages = async (batchKey: string): Promise<void> => {
  const batch = messageBatches.get(batchKey);
  if (!batch) return;

  try {
    const { userId, sender, messages, count, data, type, io, priority } = batch;

    // Format message based on count
    let notificationMessage: string;
    let notificationBody: string;

    if (count === 1) {
      // Single message - send as-is
      notificationMessage = messages[0];
      notificationBody = messages[0];
    } else {
      // Multiple messages - group them
      notificationMessage = `${sender.name} sent ${count} messages`;
      notificationBody = `${messages[messages.length - 1]} (+ ${count - 1} more)`;
    }

    // Send via unified service (without batching to avoid infinite loop)
    await sendNotificationImmediately({
      userId,
      type: type as any,
      fromUserId: sender.id,
      fromUserName: sender.name,
      message: notificationMessage,
      data: {
        ...data,
        messageCount: count,
        latestMessage: messages[messages.length - 1],
      },
      io,
      priority: priority as any,
    });

    logger.info(
      `[Notification] Sent batched notification: ${batchKey} (${count} messages)`
    );
  } catch (error: any) {
    logger.error(
      `[Notification] Error sending batched messages: ${error.message}`
    );
  } finally {
    // Clear batch
    messageBatches.delete(batchKey);
  }
};

// ============================================
// MAIN NOTIFICATION FUNCTION
// ============================================

/**
 * Send notification via all channels (DB, Socket.io, Push)
 */
export const sendNotification = async (
  options: SendNotificationOptions
): Promise<void> => {
  // Handle batching if enabled
  if (options.batching?.enabled) {
    await handleBatchedNotification(options);
    return;
  }

  // Send immediately (no batching)
  await sendNotificationImmediately(options);
};

/**
 * Send notification immediately (no batching)
 */
const sendNotificationImmediately = async (
  options: SendNotificationOptions
): Promise<void> => {
  const {
    userId,
    type,
    fromUserId,
    fromUserName,
    message,
    data,
    io,
    priority,
  } = options;

  try {
    // STEP 1: Save to MongoDB
    try {
      const notificationDoc = new Notification({
        userId,
        type,
        fromUserId: fromUserId ? new Types.ObjectId(fromUserId) : undefined,
        fromUserName,
        ...(data?.fromUserAvatar && { fromUserAvatar: data.fromUserAvatar }),
        message,
        read: false,
        // Spread additional data (postId, commentId, etc.)
        ...(data?.postId && { postId: new Types.ObjectId(data.postId) }),
        ...(data?.commentId && {
          commentId: new Types.ObjectId(data.commentId),
        }),
        ...(data?.rideEventId && {
          rideEventId: new Types.ObjectId(data.rideEventId),
        }),
        ...(data?.commentText && { commentText: data.commentText }),
      });
      await notificationDoc.save();
      logger.info(
        `[Notification] Saved ${type} notification to DB for user ${userId}`
      );
    } catch (dbError: any) {
      logger.error(`[Notification] DB save error: ${dbError.message}`);
      // Continue even if DB save fails
    }

    // STEP 2: Send Socket.io notification (if user online)
    if (io) {
      try {
        sendSocketNotification(io, userId, {
          type: type as any,
          message,
          fromUserId,
          fromUserName,
          fromUserAvatar: data?.fromUserAvatar,
          ...data,
        });
        logger.info(
          `[Notification] Sent Socket.io ${type} notification to user ${userId}`
        );
      } catch (socketError: any) {
        logger.error(`[Notification] Socket.io error: ${socketError.message}`);
        // Continue even if Socket.io fails
      }
    }

    // STEP 3: Send push notification
    try {
      const { title, body } = formatNotification(type, {
        fromUserName,
        ...data,
      });

      await sendPushNotificationToUser(userId, {
        title,
        body,
        data: {
          type,
          ...data,
        },
        sound: "default",
        badge: 1,
        priority: priority || "default",
        threadId: data?.threadId || data?.roomId || data?.groupId, // iOS grouping
        channelId: type === "chat" ? "chat" : "default", // Android channel
        tag: data?.roomId || data?.groupId, // Android: replaces notifications with same tag
      });
      logger.info(
        `[Notification] Sent push ${type} notification to user ${userId}`
      );
    } catch (pushError: any) {
      logger.error(
        `[Notification] Push notification error: ${pushError.message}`
      );
      // Don't throw - push failures shouldn't break the flow
    }
  } catch (error: any) {
    logger.error(`[Notification] Error sending notification: ${error.message}`);
    // Don't throw - we don't want to fail the original operation
  }
};

/**
 * Clear all batched messages (useful for cleanup/testing)
 */
export const clearMessageBatches = (): void => {
  messageBatches.forEach((batch) => {
    clearTimeout(batch.timeout);
  });
  messageBatches.clear();
  logger.info("[Notification] Cleared all message batches");
};
