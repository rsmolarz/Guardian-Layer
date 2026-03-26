import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { API_BASE } from "@/lib/constants";
import { authFetch } from "@/lib/auth";
import {
  Rocket, Server, Play, RotateCcw, Plus, Trash2, RefreshCw, Search,
  CheckCircle2, XCircle, Clock, AlertTriangle, Activity, Shield,
  Bot, Bell, Database, ChevronDown, ChevronUp, Zap, Eye, Settings,
  Pause, Package, Terminal, Send, Archive,
} from "lucide-react";

interface DevopsApp {
  id: number;
  name: string;
  repoUrl: string;
  environment: string;
  vpsHost: string;
  vpsPort: number;
  containerName: string;
  imageName: string;
  exposedPort: number;
  currentVersion: string | null;
  status: string;
  riskScore: number;
  createdAt: string;
  updatedAt: string;
}

interface Deployment {
  id: number;
  appId: number;
  version: string;
  imageTag: string | null;
  status: string;
  triggeredBy: string | null;
  deployedAt: string;
  completedAt: string | null;
  log: string | null;
}

interface Agent {
  id: number;
  name: string;
  description: string | null;
  trigger: string;
  schedule: string | null;
  enabled: boolean;
  configJson: string | null;
  lastRunAt: string | null;
  lastStatus: string | null;
}

interface BackupPolicy {
  id: number;
  appId: number;
  backupType: string;
  schedule: string;
  retentionDays: number;
  enabled: boolean;
  storagePath: string | null;
}

interface IncidentLog {
  id: number;
  appId: number | null;
  level: string;
  category: string;
  message: string;
  timestamp: string;
  resolved: boolean;
}

interface NotificationChannel {
  id: number;
  name: string;
  type: string;
  enabled: boolean;
  configJson: string | null;
}

interface Stats {
  apps: { total: number; running: number; failed: number };
  deployments: { total: number; recentWeek: number; successRate: number };
  incidents: { total: number; unresolved: number; critical: number };
  agents: { total: number; enabled: number };
}

type Tab = "apps" | "agents" | "backups" | "notifications" | "incidents";

const STATUS_CONFIG: Record<string, { color: string; bg: string; icon: typeof CheckCircle2 }> = {
  running: { color: "text-emerald-400", bg: "bg-emerald-400/10", icon: CheckCircle2 },
  stopped: { color: "text-gray-400", bg: "bg-gray-400/10", icon: Pause },
  deploying: { color: "text-amber-400", bg: "bg-amber-400/10", icon: RefreshCw },
  failed: { color: "text-red-400", bg: "bg-red-400/10", icon: XCircle },
  paused: { color: "text-blue-400", bg: "bg-blue-400/10", icon: Pause },
  pending: { color: "text-amber-400", bg: "bg-amber-400/10", icon: Clock },
  success: { color: "text-emerald-400", bg: "bg-emerald-400/10", icon: CheckCircle2 },
  completed: { color: "text-emerald-400", bg: "bg-emerald-400/10", icon: CheckCircle2 },
};

const LEVEL_COLORS: Record<string, string> = {
  info: "text-blue-400 bg-blue-400/10",
  warning: "text-amber-400 bg-amber-400/10",
  error: "text-red-400 bg-red-400/10",
  critical: "text-red-500 bg-red-500/20 font-bold",
};

const TABS: { key: Tab; label: string; icon: typeof Server }[] = [
  { key: "apps", label: "Applications", icon: Server },
  { key: "agents", label: "Agents", icon: Bot },
  { key: "backups", label: "Backups", icon: Database },
  { key: "notifications", label: "Notifications", icon: Bell },
  { key: "incidents", label: "Incident Log", icon: AlertTriangle },
];

