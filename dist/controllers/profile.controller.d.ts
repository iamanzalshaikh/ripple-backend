import { Response } from "express";
import { AuthRequest } from "../types/auth.types.js";
export declare const getMyProfile: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const updateMyProfile: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
/**
* ✅ GET /api/v1/profile/emergency-contacts
* Get all emergency contacts for current user
*/
export declare const getEmergencyContacts: (req: AuthRequest, res: Response) => Promise<any>;
/**
 * ✅ PATCH /api/v1/profile/emergency-contacts/:id
 * Update emergency contact
 * Body: { name?, phone?, email?, relation?, priority? }
 */
export declare const updateEmergencyContact: (req: AuthRequest, res: Response) => Promise<any>;
/**
 * ✅ DELETE /api/v1/profile/emergency-contacts/:id
 * Delete emergency contact
 */
export declare const deleteEmergencyContact: (req: AuthRequest, res: Response) => Promise<any>;
/**
 * ✅ PATCH /api/v1/profile/emergency-contacts/reorder
 * Reorder emergency contacts by priority
 * Body: { contacts: [{ id, priority }, ...] }
 */
export declare const reorderEmergencyContacts: (req: AuthRequest, res: Response) => Promise<any>;
export declare const updateAvatar: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const addEmergencyContact: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const updatePrivacySettings: (req: AuthRequest, res: Response) => Promise<void>;
//# sourceMappingURL=profile.controller.d.ts.map