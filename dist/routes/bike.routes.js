import express from "express";
import { addBike, deleteBike, getBikeById, getBikeCount, getBikes, getPrimaryBike, setPrimaryBike, updateBike } from "../controllers/bike.controller.js";
import isAuth from '../middlewares/auth.middleware.js';
const router = express.Router();
/**
 * All routes require authentication
 */
// router.use(isAuth);
/**
 * POST /api/v1/bikes
 * Add new bike
 */
router.post("/", isAuth, addBike);
/**
 * GET /api/v1/bikes
 * Get all user bikes
 */
router.get("/", isAuth, getBikes);
/**
 * GET /api/v1/bikes/primary
 * Get primary bike (must be before /:id route)
 */
router.get("/primary", isAuth, getPrimaryBike);
/**
 * GET /api/v1/bikes/count
 * Get bike count
 */
router.get("/count", isAuth, getBikeCount);
/**
 * GET /api/v1/bikes/:id
 * Get single bike
 */
router.get("/:id", isAuth, getBikeById);
/**
 * PATCH /api/v1/bikes/:id
 * Update bike
 */
router.patch("/:id", isAuth, updateBike);
/**
 * PATCH /api/v1/bikes/:id/set-primary
 * Set as primary bike
 */
router.patch("/:id/set-primary", isAuth, setPrimaryBike);
/**
 * DELETE /api/v1/bikes/:id
 * Delete bike
 */
router.delete("/:id", isAuth, deleteBike);
export default router;
//# sourceMappingURL=bike.routes.js.map