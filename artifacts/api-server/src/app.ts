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
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
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
