// import { Request, Response } from 'express';
// import PrivateChatRoom from '../models/private.model.js';
// import ChatMessage from '../models/chatMessage.model';
// import User from '../models/user.model';
// import logger from '../config/logger';

// interface AuthRequest extends Request {
//   userId: string;
// }

// /**
//  * Helper: Generate sorted roomId from two userIds
//  */
// const generateRoomId = (userId1: string, userId2: string): string => {
//   const sorted = [userId1, userId2].sort();
//   return `${sorted[0]}_${sorted[1]}`;
// };

// /**
//  * POST /api/v1/chat/private/start/:targetUserId
//  * Start or get private chat with another user
//  */
// export const startPrivateChat = async (req: AuthRequest, res: Response): Promise<void> => {  try {
//     const { targetUserId } = req.params;
//     const userId = req.userId;
//     const { context = 'general', contextId } = req.body;

//     logger.info(`[startPrivateChat] User ${userId} starting chat with ${targetUserId}`);

//     if (userId === targetUserId) {
//        res.status(400).json({ success: false, error: 'Cannot chat with yourself' });
//     }

//     // Verify both users exist
//     const [user, targetUser] = await Promise.all([
//       User.findById(userId),
//       User.findById(targetUserId)
//     ]);

//     if (!user || !targetUser) {
//       res.status(404).json({ success: false, error: 'User not found' });
//     }

//     // Generate room ID
//     const roomId = generateRoomId(userId, targetUserId);

//     // Find or create room
//     let chatRoom = await PrivateChatRoom.findOne({ roomId });

//     if (!chatRoom) {
//       chatRoom = await PrivateChatRoom.create({
//         roomId,
//         user1: userId,
//         user2: targetUserId,
//         context,
//         contextId
//       });

//       logger.info(`[startPrivateChat] Created new chat room ${roomId}`);
//     }

//     res.json({
//       success: true,
//       data: {
//         roomId: chatRoom.roomId,
//         user1: chatRoom.user1,
//         user2: chatRoom.user2,
//         context: chatRoom.context,
//         chatRoomId: chatRoom._id
//       }
//     });
//   } catch (error: any) {
//     logger.error(`[startPrivateChat] Error: ${error.message}`);
//     res.status(500).json({ success: false, error: error.message });
//   }
// };

// /**
//  * GET /api/v1/chat/private/:roomId/messages
//  * Get private chat history
//  */
// export const getPrivateChatMessages = async (req: AuthRequest, res: Response) : Promise<void> => {
//   try {
//     const { roomId } = req.params;
//     const userId = req.userId;
//     const { page = 1, limit = 50 } = req.query;

//     logger.info(`[getPrivateChatMessages] Fetching messages for room ${roomId}`);

//     // Verify user is part of this room
//     const chatRoom = await PrivateChatRoom.findOne({ roomId });
//     if (!chatRoom) {
//        res.status(404).json({ success: false, error: 'Chat room not found' });
//     }

//     const isParticipant =
//       chatRoom.user1.toString() === userId || chatRoom.user2.toString() === userId;
//     if (!isParticipant) {
//        res.status(403).json({ success: false, error: 'Not a participant in this chat' });
//     }

//     const pageNum = Math.max(1, parseInt(page as string) || 1);
//     const limitNum = Math.min(100, parseInt(limit as string) || 50);
//     const skip = (pageNum - 1) * limitNum;

//     const messages = await ChatMessage.find({
//       $or: [
//         { privateRoomId: roomId },
//         { rideEventId: { $exists: false }, senderId: { $in: [chatRoom.user1, chatRoom.user2] } }
//       ]
//     })
//       .populate('senderId', 'name avatarUrl')
//       .sort({ timestamp: -1 })
//       .skip(skip)
//       .limit(limitNum)
//       .lean();

//     const total = await ChatMessage.countDocuments({
//       privateRoomId: roomId
//     });

//      res.json({
//       success: true,
//       data: messages.reverse(),
//       pagination: {
//         page: pageNum,
//         limit: limitNum,
//         total,
//         pages: Math.ceil(total / limitNum)
//       }
//     });
//   } catch (error: any) {
//     logger.error(`[getPrivateChatMessages] Error: ${error.message}`);
//      res.status(500).json({ success: false, error: error.message });
//   }
// };

