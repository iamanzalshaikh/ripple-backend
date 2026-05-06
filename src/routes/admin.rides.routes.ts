import { Router } from "express";
import adminAuth from "../middlewares/adminAuth.middleware.js";
import {
  getAllRides,
  adminCancelRide,
  getRideStats
} from "../controllers/admin.rides.controller.js";

const router: Router = Router();

router.use(adminAuth);

router.get("/", getAllRides);
router.get("/stats", getRideStats);
router.patch("/:id/cancel", adminCancelRide);

export default router;
