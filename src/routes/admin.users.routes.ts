import { Router } from "express";
import adminAuth from "../middlewares/adminAuth.middleware.js";
import {
  activateUser,
  getAllUsers,
  getUserById,
  suspendUser,
} from "../controllers/admin.users.controller.js";

const router: Router = Router();

// All routes require admin authentication
router.use(adminAuth);

/**
 * @route   GET /api/admin/users
 * @desc    Get all users
 */
router.get("/", getAllUsers);

/**
 * @route   GET /api/admin/users/:id
 * @desc    Get user by ID
 */
router.get("/:id", getUserById);

/**
 * @route   PATCH /api/admin/users/:id/suspend
 * @desc    Suspend user
 */
router.patch("/:id/suspend", suspendUser);

/**
 * @route   PATCH /api/admin/users/:id/activate
 * @desc    Activate user
 */
router.patch("/:id/activate", activateUser);

export default router;
