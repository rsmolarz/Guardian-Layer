import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Info,
  Loader2,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Zap,
  Clock,
  Target,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { WhyThisMatters } from "@/components/clarity/WhyThisMatters";

import { API_BASE } from "@/lib/constants";

interface ScanCheck {
  id: string;
  category: string;
  name: string;
  description: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
  status: "pass" | "fail" | "warn" | "error";
  detail: string;
  recommendation?: string;
}

interface ScanResult {
  scanId: string;
  completedAt: string;
  duration: number;
  summary: {
    total: number;
    passed: number;
    failed: number;
    warnings: number;
    errors: number;
    grade: string;
    score: number;
  };
  checks: ScanCheck[];
}

const severityColors: Record<string, string> = {
  critical: "text-red-400",
  high: "text-orange-400",
  medium: "text-yellow-400",
  low: "text-cyan-400",
  info: "text-slate-400",
};

const severityBg: Record<string, string> = {
  critical: "bg-red-500/15 border-red-500/30",
  high: "bg-orange-500/15 border-orange-500/30",
  medium: "bg-yellow-500/15 border-yellow-500/30",
  low: "bg-cyan-500/15 border-cyan-500/30",
  info: "bg-slate-500/15 border-slate-500/30",
};

const statusIcons: Record<string, typeof CheckCircle> = {
  pass: CheckCircle,
  fail: XCircle,
  warn: AlertTriangle,
  error: ShieldX,
};

const statusColors: Record<string, string> = {
  pass: "text-green-400",
  fail: "text-red-400",
  warn: "text-yellow-400",
  error: "text-red-500",
};

const gradeColors: Record<string, string> = {
  A: "text-green-400 border-green-500/50",
  B: "text-cyan-400 border-cyan-500/50",
  C: "text-yellow-400 border-yellow-500/50",
  D: "text-red-400 border-red-500/50",
};

const gradeGlow: Record<string, string> = {
  A: "shadow-green-500/20",
  B: "shadow-cyan-500/20",
  C: "shadow-yellow-500/20",
  D: "shadow-red-500/20",
};

