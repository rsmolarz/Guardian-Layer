import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListBackups,
  useGetBackupSummary,
  useGetBackupSettings,
  getListBackupsQueryKey,
  getGetBackupSummaryQueryKey,
  getGetBackupSettingsQueryKey,
} from "@workspace/api-client-react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import {
  HardDrive,
  Cloud,
  Database,
  Package,
  Code,
  CheckCircle2,
  XCircle,
  Clock,
  Play,
  Settings,
  ShieldCheck,
  Download,
  RefreshCw,
  AlertTriangle,
  Loader2,
  RotateCcw,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { CyberLoading } from "@/components/ui/CyberLoading";
import { CyberError } from "@/components/ui/CyberError";

function formatBytes(bytes: number | null | undefined): string {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

const statusConfig: Record<string, { color: string; icon: typeof CheckCircle2; label: string }> = {
  completed: { color: "text-emerald-400", icon: CheckCircle2, label: "Completed" },
  partial: { color: "text-amber-400", icon: AlertTriangle, label: "Partial" },
  failed: { color: "text-rose-400", icon: XCircle, label: "Failed" },
  in_progress: { color: "text-cyan-400", icon: Loader2, label: "In Progress" },
  pending: { color: "text-amber-400", icon: Clock, label: "Pending" },
};

export default function Backups() {
  const [activeTab, setActiveTab] = useState<"history" | "settings">("history");
  const [settingsForm, setSettingsForm] = useState<{
    intervalHours: number;
    retentionDays: number;
    maxBackups: number;
    autoBackupEnabled: boolean;
  } | null>(null);

  const queryClient = useQueryClient();
  const [adminKey, setAdminKey] = useState<string | null>(() => sessionStorage.getItem("backup_admin_key"));
  const { data: backupsData, isLoading: backupsLoading, error: backupsError } = useListBackups({ limit: 50, offset: 0 });
  const { data: summary, isLoading: summaryLoading } = useGetBackupSummary();
  const { data: settings, isLoading: settingsLoading } = useGetBackupSettings();

  function getAdminKey(): string | null {
    if (adminKey) return adminKey;
    const key = prompt("Enter backup admin key:");
    if (key) {
      setAdminKey(key);
      sessionStorage.setItem("backup_admin_key", key);
    }
    return key;
  }

  const [triggerLoading, setTriggerLoading] = useState(false);
  async function handleTrigger() {
    const key = getAdminKey();
    if (!key) return;
    setTriggerLoading(true);
    try {
      const resp = await fetch(`${import.meta.env.BASE_URL}api/backups/trigger`, {
        method: "POST",
        headers: { Authorization: `Bearer ${key}` },
      });
      if (resp.status === 401 || resp.status === 403) {
        sessionStorage.removeItem("backup_admin_key");
        setAdminKey(null);
        alert("Invalid admin key. Please try again.");
        return;
      }
      queryClient.invalidateQueries({ queryKey: getListBackupsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetBackupSummaryQueryKey() });
    } finally {
      setTriggerLoading(false);
    }
  }

  const [settingsSaving, setSettingsSaving] = useState(false);
  async function handleSaveSettings(data: { intervalHours?: number; retentionDays?: number; maxBackups?: number; autoBackupEnabled?: boolean }) {
    const key = getAdminKey();
    if (!key) return;
    setSettingsSaving(true);
    try {
      const resp = await fetch(`${import.meta.env.BASE_URL}api/backups/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify(data),
      });
      if (resp.status === 401 || resp.status === 403) {
        sessionStorage.removeItem("backup_admin_key");
        setAdminKey(null);
        alert("Invalid admin key. Please try again.");
        return;
      }
      queryClient.invalidateQueries({ queryKey: getGetBackupSettingsQueryKey() });
      setSettingsForm(null);
    } finally {
      setSettingsSaving(false);
    }
  }

  const [verifyLoading, setVerifyLoading] = useState(false);
  async function handleVerify(backupId: number) {
    const key = getAdminKey();
    if (!key) return;
    setVerifyLoading(true);
    try {
      const resp = await fetch(`${import.meta.env.BASE_URL}api/backups/${backupId}/verify`, {
        method: "POST",
        headers: { Authorization: `Bearer ${key}` },
      });
      if (resp.status === 401 || resp.status === 403) {
        sessionStorage.removeItem("backup_admin_key");
        setAdminKey(null);
        alert("Invalid admin key. Please try again.");
        return;
      }
      queryClient.invalidateQueries({ queryKey: getListBackupsQueryKey() });
    } finally {
      setVerifyLoading(false);
    }
  }

  const [restoreLoading, setRestoreLoading] = useState(false);
  async function handleRestore(backupId: number) {
    const key = getAdminKey();
    if (!key) return;
    setRestoreLoading(true);
    try {
      const resp = await fetch(`${import.meta.env.BASE_URL}api/backups/${backupId}/restore`, {
        method: "POST",
        headers: { "X-Confirm-Restore": "true", Authorization: `Bearer ${key}` },
      });
      if (resp.status === 401 || resp.status === 403) {
        sessionStorage.removeItem("backup_admin_key");
        setAdminKey(null);
        alert("Invalid admin key. Please try again.");
        return;
      }
      const data = await resp.json();
      if (data.success) {
        alert(`Restore completed: ${data.restoredComponents.join(", ")}`);
      } else {
        alert(`Restore issue: ${data.message}`);
      }
      queryClient.invalidateQueries({ queryKey: getListBackupsQueryKey() });
    } catch (err: unknown) {
      alert(`Restore error: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setRestoreLoading(false);
    }
  }

  if (backupsLoading || summaryLoading || settingsLoading) return <CyberLoading />;
  if (backupsError) return <CyberError message="Failed to load backups" />;

  const summaryCards = [
    {
      label: "Total Backups",
      value: summary?.totalBackups ?? 0,
      icon: Database,
      color: "text-cyan-400",
      bgColor: "bg-cyan-500/10",
    },
    {
      label: "Successful",
      value: summary?.successfulBackups ?? 0,
      icon: CheckCircle2,
      color: "text-emerald-400",
      bgColor: "bg-emerald-500/10",
    },
    {
      label: "Failed",
      value: summary?.failedBackups ?? 0,
      icon: XCircle,
      color: "text-rose-400",
      bgColor: "bg-rose-500/10",
    },
    {
      label: "Total Storage",
      value: formatBytes(summary?.totalSizeBytes),
      icon: HardDrive,
      color: "text-violet-400",
      bgColor: "bg-violet-500/10",
    },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Backup Center"
        description="Automated backup system — protect your platform with dual-redundancy backups to Google Drive & local VPS storage"
        action={
          <button
            onClick={() => handleTrigger()}
            disabled={triggerLoading}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary/20 border border-primary/30 rounded-xl text-primary font-display text-sm uppercase tracking-wider hover:bg-primary/30 transition-all disabled:opacity-50"
          >
            {triggerLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            {triggerLoading ? "Starting..." : "Backup Now"}
          </button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass-panel rounded-2xl p-5 border border-white/5"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">{card.label}</span>
              <div className={`p-2 rounded-lg ${card.bgColor}`}>
                <card.icon className={`w-4 h-4 ${card.color}`} />
              </div>
            </div>
            <p className={`text-2xl font-display font-bold ${card.color}`}>{card.value}</p>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="grid grid-cols-1 md:grid-cols-2 gap-4"
      >
        <div className="glass-panel rounded-2xl p-5 border border-white/5">
          <div className="flex items-center gap-3 mb-3">
            <HardDrive className="w-5 h-5 text-cyan-400" />
            <span className="font-display text-sm uppercase tracking-wider text-foreground">Local VPS Storage</span>
          </div>
          <p className="text-xl font-mono font-bold text-cyan-400">{formatBytes(summary?.localStorageUsedBytes)}</p>
          <p className="text-xs font-mono text-muted-foreground mt-1">On-server backup storage</p>
        </div>
        <div className="glass-panel rounded-2xl p-5 border border-white/5">
          <div className="flex items-center gap-3 mb-3">
            <Cloud className={`w-5 h-5 ${summary?.driveConnected ? "text-emerald-400" : "text-rose-400"}`} />
            <span className="font-display text-sm uppercase tracking-wider text-foreground">Google Drive</span>
            {summary?.driveConnected ? (
              <span className="ml-auto text-xs font-mono text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Connected
              </span>
            ) : (
              <span className="ml-auto text-xs font-mono text-rose-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                Disconnected
              </span>
            )}
          </div>
          <p className="text-xl font-mono font-bold text-emerald-400">{formatBytes(summary?.driveStorageUsedBytes)}</p>
          <p className="text-xs font-mono text-muted-foreground mt-1">Cloud backup storage</p>
        </div>
      </motion.div>

      {summary?.lastBackupAt && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="flex items-center gap-2 text-sm font-mono text-muted-foreground"
        >
          <Clock className="w-4 h-4" />
          Last backup: {format(new Date(summary.lastBackupAt), "MMM d, yyyy 'at' h:mm a")}
        </motion.div>
      )}

      <div className="flex gap-2 border-b border-white/10 pb-0">
        {[
          { key: "history" as const, label: "Backup History", icon: Database },
          { key: "settings" as const, label: "Settings", icon: Settings },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-display uppercase tracking-wider transition-all border-b-2 ${
              activeTab === tab.key
                ? "text-primary border-primary"
                : "text-muted-foreground border-transparent hover:text-foreground"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === "history" ? (
          <motion.div
            key="history"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-3"
          >
            {(!backupsData?.backups || backupsData.backups.length === 0) ? (
              <div className="glass-panel rounded-2xl p-12 border border-white/5 text-center">
                <Database className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                <p className="text-muted-foreground font-mono">No backups yet. Click "Backup Now" to create your first backup.</p>
              </div>
            ) : (
              backupsData.backups.map((backup, i) => {
                const status = statusConfig[backup.status] || statusConfig.pending;
                const StatusIcon = status.icon;
                return (
                  <motion.div
                    key={backup.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="glass-panel rounded-xl p-5 border border-white/5 hover:border-primary/20 transition-all"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className={`p-2 rounded-lg ${backup.status === "completed" ? "bg-emerald-500/10" : backup.status === "partial" ? "bg-amber-500/10" : backup.status === "failed" ? "bg-rose-500/10" : "bg-cyan-500/10"}`}>
                          <StatusIcon className={`w-4 h-4 ${status.color} ${backup.status === "in_progress" ? "animate-spin" : ""}`} />
                        </div>
                        <div className="min-w-0">
                          <p className="font-mono text-sm text-foreground truncate">{backup.name}</p>
                          <p className="text-xs font-mono text-muted-foreground">
                            {format(new Date(backup.createdAt), "MMM d, yyyy 'at' h:mm a")}
                            {" · "}
                            <span className={`${backup.type === "scheduled" ? "text-cyan-400" : "text-amber-400"}`}>
                              {backup.type}
                            </span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 flex-wrap">
                        <div className="flex items-center gap-2">
                          {backup.includesDatabase && (
                            <span className="flex items-center gap-1 text-xs font-mono text-emerald-400/80 bg-emerald-500/10 px-2 py-1 rounded">
                              <Database className="w-3 h-3" /> DB
                            </span>
                          )}
                          {backup.includesSourceCode && (
                            <span className="flex items-center gap-1 text-xs font-mono text-cyan-400/80 bg-cyan-500/10 px-2 py-1 rounded">
                              <Code className="w-3 h-3" /> Source
                            </span>
                          )}
                          {backup.includesPackages && (
                            <span className="flex items-center gap-1 text-xs font-mono text-violet-400/80 bg-violet-500/10 px-2 py-1 rounded">
                              <Package className="w-3 h-3" /> Packages
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
                          {backup.storedLocally && (
                            <span className="flex items-center gap-1" title="Stored on VPS">
                              <HardDrive className="w-3 h-3 text-cyan-400" />
                            </span>
                          )}
                          {backup.driveFileId && (
                            <span className="flex items-center gap-1" title="Stored on Google Drive">
                              <Cloud className="w-3 h-3 text-emerald-400" />
                            </span>
                          )}
                        </div>

                        {backup.sizeBytes && (
                          <span className="text-xs font-mono text-muted-foreground">
                            {formatBytes(backup.sizeBytes)}
                          </span>
                        )}

                        {backup.checksumVerified && (
                          <span className="flex items-center gap-1 text-xs font-mono text-emerald-400" title="Integrity verified">
                            <ShieldCheck className="w-3 h-3" />
                          </span>
                        )}

                        <div className="flex items-center gap-1">
                          {backup.status === "completed" && (
                            <>
                              <button
                                onClick={() => handleVerify(backup.id)}
                                disabled={verifyLoading}
                                className="p-1.5 rounded-lg hover:bg-white/5 text-muted-foreground hover:text-cyan-400 transition-colors"
                                title="Verify integrity"
                              >
                                <RefreshCw className={`w-3.5 h-3.5 ${verifyLoading ? "animate-spin" : ""}`} />
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm("Are you sure you want to restore from this backup? This will overwrite the current database.")) {
                                    handleRestore(backup.id);
                                  }
                                }}
                                disabled={restoreLoading}
                                className="p-1.5 rounded-lg hover:bg-white/5 text-muted-foreground hover:text-amber-400 transition-colors"
                                title="Restore from backup"
                              >
                                <RotateCcw className={`w-3.5 h-3.5 ${restoreLoading ? "animate-spin" : ""}`} />
                              </button>
                              {backup.storedLocally && (
                                <button
                                  onClick={async () => {
                                    const key = getAdminKey();
                                    if (!key) return;
                                    const resp = await fetch(`${import.meta.env.BASE_URL}api/backups/${backup.id}/download`, {
                                      headers: { Authorization: `Bearer ${key}` },
                                    });
                                    if (resp.status === 401 || resp.status === 403) {
                                      sessionStorage.removeItem("backup_admin_key");
                                      setAdminKey(null);
                                      alert("Invalid admin key.");
                                      return;
                                    }
                                    if (!resp.ok) { alert("Download failed"); return; }
                                    const blob = await resp.blob();
                                    const url = URL.createObjectURL(blob);
                                    const a = document.createElement("a");
                                    a.href = url;
                                    a.download = `${backup.name}.tar.gz`;
                                    a.click();
                                    URL.revokeObjectURL(url);
                                  }}
                                  className="p-1.5 rounded-lg hover:bg-white/5 text-muted-foreground hover:text-emerald-400 transition-colors"
                                  title="Download backup"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {backup.errorMessage && (
                      <div className="mt-3 flex items-start gap-2 text-xs font-mono text-rose-400 bg-rose-500/5 p-3 rounded-lg border border-rose-500/10">
                        <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                        {backup.errorMessage}
                      </div>
                    )}
                  </motion.div>
                );
              })
            )}
          </motion.div>
        ) : (
          <motion.div
            key="settings"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="glass-panel rounded-2xl p-6 border border-white/5 space-y-6"
          >
            <div className="flex items-center gap-3 mb-2">
              <Settings className="w-5 h-5 text-primary" />
              <h3 className="font-display text-lg uppercase tracking-wider text-foreground">Backup Configuration</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Backup Interval (hours)</label>
                <input
                  type="number"
                  min={1}
                  max={168}
                  value={settingsForm?.intervalHours ?? settings?.intervalHours ?? 6}
                  onChange={(e) => setSettingsForm((prev) => ({
                    intervalHours: parseInt(e.target.value) || 6,
                    retentionDays: prev?.retentionDays ?? settings?.retentionDays ?? 30,
                    maxBackups: prev?.maxBackups ?? settings?.maxBackups ?? 50,
                    autoBackupEnabled: prev?.autoBackupEnabled ?? settings?.autoBackupEnabled ?? true,
                  }))}
                  className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2.5 text-foreground font-mono text-sm focus:border-primary/50 focus:outline-none transition-colors"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Retention Period (days)</label>
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={settingsForm?.retentionDays ?? settings?.retentionDays ?? 30}
                  onChange={(e) => setSettingsForm((prev) => ({
                    intervalHours: prev?.intervalHours ?? settings?.intervalHours ?? 6,
                    retentionDays: parseInt(e.target.value) || 30,
                    maxBackups: prev?.maxBackups ?? settings?.maxBackups ?? 50,
                    autoBackupEnabled: prev?.autoBackupEnabled ?? settings?.autoBackupEnabled ?? true,
                  }))}
                  className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2.5 text-foreground font-mono text-sm focus:border-primary/50 focus:outline-none transition-colors"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Maximum Backups</label>
                <input
                  type="number"
                  min={5}
                  max={200}
                  value={settingsForm?.maxBackups ?? settings?.maxBackups ?? 50}
                  onChange={(e) => setSettingsForm((prev) => ({
                    intervalHours: prev?.intervalHours ?? settings?.intervalHours ?? 6,
                    retentionDays: prev?.retentionDays ?? settings?.retentionDays ?? 30,
                    maxBackups: parseInt(e.target.value) || 50,
                    autoBackupEnabled: prev?.autoBackupEnabled ?? settings?.autoBackupEnabled ?? true,
                  }))}
                  className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2.5 text-foreground font-mono text-sm focus:border-primary/50 focus:outline-none transition-colors"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Automatic Backups</label>
                <button
                  onClick={() => setSettingsForm((prev) => ({
                    intervalHours: prev?.intervalHours ?? settings?.intervalHours ?? 6,
                    retentionDays: prev?.retentionDays ?? settings?.retentionDays ?? 30,
                    maxBackups: prev?.maxBackups ?? settings?.maxBackups ?? 50,
                    autoBackupEnabled: !(prev?.autoBackupEnabled ?? settings?.autoBackupEnabled ?? true),
                  }))}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg border transition-all ${
                    (settingsForm?.autoBackupEnabled ?? settings?.autoBackupEnabled)
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                      : "bg-rose-500/10 border-rose-500/30 text-rose-400"
                  }`}
                >
                  <div className={`w-8 h-4 rounded-full relative transition-all ${
                    (settingsForm?.autoBackupEnabled ?? settings?.autoBackupEnabled)
                      ? "bg-emerald-500/40"
                      : "bg-rose-500/40"
                  }`}>
                    <div className={`absolute top-0.5 w-3 h-3 rounded-full transition-all ${
                      (settingsForm?.autoBackupEnabled ?? settings?.autoBackupEnabled)
                        ? "right-0.5 bg-emerald-400"
                        : "left-0.5 bg-rose-400"
                    }`} />
                  </div>
                  <span className="font-mono text-sm">
                    {(settingsForm?.autoBackupEnabled ?? settings?.autoBackupEnabled) ? "Enabled" : "Disabled"}
                  </span>
                </button>
              </div>
            </div>

            {settingsForm && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-end gap-3 pt-4 border-t border-white/5"
              >
                <button
                  onClick={() => setSettingsForm(null)}
                  className="px-4 py-2 text-sm font-display uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => settingsForm && handleSaveSettings(settingsForm)}
                  disabled={settingsSaving}
                  className="flex items-center gap-2 px-5 py-2 bg-primary/20 border border-primary/30 rounded-xl text-primary font-display text-sm uppercase tracking-wider hover:bg-primary/30 transition-all disabled:opacity-50"
                >
                  {settingsSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  Save Settings
                </button>
              </motion.div>
            )}

            {settings?.lastAutoBackupAt && (
              <p className="text-xs font-mono text-muted-foreground">
                Last automatic backup: {format(new Date(settings.lastAutoBackupAt), "MMM d, yyyy 'at' h:mm a")}
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
