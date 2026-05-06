import { Router } from "express";
import adminAuth from "../middlewares/adminAuth.middleware.js";
import {
  getAllPosts,
  adminDeletePost,
  getPostStats
} from "../controllers/admin.posts.controller.js";

const router: Router = Router();

router.use(adminAuth);

router.get("/", getAllPosts);
router.get("/stats", getPostStats);
router.delete("/:id", adminDeletePost);

export default router;
