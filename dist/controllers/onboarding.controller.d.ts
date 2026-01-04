import { Response } from "express";
import { AuthRequest } from "../types/auth.types.js";
/**
 * Check onboarding status
 * GET /api/v1/onboarding/status
 */
export declare const checkOnboardingStatus: (req: AuthRequest, res: Response) => Promise<void>;
/**
 * Complete onboarding
 * PATCH /api/v1/onboarding/complete
 */
export declare const completeOnboarding: (req: AuthRequest, res: Response) => Promise<void>;
//# sourceMappingURL=onboarding.controller.d.ts.map