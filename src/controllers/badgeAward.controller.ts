// import { Request, Response } from 'express';
// import User from '../models/user.model';
// import Badge from '../models/badge.model';
// import Award from '../models/award.model';

// /**
//  * ===============================
//  * 1️⃣ GET MY EARNED BADGES
//  * GET /api/v1/badges/me
//  * ===============================
//  */
// export const getMyBadges = async (req: any, res: Response) => {
//   try {
//     const user = await User.findById(req.userId)
//       .populate('badges');

//     if (!user) {
//       return res.status(404).json({ success: false, error: 'User not found' });
//     }

//     return res.json({
//       success: true,
//       data: {
//         totalBadges: user.totalBadges,
//         badges: user.badges
//       }
//     });
//   } catch (error: any) {
//     return res.status(500).json({ success: false, error: error.message });
//   }
// };

// /**
//  * ===============================
//  * 2️⃣ GET ALL BADGES (LOCKED + UNLOCKED)
//  * GET /api/v1/badges
//  * ===============================
//  */
// export const getAllBadges = async (req: any, res: Response) => {
//   try {
//     const [badges, user] = await Promise.all([
//       Badge.find().lean(),
//       User.findById(req.userId).select('badges')
//     ]);

//     if (!user) {
//       return res.status(404).json({ success: false, error: 'User not found' });
//     }

//     const earnedSet = new Set(
//       user.badges.map((id: any) => id.toString())
//     );

//     const result = badges.map((badge: any) => ({
//       ...badge,
//       earned: earnedSet.has(badge._id.toString())
//     }));

//     return res.json({
//       success: true,
//       data: result
//     });
//   } catch (error: any) {
//     return res.status(500).json({ success: false, error: error.message });
//   }
// };

// /**
//  * ===============================
//  * 3️⃣ GET MY AWARD HISTORY
//  * GET /api/v1/awards/me
//  * ===============================
//  */
// export const getMyAwards = async (req: any, res: Response) => {
//   try {
//     const awards = await Award.find({ userId: req.userId })
//       .populate('badgeId')
//       .sort({ awardedAt: -1 });

//     return res.json({
//       success: true,
//       data: awards
//     });
//   } catch (error: any) {
//     return res.status(500).json({ success: false, error: error.message });
//   }
// };

// /**
//  * ===============================
//  * 4️⃣ BADGE PROGRESS (GAMIFICATION)
//  * GET /api/v1/badges/progress
//  * ===============================
//  */
// export const getBadgeProgress = async (req: any, res: Response) => {
//   try {
//     const user = await User.findById(req.userId);
//     const badges = await Badge.find();

//     if (!user) {
//       return res.status(404).json({ success: false, error: 'User not found' });
//     }

//     const earnedSet = new Set(
//       user.badges.map((id: any) => id.toString())
//     );

//     const progress = badges.map((badge: any) => {
//       let remaining: number | null = null;

//       if (badge.code === 'century_rider') {
//         remaining = Math.max(0, 100 - user.totalDistance / 1000);
//       }

//       if (badge.code === '500km_club') {
//         remaining = Math.max(0, 500 - user.totalDistance / 1000);
//       }

//       if (badge.code === 'thousand_km_club') {
//         remaining = Math.max(0, 1000 - user.totalDistance / 1000);
//       }

//       return {
//         badge,
//         earned: earnedSet.has(badge._id.toString()),
//         remaining
//       };
//     });

//     return res.json({
//       success: true,
//       data: progress
//     });
//   } catch (error: any) {
//     return res.status(500).json({ success: false, error: error.message });
//   }
// };


import { Request, Response } from 'express';
import User from '../models/user.model.js';
import Badge from '../models/badge.model.js';
import Award from '../models/award.model.js';

/**
 * ===============================
 * 1️⃣ GET MY EARNED BADGES
 * GET /api/v1/badges/me
 * ===============================
 */
// export const getMyBadges = async (req: any, res: Response) => {
//   try {
//     const user = await User.findById(req.userId)
//       .populate('badges');

//     if (!user) {
//       return res.status(404).json({ success: false, error: 'User not found' });
//     }

//     return res.json({
//       success: true,
//       data: {
//         totalBadges: user.totalBadges,
//         badges: user.badges
//       }
//     });
//   } catch (error: any) {
//     return res.status(500).json({ success: false, error: error.message });
//   }
// };



export const getMyBadges = async (req: any, res: Response) => {
    try {
      const userId = req.userId;
  
      // Fetch user with populated badges
      const user = await User.findById(userId)
        .populate({
          path: 'badges',
          model: 'Badge'
        })
        .lean();
  
      if (!user) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }
  
      console.log(`[getMyBadges] User ${userId}:`, {
        totalBadges: user.totalBadges,
        badgesCount: user.badges?.length,
        badges: user.badges
      });
  
      return res.json({
        success: true,
        data: {
          totalBadges: user.totalBadges,
          badges: user.badges || []
        }
      });
    } catch (error: any) {
      console.error('[getMyBadges] Error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  };


/**
 * ===============================
 * 2️⃣ GET ALL BADGES (LOCKED + UNLOCKED)
 * GET /api/v1/badges
 * ===============================
 */
export const getAllBadges = async (req: any, res: Response) => {
  try {
    const [badges, user] = await Promise.all([
      Badge.find().lean(),
      User.findById(req.userId).select('badges')
    ]);

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const earnedSet = new Set(
      user.badges.map((id: any) => id.toString())
    );

    const result = badges.map((badge: any) => ({
      ...badge,
      earned: earnedSet.has(badge._id.toString())
    }));

    return res.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * ===============================
 * 3️⃣ GET MY AWARD HISTORY
 * GET /api/v1/awards/me
 * ===============================
 */
export const getMyAwards = async (req: any, res: Response) => {
  try {
    const awards = await Award.find({ userId: req.userId })
      .populate('badgeId')
      .sort({ awardedAt: -1 });

    return res.json({
      success: true,
      data: awards
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * ===============================
 * 4️⃣ BADGE PROGRESS (GAMIFICATION)
 * GET /api/v1/badges/progress
 * ===============================
 */
export const getBadgeProgress = async (req: any, res: Response) => {
  try {
    const user = await User.findById(req.userId);
    const badges = await Badge.find();

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const earnedSet = new Set(
      user.badges.map((id: any) => id.toString())
    );

    const progress = badges.map((badge: any) => {
      let remaining: number | null = null;

      // ✅ FIX: totalDistance is already in KM, don't divide by 1000
      if (badge.code === 'century_rider') {
        remaining = Math.max(0, 100 - user.totalDistance);
      }

      if (badge.code === '500km_club') {
        remaining = Math.max(0, 500 - user.totalDistance);
      }

      if (badge.code === 'thousand_km_club') {
        remaining = Math.max(0, 1000 - user.totalDistance);
      }

      return {
        badge,
        earned: earnedSet.has(badge._id.toString()),
        remaining
      };
    });

    return res.json({
      success: true,
      data: progress
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
};