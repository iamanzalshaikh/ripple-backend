import express, { Router } from "express";
import {
  browseListings,
  getListingDetails,
  createListing,
  updateListing,
  deleteListing,
  contactSeller,
  getMyListings,
  getSimilarListings,
} from "../controllers/marketplace.controller.js";
import isAuth from "../middlewares/auth.middleware.js";
import isVerified from "../middlewares/verified.middleware.js";
import multer from "multer";

const router: Router = express.Router();

// Configure multer for file uploads (memory storage for Cloudinary)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB per file
    files: 5, // Max 5 files
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
 * GET /api/v1/marketplace
 * Browse all active listings
 * Public route (no auth required)
 * Supports filters: category, location, priceMin, priceMax, search, page, limit
 */
router.get("/", browseListings);

/**
 * GET /api/v1/marketplace/my-listings
 * Get all listings created by authenticated user
 * Requires: auth + verified
 * Must be before /:listingId route to avoid conflict
 */
router.get("/my-listings", isAuth, isVerified, getMyListings);

/**
 * GET /api/v1/marketplace/:listingId/similar
 * Get similar listings based on smart matching algorithm
 * Public route (no auth required)
 * Must be before generic /:listingId route
 */
router.get("/:listingId/similar", getSimilarListings);

/**
 * GET /api/v1/marketplace/:listingId
 * Get single listing details
 * Public route (no auth required)
 */
router.get("/:listingId", getListingDetails);

/**
 * POST /api/v1/marketplace
 * Create a new listing
 * Requires: auth + verified
 * Supports image upload (max 5 images)
 */
router.post("/", isAuth, isVerified, upload.array("images", 5), createListing);

/**
 * PATCH /api/v1/marketplace/:listingId
 * Update existing listing
 * Requires: auth + verified + ownership
 * Supports adding new images (total max 5)
 */
router.patch(
  "/:listingId",
  isAuth,
  isVerified,
  upload.array("images", 5),
  updateListing
);

/**
 * DELETE /api/v1/marketplace/:listingId
 * Soft delete listing (sets status to 'deleted')
 * Requires: auth + ownership
 */
router.delete("/:listingId", isAuth, deleteListing);

/**
 * POST /api/v1/marketplace/:listingId/contact
 * Contact seller - creates/retrieves private chat room
 * Requires: auth
 */
router.post("/:listingId/contact", isAuth, contactSeller);

export default router;
