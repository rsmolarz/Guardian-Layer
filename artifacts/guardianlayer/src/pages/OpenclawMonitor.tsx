import { useState, useEffect } from "react";
import {
  useListOpenclawContracts,
  useGetOpenclawStats,
  type OpenclawContract,
} from "@workspace/api-client-react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { clsx } from "clsx";
import {
  FileText,
  Scale,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronUp,
  Flag,
  Building,
  Globe,
  Scan,
  Activity,
  Server,
  Wifi,
  WifiOff,
  Wrench,
  Zap,
  BarChart3,
  CheckCircle,
  XCircle,
  Brain,
  Bug,
  Lock,
  Unlock,
  FileCode,
  ExternalLink,
} from "lucide-react";

import { PageHeader } from "@/components/ui/PageHeader";
import { CyberLoading } from "@/components/ui/CyberLoading";

const RISK_COLORS: Record<string, string> = {
  low: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
  medium: "text-amber-400 border-amber-400/30 bg-amber-400/10",
  high: "text-orange-400 border-orange-400/30 bg-orange-400/10",
  critical: "text-rose-500 border-rose-500/30 bg-rose-500/10",
};

const STATUS_BADGE: Record<string, string> = {
  active: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  expired: "bg-rose-500/20 text-rose-400 border-rose-500/30",
  expiring_soon: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  draft: "bg-white/10 text-muted-foreground border-white/10",
};

const COMPLIANCE_BADGE: Record<string, string> = {
  compliant: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  non_compliant: "bg-rose-500/20 text-rose-400 border-rose-500/30",
  review_required: "bg-amber-500/20 text-amber-400 border-amber-500/30",
};

type Tab = "contracts" | "health" | "api-security";
type RiskFilter = "low" | "medium" | "high" | "critical" | undefined;
type StatusFilter = "active" | "expired" | "expiring_soon" | "draft" | undefined;

export default function OpenclawMonitor() {
  const [tab, setTab] = useState<Tab>("contracts");

  return (
    <div className="pb-12">
      <PageHeader
        title="OpenClaw Monitor"
        description="AI-powered contract analysis, clause risk detection, and regulatory compliance monitoring."
      />

      <div className="mb-6 flex gap-1 glass-panel p-1.5 rounded-xl w-fit">
        {([
          { id: "contracts" as Tab, label: "Contracts", icon: Scale },
          { id: "health" as Tab, label: "UI Health Monitor", icon: Activity },
          { id: "api-security" as Tab, label: "API Security Scanner", icon: ShieldAlert },
        ]).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={clsx(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-display uppercase tracking-wider transition-colors",
              tab === t.id ? "bg-white/10 text-white" : "text-muted-foreground hover:text-white"
            )}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === "contracts" && <ContractsPanel />}
      {tab === "health" && <HealthMonitorPanel />}
      {tab === "api-security" && <ApiSecurityPanel />}
    </div>
  );
}

