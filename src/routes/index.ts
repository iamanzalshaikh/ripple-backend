import express from "express";
import authRoutes from "./auth.routes.js";

const router = express.Router();

/**
 * @swagger
 * /api/v1/health:
 *   get:
 *     summary: Health Check
 *     description: Check if the server is running
 *     tags: [System]
 *     responses:
 *       200:
 *         description: Server is up and running
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: OK
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 service:
 *                   type: string
 *                   example: HerRidez API v1
 */
router.get("/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date(),
    service: "HerRidez API v1",
  });
});

// Auth Routes
router.use("/auth", authRoutes);

export default router;