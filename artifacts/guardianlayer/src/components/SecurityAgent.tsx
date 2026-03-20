import { useState, useEffect, useCallback } from "react";
import { Shield, ShieldCheck, ShieldAlert, ShieldX, ChevronDown, ChevronUp, RefreshCw, Users, AlertTriangle, CheckCircle2, XCircle, Info, Cpu, Bot } from "lucide-react";

interface SecurityFinding {
  id: string;
  category: string;
  severity: string;
  title: string;
  description: string;
  recommendation: string;
  status: "pass" | "fail" | "warning";
}

interface AdminUser {
  name: string;
  role: string;
  lastActive: string;
  mfaEnabled: boolean;
  status: string;
}

interface AuditResult {
  score: number;
  grade: string;
  findings: SecurityFinding[];
  adminUsers: AdminUser[];
  summary: {
    totalChecks: number;
    passed: number;
    warnings: number;
    failed: number;
    criticalIssues: number;
  };
  lastAuditAt: string;
  categories: Record<string, { score: number; status: string }>;
}

const CATEGORY_LABELS: Record<string, string> = {
  config: "Configuration",
  access: "Access Control",
  session: "Sessions",
  network: "Network",
  mfa: "MFA / Auth",
  integration: "Integrations",
  data: "Data Protection",
};

function ScoreRing({ score, grade, size = 80 }: { score: number; grade: string; size?: number }) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 80 ? "#10b981" : score >= 60 ? "#f59e0b" : "#ef4444";

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="4" />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth="4"
          strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
          className="transition-all duration-1000" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-bold font-mono" style={{ color }}>{score}</span>
        <span className="text-[10px] font-mono text-gray-500">{grade}</span>
      </div>
    </div>
  );
}

function FindingCard({ finding }: { finding: SecurityFinding }) {
  const [expanded, setExpanded] = useState(false);
  const statusIcons = { pass: CheckCircle2, fail: XCircle, warning: AlertTriangle };
  const statusColors = { pass: "text-emerald-400", fail: "text-red-400", warning: "text-amber-400" };
  const Icon = statusIcons[finding.status] || Info;

  return (
    <div
      className={`border rounded-lg p-3 cursor-pointer transition-colors hover:bg-white/5 ${
        finding.status === "fail" ? "border-red-500/30 bg-red-500/5" :
        finding.status === "warning" ? "border-amber-500/20 bg-amber-500/5" :
        "border-white/5 bg-white/[0.02]"
      }`}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-start gap-2">
        <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${statusColors[finding.status] || "text-gray-400"}`} />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-white leading-tight">{finding.title}</p>
          {expanded && (
            <div className="mt-2 space-y-1.5">
              <p className="text-[11px] text-gray-400">{finding.description}</p>
              <p className="text-[11px] text-cyan-400/80">
                <span className="text-gray-500">Fix:</span> {finding.recommendation}
              </p>
            </div>
          )}
        </div>
        <span className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded ${
          finding.severity === "critical" ? "bg-red-500/20 text-red-400" :
          finding.severity === "high" ? "bg-orange-500/20 text-orange-400" :
          finding.severity === "medium" ? "bg-amber-500/20 text-amber-400" :
          "bg-gray-500/20 text-gray-400"
        }`}>
          {finding.severity}
        </span>
      </div>
    </div>
  );
}

