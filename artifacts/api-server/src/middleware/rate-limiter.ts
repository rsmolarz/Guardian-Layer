import rateLimit from "express-rate-limit";
import type { Request, Response, NextFunction } from "express";

export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Too many requests",
    message: "Rate limit exceeded. Please try again in a few minutes.",
    retryAfter: "15 minutes",
  },
  keyGenerator: (req: Request) => {
    return (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.ip || "unknown";
  },
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Too many authentication attempts",
    message: "Please wait before trying again.",
    retryAfter: "15 minutes",
  },
  keyGenerator: (req: Request) => {
    return (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.ip || "unknown";
  },
});

export const threatIntelLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Threat intel rate limit exceeded",
    message: "External API calls are rate limited. Please wait a moment.",
    retryAfter: "1 minute",
  },
  keyGenerator: (req: Request) => {
    return (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.ip || "unknown";
  },
});

export const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "AI analysis rate limit exceeded",
    message: "Please wait before sending more analysis requests.",
    retryAfter: "1 minute",
  },
  keyGenerator: (req: Request) => {
    return (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.ip || "unknown";
  },
});
