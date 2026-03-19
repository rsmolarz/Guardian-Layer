import express, { type Express } from "express";
import cors from "cors";
import helmet from "helmet";
import router from "./routes";
import { activityLoggerMiddleware } from "./lib/activity-logger";
import { globalLimiter } from "./middleware/rate-limiter";
import { ipGuard } from "./middleware/ip-guard";

const app: Express = express();

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

app.use("/api", activityLoggerMiddleware, router);

export default app;
