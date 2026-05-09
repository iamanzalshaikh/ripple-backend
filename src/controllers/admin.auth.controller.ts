import type { Response } from "express";
import type { AuthRequest } from "../types/auth.types.js";

export function adminLogin(_req: AuthRequest, res: Response): void {
  res.status(501).json({
    success: false,
    message:
      "Admin auth not implemented — add JWT admin secrets + logic (Ridez parity).",
  });
}

export function adminLogout(_req: AuthRequest, res: Response): void {
  res.json({ success: true, message: "Admin logout (stub)" });
}

export function adminMe(_req: AuthRequest, res: Response): void {
  res
    .status(501)
    .json({ success: false, message: "Admin /me not implemented." });
}
