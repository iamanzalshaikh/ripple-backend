import { Request, Response } from 'express';
interface AuthRequest extends Request {
    userId: string;
}
/**
 * POST /api/v1/rides/start
 * Start a new ride
 */
export declare const startRide: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
/**
 * PATCH /api/v1/rides/:id/stream
 * Stream GPS chunks during ride
 * ✅ FIX: Only accept if status is 'active' (NOT paused)
 */
export declare const streamChunk: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
/**
 * PATCH /api/v1/rides/:id/pause
 * Pause current ride
 */
export declare const pauseRide: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
/**
 * PATCH /api/v1/rides/:id/resume
 * Resume paused ride
 */
export declare const resumeRide: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
/**
 * PATCH /api/v1/rides/:id/end
 * End ride, calculate stats, trigger background jobs
 */
export declare const endRide: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
/**
 * GET /api/v1/rides/me
 * Get user's rides with pagination
 */
export declare const getMyRides: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
/**
 * GET /api/v1/rides/:id
 * Get single ride details
 */
export declare const getRideById: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
/**
 * GET /api/v1/rides/live/:token
 * Public live ride tracking (NO AUTH)
 */
export declare const getLiveRide: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
/**
 * DELETE /api/v1/rides/:id
 * Delete a ride
 */
export declare const deleteRide: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
export {};
//# sourceMappingURL=ride.controller.d.ts.map