import { Request, Response, NextFunction } from "express";
import { Role } from "../types/user.types";

/**
 * RBAC (Role-Based Access Control) middleware factory.
 *
 * Usage: router.get("/admin-only", authenticateToken, authorizeRole(Role.ADMIN), handler)
 *
 * IMPORTANT: this middleware assumes authenticateToken already ran and
 * populated req.user. It does NOT verify the token itself — it only
 * checks the role on an already-authenticated request. Always place
 * authenticateToken BEFORE authorizeRole in the middleware chain.
 */
export function authorizeRole(...allowedRoles: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      // Defensive check — should be unreachable if middleware order is correct,
      // but fail safely (deny) rather than assume.
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
