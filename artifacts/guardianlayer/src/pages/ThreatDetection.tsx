import { useState, useEffect, useCallback } from "react";
import {
  Shield, AlertTriangle, Crosshair, Lock, Globe, Activity, RefreshCw,
  Search, Ban, CheckCircle, Clock, Eye, Zap, Wifi, WifiOff,
  ChevronDown, ChevronUp, ExternalLink,
} from "lucide-react";

import { API_BASE } from "@/lib/constants";

interface AnomalySummary {
  totalAnomalies: number;
  criticalAnomalies: number;
  activeAnomalies: number;
  investigatingAnomalies: number;
  mitigatedAnomalies: number;
  avgRiskScore: number;
  typeBreakdown: Record<string, number>;
}

interface Anomaly {
  id: string;
  type: string;
  severity: "critical" | "high" | "medium" | "low";
  title: string;
  description: string;
  aiAnalysis: string;
  recommendedActions: string[];
  source: string;
  sourceIp?: string;
  detectedAt: string;
  status: "active" | "investigating" | "mitigated";
  riskScore: number;
  metadata?: Record<string, any>;
}

interface ThreatCorrelation {
  id: string;
  severity: "critical" | "high" | "medium";
  title: string;
  description: string;
  relatedAnomalies: string[];
  attackPattern: string;
  detectedAt: string;
  recommendation: string;
}

interface LockedIP {
  ip: string;
  lockedAt: number;
  attempts: number;
  reason: string;
  remainingMs: number;
}

interface IPReputation {
  ip: string;
  score: number;
  category: string;
  checkedAt: number;
}

interface OverviewData {
  anomalySummary: AnomalySummary;
  threatCorrelations: ThreatCorrelation[];
  totalCorrelations: number;
  loginSecurity: {
    lockedOutIPs: LockedIP[];
    totalLockedOut: number;
    lockoutDurationMinutes: number;
    lockoutThreshold: number;
  };
  ipReputation: {
    checkedIPs: number;
    maliciousIPs: number;
    suspiciousIPs: number;
    cleanIPs: number;
    recentChecks: IPReputation[];
  };
  networkStats: {
    tracked: number;
    blocked: number;
    manualBlocked: number;
    blockedIPs: number;
  };
}

type Tab = "overview" | "anomalies" | "correlations" | "lockouts" | "reputation";

function severityColor(sev: string) {
  switch (sev) {
    case "critical": return "text-red-400 bg-red-500/20 border-red-500/30";
    case "high": return "text-orange-400 bg-orange-500/20 border-orange-500/30";
    case "medium": return "text-yellow-400 bg-yellow-500/20 border-yellow-500/30";
    case "low": return "text-blue-400 bg-blue-500/20 border-blue-500/30";
    default: return "text-gray-400 bg-gray-500/20 border-gray-500/30";
  }
}

function severityBadge(sev: string) {
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase border ${severityColor(sev)}`}>
      {sev}
    </span>
  );
}

function statusBadge(status: string) {
  const colors: Record<string, string> = {
    active: "text-red-400 bg-red-500/20",
    investigating: "text-yellow-400 bg-yellow-500/20",
    mitigated: "text-green-400 bg-green-500/20",
  };
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[status] || "text-gray-400 bg-gray-500/20"}`}>
      {status}
    </span>
  );
}

function reputationColor(score: number) {
  if (score >= 75) return "text-red-400";
  if (score >= 50) return "text-orange-400";
  if (score >= 25) return "text-yellow-400";
  return "text-green-400";
}

function StatCard({ icon: Icon, label, value, sub, color }: { icon: any; label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div className="bg-[#0a0a1a]/80 border border-cyan-900/30 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-4 h-4 ${color}`} />
        <span className="text-xs text-gray-400 uppercase tracking-wider">{label}</span>
      </div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      {sub && <div className="text-xs text-gray-500 mt-1">{sub}</div>}
    </div>
  );
}

