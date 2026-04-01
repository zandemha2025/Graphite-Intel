import { type Request, type Response, type NextFunction } from "express";
import { hasPermission, roleRank, type Role } from "@workspace/db";

/**
 * Middleware factory that checks if the authenticated user has permission
 * to perform a given action on a resource type.
 *
 * Usage:
 *   app.delete("/api/reports/:id", requirePermission("report", "delete"), handler);
 */
export function requirePermission(
  resourceType: string,
  action: string,
): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Require authentication first
    if (!req.isAuthenticated()) {
      res.status(401).json({
        error: "Unauthorized",
        message: "Authentication required",
      });
      return;
    }

    const userRole = req.user.orgRole || "viewer";

    // Check permission using the permission matrix
    const permitted = hasPermission(userRole, resourceType, action);

    if (!permitted) {
      res.status(403).json({
        error: "Forbidden",
        message: `User role '${userRole}' does not have permission to ${action} ${resourceType}`,
      });
      return;
    }

    next();
  };
}

/**
 * Middleware that checks if the user has one of the specified roles.
 *
 * Usage:
 *   app.post("/api/teams", requireRole("owner", "admin"), handler);
 */
export function requireRole(
  ...roles: string[]
): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Require authentication first
    if (!req.isAuthenticated()) {
      res.status(401).json({
        error: "Unauthorized",
        message: "Authentication required",
      });
      return;
    }

    const userRole = req.user.orgRole || "viewer";
    const hasRole = roles.includes(userRole);

    if (!hasRole) {
      res.status(403).json({
        error: "Forbidden",
        message: `User role '${userRole}' is not in the allowed roles: ${roles.join(", ")}`,
      });
      return;
    }

    next();
  };
}

/**
 * Middleware that checks if the user's role rank is >= the minimum required rank.
 * Role hierarchy: viewer (0) < editor (1) < admin (2) < owner (3)
 *
 * Usage:
 *   app.patch("/api/billing", requireMinRole("admin"), handler);
 */
export function requireMinRole(
  minRole: string,
): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Require authentication first
    if (!req.isAuthenticated()) {
      res.status(401).json({
        error: "Unauthorized",
        message: "Authentication required",
      });
      return;
    }

    const userRole = req.user.orgRole || "viewer";
    const userRank = roleRank(userRole);
    const minRank = roleRank(minRole);

    // If either role is not recognized (returns -1), deny access
    if (userRank === -1 || minRank === -1) {
      res.status(403).json({
        error: "Forbidden",
        message: `Invalid role configuration`,
      });
      return;
    }

    if (userRank < minRank) {
      res.status(403).json({
        error: "Forbidden",
        message: `User role '${userRole}' does not meet the minimum required role '${minRole}'`,
      });
      return;
    }

    next();
  };
}
