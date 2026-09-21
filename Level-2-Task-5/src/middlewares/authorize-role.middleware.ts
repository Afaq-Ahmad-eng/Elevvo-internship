import { Request, Response, NextFunction } from "express";
import { Role } from "@prisma/client";

/**
 * RBAC gate. Must run AFTER authenticateToken it only checks the role on
 * an already-authenticated request, it does not verify the token itself.
 */
export function authorizeRole(...allowedRoles: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({ error: "Insufficient permissions for this action" });
      return;
    }

    next();
  };
}
