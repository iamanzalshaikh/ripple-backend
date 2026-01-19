import { Router } from "express";
import {
  getCurrentAdmin,
  loginAdmin,
  logoutAdmin,
  registerAdmin,
  verifyAdminLoginOtp,
} from "../controllers/admin.auth.controller.js";
import adminAuth from "../middlewares/adminAuth.middleware.js";

const router: Router = Router();

// Register endpoint - public (Postman only, no auth required)
router.post("/register", registerAdmin);

router.post("/login", loginAdmin);
router.post("/login/verify-otp", verifyAdminLoginOtp);

router.get("/me", adminAuth, getCurrentAdmin);
router.post("/logout", adminAuth, logoutAdmin);

export default router;


