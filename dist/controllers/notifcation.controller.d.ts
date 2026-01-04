import { Request, Response } from 'express';
interface AuthRequest extends Request {
    userId: string;
}
/**
 * GET /api/v1/notifications
 * Get user notifications with filters
 */
export declare const getNotifications: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
/**
 * PATCH /api/v1/notifications/:id/read
 * Mark single notification as read
 */
export declare const markNotificationRead: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
/**
 * PATCH /api/v1/notifications/read-all
 * Mark all notifications as read
 */
export declare const markAllNotificationsRead: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
/**
 * POST /api/v1/notifications/test
 * Test endpoint to send a real-time notification via Socket.io
 * This endpoint is for testing Socket.io functionality
 */
export declare const testNotification: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
export {};
//# sourceMappingURL=notifcation.controller.d.ts.map