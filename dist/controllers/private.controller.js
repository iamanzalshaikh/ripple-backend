// import { Request, Response } from 'express';
// import PrivateChatRoom from '../models/private.model.js';
// import ChatMessage from '../models/chatMessage.model';
// import User from '../models/user.model';
// import logger from '../config/logger';
import PrivateChatRoom from '../models/private.model.js';
import ChatMessage from '../models/chatMessage.model.js';
import User from '../models/user.model.js';
import logger from '../config/logger.js';
/**
 * Helper: Generate sorted roomId from two userIds
 */
const generateRoomId = (userId1, userId2) => {
    const sorted = [userId1, userId2].sort();
    return `${sorted[0]}_${sorted[1]}`;
};
/**
 * POST /api/v1/chat/private/start/:targetUserId
 * Start or get private chat with another user
 */
export const startPrivateChat = (req, res) => {
    (async () => {
        try {
            const { targetUserId } = req.params;
            const userId = req.userId;
            const { context = 'general', contextId } = req.body;
            logger.info(`[startPrivateChat] User ${userId} starting chat with ${targetUserId}`);
            if (userId === targetUserId) {
                res.status(400).json({ success: false, error: 'Cannot chat with yourself' });
                return;
            }
            const [user, targetUser] = await Promise.all([
                User.findById(userId),
                User.findById(targetUserId)
            ]);
            if (!user || !targetUser) {
                res.status(404).json({ success: false, error: 'User not found' });
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
                    contextId
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
                    chatRoomId: chatRoom._id
                }
            });
        }
        catch (error) {
            logger.error(`[startPrivateChat] Error: ${error.message}`);
            res.status(500).json({ success: false, error: error.message });
        }
    })();
};
/**
 * GET /api/v1/chat/private/:roomId/messages
 * Get private chat history
 */
export const getPrivateChatMessages = (req, res) => {
    (async () => {
        try {
            const { roomId } = req.params;
            const userId = req.userId;
            const { page = 1, limit = 50 } = req.query;
            logger.info(`[getPrivateChatMessages] Fetching messages for room ${roomId}`);
            const chatRoom = await PrivateChatRoom.findOne({ roomId });
            if (!chatRoom) {
                res.status(404).json({ success: false, error: 'Chat room not found' });
                return;
            }
            const isParticipant = chatRoom.user1.toString() === userId || chatRoom.user2.toString() === userId;
            if (!isParticipant) {
                res.status(403).json({ success: false, error: 'Not a participant in this chat' });
                return;
            }
            const pageNum = Math.max(1, parseInt(page) || 1);
            const limitNum = Math.min(100, parseInt(limit) || 50);
            const skip = (pageNum - 1) * limitNum;
            const messages = await ChatMessage.find({
                $or: [
                    { privateRoomId: roomId },
                    { rideEventId: { $exists: false }, senderId: { $in: [chatRoom.user1, chatRoom.user2] } }
                ]
            })
                .populate('senderId', 'name avatarUrl')
                .sort({ timestamp: -1 })
                .skip(skip)
                .limit(limitNum)
                .lean();
            const total = await ChatMessage.countDocuments({
                privateRoomId: roomId
            });
            res.json({
                success: true,
                data: messages.reverse(),
                pagination: {
                    page: pageNum,
                    limit: limitNum,
                    total,
                    pages: Math.ceil(total / limitNum)
                }
            });
        }
        catch (error) {
            logger.error(`[getPrivateChatMessages] Error: ${error.message}`);
            res.status(500).json({ success: false, error: error.message });
        }
    })();
};
/**
 * POST /api/v1/chat/private/:roomId/send
 * Send private message (REST fallback)
 */
