import { useState, useEffect, useCallback } from "react";
import { authFetch } from "@/lib/auth";
import { API_BASE } from "@/lib/constants";
import {
  Stethoscope, RefreshCw, Server, Cpu, HardDrive, MemoryStick, Network,
  Activity, Loader2, AlertTriangle, CheckCircle, XCircle, ChevronDown,
  ChevronRight, Zap, Play, Clock, Terminal, Gauge,
} from "lucide-react";
import { clsx } from "clsx";

interface Machine {
  id: number;
  name: string;
  hostname: string;
  port: number;
  os: string | null;
  active: boolean;
}

interface CheckResult {
  id: string;
  label: string;
  category: string;
  status: "healthy" | "warning" | "critical";
  value: string;
  detail: string;
  metric?: number;
}

interface ScanResult {
  machineId: number;
  machineName: string;
  hostname: string;
  scanTime: string;
  elapsed: number;
  overallHealth: string;
  score: number;
  summary: { critical: number; warning: number; healthy: number; total: number };
  checks: Record<string, CheckResult>;
}

interface OptAction {
  id: string;
  label: string;
  description: string;
  category: string;
  risk: "low" | "medium" | "high";
}

const STATUS_CONFIG = {
  healthy: { icon: CheckCircle, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/30", label: "Healthy" },
  warning: { icon: AlertTriangle, color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/30", label: "Warning" },
  critical: { icon: XCircle, color: "text-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/30", label: "Critical" },
};

const CATEGORY_ICONS: Record<string, typeof Cpu> = {
  Compute: Cpu,
  Storage: HardDrive,
  Processes: Activity,
  Network: Network,
  System: Server,
  Memory: MemoryStick,
  Disk: HardDrive,
  Services: Zap,
};

function HealthGauge({ score, health }: { score: number; health: string }) {
  const cfg = STATUS_CONFIG[health as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.healthy;
  return (
    <div className="flex flex-col items-center">
      <div className={clsx("relative w-32 h-32 rounded-full border-4 flex items-center justify-center", cfg.border, cfg.bg)}>
        <div className="text-center">
          <div className={clsx("text-3xl font-bold", cfg.color)}>{score}</div>
          <div className="text-xs text-gray-400">/100</div>
        </div>
        <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 128 128">
          <circle cx="64" cy="64" r="58" fill="none" stroke="currentColor" strokeWidth="4" className="text-gray-800" />
          <circle
            cx="64" cy="64" r="58" fill="none" stroke="currentColor" strokeWidth="4"
            className={cfg.color}
            strokeDasharray={`${(score / 100) * 364} 364`}
            strokeLinecap="round"
          />
        </svg>
      </div>
      <span className={clsx("mt-2 text-sm font-medium", cfg.color)}>{cfg.label}</span>
    </div>
  );
}

export default function NodeDiagnostics() {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [selectedMachine, setSelectedMachine] = useState<number | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [actions, setActions] = useState<OptAction[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [runningAction, setRunningAction] = useState<string | null>(null);
  const [actionOutput, setActionOutput] = useState<Record<string, string>>({});
  const [error, setError] = useState("");

  const loadMachines = useCallback(async () => {
    try {
      const res = await authFetch(`${API_BASE}/api/remote-machines`);
      const data = await res.json();
      setMachines(data.machines || []);
      if (data.machines?.length > 0 && !selectedMachine) {
        setSelectedMachine(data.machines[0].id);
      }
    } catch (err: any) {
      setError(err.message);
    }
  }, [selectedMachine]);

  const loadActions = useCallback(async () => {
    try {
      const res = await authFetch(`${API_BASE}/api/node-diagnostics/actions`);
      const data = await res.json();
      setActions(data.actions || []);
    } catch {}
  }, []);

  useEffect(() => {
    loadMachines();
    loadActions();
  }, [loadMachines, loadActions]);

  const runScan = async () => {
    if (!selectedMachine) return;
    setScanning(true);
    setError("");
    setScanResult(null);
    setActionOutput({});
    try {
      const res = await authFetch(`${API_BASE}/api/node-diagnostics/${selectedMachine}/scan`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Scan failed");
      setScanResult(data);
      const cats = new Set<string>();
      Object.values(data.checks).forEach((c: any) => {
        if (c.status !== "healthy") cats.add(c.category);
      });
      setExpandedCategories(cats.size > 0 ? cats : new Set(["Compute"]));
    } catch (err: any) {
      setError(err.message);
    }
    setScanning(false);
  };

  const runOptimization = async (actionId: string) => {
    if (!selectedMachine) return;
    setRunningAction(actionId);
    try {
      const res = await authFetch(`${API_BASE}/api/node-diagnostics/${selectedMachine}/optimize/${actionId}`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Action failed");
      setActionOutput(prev => ({ ...prev, [actionId]: data.output }));
    } catch (err: any) {
      setActionOutput(prev => ({ ...prev, [actionId]: `Error: ${err.message}` }));
    }
    setRunningAction(null);
  };

  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat); else next.add(cat);
      return next;
    });
  };

  const groupedChecks = scanResult
    ? Object.values(scanResult.checks).reduce((acc, check) => {
        if (!acc[check.category]) acc[check.category] = [];
        acc[check.category].push(check);
        return acc;
      }, {} as Record<string, CheckResult[]>)
    : {};

  const groupedActions = actions.reduce((acc, action) => {
    if (!acc[action.category]) acc[action.category] = [];
    acc[action.category].push(action);
    return acc;
  }, {} as Record<string, OptAction[]>);

  const selected = machines.find(m => m.id === selectedMachine);

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-teal-500/10 border border-teal-500/30">
              <Stethoscope className="w-6 h-6 text-teal-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Node Diagnostics</h1>
              <p className="text-gray-400 text-sm">Comprehensive system health analysis and optimization</p>
            </div>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            {error}
            <button onClick={() => setError("")} className="ml-auto text-red-400/60 hover:text-red-400">dismiss</button>
          </div>
        )}

        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex-1 w-full">
              <label className="block text-xs text-gray-500 mb-1">Target Machine</label>
              <select
                value={selectedMachine || ""}
                onChange={(e) => { setSelectedMachine(Number(e.target.value)); setScanResult(null); setActionOutput({}); }}
                className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-teal-500/50"
              >
                {machines.length === 0 && <option value="">No machines registered</option>}
                {machines.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.hostname}{m.os ? ` — ${m.os}` : ""})
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={runScan}
              disabled={scanning || !selectedMachine}
              className="flex items-center gap-2 bg-teal-600 hover:bg-teal-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-medium px-5 py-2 rounded-lg transition-all shadow-[0_0_15px_rgba(20,184,166,0.3)] hover:shadow-[0_0_25px_rgba(20,184,166,0.5)] disabled:shadow-none text-sm"
            >
              {scanning ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Scanning...
                </>
              ) : (
                <>
                  <Gauge className="w-4 h-4" />
                  Run Full Diagnostic
                </>
              )}
            </button>
          </div>
          {machines.length === 0 && (
            <p className="mt-3 text-gray-500 text-sm">
              No machines registered yet. Add machines in Remote Maintenance first, then come back here to run diagnostics.
            </p>
          )}
        </div>

        {scanning && (
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-8 flex flex-col items-center justify-center gap-4">
            <Loader2 className="w-10 h-10 text-teal-400 animate-spin" />
            <div className="text-center">
              <p className="text-white font-medium">Running diagnostics on {selected?.name}...</p>
              <p className="text-gray-400 text-sm mt-1">Checking CPU, memory, disk, processes, network, and more</p>
            </div>
          </div>
        )}

        {scanResult && !scanning && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-1 bg-gray-900/50 border border-gray-800 rounded-xl p-5 flex flex-col items-center justify-center">
                <HealthGauge score={scanResult.score} health={scanResult.overallHealth} />
                <div className="mt-3 text-center">
                  <p className="text-white font-medium text-sm">{scanResult.machineName}</p>
                  <p className="text-gray-500 text-xs">{scanResult.hostname}</p>
                </div>
              </div>

              <div className="md:col-span-3 grid grid-cols-3 gap-4">
                {(["critical", "warning", "healthy"] as const).map(status => {
                  const cfg = STATUS_CONFIG[status];
                  const Icon = cfg.icon;
                  const count = scanResult.summary[status];
                  return (
                    <div key={status} className={clsx("rounded-xl border p-4", cfg.bg, cfg.border)}>
                      <div className="flex items-center gap-2 mb-2">
                        <Icon className={clsx("w-5 h-5", cfg.color)} />
                        <span className={clsx("text-sm font-medium", cfg.color)}>{cfg.label}</span>
                      </div>
                      <p className={clsx("text-3xl font-bold", cfg.color)}>{count}</p>
                      <p className="text-gray-500 text-xs">checks</p>
                    </div>
                  );
                })}

                <div className="col-span-3 bg-gray-900/30 border border-gray-800 rounded-xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4 text-sm text-gray-400">
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      Scanned {new Date(scanResult.scanTime).toLocaleString()}
                    </span>
                    <span className="flex items-center gap-1">
                      <Zap className="w-4 h-4" />
                      {scanResult.elapsed}ms
                    </span>
                    <span className="flex items-center gap-1">
                      <Activity className="w-4 h-4" />
                      {scanResult.summary.total} checks
                    </span>
                  </div>
                  <button
                    onClick={runScan}
                    disabled={scanning}
                    className="text-teal-400 hover:text-teal-300 text-sm flex items-center gap-1"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Re-scan
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-3">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Terminal className="w-5 h-5 text-teal-400" />
                  Diagnostic Results
                </h2>
                {Object.entries(groupedChecks).map(([category, checks]) => {
                  const CatIcon = CATEGORY_ICONS[category] || Activity;
                  const expanded = expandedCategories.has(category);
                  const hasIssues = checks.some(c => c.status !== "healthy");
                  return (
                    <div key={category} className="bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden">
                      <button
                        onClick={() => toggleCategory(category)}
                        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-800/30 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <CatIcon className="w-4 h-4 text-gray-400" />
                          <span className="text-white font-medium text-sm">{category}</span>
                          <span className="text-gray-500 text-xs">({checks.length} checks)</span>
                          {hasIssues && (
                            <span className="ml-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/30">
                              ISSUES
                            </span>
                          )}
                        </div>
                        {expanded ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-500" />}
                      </button>
                      {expanded && (
                        <div className="border-t border-gray-800 divide-y divide-gray-800/50">
                          {checks.map(check => {
                            const cfg = STATUS_CONFIG[check.status];
                            const StatusIcon = cfg.icon;
                            return (
                              <div key={check.id} className="px-4 py-3">
                                <div className="flex items-center justify-between mb-1">
                                  <div className="flex items-center gap-2">
                                    <StatusIcon className={clsx("w-4 h-4", cfg.color)} />
                                    <span className="text-white text-sm font-medium">{check.label}</span>
                                  </div>
                                  <span className={clsx("text-sm font-mono font-semibold", cfg.color)}>{check.value}</span>
                                </div>
                                <pre className="text-xs text-gray-500 mt-1 whitespace-pre-wrap font-mono leading-relaxed max-h-32 overflow-y-auto">
                                  {check.detail}
                                </pre>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="space-y-3">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Zap className="w-5 h-5 text-teal-400" />
                  Optimization Actions
                </h2>
                {Object.entries(groupedActions).map(([category, catActions]) => (
                  <div key={category} className="bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden">
                    <div className="px-4 py-2 border-b border-gray-800">
                      <span className="text-xs text-gray-400 uppercase tracking-wider">{category}</span>
                    </div>
                    <div className="divide-y divide-gray-800/50">
                      {catActions.map(action => (
                        <div key={action.id} className="px-4 py-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-white text-sm font-medium">{action.label}</p>
                              <p className="text-gray-500 text-xs mt-0.5">{action.description}</p>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span className={clsx(
                                "text-[10px] px-1.5 py-0.5 rounded border",
                                action.risk === "low" ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/30" :
                                action.risk === "medium" ? "text-amber-400 bg-amber-500/10 border-amber-500/30" :
                                "text-rose-400 bg-rose-500/10 border-rose-500/30"
                              )}>
                                {action.risk}
                              </span>
                              <button
                                onClick={() => runOptimization(action.id)}
                                disabled={runningAction === action.id}
                                className="p-1.5 rounded-lg bg-teal-600/20 hover:bg-teal-600/30 text-teal-400 border border-teal-600/30 hover:border-teal-500/50 disabled:opacity-50 transition-all"
                                title={`Run ${action.label}`}
                              >
                                {runningAction === action.id ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Play className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          </div>
                          {actionOutput[action.id] && (
                            <pre className="mt-2 text-xs text-teal-300/80 bg-gray-950 border border-gray-800 rounded-lg p-2 font-mono whitespace-pre-wrap max-h-32 overflow-y-auto">
                              {actionOutput[action.id]}
                            </pre>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                {actions.length === 0 && (
                  <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 text-center text-gray-500 text-sm">
                    Loading optimization actions...
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {!scanResult && !scanning && (
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-12 flex flex-col items-center justify-center gap-4">
            <div className="p-4 rounded-2xl bg-teal-500/10 border border-teal-500/20">
              <Stethoscope className="w-12 h-12 text-teal-400/60" />
            </div>
            <div className="text-center max-w-md">
              <h3 className="text-white font-medium text-lg">Ready to Diagnose</h3>
              <p className="text-gray-400 text-sm mt-2">
                Select a machine and run a full diagnostic scan to analyze CPU usage, memory, disk space, 
                processes, network connections, and more. Then use optimization actions to fix issues.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
