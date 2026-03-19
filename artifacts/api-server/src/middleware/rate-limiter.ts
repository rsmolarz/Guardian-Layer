import rateLimit from "express-rate-limit";

const sharedValidate = { default: true, xForwardedForHeader: false, keyGeneratorIpFallback: false };

export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  validate: sharedValidate,
  message: {
    error: "Too many requests",
    message: "Rate limit exceeded. Please try again in a few minutes.",
    retryAfter: "15 minutes",
  },
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  validate: sharedValidate,
  message: {
    error: "Too many authentication attempts",
    message: "Please wait before trying again.",
    retryAfter: "15 minutes",
  },
});

export const threatIntelLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  validate: sharedValidate,
  message: {
    error: "Threat intel rate limit exceeded",
    message: "External API calls are rate limited. Please wait a moment.",
    retryAfter: "1 minute",
  },
});

export const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  validate: sharedValidate,
  message: {
    error: "AI analysis rate limit exceeded",
    message: "Please wait before sending more analysis requests.",
    retryAfter: "1 minute",
  },
});
