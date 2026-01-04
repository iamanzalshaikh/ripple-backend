// // ==========================================
// // File: src/routes/post.routes.ts (WITH MULTER)
// // ==========================================
// import express, { Router } from 'express';

// import isAuth from '../middlewares/auth.middleware';
// import upload from '../middlewares/upload.middleware';
// import { commentPost, createPost, deleteComment, deletePost, getComments, getFeed, likePost } from '../controllers/post.controller';


// const router: Router = express.Router();

// /**
//  * ==================== POST CREATION ====================

//  * Response (201):
//  * {
//  *   "success": true,
//  *   "data": {
//  *     "_id": "...",
//  *     "userId": { "name": "...", "avatar": "..." },
//  *     "caption": "Just finished a 100km ride!",
//  *     "media": [
//  *       {
//  *         "url": "https://res.cloudinary.com/.../photo1.jpg",
//  *         "type": "photo"
//  *       },
//  *       {
//  *         "url": "https://res.cloudinary.com/.../video1.mp4",
//  *         "type": "video"
//  *       }
//  *     ],
//  *     "privacy": "friends",
//  *     "likeCount": 0,
//  *     "commentCount": 0,
//  *     "createdAt": "2024-01-01T12:00:00Z"
//  *   }
//  * }
//  */
// router.post('/', isAuth, upload.array('media', 5), createPost);  // ✅ ADD MULTER MIDDLEWARE


// /**
//  * ==================== FEED ====================
//  */

// /**
//  * GET /api/v1/posts/feed
//  * Get personalized feed (respects privacy + following)
//  *
//  * Headers: Authorization: Bearer YOUR_TOKEN
//  * Query Parameters:
//  * - page: number (default: 1)
//  * - limit: number (default: 10, max: 50)
//  *
//  * Example: GET /api/v1/posts/feed?page=1&limit=20
//  *
//  * Response (200):
//  * {
//  *   "success": true,
//  *   "data": [
//  *     {
//  *       "_id": "...",
//  *       "userId": { "name": "...", "avatar": "...", "handle": "..." },
//  *       "caption": "...",
//  *       "media": [...],
//  *       "likeCount": 5,
//  *       "commentCount": 2,
//  *       "createdAt": "2024-01-01T12:00:00Z"
//  *     }
//  *   ],
//  *   "pagination": { ... }
//  * }
//  */
// router.get('/feed', isAuth, getFeed);


// /**
//  * ==================== LIKES ====================
//  */

// /**
//  * POST /api/v1/posts/:id/like
//  * Like or unlike a post (toggle)
//  *
//  * Headers: Authorization: Bearer YOUR_TOKEN
//  * Path Parameters:
//  * - id: post ID (required)
//  *
//  * Response (200):
//  * {
//  *   "success": true,
//  *   "data": {
//  *     "liked": true,
//  *     "likeCount": 6
//  *   }
//  * }
//  */
// router.post('/:id/like', isAuth, likePost);


// /**
//  * ==================== COMMENTS ====================
//  */

// /**
//  * GET /api/v1/posts/:id/comments
//  * Get all comments on a post
//  *
//  * Headers: Authorization: Bearer YOUR_TOKEN
//  * Path Parameters:
//  * - id: post ID (required)
//  * Query Parameters:
//  * - page: number (default: 1)
//  * - limit: number (default: 20, max: 100)
//  *
//  * Response (200):
//  * {
//  *   "success": true,
//  *   "data": [ ... ],
//  *   "pagination": { ... }
//  * }
//  */
// router.get('/:id/comments', isAuth, getComments);

// /**
//  * POST /api/v1/posts/:id/comment
//  * Add a comment to a post
//  *
//  * Headers: Authorization: Bearer YOUR_TOKEN
//  * Path Parameters:
//  * - id: post ID (required)
//  * Body (JSON):
//  * {
//  *   "text": "Great ride!"
//  * }
//  *
//  * Response (201):
//  * {
//  *   "success": true,
//  *   "data": { ... }
//  * }
//  */
// router.post('/:id/comment', isAuth, commentPost);

// /**
//  * DELETE /api/v1/posts/:postId/comments/:commentId
//  * Delete own comment
//  *
//  * Headers: Authorization: Bearer YOUR_TOKEN
//  * Path Parameters:
//  * - postId: post ID (required)
//  * - commentId: comment ID (required)
//  *
//  * Response (200):
//  * {
//  *   "success": true,
//  *   "data": { "message": "Comment deleted" }
//  * }
//  */
// router.delete('/:postId/comments/:commentId', isAuth, deleteComment);


// /**
//  * ==================== DELETE POST ====================
//  */

// /**
//  * DELETE /api/v1/posts/:id
//  * Delete own post
//  *
//  * Headers: Authorization: Bearer YOUR_TOKEN
//  * Path Parameters:
//  * - id: post ID (required)
//  *
//  * Response (200):
//  * {
//  *   "success": true,
//  *   "data": { "message": "Post deleted" }
//  * }
//  */
// router.delete('/:id', isAuth, deletePost);

// export default router;




import express, { Router } from 'express';
import isAuth from '../middlewares/auth.middleware.js';
import upload from '../middlewares/upload.middleware.js';
import { commentPost, createPost, deleteComment, deletePost, getComments, getFeed, likePost } from '../controllers/post.controller.js';

const router: Router = express.Router();

// Wrap handlers to satisfy Express typing
const wrappedCreatePost: any = createPost;
const wrappedGetFeed: any = getFeed;
const wrappedLikePost: any = likePost;
const wrappedGetComments: any = getComments;
const wrappedCommentPost: any = commentPost;
const wrappedDeleteComment: any = deleteComment;
const wrappedDeletePost: any = deletePost;

router.post('/', isAuth, upload.array('media', 5), wrappedCreatePost);
router.get('/feed', isAuth, wrappedGetFeed);
router.post('/:id/like', isAuth, wrappedLikePost);
router.get('/:id/comments', isAuth, wrappedGetComments);
router.post('/:id/comment', isAuth, wrappedCommentPost);
router.delete('/:postId/comments/:commentId', isAuth, wrappedDeleteComment);
router.delete('/:id', isAuth, wrappedDeletePost);

export default router;
