import { Router } from "express";
import { 
  getAllListings, 
  updateListingStatus, 
  deleteListing 
} from "../controllers/admin.marketplace.controller.js";
import adminAuth from "../middlewares/adminAuth.middleware.js";

const router: Router = Router();

// All routes require admin authentication
router.use(adminAuth);

/**
 * @route   GET /api/v1/admin/marketplace/listings
 */
router.get("/listings", getAllListings);

/**
 * @route   PATCH /api/v1/admin/marketplace/listings/:id/status
 */
router.patch("/listings/:id/status", updateListingStatus);

/**
 * @route   DELETE /api/v1/admin/marketplace/listings/:id
 */
router.delete("/listings/:id", deleteListing);

export default router;