function ScoreRing({ score, grade }: { score: number; grade: string }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;
  const color = grade === "A" ? "#4ade80" : grade === "B" ? "#22d3ee" : grade === "C" ? "#facc15" : "#f87171";

  return (
    <div className="relative w-36 h-36 flex items-center justify-center">
      <svg className="w-36 h-36 -rotate-90" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={radius} fill="none" stroke="#1e293b" strokeWidth="8" />
        <motion.circle
          cx="60" cy="60" r={radius} fill="none"
          stroke={color} strokeWidth="8" strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-3xl font-mono font-bold ${gradeColors[grade]?.split(" ")[0] || "text-white"}`}>
          {grade}
        </span>
        <span className="text-xs text-slate-400 font-mono">{score}/100</span>
      </div>
    </div>
  );
}

function CategorySection({ category, checks }: { category: string; checks: ScanCheck[] }) {
  const [expanded, setExpanded] = useState(true);
  const passed = checks.filter(c => c.status === "pass").length;
  const failed = checks.filter(c => c.status === "fail").length;
  const warned = checks.filter(c => c.status === "warn").length;

  return (
    <div className="border border-slate-700/50 rounded-lg bg-slate-800/30 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-slate-700/20 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Target className="w-4 h-4 text-cyan-400" />
          <span className="font-mono text-sm font-semibold text-slate-200 uppercase tracking-wider">
            {category}
          </span>
          <span className="text-xs text-slate-500">{checks.length} checks</span>
        </div>
        <div className="flex items-center gap-3">
          {passed > 0 && (
            <span className="flex items-center gap-1 text-xs text-green-400">
              <CheckCircle className="w-3 h-3" /> {passed}
            </span>
          )}
          {warned > 0 && (
            <span className="flex items-center gap-1 text-xs text-yellow-400">
              <AlertTriangle className="w-3 h-3" /> {warned}
            </span>
          )}
          {failed > 0 && (
            <span className="flex items-center gap-1 text-xs text-red-400">
              <XCircle className="w-3 h-3" /> {failed}
            </span>
          )}
          {expanded ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-3 space-y-2">
              {checks.map((check) => {
                const StatusIcon = statusIcons[check.status] || Info;
                return (
                  <div
                    key={check.id}
                    className={`flex items-start gap-3 p-3 rounded border ${severityBg[check.severity] || severityBg.info}`}
                  >
                    <StatusIcon className={`w-5 h-5 mt-0.5 shrink-0 ${statusColors[check.status]}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-slate-100">{check.name}</span>
                        <span className={`text-[10px] font-mono uppercase px-1.5 py-0.5 rounded ${severityColors[check.severity]} bg-slate-900/50`}>
                          {check.severity}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">{check.description}</p>
                      <p className="text-xs text-slate-300 mt-1 font-mono">{check.detail}</p>
                      {check.recommendation && (
                        <p className="text-xs text-cyan-400 mt-1 flex items-start gap-1">
                          <Info className="w-3 h-3 mt-0.5 shrink-0" />
                          {check.recommendation}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function SelfScanner() {
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runScan = useCallback(async () => {
    setScanning(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/self-scan/run`, { method: "POST" });
      if (!res.ok) throw new Error(`Scan failed (${res.status})`);
      const data = await res.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setScanning(false);
    }
  }, []);

  const categories = result
    ? [...new Set(result.checks.map(c => c.category))].map(cat => ({
        name: cat,
        checks: result.checks.filter(c => c.category === cat),
      }))
    : [];

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <PageHeader
        title="DAST Self-Scanner"
        subtitle="Dynamic security analysis of your own API surface"
      />

      <WhyThisMatters>
        This scanner probes GuardianLayer's own API endpoints from the outside — the same way an
        attacker would. It checks for missing security headers, exposed debug endpoints, rate
        limiting gaps, payload limits, and CORS misconfigurations. Run it after any configuration
        change to verify your security posture.
      </WhyThisMatters>

      {!result && !scanning && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-16 space-y-6"
        >
          <div className="relative">
            <Shield className="w-20 h-20 text-cyan-500/30" />
            <Zap className="w-8 h-8 text-cyan-400 absolute -bottom-1 -right-1" />
          </div>
          <div className="text-center space-y-2">
            <h3 className="text-lg font-mono font-semibold text-slate-200">
              Ready to Scan
            </h3>
            <p className="text-sm text-slate-400 max-w-md">
              Run a comprehensive security audit against your API. The scanner will check
              headers, endpoints, rate limits, input validation, and exposed surfaces.
            </p>
          </div>
          <button
            onClick={runScan}
            className="flex items-center gap-2 px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-mono text-sm font-semibold rounded-lg transition-colors shadow-lg shadow-cyan-500/20"
          >
            <Zap className="w-4 h-4" />
            START SECURITY SCAN
          </button>
        </motion.div>
      )}

      {scanning && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-16 space-y-4"
        >
          <div className="relative">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            >
              <Shield className="w-16 h-16 text-cyan-400" />
            </motion.div>
          </div>
          <p className="text-sm font-mono text-cyan-400 animate-pulse">
            SCANNING API SURFACE...
          </p>
          <p className="text-xs text-slate-500">
            Probing endpoints, headers, rate limits, and configurations
          </p>
        </motion.div>
      )}

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
          Scan failed: {error}
        </div>
      )}

      {result && !scanning && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-6"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className={`col-span-1 flex items-center justify-center p-6 rounded-lg border bg-slate-800/40 ${gradeColors[result.summary.grade]} shadow-lg ${gradeGlow[result.summary.grade]}`}>
              <ScoreRing score={result.summary.score} grade={result.summary.grade} />
            </div>

            <div className="col-span-1 md:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-4 text-center">
                <div className="text-2xl font-mono font-bold text-green-400">{result.summary.passed}</div>
                <div className="text-xs text-slate-400 mt-1 flex items-center justify-center gap-1">
                  <CheckCircle className="w-3 h-3" /> Passed
                </div>
              </div>
              <div className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-4 text-center">
                <div className="text-2xl font-mono font-bold text-red-400">{result.summary.failed}</div>
                <div className="text-xs text-slate-400 mt-1 flex items-center justify-center gap-1">
                  <XCircle className="w-3 h-3" /> Failed
                </div>
              </div>
              <div className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-4 text-center">
                <div className="text-2xl font-mono font-bold text-yellow-400">{result.summary.warnings}</div>
                <div className="text-xs text-slate-400 mt-1 flex items-center justify-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> Warnings
                </div>
              </div>
              <div className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-4 text-center">
                <div className="text-2xl font-mono font-bold text-slate-300">{result.summary.total}</div>
                <div className="text-xs text-slate-400 mt-1 flex items-center justify-center gap-1">
                  <Target className="w-3 h-3" /> Total
                </div>
              </div>

              <div className="col-span-2 sm:col-span-4 bg-slate-800/40 border border-slate-700/50 rounded-lg p-3 flex items-center justify-between">
                <div className="flex items-center gap-4 text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {result.duration}ms
                  </span>
                  <span className="font-mono">{result.scanId}</span>
                </div>
                <button
                  onClick={runScan}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono text-cyan-400 border border-cyan-500/30 rounded hover:bg-cyan-500/10 transition-colors"
                >
                  <RefreshCw className="w-3 h-3" /> RE-SCAN
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {categories.map(cat => (
              <CategorySection key={cat.name} category={cat.name} checks={cat.checks} />
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