// /**
//  * POST /api/v1/chat/private/:roomId/send
//  * Send private message (REST fallback)
//  */
// export const sendPrivateMessage = async (req: AuthRequest, res: Response) : Promise<void> => {
//   try {
//     const { roomId } = req.params;
//     const userId = req.userId;
//     const { text } = req.body;

//     logger.info(`[sendPrivateMessage] Message in room ${roomId}`);

//     if (!text || text.trim().length === 0) {
//        res.status(400).json({ success: false, error: 'Message cannot be empty' });
//     }

//     if (text.length > 500) {
//        res.status(400).json({ success: false, error: 'Message too long (max 500 chars)' });
//     }

//     // Verify room exists and user is participant
//     const chatRoom = await PrivateChatRoom.findOne({ roomId });
//     if (!chatRoom) {
//      res.status(404).json({ success: false, error: 'Chat room not found' });
//     }

//     const isParticipant =
//       chatRoom.user1.toString() === userId || chatRoom.user2.toString() === userId;
//     if (!isParticipant) {
//        res.status(403).json({ success: false, error: 'Not a participant' });
//     }

//     const sender = await User.findById(userId).select('name avatarUrl').lean();

//     const message = await ChatMessage.create({
//       privateRoomId: roomId,
//       roomType: 'private',
//       senderId: userId,
//       receiverId: chatRoom.user1.toString() === userId ? chatRoom.user2 : chatRoom.user1,
//       text: text.trim(),
//       timestamp: new Date()
//     });

//     // Update last message in room
//     await PrivateChatRoom.updateOne(
//       { roomId },
//       {
//         lastMessage: text.trim(),
//         lastMessageAt: new Date()
//       }
//     );

//      res.status(201).json({
//       success: true,
//       data: {
//         _id: message._id,
//         roomId,
//         senderId: userId,
//         senderName: sender?.name,
//         senderAvatar: sender?.avatarUrl,
//         text: message.text,
//         timestamp: message.timestamp
//       }
//     });
//   } catch (error: any) {
//     logger.error(`[sendPrivateMessage] Error: ${error.message}`);
//      res.status(500).json({ success: false, error: error.message });
//   }
// };

// /**
//  * GET /api/v1/chat/private/conversations
//  * Get all private conversations for user
//  */
// export const getPrivateConversations = async (req: AuthRequest, res: Response) => {
//   try {
//     const userId = req.userId;
//     const { page = 1, limit = 20 } = req.query;

//     const pageNum = Math.max(1, parseInt(page as string) || 1);
//     const limitNum = Math.min(100, parseInt(limit as string) || 20);
//     const skip = (pageNum - 1) * limitNum;

//     const conversations = await PrivateChatRoom.find({
//       $or: [{ user1: userId }, { user2: userId }]
//     })
//       .populate('user1', 'name avatarUrl')
//       .populate('user2', 'name avatarUrl')
//       .sort({ lastMessageAt: -1 })
//       .skip(skip)
//       .limit(limitNum)
//       .lean();

//     const total = await PrivateChatRoom.countDocuments({
//       $or: [{ user1: userId }, { user2: userId }]
//     });

//     // Enrich with unread count (optional)
//     const enriched = conversations.map((conv: any) => {
//       const otherUser = conv.user1._id.toString() === userId ? conv.user2 : conv.user1;
//       return {
//         ...conv,
//         otherUser
//       };
//     });

//     return res.json({
//       success: true,
//       data: enriched,
//       pagination: {
//         page: pageNum,
//         limit: limitNum,
//         total,
//         pages: Math.ceil(total / limitNum)
//       }
//     });
//   } catch (error: any) {
//     logger.error(`[getPrivateConversations] Error: ${error.message}`);
//     return res.status(500).json({ success: false, error: error.message });
//   }
// };

// /**
//  * DELETE /api/v1/chat/private/:roomId
//  * Delete private chat room
//  */
// export const deletePrivateChat = async (req: AuthRequest, res: Response) => {
//   try {
//     const { roomId } = req.params;
//     const userId = req.userId;

//     logger.info(`[deletePrivateChat] User ${userId} deleting room ${roomId}`);

//     const chatRoom = await PrivateChatRoom.findOne({ roomId });
//     if (!chatRoom) {
//       return res.status(404).json({ success: false, error: 'Chat room not found' });
//     }

//     const isParticipant =
//       chatRoom.user1.toString() === userId || chatRoom.user2.toString() === userId;
//     if (!isParticipant) {
//       return res.status(403).json({ success: false, error: 'Not a participant' });
//     }

