/**
 * File: src/config/socket.ts
 * Complete Socket.io server with:
 * - Authentication
 * - Notifications
 * - Ride Events (chat, GPS, SOS)
 * - Groups (chat, typing)
 * - Private Chat (1:1 messaging)
 */

import { Server as HTTPServer } from "http";
import { Server as SocketIOServer, Socket } from "socket.io";
import logger from "./logger.js";
import { verifyUserAccessToken, UserTokenPayload } from "../utils/jwt.js";
import ChatMessage from "../models/chatMessage.model.js";
import RideEvent from "../models/rideEvent.model.js";
import Group from "../models/group.model.js";
import User from "../models/user.model.js";
import PrivateChatRoom from "../models/private.model.js";

export interface AuthenticatedSocket extends Socket {
  data: {
    userId: string;
    phone: string;
  };
}

/**
 * Initialize Socket.io server with authentication
 * Supports: Notifications, Ride Events, Groups, Private Chat
 */
export const initializeSocket = (httpServer: HTTPServer): SocketIOServer => {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || "http://localhost:3000",
      methods: ["GET", "POST"],
      credentials: true,
    },
    transports: ["websocket", "polling"],
    pingInterval: 25000,
    pingTimeout: 20000,
  });

  // ==================== AUTHENTICATION MIDDLEWARE ====================
  io.use((socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token;

      if (!token) {
        logger.warn("[Socket Auth] No token provided");
        return next(new Error("No token provided"));
      }

      const decoded = verifyUserAccessToken(token) as UserTokenPayload;

      if (!decoded || !decoded.userId) {
        logger.warn("[Socket Auth] Invalid token");
        return next(new Error("Invalid token"));
      }

      socket.data.userId = decoded.userId;
      socket.data.phone = decoded.phone;

      logger.info(
        `[Socket Auth] User ${decoded.userId} authenticated (Socket ID: ${socket.id})`,
      );
      next();
    } catch (error: any) {
      logger.error(`[Socket Auth] Error: ${error.message}`);
      next(new Error("Authentication failed"));
    }
  });

  // ==================== CONNECTION HANDLER ====================
  io.on("connection", (socket: AuthenticatedSocket) => {
    const userId = socket.data.userId;

    // Join user-specific room for direct notifications (e.g., unread count updates)
    socket.join(`user:${userId}`);

    logger.info(`[Socket] User ${userId} connected`);

    // ==================== NOTIFICATIONS ====================

    // ==================== HEARTBEAT ====================
    socket.on("ping", () => {
      socket.emit("pong");
      logger.debug(`[Socket Ping] User ${userId}`);
    });

    // ==================== RIDE EVENTS ====================

    /**
     * Join ride event chat
     */
    socket.on("join-ride", async (data: { rideEventId: string }) => {
      try {
        const { rideEventId } = data;

        // Verify user is participant
        const ride = await RideEvent.findById(rideEventId);
        if (!ride) {
          socket.emit("error", { message: "Ride not found" });
          return;
        }

        const isParticipant = ride.participants.some(
          (p: any) => p.userId.toString() === userId,
        );
        if (!isParticipant) {
          socket.emit("error", { message: "Not a participant in this ride" });
          return;
        }

        socket.join(`ride:${rideEventId}`);

        socket.to(`ride:${rideEventId}`).emit("user-joined", {
          userId,
          message: "User joined the ride",
          timestamp: new Date(),
        });

        socket.emit("join-success", {
          rideEventId,
          message: "Successfully joined ride chat",
        });

        logger.info(`[join-ride] User ${userId} joined ride ${rideEventId}`);
      } catch (error: any) {
        logger.error(`[join-ride] Error: ${error.message}`);
        socket.emit("error", { message: error.message });
      }
    });

    /**
     * Listen for follow notification
     * Emitted by backend when user A follows user B
     * User B receives: "User A started following you"
     */
    socket.on(
      "follow-notification",
      async (data: {
        followedUserId: string;
        followerUserId: string;
        followerName: string;
        followerAvatar?: string;
      }) => {
        try {
          const {
            followedUserId,
            followerUserId,
            followerName,
            followerAvatar,
          } = data;

          logger.info(
            `[follow-notification] ${followerUserId} followed ${followedUserId}`,
          );

          // Get follower details
          const follower = await User.findById(followerUserId)
            .select("name avatarUrl handle")
            .lean();

          // Emit to followed user's room (in-app notification)
          io.to(`user:${followedUserId}`).emit("notification", {
            type: "follow",
            id: `notif_${Date.now()}`,
            message: `${follower?.name || "A user"} started following you`,
            fromUserId: followerUserId,
            fromUserName: follower?.name,
            fromUserHandle: follower?.handle,
            fromUserAvatar: follower?.avatarUrl,
            timestamp: new Date(),
            actionUrl: `/profile/${follower?.handle || followerUserId}`,
          });

          // Send push notification
          const { sendPushNotificationToUser } =
            await import("../services/push-notification.service.js");
          await sendPushNotificationToUser(followedUserId, {
            title: "New Follower",
            body: `${follower?.name || "A user"} started following you`,
            data: {
              type: "follow",
              userId: followerUserId,
              userName: follower?.name,
              userHandle: follower?.handle,
              actionUrl: `/profile/${follower?.handle || followerUserId}`,
            },
            sound: "default",
            badge: 1,
          });

          logger.debug(
            `[follow-notification] Notification sent to ${followedUserId}`,
          );
        } catch (error: any) {
          logger.error(`[follow-notification] Error: ${error.message}`);
          socket.emit("error", { message: error.message });
        }
      },
    );

    /**
     * Listen for unfollow notification (optional)
     * When user unfollows, you can optionally notify
     */
    socket.on(
      "unfollow-notification",
      async (data: {
        unfollowedUserId: string;
        unfollowerUserId: string;
        unfollowerName: string;
      }) => {
        try {
          const { unfollowedUserId, unfollowerUserId, unfollowerName } = data;

          logger.info(
            `[unfollow-notification] ${unfollowerUserId} unfollowed ${unfollowedUserId}`,
          );

          // Optional: You can emit this if you want to show unfollows
          // Most apps don't notify on unfollow
          io.to(`user:${unfollowedUserId}`).emit("notification", {
            type: "unfollow",
            id: `notif_${Date.now()}`,
            message: `${unfollowerName} unfollowed you`,
            fromUserId: unfollowerUserId,
            timestamp: new Date(),
          });

          logger.debug(
            `[unfollow-notification] Notification sent to ${unfollowedUserId}`,
          );
        } catch (error: any) {
          logger.error(`[unfollow-notification] Error: ${error.message}`);
        }
      },
    );

    /**
     * Leave ride event chat
     */
    socket.on("leave-ride", (data: { rideEventId: string }) => {
      try {
        const { rideEventId } = data;
        socket.leave(`ride:${rideEventId}`);

        socket.to(`ride:${rideEventId}`).emit("user-left", {
          userId,
          message: "User left the ride",
          timestamp: new Date(),
        });

        logger.info(`[leave-ride] User ${userId} left ride ${rideEventId}`);
      } catch (error: any) {
        logger.error(`[leave-ride] Error: ${error.message}`);
      }
    });

    /**
     * Send message in ride chat
     */
    socket.on(
      "send-message-ride",
      async (data: { rideEventId: string; text: string }) => {
        try {
          const { rideEventId, text } = data;

          if (!text || text.trim().length === 0) {
            socket.emit("error", { message: "Message cannot be empty" });
            return;
          }

          if (text.length > 500) {
            socket.emit("error", {
              message: "Message too long (max 500 chars)",
            });
            return;
          }

          // Verify user is participant
          const ride = await RideEvent.findById(rideEventId);
          if (!ride) {
            socket.emit("error", { message: "Ride not found" });
            return;
          }

          const isParticipant = ride.participants.some(
            (p: any) => p.userId.toString() === userId,
          );
          if (!isParticipant) {
            socket.emit("error", { message: "Not a participant" });
            return;
          }

          // Get sender info
          const sender = await User.findById(userId)
            .select("name avatarUrl")
            .lean();

          // Save to database
          const message = await ChatMessage.create({
            rideEventId,
            roomType: "ride",
            senderId: userId,
            text: text.trim(),
            timestamp: new Date(),
          });

          // Broadcast to all in ride
          io.to(`ride:${rideEventId}`).emit("new-message-ride", {
            _id: message._id,
            senderId: userId,
            senderName: sender?.name,
            senderAvatar: sender?.avatarUrl,
            text: message.text,
            timestamp: new Date(),
          });

          logger.debug(`[send-message-ride] Message in ride ${rideEventId}`);
        } catch (error: any) {
          logger.error(`[send-message-ride] Error: ${error.message}`);
          socket.emit("error", { message: error.message });
        }
      },
    );

    /**
     * Stream GPS location during ride
     */
    socket.on(
      "location-update",
      (data: {
        rideEventId: string;
        lat: number;
        lng: number;
        speed: number;
      }) => {
        try {
          const { rideEventId, lat, lng, speed } = data;

          if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
            socket.emit("error", { message: "Invalid coordinates" });
            return;
          }

          io.to(`ride:${rideEventId}`).emit("user-location", {
            userId,
            lat,
            lng,
            speed,
            timestamp: new Date(),
          });

          logger.debug(
            `[location-update] Location from ${userId} in ride ${rideEventId}`,
          );
        } catch (error: any) {
          logger.error(`[location-update] Error: ${error.message}`);
        }
      },
    );

    /**
     * SOS emergency alert
     */
    socket.on(
      "sos-triggered",
      async (data: { rideEventId: string; lat: number; lng: number }) => {
        try {
          const { rideEventId, lat, lng } = data;

          const user = await User.findById(userId)
            .select("name avatarUrl")
            .lean();

          // Get ride event to notify all participants
          const ride = await RideEvent.findById(rideEventId)
            .select("participants")
            .lean();
          const participantIds =
            ride?.participants
              .map((p: any) => p.userId.toString())
              .filter((id: string) => id !== userId) || [];

          // Emit to ride room (in-app notification)
          io.to(`ride:${rideEventId}`).emit("sos-alert", {
            userId,
            userName: user?.name,
            userAvatar: user?.avatarUrl,
            lat,
            lng,
            message: `🚨 SOS triggered by ${user?.name}!`,
            timestamp: new Date(),
          });

          // Send HIGH PRIORITY push notifications to all participants
          const { sendPushNotificationToUsers } =
            await import("../services/push-notification.service.js");
          await sendPushNotificationToUsers(participantIds, {
            title: "🚨 SOS ALERT",
            body: `${user?.name || "A rider"} triggered an emergency alert!`,
            data: {
              type: "sos",
              rideEventId,
              userId,
              userName: user?.name,
              lat,
              lng,
              actionUrl: `/rides/live?rideId=${rideEventId}`,
            },
            sound: "default",
            priority: "high", // HIGH PRIORITY for emergencies
            badge: 1,
          });

          logger.warn(
            `[sos-triggered] SOS from ${userId} in ride ${rideEventId}`,
          );
        } catch (error: any) {
          logger.error(`[sos-triggered] Error: ${error.message}`);
        }
      },
    );

    /**
     * Ride typing indicator
     */
    socket.on("typing-ride", (data: { rideEventId: string }) => {
      try {
        socket.to(`ride:${data.rideEventId}`).emit("user-typing", { userId });
        logger.debug(`[typing-ride] ${userId} typing in ride`);
      } catch (error: any) {
        logger.error(`[typing-ride] Error: ${error.message}`);
      }
    });

    socket.on("stop-typing-ride", (data: { rideEventId: string }) => {
      try {
        socket
          .to(`ride:${data.rideEventId}`)
          .emit("user-stop-typing", { userId });
      } catch (error: any) {
        logger.error(`[stop-typing-ride] Error: ${error.message}`);
      }
    });

    socket.on("host-started-ride", (data: { rideEventId: string }) => {
      try {
        const { rideEventId } = data;

        socket.to(`ride:${rideEventId}`).emit("ride-started-notification", {
          message: "🚴 Ride has started! Tap START MY RIDE when ready.",
          rideEventId,
          timestamp: new Date(),
        });

        logger.debug(
          `[host-started-ride] Notification sent for ride ${rideEventId}`,
        );
      } catch (error: any) {
        logger.error(`[host-started-ride] Error: ${error.message}`);
      }
    });

    // ==================== GROUPS ====================

    /**
     * Join group chat
     */
    socket.on("join-group-chat", async (data: { groupId: string }) => {
      try {
        const { groupId } = data;

        // Verify user is member
        const group = await Group.findById(groupId);
        if (!group) {
          socket.emit("error", { message: "Group not found" });
          return;
        }

        const isMember = group.members.some(
          (m: any) => m.userId.toString() === userId,
        );
        if (!isMember) {
          socket.emit("error", { message: "Not a group member" });
          return;
        }

        socket.join(`group:${groupId}`);

        socket.to(`group:${groupId}`).emit("user-joined-group", {
          userId,
          message: "User joined the group",
          timestamp: new Date(),
        });

        socket.emit("join-success", {
          groupId,
          message: "Successfully joined group chat",
        });

        logger.info(`[join-group-chat] User ${userId} joined group ${groupId}`);
      } catch (error: any) {
        logger.error(`[join-group-chat] Error: ${error.message}`);
        socket.emit("error", { message: error.message });
      }
    });

    /**
     * Leave group chat
     */
    socket.on("leave-group-chat", (data: { groupId: string }) => {
      try {
        const { groupId } = data;
        socket.leave(`group:${groupId}`);

        socket.to(`group:${groupId}`).emit("user-left-group", {
          userId,
          message: "User left the group",
          timestamp: new Date(),
        });

        logger.info(`[leave-group-chat] User ${userId} left group ${groupId}`);
      } catch (error: any) {
        logger.error(`[leave-group-chat] Error: ${error.message}`);
      }
    });

    /**
     * Send message in group chat
     */
    socket.on(
      "send-message-group",
      async (data: { groupId: string; text: string }) => {
        try {
          const { groupId, text } = data;

          if (!text || text.trim().length === 0) {
            socket.emit("error", { message: "Message cannot be empty" });
            return;
          }

          if (text.length > 500) {
            socket.emit("error", {
              message: "Message too long (max 500 chars)",
            });
            return;
          }

          // Verify user is member
          const group = await Group.findById(groupId);
          if (!group) {
            socket.emit("error", { message: "Group not found" });
            return;
          }

          const isMember = group.members.some(
            (m: any) => m.userId.toString() === userId,
          );
          if (!isMember) {
            socket.emit("error", { message: "Not a member" });
            return;
          }

          // Get sender info
          const sender = await User.findById(userId)
            .select("name avatarUrl")
            .lean();

          // Save to database
          const message = await ChatMessage.create({
            groupId,
            roomType: "group",
            senderId: userId,
            text: text.trim(),
            timestamp: new Date(),
          });

          // Broadcast to all in group (in-app notification)
          io.to(`group:${groupId}`).emit("new-message-group", {
            _id: message._id,
            senderId: userId,
            senderName: sender?.name,
            senderAvatar: sender?.avatarUrl,
            text: message.text,
            timestamp: new Date(),
          });

          // Send push notifications to all members except sender with batching
          const memberIds = group.members
            .map((m: any) => m.userId.toString())
            .filter((id: string) => id !== userId);

          if (memberIds.length > 0) {
            const { sendNotification } =
              await import("../services/notification.service.js");

            // Send to each member individually with batching enabled
            for (const memberId of memberIds) {
              try {
                await sendNotification({
                  userId: memberId,
                  type: "chat",
                  fromUserId: userId,
                  fromUserName: sender?.name || "Someone",
                  message: text.trim(),
                  data: {
                    groupId,
                    groupName: group.name,
                    messageId: message._id.toString(),
                    actionUrl: `/groups/chat?groupId=${groupId}`,
                  },
                  io,
                  priority: "default",
                  batching: {
                    enabled: true,
                    windowMs: 5000, // 5 second batching window
                    threadId: `group:${groupId}`,
                  },
                });
              } catch (notifError: any) {
                logger.error(
                  `[send-message-group] Failed to send notification to ${memberId}: ${notifError.message}`,
                );
                // Continue sending to other members
              }
            }
          }

          logger.debug(`[send-message-group] Message in group ${groupId}`);
        } catch (error: any) {
          logger.error(`[send-message-group] Error: ${error.message}`);
          socket.emit("error", { message: error.message });
        }
      },
    );

    /**
     * Group typing indicator
     */
    socket.on("typing-group", (data: { groupId: string }) => {
      try {
        socket
          .to(`group:${data.groupId}`)
          .emit("user-typing-group", { userId });
        logger.debug(`[typing-group] ${userId} typing in group`);
      } catch (error: any) {
        logger.error(`[typing-group] Error: ${error.message}`);
      }
    });

    socket.on("stop-typing-group", (data: { groupId: string }) => {
      try {
        socket
          .to(`group:${data.groupId}`)
          .emit("user-stop-typing-group", { userId });
      } catch (error: any) {
        logger.error(`[stop-typing-group] Error: ${error.message}`);
      }
    });

    // ==================== PRIVATE CHAT ====================

    /**
     * Join private 1:1 chat
     */
    socket.on("join-private-chat", (data: { roomId: string }) => {
      try {
        const { roomId } = data;
        socket.join(`private:${roomId}`);

        socket.emit("join-success", {
          roomId,
          message: "Successfully joined private chat",
        });

        logger.info(`[join-private-chat] User ${userId} joined room ${roomId}`);
      } catch (error: any) {
        logger.error(`[join-private-chat] Error: ${error.message}`);
        socket.emit("error", { message: error.message });
      }
    });

    /**
     * Leave private chat
     */
    socket.on("leave-private-chat", (data: { roomId: string }) => {
      try {
        const { roomId } = data;
        socket.leave(`private:${roomId}`);
        logger.info(`[leave-private-chat] User ${userId} left room ${roomId}`);
      } catch (error: any) {
        logger.error(`[leave-private-chat] Error: ${error.message}`);
      }
    });

    /**
     * Send message in private chat
     */
    socket.on(
      "send-message-private",
      async (data: { roomId: string; text: string }) => {
        try {
          const { roomId, text } = data;

          if (!text || text.trim().length === 0) {
            socket.emit("error", {
              message: "Message cannot be empty",
            });
            return;
          }

          if (text.length > 500) {
            socket.emit("error", {
              message: "Message too long (max 500 chars)",
            });
            return;
          }

          // Get chat room to find receiver
          const chatRoom = await PrivateChatRoom.findOne({ roomId });
          if (!chatRoom) {
            socket.emit("error", { message: "Chat room not found" });
            return;
          }

          // Determine receiver (the other user in the room)
          const receiverId =
            chatRoom.user1.toString() === userId
              ? chatRoom.user2.toString()
              : chatRoom.user1.toString();

          // Get sender info
          const sender = await User.findById(userId)
            .select("name avatarUrl")
            .lean();

          // Save to database
          const message = await ChatMessage.create({
            privateRoomId: roomId,
            roomType: "private",
            senderId: userId,
            text: text.trim(),
            timestamp: new Date(),
          });

          // Update PrivateChatRoom with last message AND increment unread for receiver
          await PrivateChatRoom.updateOne(
            { roomId },
            {
              lastMessage: text.trim(),
              lastMessageAt: new Date(),
              $inc: { [`unreadCount.${receiverId}`]: 1 }, // Increment receiver's unread count
            },
          );

          // Get updated unread count for receiver
          const updatedRoom = await PrivateChatRoom.findOne({ roomId }).lean();
          const receiverUnreadCount =
            (updatedRoom?.unreadCount as any)?.get?.(receiverId) || 0;

          // Calculate total unread for receiver
          const receiverConversations = await PrivateChatRoom.find({
            $or: [{ user1: receiverId }, { user2: receiverId }],
          }).lean();

          let receiverTotalUnread = 0;
          for (const conv of receiverConversations) {
            receiverTotalUnread +=
              (conv.unreadCount as any)?.get?.(receiverId) || 0;
          }

          // Broadcast to the room (for those already in it)
          io.to(`private:${roomId}`).emit("new-message-private", {
            _id: message._id,
            roomId,
            senderId: userId,
            senderName: sender?.name,
            senderAvatar: sender?.avatarUrl,
            text: message.text,
            timestamp: new Date(),
          });

          // Also broadcast directly to participants' individual rooms
          // This ensures the sender gets confirmation even if they haven't joined the private room yet
          // and the receiver gets the message even if they are on another screen.
          io.to(`user:${userId}`).emit("new-message-private", {
            _id: message._id,
            roomId,
            senderId: userId,
            senderName: sender?.name,
            senderAvatar: sender?.avatarUrl,
            text: message.text,
            timestamp: new Date(),
          });

          io.to(`user:${receiverId}`).emit("new-message-private", {
            _id: message._id,
            roomId,
            senderId: userId,
            senderName: sender?.name,
            senderAvatar: sender?.avatarUrl,
            text: message.text,
            timestamp: new Date(),
          });

          // Emit unread count update to receiver only (not sender)
          io.to(`user:${receiverId}`).emit("unread-count-updated", {
            roomId,
            unreadCount: receiverUnreadCount,
            totalUnread: receiverTotalUnread,
          });

          logger.debug(`[send-message-private] Message in room ${roomId}`);
        } catch (error: any) {
          logger.error(`[send-message-private] Error: ${error.message}`);
          socket.emit("error", { message: error.message });
        }
      },
    );

    /**
     * Private chat typing indicator
     */
    socket.on("typing-private", (data: { roomId: string }) => {
      try {
        socket
          .to(`private:${data.roomId}`)
          .emit("user-typing-private", { userId });
        logger.debug(`[typing-private] ${userId} typing in private chat`);
      } catch (error: any) {
        logger.error(`[typing-private] Error: ${error.message}`);
      }
    });

    socket.on("stop-typing-private", (data: { roomId: string }) => {
      try {
        socket
          .to(`private:${data.roomId}`)
          .emit("user-stop-typing-private", { userId });
      } catch (error: any) {
        logger.error(`[stop-typing-private] Error: ${error.message}`);
      }
    });

    /**
     * Mark messages as read in a private chat
     */
    socket.on("mark-messages-read", async (data: { roomId: string }) => {
      try {
        const { roomId } = data;

        logger.debug(
          `[mark-messages-read] User ${userId} marking room ${roomId} as read`,
        );

        const chatRoom = await PrivateChatRoom.findOne({ roomId });
        if (!chatRoom) {
          socket.emit("error", { message: "Chat room not found" });
          return;
        }

        // Verify user is participant
        const isParticipant =
          chatRoom.user1.toString() === userId ||
          chatRoom.user2.toString() === userId;
        if (!isParticipant) {
          socket.emit("error", { message: "Not a participant" });
          return;
        }

        // Reset unread count for this user
        await PrivateChatRoom.updateOne(
          { roomId },
          { $set: { [`unreadCount.${userId}`]: 0 } },
        );

        // Calculate new total unread for this user
        const allConversations = await PrivateChatRoom.find({
          $or: [{ user1: userId }, { user2: userId }],
        }).lean();

        let totalUnread = 0;
        for (const conv of allConversations) {
          if (conv.roomId === roomId) continue; // Skip current room (already 0)
          totalUnread += (conv.unreadCount as any)?.get?.(userId) || 0;
        }

        // Emit updated total unread to this user
        socket.emit("total-unread-updated", { totalUnread });

        logger.debug(
          `[mark-messages-read] Room ${roomId} marked as read, total unread: ${totalUnread}`,
        );
      } catch (error: any) {
        logger.error(`[mark-messages-read] Error: ${error.message}`);
        socket.emit("error", { message: error.message });
      }
    });

    // ==================== GROUP RIDE (LIVE TRACKING) ====================
    // Room isolation: group-ride:{rideId}
    // Live tracking only works when ride.status === "active"
    // No global broadcasting — only participants receive locations

    /**
     * Join group ride tracking room
     * Client must be a participant and ride must be active
     */
    socket.on("join-group-ride", async (data: { rideId: string }) => {
      try {
        const { rideId } = data;

        if (!rideId) {
          socket.emit("error", { message: "rideId is required" });
          return;
        }

        // Lazy import to avoid circular dependency
        const GroupRide = (await import("../models/groupRide.model.js"))
          .default;

        const ride = await GroupRide.findById(rideId);
        if (!ride) {
          socket.emit("error", { message: "Group ride not found" });
          return;
        }

        // Only allow joining if ride is active
        if (ride.status !== "active") {
          socket.emit("error", {
            message: "Can only join a tracking room while ride is active",
          });
          return;
        }

        // Verify user is a participant
        const isParticipant = ride.participants.some(
          (p: any) => p.userId.toString() === userId,
        );
        if (!isParticipant) {
          socket.emit("error", {
            message: "You are not a participant in this group ride",
          });
          return;
        }

        const room = `group-ride:${rideId}`;
        socket.join(room);

        // Notify others in the room that this rider is online
        socket.to(room).emit("group-rider-joined", {
          userId,
          rideId,
          timestamp: new Date(),
        });

        socket.emit("join-group-ride-success", {
          rideId,
          room,
          message: "Successfully joined group ride tracking",
        });

        logger.info(`[join-group-ride] User ${userId} joined room ${room}`);
      } catch (error: any) {
        logger.error(`[join-group-ride] Error: ${error.message}`);
        socket.emit("error", { message: error.message });
      }
    });

    /**
     * Leave group ride tracking room
     */
    socket.on("leave-group-ride", (data: { rideId: string }) => {
      try {
        const { rideId } = data;
        const room = `group-ride:${rideId}`;

        socket.leave(room);

        socket.to(room).emit("group-rider-left", {
          userId,
          rideId,
          timestamp: new Date(),
        });

        logger.info(`[leave-group-ride] User ${userId} left room ${room}`);
      } catch (error: any) {
        logger.error(`[leave-group-ride] Error: ${error.message}`);
      }
    });

    // ==================== DISCONNECT ====================
    socket.on("disconnect", (reason: string) => {
      logger.info(`[Socket] User ${userId} disconnected. Reason: ${reason}`);
    });

    socket.on("error", (error: any) => {
      logger.error(`[Socket Error] User ${userId}: ${error.message}`);
    });
  });

  io.engine.on("connection_error", (err) => {
    logger.error(`[Socket Engine Error]: ${err.message}`);
  });

  logger.info(
    "✅ Socket.io server initialized with Notifications + Rides + Groups + Private Chat",
  );
  return io;
};

