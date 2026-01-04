import { Response } from 'express';
/**
 * ===============================
 * 1️⃣ GET MY EARNED BADGES
 * GET /api/v1/badges/me
 * ===============================
 */
export declare const getMyBadges: (req: any, res: Response) => Promise<Response<any, Record<string, any>>>;
/**
 * ===============================
 * 2️⃣ GET ALL BADGES (LOCKED + UNLOCKED)
 * GET /api/v1/badges
 * ===============================
 */
export declare const getAllBadges: (req: any, res: Response) => Promise<Response<any, Record<string, any>>>;
/**
 * ===============================
 * 3️⃣ GET MY AWARD HISTORY
 * GET /api/v1/awards/me
 * ===============================
 */
export declare const getMyAwards: (req: any, res: Response) => Promise<Response<any, Record<string, any>>>;
/**
 * ===============================
 * 4️⃣ BADGE PROGRESS (GAMIFICATION)
 * GET /api/v1/badges/progress
 * ===============================
 */
export declare const getBadgeProgress: (req: any, res: Response) => Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=badgeAward.controller.d.ts.map