//     // Delete all messages
//     await ChatMessage.deleteMany({ privateRoomId: roomId });

//     // Delete room
//     await PrivateChatRoom.deleteOne({ roomId });

//     return res.json({
//       success: true,
//       data: { message: 'Chat deleted' }
//     });
//   } catch (error: any) {
//     logger.error(`[deletePrivateChat] Error: ${error.message}`);
//     return res.status(500).json({ success: false, error: error.message });
//   }
// };

import { Request, Response } from "express";
import PrivateChatRoom from "../models/private.model.js";
import ChatMessage from "../models/chatMessage.model.js";
import User from "../models/user.model.js";
import logger from "../config/logger.js";

interface AuthRequest extends Request {
  userId: string;
}

/**
 * Helper: Generate sorted roomId from two userIds
 */
const generateRoomId = (userId1: string, userId2: string): string => {
  const sorted = [userId1, userId2].sort();
  return `${sorted[0]}_${sorted[1]}`;
};

/**
 * POST /api/v1/chat/private/start/:targetUserId
 * Start or get private chat with another user
 */
export const startPrivateChat = (req: AuthRequest, res: Response): void => {
  (async () => {
    try {
      const { targetUserId } = req.params;
      const userId = req.userId;
      const { context = "general", contextId } = req.body;

      logger.info(
        `[startPrivateChat] User ${userId} starting chat with ${targetUserId}`,
      );

      if (userId === targetUserId) {
        res
          .status(400)
          .json({ success: false, error: "Cannot chat with yourself" });
        return;
      }

      const [user, targetUser] = await Promise.all([
        User.findById(userId),
        User.findById(targetUserId),
      ]);

      if (!user || !targetUser) {
        res.status(404).json({ success: false, error: "User not found" });
        return;
      }

      const roomId = generateRoomId(userId, targetUserId);
      let chatRoom = await PrivateChatRoom.findOne({ roomId });

      if (!chatRoom) {
        chatRoom = await PrivateChatRoom.create({
          roomId,
          user1: userId,
          user2: targetUserId,
          context,
          contextId,
        });

        logger.info(`[startPrivateChat] Created new chat room ${roomId}`);
      }

      res.json({
        success: true,
        data: {
          roomId: chatRoom.roomId,
          user1: chatRoom.user1,
          user2: chatRoom.user2,
          context: chatRoom.context,
          chatRoomId: chatRoom._id,
        },
      });
    } catch (error: any) {
      logger.error(`[startPrivateChat] Error: ${error.message}`);
      res.status(500).json({ success: false, error: error.message });
    }
  })();
};

/**
 * GET /api/v1/chat/private/:roomId/messages
 * Get private chat history
 */
export const getPrivateChatMessages = (
  req: AuthRequest,
  res: Response,
): void => {
  (async () => {
    try {
      const { roomId } = req.params;
      const userId = req.userId;
      const { page = 1, limit = 50 } = req.query;

      logger.info(
        `[getPrivateChatMessages] Fetching messages for room ${roomId}`,
      );

      const chatRoom = await PrivateChatRoom.findOne({ roomId })
        .populate("user1", "name avatarUrl verified handle")
        .populate("user2", "name avatarUrl verified handle");
      if (!chatRoom) {
        res.status(404).json({ success: false, error: "Chat room not found" });
        return;
      }

      const isParticipant =
        (chatRoom.user1 as any)._id.toString() === userId ||
        (chatRoom.user2 as any)._id.toString() === userId;
      if (!isParticipant) {
        res
          .status(403)
          .json({ success: false, error: "Not a participant in this chat" });
        return;
      }

      const pageNum = Math.max(1, parseInt(page as string) || 1);
      const limitNum = Math.min(100, parseInt(limit as string) || 50);
      const skip = (pageNum - 1) * limitNum;

      // Only fetch messages for this private room
      const messages = await ChatMessage.find({
        privateRoomId: roomId,
        roomType: "private",
      })
        .populate("senderId", "name avatarUrl")
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean();

      const total = await ChatMessage.countDocuments({
        privateRoomId: roomId,
        roomType: "private",
      });

      // Determine the opposite party (the other user in the conversation)
      const oppositeParty =
        (chatRoom.user1 as any)._id.toString() === userId
          ? chatRoom.user2
          : chatRoom.user1;

      res.json({
        success: true,
        data: messages.reverse(),
        chatRoom: {
          roomId: chatRoom.roomId,
          oppositeParty: {
            _id: (oppositeParty as any)._id,
            name: (oppositeParty as any).name,
            avatarUrl: (oppositeParty as any).avatarUrl,
            verified: (oppositeParty as any).verified,
            handle: (oppositeParty as any).handle,
          },
        },
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
      });
    } catch (error: any) {
      logger.error(`[getPrivateChatMessages] Error: ${error.message}`);
      res.status(500).json({ success: false, error: error.message });
    }
  })();
};

