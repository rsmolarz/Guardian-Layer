import type { Request, Response, NextFunction } from "express";

interface IPRecord {
  count: number;
  firstSeen: number;
  lastSeen: number;
  blocked: boolean;
  blockedAt?: number;
  reason?: string;
}

const ipTracker = new Map<string, IPRecord>();

const BLOCK_THRESHOLD = 100;
const WINDOW_MS = 5 * 60 * 1000;
const BLOCK_DURATION_MS = 30 * 60 * 1000;
const CLEANUP_INTERVAL_MS = 10 * 60 * 1000;
const manualBlocklist = new Set<string>();

setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of ipTracker.entries()) {
    if (record.blocked && record.blockedAt && now - record.blockedAt > BLOCK_DURATION_MS) {
      record.blocked = false;
      record.count = 0;
    }
    if (!record.blocked && now - record.lastSeen > WINDOW_MS * 2) {
      ipTracker.delete(ip);
    }
  }
}, CLEANUP_INTERVAL_MS);

function getClientIP(req: Request): string {
  return (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.ip || "unknown";
}

export function ipGuard(req: Request, res: Response, next: NextFunction): void {
  const ip = getClientIP(req);

  if (manualBlocklist.has(ip)) {
    res.status(403).json({
      error: "Access denied",
      message: "Your IP address has been blocked.",
    });
    return;
  }

  const now = Date.now();
  let record = ipTracker.get(ip);

  if (!record) {
    record = { count: 1, firstSeen: now, lastSeen: now, blocked: false };
    ipTracker.set(ip, record);
    next();
    return;
  }

  if (record.blocked) {
    if (record.blockedAt && now - record.blockedAt > BLOCK_DURATION_MS) {
      record.blocked = false;
      record.count = 0;
      record.firstSeen = now;
    } else {
      res.status(429).json({
        error: "Temporarily blocked",
        message: "Too many requests. Your access has been temporarily restricted.",
        blockedFor: "30 minutes",
      });
      return;
    }
  }

  if (now - record.firstSeen > WINDOW_MS) {
    record.count = 1;
    record.firstSeen = now;
  } else {
    record.count++;
  }

  record.lastSeen = now;

  if (record.count > BLOCK_THRESHOLD) {
    record.blocked = true;
    record.blockedAt = now;
    record.reason = "Exceeded request threshold";
    console.warn(`[IP-GUARD] Blocked IP ${ip} — ${record.count} requests in ${Math.round((now - record.firstSeen) / 1000)}s`);
    res.status(429).json({
      error: "Temporarily blocked",
      message: "Too many requests. Your access has been temporarily restricted.",
      blockedFor: "30 minutes",
    });
    return;
  }

  next();
}

export function blockIP(ip: string): void {
  manualBlocklist.add(ip);
  const record = ipTracker.get(ip);
  if (record) {
    record.blocked = true;
    record.blockedAt = Date.now();
    record.reason = "Manually blocked";
  }
}

export function unblockIP(ip: string): void {
  manualBlocklist.delete(ip);
  const record = ipTracker.get(ip);
  if (record) {
    record.blocked = false;
  }
}

export function getBlockedIPs(): Array<{ ip: string; reason: string; blockedAt: number }> {
  const blocked: Array<{ ip: string; reason: string; blockedAt: number }> = [];

  for (const ip of manualBlocklist) {
    blocked.push({ ip, reason: "Manually blocked", blockedAt: Date.now() });
  }

  for (const [ip, record] of ipTracker.entries()) {
    if (record.blocked && !manualBlocklist.has(ip)) {
      blocked.push({ ip, reason: record.reason || "Auto-blocked", blockedAt: record.blockedAt || Date.now() });
    }
  }

  return blocked;
}

export function getIPStats(): {
  tracked: number;
  blocked: number;
  manualBlocked: number;
} {
  let blocked = 0;
  for (const [, record] of ipTracker.entries()) {
    if (record.blocked) blocked++;
  }
  return {
    tracked: ipTracker.size,
    blocked,
    manualBlocked: manualBlocklist.size,
  };
}