/**
 * Send notification to specific user via Socket.io
 */
export const sendNotificationToUser = (
  io: SocketIOServer | null,
  userId: string,
  notification: {
    type:
      | "like"
      | "comment"
      | "follow"
      | "unfollow"
      | "ride"
      | "event"
      | "group"
      | "mentor"
      | "tag"
      | "sos"
      | "chat";
    message: string;
    fromUserId?: string;
    fromUserName?: string;
    rideEventId?: string;
    groupId?: string;
    postId?: string;
  },
) => {
  if (!io) {
    logger.warn(`[sendNotificationToUser] Socket.io not available`);
    return;
  }

  io.to(`user:${userId}`).emit("notification", {
    ...notification,
    timestamp: new Date(),
    id: `notif_${Date.now()}`,
  });

  logger.info(
    `[sendNotificationToUser] Notification sent to ${userId}: ${notification.message}`,
  );
};

/**
 * Broadcast notification to multiple users
 */
// export const sendNotificationToUsers = (
//   io: SocketIOServer | null,
//   userIds: string[],
//   notification: {
//     type: "like" | "comment" | "follow" | "unfollow" | "ride" | "event" | "group" | "mentor";
//     message: string;
//   }
// ) => {
//   if (!io) {
//     logger.warn(`[sendNotificationToUsers] Socket.io not available`);
//     return;
//   }

//   userIds.forEach((userId) => {
//     sendNotificationToUser(io, userId, notification);
//   });

//   logger.info(
//     `[sendNotificationToUsers] Notifications sent to ${userIds.length} users`
//   );
// };

export const sendNotificationToUsers = (
  io: SocketIOServer | null,
  userIds: string[],
  notification: {
    type:
      | "like"
      | "comment"
      | "follow"
      | "unfollow"
      | "ride"
      | "event"
      | "group"
      | "mentor"
      | "tag";
    message: string;
  },
) => {
  if (!io) {
    logger.warn(`[sendNotificationToUsers] Socket.io not available`);
    return;
  }

  userIds.forEach((userId) => {
    sendNotificationToUser(io, userId, notification);
  });

  logger.info(
    `[sendNotificationToUsers] Notifications sent to ${userIds.length} users`,
  );
};

// export default initializeSocket;

export default initializeSocket;
