import { Router } from "express";
import isAuth from "../middlewares/auth.middleware.js";
import {
  createTranscriptHandler,
  deleteTranscriptHandler,
  getTranscriptHandler,
  listTranscriptsHandler,
} from "../controllers/transcript.controller.js";

const router: Router = Router();

router.post("/", isAuth, createTranscriptHandler);
router.get("/", isAuth, listTranscriptsHandler);
router.get("/:id", isAuth, getTranscriptHandler);
router.delete("/:id", isAuth, deleteTranscriptHandler);

export default router;

