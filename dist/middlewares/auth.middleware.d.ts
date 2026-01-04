import { Response, NextFunction } from "express";
import { AuthRequest } from "../types/auth.types.js";
declare const isAuth: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
export default isAuth;
//# sourceMappingURL=auth.middleware.d.ts.map