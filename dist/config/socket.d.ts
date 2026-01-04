import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
export interface AuthenticatedSocket extends Socket {
    data: {
        userId: string;
    };
}
/**
 * Initialize Socket.io server
 * This function is called from server.ts
 */
export declare const initializeSocket: (httpServer: HTTPServer) => SocketIOServer;
/**
 * Helper: Send notification to specific user via Socket.io
 * Use this in queue workers
 *
 * Example:
 * sendNotificationToUser(io, userId, {
 *   type: 'like',
 *   fromUserName: 'John',
 *   message: 'Someone liked your post'
 * });
 */
export declare const sendNotificationToUser: (io: SocketIOServer | null, userId: string, notification: {
    type: "like" | "comment" | "follow" | "ride_share";
    fromUserId?: string;
    fromUserName?: string;
    fromUserAvatar?: string;
    postId?: string;
    commentId?: string;
    message: string;
}) => void;
/**
 * Helper: Send notification to multiple users
 */
export declare const sendNotificationToUsers: (io: SocketIOServer | null, userIds: string[], notification: {
    type: "like" | "comment" | "follow" | "ride_share";
    fromUserId?: string;
    fromUserName?: string;
    fromUserAvatar?: string;
    message: string;
}) => void;
export default initializeSocket;
//# sourceMappingURL=socket.d.ts.map