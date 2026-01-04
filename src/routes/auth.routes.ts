import { Router } from "express";
import { getCurrentUser, sendLoginOtp, sendSignupOtp, verifyLoginOtp, verifySignupOtp } from "../controllers/auth.controller";
import isAuth from "../middlewares/auth.middleware";


const router: Router = Router();

// Signup Routes
router.post("/signup/send-otp", sendSignupOtp);
router.post("/signup/verify-otp", verifySignupOtp);

// Login Routes
router.post("/login/send-otp", sendLoginOtp);
router.post("/login/verify-otp", verifyLoginOtp);

router.get("/me", isAuth, getCurrentUser);


export default router;
