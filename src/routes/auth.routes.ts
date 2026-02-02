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
  sendSignupOtpSms,
  verifySignupOtpSms,
  sendLoginOtpSms,
  verifyLoginOtpSms,
} from "../controllers/auth.controller.js";
import isAuth from "../middlewares/auth.middleware.js";

const router: Router = Router();

// Signup Routes (Email-based - existing)
router.post("/signup/send-otp", sendSignupOtp);
router.post("/signup/verify-otp", verifySignupOtp);

// Signup Routes (SMS-based - new)
router.post("/signup/send-otp-sms", sendSignupOtpSms);
router.post("/signup/verify-otp-sms", verifySignupOtpSms);

// Login Routes (Email-based - existing)
router.post("/login/send-otp", sendLoginOtp);
router.post("/login/verify-otp", verifyLoginOtp);

// Login Routes (SMS-based - new)
router.post("/login/send-otp-sms", sendLoginOtpSms);
router.post("/login/verify-otp-sms", verifyLoginOtpSms);

// Logout Route
router.post("/logout", isAuth, logout);

router.get("/me", isAuth, getCurrentUser);
router.get("/suggested-users", isAuth, getSuggestedUsers);
router.get("/search-users", isAuth, searchUsers);

export default router;
