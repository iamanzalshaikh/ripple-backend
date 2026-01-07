// import { Server as HTTPServer } from "http";
// import { Server as SocketIOServer, Socket } from "socket.io";
// import logger from "../config/logger.js";
// import { verifyUserAccessToken, UserTokenPayload } from "../utils/jwt";

// export interface AuthenticatedSocket extends Socket {
//   data: {
//     userId: string;
//     phone: string;
//   };
// }

// /**
//  * Initialize Socket.io server with authentication
//  * Supports: Ride Events, Groups, Private Chat
//  */
// export const initializeSocket = (httpServer: HTTPServer): SocketIOServer => {
//   const io = new SocketIOServer(httpServer, {
//     cors: {
//       origin: process.env.FRONTEND_URL || "http://localhost:3000",
//       methods: ["GET", "POST"],
//       credentials: true,
//     },
//     transports: ["websocket", "polling"],
//     pingInterval: 25000,
//     pingTimeout: 20000,
//   });

//   // ==================== AUTHENTICATION MIDDLEWARE ====================
//   io.use((socket: AuthenticatedSocket, next) => {
//     try {
//       const token = socket.handshake.auth.token;
      
//       if (!token) {
//         logger.warn("[Socket Auth] No token provided");
//         return next(new Error("No token provided"));
//       }

//       const decoded = verifyUserAccessToken(token) as UserTokenPayload;
      
//       if (!decoded || !decoded.userId) {
//         logger.warn("[Socket Auth] Invalid token");
//         return next(new Error("Invalid token"));
//       }

//       socket.data.userId = decoded.userId;
//       socket.data.phone = decoded.phone;
      
//       logger.info(`[Socket Auth] User ${decoded.userId} authenticated (Socket ID: ${socket.id})`);
//       next();
//     } catch (error: any) {
//       logger.error(`[Socket Auth] Error: ${error.message}`);
//       next(new Error("Authentication failed"));
//     }
//   });

//   // ==================== CONNECTION HANDLER ====================
//   io.on("connection", (socket: AuthenticatedSocket) => {
//     const userId = socket.data.userId;
    
//     // Join user-specific room (for notifications)
//     socket.join(`user:${userId}`);
//     logger.info(`[Socket] User ${userId} connected. Socket ID: ${socket.id}`);

//     // ==================== RIDE EVENTS ====================
    
//     /**
//      * Join ride event chat
//      */
//     socket.on("join-ride", async (data: { rideEventId: string }) => {
//       try {
//         const { rideEventId } = data;
//         socket.join(`ride:${rideEventId}`);
        
//         socket.to(`ride:${rideEventId}`).emit("user-joined", {
//           userId,
//           message: "User joined the ride",
//           timestamp: new Date()
//         });
        
//         socket.emit("join-success", {
//           rideEventId,
//           message: "Successfully joined ride chat"
//         });
        
//         logger.info(`[join-ride] User ${userId} joined ride ${rideEventId}`);
//       } catch (error: any) {
//         logger.error(`[join-ride] Error: ${error.message}`);
//         socket.emit("error", { message: error.message });
//       }
//     });

//     /**
//      * Leave ride event chat
//      */
//     socket.on("leave-ride", (data: { rideEventId: string }) => {
//       try {
//         const { rideEventId } = data;
//         socket.leave(`ride:${rideEventId}`);
        
//         socket.to(`ride:${rideEventId}`).emit("user-left", {
//           userId,
//           message: "User left the ride",
//           timestamp: new Date()
//         });
        
//         logger.info(`[leave-ride] User ${userId} left ride ${rideEventId}`);
//       } catch (error: any) {
//         logger.error(`[leave-ride] Error: ${error.message}`);
//       }
//     });

//     /**
//      * Send message in ride chat
//      */
//     socket.on("send-message-ride", (data: { rideEventId: string; text: string }) => {
//       try {
//         const { rideEventId, text } = data;
        
//         if (!text || text.trim().length === 0) {
//           socket.emit("error", { message: "Message cannot be empty" });
//           return;
//         }
        
//         io.to(`ride:${rideEventId}`).emit("new-message-ride", {
//           senderId: userId,
//           text: text.trim(),
//           timestamp: new Date()
//         });
        
//         logger.debug(`[send-message-ride] Message in ride ${rideEventId}`);
//       } catch (error: any) {
//         logger.error(`[send-message-ride] Error: ${error.message}`);
//         socket.emit("error", { message: error.message });
//       }
//     });

//     /**
//      * Stream GPS location during ride
//      */
//     socket.on("location-update", (data: {
//       rideEventId: string;
//       lat: number;
//       lng: number;
//       speed: number;
//     }) => {
//       try {
//         const { rideEventId, lat, lng, speed } = data;
        
