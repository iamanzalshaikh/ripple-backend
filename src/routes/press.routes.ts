// ==========================================
// File: src/routes/press.routes.ts
// Press Request Routes (Step 110)
// ==========================================
import express, { Router } from "express";
import { submitPressRequest } from "../controllers/press.controller.js";

const router: Router = express.Router();

// POST /api/v1/press/request
router.post("/request", submitPressRequest);

export default router;

