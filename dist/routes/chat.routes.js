// import express, { Router } from 'express';
// import {
//   startPrivateChat,
//   getPrivateChatMessages,
//   sendPrivateMessage,
//   getPrivateConversations,
//   deletePrivateChat
// } from '../controllers/private.controller.js';
// import isAuth from '../middlewares/auth.middleware.js';
// const router: Router = express.Router();
// // All routes require authentication
// router.use(isAuth);
// /**
//  * POST /api/v1/chat/private/start/:targetUserId
//  * Start or get private chat with another user
//  * Body: { context?: 'marketplace' | 'mentor' | 'general', contextId?: string }
//  */
// router.post('/private/start/:targetUserId', startPrivateChat);
// /**
//  * GET /api/v1/chat/private/:roomId/messages
//  * Get private chat history
//  * Query: ?page=1&limit=50
//  */
// router.get('/private/:roomId/messages', getPrivateChatMessages);
// /**
//  * POST /api/v1/chat/private/:roomId/send
//  * Send private message (REST fallback)
//  * Body: { text: string }
//  */
// router.post('/private/:roomId/send', sendPrivateMessage);
// /**
//  * GET /api/v1/chat/private/conversations
//  * Get all private conversations for current user
//  * Query: ?page=1&limit=20
//  */
// router.get('/private/conversations', getPrivateConversations);
// /**
//  * DELETE /api/v1/chat/private/:roomId
//  * Delete private chat room
//  */
// router.delete('/private/:roomId', deletePrivateChat);
// export default router;
import express from 'express';
import { startPrivateChat, getPrivateChatMessages, sendPrivateMessage, getPrivateConversations, deletePrivateChat } from '../controllers/private.controller';
import isAuth from '../middlewares/auth.middleware';
const router = express.Router();
// router.use(isAuth);
router.post('/private/start/:targetUserId', isAuth, startPrivateChat);
router.get('/private/:roomId/messages', isAuth, getPrivateChatMessages);
router.post('/private/:roomId/send', isAuth, sendPrivateMessage);
router.get('/private/conversations', isAuth, getPrivateConversations);
router.delete('/private/:roomId', isAuth, deletePrivateChat);
export default router;
//# sourceMappingURL=chat.routes.js.map