//         if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
//           socket.emit("error", { message: "Invalid coordinates" });
//           return;
//         }
        
//         io.to(`ride:${rideEventId}`).emit("user-location", {
//           userId,
//           lat,
//           lng,
//           speed,
//           timestamp: new Date()
//         });
        
//         logger.debug(`[location-update] Location from ${userId} in ride ${rideEventId}`);
//       } catch (error: any) {
//         logger.error(`[location-update] Error: ${error.message}`);
//       }
//     });

//     /**
//      * SOS emergency alert
//      */
//     socket.on("sos-triggered", (data: { rideEventId: string; lat: number; lng: number }) => {
//       try {
//         const { rideEventId, lat, lng } = data;
        
//         io.to(`ride:${rideEventId}`).emit("sos-alert", {
//           userId,
//           lat,
//           lng,
//           message: `🚨 SOS triggered!`,
//           timestamp: new Date()
//         });
        
//         logger.warn(`[sos-triggered] SOS from ${userId} in ride ${rideEventId}`);
//       } catch (error: any) {
//         logger.error(`[sos-triggered] Error: ${error.message}`);
//       }
//     });

//     /**
//      * Ride typing indicator
//      */
//     socket.on("typing-ride", (data: { rideEventId: string }) => {
//       try {
//         socket.to(`ride:${data.rideEventId}`).emit("user-typing", { userId });
//         logger.debug(`[typing-ride] ${userId} typing in ride`);
//       } catch (error: any) {
//         logger.error(`[typing-ride] Error: ${error.message}`);
//       }
//     });

//     socket.on("stop-typing-ride", (data: { rideEventId: string }) => {
//       try {
//         socket.to(`ride:${data.rideEventId}`).emit("user-stop-typing", { userId });
//       } catch (error: any) {
//         logger.error(`[stop-typing-ride] Error: ${error.message}`);
//       }
//     });

//     // ==================== GROUPS ====================

//     /**
//      * Join group chat
//      */
//     socket.on("join-group-chat", (data: { groupId: string }) => {
//       try {
//         const { groupId } = data;
//         socket.join(`group:${groupId}`);
        
//         socket.to(`group:${groupId}`).emit("user-joined-group", {
//           userId,
//           message: "User joined the group",
//           timestamp: new Date()
//         });
        
//         socket.emit("join-success", {
//           groupId,
//           message: "Successfully joined group chat"
//         });
        
//         logger.info(`[join-group-chat] User ${userId} joined group ${groupId}`);
//       } catch (error: any) {
//         logger.error(`[join-group-chat] Error: ${error.message}`);
//         socket.emit("error", { message: error.message });
//       }
//     });

//     /**
//      * Leave group chat
//      */
//     socket.on("leave-group-chat", (data: { groupId: string }) => {
//       try {
//         const { groupId } = data;
//         socket.leave(`group:${groupId}`);
        
//         socket.to(`group:${groupId}`).emit("user-left-group", {
//           userId,
//           message: "User left the group",
//           timestamp: new Date()
//         });
        
//         logger.info(`[leave-group-chat] User ${userId} left group ${groupId}`);
//       } catch (error: any) {
//         logger.error(`[leave-group-chat] Error: ${error.message}`);
//       }
//     });

//     /**
//      * Send message in group chat
//      */
//     socket.on("send-message-group", (data: { groupId: string; text: string }) => {
//       try {
//         const { groupId, text } = data;
        
//         if (!text || text.trim().length === 0) {
//           socket.emit("error", { message: "Message cannot be empty" });
//           return;
//         }
        
//         io.to(`group:${groupId}`).emit("new-message-group", {
//           senderId: userId,
//           text: text.trim(),
//           timestamp: new Date()
//         });
        
//         logger.debug(`[send-message-group] Message in group ${groupId}`);
//       } catch (error: any) {
//         logger.error(`[send-message-group] Error: ${error.message}`);
//         socket.emit("error", { message: error.message });
//       }
//     });

//     /**
//      * Group typing indicator
//      */
//     socket.on("typing-group", (data: { groupId: string }) => {
//       try {
//         socket.to(`group:${data.groupId}`).emit("user-typing-group", { userId });
//         logger.debug(`[typing-group] ${userId} typing in group`);
//       } catch (error: any) {
//         logger.error(`[typing-group] Error: ${error.message}`);
//       }
//     });

//     socket.on("stop-typing-group", (data: { groupId: string }) => {
//       try {
//         socket.to(`group:${data.groupId}`).emit("user-stop-typing-group", { userId });
//       } catch (error: any) {
//         logger.error(`[stop-typing-group] Error: ${error.message}`);
//       }
//     });

