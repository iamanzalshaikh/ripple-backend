import type { NextFunction, Request, Response } from "express";
import type { ZodSchema } from "zod";
import { ZodError } from "zod";

export function validateBody(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (e: unknown) {
      if (e instanceof ZodError) {
        res.status(400).json({
          success: false,
          message: "Validation failed",
          error: e.issues
            .map((x) => `${x.path.join(".")}: ${x.message}`)
            .join(", "),
        });
        return;
      }
      next(e);
    }
  };
}

