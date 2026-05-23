import { getAuth } from "@clerk/express";
import { type Request, type Response, type NextFunction } from "express";

declare global {
  namespace Express {
    interface Request {
      user?: { id: string };
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const auth = getAuth(req);
  if (!auth?.userId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  req.user = { id: auth.userId };
  next();
}
