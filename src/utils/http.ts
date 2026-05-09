import type { NextFunction, Request, Response } from "express";

export class ApiError extends Error {
  statusCode: number;
  expose: boolean;

  constructor(message: string, statusCode = 500, expose = true) {
    super(message);
    this.statusCode = statusCode;
    this.expose = expose;
  }
}

export function ok<T>(res: Response, data: T, statusCode = 200): void {
  res.status(statusCode).json({ success: true, data });
}

export function fail(
  res: Response,
  message: string,
  statusCode = 400,
  error?: string,
): void {
  res.status(statusCode).json({
    success: false,
    message,
    ...(error ? { error } : {}),
  });
}

export const asyncHandler =
  <TReq extends Request = Request>(
    fn: (req: TReq, res: Response, next: NextFunction) => Promise<void>,
  ) =>
  (req: TReq, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

