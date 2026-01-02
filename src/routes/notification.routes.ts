    import express, { Router } from 'express';

import isAuth from '../middlewares/auth.middleware';
import { getNotifications, markAllNotificationsRead, markNotificationRead, testNotification } from '../controllers/notifcation.controller';

const notificationRouter: Router = express.Router();

/**
 * ==================== GET NOTIFICATIONS ====================
 */

/**
 * GET /api/v1/notifications
 * Get user notifications with filters
 *
 * Headers: Authorization: Bearer YOUR_TOKEN
 * Query Parameters:
 * - page: number (default: 1)
 * - limit: number (default: 20, max: 100)
 * - unread: boolean (true to get only unread, default: false)
 *
 * Example: GET /api/v1/notifications?unread=true&limit=10
 *
 * Response (200):
 * {
 *   "success": true,
 *   "data": [
 *     {
 *       "_id": "notif_id",
 *       "userId": "user_id",
 *       "type": "like",
 *       "fromUserId": { "name": "John", "avatar": "...", "handle": "@john" },
 *       "postId": { "caption": "..." },
 *       "message": "Someone liked your post",
 *       "read": false,
 *       "createdAt": "2024-01-01T12:00:00Z"
 *     }
 *   ],
 *   "unreadCount": 5,
 *   "pagination": {
 *     "page": 1,
 *     "limit": 20,
 *     "total": 50,
 *     "pages": 3
 *   }
 * }
 */
notificationRouter.get('/', isAuth, getNotifications);


/**
 * ==================== MARK AS READ ====================
 */

/**
 * PATCH /api/v1/notifications/:id/read
 * Mark single notification as read
 *
 * Headers: Authorization: Bearer YOUR_TOKEN
 * Path Parameters:
 * - id: notification ID (required)
 *
 * Response (200):
 * {
 *   "success": true,
 *   "data": {
 *     "_id": "notif_id",
 *     "read": true,
 *     "readAt": "2024-01-01T12:30:00Z"
 *   }
 * }
 */
notificationRouter.patch('/:id/read', isAuth, markNotificationRead);

/**
 * PATCH /api/v1/notifications/read-all
 * Mark all notifications as read
 *
 * Headers: Authorization: Bearer YOUR_TOKEN
 *
 * Response (200):
 * {
 *   "success": true,
 *   "data": { "message": "All marked as read" }
 * }
 */
notificationRouter.patch('/read-all', isAuth, markAllNotificationsRead);

/**
 * POST /api/v1/notifications/test
 * Test endpoint to send a real-time notification via Socket.io
 * This is for testing Socket.io functionality
 *
 * Headers: Authorization: Bearer YOUR_TOKEN
 * Body (optional):
 * {
 *   "message": "Custom test message"
 * }
 *
 * Response (200):
 * {
 *   "success": true,
 *   "message": "Test notification sent successfully",
 *   "data": {
 *     "notification": { ... },
 *     "socketConnected": true,
 *     "socketRoom": "user:userId"
 *   }
 * }
 */
notificationRouter.post('/test', isAuth, testNotification);

export default notificationRouter;