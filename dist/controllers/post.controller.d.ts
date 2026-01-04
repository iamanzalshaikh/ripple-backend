import { Request, Response } from 'express';
interface AuthRequest extends Request {
    userId: string;
}
/**
 * POST /api/v1/posts
 * Create a new post with Cloudinary image upload
 *
 * MULTIPART FORM DATA (NOT JSON)
 *
 * Form Fields:
 * - caption: string (optional)
 * - privacy: 'private' | 'friends' | 'public' (default: 'friends')
 * - rideId: string (optional)
 * - location: JSON string (optional)
 *
 * Files:
 * - media: Array of image/video files
 */
export declare const createPost: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
/**
 * GET /api/v1/posts/feed
 * Get personalized feed
 */
export declare const getFeed: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
/**
 * POST /api/v1/posts/:id/like
 * Like or unlike a post
 */
export declare const likePost: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
/**
 * POST /api/v1/posts/:id/comment
 * Add comment to post
 */
export declare const commentPost: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
/**
 * GET /api/v1/posts/:id/comments
 * Get all comments on a post
 */
export declare const getComments: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
/**
 * DELETE /api/v1/posts/:id
 * Delete own post
 */
export declare const deletePost: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
/**
 * DELETE /api/v1/posts/:postId/comments/:commentId
 * Delete own comment
 */
export declare const deleteComment: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
export {};
//# sourceMappingURL=post.controller.d.ts.map