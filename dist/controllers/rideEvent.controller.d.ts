import { Request, Response } from 'express';
interface AuthRequest extends Request {
    userId: string;
}
export declare const createRideEvent: (req: AuthRequest, res: Response) => void;
/**
 * GET /api/v1/ride-events
 * List nearby group rides
 */
export declare const listRideEvents: (req: AuthRequest, res: Response) => void;
/**
 * GET /api/v1/ride-events/:id
 * Get ride detail
 */
export declare const getRideEventDetail: (req: AuthRequest, res: Response) => void;
/**
 * POST /api/v1/ride-events/:id/rsvp
 * Join a group ride
 */
export declare const rsvpRideEvent: (req: AuthRequest, res: Response) => void;
/**
 * POST /api/v1/ride-events/:id/start
 * Start group ride (Organizer only)
 */
export declare const startRideEvent: (req: AuthRequest, res: Response) => void;
export declare const streamRideEventLocation: (req: AuthRequest, res: Response) => void;
export declare const getRideEventLive: (req: AuthRequest, res: Response) => void;
/**
 * GET /api/v1/ride-events/:id/summary
 * Get completed ride summary with all stats
 */
export declare const getRideEventSummary: (req: AuthRequest, res: Response) => void;
/**
 * POST /api/v1/ride-events/:id/end
 * End group ride (Organizer only)
 */
export declare const endRideEvent: (req: AuthRequest, res: Response) => void;
/**
 * POST /api/v1/ride-events/:id/rate/:targetUserId
 * Rate another rider
 */
export declare const rateRider: (req: AuthRequest, res: Response) => void;
export declare const sendChatMessage: (req: AuthRequest, res: Response) => void;
/**
 * GET /api/v1/ride-events/:id/chat
 * Get chat messages (COMPLETE)
 */
export declare const getChatMessages: (req: AuthRequest, res: Response) => void;
export {};
//# sourceMappingURL=rideEvent.controller.d.ts.map