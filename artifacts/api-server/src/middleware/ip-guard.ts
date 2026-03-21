import type { Request, Response, NextFunction } from "express";

interface IPRecord {
  count: number;
  firstSeen: number;
  lastSeen: number;
  blocked: boolean;
  blockedAt?: number;
  blockDurationMs?: number;
  reason?: string;
}

const ipTracker = new Map<string, IPRecord>();

const BLOCK_THRESHOLD = 100;
const WINDOW_MS = 5 * 60 * 1000;
const DEFAULT_BLOCK_DURATION_MS = 30 * 60 * 1000;
const CLEANUP_INTERVAL_MS = 10 * 60 * 1000;
const manualBlocklist = new Set<string>();

function getEffectiveBlockDuration(record: IPRecord): number {
  return record.blockDurationMs || DEFAULT_BLOCK_DURATION_MS;
}

function formatDuration(ms: number): string {
  const mins = Math.round(ms / 60000);
  if (mins < 60) return `${mins} minutes`;
  return `${Math.round(mins / 60)} hours`;
}

function isPrivateIP(ip: string): boolean {
  if (ip === "::1" || ip === "127.0.0.1" || ip.startsWith("::ffff:127.")) return true;
  if (ip.startsWith("10.")) return true;
  if (ip.startsWith("192.168.")) return true;
  if (ip.startsWith("172.")) {
    const second = parseInt(ip.split(".")[1], 10);
    if (second >= 16 && second <= 31) return true;
  }
  if (ip.startsWith("::ffff:10.") || ip.startsWith("::ffff:192.168.")) return true;
  if (ip.startsWith("::ffff:172.")) {
    const second = parseInt(ip.replace("::ffff:", "").split(".")[1], 10);
    if (second >= 16 && second <= 31) return true;
  }
  return false;
}

setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of ipTracker.entries()) {
    if (record.blocked && record.blockedAt && now - record.blockedAt > getEffectiveBlockDuration(record)) {
      record.blocked = false;
      record.count = 0;
      record.blockDurationMs = undefined;
    }
    if (!record.blocked && now - record.lastSeen > WINDOW_MS * 2) {
      ipTracker.delete(ip);
    }
  }
}, CLEANUP_INTERVAL_MS);

function getClientIP(req: Request): string {
  return req.ip || "unknown";
}

export function ipGuard(req: Request, res: Response, next: NextFunction): void {
  const ip = getClientIP(req);

  if (isPrivateIP(ip)) {
    next();
    return;
  }

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
    const duration = getEffectiveBlockDuration(record);
    if (record.blockedAt && now - record.blockedAt > duration) {
      record.blocked = false;
      record.count = 0;
      record.firstSeen = now;
      record.blockDurationMs = undefined;
    } else {
      const remaining = record.blockedAt ? duration - (now - record.blockedAt) : duration;
      res.status(429).json({
        error: "Temporarily blocked",
        message: "Too many requests. Your access has been temporarily restricted.",
        blockedFor: formatDuration(remaining),
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
    record.blockDurationMs = DEFAULT_BLOCK_DURATION_MS;
    record.reason = "Exceeded request threshold";
    console.warn(`[IP-GUARD] Blocked IP ${ip} — ${record.count} requests in ${Math.round((now - record.firstSeen) / 1000)}s`);
    res.status(429).json({
      error: "Temporarily blocked",
      message: "Too many requests. Your access has been temporarily restricted.",
      blockedFor: formatDuration(DEFAULT_BLOCK_DURATION_MS),
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

export function tempBlockIP(ip: string, durationMs: number, reason: string): void {
  const now = Date.now();
  let record = ipTracker.get(ip);
  if (!record) {
    record = { count: 0, firstSeen: now, lastSeen: now, blocked: false };
    ipTracker.set(ip, record);
  }
  record.blocked = true;
  record.blockedAt = now;
  record.blockDurationMs = durationMs;
  record.reason = reason;
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
