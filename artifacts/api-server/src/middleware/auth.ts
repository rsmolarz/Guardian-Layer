import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is required. Set it before starting the server.");
}

export interface JwtPayload {
  userId: string;
  username: string;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

const PUBLIC_PATHS = [
  "/api/auth/login",
  "/api/auth/firebase",
  "/api/auth/webauthn/login/options",
  "/api/auth/webauthn/login/verify",
  "/api/auth/medinvest/initiate",
  "/api/auth/medinvest/callback",
  "/api/auth/did/initiate",
  "/api/auth/did/callback",
  "/api/auth/did/exchange",
  "/api/health",
  "/api/healthz",
  "/metrics",
];

function isPublicPath(path: string): boolean {
  return PUBLIC_PATHS.some((p) => path === p || path.startsWith(p + "/"));
}

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (isPublicPath(req.path)) {
    next();
    return;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Authentication required", message: "Provide a Bearer token in the Authorization header." });
    return;
  }

  const token = authHeader.slice(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    req.user = decoded;
    next();
  } catch (err: any) {
    if (err.name === "TokenExpiredError") {
      res.status(401).json({ error: "Token expired", message: "Your session has expired. Please log in again." });
    } else {
      res.status(401).json({ error: "Invalid token", message: "The provided token is not valid." });
    }
  }
}

export function requireSuperadmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: "Authentication required." });
    return;
  }
  if (req.user.role !== "superadmin") {
    res.status(403).json({ error: "Access denied. Superadmin privileges required." });
    return;
  }
  next();
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "24h" });
}