function OverviewTab({ data, onRefresh, loading }: { data: OverviewData | null; onRefresh: () => void; loading: boolean }) {
  if (!data) return <div className="text-center text-gray-500 py-12">Loading...</div>;

  const { anomalySummary: s, threatCorrelations: corrs, loginSecurity: ls, ipReputation: rep, networkStats: ns } = data;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Threat Overview</h3>
        <button onClick={onRefresh} disabled={loading} className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-600/20 text-cyan-400 rounded text-sm hover:bg-cyan-600/30 disabled:opacity-50">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <StatCard icon={AlertTriangle} label="Active Threats" value={s.activeAnomalies} color="text-red-400" />
        <StatCard icon={Crosshair} label="Critical" value={s.criticalAnomalies} color="text-red-400" />
        <StatCard icon={Eye} label="Investigating" value={s.investigatingAnomalies} color="text-yellow-400" />
        <StatCard icon={CheckCircle} label="Mitigated" value={s.mitigatedAnomalies} color="text-green-400" />
        <StatCard icon={Lock} label="IPs Locked Out" value={ls.totalLockedOut} sub={`After ${ls.lockoutThreshold} failed logins`} color="text-orange-400" />
        <StatCard icon={Globe} label="Bad IPs Found" value={rep.maliciousIPs} sub={`${rep.checkedIPs} checked`} color="text-red-400" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-[#0a0a1a]/80 border border-cyan-900/30 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-cyan-400 mb-3 flex items-center gap-2">
            <Activity className="w-4 h-4" /> Detection Breakdown
          </h4>
          <div className="space-y-2">
            {Object.entries(s.typeBreakdown).map(([type, count]) => (
              <div key={type} className="flex items-center justify-between text-sm">
                <span className="text-gray-300">{type.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</span>
                <span className="text-cyan-400 font-mono">{count}</span>
              </div>
            ))}
            {Object.keys(s.typeBreakdown).length === 0 && (
              <div className="text-gray-500 text-sm">No detections yet — system is monitoring</div>
            )}
          </div>
        </div>

        <div className="bg-[#0a0a1a]/80 border border-cyan-900/30 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-cyan-400 mb-3 flex items-center gap-2">
            <Wifi className="w-4 h-4" /> Network Status
          </h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-300">IPs Tracked</span>
              <span className="text-cyan-400 font-mono">{ns.tracked}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-300">Auto-Blocked</span>
              <span className="text-orange-400 font-mono">{ns.blocked}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-300">Manual Blocks</span>
              <span className="text-red-400 font-mono">{ns.manualBlocked}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-300">Avg Risk Score</span>
              <span className={`font-mono ${s.avgRiskScore >= 70 ? "text-red-400" : s.avgRiskScore >= 40 ? "text-yellow-400" : "text-green-400"}`}>
                {s.avgRiskScore}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {corrs.length > 0 && (
        <div className="bg-red-950/30 border border-red-500/30 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-red-400 mb-3 flex items-center gap-2">
            <Crosshair className="w-4 h-4" /> Active Threat Correlations
          </h4>
          <div className="space-y-3">
            {corrs.slice(0, 3).map(c => (
              <div key={c.id} className="bg-[#0a0a1a]/50 border border-red-500/20 rounded p-3">
                <div className="flex items-center gap-2 mb-1">
                  {severityBadge(c.severity)}
                  <span className="text-white text-sm font-medium">{c.title}</span>
                </div>
                <p className="text-gray-400 text-xs mt-1">{c.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function AnomaliesTab() {
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [filter, setFilter] = useState<{ severity?: string; status?: string }>({});
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filter.severity) params.set("severity", filter.severity);
      if (filter.status) params.set("status", filter.status);
      const r = await fetch(`${API_BASE}/api/threat-detection/anomalies?${params}`);
      if (!r.ok) throw new Error(`Server error (${r.status})`);
      const data = await r.json();
      setAnomalies(data.anomalies || []);
    } catch (err: any) {
      setError(err.message || "Failed to load anomalies");
    }
    setLoading(false);
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const updateStatus = async (id: string, status: string) => {
    await fetch(`${API_BASE}/api/threat-detection/anomalies/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <select
          value={filter.severity || ""}
          onChange={e => setFilter(f => ({ ...f, severity: e.target.value || undefined }))}
          className="bg-[#0a0a1a] border border-cyan-900/30 rounded px-3 py-1.5 text-sm text-gray-300"
        >
          <option value="">All Severities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <select
          value={filter.status || ""}
          onChange={e => setFilter(f => ({ ...f, status: e.target.value || undefined }))}
          className="bg-[#0a0a1a] border border-cyan-900/30 rounded px-3 py-1.5 text-sm text-gray-300"
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="investigating">Investigating</option>
          <option value="mitigated">Mitigated</option>
        </select>
        <button onClick={load} className="flex items-center gap-1 px-3 py-1.5 bg-cyan-600/20 text-cyan-400 rounded text-sm hover:bg-cyan-600/30">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
        </button>
        <span className="text-xs text-gray-500 ml-auto">{anomalies.length} anomalies</span>
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-lg p-3 text-sm text-rose-400">{error}</div>
      )}

      {anomalies.length === 0 ? (
        <div className="text-center py-12">
          <Shield className="w-12 h-12 text-green-500/30 mx-auto mb-3" />
          <p className="text-gray-400">No anomalies detected — all systems normal</p>
        </div>
      ) : (
        <div className="space-y-2">
          {anomalies.map(a => (
            <div key={a.id} className={`bg-[#0a0a1a]/80 border rounded-lg overflow-hidden ${a.severity === "critical" ? "border-red-500/40" : "border-cyan-900/30"}`}>
              <div
                className="flex items-center gap-3 p-3 cursor-pointer hover:bg-white/5"
                onClick={() => setExpanded(expanded === a.id ? null : a.id)}
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {severityBadge(a.severity)}
                  <span className="text-white text-sm font-medium truncate">{a.title}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {statusBadge(a.status)}
                  <span className="text-xs text-gray-500 font-mono">{a.id}</span>
                  <span className="text-xs text-gray-500">{new Date(a.detectedAt).toLocaleTimeString()}</span>
                  {expanded === a.id ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                </div>
              </div>

              {expanded === a.id && (
                <div className="border-t border-cyan-900/20 p-4 space-y-3">
                  <p className="text-gray-300 text-sm">{a.description}</p>

                  <div className="bg-[#050510] border border-cyan-900/20 rounded p-3">
                    <h5 className="text-xs text-cyan-400 font-semibold mb-1 uppercase">AI Analysis</h5>
                    <p className="text-gray-400 text-xs leading-relaxed">{a.aiAnalysis}</p>
                  </div>

                  <div>
                    <h5 className="text-xs text-cyan-400 font-semibold mb-1.5 uppercase">Recommended Actions</h5>
                    <ul className="space-y-1">
                      {a.recommendedActions.map((action, i) => (
                        <li key={i} className="text-gray-400 text-xs flex items-start gap-1.5">
                          <Zap className="w-3 h-3 text-cyan-500 mt-0.5 shrink-0" />
                          {action}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-cyan-900/20">
                    <span className="text-xs text-gray-500">Risk: <span className={`font-bold ${a.riskScore >= 80 ? "text-red-400" : a.riskScore >= 50 ? "text-yellow-400" : "text-green-400"}`}>{a.riskScore}%</span></span>
                    {a.sourceIp && <span className="text-xs text-gray-500">IP: <span className="text-gray-300 font-mono">{a.sourceIp}</span></span>}
                    <div className="ml-auto flex gap-1.5">
                      {a.status !== "investigating" && (
                        <button onClick={() => updateStatus(a.id, "investigating")} className="px-2 py-1 bg-yellow-600/20 text-yellow-400 rounded text-xs hover:bg-yellow-600/30">
                          Investigate
                        </button>
                      )}
                      {a.status !== "mitigated" && (
                        <button onClick={() => updateStatus(a.id, "mitigated")} className="px-2 py-1 bg-green-600/20 text-green-400 rounded text-xs hover:bg-green-600/30">
                          Mark Mitigated
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CorrelationsTab() {
  const [correlations, setCorrelations] = useState<ThreatCorrelation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`${API_BASE}/api/threat-detection/correlations`);
      if (!r.ok) throw new Error(`Server error (${r.status})`);
      const data = await r.json();
      setCorrelations(data.correlations || []);
    } catch (err: any) {
      setError(err.message || "Failed to load correlations");
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const runCorrelation = async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`${API_BASE}/api/threat-detection/correlate-now`, { method: "POST" });
      if (!r.ok) throw new Error(`Server error (${r.status})`);
      const data = await r.json();
      setCorrelations(data.correlations || []);
    } catch (err: any) {
      setError(err.message || "Failed to run correlation");
    }
    setLoading(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-400">
          Correlations link related anomalies to identify coordinated attacks, multi-stage intrusions, and advanced persistent threats.
        </p>
        <button onClick={runCorrelation} disabled={loading} className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-600/20 text-cyan-400 rounded text-sm hover:bg-cyan-600/30 shrink-0 disabled:opacity-50">
          <Crosshair className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Run Analysis
        </button>
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-lg p-3 text-sm text-rose-400">{error}</div>
      )}

      {correlations.length === 0 ? (
        <div className="text-center py-12">
          <Crosshair className="w-12 h-12 text-cyan-500/20 mx-auto mb-3" />
          <p className="text-gray-400">No threat correlations detected</p>
          <p className="text-gray-500 text-sm mt-1">The engine links related anomalies automatically every 2 minutes</p>
        </div>
      ) : (
        <div className="space-y-3">
          {correlations.map(c => (
            <div key={c.id} className={`border rounded-lg p-4 ${c.severity === "critical" ? "bg-red-950/30 border-red-500/30" : "bg-[#0a0a1a]/80 border-orange-500/30"}`}>
              <div className="flex items-center gap-2 mb-2">
                {severityBadge(c.severity)}
                <span className="text-white font-medium text-sm">{c.title}</span>
                <span className="ml-auto text-xs text-gray-500">{c.id}</span>
              </div>
              <p className="text-gray-300 text-sm mb-3">{c.description}</p>

              <div className="bg-[#050510] border border-cyan-900/20 rounded p-3 mb-3">
                <h5 className="text-xs text-cyan-400 font-semibold mb-1 uppercase">Recommendation</h5>
                <p className="text-gray-400 text-xs leading-relaxed">{c.recommendation}</p>
              </div>

              <div className="flex items-center gap-3 text-xs text-gray-500">
                <span>Pattern: <span className="text-cyan-400">{c.attackPattern.replace(/_/g, " ")}</span></span>
                <span>Related: <span className="text-gray-300">{c.relatedAnomalies.length} anomalies</span></span>
                <span>{new Date(c.detectedAt).toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function LockoutsTab() {
  const [locked, setLocked] = useState<LockedIP[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`${API_BASE}/api/threat-detection/locked-ips`);
      if (!r.ok) throw new Error(`Server error (${r.status})`);
      const data = await r.json();
      setLocked(data.lockedIPs || []);
    } catch (err: any) {
      setError(err.message || "Failed to load locked IPs");
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); const t = setInterval(load, 30000); return () => clearInterval(t); }, [load]);

  return (
    <div className="space-y-4">
      <div className="bg-[#0a0a1a]/80 border border-cyan-900/30 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-cyan-400 mb-2">How Auto-Lockout Works</h4>
        <ul className="space-y-1 text-xs text-gray-400">
          <li className="flex items-start gap-2"><Ban className="w-3 h-3 text-red-400 mt-0.5 shrink-0" /> After 5 failed login attempts from one IP, it gets automatically blocked</li>
          <li className="flex items-start gap-2"><Clock className="w-3 h-3 text-yellow-400 mt-0.5 shrink-0" /> Lockout lasts 15 minutes, then the IP is released</li>
          <li className="flex items-start gap-2"><Shield className="w-3 h-3 text-cyan-400 mt-0.5 shrink-0" /> If attempts exceed 15, a critical brute force alert triggers</li>
        </ul>
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-lg p-3 text-sm text-rose-400">{error}</div>
      )}

      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-400">{locked.length} IPs currently locked out</span>
        <button onClick={load} className="flex items-center gap-1 px-3 py-1.5 bg-cyan-600/20 text-cyan-400 rounded text-sm hover:bg-cyan-600/30">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {locked.length === 0 ? (
        <div className="text-center py-12">
          <Lock className="w-12 h-12 text-green-500/20 mx-auto mb-3" />
          <p className="text-gray-400">No IPs currently locked out</p>
        </div>
      ) : (
        <div className="space-y-2">
          {locked.map(l => (
            <div key={l.ip} className="bg-[#0a0a1a]/80 border border-orange-500/30 rounded-lg p-3 flex items-center gap-4">
              <Ban className="w-5 h-5 text-red-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="text-white font-mono text-sm">{l.ip}</span>
                <p className="text-gray-400 text-xs">{l.reason}</p>
              </div>
              <div className="text-right shrink-0">
                <div className="text-orange-400 text-sm font-mono">
                  {Math.ceil(l.remainingMs / 60000)} min left
                </div>
                <div className="text-gray-500 text-xs">
                  {l.attempts} attempts
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ReputationTab() {
  const [results, setResults] = useState<IPReputation[]>([]);
  const [checkIp, setCheckIp] = useState("");
  const [checkResult, setCheckResult] = useState<any>(null);
  const [checking, setChecking] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`${API_BASE}/api/threat-detection/ip-reputation`);
      if (!r.ok) throw new Error(`Server error (${r.status})`);
      const data = await r.json();
      setResults(data.results || []);
    } catch (err: any) {
      setError(err.message || "Failed to load IP reputation data");
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const checkReputation = async () => {
    if (!checkIp.trim()) return;
    setChecking(true);
    setCheckResult(null);
    setError(null);
    try {
      const r = await fetch(`${API_BASE}/api/threat-detection/check-ip`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ip: checkIp.trim() }),
      });
      const data = await r.json();
      setCheckResult(data);
      load();
    } catch (err: any) {
      setError(err.message || "Failed to check IP reputation");
    }
    setChecking(false);
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-lg p-3 text-sm text-rose-400">{error}</div>
      )}

      <div className="bg-[#0a0a1a]/80 border border-cyan-900/30 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-cyan-400 mb-3 flex items-center gap-2">
          <Search className="w-4 h-4" /> Check IP Reputation
        </h4>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Enter IP address (e.g., 185.220.101.1)"
            value={checkIp}
            onChange={e => setCheckIp(e.target.value)}
            onKeyDown={e => e.key === "Enter" && checkReputation()}
            className="flex-1 bg-[#050510] border border-cyan-900/30 rounded px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50"
          />
          <button
            onClick={checkReputation}
            disabled={checking || !checkIp.trim()}
            className="px-4 py-2 bg-cyan-600 text-white rounded text-sm font-medium hover:bg-cyan-700 disabled:opacity-50 flex items-center gap-1.5"
          >
            {checking ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
            Check
          </button>
        </div>

        {checkResult && (
          <div className={`mt-3 p-3 rounded border ${checkResult.isKnownBad ? "bg-red-950/30 border-red-500/30" : "bg-green-950/30 border-green-500/30"}`}>
            <div className="flex items-center justify-between">
              <span className="text-white font-mono text-sm">{checkResult.ip}</span>
              <span className={`font-bold text-lg ${reputationColor(checkResult.score)}`}>{checkResult.score}%</span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-xs px-2 py-0.5 rounded ${checkResult.isKnownBad ? "bg-red-500/20 text-red-400" : "bg-green-500/20 text-green-400"}`}>
                {checkResult.category}
              </span>
              {checkResult.message && <span className="text-xs text-gray-500">{checkResult.message}</span>}
            </div>
            {checkResult.score > 0 && (
              <a
                href={`https://www.abuseipdb.com/check/${checkResult.ip}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-cyan-400 hover:underline mt-2 inline-flex items-center gap-1"
              >
                View full report <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-400">{results.length} IPs checked</span>
        <button onClick={load} className="flex items-center gap-1 px-3 py-1.5 bg-cyan-600/20 text-cyan-400 rounded text-sm hover:bg-cyan-600/30">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {results.length === 0 ? (
        <div className="text-center py-12">
          <Globe className="w-12 h-12 text-cyan-500/20 mx-auto mb-3" />
          <p className="text-gray-400">No IP reputation data yet</p>
          <p className="text-gray-500 text-sm mt-1">Check an IP above or the engine will scan active IPs every 10 minutes</p>
        </div>
      ) : (
        <div className="space-y-1">
          {results.map(r => (
            <div key={r.ip} className="bg-[#0a0a1a]/80 border border-cyan-900/30 rounded px-3 py-2 flex items-center gap-3">
              <span className={`w-2 h-2 rounded-full shrink-0 ${r.score >= 75 ? "bg-red-400" : r.score >= 50 ? "bg-orange-400" : r.score >= 25 ? "bg-yellow-400" : "bg-green-400"}`} />
              <span className="text-white font-mono text-sm flex-1">{r.ip}</span>
              <span className={`text-sm font-bold ${reputationColor(r.score)}`}>{r.score}%</span>
              <span className={`text-xs px-2 py-0.5 rounded ${r.category === "malicious" ? "bg-red-500/20 text-red-400" : r.category === "suspicious" ? "bg-orange-500/20 text-orange-400" : r.category === "low_risk" ? "bg-yellow-500/20 text-yellow-400" : "bg-green-500/20 text-green-400"}`}>
                {r.category}
              </span>
              <a href={`https://www.abuseipdb.com/check/${r.ip}`} target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-cyan-400">
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ThreatDetection() {
  const [tab, setTab] = useState<Tab>("overview");
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadOverview = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`${API_BASE}/api/threat-detection/overview`);
      if (!r.ok) throw new Error(`Server error (${r.status})`);
      const data = await r.json();
      setOverview(data);
    } catch (err: any) {
      setError(err.message || "Failed to load overview");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadOverview();
    const t = setInterval(loadOverview, 60000);
    return () => clearInterval(t);
  }, [loadOverview]);

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: "overview", label: "Overview", icon: Activity },
    { id: "anomalies", label: "Anomalies", icon: AlertTriangle },
    { id: "correlations", label: "Threat Correlations", icon: Crosshair },
    { id: "lockouts", label: "Login Lockouts", icon: Lock },
    { id: "reputation", label: "IP Reputation", icon: Globe },
  ];

  return (
    <div className="min-h-screen p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-gradient-to-br from-red-600/20 to-cyan-600/20 rounded-lg border border-cyan-500/20">
          <Shield className="w-6 h-6 text-cyan-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Threat Detection Engine</h1>
          <p className="text-sm text-gray-400">Real-time threat correlation, auto-lockout, network anomaly detection & IP reputation</p>
        </div>
      </div>

      <div className="flex gap-1 bg-[#0a0a1a]/60 border border-cyan-900/30 rounded-lg p-1 overflow-x-auto">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded text-sm font-medium whitespace-nowrap transition-colors ${
              tab === t.id
                ? "bg-cyan-600/20 text-cyan-400 border border-cyan-500/30"
                : "text-gray-400 hover:text-gray-200 hover:bg-white/5 border border-transparent"
            }`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {error && tab === "overview" && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-lg p-3 text-sm text-rose-400">{error}</div>
      )}

      <div>
        {tab === "overview" && <OverviewTab data={overview} onRefresh={loadOverview} loading={loading} />}
        {tab === "anomalies" && <AnomaliesTab />}
        {tab === "correlations" && <CorrelationsTab />}
        {tab === "lockouts" && <LockoutsTab />}
        {tab === "reputation" && <ReputationTab />}
      </div>
    </div>
  );
}
