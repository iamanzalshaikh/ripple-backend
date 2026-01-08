import { Request, Response } from 'express';
import Group from '../models/group.model.js';
import User from '../models/user.model.js';
import Notification from '../models/notification.model.js';
import logger from '../config/logger.js';
import { v4 as uuidv4 } from 'uuid';

interface AuthRequest extends Request {
  userId: string;
}

/**
 * POST /api/v1/groups
 * Create a new group (verified users only)
 */
export const createGroup = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, description, location, privacy = 'public', tags = [], avatarUrl } = req.body;
    const creatorId = req.userId;

    logger.info(`[createGroup] User ${creatorId} creating group: ${name}`);

    if (!name || name.trim().length === 0) {
      res.status(400).json({ success: false, error: 'Group name required' });
      return;
    }

    // Verify user is verified
    const creator = await User.findById(creatorId);
    if (!creator) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    if (!creator.verified) {
      res.status(403).json({ success: false, error: 'Must be verified to create group' });
      return;
    }

    // Create group
    const chatRoomId = `group-${uuidv4()}`;
    const group = new Group({
      name,
      description,
      location,
      createdBy: creatorId,
      privacy,
      avatarUrl,
      tags,
      chatRoomId,
      members: [
        {
          userId: creatorId,
          role: 'admin',
          joinedAt: new Date()
        }
      ],
      stats: {
        totalMembers: 1,
        totalRides: 0
      }
    });

    await group.save();
    logger.info(`[createGroup] Group ${group._id} created`);

    res.status(201).json({
      success: true,
      data: {
        groupId: group._id,
        name: group.name,
        privacy: group.privacy,
        chatRoomId: group.chatRoomId
      }
    });
  } catch (error: any) {
    logger.error(`[createGroup] Error: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * GET /api/v1/groups
 * Search groups with text search
 */
export const searchGroups = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { search = '', privacy, page = 1, limit = 10 } = req.query;

    let query: any = {};

    if (search) {
      query.$text = { $search: search as string };
    }

    if (privacy) {
      query.privacy = privacy;
    }

    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(50, parseInt(limit as string) || 10);
    const skip = (pageNum - 1) * limitNum;

    const groups = await Group.find(query)
      .populate('createdBy', 'name avatarUrl verified')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    const total = await Group.countDocuments(query);

    const enriched = groups.map((group: any) => ({
      ...group,
      memberCount: group.members?.length || 0,
      requestCount: group.joinRequests?.length || 0
    }));

    logger.info(`[searchGroups] Found ${groups.length} groups`);

    res.json({
      success: true,
      data: enriched,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error: any) {
    logger.error(`[searchGroups] Error: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * GET /api/v1/groups/:id
 * Get group details
 */
export const getGroupDetail = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const group = await Group.findById(id)
      .populate('createdBy', 'name avatarUrl verified')
      .populate('members.userId', 'name avatarUrl')
      .populate('joinRequests.userId', 'name avatarUrl')
      .lean();

    if (!group) {
      res.status(404).json({ success: false, error: 'Group not found' });
      return;
    }

    const isMember = group.members.some((m: any) => m.userId._id.toString() === userId);
    const isAdmin = group.members.some((m: any) => m.userId._id.toString() === userId && m.role === 'admin');
    const hasRequestPending = group.joinRequests.some((r: any) => r.userId._id.toString() === userId);

    res.json({
      success: true,
      data: {
        ...group,
        isMember,
        isAdmin,
        hasRequestPending,
        memberCount: group.members.length,
        requestCount: group.joinRequests.length
      }
    });
  } catch (error: any) {
    logger.error(`[getGroupDetail] Error: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * POST /api/v1/groups/:id/join
 * Join a group or request to join
 */
export const joinGroup = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    logger.info(`[joinGroup] User ${userId} attempting to join group ${id}`);

    const group = await Group.findById(id);
    if (!group) {
      res.status(404).json({ success: false, error: 'Group not found' });
      return;
    }

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    // Check if already a member
    const alreadyMember = group.members.some((m: any) => m.userId.toString() === userId);
    if (alreadyMember) {
      res.status(400).json({ success: false, error: 'Already a member' });
      return;
    }

    // Check if request pending
    const hasPendingRequest = group.joinRequests.some((r: any) => r.userId.toString() === userId);
    if (hasPendingRequest) {
      res.status(400).json({ success: false, error: 'Join request already pending' });
      return;
    }

    // If public, auto-join
    if (group.privacy === 'public') {
      group.members.push({
        userId: userId as any,
        role: 'member',
        joinedAt: new Date()
      });
      group.stats.totalMembers = group.members.length;

      await group.save();

      logger.info(`[joinGroup] User ${userId} auto-joined public group ${id}`);

      res.json({
        success: true,
        data: {
          groupId: group._id,
          status: 'joined',
          message: 'Successfully joined group!'
        }
      });
      return;
    }

    // If private/friends, request
    group.joinRequests.push({
      userId: userId as any,
      requestedAt: new Date()
    });

    await group.save();

    // Notify admins
    const admins = group.members.filter((m: any) => m.role === 'admin');
    for (const admin of admins) {
      await Notification.create({
        userId: admin.userId,
        type: 'group',
        message: `${user.name} requested to join ${group.name}`,
        read: false,
        relatedId: group._id
      });
    }

    logger.info(`[joinGroup] User ${userId} requested to join ${id}`);

    res.json({
      success: true,
      data: {
        groupId: group._id,
        status: 'pending',
        message: 'Join request sent to admins!'
      }
    });
  } catch (error: any) {
    logger.error(`[joinGroup] Error: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * POST /api/v1/groups/:id/approve/:requestUserId
 * Admin approves join request
 */
export const approveJoinRequest = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id, requestUserId } = req.params;
    const adminId = req.userId;

    logger.info(`[approveJoinRequest] Admin ${adminId} approving ${requestUserId} for group ${id}`);

    const group = await Group.findById(id);
    if (!group) {
      res.status(404).json({ success: false, error: 'Group not found' });
      return;
    }

    // Verify user is admin
    const isAdmin = group.members.some((m: any) => m.userId.toString() === adminId && m.role === 'admin');
    if (!isAdmin) {
      res.status(403).json({ success: false, error: 'Only admin can approve' });
      return;
    }

    // Remove from requests
    group.joinRequests = group.joinRequests.filter((r: any) => r.userId.toString() !== requestUserId);

    // Add to members
    const alreadyMember = group.members.some((m: any) => m.userId.toString() === requestUserId);
    if (!alreadyMember) {
      group.members.push({
        userId: requestUserId as any,
        role: 'member',
        joinedAt: new Date()
      });
      group.stats.totalMembers = group.members.length;
    }

    await group.save();

    // Notify user
    await Notification.create({
      userId: requestUserId,
      type: 'group',
      message: `You were approved to join ${group.name}!`,
      read: false,
      relatedId: group._id
    });

    logger.info(`[approveJoinRequest] User ${requestUserId} approved for group ${id}`);

    res.json({
      success: true,
      data: { message: 'User approved' }
    });
  } catch (error: any) {
    logger.error(`[approveJoinRequest] Error: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * POST /api/v1/groups/:id/leave
 * Leave a group
 */
export const leaveGroup = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    logger.info(`[leaveGroup] User ${userId} leaving group ${id}`);

    const group = await Group.findById(id);
    if (!group) {
      res.status(404).json({ success: false, error: 'Group not found' });
      return;
    }

    const memberIndex = group.members.findIndex((m: any) => m.userId.toString() === userId);
    if (memberIndex === -1) {
      res.status(400).json({ success: false, error: 'Not a member' });
      return;
    }

    // Prevent last admin from leaving
    const isLastAdmin = group.members[memberIndex].role === 'admin' && 
                        group.members.filter((m: any) => m.role === 'admin').length === 1;
    if (isLastAdmin) {
      res.status(400).json({ success: false, error: 'Cannot leave: you are the only admin' });
      return;
    }

    group.members.splice(memberIndex, 1);
    group.stats.totalMembers = group.members.length;

    await group.save();

    logger.info(`[leaveGroup] User ${userId} left group ${id}`);

    res.json({
      success: true,
      data: { message: 'Left group' }
    });
  } catch (error: any) {
    logger.error(`[leaveGroup] Error: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * GET /api/v1/groups/:id/members
 * Get all group members with pagination
 */
export const getGroupMembers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(100, parseInt(limit as string) || 20);
    const skip = (pageNum - 1) * limitNum;

    const group = await Group.findById(id)
      .populate({
        path: 'members.userId',
        select: 'name avatarUrl verified ridingHours',
        options: { skip, limit: limitNum }
      })
      .lean();

    if (!group) {
      res.status(404).json({ success: false, error: 'Group not found' });
      return;
    }

    const total = group.members.length;

    res.json({
      success: true,
      data: group.members,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error: any) {
    logger.error(`[getGroupMembers] Error: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * DELETE /api/v1/groups/:id
 * Delete group (admin only)
 */
export const deleteGroup = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    logger.info(`[deleteGroup] User ${userId} deleting group ${id}`);

    const group = await Group.findById(id);
    if (!group) {
      res.status(404).json({ success: false, error: 'Group not found' });
      return;
    }

    const isAdmin = group.members.some((m: any) => m.userId.toString() === userId && m.role === 'admin');
    if (!isAdmin) {
      res.status(403).json({ success: false, error: 'Only admin can delete' });
      return;
    }

    await Group.findByIdAndDelete(id);

    logger.info(`[deleteGroup] Group ${id} deleted`);

    res.json({
      success: true,
      data: { message: 'Group deleted' }
    });
  } catch (error: any) {
    logger.error(`[deleteGroup] Error: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
};


// import { Request, Response } from 'express';
// import Group from '../models/group.model';
// import User from '../models/user.model';
// import Notification from '../models/notification.model';
// import logger from '../config/logger';
// import { v4 as uuidv4 } from 'uuid';

// interface AuthRequest extends Request {
//   userId: string;
// }

// /**
//  * POST /api/v1/groups
//  * Create a new group (verified users only)
//  */
// export const createGroup = (req: AuthRequest, res: Response): void => {
//   (async () => {
//     try {
//       const { name, description, location, privacy = 'public', tags = [], avatarUrl } = req.body;
//       const creatorId = req.userId;

//       logger.info(`[createGroup] User ${creatorId} creating group: ${name}`);

//       if (!name || name.trim().length === 0) {
//         res.status(400).json({ success: false, error: 'Group name required' });
//         return;
//       }

//       // Verify user is verified
//       const creator = await User.findById(creatorId);
//       if (!creator) {
//         res.status(404).json({ success: false, error: 'User not found' });
//         return;
//       }

//       if (!creator.verified) {
//         res.status(403).json({ success: false, error: 'Must be verified to create group' });
//         return;
//       }

//       // Create group
//       const chatRoomId = `group-${uuidv4()}`;
//       const group = new Group({
//         name,
//         description,
//         location,
//         createdBy: creatorId,
//         privacy,
//         avatarUrl,
//         tags,
//         chatRoomId,
//         members: [
//           {
//             userId: creatorId,
//             role: 'admin',
//             joinedAt: new Date()
//           }
//         ],
//         stats: {
//           totalMembers: 1,
//           totalRides: 0
//         }
//       });

//       await group.save();
//       logger.info(`[createGroup] Group ${group._id} created`);

//       res.status(201).json({
//         success: true,
//         data: {
//           groupId: group._id,
//           name: group.name,
//           privacy: group.privacy,
//           chatRoomId: group.chatRoomId
//         }
//       });
//     } catch (error: any) {
//       logger.error(`[createGroup] Error: ${error.message}`);
//       res.status(500).json({ success: false, error: error.message });
//     }
//   })();
// };

// /**
//  * GET /api/v1/groups
//  * Search groups with text search
//  */
// export const searchGroups = (req: AuthRequest, res: Response): void => {
//   (async () => {
//     try {
//       const { search = '', privacy, page = 1, limit = 10 } = req.query;

//       let query: any = {};

//       if (search) {
//         query.$text = { $search: search as string };
//       }

//       if (privacy) {
//         query.privacy = privacy;
//       }

//       const pageNum = Math.max(1, parseInt(page as string) || 1);
//       const limitNum = Math.min(50, parseInt(limit as string) || 10);
//       const skip = (pageNum - 1) * limitNum;

//       const groups = await Group.find(query)
//         .populate('createdBy', 'name avatarUrl verified')
//         .sort({ createdAt: -1 })
//         .skip(skip)
//         .limit(limitNum)
//         .lean();

//       const total = await Group.countDocuments(query);

//       const enriched = groups.map((group: any) => ({
//         ...group,
//         memberCount: group.members?.length || 0,
//         requestCount: group.joinRequests?.length || 0
//       }));

//       logger.info(`[searchGroups] Found ${groups.length} groups`);

//       res.json({
//         success: true,
//         data: enriched,
//         pagination: {
//           page: pageNum,
//           limit: limitNum,
//           total,
//           pages: Math.ceil(total / limitNum)
//         }
//       });
//     } catch (error: any) {
//       logger.error(`[searchGroups] Error: ${error.message}`);
//       res.status(500).json({ success: false, error: error.message });
//     }
//   })();
// };


// /**
//  * GET /api/v1/groups/:id
//  * Get group details
//  */
// export const getGroupDetail = (req: AuthRequest, res: Response): void => {
//   (async () => {
//     try {
//       const { id } = req.params;
//       const userId = req.userId;

//       const group = await Group.findById(id)
//         .populate('createdBy', 'name avatarUrl verified')
//         .populate('members.userId', 'name avatarUrl')
//         .populate('joinRequests.userId', 'name avatarUrl')
//         .lean();

//       if (!group) {
//         res.status(404).json({ success: false, error: 'Group not found' });
//         return;
//       }

//       const isMember = group.members.some((m: any) => m.userId._id.toString() === userId);
//       const isAdmin = group.members.some((m: any) => m.userId._id.toString() === userId && m.role === 'admin');
//       const hasRequestPending = group.joinRequests.some((r: any) => r.userId._id.toString() === userId);

//       res.json({
//         success: true,
//         data: {
//           ...group,
//           isMember,
//           isAdmin,
//           hasRequestPending,
//           memberCount: group.members.length,
//           requestCount: group.joinRequests.length
//         }
//       });
//     } catch (error: any) {
//       logger.error(`[getGroupDetail] Error: ${error.message}`);
//       res.status(500).json({ success: false, error: error.message });
//     }
//   })();
// };

// /**
//  * POST /api/v1/groups/:id/join
//  * Join a group or request to join
//  */
// export const joinGroup = (req: AuthRequest, res: Response): void => {
//   (async () => {
//     try {
//       const { id } = req.params;
//       const userId = req.userId;

//       logger.info(`[joinGroup] User ${userId} attempting to join group ${id}`);

//       const group = await Group.findById(id);
//       if (!group) {
//         res.status(404).json({ success: false, error: 'Group not found' });
//         return;
//       }

//       const user = await User.findById(userId);
//       if (!user) {
//         res.status(404).json({ success: false, error: 'User not found' });
//         return;
//       }

//       // Check if already a member
//       const alreadyMember = group.members.some((m: any) => m.userId.toString() === userId);
//       if (alreadyMember) {
//         res.status(400).json({ success: false, error: 'Already a member' });
//         return;
//       }

//       // Check if request pending
//       const hasPendingRequest = group.joinRequests.some((r: any) => r.userId.toString() === userId);
//       if (hasPendingRequest) {
//         res.status(400).json({ success: false, error: 'Join request already pending' });
//         return;
//       }

//       // If public, auto-join
//       if (group.privacy === 'public') {
//         group.members.push({
//           userId: userId as any,
//           role: 'member',
//           joinedAt: new Date()
//         });
//         group.stats.totalMembers = group.members.length;

//         await group.save();

//         logger.info(`[joinGroup] User ${userId} auto-joined public group ${id}`);

//         res.json({
//           success: true,
//           data: {
//             groupId: group._id,
//             status: 'joined',
//             message: 'Successfully joined group!'
//           }
//         });
//         return;
//       }

//       // If private/friends, request
//       group.joinRequests.push({
//         userId: userId as any,
//         requestedAt: new Date()
//       });

//       await group.save();

//       // Notify admins
//       const admins = group.members.filter((m: any) => m.role === 'admin');
//       for (const admin of admins) {
//         await Notification.create({
//           userId: admin.userId,
//           type: 'group',
//           message: `${user.name} requested to join ${group.name}`,
//           read: false,
//           relatedId: group._id
//         });
//       }

//       logger.info(`[joinGroup] User ${userId} requested to join ${id}`);

//       res.json({
//         success: true,
//         data: {
//           groupId: group._id,
//           status: 'pending',
//           message: 'Join request sent to admins!'
//         }
//       });
//     } catch (error: any) {
//       logger.error(`[joinGroup] Error: ${error.message}`);
//       res.status(500).json({ success: false, error: error.message });
//     }
//   })();
// };

// /**
//  * POST /api/v1/groups/:id/approve/:requestUserId
//  * Admin approves join request
//  */
// export const approveJoinRequest = (req: AuthRequest, res: Response): void => {
//   (async () => {
//     try {
//       const { id, requestUserId } = req.params;
//       const adminId = req.userId;

//       logger.info(`[approveJoinRequest] Admin ${adminId} approving ${requestUserId} for group ${id}`);

//       const group = await Group.findById(id);
//       if (!group) {
//         res.status(404).json({ success: false, error: 'Group not found' });
//         return;
//       }

//       // Verify user is admin
//       const isAdmin = group.members.some((m: any) => m.userId.toString() === adminId && m.role === 'admin');
//       if (!isAdmin) {
//         res.status(403).json({ success: false, error: 'Only admin can approve' });
//         return;
//       }

//       // Remove from requests
//       group.joinRequests = group.joinRequests.filter((r: any) => r.userId.toString() !== requestUserId);

//       // Add to members
//       const alreadyMember = group.members.some((m: any) => m.userId.toString() === requestUserId);
//       if (!alreadyMember) {
//         group.members.push({
//           userId: requestUserId as any,
//           role: 'member',
//           joinedAt: new Date()
//         });
//         group.stats.totalMembers = group.members.length;
//       }

//       await group.save();

//       // Notify user
//       await Notification.create({
//         userId: requestUserId,
//         type: 'group',
//         message: `You were approved to join ${group.name}!`,
//         read: false,
//         relatedId: group._id
//       });

//       logger.info(`[approveJoinRequest] User ${requestUserId} approved for group ${id}`);

//       res.json({
//         success: true,
//         data: { message: 'User approved' }
//       });
//     } catch (error: any) {
//       logger.error(`[approveJoinRequest] Error: ${error.message}`);
//       res.status(500).json({ success: false, error: error.message });
//     }
//   })();
// };

// /**
//  * POST /api/v1/groups/:id/leave
//  * Leave a group
//  */
// export const leaveGroup = (req: AuthRequest, res: Response): void => {
//   (async () => {
//     try {
//       const { id } = req.params;
//       const userId = req.userId;

//       logger.info(`[leaveGroup] User ${userId} leaving group ${id}`);

//       const group = await Group.findById(id);
//       if (!group) {
//         res.status(404).json({ success: false, error: 'Group not found' });
//         return;
//       }

//       const memberIndex = group.members.findIndex((m: any) => m.userId.toString() === userId);
//       if (memberIndex === -1) {
//         res.status(400).json({ success: false, error: 'Not a member' });
//         return;
//       }

//       // Prevent last admin from leaving
//       const isLastAdmin = group.members[memberIndex].role === 'admin' && 
//                           group.members.filter((m: any) => m.role === 'admin').length === 1;
//       if (isLastAdmin) {
//         res.status(400).json({ success: false, error: 'Cannot leave: you are the only admin' });
//         return;
//       }

//       group.members.splice(memberIndex, 1);
//       group.stats.totalMembers = group.members.length;

//       await group.save();

//       logger.info(`[leaveGroup] User ${userId} left group ${id}`);

//       res.json({
//         success: true,
//         data: { message: 'Left group' }
//       });
//     } catch (error: any) {
//       logger.error(`[leaveGroup] Error: ${error.message}`);
//       res.status(500).json({ success: false, error: error.message });
//     }
//   })();
// };

// /**
//  * GET /api/v1/groups/:id/members
//  * Get all group members with pagination
//  */
// export const getGroupMembers = (req: AuthRequest, res: Response): void => {
//   (async () => {
//     try {
//       const { id } = req.params;
//       const { page = 1, limit = 20 } = req.query;

//       const pageNum = Math.max(1, parseInt(page as string) || 1);
//       const limitNum = Math.min(100, parseInt(limit as string) || 20);
//       const skip = (pageNum - 1) * limitNum;

//       const group = await Group.findById(id)
//         .populate({
//           path: 'members.userId',
//           select: 'name avatarUrl verified ridingHours',
//           options: { skip, limit: limitNum }
//         })
//         .lean();

//       if (!group) {
//         res.status(404).json({ success: false, error: 'Group not found' });
//         return;
//       }

//       const total = group.members.length;

//       res.json({
//         success: true,
//         data: group.members,
//         pagination: {
//           page: pageNum,
//           limit: limitNum,
//           total,
//           pages: Math.ceil(total / limitNum)
//         }
//       });
//     } catch (error: any) {
//       logger.error(`[getGroupMembers] Error: ${error.message}`);
//       res.status(500).json({ success: false, error: error.message });
//     }
//   })();
// };

// /**
//  * DELETE /api/v1/groups/:id
//  * Delete group (admin only)
//  */
// export const deleteGroup = (req: AuthRequest, res: Response): void => {
//   (async () => {
//     try {
//       const { id } = req.params;
//       const userId = req.userId;

//       logger.info(`[deleteGroup] User ${userId} deleting group ${id}`);

//       const group = await Group.findById(id);
//       if (!group) {
//         res.status(404).json({ success: false, error: 'Group not found' });
//         return;
//       }

//       const isAdmin = group.members.some((m: any) => m.userId.toString() === userId && m.role === 'admin');
//       if (!isAdmin) {
//         res.status(403).json({ success: false, error: 'Only admin can delete' });
//         return;
//       }

//       await Group.findByIdAndDelete(id);

//       logger.info(`[deleteGroup] Group ${id} deleted`);

//       res.json({
//         success: true,
//         data: { message: 'Group deleted' }
//       });
//     } catch (error: any) {
//       logger.error(`[deleteGroup] Error: ${error.message}`);
//       res.status(500).json({ success: false, error: error.message });
//     }
//   })();
// };