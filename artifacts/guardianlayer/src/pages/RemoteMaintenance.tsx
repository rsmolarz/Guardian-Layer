import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Server, Plus, Trash2, TestTube, Play, Loader2, CheckCircle, XCircle,
  AlertTriangle, Terminal, ChevronDown, ChevronUp, Monitor, HardDrive,
  Wifi, Shield, RefreshCw, Clock, Info, Eye, EyeOff, ClipboardCopy, Check,
  Download, Globe, Smartphone, Laptop, Search, Zap,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { WhyThisMatters } from "@/components/clarity/WhyThisMatters";
import { API_BASE } from "@/lib/constants";

interface Machine {
  id: number;
  name: string;
  hostname: string;
  port: number;
  username: string;
  authMethod: string;
  os: string | null;
  osVersion: string | null;
  lastSeen: string | null;
  lastMaintenanceAt: string | null;
  active: boolean;
  tags: string | null;
}

interface MaintenanceTask {
  id: string;
  label: string;
  description: string;
  category: string;
  os: string[];
  risk: "low" | "medium" | "high";
}

interface JobResult {
  jobId: number;
  status: string;
  task: string;
  machine: string;
  output: string;
}

const categoryIcons: Record<string, typeof HardDrive> = {
  "Disk Cleanup": HardDrive,
  "Network": Wifi,
  "Diagnostics": Monitor,
  "Updates": RefreshCw,
  "Performance": Terminal,
  "Security": Shield,
};

const riskColors: Record<string, string> = {
  low: "text-green-400 bg-green-500/15 border-green-500/30",
  medium: "text-yellow-400 bg-yellow-500/15 border-yellow-500/30",
  high: "text-red-400 bg-red-500/15 border-red-500/30",
};

const osLabels: Record<string, string> = {
  linux: "Linux",
  macos: "macOS",
  windows: "Windows",
};

function AddMachineModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [name, setName] = useState("");
  const [hostname, setHostname] = useState("");
  const [port, setPort] = useState("22");
  const [username, setUsername] = useState("");
  const [authMethod, setAuthMethod] = useState("password");
  const [credential, setCredential] = useState("");
  const [showCred, setShowCred] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    if (!name || !hostname || !username || !credential) {
      setError("All fields are required");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/api/remote-machines`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, hostname, port: parseInt(port), username, authMethod, credential }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to add machine");
      }
      onAdded();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-slate-900 border border-slate-700 rounded-xl p-6 w-full max-w-md mx-4 space-y-4"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-lg font-mono font-bold text-slate-200">Register Machine</h3>
        <p className="text-xs text-slate-500">SSH credentials are encrypted with AES-256-GCM at rest</p>

        <div className="space-y-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Machine Name</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Office Workstation"
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500/50" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <label className="block text-xs text-slate-400 mb-1">Hostname / Tailscale IP</label>
              <input value={hostname} onChange={e => setHostname(e.target.value)} placeholder="100.64.x.x or hostname"
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500/50" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">SSH Port</label>
              <input value={port} onChange={e => setPort(e.target.value)} type="number"
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-sm text-slate-200 focus:outline-none focus:border-cyan-500/50" />
            </div>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Username</label>
            <input value={username} onChange={e => setUsername(e.target.value)} placeholder="e.g. admin"
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500/50" />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Auth Method</label>
            <div className="flex gap-2">
              <button onClick={() => setAuthMethod("password")}
                className={`flex-1 py-2 text-xs font-mono rounded border transition-colors ${authMethod === "password" ? "bg-cyan-600 border-cyan-500 text-white" : "bg-slate-800 border-slate-700 text-slate-400"}`}>
                Password
              </button>
              <button onClick={() => setAuthMethod("key")}
                className={`flex-1 py-2 text-xs font-mono rounded border transition-colors ${authMethod === "key" ? "bg-cyan-600 border-cyan-500 text-white" : "bg-slate-800 border-slate-700 text-slate-400"}`}>
                SSH Key
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">
              {authMethod === "password" ? "Password" : "Private Key (paste full key)"}
            </label>
            <div className="relative">
              {authMethod === "key" ? (
                <textarea value={credential} onChange={e => setCredential(e.target.value)}
                  placeholder="-----BEGIN OPENSSH PRIVATE KEY-----"
                  rows={4}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500/50 font-mono text-xs" />
              ) : (
                <div className="relative">
                  <input value={credential} onChange={e => setCredential(e.target.value)}
                    type={showCred ? "text" : "password"} placeholder="SSH password"
                    className="w-full px-3 py-2 pr-10 bg-slate-800 border border-slate-700 rounded text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500/50" />
                  <button onClick={() => setShowCred(!showCred)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                    {showCred ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {error && <p className="text-xs text-red-400">{error}</p>}

        <div className="flex gap-2 pt-2">
          <button onClick={onClose} className="flex-1 py-2 text-xs font-mono text-slate-400 border border-slate-700 rounded hover:bg-slate-800 transition-colors">
            CANCEL
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 py-2 text-xs font-mono text-white bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 rounded transition-colors flex items-center justify-center gap-2">
            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
            {saving ? "SAVING..." : "ADD MACHINE"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function MachineCard({
  machine,
  tasks,
  onDelete,
  onTest,
}: {
  machine: Machine;
  tasks: MaintenanceTask[];
  onDelete: (id: number) => void;
  onTest: (id: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [running, setRunning] = useState<string | null>(null);
  const [result, setResult] = useState<JobResult | null>(null);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; os?: string; error?: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const availableTasks = tasks.filter(t => !machine.os || t.os.includes(machine.os));

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch(`${API_BASE}/api/remote-machines/${machine.id}/test`, { method: "POST" });
      const data = await res.json();
      setTestResult(data);
      if (data.success) onTest(machine.id);
    } catch (err: any) {
      setTestResult({ success: false, error: err.message });
    } finally {
      setTesting(false);
    }
  };

  const handleRunTask = async (taskId: string) => {
    setRunning(taskId);
    setResult(null);
    try {
      const res = await fetch(`${API_BASE}/api/remote-maintenance/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ machineId: machine.id, taskId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Task failed");
      setResult(data);
    } catch (err: any) {
      setResult({ jobId: 0, status: "error", task: taskId, machine: machine.name, output: err.message });
    } finally {
      setRunning(null);
    }
  };

  const handleCopyOutput = () => {
    if (!result) return;
    navigator.clipboard.writeText(result.output).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const categories = [...new Set(availableTasks.map(t => t.category))];

  return (
    <div className="border border-slate-700/50 rounded-lg bg-slate-800/30 overflow-hidden">
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${machine.os === "macos" ? "bg-slate-700/50" : machine.os === "windows" ? "bg-blue-500/15" : "bg-green-500/15"}`}>
              <Server className={`w-5 h-5 ${machine.os === "macos" ? "text-slate-300" : machine.os === "windows" ? "text-blue-400" : "text-green-400"}`} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-200">{machine.name}</h3>
              <p className="text-xs text-slate-500 font-mono">{machine.username}@{machine.hostname}:{machine.port}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {machine.os && (
              <span className="text-[10px] font-mono px-2 py-1 rounded bg-slate-700/50 text-slate-400">
                {osLabels[machine.os] || machine.os} {machine.osVersion ? `(${machine.osVersion})` : ""}
              </span>
            )}
            {machine.lastSeen && (
              <span className="text-[10px] text-slate-600 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {new Date(machine.lastSeen).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 mt-3">
          <button onClick={handleTest} disabled={testing}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono border rounded transition-colors text-cyan-400 border-cyan-500/30 hover:bg-cyan-500/10 disabled:opacity-50">
            {testing ? <Loader2 className="w-3 h-3 animate-spin" /> : <TestTube className="w-3 h-3" />}
            {testing ? "TESTING..." : "TEST CONNECTION"}
          </button>
          <button onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono border rounded transition-colors text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10">
            <Terminal className="w-3 h-3" />
            MAINTENANCE
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
          <button onClick={() => onDelete(machine.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono border rounded transition-colors text-red-400 border-red-500/30 hover:bg-red-500/10 ml-auto">
            <Trash2 className="w-3 h-3" /> REMOVE
          </button>
        </div>

        {testResult && (
          <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
            className={`mt-3 p-2 rounded text-xs font-mono ${testResult.success ? "bg-green-500/10 border border-green-500/30 text-green-400" : "bg-red-500/10 border border-red-500/30 text-red-400"}`}>
            {testResult.success ? (
              <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Connected — OS: {osLabels[testResult.os || ""] || testResult.os}</span>
            ) : (
              <span className="flex items-center gap-1"><XCircle className="w-3 h-3" /> {testResult.error}</span>
            )}
          </motion.div>
        )}
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3 border-t border-slate-700/30 pt-3">
              {!machine.os && (
                <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-yellow-300">Test the connection first to auto-detect the operating system. Tasks will be filtered by OS.</p>
                </div>
              )}

              {categories.map(cat => {
                const CatIcon = categoryIcons[cat] || Terminal;
                const catTasks = availableTasks.filter(t => t.category === cat);
                return (
                  <div key={cat}>
                    <div className="flex items-center gap-2 mb-2">
                      <CatIcon className="w-3.5 h-3.5 text-slate-500" />
                      <span className="text-xs font-mono font-semibold text-slate-400 uppercase">{cat}</span>
                    </div>
                    <div className="space-y-1.5">
                      {catTasks.map(task => (
                        <div key={task.id} className="flex items-center gap-3 p-2 rounded bg-slate-900/40 border border-slate-800">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-slate-200">{task.label}</span>
                              <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${riskColors[task.risk]}`}>{task.risk}</span>
                            </div>
                            <p className="text-[11px] text-slate-500 mt-0.5">{task.description}</p>
                          </div>
                          <button
                            onClick={() => handleRunTask(task.id)}
                            disabled={running !== null}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-mono bg-slate-800 border border-slate-700 rounded hover:bg-slate-700 text-slate-300 disabled:opacity-40 transition-colors shrink-0"
                          >
                            {running === task.id ? (
                              <><Loader2 className="w-3 h-3 animate-spin" /> RUNNING...</>
                            ) : (
                              <><Play className="w-3 h-3" /> RUN</>
                            )}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}

              {result && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className="mt-3 border border-slate-700/50 rounded-lg overflow-hidden">
                  <div className="flex items-center justify-between p-3 bg-slate-900/60">
                    <div className="flex items-center gap-2">
                      {result.status === "completed" ? (
                        <CheckCircle className="w-4 h-4 text-green-400" />
                      ) : result.status === "error" ? (
                        <XCircle className="w-4 h-4 text-red-400" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-yellow-400" />
                      )}
                      <span className="text-xs font-mono text-slate-300">{result.task} — {result.status}</span>
                    </div>
                    <button onClick={handleCopyOutput}
                      className="flex items-center gap-1 px-2 py-1 text-[10px] font-mono text-emerald-400 border border-emerald-500/30 rounded hover:bg-emerald-500/10 transition-colors">
                      {copied ? <><Check className="w-3 h-3" /> COPIED</> : <><ClipboardCopy className="w-3 h-3" /> COPY</>}
                    </button>
                  </div>
                  <pre className="p-3 text-[11px] text-slate-300 font-mono whitespace-pre-wrap max-h-60 overflow-y-auto bg-slate-950/50">
                    {result.output}
                  </pre>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface TailscaleDevice {
  id: string;
  hostname: string;
  tailscaleIp: string;
  os: string;
  normalizedOs: string;
  online: boolean;
  lastSeen: string;
  clientVersion: string;
  updateAvailable: boolean;
  authorized: boolean;
  alreadyRegistered: boolean;
}

const tsOsIcons: Record<string, string> = {
  windows: "🪟",
  linux: "🐧",
  macOS: "🍎",
  iOS: "📱",
  android: "🤖",
};

function TailscaleDiscovery({ onImported }: { onImported: () => void }) {
  const [open, setOpen] = useState(false);
  const [devices, setDevices] = useState<TailscaleDevice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number } | null>(null);
  const [filter, setFilter] = useState("");
  const [configured, setConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/tailscale/status`)
      .then(r => r.json())
      .then(d => setConfigured(d.configured))
      .catch(() => setConfigured(false));
  }, []);

  const loadDevices = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/tailscale/devices`);
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to load devices");
      }
      const data = await res.json();
      setDevices(data.devices || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = () => {
    setOpen(!open);
    if (!open && devices.length === 0) loadDevices();
  };

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAllImportable = () => {
    const importable = devices.filter(d => !d.alreadyRegistered && d.os !== "iOS" && d.os !== "android");
    if (selected.size === importable.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(importable.map(d => d.id)));
    }
  };

  const handleImport = async () => {
    if (selected.size === 0) return;
    setImporting(true);
    setImportResult(null);
    try {
      const toImport = devices.filter(d => selected.has(d.id)).map(d => ({
        hostname: d.hostname,
        tailscaleIp: d.tailscaleIp,
        os: d.os,
        sshPort: 22,
        username: d.normalizedOs === "windows" ? "" : "root",
      }));
      const res = await fetch(`${API_BASE}/api/tailscale/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ devices: toImport }),
      });
      const data = await res.json();
      setImportResult({ imported: data.imported, skipped: data.skipped });
      setSelected(new Set());
      await loadDevices();
      onImported();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setImporting(false);
    }
  };

  if (configured === false) return null;

  const filtered = devices.filter(d =>
    !filter || d.hostname.toLowerCase().includes(filter.toLowerCase()) ||
    d.tailscaleIp.includes(filter) || d.os.toLowerCase().includes(filter.toLowerCase())
  );

  const onlineCount = devices.filter(d => d.online).length;
  const importableCount = filtered.filter(d => !d.alreadyRegistered && d.os !== "iOS" && d.os !== "android").length;

  return (
    <div className="border border-violet-500/20 rounded-lg bg-violet-500/5 overflow-hidden">
      <button onClick={handleOpen}
        className="w-full flex items-center justify-between p-4 hover:bg-violet-500/10 transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center">
            <Globe className="w-4 h-4 text-violet-400" />
          </div>
          <div className="text-left">
            <span className="text-sm font-mono font-semibold text-violet-300">Tailscale Network Discovery</span>
            {devices.length > 0 && (
              <span className="ml-2 text-xs text-slate-500">
                {devices.length} devices · {onlineCount} online
              </span>
            )}
          </div>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 text-violet-400 animate-spin" />
                  <span className="ml-2 text-sm text-slate-400">Scanning Tailscale network...</span>
                </div>
              ) : error ? (
                <div className="flex items-center gap-2 py-4 text-red-400 text-sm">
                  <XCircle className="w-4 h-4" /> {error}
                  <button onClick={loadDevices} className="ml-2 text-xs text-cyan-400 hover:underline">Retry</button>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                      <input
                        value={filter}
                        onChange={e => setFilter(e.target.value)}
                        placeholder="Filter by name, IP, or OS..."
                        className="w-full pl-8 pr-3 py-1.5 bg-slate-800 border border-slate-700 rounded text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-violet-500/50"
                      />
                    </div>
                    <button onClick={() => loadDevices()}
                      className="p-1.5 text-slate-500 hover:text-violet-400 transition-colors" title="Refresh">
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                    {importableCount > 0 && (
                      <>
                        <button onClick={selectAllImportable}
                          className="px-2 py-1 text-[10px] font-mono text-violet-400 border border-violet-500/30 rounded hover:bg-violet-500/10 transition-colors">
                          {selected.size > 0 ? "DESELECT ALL" : "SELECT ALL"}
                        </button>
                        <button onClick={handleImport} disabled={selected.size === 0 || importing}
                          className="flex items-center gap-1 px-3 py-1 text-[10px] font-mono text-white bg-violet-600 hover:bg-violet-500 disabled:bg-slate-700 disabled:text-slate-500 rounded transition-colors">
                          {importing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                          IMPORT {selected.size > 0 ? `(${selected.size})` : ""}
                        </button>
                      </>
                    )}
                  </div>

                  {importResult && (
                    <div className="flex items-center gap-2 p-2 rounded bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400">
                      <CheckCircle className="w-3.5 h-3.5" />
                      Imported {importResult.imported} device{importResult.imported !== 1 ? "s" : ""}.
                      {importResult.skipped > 0 && ` ${importResult.skipped} skipped (already registered).`}
                    </div>
                  )}

                  <div className="max-h-80 overflow-y-auto space-y-1 scrollbar-thin">
                    {filtered.map(dev => {
                      const isMobile = dev.os === "iOS" || dev.os === "android";
                      return (
                        <div key={dev.id}
                          className={`flex items-center gap-3 p-2 rounded text-xs transition-colors ${
                            dev.alreadyRegistered
                              ? "bg-slate-800/30 opacity-50"
                              : selected.has(dev.id)
                              ? "bg-violet-500/15 border border-violet-500/30"
                              : "bg-slate-800/50 hover:bg-slate-800 border border-transparent"
                          } ${isMobile ? "opacity-40" : ""}`}
                        >
                          {!isMobile && !dev.alreadyRegistered ? (
                            <input type="checkbox" checked={selected.has(dev.id)} onChange={() => toggleSelect(dev.id)}
                              className="accent-violet-500 w-3.5 h-3.5 cursor-pointer" />
                          ) : (
                            <div className="w-3.5" />
                          )}
                          <span className="text-base leading-none">{tsOsIcons[dev.os] || "💻"}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-slate-200 truncate">{dev.hostname}</span>
                              <span className={`w-1.5 h-1.5 rounded-full ${dev.online ? "bg-emerald-400 shadow-[0_0_4px_rgba(52,211,153,0.6)]" : "bg-slate-600"}`} />
                            </div>
                          </div>
                          <span className="font-mono text-cyan-400 text-[11px] shrink-0">{dev.tailscaleIp}</span>
                          <span className="text-slate-500 w-14 text-right">{dev.os}</span>
                          {dev.alreadyRegistered && (
                            <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 text-[10px] font-mono border border-emerald-500/20">
                              REGISTERED
                            </span>
                          )}
                          {isMobile && (
                            <span className="px-1.5 py-0.5 rounded bg-slate-700 text-slate-500 text-[10px] font-mono">
                              NO SSH
                            </span>
                          )}
                          {dev.updateAvailable && !isMobile && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 text-[10px] font-mono border border-amber-500/20">
                              UPDATE
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {filtered.length === 0 && (
                    <p className="text-center text-xs text-slate-500 py-4">No devices match your filter.</p>
                  )}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface RunAllResult {
  machineId: number;
  machineName: string;
  hostname: string;
  status: string;
  output: string;
  jobId: number;
}

interface RunAllResponse {
  task: string;
  totalMachines: number;
  summary: { completed: number; partial: number; errors: number; skipped: number };
  results: RunAllResult[];
}

function RunAllPanel({ machines, tasks }: { machines: Machine[]; tasks: MaintenanceTask[] }) {
  const [open, setOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState("");
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState("");
  const [response, setResponse] = useState<RunAllResponse | null>(null);
  const [expandedResults, setExpandedResults] = useState<Set<number>>(new Set());
  const [copied, setCopied] = useState<number | null>(null);

  const categories = [...new Set(tasks.map(t => t.category))];

  const handleRunAll = async () => {
    if (!selectedTask) return;
    setRunning(true);
    setResponse(null);
    setExpandedResults(new Set());
    const task = tasks.find(t => t.id === selectedTask);
    setProgress(`Running "${task?.label}" across ${machines.length} machines...`);
    try {
      const res = await fetch(`${API_BASE}/api/remote-maintenance/run-all`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId: selectedTask }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Run All failed");
      setResponse(data);
      setProgress("");
    } catch (err: any) {
      setProgress("");
      setResponse({ task: task?.label || selectedTask, totalMachines: 0, summary: { completed: 0, partial: 0, errors: 1, skipped: 0 }, results: [{ machineId: 0, machineName: "Error", hostname: "", status: "error", output: err.message, jobId: 0 }] });
    } finally {
      setRunning(false);
    }
  };

  const toggleExpand = (idx: number) => {
    setExpandedResults(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  };

  const expandAll = () => {
    if (!response) return;
    if (expandedResults.size === response.results.length) {
      setExpandedResults(new Set());
    } else {
      setExpandedResults(new Set(response.results.map((_, i) => i)));
    }
  };

  const handleCopy = (idx: number, text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(idx);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  const handleCopyAll = () => {
    if (!response) return;
    const allOutput = response.results.map(r => `=== ${r.machineName} (${r.hostname}) — ${r.status} ===\n${r.output}`).join("\n\n");
    navigator.clipboard.writeText(allOutput).then(() => {
      setCopied(-1);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  const statusIcon = (status: string) => {
    if (status === "completed") return <CheckCircle className="w-3.5 h-3.5 text-green-400" />;
    if (status === "error") return <XCircle className="w-3.5 h-3.5 text-red-400" />;
    if (status === "skipped") return <AlertTriangle className="w-3.5 h-3.5 text-slate-400" />;
    return <AlertTriangle className="w-3.5 h-3.5 text-yellow-400" />;
  };

  const statusColor = (status: string) => {
    if (status === "completed") return "text-green-400";
    if (status === "error") return "text-red-400";
    if (status === "skipped") return "text-slate-400";
    return "text-yellow-400";
  };

  if (machines.length === 0) return null;

  return (
    <div className="border border-amber-500/20 rounded-lg bg-amber-500/5 overflow-hidden">
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 hover:bg-amber-500/10 transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
            <Zap className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-left">
            <span className="text-sm font-mono font-semibold text-amber-300">Run All Machines</span>
            <span className="ml-2 text-xs text-slate-500">
              Execute a task across all {machines.length} machines at once
            </span>
          </div>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-4">
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-mono text-slate-400 mb-1.5">SELECT TASK</label>
                  <select
                    value={selectedTask}
                    onChange={e => setSelectedTask(e.target.value)}
                    disabled={running}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-amber-500/50 disabled:opacity-50"
                  >
                    <option value="">Choose a maintenance task...</option>
                    {categories.map(cat => (
                      <optgroup key={cat} label={cat}>
                        {tasks.filter(t => t.category === cat).map(t => (
                          <option key={t.id} value={t.id}>
                            {t.label} [{t.risk}]
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
                <button
                  onClick={handleRunAll}
                  disabled={!selectedTask || running}
                  className="flex items-center gap-2 px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-mono font-semibold rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                >
                  {running ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> RUNNING...</>
                  ) : (
                    <><Zap className="w-4 h-4" /> RUN ON ALL ({machines.length})</>
                  )}
                </button>
              </div>

              {selectedTask && !running && !response && (
                <div className="flex items-start gap-2 p-3 rounded bg-amber-500/10 border border-amber-500/20">
                  <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-300">
                    This will run <strong>{tasks.find(t => t.id === selectedTask)?.label}</strong> on
                    all {machines.length} registered machines in parallel (5 at a time). Compatible machines
                    will be filtered by OS automatically.
                  </p>
                </div>
              )}

              {running && progress && (
                <div className="flex items-center gap-3 p-3 rounded bg-slate-800/50 border border-slate-700">
                  <Loader2 className="w-4 h-4 text-amber-400 animate-spin shrink-0" />
                  <span className="text-xs font-mono text-slate-300">{progress}</span>
                </div>
              )}

              {response && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 p-3 rounded bg-slate-800/50 border border-slate-700 flex-1">
                      <div className="text-center">
                        <div className="text-lg font-mono font-bold text-green-400">{response.summary.completed}</div>
                        <div className="text-[10px] text-slate-500 uppercase">Completed</div>
                      </div>
                      {response.summary.partial > 0 && (
                        <div className="text-center">
                          <div className="text-lg font-mono font-bold text-yellow-400">{response.summary.partial}</div>
                          <div className="text-[10px] text-slate-500 uppercase">Partial</div>
                        </div>
                      )}
                      {response.summary.errors > 0 && (
                        <div className="text-center">
                          <div className="text-lg font-mono font-bold text-red-400">{response.summary.errors}</div>
                          <div className="text-[10px] text-slate-500 uppercase">Errors</div>
                        </div>
                      )}
                      {response.summary.skipped > 0 && (
                        <div className="text-center">
                          <div className="text-lg font-mono font-bold text-slate-400">{response.summary.skipped}</div>
                          <div className="text-[10px] text-slate-500 uppercase">Skipped</div>
                        </div>
                      )}
                      <div className="text-center ml-auto">
                        <div className="text-lg font-mono font-bold text-slate-300">{response.totalMachines}</div>
                        <div className="text-[10px] text-slate-500 uppercase">Total</div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button onClick={expandAll}
                      className="px-2 py-1 text-[10px] font-mono text-amber-400 border border-amber-500/30 rounded hover:bg-amber-500/10 transition-colors">
                      {expandedResults.size === response.results.length ? "COLLAPSE ALL" : "EXPAND ALL"}
                    </button>
                    <button onClick={handleCopyAll}
                      className="flex items-center gap-1 px-2 py-1 text-[10px] font-mono text-emerald-400 border border-emerald-500/30 rounded hover:bg-emerald-500/10 transition-colors">
                      {copied === -1 ? <><Check className="w-3 h-3" /> COPIED ALL</> : <><ClipboardCopy className="w-3 h-3" /> COPY ALL OUTPUT</>}
                    </button>
                  </div>

                  <div className="space-y-1.5 max-h-[500px] overflow-y-auto scrollbar-thin">
                    {response.results.map((r, idx) => (
                      <div key={idx} className="border border-slate-700/50 rounded-lg bg-slate-900/40 overflow-hidden">
                        <button
                          onClick={() => toggleExpand(idx)}
                          className="w-full flex items-center gap-3 p-2.5 text-left hover:bg-slate-800/50 transition-colors"
                        >
                          {statusIcon(r.status)}
                          <span className="text-xs font-mono font-semibold text-slate-200 flex-1 truncate">{r.machineName}</span>
                          <span className="text-[11px] font-mono text-cyan-400 shrink-0">{r.hostname}</span>
                          <span className={`text-[10px] font-mono ${statusColor(r.status)}`}>{r.status}</span>
                          {expandedResults.has(idx) ? <ChevronUp className="w-3 h-3 text-slate-500" /> : <ChevronDown className="w-3 h-3 text-slate-500" />}
                        </button>
                        <AnimatePresence>
                          {expandedResults.has(idx) && (
                            <motion.div
                              initial={{ height: 0 }}
                              animate={{ height: "auto" }}
                              exit={{ height: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="border-t border-slate-700/30">
                                <div className="flex justify-end p-1.5">
                                  <button onClick={() => handleCopy(idx, r.output)}
                                    className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono text-emerald-400 border border-emerald-500/30 rounded hover:bg-emerald-500/10 transition-colors">
                                    {copied === idx ? <><Check className="w-2.5 h-2.5" /> COPIED</> : <><ClipboardCopy className="w-2.5 h-2.5" /> COPY</>}
                                  </button>
                                </div>
                                <pre className="px-3 pb-3 text-[11px] text-slate-300 font-mono whitespace-pre-wrap max-h-48 overflow-y-auto">
                                  {r.output || "No output"}
                                </pre>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function RemoteMaintenance() {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [tasks, setTasks] = useState<MaintenanceTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [machinesRes, tasksRes] = await Promise.all([
        fetch(`${API_BASE}/api/remote-machines`).then(r => r.json()),
        fetch(`${API_BASE}/api/remote-maintenance/tasks`).then(r => r.json()),
      ]);
      setMachines(machinesRes.machines || []);
      setTasks(tasksRes.tasks || []);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleDelete = async (id: number) => {
    await fetch(`${API_BASE}/api/remote-machines/${id}`, { method: "DELETE" });
    loadData();
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <PageHeader
        title="Remote System Maintenance"
        subtitle="SSH into your machines over Tailscale to clean, optimize, and audit"
      />

      <WhyThisMatters>
        This tool connects to your registered machines via SSH over your Tailscale VPN and runs
        maintenance tasks — clearing temp files, flushing caches, checking for updates, auditing
        security settings, and analyzing performance. All SSH credentials are encrypted with
        AES-256-GCM. Commands run on the remote machine and results stream back here.
      </WhyThisMatters>

      <TailscaleDiscovery onImported={loadData} />

      {!loading && machines.length > 0 && <RunAllPanel machines={machines} tasks={tasks} />}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm font-mono text-slate-400">
            {machines.length} machine{machines.length !== 1 ? "s" : ""} registered
          </span>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-mono font-semibold rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" /> ADD MACHINE
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
        </div>
      ) : machines.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-16 space-y-4">
          <Server className="w-16 h-16 text-slate-700" />
          <div className="text-center space-y-2">
            <h3 className="text-lg font-mono font-semibold text-slate-400">No Machines Registered</h3>
            <p className="text-sm text-slate-500 max-w-md">
              Add your machines to start running remote maintenance tasks. Use your Tailscale IP
              addresses for secure, encrypted connections through your mesh VPN.
            </p>
          </div>
          <button onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-mono text-sm font-semibold rounded-lg transition-colors">
            <Plus className="w-4 h-4" /> REGISTER FIRST MACHINE
          </button>
        </motion.div>
      ) : (
        <div className="space-y-4">
          {machines.map(m => (
            <MachineCard key={m.id} machine={m} tasks={tasks} onDelete={handleDelete} onTest={() => loadData()} />
          ))}
        </div>
      )}

      {showAdd && <AddMachineModal onClose={() => setShowAdd(false)} onAdded={loadData} />}
    </div>
  );
}
