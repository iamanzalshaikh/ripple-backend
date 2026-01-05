import { Request, Response } from 'express';
interface AuthRequest extends Request {
    userId: string;
}
/**
 * POST /api/v1/chat/private/start/:targetUserId
 * Start or get private chat with another user
 */
export declare const startPrivateChat: (req: AuthRequest, res: Response) => void;
/**
 * GET /api/v1/chat/private/:roomId/messages
 * Get private chat history
 */
export declare const getPrivateChatMessages: (req: AuthRequest, res: Response) => void;
/**
 * POST /api/v1/chat/private/:roomId/send
 * Send private message (REST fallback)
 */
export declare const sendPrivateMessage: (req: AuthRequest, res: Response) => void;
/**
 * GET /api/v1/chat/private/conversations
 * Get all private conversations for user
 */
export declare const getPrivateConversations: (req: AuthRequest, res: Response) => void;
/**
 * DELETE /api/v1/chat/private/:roomId
 * Delete private chat room
 */
export declare const deletePrivateChat: (req: AuthRequest, res: Response) => void;
export {};
//# sourceMappingURL=private.controller.d.ts.map