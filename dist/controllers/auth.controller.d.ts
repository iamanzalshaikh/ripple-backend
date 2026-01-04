import { Response } from "express";
import { AuthRequest } from "../types/auth.types.js";
/**
 * Step 1: Send OTP to Email (Signup)
 * POST /api/v1/auth/signup/send-otp
 * Body: { email, phone }
 * NOTE: User is NOT created yet, only OTP is sent to email
 */
export declare const sendSignupOtp: (req: AuthRequest, res: Response) => Promise<void>;
/**
 * Step 2: Verify OTP & CREATE USER (Signup)
 * POST /api/v1/auth/signup/verify-otp
 * Body: { email, phone, otp }
 * NOTE: User is CREATED ONLY AFTER OTP verification succeeds ✅
 */
export declare const verifySignupOtp: (req: AuthRequest, res: Response) => Promise<void>;
/**
 * Step 1: Send OTP to Email (Login)
 * POST /api/v1/auth/login/send-otp
 * Body: { email }
 */
export declare const sendLoginOtp: (req: AuthRequest, res: Response) => Promise<void>;
/**
 * Step 2: Verify OTP & Login with Email Only
 * POST /api/v1/auth/login/verify-otp
 * Body: { email, otp }
 */
export declare const verifyLoginOtp: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getCurrentUser: (req: AuthRequest, res: Response) => Promise<void>;
//# sourceMappingURL=auth.controller.d.ts.map