import { Router } from "express";
import isAuth from "../middlewares/auth.middleware.js";
import { listPublicBrands } from "../controllers/brands.controller.js";

const router: Router = Router();

// For now we require auth so we know the user, but it's read‑only.
router.get("/", isAuth, listPublicBrands);

export default router;