export default function DevOpsControlPlane() {
  const [tab, setTab] = useState<Tab>("apps");
  const [stats, setStats] = useState<Stats | null>(null);
  const [apps, setApps] = useState<DevopsApp[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [incidents, setIncidents] = useState<IncidentLog[]>([]);
  const [channels, setChannels] = useState<NotificationChannel[]>([]);
  const [policies, setPolicies] = useState<BackupPolicy[]>([]);
  const [search, setSearch] = useState("");
  const [expandedApp, setExpandedApp] = useState<number | null>(null);
  const [deployments, setDeployments] = useState<Record<number, Deployment[]>>({});
  const [loading, setLoading] = useState(true);
  const [showAddApp, setShowAddApp] = useState(false);
  const [showAddAgent, setShowAddAgent] = useState(false);
  const [showAddChannel, setShowAddChannel] = useState(false);
  const [showSeed, setShowSeed] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [statsRes, appsRes, agentsRes, incidentsRes, channelsRes, policiesRes] = await Promise.all([
        authFetch(`${API_BASE}/api/devops/stats`),
        authFetch(`${API_BASE}/api/devops/apps`),
        authFetch(`${API_BASE}/api/devops/agents`),
        authFetch(`${API_BASE}/api/devops/incidents`),
        authFetch(`${API_BASE}/api/devops/notifications`),
        authFetch(`${API_BASE}/api/devops/backup-policies`),
      ]);
      if (statsRes.ok) setStats(await statsRes.json());
      if (appsRes.ok) { const d = await appsRes.json(); setApps(d.apps || []); }
      if (agentsRes.ok) { const d = await agentsRes.json(); setAgents(d.agents || []); }
      if (incidentsRes.ok) { const d = await incidentsRes.json(); setIncidents(d.incidents || []); }
      if (channelsRes.ok) { const d = await channelsRes.json(); setChannels(d.channels || []); }
      if (policiesRes.ok) { const d = await policiesRes.json(); setPolicies(d.policies || []); }
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const loadDeployments = async (appId: number) => {
    const res = await authFetch(`${API_BASE}/api/devops/apps/${appId}/deployments`);
    if (res.ok) {
      const d = await res.json();
      setDeployments((prev) => ({ ...prev, [appId]: d.deployments || [] }));
    }
  };

  const triggerDeploy = async (appId: number) => {
    await authFetch(`${API_BASE}/api/devops/apps/${appId}/deploy`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ triggeredBy: "dashboard" }),
    });
    fetchData(); loadDeployments(appId);
  };

  const triggerRollback = async (appId: number) => {
    await authFetch(`${API_BASE}/api/devops/apps/${appId}/rollback`, { method: "POST" });
    fetchData(); loadDeployments(appId);
  };

  const triggerBackup = async (appId: number) => {
    await authFetch(`${API_BASE}/api/devops/apps/${appId}/backup`, { method: "POST" });
    fetchData();
  };

  const triggerAgent = async (agentId: number) => {
    await authFetch(`${API_BASE}/api/devops/agents/${agentId}/run`, { method: "POST" });
    fetchData();
  };

  const deleteApp = async (appId: number) => {
    await authFetch(`${API_BASE}/api/devops/apps/${appId}`, { method: "DELETE" });
    fetchData();
  };

  const toggleApp = async (appId: number, currentStatus: string) => {
    const newStatus = currentStatus === "running" ? "stopped" : "running";
    await authFetch(`${API_BASE}/api/devops/apps/${appId}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    fetchData();
  };

  const seedData = async () => {
    setShowSeed(false);
    const seedApps = [
      { name: "GuardianLayer Web", containerName: "gl-web", imageName: "gl-web", exposedPort: 3000, repoUrl: "github.com/rsmolarz/guardianlayer", vpsHost: "gl-prod-01", environment: "production", status: "running", currentVersion: "2.4.1" },
      { name: "GuardianLayer API", containerName: "gl-api", imageName: "gl-api", exposedPort: 8080, repoUrl: "github.com/rsmolarz/guardianlayer-api", vpsHost: "gl-prod-01", environment: "production", status: "running", currentVersion: "2.4.1" },
      { name: "Elite CRM", containerName: "elite-crm", imageName: "elite-crm", exposedPort: 3001, repoUrl: "github.com/rsmolarz/elite-crm", vpsHost: "crm-prod-01", environment: "production", status: "running", currentVersion: "1.8.0" },
      { name: "CRM API Worker", containerName: "crm-worker", imageName: "crm-worker", exposedPort: 8081, repoUrl: "github.com/rsmolarz/elite-crm", vpsHost: "crm-prod-01", environment: "production", status: "running", currentVersion: "1.8.0" },
      { name: "Tailscale Aperture", containerName: "ts-aperture", imageName: "tailscale-aperture", exposedPort: 443, repoUrl: "github.com/tailscale/aperture", vpsHost: "ts-gateway-01", environment: "production", status: "running", currentVersion: "0.3.0" },
      { name: "Vault Backup Service", containerName: "vault-backup", imageName: "vault-backup", exposedPort: 9090, repoUrl: "github.com/rsmolarz/vault-backup", vpsHost: "gl-prod-01", environment: "production", status: "running", currentVersion: "1.0.2" },
      { name: "Domain Monitor Worker", containerName: "domain-monitor", imageName: "domain-monitor", exposedPort: 7070, repoUrl: "github.com/rsmolarz/domain-monitor", vpsHost: "gl-prod-02", environment: "production", status: "running", currentVersion: "1.1.0" },
      { name: "Threat Intel Aggregator", containerName: "threat-intel", imageName: "threat-intel", exposedPort: 6060, repoUrl: "github.com/rsmolarz/threat-intel", vpsHost: "gl-staging-01", environment: "staging", status: "running", currentVersion: "0.9.5" },
      { name: "Email Gateway (Postfix)", containerName: "email-gw", imageName: "email-gw", exposedPort: 25, repoUrl: "github.com/rsmolarz/email-gateway", vpsHost: "mail-prod-01", environment: "production", status: "running", currentVersion: "3.2.1" },
      { name: "DAST Scanner Engine", containerName: "dast-engine", imageName: "dast-engine", exposedPort: 5050, repoUrl: "github.com/rsmolarz/dast-scanner", vpsHost: "gl-prod-02", environment: "production", status: "stopped", currentVersion: "1.3.0" },
      { name: "SSH Bastion (Tailscale)", containerName: "ssh-bastion", imageName: "ssh-bastion", exposedPort: 22, repoUrl: "github.com/rsmolarz/ssh-bastion", vpsHost: "bastion-01", environment: "production", status: "running", currentVersion: "2.0.0" },
      { name: "Notification Relay", containerName: "notif-relay", imageName: "notif-relay", exposedPort: 4040, repoUrl: "github.com/rsmolarz/notif-relay", vpsHost: "gl-prod-01", environment: "production", status: "running", currentVersion: "1.0.1" },
    ];
    await authFetch(`${API_BASE}/api/devops/apps/bulk`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apps: seedApps }),
    });

    const seedAgents = [
      { name: "CodeGuardian", description: "Scans repos for vulnerabilities and outdated dependencies", trigger: "cron", schedule: "0 */6 * * *", enabled: true },
      { name: "UpgradeAgent", description: "Detects available updates for containers and packages", trigger: "cron", schedule: "0 0 * * 1", enabled: true },
      { name: "HealthCheck Monitor", description: "Pings all app health endpoints and reports failures", trigger: "cron", schedule: "*/5 * * * *", enabled: true },
      { name: "DB Agent", description: "Monitors database size, slow queries, and connection pools", trigger: "cron", schedule: "*/15 * * * *", enabled: true },
      { name: "Backup Verifier", description: "Validates backup integrity and tests restoration", trigger: "cron", schedule: "0 3 * * *", enabled: true },
      { name: "Certificate Watcher", description: "Monitors TLS certificate expiration across all domains", trigger: "cron", schedule: "0 8 * * *", enabled: true },
      { name: "Log Rotator", description: "Manages log retention and compression", trigger: "cron", schedule: "0 2 * * *", enabled: false },
      { name: "Anomaly Detector", description: "ML-based anomaly detection on traffic and system metrics", trigger: "cron", schedule: "*/10 * * * *", enabled: true },
    ];
    await authFetch(`${API_BASE}/api/devops/agents/bulk`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agents: seedAgents }),
    });

    fetchData();
  };

  const filteredApps = apps.filter((a) =>
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    a.containerName.toLowerCase().includes(search.toLowerCase()) ||
    a.environment.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-cyan-500/20 to-purple-500/20 rounded-lg border border-cyan-500/30">
            <Rocket className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">DevOps Control Plane</h1>
            <p className="text-sm text-gray-400">Application lifecycle management, deployments, agents & monitoring</p>
          </div>
        </div>
        <div className="flex gap-2">
          {apps.length === 0 && (
            <button onClick={() => setShowSeed(true)} className="flex items-center gap-2 px-3 py-2 bg-purple-600/20 text-purple-400 border border-purple-500/30 rounded-lg hover:bg-purple-600/30 text-sm">
              <Zap className="w-4 h-4" /> Seed Data
            </button>
          )}
          <button onClick={fetchData} className="flex items-center gap-2 px-3 py-2 bg-gray-800/60 text-gray-300 border border-gray-700 rounded-lg hover:bg-gray-700/60 text-sm">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>
      </div>

      {showSeed && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-4">
          <p className="text-purple-300 text-sm mb-3">This will seed 12 applications and 8 automated agents into the DevOps Control Plane. Continue?</p>
          <div className="flex gap-2">
            <button onClick={seedData} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm">Yes, Seed Data</button>
            <button onClick={() => setShowSeed(false)} className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 text-sm">Cancel</button>
          </div>
        </motion.div>
      )}

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Applications" value={stats.apps.total} sub={`${stats.apps.running} running`} icon={Server} color="cyan" />
          <StatCard label="Deployments" value={stats.deployments.total} sub={`${stats.deployments.successRate}% success`} icon={Package} color="emerald" />
          <StatCard label="Incidents" value={stats.incidents.unresolved} sub={`${stats.incidents.critical} critical`} icon={AlertTriangle} color={stats.incidents.critical > 0 ? "red" : "amber"} />
          <StatCard label="Agents" value={stats.agents.enabled} sub={`of ${stats.agents.total} total`} icon={Bot} color="purple" />
        </div>
      )}

      <div className="flex gap-1 bg-gray-900/50 p-1 rounded-lg border border-gray-800">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              tab === t.key
                ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                : "text-gray-400 hover:text-gray-200 hover:bg-gray-800/50"
            }`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
            {t.key === "incidents" && stats && stats.incidents.unresolved > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-xs bg-red-500/20 text-red-400 rounded-full">{stats.incidents.unresolved}</span>
            )}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
          {tab === "apps" && (
            <AppsTab
              apps={filteredApps} search={search} setSearch={setSearch}
              expandedApp={expandedApp} setExpandedApp={setExpandedApp}
              deployments={deployments} loadDeployments={loadDeployments}
              triggerDeploy={triggerDeploy} triggerRollback={triggerRollback}
              triggerBackup={triggerBackup} deleteApp={deleteApp}
              toggleApp={toggleApp} showAddApp={showAddApp}
              setShowAddApp={setShowAddApp} fetchData={fetchData}
            />
          )}
          {tab === "agents" && (
            <AgentsTab agents={agents} triggerAgent={triggerAgent}
              showAddAgent={showAddAgent} setShowAddAgent={setShowAddAgent} fetchData={fetchData}
            />
          )}
          {tab === "backups" && <BackupsTab policies={policies} apps={apps} />}
          {tab === "notifications" && (
            <NotificationsTab channels={channels} showAddChannel={showAddChannel}
              setShowAddChannel={setShowAddChannel} fetchData={fetchData}
            />
          )}
          {tab === "incidents" && <IncidentsTab incidents={incidents} apps={apps} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function StatCard({ label, value, sub, icon: Icon, color }: { label: string; value: number; sub: string; icon: typeof Server; color: string }) {
  const colorMap: Record<string, string> = {
    cyan: "from-cyan-500/10 to-cyan-500/5 border-cyan-500/20 text-cyan-400",
    emerald: "from-emerald-500/10 to-emerald-500/5 border-emerald-500/20 text-emerald-400",
    amber: "from-amber-500/10 to-amber-500/5 border-amber-500/20 text-amber-400",
    red: "from-red-500/10 to-red-500/5 border-red-500/20 text-red-400",
    purple: "from-purple-500/10 to-purple-500/5 border-purple-500/20 text-purple-400",
  };
  const cls = colorMap[color] || colorMap.cyan;
  return (
    <div className={`bg-gradient-to-br ${cls} border rounded-lg p-4`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-gray-400 uppercase tracking-wider">{label}</span>
        <Icon className="w-4 h-4 opacity-60" />
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="text-xs text-gray-400 mt-1">{sub}</div>
    </div>
  );
}

function AppsTab({
  apps, search, setSearch, expandedApp, setExpandedApp, deployments,
  loadDeployments, triggerDeploy, triggerRollback, triggerBackup, deleteApp,
  toggleApp, showAddApp, setShowAddApp, fetchData,
}: {
  apps: DevopsApp[]; search: string; setSearch: (s: string) => void;
  expandedApp: number | null; setExpandedApp: (id: number | null) => void;
  deployments: Record<number, Deployment[]>; loadDeployments: (id: number) => void;
  triggerDeploy: (id: number) => void; triggerRollback: (id: number) => void;
  triggerBackup: (id: number) => void; deleteApp: (id: number) => void;
  toggleApp: (id: number, status: string) => void;
  showAddApp: boolean; setShowAddApp: (v: boolean) => void; fetchData: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search applications..."
            className="w-full pl-10 pr-4 py-2.5 bg-gray-900/60 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50" />
        </div>
        <button onClick={() => setShowAddApp(!showAddApp)} className="flex items-center gap-2 px-4 py-2.5 bg-cyan-600/20 text-cyan-400 border border-cyan-500/30 rounded-lg hover:bg-cyan-600/30 text-sm">
          <Plus className="w-4 h-4" /> Add App
        </button>
      </div>

      {showAddApp && <AddAppForm onClose={() => setShowAddApp(false)} onSaved={fetchData} />}

      {apps.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <Server className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No applications registered yet</p>
          <p className="text-sm mt-1">Add an app or seed sample data to get started</p>
        </div>
      ) : (
        <div className="space-y-2">
          {apps.map((app) => {
            const sc = STATUS_CONFIG[app.status] || STATUS_CONFIG.stopped;
            const isExpanded = expandedApp === app.id;
            return (
              <motion.div key={app.id} layout className="bg-gray-900/40 border border-gray-800 rounded-lg overflow-hidden">
                <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-800/30"
                  onClick={() => {
                    setExpandedApp(isExpanded ? null : app.id);
                    if (!isExpanded && !deployments[app.id]) loadDeployments(app.id);
                  }}>
                  <div className="flex items-center gap-3">
                    <div className={`p-1.5 rounded-md ${sc.bg}`}>
                      <sc.icon className={`w-4 h-4 ${sc.color}`} />
                    </div>
                    <div>
                      <div className="text-white font-medium text-sm">{app.name}</div>
                      <div className="text-xs text-gray-500 flex items-center gap-2">
                        <span>{app.containerName}</span>
                        <span>·</span>
                        <span>{app.imageName}</span>
                        {app.currentVersion && <><span>·</span><span>v{app.currentVersion}</span></>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${sc.bg} ${sc.color}`}>{app.status}</span>
                    <span className="text-xs text-gray-500 px-2 py-0.5 border border-gray-700 rounded">{app.environment}</span>
                    {app.riskScore > 0 && (
                      <span className={`text-xs px-2 py-0.5 rounded ${app.riskScore > 7 ? "bg-red-500/10 text-red-400" : app.riskScore > 4 ? "bg-amber-500/10 text-amber-400" : "bg-green-500/10 text-green-400"}`}>
                        Risk: {app.riskScore}
                      </span>
                    )}
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                  </div>
                </div>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="border-t border-gray-800">
                      <div className="p-4 space-y-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                          <InfoCell label="Image" value={app.imageName} />
                          <InfoCell label="Port" value={String(app.exposedPort)} />
                          <InfoCell label="VPS Host" value={app.vpsHost || "—"} />
                          <InfoCell label="VPS Port" value={String(app.vpsPort)} />
                          <InfoCell label="Container" value={app.containerName} />
                          <InfoCell label="Repo" value={app.repoUrl || "—"} />
                          <InfoCell label="Created" value={new Date(app.createdAt).toLocaleDateString()} />
                          <InfoCell label="Updated" value={new Date(app.updatedAt).toLocaleDateString()} />
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <ActionBtn icon={Play} label="Deploy" color="emerald" onClick={() => triggerDeploy(app.id)} />
                          <ActionBtn icon={RotateCcw} label="Rollback" color="amber" onClick={() => triggerRollback(app.id)} />
                          <ActionBtn icon={Archive} label="Backup" color="blue" onClick={() => triggerBackup(app.id)} />
                          <ActionBtn icon={app.status === "running" ? Pause : Play}
                            label={app.status === "running" ? "Stop" : "Start"} color="gray"
                            onClick={() => toggleApp(app.id, app.status)} />
                          <ActionBtn icon={Trash2} label="Remove" color="red" onClick={() => deleteApp(app.id)} />
                        </div>

                        {deployments[app.id] && deployments[app.id].length > 0 && (
                          <div>
                            <h4 className="text-xs text-gray-400 uppercase tracking-wider mb-2">Recent Deployments</h4>
                            <div className="space-y-1">
                              {deployments[app.id].slice(0, 5).map((d) => {
                                const dc = STATUS_CONFIG[d.status] || STATUS_CONFIG.pending;
                                return (
                                  <div key={d.id} className="flex items-center justify-between px-3 py-2 bg-gray-800/30 rounded text-xs">
                                    <div className="flex items-center gap-2">
                                      <dc.icon className={`w-3 h-3 ${dc.color}`} />
                                      <span className="text-white">v{d.version}</span>
                                      <span className="text-gray-500">{d.imageTag}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-gray-500">
                                      <span>{d.triggeredBy}</span>
                                      <span>{new Date(d.deployedAt).toLocaleString()}</span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-gray-500">{label}</span>
      <div className="text-gray-300 mt-0.5 truncate">{value}</div>
    </div>
  );
}

function ActionBtn({ icon: Icon, label, color, onClick }: { icon: typeof Play; label: string; color: string; onClick: () => void }) {
  const colors: Record<string, string> = {
    emerald: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20",
    amber: "bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20",
    blue: "bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20",
    red: "bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20",
    gray: "bg-gray-500/10 text-gray-400 border-gray-500/20 hover:bg-gray-500/20",
    cyan: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20 hover:bg-cyan-500/20",
    purple: "bg-purple-500/10 text-purple-400 border-purple-500/20 hover:bg-purple-500/20",
  };
  return (
    <button onClick={onClick} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs ${colors[color] || colors.gray}`}>
      <Icon className="w-3.5 h-3.5" /> {label}
    </button>
  );
}

function AddAppForm({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ name: "", containerName: "", imageName: "", exposedPort: 3000, vpsHost: "", repoUrl: "", environment: "production" });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!form.name || !form.imageName) return;
    setSaving(true);
    const body = { ...form, containerName: form.containerName || form.name.toLowerCase().replace(/\s+/g, "-") };
    const res = await authFetch(`${API_BASE}/api/devops/apps`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) { onSaved(); onClose(); }
    setSaving(false);
  };

  return (
    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-gray-900/60 border border-gray-700 rounded-lg p-4">
      <h3 className="text-white font-medium mb-3">Register New Application</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <input placeholder="App Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50" />
        <input placeholder="Container Name" value={form.containerName} onChange={(e) => setForm({ ...form, containerName: e.target.value })}
          className="px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50" />
        <input placeholder="Image Name" value={form.imageName} onChange={(e) => setForm({ ...form, imageName: e.target.value })}
          className="px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50" />
        <input placeholder="Exposed Port" type="number" value={form.exposedPort} onChange={(e) => setForm({ ...form, exposedPort: Number(e.target.value) })}
          className="px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50" />
        <input placeholder="VPS Host" value={form.vpsHost} onChange={(e) => setForm({ ...form, vpsHost: e.target.value })}
          className="px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50" />
        <input placeholder="Repo URL" value={form.repoUrl} onChange={(e) => setForm({ ...form, repoUrl: e.target.value })}
          className="px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50" />
        <select value={form.environment} onChange={(e) => setForm({ ...form, environment: e.target.value })}
          className="px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm text-white focus:outline-none focus:border-cyan-500/50">
          <option value="production">Production</option>
          <option value="staging">Staging</option>
          <option value="development">Development</option>
        </select>
      </div>
      <div className="flex gap-2 mt-3">
        <button onClick={handleSubmit} disabled={saving} className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 text-sm disabled:opacity-50">
          {saving ? "Saving..." : "Register App"}
        </button>
        <button onClick={onClose} className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 text-sm">Cancel</button>
      </div>
    </motion.div>
  );
}

function AgentsTab({
  agents, triggerAgent, showAddAgent, setShowAddAgent, fetchData,
}: {
  agents: Agent[]; triggerAgent: (id: number) => void;
  showAddAgent: boolean; setShowAddAgent: (v: boolean) => void; fetchData: () => void;
}) {
  const toggleAgent = async (agent: Agent) => {
    await authFetch(`${API_BASE}/api/devops/agents/${agent.id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !agent.enabled }),
    });
    fetchData();
  };

  const triggerIcons: Record<string, typeof Shield> = {
    cron: Clock, webhook: Terminal, manual: Play, on_deploy: Package,
  };
  const triggerColors: Record<string, string> = {
    cron: "text-blue-400 bg-blue-400/10",
    webhook: "text-purple-400 bg-purple-400/10",
    manual: "text-amber-400 bg-amber-400/10",
    on_deploy: "text-emerald-400 bg-emerald-400/10",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-400">Automated agents that run on schedule or on-demand</p>
        <button onClick={() => setShowAddAgent(!showAddAgent)} className="flex items-center gap-2 px-3 py-2 bg-cyan-600/20 text-cyan-400 border border-cyan-500/30 rounded-lg hover:bg-cyan-600/30 text-sm">
          <Plus className="w-4 h-4" /> Add Agent
        </button>
      </div>

      {showAddAgent && <AddAgentForm onClose={() => setShowAddAgent(false)} onSaved={fetchData} />}

      {agents.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <Bot className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No agents configured</p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {agents.map((agent) => {
            const Icon = triggerIcons[agent.trigger] || Bot;
            const tColor = triggerColors[agent.trigger] || "text-gray-400 bg-gray-400/10";
            return (
              <div key={agent.id} className="bg-gray-900/40 border border-gray-800 rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-md ${tColor}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-white font-medium text-sm">{agent.name}</div>
                      <div className="text-xs text-gray-500">{agent.trigger}</div>
                    </div>
                  </div>
                  <button onClick={() => toggleAgent(agent)}
                    className={`px-2 py-0.5 rounded text-xs border ${agent.enabled ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10" : "text-gray-500 border-gray-700 bg-gray-800/50"}`}>
                    {agent.enabled ? "Enabled" : "Disabled"}
                  </button>
                </div>
                {agent.description && <p className="text-xs text-gray-400 mb-3">{agent.description}</p>}
                <div className="flex items-center justify-between">
                  <div className="text-xs text-gray-500">
                    {agent.schedule && <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {agent.schedule}</span>}
                    {agent.lastRunAt && <span className="mt-1 block">Last: {new Date(agent.lastRunAt).toLocaleString()}</span>}
                    {agent.lastStatus && (
                      <span className={`mt-1 block ${agent.lastStatus === "completed" ? "text-emerald-400" : agent.lastStatus === "running" ? "text-amber-400" : "text-gray-400"}`}>
                        Status: {agent.lastStatus}
                      </span>
                    )}
                  </div>
                  <button onClick={() => triggerAgent(agent.id)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded text-xs hover:bg-cyan-500/20">
                    <Play className="w-3 h-3" /> Run Now
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AddAgentForm({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ name: "", description: "", trigger: "cron" as string, schedule: "*/30 * * * *", enabled: true });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!form.name) return;
    setSaving(true);
    const res = await authFetch(`${API_BASE}/api/devops/agents`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) { onSaved(); onClose(); }
    setSaving(false);
  };

  return (
    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-gray-900/60 border border-gray-700 rounded-lg p-4">
      <h3 className="text-white font-medium mb-3">Create New Agent</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <input placeholder="Agent Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50" />
        <input placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
          className="px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50" />
        <select value={form.trigger} onChange={(e) => setForm({ ...form, trigger: e.target.value })}
          className="px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm text-white focus:outline-none focus:border-cyan-500/50">
          <option value="cron">Cron</option>
          <option value="webhook">Webhook</option>
          <option value="manual">Manual</option>
          <option value="on_deploy">On Deploy</option>
        </select>
        <input placeholder="Schedule (cron)" value={form.schedule} onChange={(e) => setForm({ ...form, schedule: e.target.value })}
          className="px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50" />
      </div>
      <div className="flex gap-2 mt-3">
        <button onClick={handleSubmit} disabled={saving} className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 text-sm disabled:opacity-50">
          {saving ? "Creating..." : "Create Agent"}
        </button>
        <button onClick={onClose} className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 text-sm">Cancel</button>
      </div>
    </motion.div>
  );
}

function BackupsTab({ policies, apps }: { policies: BackupPolicy[]; apps: DevopsApp[] }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-400">Backup policies and schedules for registered applications</p>
      {policies.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <Database className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No backup policies configured</p>
          <p className="text-sm mt-1">Use the application's "Backup" action to trigger manual backups</p>
        </div>
      ) : (
        <div className="space-y-2">
          {policies.map((p) => {
            const app = apps.find((a) => a.id === p.appId);
            return (
              <div key={p.id} className="bg-gray-900/40 border border-gray-800 rounded-lg p-4 flex items-center justify-between">
                <div>
                  <div className="text-white text-sm font-medium">{app?.name || `App #${p.appId}`}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {p.backupType} · {p.schedule} · Retain {p.retentionDays} days
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded text-xs ${p.enabled ? "text-emerald-400 bg-emerald-500/10" : "text-gray-500 bg-gray-800"}`}>
                  {p.enabled ? "Active" : "Disabled"}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function NotificationsTab({
  channels, showAddChannel, setShowAddChannel, fetchData,
}: {
  channels: NotificationChannel[]; showAddChannel: boolean;
  setShowAddChannel: (v: boolean) => void; fetchData: () => void;
}) {
  const typeIcons: Record<string, typeof Bell> = {
    telegram: Send, twilio_sms: Send, twilio_call: Send, email: Bell, slack: Bell, webhook: Terminal,
  };

  const toggleChannel = async (ch: NotificationChannel) => {
    await authFetch(`${API_BASE}/api/devops/notifications/${ch.id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !ch.enabled }),
    });
    fetchData();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-400">Notification channels for deployment events and alerts</p>
        <button onClick={() => setShowAddChannel(!showAddChannel)} className="flex items-center gap-2 px-3 py-2 bg-cyan-600/20 text-cyan-400 border border-cyan-500/30 rounded-lg hover:bg-cyan-600/30 text-sm">
          <Plus className="w-4 h-4" /> Add Channel
        </button>
      </div>

      {showAddChannel && <AddChannelForm onClose={() => setShowAddChannel(false)} onSaved={fetchData} />}

      {channels.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <Bell className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No notification channels configured</p>
        </div>
      ) : (
        <div className="space-y-2">
          {channels.map((ch) => {
            const Icon = typeIcons[ch.type] || Bell;
            return (
              <div key={ch.id} className="bg-gray-900/40 border border-gray-800 rounded-lg p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4 text-cyan-400" />
                  <div>
                    <div className="text-white text-sm font-medium">{ch.name}</div>
                    <div className="text-xs text-gray-500">{ch.type}</div>
                  </div>
                </div>
                <button onClick={() => toggleChannel(ch)}
                  className={`px-2 py-0.5 rounded text-xs border ${ch.enabled ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10" : "text-gray-500 border-gray-700 bg-gray-800/50"}`}>
                  {ch.enabled ? "Enabled" : "Disabled"}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AddChannelForm({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ name: "", type: "telegram", enabled: true });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!form.name) return;
    setSaving(true);
    const res = await authFetch(`${API_BASE}/api/devops/notifications`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) { onSaved(); onClose(); }
    setSaving(false);
  };

  return (
    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-gray-900/60 border border-gray-700 rounded-lg p-4">
      <h3 className="text-white font-medium mb-3">Add Notification Channel</h3>
      <div className="grid grid-cols-2 gap-3">
        <input placeholder="Channel Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50" />
        <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
          className="px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm text-white focus:outline-none focus:border-cyan-500/50">
          <option value="telegram">Telegram</option>
          <option value="twilio_sms">Twilio SMS</option>
          <option value="twilio_call">Twilio Call</option>
          <option value="email">Email</option>
          <option value="slack">Slack</option>
          <option value="webhook">Webhook</option>
        </select>
      </div>
      <div className="flex gap-2 mt-3">
        <button onClick={handleSubmit} disabled={saving} className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 text-sm disabled:opacity-50">
          {saving ? "Adding..." : "Add Channel"}
        </button>
        <button onClick={onClose} className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 text-sm">Cancel</button>
      </div>
    </motion.div>
  );
}

function IncidentsTab({ incidents, apps }: { incidents: IncidentLog[]; apps: DevopsApp[] }) {
  const [filter, setFilter] = useState<string>("all");
  const filtered = incidents.filter((i) => filter === "all" || i.level === filter);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <p className="text-sm text-gray-400 flex-1">System event log across all applications and agents</p>
        <div className="flex gap-1">
          {["all", "info", "warning", "error", "critical"].map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded text-xs ${filter === f ? "bg-cyan-500/20 text-cyan-400" : "text-gray-500 hover:text-gray-300"}`}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <Activity className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No incidents logged</p>
        </div>
      ) : (
        <div className="space-y-1 max-h-[600px] overflow-y-auto">
          {filtered.map((inc) => {
            const app = inc.appId ? apps.find((a) => a.id === inc.appId) : null;
            const lColor = LEVEL_COLORS[inc.level] || LEVEL_COLORS.info;
            return (
              <div key={inc.id} className="flex items-start gap-3 px-3 py-2 bg-gray-900/30 rounded text-xs hover:bg-gray-800/30">
                <span className={`px-1.5 py-0.5 rounded ${lColor} shrink-0`}>{inc.level}</span>
                <span className="text-gray-500 shrink-0 w-16">{inc.category}</span>
                <span className="text-gray-300 flex-1">{inc.message}</span>
                {app && <span className="text-gray-600 shrink-0">{app.name}</span>}
                <span className="text-gray-600 shrink-0">{new Date(inc.timestamp).toLocaleString()}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
