import express from 'express';
import {
  followUser,
  unfollowUser,
    getFollowers,
    getFollowing,
    checkFollowStatus,
    getFollowCounts,
    } from '../controllers/follow.controller.js';
import isAuth from '../middlewares/auth.middleware.js';

const router: express.Router = express.Router();

// Follow/Unfollow operations
router.post('/:userIdToFollow/follow', isAuth, followUser);
router.post('/:userIdToUnfollow/unfollow', isAuth, unfollowUser);

// Get followers/following lists
router.get('/:userId/followers', getFollowers);
router.get('/:userId/following', getFollowing);

// Check if current user follows target user
router.get('/:userIdToCheck/check-follow-status', isAuth, checkFollowStatus);

// Get follow counts
router.get('/:userId/follow-counts', getFollowCounts);

export default router;