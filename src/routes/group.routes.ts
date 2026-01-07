

import express, { Router } from 'express';
import {
  createGroup,
  searchGroups,
  getGroupDetail,
  joinGroup,
  approveJoinRequest,
  leaveGroup,
  getGroupMembers,
  deleteGroup
} from '../controllers/group.controller.js';
import isAuth from '../middlewares/auth.middleware.js';

const router: Router = express.Router();

// router.use(isAuth);

router.post('/', isAuth, createGroup as any);
router.get('/', isAuth, searchGroups as any);
router.get('/:id', isAuth, getGroupDetail as any);
router.post('/:id/join', isAuth, joinGroup as any);
router.post('/:id/approve/:requestUserId', isAuth, approveJoinRequest as any);
router.post('/:id/leave', isAuth, leaveGroup as any);
router.get('/:id/members', isAuth, getGroupMembers as any);
router.delete('/:id', isAuth, deleteGroup as any);

export default router;