/**
 * POST /api/v1/chat/private/:roomId/send
 * Send private message (REST fallback)
 */
export const sendPrivateMessage = (req: AuthRequest, res: Response): void => {
  (async () => {
    try {
      const { roomId } = req.params;
      const userId = req.userId;
      const { text } = req.body;

      logger.info(`[sendPrivateMessage] Message in room ${roomId}`);

      if (!text || text.trim().length === 0) {
        res
          .status(400)
          .json({ success: false, error: "Message cannot be empty" });
        return;
      }

      if (text.length > 500) {
        res
          .status(400)
          .json({ success: false, error: "Message too long (max 500 chars)" });
        return;
      }

      const chatRoom = await PrivateChatRoom.findOne({ roomId });
      if (!chatRoom) {
        res.status(404).json({ success: false, error: "Chat room not found" });
        return;
      }

      const isParticipant =
        chatRoom.user1.toString() === userId ||
        chatRoom.user2.toString() === userId;
      if (!isParticipant) {
        res.status(403).json({ success: false, error: "Not a participant" });
        return;
      }

      const sender = await User.findById(userId)
        .select("name avatarUrl")
        .lean();

      const message = await ChatMessage.create({
        privateRoomId: roomId,
        roomType: "private",
        senderId: userId,
        receiverId:
          chatRoom.user1.toString() === userId
            ? chatRoom.user2
            : chatRoom.user1,
        text: text.trim(),
        timestamp: new Date(),
      });

      await PrivateChatRoom.updateOne(
        { roomId },
        {
          lastMessage: text.trim(),
          lastMessageAt: new Date(),
        },
      );

      // Send notification (for chat we want it to be as real-time as possible)
      const receiverId =
        chatRoom.user1.toString() === userId
          ? chatRoom.user2.toString()
          : chatRoom.user1.toString();

      try {
        const { sendNotification } =
          await import("../services/notification.service.js");
        await sendNotification({
          userId: receiverId,
          type: "chat",
          fromUserId: userId!,
          fromUserName: sender?.name || "Someone",
          message: text.trim(),
          data: {
            roomId,
            messageId: message._id.toString(),
            actionUrl: `/chat/private/${roomId}`,
          },
          io: (req.app as any).io,
          // For direct chat, send instantly (no batching delay)
          batching: {
            enabled: false,
          },
        });
      } catch (notifError: any) {
        logger.error(
          `[sendPrivateMessage] Failed to send notification: ${notifError.message}`,
        );
        // Don't fail the message send if notification fails
      }

      res.status(201).json({
        success: true,
        data: {
          _id: message._id,
          roomId,
          senderId: userId,
          senderName: sender?.name,
          senderAvatar: sender?.avatarUrl,
          text: message.text,
          timestamp: message.timestamp,
        },
      });
    } catch (error: any) {
      logger.error(`[sendPrivateMessage] Error: ${error.message}`);
      res.status(500).json({ success: false, error: error.message });
    }
  })();
};

/**
 * GET /api/v1/chat/private/conversations
 * Get all private conversations for user
 */
