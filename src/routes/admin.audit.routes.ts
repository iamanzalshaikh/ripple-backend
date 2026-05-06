import { Router } from "express";
import adminAuth from "../middlewares/adminAuth.middleware.js";
import {
  getAuditLogs,
  getTargetAuditLogs
} from "../controllers/admin.audit.controller.js";

const router: Router = Router();

router.use(adminAuth);

router.get("/", getAuditLogs);
router.get("/target/:type/:id", getTargetAuditLogs);

export default router;
