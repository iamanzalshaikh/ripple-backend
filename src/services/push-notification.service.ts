/**
 * Push Notification Service
 * Handles sending push notifications using Expo Push Notification service
 */

import { Expo, ExpoPushMessage, ExpoPushTicket } from "expo-server-sdk";
import logger from "../config/logger.js";
import User from "../models/user.model.js";

// Initialize Expo SDK client
const expo = new Expo();

export interface PushNotificationPayload {
  to: string | string[]; // Expo push token(s)
  title: string;
  body: string;
  data?: any;
  sound?: "default" | null;
  badge?: number;
  priority?: "default" | "normal" | "high";
  threadId?: string; // For grouping notifications (iOS)
  channelId?: string; // Android notification channel
  tag?: string; // Android notification tag (replaces notifications with same tag)
}

/**
 * Send push notification to single or multiple users
 */
export const sendPushNotification = async (
  payload: PushNotificationPayload,
): Promise<void> => {
  try {
    const tokens = Array.isArray(payload.to) ? payload.to : [payload.to];

    // Filter out invalid tokens
    const validTokens = tokens.filter((token) => Expo.isExpoPushToken(token));

    if (validTokens.length === 0) {
      logger.warn("[Push] No valid Expo push tokens provided");
      return;
    }

    // Construct messages
    const messages: ExpoPushMessage[] = validTokens.map((token) => ({
      to: token,
      sound: payload.sound || "default",
      title: payload.title,
      body: payload.body,
      data: payload.data || {},
      badge: payload.badge,
      priority: payload.priority || "default",
      channelId: payload.channelId || payload.threadId, // Android notification channel

      // Platform-specific grouping
      ...(payload.threadId && { threadId: payload.threadId }), // iOS grouping
      ...(payload.tag && {
        android: {
          channelId: payload.channelId || "default",
          tag: payload.tag, // Android: replaces notifications with same tag
        },
      }),
    }));

    // Send notifications in chunks (Expo recommends max 100 per request)
    const chunks = expo.chunkPushNotifications(messages);
    const tickets: ExpoPushTicket[] = [];

    for (const chunk of chunks) {
      try {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);
      } catch (error: any) {
        logger.error(`[Push] Error sending chunk: ${error.message}`);
      }
    }

    // Check for errors in tickets
    for (let i = 0; i < tickets.length; i++) {
      const ticket = tickets[i];
      if (ticket.status === "error") {
        logger.error(`[Push] Ticket error: ${ticket.message}`);

        // If token is invalid, remove it from user's pushTokens
        if (ticket.details?.error === "DeviceNotRegistered") {
          await removeInvalidPushToken(validTokens[i]);
        }
      }
    }

    logger.info(`[Push] Sent ${validTokens.length} notifications successfully`);
  } catch (error: any) {
    logger.error(`[Push] Error sending push notification: ${error.message}`);
  }
};

/**
 * Send notification to user by userId
 */
export const sendPushNotificationToUser = async (
  userId: string,
  notification: Omit<PushNotificationPayload, "to">,
): Promise<void> => {
  try {
    const user = await User.findById(userId).select("pushTokens").lean();

    if (!user || !user.pushTokens || user.pushTokens.length === 0) {
      logger.warn(`[Push] No push tokens found for user ${userId}`);
      return;
    }

    await sendPushNotification({
      to: user.pushTokens,
      ...notification,
    });
  } catch (error: any) {
    logger.error(`[Push] Error sending to user ${userId}: ${error.message}`);
  }
};

/**
 * Send notification to multiple users
 */
export const sendPushNotificationToUsers = async (
  userIds: string[],
  notification: Omit<PushNotificationPayload, "to">,
): Promise<void> => {
  try {
    const users = await User.find({ _id: { $in: userIds } })
      .select("pushTokens")
      .lean();

    const allTokens: string[] = [];
    users.forEach((user) => {
      if (user.pushTokens && user.pushTokens.length > 0) {
        allTokens.push(...user.pushTokens);
      }
    });

    if (allTokens.length === 0) {
      logger.warn("[Push] No push tokens found for users");
      return;
    }

    await sendPushNotification({
      to: allTokens,
      ...notification,
    });
  } catch (error: any) {
    logger.error(`[Push] Error sending to users: ${error.message}`);
  }
};

/**
 * Remove invalid push token from user document
 */
const removeInvalidPushToken = async (token: string): Promise<void> => {
  try {
    await User.updateMany(
      { pushTokens: token },
      { $pull: { pushTokens: token } },
    );
    logger.info(`[Push] Removed invalid token: ${token}`);
  } catch (error: any) {
    logger.error(`[Push] Error removing invalid token: ${error.message}`);
  }
};

/**
 * Helper function to create notification title/body based on type
 */
export const formatNotification = (
  type: string,
  data: any,
): Pick<PushNotificationPayload, "title" | "body"> => {
  switch (type) {
    case "follow":
      return {
        title: "New Follower",
        body: `${data.fromUserName} started following you`,
      };
    case "like":
      return {
        title: "New Like",
        body: `${data.fromUserName} liked your post`,
      };
    case "comment":
      return {
        title: "New Comment",
        body: `${data.fromUserName} commented: "${data.commentText}"`,
      };
    case "tag":
      return {
        title: "Tagged in Post",
        body: `${data.fromUserName} tagged you in a post`,
      };
    case "group":
      return {
        title: "Group Update",
        body: data.message || "You have a new group notification",
      };
    case "chat":
      return {
        title: data.senderName || "New Message",
        body:
          data.messageCount > 1
            ? `${data.text} (+ ${data.messageCount - 1} more)`
            : data.text,
      };
    case "ride":
      return {
        title: "Ride Event",
        body: data.message || "You have a new ride notification",
      };
    case "sos":
      return {
        title: "🚨 SOS ALERT",
        body: `${data.userName} triggered an emergency alert!`,
      };
    default:
      return {
        title: "Notification",
        body: data.message || "You have a new notification",
      };
  }
};
