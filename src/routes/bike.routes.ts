import express, { Router } from "express";
import {
  addBike,
  deleteBike,
  getBikeById,
  getBikeCount,
  getBikes,
  getPrimaryBike,
  setPrimaryBike,
  updateBike,
} from "../controllers/bike.controller.js";
import isAuth from "../middlewares/auth.middleware.js";
import multer from "multer";

const router: Router = express.Router();

// Configure multer for bike image uploads (memory storage for Cloudinary)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB per file
    files: 1, // Max 1 file for bikes
  },
  fileFilter: (req, file, cb) => {
    // Accept images only
    if (!file.mimetype.startsWith("image/")) {
      cb(new Error("Only image files are allowed"));
      return;
    }
    cb(null, true);
  },
});

/**
 * All routes require authentication
 */
// router.use(isAuth);

/**
 * POST /api/v1/bikes
 * Add new bike (with optional image upload)
 */
router.post("/", isAuth, upload.single("image"), addBike);

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
 * Update bike (with optional image upload)
 */
router.patch("/:id", isAuth, upload.single("image"), updateBike);

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
