import { Router } from "express";
import { z } from "zod";
import isAuth from "../middlewares/auth.middleware.js";
import { validateBody } from "../middlewares/validate.middleware.js";
import {
  endSession,
  startSession,
} from "../controllers/session.controller.js";

const router: Router = Router();

const startSchema = z.object({
  device: z.string().min(1).max(120).optional(),
  context_type: z
    .enum([
      "general",
      "email",
      "whatsapp",
      "linkedin",
      "slack",
      "notion",
      "instagram",
      "twitter",
      "code",
    ])
    .optional(),
  action_source: z
    .enum([
      "desktop",
      "web",
      "gmail",
      "outlook",
      "whatsapp",
      "slack",
      "linkedin",
      "notion",
      "instagram",
      "twitter",
      "browser",
      "other",
    ])
    .optional(),
  context_metadata: z
    .object({
      focused_app: z.string().max(120).optional(),
      input_type: z
        .enum([
          "unknown",
          "chatbox",
          "email_body",
          "email_subject",
          "editor",
          "form_field",
          "search_box",
          "code_editor",
        ])
        .optional(),
      device: z.string().max(120).optional(),
      window_title: z.string().max(300).optional(),
      url: z.string().max(1000).optional(),
    })
    .optional(),
});

const endSchema = z.object({
  session_id: z.string().uuid(),
});

router.post("/start", isAuth, validateBody(startSchema), startSession);
router.post("/end", isAuth, validateBody(endSchema), endSession);

export default router;
