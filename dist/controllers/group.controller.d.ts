import { Request, Response } from 'express';
interface AuthRequest extends Request {
    userId: string;
}
/**
 * POST /api/v1/groups
 * Create a new group (verified users only)
 */
export declare const createGroup: (req: AuthRequest, res: Response) => Promise<void>;
/**
 * GET /api/v1/groups
 * Search groups with text search
 */
export declare const searchGroups: (req: AuthRequest, res: Response) => Promise<void>;
/**
 * GET /api/v1/groups/:id
 * Get group details
 */
export declare const getGroupDetail: (req: AuthRequest, res: Response) => Promise<void>;
/**
 * POST /api/v1/groups/:id/join
 * Join a group or request to join
 */
export declare const joinGroup: (req: AuthRequest, res: Response) => Promise<void>;
/**
 * POST /api/v1/groups/:id/approve/:requestUserId
 * Admin approves join request
 */
export declare const approveJoinRequest: (req: AuthRequest, res: Response) => Promise<void>;
/**
 * POST /api/v1/groups/:id/leave
 * Leave a group
 */
export declare const leaveGroup: (req: AuthRequest, res: Response) => Promise<void>;
/**
 * GET /api/v1/groups/:id/members
 * Get all group members with pagination
 */
export declare const getGroupMembers: (req: AuthRequest, res: Response) => Promise<void>;
/**
 * DELETE /api/v1/groups/:id
 * Delete group (admin only)
 */
export declare const deleteGroup: (req: AuthRequest, res: Response) => Promise<void>;
export {};
//# sourceMappingURL=group.controller.d.ts.map