import { Router } from "express";
import adminAuth from "../middlewares/adminAuth.middleware.js";
import {
  getBrands,
  createBrand,
} from "../controllers/admin.brands.controller.js";

const router: Router = Router();

// All routes require admin authentication
router.use(adminAuth);

/**
 * @route   GET /api/admin/brands
 * @desc    List brands
 * @access  Admin
 */
router.get("/", getBrands);

/**
 * @route   POST /api/admin/brands
 * @desc    Create a brand
 * @access  Admin
 */
router.post("/", createBrand);

export default router;




