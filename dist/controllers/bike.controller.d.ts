import { Response } from "express";
import { AuthRequest } from "../types/auth.types";
/**
 * POST /api/v1/bikes
 * Add a new bike
 */
export declare const addBike: (req: AuthRequest, res: Response) => Promise<void>;
/**
 * Get all bikes for user
 * GET /api/v1/bikes
 */
export declare const getBikes: (req: AuthRequest, res: Response) => Promise<void>;
/**
 * Get single bike by ID
 * GET /api/v1/bikes/:id
 */
export declare const getBikeById: (req: AuthRequest, res: Response) => Promise<void>;
/**
 * Update bike details
 * PATCH /api/v1/bikes/:id
 */
export declare const updateBike: (req: AuthRequest, res: Response) => Promise<void>;
/**
 * Set bike as primary
 * PATCH /api/v1/bikes/:id/set-primary
 */
export declare const setPrimaryBike: (req: AuthRequest, res: Response) => Promise<void>;
/**
 * Delete bike (soft delete)
 * DELETE /api/v1/bikes/:id
 */
export declare const deleteBike: (req: AuthRequest, res: Response) => Promise<void>;
/**
 * Get primary bike
 * GET /api/v1/bikes/primary
 */
export declare const getPrimaryBike: (req: AuthRequest, res: Response) => Promise<void>;
/**
 * Get bike count for user
 * GET /api/v1/bikes/count
 */
export declare const getBikeCount: (req: AuthRequest, res: Response) => Promise<void>;
//# sourceMappingURL=bike.controller.d.ts.map