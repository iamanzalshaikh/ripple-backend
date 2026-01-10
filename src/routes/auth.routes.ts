import { Router } from "express";
import {
  getCurrentUser,
  getSuggestedUsers,
  logout,
  searchUsers,
  sendLoginOtp,
  sendSignupOtp,
  verifyLoginOtp,
  verifySignupOtp,
} from "../controllers/auth.controller.js";
import isAuth from "../middlewares/auth.middleware.js";

const router: Router = Router();

// Signup Routes
router.post("/signup/send-otp", sendSignupOtp);
router.post("/signup/verify-otp", verifySignupOtp);

// Login Routes
router.post("/login/send-otp", sendLoginOtp);
router.post("/login/verify-otp", verifyLoginOtp);

// Logout Route
router.post("/logout", isAuth, logout);

router.get("/me", isAuth, getCurrentUser);
router.get("/suggested-users", isAuth, getSuggestedUsers);
router.get("/search-users", isAuth, searchUsers);

export default router;