export const sendPrivateMessage = (req, res) => {
    (async () => {
        try {
            const { roomId } = req.params;
            const userId = req.userId;
            const { text } = req.body;
            logger.info(`[sendPrivateMessage] Message in room ${roomId}`);
            if (!text || text.trim().length === 0) {
                res.status(400).json({ success: false, error: 'Message cannot be empty' });
                return;
            }
            if (text.length > 500) {
                res.status(400).json({ success: false, error: 'Message too long (max 500 chars)' });
                return;
            }
            const chatRoom = await PrivateChatRoom.findOne({ roomId });
            if (!chatRoom) {
                res.status(404).json({ success: false, error: 'Chat room not found' });
                return;
            }
            const isParticipant = chatRoom.user1.toString() === userId || chatRoom.user2.toString() === userId;
            if (!isParticipant) {
                res.status(403).json({ success: false, error: 'Not a participant' });
                return;
            }
            const sender = await User.findById(userId).select('name avatarUrl').lean();
            const message = await ChatMessage.create({
                privateRoomId: roomId,
                roomType: 'private',
                senderId: userId,
                receiverId: chatRoom.user1.toString() === userId ? chatRoom.user2 : chatRoom.user1,
                text: text.trim(),
                timestamp: new Date()
            });
            await PrivateChatRoom.updateOne({ roomId }, {
                lastMessage: text.trim(),
                lastMessageAt: new Date()
            });
            res.status(201).json({
                success: true,
                data: {
                    _id: message._id,
                    roomId,
                    senderId: userId,
                    senderName: sender?.name,
                    senderAvatar: sender?.avatarUrl,
                    text: message.text,
                    timestamp: message.timestamp
                }
            });
        }
        catch (error) {
            logger.error(`[sendPrivateMessage] Error: ${error.message}`);
            res.status(500).json({ success: false, error: error.message });
        }
    })();
};
/**
 * GET /api/v1/chat/private/conversations
 * Get all private conversations for user
 */
export const getPrivateConversations = (req, res) => {
    (async () => {
        try {
            const userId = req.userId;
            const { page = 1, limit = 20 } = req.query;
            const pageNum = Math.max(1, parseInt(page) || 1);
            const limitNum = Math.min(100, parseInt(limit) || 20);
            const skip = (pageNum - 1) * limitNum;
            const conversations = await PrivateChatRoom.find({
                $or: [{ user1: userId }, { user2: userId }]
            })
                .populate('user1', 'name avatarUrl')
                .populate('user2', 'name avatarUrl')
                .sort({ lastMessageAt: -1 })
                .skip(skip)
                .limit(limitNum)
                .lean();
            const total = await PrivateChatRoom.countDocuments({
                $or: [{ user1: userId }, { user2: userId }]
            });
            const enriched = conversations.map((conv) => {
                const otherUser = conv.user1._id.toString() === userId ? conv.user2 : conv.user1;
                return {
                    ...conv,
                    otherUser
                };
            });
            res.json({
                success: true,
                data: enriched,
                pagination: {
                    page: pageNum,
                    limit: limitNum,
                    total,
                    pages: Math.ceil(total / limitNum)
                }
            });
        }
        catch (error) {
            logger.error(`[getPrivateConversations] Error: ${error.message}`);
            res.status(500).json({ success: false, error: error.message });
        }
    })();
};
/**
 * DELETE /api/v1/chat/private/:roomId
 * Delete private chat room
 */
export const deletePrivateChat = (req, res) => {
    (async () => {
        try {
            const { roomId } = req.params;
            const userId = req.userId;
            logger.info(`[deletePrivateChat] User ${userId} deleting room ${roomId}`);
            const chatRoom = await PrivateChatRoom.findOne({ roomId });
            if (!chatRoom) {
                res.status(404).json({ success: false, error: 'Chat room not found' });
                return;
            }
            const isParticipant = chatRoom.user1.toString() === userId || chatRoom.user2.toString() === userId;
            if (!isParticipant) {
                res.status(403).json({ success: false, error: 'Not a participant' });
                return;
            }
            await ChatMessage.deleteMany({ privateRoomId: roomId });
            await PrivateChatRoom.deleteOne({ roomId });
            res.json({
                success: true,
                data: { message: 'Chat deleted' }
            });
        }
        catch (error) {
            logger.error(`[deletePrivateChat] Error: ${error.message}`);
            res.status(500).json({ success: false, error: error.message });
        }
    })();
};
//# sourceMappingURL=private.controller.js.map