//     // ==================== PRIVATE CHAT ====================

//     /**
//      * Join private 1:1 chat
//      */
//     socket.on("join-private-chat", (data: { roomId: string }) => {
//       try {
//         const { roomId } = data;
//         socket.join(`private:${roomId}`);
        
//         socket.emit("join-success", {
//           roomId,
//           message: "Successfully joined private chat"
//         });
        
//         logger.info(`[join-private-chat] User ${userId} joined room ${roomId}`);
//       } catch (error: any) {
//         logger.error(`[join-private-chat] Error: ${error.message}`);
//         socket.emit("error", { message: error.message });
//       }
//     });

//     /**
//      * Leave private chat
//      */
//     socket.on("leave-private-chat", (data: { roomId: string }) => {
//       try {
//         const { roomId } = data;
//         socket.leave(`private:${roomId}`);
//         logger.info(`[leave-private-chat] User ${userId} left room ${roomId}`);
//       } catch (error: any) {
//         logger.error(`[leave-private-chat] Error: ${error.message}`);
//       }
//     });

//     /**
//      * Send message in private chat
//      */
//     socket.on("send-message-private", (data: { roomId: string; text: string }) => {
//       try {
//         const { roomId, text } = data;
        
//         if (!text || text.trim().length === 0) {
//           socket.emit("error", { message: "Message cannot be empty" });
//           return;
//         }
        
//         io.to(`private:${roomId}`).emit("new-message-private", {
//           senderId: userId,
//           text: text.trim(),
//           timestamp: new Date()
//         });
        
//         logger.debug(`[send-message-private] Message in room ${roomId}`);
//       } catch (error: any) {
//         logger.error(`[send-message-private] Error: ${error.message}`);
//         socket.emit("error", { message: error.message });
//       }
//     });

//     /**
//      * Private chat typing indicator
//      */
//     socket.on("typing-private", (data: { roomId: string }) => {
//       try {
//         socket.to(`private:${data.roomId}`).emit("user-typing-private", { userId });
//         logger.debug(`[typing-private] ${userId} typing in private chat`);
//       } catch (error: any) {
//         logger.error(`[typing-private] Error: ${error.message}`);
//       }
//     });

//     socket.on("stop-typing-private", (data: { roomId: string }) => {
//       try {
//         socket.to(`private:${data.roomId}`).emit("user-stop-typing-private", { userId });
//       } catch (error: any) {
//         logger.error(`[stop-typing-private] Error: ${error.message}`);
//       }
//     });

//     // ==================== GENERAL ====================

//     /**
//      * Heartbeat ping/pong
//      */
//     socket.on("ping", () => {
//       socket.emit("pong");
//       logger.debug(`[Socket Ping] User ${userId}`);
//     });

//     /**
//      * Disconnect handler
//      */
//     socket.on("disconnect", (reason: string) => {
//       logger.info(`[Socket] User ${userId} disconnected. Reason: ${reason}`);
//     });

//     socket.on("error", (error: any) => {
//       logger.error(`[Socket Error] User ${userId}: ${error.message}`);
//     });
//   });

//   io.engine.on("connection_error", (err) => {
//     logger.error(`[Socket Engine Error]: ${err.message}`);
//   });

//   logger.info("✅ Socket.io server initialized with Ride + Group + Private Chat support");
//   return io;
// };

// /**
//  * Send notification to specific user via Socket.io
//  */
// export const sendNotificationToUser = (
//   io: SocketIOServer | null,
//   userId: string,
//   notification: {
//     type: "like" | "comment" | "follow" | "ride" | "event" | "group" | "mentor";
//     message: string;
//     fromUserId?: string;
//     fromUserName?: string;
//     rideEventId?: string;
//     groupId?: string;
//     postId?: string;
//   }
// ) => {
//   if (!io) {
//     logger.warn(`[sendNotificationToUser] Socket.io not available`);
//     return;
//   }

//   io.to(`user:${userId}`).emit("notification", {
//     ...notification,
//     timestamp: new Date(),
//     id: `notif_${Date.now()}`,
//   });

//   logger.info(`[sendNotificationToUser] Notification sent to ${userId}: ${notification.message}`);
// };

// /**
//  * Broadcast notification to multiple users
//  */
// export const sendNotificationToUsers = (
//   io: SocketIOServer | null,
//   userIds: string[],
//   notification: {
//     type: "like" | "comment" | "follow" | "ride" | "event" | "group" | "mentor";
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

//   logger.info(`[sendNotificationToUsers] Notifications sent to ${userIds.length} users`);
// };

// export default initializeSocket;



