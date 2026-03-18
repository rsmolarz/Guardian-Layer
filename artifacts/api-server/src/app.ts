import express, { type Express } from "express";
import cors from "cors";
import router from "./routes";
import { activityLoggerMiddleware } from "./lib/activity-logger";

const app: Express = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", activityLoggerMiddleware, router);

export default app;