function ContractsPanel() {
  const [riskFilter, setRiskFilter] = useState<RiskFilter>(undefined);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(undefined);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const { data: stats, isLoading: isStatsLoading } = useGetOpenclawStats();
  const { data: contractsData, isLoading: isContractsLoading } = useListOpenclawContracts({
    riskLevel: riskFilter,
    status: statusFilter,
  });

  if (isStatsLoading) return <CyberLoading text="SCANNING CONTRACTS..." />;

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-9 gap-4 mb-8">
        {[
          { label: "Total Contracts", value: stats?.totalContracts ?? 0, icon: FileText, color: "text-primary" },
          { label: "Active", value: stats?.activeCount ?? 0, icon: ShieldCheck, color: "text-emerald-400" },
          { label: "Expired", value: stats?.expiredCount ?? 0, icon: ShieldX, color: "text-rose-400" },
          { label: "Expiring Soon", value: stats?.expiringSoonCount ?? 0, icon: Clock, color: "text-amber-400" },
          { label: "Compliant", value: stats?.compliantCount ?? 0, icon: CheckCircle2, color: "text-emerald-400" },
          { label: "Non-Compliant", value: stats?.nonCompliantCount ?? 0, icon: ShieldAlert, color: "text-rose-400" },
          { label: "Avg Risk", value: stats?.avgRiskScore?.toFixed(2) ?? "0", icon: AlertTriangle, color: "text-amber-400" },
          { label: "Flagged Clauses", value: stats?.totalFlaggedClauses ?? 0, icon: Flag, color: "text-orange-400" },
          { label: "Critical Risk", value: stats?.criticalRiskCount ?? 0, icon: ShieldAlert, color: "text-rose-500 animate-pulse" },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="glass-panel p-4 rounded-xl relative overflow-hidden group hover:border-primary/30 transition-colors"
          >
            <div className={`absolute top-0 right-0 p-2 opacity-10 ${stat.color}`}>
              <stat.icon className="w-10 h-10" />
            </div>
            <span className="font-display uppercase text-[9px] tracking-widest text-muted-foreground block mb-1">{stat.label}</span>
            <span className="text-xl font-mono font-bold text-foreground">{stat.value}</span>
          </motion.div>
        ))}
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="glass-panel p-1.5 rounded-xl inline-flex gap-1">
          <span className="px-3 py-2 text-[10px] font-display uppercase tracking-widest text-muted-foreground border-r border-white/10">Risk</span>
          {[undefined, "low", "medium", "high", "critical"].map((r) => (
            <button
              key={r ?? "all"}
              onClick={() => setRiskFilter(r as RiskFilter)}
              className={`px-3 py-2 rounded-lg text-xs font-mono transition-colors uppercase ${
                riskFilter === r ? "bg-white/10 text-white" : "text-muted-foreground hover:text-white"
              }`}
            >
              {r ?? "All"}
            </button>
          ))}
        </div>
        <div className="glass-panel p-1.5 rounded-xl inline-flex gap-1">
          <span className="px-3 py-2 text-[10px] font-display uppercase tracking-widest text-muted-foreground border-r border-white/10">Status</span>
          {[undefined, "active", "expired", "expiring_soon"].map((s) => (
            <button
              key={s ?? "all"}
              onClick={() => setStatusFilter(s as StatusFilter)}
              className={`px-3 py-2 rounded-lg text-xs font-mono transition-colors ${
                statusFilter === s ? "bg-white/10 text-white" : "text-muted-foreground hover:text-white"
              }`}
            >
              {s?.replace("_", " ") ?? "All"}
            </button>
          ))}
        </div>
      </div>

      {isContractsLoading ? (
        <CyberLoading text="LOADING CONTRACTS..." />
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {(contractsData?.contracts ?? []).map((contract: OpenclawContract, idx: number) => {
              const isExpanded = expandedId === contract.id;

              return (
                <motion.div
                  key={contract.id}
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.04 }}
                  className={`glass-panel rounded-xl border-l-4 overflow-hidden ${
                    contract.riskLevel === "critical" ? "border-rose-500" :
                    contract.riskLevel === "high" ? "border-orange-400" :
                    contract.riskLevel === "medium" ? "border-amber-400" :
                    "border-emerald-500"
                  }`}
                >
                  <div
                    className="p-4 cursor-pointer flex flex-col md:flex-row gap-3 items-start md:items-center justify-between group"
                    onClick={() => setExpandedId(isExpanded ? null : contract.id)}
                  >
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`p-2.5 rounded-lg bg-black/40 ${
                        contract.riskLevel === "critical" ? "text-rose-500" :
                        contract.riskLevel === "high" ? "text-orange-400" :
                        "text-primary"
                      } shrink-0`}>
                        <Scale className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className={`text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded border ${RISK_COLORS[contract.riskLevel] || ""}`}>
                            {contract.riskLevel}
                          </span>
                          <span className={`text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded border ${STATUS_BADGE[contract.status] || ""}`}>
                            {contract.status.replace("_", " ")}
                          </span>
                          <span className={`text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded border ${COMPLIANCE_BADGE[contract.complianceStatus] || ""}`}>
                            {contract.complianceStatus.replace("_", " ")}
                          </span>
                        </div>
                        <h4 className="text-sm font-display text-white truncate">{contract.title}</h4>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                          <span className="flex items-center gap-1"><Building className="w-3 h-3" /> {contract.counterparty}</span>
                          <span className="flex items-center gap-1"><Globe className="w-3 h-3" /> {contract.jurisdiction}</span>
                          <span className="font-mono">{contract.contractType.replace("_", " ")}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {contract.flaggedClauses > 0 && (
                        <span className="text-xs font-mono text-orange-400 flex items-center gap-1">
                          <Flag className="w-3 h-3" /> {contract.flaggedClauses}/{contract.totalClauses} flagged
                        </span>
                      )}
                      <span className={`text-xs font-mono ${contract.riskScore > 0.7 ? "text-rose-400" : contract.riskScore > 0.4 ? "text-amber-400" : "text-emerald-400"}`}>
                        Risk: {(contract.riskScore * 100).toFixed(0)}%
                      </span>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                    </div>
                  </div>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-4 border-t border-white/5 pt-3 space-y-3">
                          {contract.details && <p className="text-sm text-muted-foreground">{contract.details}</p>}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                            <div>
                              <span className="text-[10px] font-display uppercase tracking-widest text-muted-foreground block mb-1">Clauses</span>
                              <span className="font-mono text-white">{contract.totalClauses} total, <span className="text-orange-400">{contract.flaggedClauses} flagged</span></span>
                            </div>
                            <div>
                              <span className="text-[10px] font-display uppercase tracking-widest text-muted-foreground block mb-1">Last Scanned</span>
                              <span className="font-mono text-white flex items-center gap-1"><Scan className="w-3 h-3" /> {format(new Date(contract.lastScanned), "PP")}</span>
                            </div>
                            {contract.expiresAt && (
                              <div>
                                <span className="text-[10px] font-display uppercase tracking-widest text-muted-foreground block mb-1">Expires</span>
                                <span className={`font-mono flex items-center gap-1 ${contract.status === "expiring_soon" ? "text-amber-400" : contract.status === "expired" ? "text-rose-400" : "text-white"}`}>
                                  <Clock className="w-3 h-3" /> {format(new Date(contract.expiresAt), "PP")}
                                </span>
                              </div>
                            )}
                            <div>
                              <span className="text-[10px] font-display uppercase tracking-widest text-muted-foreground block mb-1">Created</span>
                              <span className="font-mono text-white">{format(new Date(contract.createdAt), "PP")}</span>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </>
  );
}

const SERVICE_STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  operational: { label: "Operational", color: "text-emerald-400", icon: <CheckCircle className="w-5 h-5" /> },
  degraded: { label: "Degraded", color: "text-yellow-400", icon: <AlertTriangle className="w-5 h-5" /> },
  maintenance: { label: "Maintenance", color: "text-blue-400", icon: <Wrench className="w-5 h-5" /> },
  down: { label: "Down", color: "text-red-400", icon: <XCircle className="w-5 h-5" /> },
};

