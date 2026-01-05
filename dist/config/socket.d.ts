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
export declare const initializeSocket: (httpServer: HTTPServer) => SocketIOServer;
/**
 * Send notification to specific user via Socket.io
 */
export declare const sendNotificationToUser: (io: SocketIOServer | null, userId: string, notification: {
    type: "like" | "comment" | "follow" | "ride" | "event" | "group" | "mentor";
    message: string;
    fromUserId?: string;
    fromUserName?: string;
    rideEventId?: string;
    groupId?: string;
    postId?: string;
}) => void;
/**
 * Broadcast notification to multiple users
 */
export declare const sendNotificationToUsers: (io: SocketIOServer | null, userIds: string[], notification: {
    type: "like" | "comment" | "follow" | "ride" | "event" | "group" | "mentor";
    message: string;
}) => void;
export default initializeSocket;
//# sourceMappingURL=socket.d.ts.map