import { useState } from "react";
import { motion } from "framer-motion";
import {
  HardDrive, Cloud, CheckCircle2, AlertTriangle, XCircle, Clock,
  RefreshCw, Download, Shield, Server, Database, Loader2, Play,
  ArrowRight, Zap,
} from "lucide-react";
import { clsx } from "clsx";

interface BackupJob {
  id: string;
  name: string;
  target: string;
  destination: string;
  type: "full" | "incremental" | "differential";
  schedule: string;
  lastRun: string;
  lastStatus: "success" | "failed" | "running" | "warning";
  size: string;
  duration: string;
  retention: string;
  encrypted: boolean;
  nextRun: string;
}

const STATUS_CONFIG = {
  success: { color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/30", icon: CheckCircle2, label: "Success" },
  failed: { color: "text-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/30", icon: XCircle, label: "Failed" },
  running: { color: "text-cyan-400", bg: "bg-cyan-500/10", border: "border-cyan-500/30", icon: Loader2, label: "Running" },
  warning: { color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/30", icon: AlertTriangle, label: "Warning" },
};

function generateJobs(): BackupJob[] {
  const now = Date.now();
  return [
    { id: "b1", name: "Production Database", target: "PostgreSQL (prod-db-01)", destination: "Backblaze B2 — gl-prod-backups", type: "incremental", schedule: "Every 6 hours", lastRun: new Date(now - 3600000).toISOString(), lastStatus: "success", size: "2.4 GB", duration: "3m 22s", retention: "30 days", encrypted: true, nextRun: new Date(now + 18000000).toISOString() },
    { id: "b2", name: "Application Servers", target: "prod-web-01, prod-api-01", destination: "Backblaze B2 — gl-server-images", type: "full", schedule: "Daily at 2:00 AM", lastRun: new Date(now - 28800000).toISOString(), lastStatus: "success", size: "48.7 GB", duration: "27m 14s", retention: "14 days", encrypted: true, nextRun: new Date(now + 57600000).toISOString() },
    { id: "b3", name: "User File Shares", target: "\\\\nas-01\\shared", destination: "Backblaze B2 — gl-fileshares", type: "incremental", schedule: "Every 12 hours", lastRun: new Date(now - 7200000).toISOString(), lastStatus: "success", size: "128.3 GB", duration: "45m 08s", retention: "60 days", encrypted: true, nextRun: new Date(now + 36000000).toISOString() },
    { id: "b4", name: "Email Archives", target: "Exchange Online", destination: "Veeam Cloud Connect", type: "incremental", schedule: "Daily at 3:00 AM", lastRun: new Date(now - 72000000).toISOString(), lastStatus: "warning", size: "34.2 GB", duration: "18m 55s", retention: "365 days", encrypted: true, nextRun: new Date(now + 14400000).toISOString() },
    { id: "b5", name: "Configuration Backups", target: "Firewall, Switch, Router configs", destination: "Local NAS + Backblaze B2", type: "full", schedule: "Weekly (Sunday 1:00 AM)", lastRun: new Date(now - 432000000).toISOString(), lastStatus: "success", size: "45 MB", duration: "0m 38s", retention: "90 days", encrypted: true, nextRun: new Date(now + 172800000).toISOString() },
    { id: "b6", name: "Development Environment", target: "staging-web-01, ci-jenkins-01", destination: "Backblaze B2 — gl-dev-backups", type: "differential", schedule: "Daily at 4:00 AM", lastRun: new Date(now - 86400000).toISOString(), lastStatus: "failed", size: "—", duration: "—", retention: "7 days", encrypted: false, nextRun: new Date(now + 28800000).toISOString() },
    { id: "b7", name: "Tailscale Node Configs", target: "All Tailscale devices (35)", destination: "Backblaze B2 — gl-tailscale", type: "full", schedule: "Weekly (Saturday 11:00 PM)", lastRun: new Date(now - 259200000).toISOString(), lastStatus: "success", size: "1.2 GB", duration: "8m 42s", retention: "30 days", encrypted: true, nextRun: new Date(now + 345600000).toISOString() },
    { id: "b8", name: "Security Logs Archive", target: "SIEM log retention", destination: "Backblaze B2 — gl-security-logs", type: "incremental", schedule: "Every 4 hours", lastRun: new Date(now - 7200000).toISOString(), lastStatus: "success", size: "12.8 GB", duration: "5m 18s", retention: "730 days", encrypted: true, nextRun: new Date(now + 7200000).toISOString() },
  ];
}

export default function BackupSolution() {
  const [jobs, setJobs] = useState(generateJobs);
  const [runningId, setRunningId] = useState<string | null>(null);

  const handleRunNow = async (id: string) => {
    setRunningId(id);
    setJobs(prev => prev.map(j => j.id === id ? { ...j, lastStatus: "running" as const } : j));
    await new Promise(r => setTimeout(r, 3000 + Math.random() * 2000));
    setJobs(prev => prev.map(j => j.id === id ? { ...j, lastStatus: "success" as const, lastRun: new Date().toISOString(), duration: `${Math.floor(Math.random() * 5 + 1)}m ${Math.floor(Math.random() * 59)}s` } : j));
    setRunningId(null);
  };

  const successCount = jobs.filter(j => j.lastStatus === "success").length;
  const failedCount = jobs.filter(j => j.lastStatus === "failed").length;
  const totalSize = "227.7 GB";

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-green-500/10 border border-green-500/30">
            <Cloud className="w-6 h-6 text-green-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Backup Solution</h1>
            <p className="text-gray-400 text-sm">Automated offsite backup management — Backblaze B2 + Veeam</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-xl border p-4 bg-cyan-500/10 border-cyan-500/30">
            <p className="text-sm text-cyan-400 mb-1">Backup Jobs</p>
            <p className="text-3xl font-bold text-cyan-400">{jobs.length}</p>
          </div>
          <div className="rounded-xl border p-4 bg-emerald-500/10 border-emerald-500/30">
            <p className="text-sm text-emerald-400 mb-1">Successful</p>
            <p className="text-3xl font-bold text-emerald-400">{successCount}</p>
          </div>
          <div className="rounded-xl border p-4 bg-rose-500/10 border-rose-500/30">
            <p className="text-sm text-rose-400 mb-1">Failed</p>
            <p className="text-3xl font-bold text-rose-400">{failedCount}</p>
          </div>
          <div className="rounded-xl border p-4 bg-violet-500/10 border-violet-500/30">
            <p className="text-sm text-violet-400 mb-1">Total Protected</p>
            <p className="text-2xl font-bold text-violet-400">{totalSize}</p>
          </div>
        </div>

        <div className="space-y-3">
          {jobs.map((job, i) => {
            const cfg = STATUS_CONFIG[job.lastStatus];
            const StatusIcon = cfg.icon;
            const isRunning = runningId === job.id;
            return (
              <motion.div key={job.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="bg-gray-900/50 border border-gray-800 rounded-xl p-5 hover:border-gray-700 transition-colors">
                <div className="flex items-start gap-4">
                  <div className={clsx("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border", cfg.bg, cfg.border)}>
                    <StatusIcon className={clsx("w-5 h-5", cfg.color, job.lastStatus === "running" && "animate-spin")} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-white font-medium">{job.name}</h3>
                      <span className={clsx("text-[10px] px-2 py-0.5 rounded-full uppercase", cfg.bg, cfg.color)}>{cfg.label}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-800 text-gray-400">{job.type}</span>
                      {job.encrypted && <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">Encrypted</span>}
                    </div>
                    <p className="text-xs text-gray-500 mb-2">{job.target} → {job.destination}</p>
                    <div className="flex gap-4 flex-wrap text-xs text-gray-500">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {job.schedule}</span>
                      <span className="flex items-center gap-1"><HardDrive className="w-3 h-3" /> {job.size}</span>
                      <span className="flex items-center gap-1"><Zap className="w-3 h-3" /> {job.duration}</span>
                      <span>Retention: {job.retention}</span>
                      <span>Last: {new Date(job.lastRun).toLocaleString()}</span>
                    </div>
                  </div>
                  <button onClick={() => handleRunNow(job.id)} disabled={isRunning} className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500/20 text-green-400 border border-green-500/30 text-xs hover:bg-green-500/30 transition-colors disabled:opacity-50">
                    {isRunning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                    {isRunning ? "Running..." : "Run Now"}
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
