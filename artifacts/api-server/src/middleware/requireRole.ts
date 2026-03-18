import { type Request, type Response, type NextFunction } from "express";

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    const role = req.session.role ?? "student";
    if (!roles.includes(role)) {
      return res.status(403).json({ error: "You do not have permission to access this resource" });
    }
    next();
  };
}

export function requireAuth(req: Request, res: Response): number | null {
  if (!req.session?.userId) {
    res.status(401).json({ error: "Not authenticated" });
    return null;
  }
  return req.session.userId;
}
