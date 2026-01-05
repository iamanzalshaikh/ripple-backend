// import express, { Router } from 'express';
// import {
//   createGroup,
//   searchGroups,
//   getGroupDetail,
//   joinGroup,
//   approveJoinRequest,
//   leaveGroup,
//   getGroupMembers,
//   deleteGroup
// } from '../controllers/group.controller.js';
// import isAuth from '../middlewares/auth.middleware.js';
// const router: Router = express.Router();
// // All routes require authentication
// router.use(isAuth);
// /**
//  * POST /api/v1/groups
//  * Create a new group (verified users only)
//  */
// router.post('/', createGroup);
// /**
//  * GET /api/v1/groups
//  * Search/discover groups
//  * Query: ?search=Superbike Sisters&privacy=public&page=1&limit=10
//  */
// router.get('/', searchGroups);
// /**
//  * GET /api/v1/groups/:id
//  * Get group details
//  */
// router.get('/:id', getGroupDetail);
// /**
//  * POST /api/v1/groups/:id/join
//  * Join public group or request to join private group
//  */
// router.post('/:id/join', joinGroup);
// /**
//  * POST /api/v1/groups/:id/approve/:requestUserId
//  * Approve join request (admin only)
//  */
// router.post('/:id/approve/:requestUserId', approveJoinRequest);
// /**
//  * POST /api/v1/groups/:id/leave
//  * Leave a group
//  */
// router.post('/:id/leave', leaveGroup);
// /**
//  * GET /api/v1/groups/:id/members
//  * Get all group members with pagination
//  */
// router.get('/:id/members', getGroupMembers);
// /**
//  * DELETE /api/v1/groups/:id
//  * Delete group (admin only)
//  */
// router.delete('/:id', deleteGroup);
// export default router;
import express from 'express';
import { createGroup, searchGroups, getGroupDetail, joinGroup, approveJoinRequest, leaveGroup, getGroupMembers, deleteGroup } from '../controllers/group.controller';
import isAuth from '../middlewares/auth.middleware';
const router = express.Router();
// router.use(isAuth);
router.post('/', isAuth, createGroup);
router.get('/', isAuth, searchGroups);
router.get('/:id', isAuth, getGroupDetail);
router.post('/:id/join', isAuth, joinGroup);
router.post('/:id/approve/:requestUserId', isAuth, approveJoinRequest);
router.post('/:id/leave', isAuth, leaveGroup);
router.get('/:id/members', isAuth, getGroupMembers);
router.delete('/:id', isAuth, deleteGroup);
export default router;
//# sourceMappingURL=group.routes.js.map