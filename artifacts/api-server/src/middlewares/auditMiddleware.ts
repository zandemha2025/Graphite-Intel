import { type Request, type Response, type NextFunction } from "express";
import { db, auditLogs } from "@workspace/db";

/**
 * Extract resource info from the request path.
 * Examples:
 * /api/reports/123 → { resourceType: "report", resourceId: 123 }
 * /api/workflows/abc → { resourceType: "workflow", resourceId: "abc" }
 * /api/v1/documents/42 → { resourceType: "document", resourceId: 42 }
 */
function extractResourceFromPath(path: string): {
  resourceType?: string;
  resourceId?: number | string;
} {
  // Remove query string if present
  const cleanPath = path.split("?")[0];

  // Match patterns like /api/reports/123 or /api/v1/reports/123
  const match = cleanPath.match(/\/api\/?(?:v\d+\/?)?([a-z_]+)\/([a-z0-9-]+)/i);

  if (!match) {
    return {};
  }

  const resourceType = match[1];
  let resourceId: number | string | undefined = match[2];

  // Try to parse as integer
  const parsed = parseInt(resourceId, 10);
  if (!isNaN(parsed)) {
    resourceId = parsed;
  }

  // Singularize common plural forms
  const singularized = resourceType
    .replace(/ies$/, "y") // workflows → workflow
    .replace(/s$/, ""); // reports → report

  return {
    resourceType: singularized,
    resourceId,
  };
}

/**
 * Get client IP address from request.
 * Checks x-forwarded-for header (for proxied requests) and req.ip fallback.
 */
function getClientIp(req: Request): string | undefined {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) {
    // x-forwarded-for can be a comma-separated list; take the first (client) IP
    const ips = typeof forwarded === "string" ? forwarded : forwarded[0];
    return ips?.split(",")[0]?.trim();
  }
  return req.ip;
}

/**
 * Log an audit event to the database.
 * Non-blocking: logs are fire-and-forget to avoid impacting request timing.
 */
async function logAudit(
  orgId: number | undefined,
  userId: string | undefined,
  action: string,
  resourceType: string | undefined,
  resourceId: number | string | undefined,
  ipAddress: string | undefined,
  userAgent: string | undefined,
  metadata?: Record<string, unknown>,
): Promise<void> {
  try {
    if (!orgId || !userId) {
      // Skip anonymous requests
      return;
    }

    await db.insert(auditLogs).values({
      orgId,
      userId,
      action,
      resourceType: resourceType || "unknown",
      resourceId: typeof resourceId === "number" ? resourceId : undefined,
      ipAddress,
      userAgent,
      metadata: metadata || {},
      status: "success",
    });
  } catch (error) {
    // Non-blocking: log errors to console but don't throw
    console.error("[AuditMiddleware] Failed to log audit event:", error);
  }
}

declare global {
  namespace Express {
    interface Request {
      /**
       * Helper function to manually log audit events.
       * Usage: req.auditLog("export", "report", 123, { format: "pdf" })
       */
      auditLog: (
        action: string,
        resourceType: string,
        resourceId?: number | string,
        metadata?: Record<string, unknown>,
      ) => Promise<void>;
    }
  }
}

export async function auditMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  // Attach the auditLog helper to the request
  req.auditLog = async (action, resourceType, resourceId, metadata) => {
    await logAudit(
      req.user?.orgId,
      req.user?.id,
      action,
      resourceType,
      resourceId,
      getClientIp(req),
      req.headers["user-agent"],
      metadata,
    );
  };

  // Only log on data-modifying operations
  const shouldLog =
    ["POST", "PUT", "PATCH", "DELETE"].includes(req.method) &&
    req.isAuthenticated();

  if (shouldLog) {
    const { resourceType, resourceId } = extractResourceFromPath(req.path);
    const ipAddress = getClientIp(req);
    const userAgent = req.headers["user-agent"];

    // Determine action from HTTP method
    const actionMap: Record<string, string> = {
      POST: "create",
      PUT: "update",
      PATCH: "update",
      DELETE: "delete",
    };
    const action = actionMap[req.method] || "unknown";

    // Fire-and-forget: log asynchronously without awaiting
    logAudit(
      req.user?.orgId,
      req.user?.id,
      action,
      resourceType,
      resourceId,
      ipAddress,
      userAgent,
    ).catch(() => {
      // Silently catch errors; we don't want logging failures to impact requests
    });
  }

  next();
}
