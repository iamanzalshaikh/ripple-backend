import { Router } from "express";
import { z } from "zod";
import rateLimit from "express-rate-limit";
import isAuth from "../middlewares/auth.middleware.js";
import { validateBody } from "../middlewares/validate.middleware.js";
import {
  ackCommandActionHandler,
  desktopIntentHandler,
  executeCommandHandler,
  listCommandHistoryHandler,
  youtubeSearchQueryHandler,
} from "../controllers/command.controller.js";

const router: Router = Router();

const commandLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === "test",
  message: { success: false, message: "Too many command requests. Try later." },
});

const executeSchema = z.object({
  session_id: z.string().uuid().optional(),
  command: z.string().min(1).max(2000),
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
  selected_text: z.string().max(20000).nullable().optional(),
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

const actionAckSchema = z.object({
  action_index: z.number().int().min(0),
  status: z.enum(["pending", "executed", "failed"]),
  error: z.string().max(1000).optional(),
});

router.post(
  "/desktop-intent",
  isAuth,
  commandLimiter,
  validateBody(z.object({
    command: z.string().min(1).max(2000),
    nlu: z.string().max(2000).optional(),
    last_command: z.string().max(2000).optional(),
    last_intent: z.string().max(200).optional(),
    last_file: z.string().max(2000).optional(),
    last_folder: z.string().max(2000).optional(),
    last_contact: z.string().max(200).optional(),
    recent_turns: z
      .array(
        z.object({
          command: z.string(),
          intent: z.string().optional(),
          resolved_path: z.string().optional(),
          outcome: z.string(),
        }),
      )
      .max(5)
      .optional(),
  })),
  desktopIntentHandler,
);

router.post(
  "/youtube-search-query",
  isAuth,
  commandLimiter,
  validateBody(z.object({
    command: z.string().min(1).max(2000),
  })),
  youtubeSearchQueryHandler,
);

router.post(
  "/execute",
  isAuth,
  commandLimiter,
  validateBody(executeSchema),
  executeCommandHandler,
);

router.get("/history", isAuth, listCommandHistoryHandler);

router.post(
  "/:commandId/actions/ack",
  isAuth,
  validateBody(actionAckSchema),
  ackCommandActionHandler,
);

export default router;
