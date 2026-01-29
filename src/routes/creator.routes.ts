// ==========================================
// File: src/routes/creator.routes.ts
// Creator Routes
// ==========================================
import express, { Router } from "express";
import isAuth from "../middlewares/auth.middleware.js";
import {
  applyAsCreator,
  getCreatorStatus,
  generateMediaKit,
} from "../controllers/creator.controller.js";

const router: Router = express.Router();

/**
 * @swagger
 * /api/v1/creator/apply:
 *   post:
 *     summary: Apply to become a creator
 *     tags: [Creator]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - creatorHandle
 *               - contentCategory
 *             properties:
 *               creatorHandle:
 *                 type: string
 *               city:
 *                 type: string
 *               state:
 *                 type: string
 *               socialLinks:
 *                 type: object
 *               contentCategory:
 *                 type: array
 *               avgViews:
 *                 type: number
 *               followers:
 *                 type: number
 *               proofLinks:
 *                 type: array
 *     responses:
 *       201:
 *         description: Application submitted successfully
 */
router.post("/apply", isAuth, applyAsCreator);

/**
 * @swagger
 * /api/v1/creator/status:
 *   get:
 *     summary: Get creator application status
 *     tags: [Creator]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Creator status retrieved
 */
router.get("/status", isAuth, getCreatorStatus);

/**
 * @swagger
 * /api/v1/creator/media-kit:
 *   get:
 *     summary: Generate media kit PDF
 *     tags: [Creator]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Media kit generated
 */
router.get("/media-kit", isAuth, generateMediaKit);

export default router;



