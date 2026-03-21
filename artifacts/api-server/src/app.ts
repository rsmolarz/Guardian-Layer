import express, { type Express } from "express";
import cors from "cors";
import helmet from "helmet";
import router from "./routes";
import { activityLoggerMiddleware } from "./lib/activity-logger";
import { globalLimiter } from "./middleware/rate-limiter";
import { ipGuard } from "./middleware/ip-guard";
import { getPrometheusMetrics } from "./lib/metrics-collector";

const app: Express = express();

app.set("trust proxy", 1);

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      objectSrc: ["'none'"],
      frameSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      upgradeInsecureRequests: [],
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
  strictTransportSecurity: {
    maxAge: 63072000,
    includeSubDomains: true,
    preload: true,
  },
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  xFrameOptions: { action: "deny" },
  xContentTypeOptions: true,
}));

app.use(cors());

app.use(ipGuard);

app.use(globalLimiter);

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

app.get("/metrics", (_req, res) => {
  res.setHeader("Content-Type", "text/plain; version=0.0.4; charset=utf-8");
  res.send(getPrometheusMetrics());
});

app.use("/api", activityLoggerMiddleware, router);

export default app;