const SERVICE_STATUS_BADGE: Record<string, string> = {
  operational: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  degraded: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  maintenance: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  down: "bg-red-500/20 text-red-400 border-red-500/30",
};

const HEALTH_CHECK_BADGE: Record<string, string> = {
  passing: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  warning: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  critical: "bg-red-500/20 text-red-400 border-red-500/30",
};

const INCIDENT_SEVERITY_BADGE: Record<string, string> = {
  critical: "bg-red-500/20 text-red-400 border-red-500/30",
  warning: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  info: "bg-blue-500/20 text-blue-400 border-blue-500/30",
};

function HealthMonitorPanel() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);

  useEffect(() => {
    fetch("/api/openclaw/health")
      .then((r) => { if (!r.ok) throw new Error("Failed"); return r.json(); })
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <CyberLoading text="CHECKING SYSTEM HEALTH..." />;
  if (!data) return <div className="text-muted-foreground text-center py-12">Failed to load health data.</div>;

  const { services, recentIncidents, summary } = data;
  const filtered = statusFilter ? services.filter((s: any) => s.status === statusFilter) : services;

  return (
    <>
      <div className={`glass-panel p-4 rounded-xl mb-6 border-l-4 ${
        summary.status === "operational" ? "border-emerald-500" :
        summary.status === "degraded" ? "border-yellow-500" : "border-blue-500"
      }`}>
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-lg bg-black/40 ${
            summary.status === "operational" ? "text-emerald-400" :
            summary.status === "degraded" ? "text-yellow-400" : "text-blue-400"
          }`}>
            {summary.status === "operational" ? <Wifi className="w-6 h-6" /> :
             summary.status === "degraded" ? <AlertTriangle className="w-6 h-6" /> :
             <Wrench className="w-6 h-6" />}
          </div>
          <div>
            <h3 className="font-display text-lg uppercase tracking-wider text-white">
              System Status: <span className={
                summary.status === "operational" ? "text-emerald-400" :
                summary.status === "degraded" ? "text-yellow-400" : "text-blue-400"
              }>{summary.status}</span>
            </h3>
            <p className="text-xs text-muted-foreground">
              {summary.operational}/{summary.totalServices} services operational
              {summary.degraded > 0 && ` · ${summary.degraded} degraded`}
              {summary.maintenance > 0 && ` · ${summary.maintenance} in maintenance`}
              {summary.activeIncidents > 0 && ` · ${summary.activeIncidents} active incident${summary.activeIncidents !== 1 ? "s" : ""}`}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Overall Uptime", value: `${summary.overallUptime}%`, icon: Activity, color: summary.overallUptime >= 99.5 ? "text-emerald-400" : "text-yellow-400" },
          { label: "Avg Response", value: `${summary.avgResponseTime}ms`, icon: Zap, color: summary.avgResponseTime < 500 ? "text-emerald-400" : "text-yellow-400" },
          { label: "Requests/min", value: summary.totalRequestsPerMinute.toLocaleString(), icon: BarChart3, color: "text-primary" },
          { label: "Active Incidents", value: summary.activeIncidents, icon: AlertTriangle, color: summary.activeIncidents > 0 ? "text-yellow-400" : "text-emerald-400" },
        ].map((card) => (
          <div key={card.label} className="glass-panel p-4 rounded-xl border border-white/5">
            <div className="flex items-center gap-2 mb-2">
              <card.icon className={`w-4 h-4 ${card.color}`} />
              <span className="text-[10px] font-display uppercase tracking-widest text-muted-foreground">{card.label}</span>
            </div>
            <p className={`text-2xl font-mono font-bold ${card.color}`}>{card.value}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        {[undefined, "operational", "degraded", "maintenance"].map((s) => (
          <button
            key={s ?? "all"}
            onClick={() => setStatusFilter(s)}
            className={clsx(
              "px-3 py-1.5 rounded-lg text-xs font-display uppercase tracking-wider border transition-colors",
              statusFilter === s ? "bg-primary/20 border-primary/50 text-primary" : "border-white/10 text-muted-foreground hover:border-white/20"
            )}
          >
            {s ?? "All Services"}
          </button>
        ))}
      </div>

      <div className="space-y-3 mb-8">
        {filtered.map((service: any) => {
          const isExpanded = expandedId === service.id;
          const statusCfg = SERVICE_STATUS_CONFIG[service.status] || SERVICE_STATUS_CONFIG.operational;

          return (
            <motion.div
              key={service.id}
              layout
              className={`glass-panel rounded-xl border-l-4 overflow-hidden ${
                service.status === "operational" ? "border-emerald-500" :
                service.status === "degraded" ? "border-yellow-500" :
                service.status === "maintenance" ? "border-blue-500" : "border-red-500"
              }`}
            >
              <button
                onClick={() => setExpandedId(isExpanded ? null : service.id)}
                className="w-full p-4 flex items-center gap-4 text-left hover:bg-white/[0.02] transition-colors"
              >
                <div className={`p-2.5 rounded-lg bg-black/40 ${statusCfg.color}`}>
                  {statusCfg.icon}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-sm font-display text-white">{service.name}</span>
                    <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border ${SERVICE_STATUS_BADGE[service.status] || ""}`}>
                      {service.status}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 border border-white/10 text-muted-foreground">
                      {service.type.replace(/_/g, " ")}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>Uptime: <span className={`font-mono ${service.uptime >= 99.9 ? "text-emerald-400" : service.uptime >= 99 ? "text-yellow-400" : "text-red-400"}`}>{service.uptime}%</span></span>
                    <span>Avg: <span className="font-mono text-white">{service.avgResponseTime}ms</span></span>
                    <span>Error: <span className={`font-mono ${service.errorRate < 1 ? "text-emerald-400" : service.errorRate < 5 ? "text-yellow-400" : "text-red-400"}`}>{service.errorRate}%</span></span>
                    <span className="font-mono">{service.requestsPerMinute} req/min</span>
                  </div>
                </div>

                <div className="text-right shrink-0 text-xs text-muted-foreground">
                  <p className="font-mono">{service.version}</p>
                  <p>{service.region}</p>
                </div>

                {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
              </button>

              {isExpanded && (
                <div className="px-4 pb-4 border-t border-white/5 pt-4 space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-2 rounded-lg bg-black/20 border border-white/5">
                      <span className="text-[10px] font-display uppercase tracking-widest text-muted-foreground block">P95 Response</span>
                      <span className={`text-sm font-mono ${service.p95ResponseTime > 1000 ? "text-yellow-400" : "text-white"}`}>{service.p95ResponseTime}ms</span>
                    </div>
                    <div className="p-2 rounded-lg bg-black/20 border border-white/5">
                      <span className="text-[10px] font-display uppercase tracking-widest text-muted-foreground block">P99 Response</span>
                      <span className={`text-sm font-mono ${service.p99ResponseTime > 2000 ? "text-yellow-400" : "text-white"}`}>{service.p99ResponseTime}ms</span>
                    </div>
                    <div className="p-2 rounded-lg bg-black/20 border border-white/5">
                      <span className="text-[10px] font-display uppercase tracking-widest text-muted-foreground block">Uptime (24h)</span>
                      <span className={`text-sm font-mono ${service.uptimeLast24h >= 99.9 ? "text-emerald-400" : service.uptimeLast24h >= 95 ? "text-yellow-400" : "text-red-400"}`}>{service.uptimeLast24h}%</span>
                    </div>
                    <div className="p-2 rounded-lg bg-black/20 border border-white/5">
                      <span className="text-[10px] font-display uppercase tracking-widest text-muted-foreground block">Last Incident</span>
                      <span className="text-xs font-mono text-white">{format(new Date(service.lastIncident), "MMM d")}</span>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Activity className="w-4 h-4 text-primary" />
                      <span className="text-xs font-display uppercase tracking-widest text-primary">Health Checks</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {service.healthChecks.map((check: any, idx: number) => (
                        <div key={idx} className="p-3 rounded-lg bg-black/20 border border-white/5 flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full shrink-0 ${
                            check.status === "passing" ? "bg-emerald-400" :
                            check.status === "warning" ? "bg-yellow-400" : "bg-red-400"
                          }`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-display text-white">{check.name}</span>
                              <span className={`text-[10px] font-mono uppercase px-1.5 py-0.5 rounded border ${HEALTH_CHECK_BADGE[check.status] || ""}`}>
                                {check.status}
                              </span>
                            </div>
                            {check.details && <p className="text-[10px] text-muted-foreground mt-0.5">{check.details}</p>}
                          </div>
                          {check.latency > 0 && (
                            <span className={`text-xs font-mono shrink-0 ${check.latency > 1000 ? "text-yellow-400" : "text-muted-foreground"}`}>
                              {check.latency}ms
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          );
        })}

        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Server className="w-8 h-8 mx-auto mb-3 text-primary" />
            <p className="font-display text-sm uppercase tracking-wider">No services match this filter</p>
          </div>
        )}
      </div>

      {recentIncidents.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-4 h-4 text-primary" />
            <span className="text-sm font-display uppercase tracking-widest text-primary">Recent Incidents</span>
          </div>
          <div className="space-y-2">
            {recentIncidents.map((incident: any) => (
              <div key={incident.id} className={`glass-panel p-4 rounded-xl border-l-4 ${
                incident.severity === "critical" ? "border-red-500" :
                incident.severity === "warning" ? "border-yellow-500" : "border-blue-500"
              }`}>
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="text-xs font-mono text-muted-foreground">{incident.id}</span>
                  <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border ${INCIDENT_SEVERITY_BADGE[incident.severity] || ""}`}>
                    {incident.severity}
                  </span>
                  <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border ${
                    incident.status === "resolved" ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" :
                    incident.status === "ongoing" ? "bg-red-500/20 text-red-400 border-red-500/30" :
                    "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                  }`}>
                    {incident.status.replace(/_/g, " ")}
                  </span>
                  <span className="text-[10px] text-muted-foreground">{incident.service}</span>
                </div>
                <p className="text-sm text-white mb-1">{incident.title}</p>
                <p className="text-xs text-muted-foreground mb-2">{incident.impact}</p>
                <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                  <span>Started: {format(new Date(incident.startedAt), "MMM d, HH:mm")}</span>
                  {incident.resolvedAt && <span>Resolved: {format(new Date(incident.resolvedAt), "MMM d, HH:mm")}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

const VULN_SEVERITY_BADGE: Record<string, string> = {
  critical: "bg-red-500/20 text-red-400 border-red-500/30",
  high: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  low: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
};

const VULN_STATUS_BADGE: Record<string, string> = {
  open: "bg-red-500/20 text-red-400 border-red-500/30",
  in_progress: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  remediated: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
};

const METHOD_COLOR: Record<string, string> = {
  GET: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
  POST: "text-blue-400 bg-blue-500/10 border-blue-500/30",
  PUT: "text-yellow-400 bg-yellow-500/10 border-yellow-500/30",
  DELETE: "text-red-400 bg-red-500/10 border-red-500/30",
};

function ApiSecurityPanel() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [severityFilter, setSeverityFilter] = useState<string | undefined>(undefined);

  useEffect(() => {
    fetch("/api/openclaw/api-security")
      .then((r) => { if (!r.ok) throw new Error("Failed"); return r.json(); })
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <CyberLoading text="SCANNING API ENDPOINTS..." />;
  if (!data) return <div className="text-muted-foreground text-center py-12">Failed to load security scan data.</div>;

  const { endpoints, summary } = data;
  const filtered = severityFilter
    ? endpoints.filter((e: any) => e.riskLevel === severityFilter)
    : endpoints;

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        {[
          { label: "Total Endpoints", value: summary.totalEndpoints, icon: FileCode, color: "text-primary" },
          { label: "Vulnerable", value: summary.vulnerableEndpoints, icon: Unlock, color: "text-red-400" },
          { label: "Secure", value: summary.secureEndpoints, icon: Lock, color: "text-emerald-400" },
          { label: "Open Vulns", value: summary.openVulnerabilities, icon: Bug, color: "text-red-400" },
          { label: "Avg CVSS", value: summary.avgCvssScore, icon: AlertTriangle, color: summary.avgCvssScore >= 7 ? "text-red-400" : "text-yellow-400" },
        ].map((card) => (
          <div key={card.label} className="glass-panel p-4 rounded-xl border border-white/5">
            <div className="flex items-center gap-2 mb-2">
              <card.icon className={`w-4 h-4 ${card.color}`} />
              <span className="text-[10px] font-display uppercase tracking-widest text-muted-foreground">{card.label}</span>
            </div>
            <p className={`text-2xl font-mono font-bold ${card.color}`}>{card.value}</p>
          </div>
        ))}
      </div>

      {summary.criticalVulnerabilities > 0 && (
        <div className="glass-panel p-4 rounded-xl border border-red-500/20 bg-red-500/5 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <ShieldAlert className="w-4 h-4 text-red-400 animate-pulse" />
            <span className="text-xs font-display uppercase tracking-widest text-red-400">Critical Vulnerabilities Detected</span>
          </div>
          <p className="text-sm text-gray-300">
            <span className="text-red-400 font-mono">{summary.criticalVulnerabilities} critical</span> and{" "}
            <span className="text-orange-400 font-mono">{summary.highVulnerabilities} high</span> severity vulnerabilities require immediate attention.{" "}
            <span className="text-muted-foreground">{summary.remediatedVulnerabilities} vulnerabilities have been remediated.</span>
          </p>
        </div>
      )}

      <div className="flex gap-2 mb-6 flex-wrap">
        {[undefined, "critical", "high", "medium", "low"].map((s) => (
          <button
            key={s ?? "all"}
            onClick={() => setSeverityFilter(s)}
            className={clsx(
              "px-3 py-1.5 rounded-lg text-xs font-display uppercase tracking-wider border transition-colors",
              severityFilter === s ? "bg-primary/20 border-primary/50 text-primary" : "border-white/10 text-muted-foreground hover:border-white/20"
            )}
          >
            {s ?? "All"}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map((endpoint: any) => {
          const isExpanded = expandedId === endpoint.id;
          const vulnCount = endpoint.vulnerabilities.length;

          return (
            <motion.div
              key={endpoint.id}
              layout
              className={`glass-panel rounded-xl border-l-4 overflow-hidden ${
                endpoint.riskLevel === "critical" ? "border-red-500" :
                endpoint.riskLevel === "high" ? "border-orange-500" :
                endpoint.riskLevel === "medium" ? "border-yellow-500" : "border-emerald-500"
              }`}
            >
              <button
                onClick={() => setExpandedId(isExpanded ? null : endpoint.id)}
                className="w-full p-4 flex items-center gap-4 text-left hover:bg-white/[0.02] transition-colors"
              >
                <div className={`p-2 rounded-lg bg-black/40 ${
                  endpoint.status === "vulnerable" ? "text-red-400" : "text-emerald-400"
                }`}>
                  {endpoint.status === "vulnerable" ? <Unlock className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border ${METHOD_COLOR[endpoint.method] || ""}`}>
                      {endpoint.method}
                    </span>
                    <span className="text-sm font-mono text-white">{endpoint.path}</span>
                    <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border ${VULN_SEVERITY_BADGE[endpoint.riskLevel] || ""}`}>
                      {endpoint.riskLevel}
                    </span>
                    <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border ${
                      endpoint.status === "vulnerable" ? "bg-red-500/20 text-red-400 border-red-500/30" : "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                    }`}>
                      {endpoint.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{endpoint.service}</span>
                    {vulnCount > 0 && (
                      <span className="text-red-400 font-mono">{vulnCount} vuln{vulnCount !== 1 ? "s" : ""}</span>
                    )}
                  </div>
                </div>

                <div className="text-right shrink-0 text-xs text-muted-foreground">
                  <p>Scanned: {format(new Date(endpoint.lastScanned), "HH:mm:ss")}</p>
                </div>

                {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
              </button>

              {isExpanded && (
                <div className="px-4 pb-4 border-t border-white/5 pt-4 space-y-3">
                  {endpoint.vulnerabilities.length === 0 ? (
                    <div className="p-4 rounded-lg bg-emerald-500/5 border border-emerald-500/20 text-center">
                      <CheckCircle className="w-5 h-5 text-emerald-400 mx-auto mb-2" />
                      <p className="text-sm text-emerald-400 font-display uppercase">No vulnerabilities detected</p>
                    </div>
                  ) : (
                    endpoint.vulnerabilities.map((vuln: any) => (
                      <div key={vuln.id} className={`p-4 rounded-lg border ${
                        vuln.severity === "critical" ? "bg-red-500/5 border-red-500/20" :
                        vuln.severity === "high" ? "bg-orange-500/5 border-orange-500/20" :
                        vuln.severity === "medium" ? "bg-yellow-500/5 border-yellow-500/20" :
                        "bg-white/[0.02] border-white/5"
                      }`}>
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <span className="text-xs font-mono text-muted-foreground">{vuln.id}</span>
                          <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border ${VULN_SEVERITY_BADGE[vuln.severity] || ""}`}>
                            {vuln.severity}
                          </span>
                          <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border ${VULN_STATUS_BADGE[vuln.status] || ""}`}>
                            {vuln.status.replace(/_/g, " ")}
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 border border-white/10 text-muted-foreground">
                            {vuln.type.replace(/_/g, " ")}
                          </span>
                          <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                            vuln.cvssScore >= 9 ? "bg-red-500/20 text-red-400 border-red-500/30" :
                            vuln.cvssScore >= 7 ? "bg-orange-500/20 text-orange-400 border-orange-500/30" :
                            "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                          }`}>
                            CVSS {vuln.cvssScore}
                          </span>
                        </div>

                        <h4 className="text-sm text-white font-display mb-2">{vuln.title}</h4>
                        <p className="text-xs text-gray-300 mb-3">{vuln.description}</p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                          <div className="p-2 rounded-lg bg-black/20 border border-white/5">
                            <span className="text-[10px] font-display uppercase tracking-widest text-muted-foreground block">CWE</span>
                            <span className="text-xs font-mono text-white">{vuln.cweId}</span>
                          </div>
                          <div className="p-2 rounded-lg bg-black/20 border border-white/5">
                            <span className="text-[10px] font-display uppercase tracking-widest text-muted-foreground block">OWASP</span>
                            <span className="text-xs font-mono text-white">{vuln.owaspCategory}</span>
                          </div>
                        </div>

                        <div className="p-3 rounded-lg bg-black/30 border border-white/5 mb-3">
                          <div className="flex items-center gap-2 mb-1">
                            <Bug className="w-3 h-3 text-red-400" />
                            <span className="text-[10px] font-display uppercase tracking-widest text-red-400">Proof of Concept</span>
                          </div>
                          <p className="text-xs font-mono text-gray-300">{vuln.proof}</p>
                        </div>

                        <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/15">
                          <div className="flex items-center gap-2 mb-1">
                            <CheckCircle className="w-3 h-3 text-emerald-400" />
                            <span className="text-[10px] font-display uppercase tracking-widest text-emerald-400">Remediation</span>
                          </div>
                          <p className="text-xs text-gray-300">{vuln.remediation}</p>
                        </div>

                        <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
                          <span>Detected: {format(new Date(vuln.detectedAt), "MMM d, yyyy")}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </motion.div>
          );
        })}

        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <ShieldCheck className="w-8 h-8 mx-auto mb-3 text-emerald-400" />
            <p className="font-display text-sm uppercase tracking-wider">No endpoints match this filter</p>
          </div>
        )}
      </div>
    </>
  );
}
