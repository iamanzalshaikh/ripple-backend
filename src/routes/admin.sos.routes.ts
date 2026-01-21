import { Router } from "express";
import adminAuth from "../middlewares/adminAuth.middleware.js";
import {
  getAllSOSLogs,
  getSOSLogDetail,
  resolveSOSLog,
  markFalsePositive,
  getSOSStats,
} from "../controllers/admin.sos.controller.js";

const router: Router = Router();

// All routes require admin authentication
router.use(adminAuth);

/**
 * SOS Management Routes
 */
router.get("/", getAllSOSLogs);
router.get("/stats", getSOSStats);
router.get("/:id", getSOSLogDetail);
router.patch("/:id/resolve", resolveSOSLog);
router.patch("/:id/false-positive", markFalsePositive);

export default router;
