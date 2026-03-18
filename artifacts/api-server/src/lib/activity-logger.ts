import { db, activityLogsTable } from "@workspace/db";
import type { Request, Response, NextFunction } from "express";

export async function logActivity(params: {
  action: string;
  category: string;
  source: string;
  detail: string;
  severity?: string;
  ipAddress?: string;
  responseTimeMs?: number;
}) {
  try {
    await db.insert(activityLogsTable).values({
      action: params.action,
      category: params.category,
      source: params.source,
      detail: params.detail,
      severity: params.severity || "info",
      ipAddress: params.ipAddress || null,
      responseTimeMs: params.responseTimeMs || null,
    });
  } catch (_err) {
  }
}

export function activityLoggerMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;
    const path = req.path;

    if (path === "/healthz" || path.startsWith("/monitoring")) return;

    let action = "API_REQUEST";
    let category = "system";
    let severity = "info";

    if (path.includes("/transactions/scan")) {
      action = "TRANSACTION_SCAN";
      category = "transaction";
    } else if (path.includes("/transactions")) {
      action = "TRANSACTION_QUERY";
      category = "transaction";
    } else if (path.includes("/approvals") && path.includes("/approve")) {
      action = "TRANSACTION_APPROVED";
      category = "approval";
      severity = "warning";
    } else if (path.includes("/approvals") && path.includes("/reject")) {
      action = "TRANSACTION_REJECTED";
      category = "approval";
      severity = "warning";
    } else if (path.includes("/alerts") && path.includes("/dismiss")) {
      action = "ALERT_DISMISSED";
      category = "alert";
    } else if (path.includes("/alerts")) {
      action = "ALERTS_QUERY";
      category = "alert";
    } else if (path.includes("/integrations")) {
      action = "INTEGRATIONS_CHECK";
      category = "integration";
    }

    if (res.statusCode >= 500) severity = "error";
    else if (res.statusCode >= 400) severity = "warning";

    logActivity({
      action,
      category,
      source: `${req.method} ${path}`,
      detail: `${req.method} ${path} → ${res.statusCode} (${duration}ms)`,
      severity,
      ipAddress: (req.headers["x-forwarded-for"] as string) || req.ip || "unknown",
      responseTimeMs: duration,
    });
  });

  next();
}
