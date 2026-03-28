import { useState, useCallback } from "react";
import { authFetch } from "@/lib/auth";
import { API_BASE } from "@/lib/constants";
import {
  Activity, RefreshCw, Shield, ShieldAlert, ShieldCheck, ShieldX,
  Loader2, AlertTriangle, CheckCircle, XCircle, Clock, Globe,
  Lock, ExternalLink, ChevronDown, ChevronRight, Gauge, Server,
  Zap, Eye,
} from "lucide-react";
import { clsx } from "clsx";

interface SecurityHeader {
  name: string;
  present: boolean;
  value?: string;
  severity: "critical" | "high" | "medium" | "low";
  description: string;
}

interface VientResult {
  timestamp: string;
  url: string;
  name: string;
  uptime: { status: string; statusCode: number; responseTimeMs: number };
  ssl: { valid: boolean; protocol?: string };
  securityHeaders: SecurityHeader[];
  securityScore: number;
  securityGrade: string;
  contentCheck: { isHtml: boolean; title?: string; hasCSP: boolean; hasSRI: boolean; poweredBy?: string };
  recommendations: string[];
}

const SEVERITY_COLORS = {
  critical: { text: "text-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/30" },
  high: { text: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/30" },
  medium: { text: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/30" },
  low: { text: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/30" },
};

const GRADE_COLORS: Record<string, string> = {
  A: "text-emerald-400", "B+": "text-green-400", B: "text-lime-400",
  "C+": "text-amber-400", C: "text-amber-500", D: "text-orange-500", F: "text-rose-500",
};

function SecurityGauge({ score, grade }: { score: number; grade: string }) {
  const color = GRADE_COLORS[grade] || "text-gray-400";
  const ringColor = score >= 80 ? "text-emerald-400" : score >= 60 ? "text-amber-400" : "text-rose-400";
  return (
    <div className="flex flex-col items-center">
      <div className="relative w-36 h-36">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 140 140">
          <circle cx="70" cy="70" r="62" fill="none" stroke="currentColor" strokeWidth="6" className="text-gray-800" />
          <circle cx="70" cy="70" r="62" fill="none" stroke="currentColor" strokeWidth="6" className={ringColor}
            strokeDasharray={`${(score / 100) * 390} 390`} strokeLinecap="round" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={clsx("text-4xl font-bold", color)}>{grade}</span>
          <span className="text-gray-400 text-sm">{score}/100</span>
        </div>
      </div>
      <span className="mt-2 text-sm font-medium text-gray-400">Security Rating</span>
    </div>
  );
}

export default function VientMonitor() {
  const [result, setResult] = useState<VientResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [headersExpanded, setHeadersExpanded] = useState(true);
  const [recsExpanded, setRecsExpanded] = useState(true);

  const runCheck = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await authFetch(`${API_BASE}/api/vient-monitor/status`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Check failed");
      setResult(data);
    } catch (err: any) {
      setError(err.message);
    }
    setLoading(false);
  }, []);

  const presentHeaders = result?.securityHeaders.filter(h => h.present) || [];
  const missingHeaders = result?.securityHeaders.filter(h => !h.present) || [];

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-violet-500/10 border border-violet-500/30">
              <Eye className="w-6 h-6 text-violet-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">VIENT Workflow Monitor</h1>
              <p className="text-gray-400 text-sm">Security posture and uptime monitoring for VIENT Workflow AI</p>
            </div>
          </div>
          <a
            href="https://ent-workflow-ai.replit.app"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-violet-400 hover:text-violet-300 text-sm transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            Open App
          </a>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            {error}
          </div>
        )}

        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Globe className="w-5 h-5 text-gray-400" />
            <div>
              <p className="text-white font-medium text-sm">https://ent-workflow-ai.replit.app</p>
              <p className="text-gray-500 text-xs">ENT Practice AI - VIENT Workflow Platform</p>
            </div>
          </div>
          <button
            onClick={runCheck}
            disabled={loading}
            className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-medium px-5 py-2 rounded-lg transition-all shadow-[0_0_15px_rgba(139,92,246,0.3)] hover:shadow-[0_0_25px_rgba(139,92,246,0.5)] disabled:shadow-none text-sm"
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Scanning...</>
            ) : (
              <><Gauge className="w-4 h-4" /> Run Security Scan</>
            )}
          </button>
        </div>

        {loading && (
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-10 flex flex-col items-center justify-center gap-4">
            <Loader2 className="w-10 h-10 text-violet-400 animate-spin" />
            <div className="text-center">
              <p className="text-white font-medium">Scanning VIENT Workflow...</p>
              <p className="text-gray-400 text-sm mt-1">Checking uptime, SSL, security headers, and content</p>
            </div>
          </div>
        )}

        {result && !loading && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-5 flex flex-col items-center justify-center">
                <SecurityGauge score={result.securityScore} grade={result.securityGrade} />
              </div>

              <div className="md:col-span-3 grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className={clsx("rounded-xl border p-4",
                  result.uptime.status === "online" ? "bg-emerald-500/10 border-emerald-500/30" :
                  result.uptime.status === "degraded" ? "bg-amber-500/10 border-amber-500/30" :
                  "bg-rose-500/10 border-rose-500/30"
                )}>
                  <div className="flex items-center gap-2 mb-2">
                    <Activity className={clsx("w-4 h-4",
                      result.uptime.status === "online" ? "text-emerald-400" :
                      result.uptime.status === "degraded" ? "text-amber-400" : "text-rose-400"
                    )} />
                    <span className="text-gray-400 text-xs">Status</span>
                  </div>
                  <p className={clsx("text-xl font-bold capitalize",
                    result.uptime.status === "online" ? "text-emerald-400" :
                    result.uptime.status === "degraded" ? "text-amber-400" : "text-rose-400"
                  )}>{result.uptime.status}</p>
                  <p className="text-gray-500 text-xs">HTTP {result.uptime.statusCode}</p>
                </div>

                <div className="rounded-xl border p-4 bg-gray-900/30 border-gray-800">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-400 text-xs">Response</span>
                  </div>
                  <p className={clsx("text-xl font-bold",
                    result.uptime.responseTimeMs < 1000 ? "text-emerald-400" :
                    result.uptime.responseTimeMs < 3000 ? "text-amber-400" : "text-rose-400"
                  )}>{result.uptime.responseTimeMs}ms</p>
                  <p className="text-gray-500 text-xs">latency</p>
                </div>

                <div className={clsx("rounded-xl border p-4",
                  result.ssl.valid ? "bg-emerald-500/10 border-emerald-500/30" : "bg-rose-500/10 border-rose-500/30"
                )}>
                  <div className="flex items-center gap-2 mb-2">
                    <Lock className={clsx("w-4 h-4", result.ssl.valid ? "text-emerald-400" : "text-rose-400")} />
                    <span className="text-gray-400 text-xs">SSL/TLS</span>
                  </div>
                  <p className={clsx("text-xl font-bold", result.ssl.valid ? "text-emerald-400" : "text-rose-400")}>
                    {result.ssl.valid ? "Valid" : "Invalid"}
                  </p>
                  <p className="text-gray-500 text-xs">{result.ssl.protocol || "N/A"}</p>
                </div>

                <div className="rounded-xl border p-4 bg-gray-900/30 border-gray-800">
                  <div className="flex items-center gap-2 mb-2">
                    <Server className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-400 text-xs">Server</span>
                  </div>
                  <p className="text-lg font-bold text-white truncate">{result.contentCheck.poweredBy || "Hidden"}</p>
                  <p className="text-gray-500 text-xs">{result.contentCheck.poweredBy ? "Exposed" : "Secure"}</p>
                </div>

                <div className="col-span-2 md:col-span-4 bg-gray-900/30 border border-gray-800 rounded-xl p-3 flex items-center justify-between">
                  <div className="flex items-center gap-4 text-sm text-gray-400">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {new Date(result.timestamp).toLocaleString()}
                    </span>
                    <span className="flex items-center gap-1">
                      <Shield className="w-3.5 h-3.5" />
                      {presentHeaders.length}/{result.securityHeaders.length} headers
                    </span>
                  </div>
                  <button onClick={runCheck} className="text-violet-400 hover:text-violet-300 text-sm flex items-center gap-1">
                    <RefreshCw className="w-3.5 h-3.5" /> Re-scan
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-3">
                <button
                  onClick={() => setHeadersExpanded(!headersExpanded)}
                  className="w-full flex items-center justify-between"
                >
                  <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-violet-400" />
                    Security Headers ({presentHeaders.length} present, {missingHeaders.length} missing)
                  </h2>
                  {headersExpanded ? <ChevronDown className="w-5 h-5 text-gray-500" /> : <ChevronRight className="w-5 h-5 text-gray-500" />}
                </button>

                {headersExpanded && (
                  <div className="space-y-2">
                    {missingHeaders.length > 0 && (
                      <div className="bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden">
                        <div className="px-4 py-2 border-b border-gray-800 bg-rose-500/5">
                          <span className="text-xs text-rose-400 uppercase tracking-wider font-medium flex items-center gap-1">
                            <XCircle className="w-3 h-3" /> Missing Headers
                          </span>
                        </div>
                        <div className="divide-y divide-gray-800/50">
                          {missingHeaders.map(h => {
                            const sev = SEVERITY_COLORS[h.severity];
                            return (
                              <div key={h.name} className="px-4 py-2.5 flex items-start justify-between gap-2">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <XCircle className="w-3.5 h-3.5 text-rose-400" />
                                    <span className="text-white text-sm font-mono">{h.name}</span>
                                  </div>
                                  <p className="text-gray-500 text-xs mt-0.5 ml-5">{h.description}</p>
                                </div>
                                <span className={clsx("text-[10px] px-1.5 py-0.5 rounded border uppercase", sev.text, sev.bg, sev.border)}>
                                  {h.severity}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {presentHeaders.length > 0 && (
                      <div className="bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden">
                        <div className="px-4 py-2 border-b border-gray-800 bg-emerald-500/5">
                          <span className="text-xs text-emerald-400 uppercase tracking-wider font-medium flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" /> Present Headers
                          </span>
                        </div>
                        <div className="divide-y divide-gray-800/50">
                          {presentHeaders.map(h => (
                            <div key={h.name} className="px-4 py-2.5">
                              <div className="flex items-center gap-2">
                                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                                <span className="text-white text-sm font-mono">{h.name}</span>
                              </div>
                              <p className="text-gray-500 text-xs mt-0.5 ml-5 font-mono truncate">{h.value}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => setRecsExpanded(!recsExpanded)}
                  className="w-full flex items-center justify-between"
                >
                  <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5 text-violet-400" />
                    Recommendations ({result.recommendations.length})
                  </h2>
                  {recsExpanded ? <ChevronDown className="w-5 h-5 text-gray-500" /> : <ChevronRight className="w-5 h-5 text-gray-500" />}
                </button>

                {recsExpanded && (
                  <div className="bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden">
                    {result.recommendations.length === 0 ? (
                      <div className="px-4 py-6 text-center">
                        <ShieldCheck className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                        <p className="text-emerald-400 font-medium">All checks passed</p>
                        <p className="text-gray-500 text-sm">No security recommendations at this time.</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-800/50">
                        {result.recommendations.map((rec, i) => {
                          const isCritical = rec.startsWith("[CRITICAL]");
                          const isHigh = rec.startsWith("[HIGH]");
                          const isMedium = rec.startsWith("[MEDIUM]");
                          const sev = isCritical ? SEVERITY_COLORS.critical : isHigh ? SEVERITY_COLORS.high : isMedium ? SEVERITY_COLORS.medium : SEVERITY_COLORS.low;
                          const Icon = isCritical ? ShieldX : isHigh ? ShieldAlert : AlertTriangle;
                          return (
                            <div key={i} className="px-4 py-3 flex items-start gap-2.5">
                              <Icon className={clsx("w-4 h-4 flex-shrink-0 mt-0.5", sev.text)} />
                              <p className="text-gray-300 text-sm">{rec.replace(/^\[(CRITICAL|HIGH|MEDIUM|LOW)\]\s*/, "")}</p>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {result.contentCheck && (
                  <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 space-y-2">
                    <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Content Analysis</h3>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex items-center justify-between bg-gray-800/30 rounded-lg px-3 py-2">
                        <span className="text-gray-400">Content-Type</span>
                        <span className={result.contentCheck.isHtml ? "text-emerald-400" : "text-amber-400"}>
                          {result.contentCheck.isHtml ? "HTML" : "Other"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between bg-gray-800/30 rounded-lg px-3 py-2">
                        <span className="text-gray-400">CSP</span>
                        <span className={result.contentCheck.hasCSP ? "text-emerald-400" : "text-rose-400"}>
                          {result.contentCheck.hasCSP ? "Present" : "Missing"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between bg-gray-800/30 rounded-lg px-3 py-2">
                        <span className="text-gray-400">SRI</span>
                        <span className={result.contentCheck.hasSRI ? "text-emerald-400" : "text-amber-400"}>
                          {result.contentCheck.hasSRI ? "Present" : "Missing"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between bg-gray-800/30 rounded-lg px-3 py-2">
                        <span className="text-gray-400">Title</span>
                        <span className="text-white truncate max-w-[120px]">{result.contentCheck.title || "N/A"}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {!result && !loading && (
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-12 flex flex-col items-center justify-center gap-4">
            <div className="p-4 rounded-2xl bg-violet-500/10 border border-violet-500/20">
              <Eye className="w-12 h-12 text-violet-400/60" />
            </div>
            <div className="text-center max-w-md">
              <h3 className="text-white font-medium text-lg">Monitor VIENT Workflow</h3>
              <p className="text-gray-400 text-sm mt-2">
                Run a comprehensive security scan to check uptime, SSL certificates, security headers,
                content integrity, and get actionable recommendations to harden the platform.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
