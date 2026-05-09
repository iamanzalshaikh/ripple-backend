import { Router } from "express";
import multer from "multer";
import isAuth from "../middlewares/auth.middleware.js";
import {
  grammarText,
  rewriteText,
  transcribeAudio,
} from "../controllers/voice.controller.js";
import { validateBody } from "../middlewares/validate.middleware.js";
import { z } from "zod";
import rateLimit from "express-rate-limit";

const router: Router = Router();
const allowed = new Set([
  "audio/mpeg", // mp3
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/webm",
  "video/webm", // some clients label audio/webm as video/webm
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!allowed.has(file.mimetype)) {
      cb(new Error("Invalid audio type. Allowed: mp3, wav, webm"));
      return;
    }
    cb(null, true);
  },
});

const rewriteSchema = z.object({
  text: z.string().min(1).max(5000),
  mode: z.enum(["formal", "casual"]).optional(),
});

const grammarSchema = z.object({
  text: z.string().min(1).max(5000),
});

const voiceLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many voice/AI requests. Try later." },
});

router.post(
  "/transcribe",
  isAuth,
  voiceLimiter,
  upload.single("audio"),
  transcribeAudio,
);
router.post(
  "/rewrite",
  isAuth,
  voiceLimiter,
  validateBody(rewriteSchema),
  rewriteText,
);
router.post(
  "/grammar",
  isAuth,
  voiceLimiter,
  validateBody(grammarSchema),
  grammarText,
);

export default router;

