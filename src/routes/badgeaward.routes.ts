

import express from 'express';
import { getAllBadges, getBadgeProgress, getMyAwards, getMyBadges } from '../controllers/badgeAward.controller';
import isAuth from '../middlewares/auth.middleware';

const router = express.Router();

/**
 * Badge APIs
 */
router.get('/me', isAuth, getMyBadges);
router.get('/', isAuth, getAllBadges);
router.get('/progress', isAuth, getBadgeProgress);

/**
 * Award APIs
 */
router.get('/awards/me', isAuth, getMyAwards);

export default router;