export const getPrivateConversations = (
  req: AuthRequest,
  res: Response,
): void => {
  (async () => {
    try {
      const userId = req.userId;
      const { page = 1, limit = 20 } = req.query;

      const pageNum = Math.max(1, parseInt(page as string) || 1);
      const limitNum = Math.min(100, parseInt(limit as string) || 20);
      const skip = (pageNum - 1) * limitNum;

      const conversations = await PrivateChatRoom.find({
        $or: [{ user1: userId }, { user2: userId }],
      })
        .populate("user1", "name avatarUrl")
        .populate("user2", "name avatarUrl")
        .sort({ lastMessageAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean();

      const total = await PrivateChatRoom.countDocuments({
        $or: [{ user1: userId }, { user2: userId }],
      });

      // Enrich conversations with last message from ChatMessage collection
      const enriched = await Promise.all(
        conversations.map(async (conv: any) => {
          const otherUser =
            conv.user1._id.toString() === userId ? conv.user2 : conv.user1;

          // Fetch the latest message for this room from ChatMessage collection
          const lastMessage = await ChatMessage.findOne({
            privateRoomId: conv.roomId,
            roomType: "private",
          })
            .sort({ timestamp: -1 })
            .select("text timestamp")
            .lean();

          // Use fetched lastMessage if available, otherwise use what's in PrivateChatRoom
          return {
            ...conv,
            otherUser,
            lastMessage: lastMessage?.text || conv.lastMessage || null,
            lastMessageAt: lastMessage?.timestamp || conv.lastMessageAt || null,
            unreadCount: (conv.unreadCount as any)?.get?.(userId) || 0,
          };
        }),
      );

      res.json({
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
      logger.error(`[getPrivateConversations] Error: ${error.message}`);
      res.status(500).json({ success: false, error: error.message });
    }
  })();
};

/**
 * DELETE /api/v1/chat/private/:roomId
 * Delete private chat room
 */
export const deletePrivateChat = (req: AuthRequest, res: Response): void => {
  (async () => {
    try {
      const { roomId } = req.params;
      const userId = req.userId;

      logger.info(`[deletePrivateChat] User ${userId} deleting room ${roomId}`);

      const chatRoom = await PrivateChatRoom.findOne({ roomId });
      if (!chatRoom) {
        res.status(404).json({ success: false, error: "Chat room not found" });
        return;
      }

      const isParticipant =
        chatRoom.user1.toString() === userId ||
        chatRoom.user2.toString() === userId;
      if (!isParticipant) {
        res.status(403).json({ success: false, error: "Not a participant" });
        return;
      }

      await ChatMessage.deleteMany({ privateRoomId: roomId });
      await PrivateChatRoom.deleteOne({ roomId });

      res.json({
        success: true,
        data: { message: "Chat deleted" },
      });
    } catch (error: any) {
      logger.error(`[deletePrivateChat] Error: ${error.message}`);
      res.status(500).json({ success: false, error: error.message });
    }
  })();
};

/**
 * GET /api/v1/chat/private/unread-count
 * Get total unread message count across all conversations
 */
export const getTotalUnreadCount = (req: AuthRequest, res: Response): void => {
  (async () => {
    try {
      const userId = req.userId!;

      logger.info(`[getTotalUnreadCount] Fetching for user ${userId}`);

      const conversations = await PrivateChatRoom.find({
        $or: [{ user1: userId }, { user2: userId }],
      }).lean();

      let totalUnread = 0;
      for (const conv of conversations) {
        const unread = (conv.unreadCount as any)?.get?.(userId) || 0;
        totalUnread += unread;
      }

      res.json({
        success: true,
        data: { totalUnread },
      });
    } catch (error: any) {
      logger.error(`[getTotalUnreadCount] Error: ${error.message}`);
      res.status(500).json({ success: false, error: error.message });
    }
  })();
};

/**
 * POST /api/v1/chat/private/:roomId/mark-read
 * Mark all messages in a room as read for current user
 */
export const markMessagesAsRead = (req: AuthRequest, res: Response): void => {
  (async () => {
    try {
      const { roomId } = req.params;
      const userId = req.userId!;

      logger.info(
        `[markMessagesAsRead] User ${userId} marking room ${roomId} as read`,
      );

      const chatRoom = await PrivateChatRoom.findOne({ roomId });
      if (!chatRoom) {
        res.status(404).json({ success: false, error: "Chat room not found" });
        return;
      }

      const isParticipant =
        chatRoom.user1.toString() === userId ||
        chatRoom.user2.toString() === userId;
      if (!isParticipant) {
        res.status(403).json({ success: false, error: "Not a participant" });
        return;
      }

      await PrivateChatRoom.updateOne(
        { roomId },
        { $set: { [`unreadCount.${userId}`]: 0 } },
      );

      const allConversations = await PrivateChatRoom.find({
        $or: [{ user1: userId }, { user2: userId }],
      }).lean();

      let totalUnread = 0;
      for (const conv of allConversations) {
        if (conv.roomId === roomId) continue;
        totalUnread += (conv.unreadCount as any)?.get?.(userId) || 0;
      }

      res.json({
        success: true,
        data: { totalUnread },
      });
    } catch (error: any) {
      logger.error(`[markMessagesAsRead] Error: ${error.message}`);
      res.status(500).json({ success: false, error: error.message });
    }
  })();
};