export function SecurityAgent() {
  const [isOpen, setIsOpen] = useState(false);
  const [audit, setAudit] = useState<AuditResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "findings" | "admin">("overview");
  const baseUrl = import.meta.env.BASE_URL || "/";

  const runAudit = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${baseUrl}api/agent/audit`);
      if (res.ok) {
        const data = await res.json();
        setAudit(data);
      }
    } catch {} finally {
      setLoading(false);
    }
  }, [baseUrl]);

  useEffect(() => {
    if (isOpen && !audit) {
      runAudit();
    }
  }, [isOpen, audit, runAudit]);

  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(runAudit, 60000);
    return () => clearInterval(interval);
  }, [isOpen, runAudit]);

  const scoreColor = !audit ? "text-gray-400" : audit.score >= 80 ? "text-emerald-400" : audit.score >= 60 ? "text-amber-400" : "text-red-400";
  const ShieldIcon = !audit ? Shield : audit.score >= 80 ? ShieldCheck : audit.score >= 60 ? ShieldAlert : ShieldX;

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-20 right-4 z-[80] w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg group ${
          isOpen
            ? "bg-cyan-500/20 border border-cyan-500/40 shadow-[0_0_20px_rgba(6,182,212,0.3)]"
            : "bg-[#1a1a2e]/90 border border-white/10 hover:border-cyan-500/30 hover:shadow-[0_0_15px_rgba(6,182,212,0.2)]"
        }`}
        title="Security Agent"
      >
        <Bot className={`w-6 h-6 transition-colors ${isOpen ? "text-cyan-400" : "text-gray-400 group-hover:text-cyan-400"}`} />
        {audit && audit.summary.criticalIssues > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center animate-pulse">
            {audit.summary.criticalIssues}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="fixed bottom-36 right-4 z-[80] w-[380px] max-h-[70vh] bg-[#0d0d1a]/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-white/5 flex items-center gap-3 bg-gradient-to-r from-cyan-500/5 to-transparent">
            <Bot className="w-5 h-5 text-cyan-400" />
            <div className="flex-1">
              <h3 className="text-sm font-bold font-display text-white tracking-wider">SECURITY AGENT</h3>
              <p className="text-[10px] font-mono text-gray-500">Real-time posture monitoring</p>
            </div>
            <button onClick={runAudit} disabled={loading} className="text-gray-500 hover:text-cyan-400 transition-colors p-1">
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>

          {!audit ? (
            <div className="p-8 flex flex-col items-center gap-3">
              <Cpu className="w-8 h-8 text-cyan-400 animate-pulse" />
              <p className="text-sm text-gray-400 font-mono">Running security audit...</p>
            </div>
          ) : (
            <>
              <div className="px-4 py-3 flex items-center gap-4 border-b border-white/5">
                <ScoreRing score={audit.score} grade={audit.grade} />
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <ShieldIcon className={`w-4 h-4 ${scoreColor}`} />
                    <span className={`text-sm font-bold ${scoreColor}`}>
                      {audit.score >= 80 ? "Secure" : audit.score >= 60 ? "Needs Attention" : "At Risk"}
                    </span>
                  </div>
                  <div className="flex gap-3 text-[10px] font-mono">
                    <span className="text-emerald-400">{audit.summary.passed} passed</span>
                    <span className="text-amber-400">{audit.summary.warnings} warn</span>
                    <span className="text-red-400">{audit.summary.failed} fail</span>
                  </div>
                  <p className="text-[10px] text-gray-500 font-mono">
                    Last scan: {new Date(audit.lastAuditAt).toLocaleTimeString()}
                  </p>
                </div>
              </div>

              <div className="flex border-b border-white/5">
                {(["overview", "findings", "admin"] as const).map((tab) => (
                  <button key={tab} onClick={() => setActiveTab(tab)}
                    className={`flex-1 py-2 text-[10px] font-mono uppercase tracking-wider transition-colors ${
                      activeTab === tab ? "text-cyan-400 border-b-2 border-cyan-400" : "text-gray-500 hover:text-gray-300"
                    }`}>
                    {tab}
                  </button>
                ))}
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-2" style={{ maxHeight: "40vh" }}>
                {activeTab === "overview" && (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(audit.categories).map(([cat, data]) => (
                        <div key={cat} className={`p-2 rounded-lg border ${
                          data.status === "fail" ? "border-red-500/20 bg-red-500/5" :
                          data.status === "warning" ? "border-amber-500/20 bg-amber-500/5" :
                          "border-white/5 bg-white/[0.02]"
                        }`}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] font-mono text-gray-400 uppercase">{CATEGORY_LABELS[cat] || cat}</span>
                            {data.status === "pass" ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> :
                             data.status === "warning" ? <AlertTriangle className="w-3 h-3 text-amber-400" /> :
                             <XCircle className="w-3 h-3 text-red-400" />}
                          </div>
                          <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all duration-500 ${
                              data.score >= 80 ? "bg-emerald-500" : data.score >= 60 ? "bg-amber-500" : "bg-red-500"
                            }`} style={{ width: `${data.score}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {activeTab === "findings" && (
                  <div className="space-y-2">
                    {audit.findings
                      .sort((a, b) => {
                        const order = { fail: 0, warning: 1, pass: 2 };
                        return (order[a.status] ?? 3) - (order[b.status] ?? 3);
                      })
                      .map((f) => <FindingCard key={f.id} finding={f} />)}
                  </div>
                )}

                {activeTab === "admin" && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="w-4 h-4 text-cyan-400" />
                      <span className="text-xs font-mono text-gray-300 uppercase tracking-wider">Admin Access</span>
                    </div>
                    {audit.adminUsers.map((user, i) => (
                      <div key={i} className="border border-white/5 rounded-lg p-3 bg-white/[0.02]">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs font-medium text-white">{user.name}</p>
                            <p className="text-[10px] font-mono text-gray-500">{user.role}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {user.mfaEnabled ? (
                              <span className="text-[9px] font-mono bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded">MFA</span>
                            ) : (
                              <span className="text-[9px] font-mono bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded">NO MFA</span>
                            )}
                            <span className={`w-2 h-2 rounded-full ${
                              user.status === "active" ? "bg-emerald-500" :
                              user.status === "inactive" ? "bg-gray-500" : "bg-red-500"
                            }`} />
                          </div>
                        </div>
                        <p className="text-[10px] text-gray-500 mt-1 font-mono">
                          Last active: {new Date(user.lastActive).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
