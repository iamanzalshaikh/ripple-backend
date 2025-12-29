import express from "express";

const router = express.Router();

// Placeholder routes
router.get("/health", (_, res) => {
  res.json({ status: "OK" });
});

export default router;
