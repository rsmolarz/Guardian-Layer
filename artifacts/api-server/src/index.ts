import app from "./app";
import { seedAllModules } from "./lib/seed";
import { startBackupScheduler } from "./routes/backups";
import { startAnomalyEngine } from "./lib/anomaly-engine";
import { initEventListeners } from "./lib/event-bus";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, async () => {
  console.log(`Server listening on port ${port}`);
  try {
    await seedAllModules();
  } catch (err) {
    console.error("Seed error:", err);
  }
  initEventListeners();
  setTimeout(() => {
    startBackupScheduler();
    startAnomalyEngine();
  }, 30000);
});
