import { Response } from 'express';
import { AuthRequest } from '../types/auth.types.js';
export declare const triggerSOS: (req: AuthRequest, res: Response) => Promise<any>;
export declare const updateSOSLocation: (req: AuthRequest, res: Response) => Promise<any>;
export declare const resolveSOSAlert: (req: AuthRequest, res: Response) => Promise<any>;
/**
 * ✅ GET /api/v1/safety/sos-history
 */
export declare const getSOSHistory: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getLiveSOSTracking: (req: any, res: Response) => Promise<any>;
//# sourceMappingURL=soslog.controller.d.ts.map