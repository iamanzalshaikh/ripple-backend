import { Router } from "express";
import {
  adminLogin,
  adminLogout,
  adminMe,
} from "../controllers/admin.auth.controller.js";
import adminAuth from "../middlewares/adminAuth.middleware.js";

const router: Router = Router();

router.post("/login", adminLogin);
router.post("/logout", adminLogout);
router.get("/me", adminAuth, adminMe);

export default router;
