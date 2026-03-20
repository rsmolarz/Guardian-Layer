import React, { useState, useEffect } from "react";
import {
  useListOpenclawContracts,
  useGetOpenclawStats,
  type OpenclawContract,
} from "@workspace/api-client-react";
import { ThreatExplainer } from "../components/clarity/ThreatExplainer";
import { PlainEnglishThreatCard } from "../components/clarity/PlainEnglishThreatCard";
import type { ThreatBreakdown } from "../components/clarity/PlainEnglishThreatCard";
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
  Users,
  Monitor,
  Download,
  GitCompare,
  FileWarning,
  Hash,
  Bookmark,
  Plus,
  Trash2,
  Link as LinkIcon,
  Send,
  Siren,
  RefreshCw,
} from "lucide-react";

import { PageHeader } from "@/components/ui/PageHeader";
import { CyberLoading } from "@/components/ui/CyberLoading";
import { AutoJargon } from "@/components/clarity/JargonTranslator";
import { WhyThisMatters } from "@/components/clarity/WhyThisMatters";
import { ExecutiveSummary } from "@/components/clarity/ExecutiveSummary";

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

type Tab = "contracts" | "health" | "api-security" | "sessions" | "config-drift" | "bookmarks" | "breach-alerts";
type RiskFilter = "low" | "medium" | "high" | "critical" | undefined;
type StatusFilter = "active" | "expired" | "expiring_soon" | "draft" | undefined;

export default function OpenclawMonitor() {
  const [tab, setTab] = useState<Tab>("contracts");

  return (
    <div className="pb-12">
      <PageHeader
        title="Contract Monitor"
        description="Review and monitor contracts for risky clauses, compliance issues, and upcoming expirations."
      />

      <div className="mb-6 space-y-3">
        <WhyThisMatters explanation="This page monitors all your legal contracts for risky clauses, compliance gaps, and upcoming expirations. Catching problems early prevents costly legal surprises." />
        <ExecutiveSummary
          title="Contract Monitor"
          sections={[
            { heading: "What This Shows", content: "An automated review of all your organization's contracts — employment agreements, vendor contracts, service-level agreements, and more. Each contract is scanned for risky clauses, compliance issues, and expiration dates." },
            { heading: "Risk Levels", content: "Contracts are rated from low to critical risk. Critical means there are serious issues that could expose the organization to legal liability. High-risk contracts should be reviewed by legal counsel." },
            { heading: "What to Do", content: "Review any contracts flagged as high or critical risk. Check expiring contracts to decide whether to renew or renegotiate. Use the flagged clauses count to prioritize which contracts need the most attention." },
          ]}
        />
      </div>

      <div className="mb-6 flex gap-1 glass-panel p-1.5 rounded-xl w-fit">
        {([
          { id: "contracts" as Tab, label: "Contracts", icon: Scale },
          { id: "health" as Tab, label: "App Health", icon: Activity },
          { id: "api-security" as Tab, label: "API Safety Check", icon: ShieldAlert },
          { id: "sessions" as Tab, label: "Active Users", icon: Users },
          { id: "config-drift" as Tab, label: "Config Changes", icon: Scan },
          { id: "bookmarks" as Tab, label: "Bookmarks", icon: Bookmark },
          { id: "breach-alerts" as Tab, label: "Breach Alerts", icon: Siren },
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
      {tab === "sessions" && <UserSessionPanel />}
      {tab === "config-drift" && <ConfigDriftPanel />}
      {tab === "bookmarks" && <BookmarksPanel />}
      {tab === "breach-alerts" && <BreachAlertsPanel />}
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

  if (isStatsLoading) return <CyberLoading text="Checking contracts..." />;

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
        <CyberLoading text="Loading contract list..." />
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
                          {contract.details && <p className="text-sm text-muted-foreground"><AutoJargon text={contract.details} /></p>}
                          <ThreatExplainer
                            narrative={`This ${contract.contractType.replace("_", " ")} contract with ${contract.counterparty} (${contract.jurisdiction}) has a risk score of ${(contract.riskScore * 100).toFixed(0)}%. ${contract.flaggedClauses > 0 ? `${contract.flaggedClauses} out of ${contract.totalClauses} clauses have been flagged for review — these may contain unfavorable terms, compliance risks, or unusual provisions.` : "No clauses were flagged."} ${contract.status === "expiring_soon" ? "This contract is expiring soon and needs renewal attention." : contract.status === "expired" ? "This contract has expired and should be renewed or decommissioned." : ""}`}
                          />
                          {contract.riskScore > 0.3 && (
                            <PlainEnglishThreatCard
                              breakdown={{
                                whatWeFound: `Contract "${contract.title}" with ${contract.counterparty} has ${contract.flaggedClauses} flagged clauses and a ${(contract.riskScore * 100).toFixed(0)}% risk score.`,
                                howWeFoundIt: "Our contract scanner automatically reviews all clauses against legal best practices and compliance requirements.",
                                whereTheThreatIs: `In the contract terms between your organization and ${contract.counterparty}, governed by ${contract.jurisdiction} law.`,
                                whatThisMeans: contract.riskLevel === "critical" ? "This contract has serious issues — unfavorable terms, compliance violations, or high-risk clauses that could expose your organization." : "Some contract terms need review but the overall risk is manageable with proper oversight.",
                                potentialImpact: contract.riskLevel === "critical" ? "Could result in regulatory penalties, unfavorable legal obligations, or financial losses if the flagged clauses are triggered." : "Moderate risk — flagged clauses may create obligations that need monitoring.",
                                whatCanBeDone: "Have your legal team review the flagged clauses. Consider renegotiating terms before renewal.",
                                howItsBeingHandled: `The contract is being monitored continuously. Last scanned ${format(new Date(contract.lastScanned), "PP")}.`,
                                recoverySteps: contract.status === "expired" ? "Decide whether to renew with amended terms or let the contract lapse." : "No immediate recovery needed — continue monitoring.",
                              }}
                              severity={contract.riskLevel === "critical" ? "act-now" : contract.riskLevel === "high" ? "needs-attention" : "monitor"}
                            />
                          )}
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

  if (loading) return <CyberLoading text="Checking system status..." />;
  if (!data) return <div className="text-muted-foreground text-center py-12">Couldn't load system health data. Please try again.</div>;

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
                            {check.details && <p className="text-[10px] text-muted-foreground mt-0.5"><AutoJargon text={check.details} /></p>}
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

  if (loading) return <CyberLoading text="Checking API connections..." />;
  if (!data) return <div className="text-muted-foreground text-center py-12">Couldn't load security scan data. Please try again.</div>;

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
                        <p className="text-xs text-gray-300 mb-3"><AutoJargon text={vuln.description} /></p>

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

const SESSION_STATUS_BADGE: Record<string, string> = {
  active: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  flagged: "bg-red-500/20 text-red-400 border-red-500/30",
  terminated: "bg-rose-500/20 text-rose-400 border-rose-500/30",
  expired: "bg-gray-500/20 text-gray-400 border-gray-500/30",
};

const SESSION_ROLE_BADGE: Record<string, string> = {
  admin: "bg-violet-500/20 text-violet-400 border-violet-500/30",
  editor: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  viewer: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  service: "bg-amber-500/20 text-amber-400 border-amber-500/30",
};

const FLAG_SEVERITY_COLOR: Record<string, string> = {
  critical: "bg-red-500/10 border-red-500/20 text-red-400",
  high: "bg-orange-500/10 border-orange-500/20 text-orange-400",
  medium: "bg-yellow-500/10 border-yellow-500/20 text-yellow-400",
  low: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
};

const FLAG_TYPE_ICON: Record<string, string> = {
  concurrent_login: "Concurrent Login",
  session_hijack: "Session Hijack",
  suspicious_ua: "Suspicious Agent",
  unusual_hours: "Unusual Hours",
  data_exfil: "Data Exfiltration",
  geo_anomaly: "Geo Anomaly",
  privilege_escalation: "Privilege Escalation",
  weak_mfa: "Weak MFA",
};

function UserSessionPanel() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);

  useEffect(() => {
    fetch("/api/openclaw/sessions")
      .then((r) => { if (!r.ok) throw new Error("Failed"); return r.json(); })
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <CyberLoading text="Loading active users..." />;
  if (!data) return <div className="text-muted-foreground text-center py-12">Couldn't load user session data. Please try again.</div>;

  const { sessions, summary } = data;
  const filtered = statusFilter
    ? sessions.filter((s: any) => s.status === statusFilter)
    : sessions;

  return (
    <>
      {summary.flaggedSessions > 0 && (
        <div className="glass-panel p-4 rounded-xl border border-red-500/20 bg-red-500/5 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <ShieldAlert className="w-4 h-4 text-red-400 animate-pulse" />
            <span className="text-xs font-display uppercase tracking-widest text-red-400">Active Threats Detected</span>
          </div>
          <p className="text-sm text-gray-300">
            <span className="text-red-400 font-mono">{summary.flaggedSessions} flagged session{summary.flaggedSessions !== 1 ? "s" : ""}</span> with{" "}
            <span className="text-red-400 font-mono">{summary.totalFlags} security flags</span> detected.{" "}
            <span className="text-orange-400 font-mono">{summary.hijackAttempts} session hijack attempt{summary.hijackAttempts !== 1 ? "s" : ""}</span> and{" "}
            <span className="text-orange-400 font-mono">{summary.concurrentLogins} concurrent login anomal{summary.concurrentLogins !== 1 ? "ies" : "y"}</span> require investigation.
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        {[
          { label: "Total Sessions", value: summary.totalSessions, icon: Monitor, color: "text-primary" },
          { label: "Active", value: summary.activeSessions, icon: Wifi, color: "text-emerald-400" },
          { label: "Flagged", value: summary.flaggedSessions, icon: AlertTriangle, color: "text-red-400" },
          { label: "Hijack Attempts", value: summary.hijackAttempts, icon: ShieldAlert, color: "text-red-400" },
          { label: "Unique Users", value: summary.uniqueUsers, icon: Users, color: "text-cyan-400" },
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
        {[undefined, "active", "flagged", "terminated", "expired"].map((s) => (
          <button
            key={s ?? "all"}
            onClick={() => setStatusFilter(s)}
            className={clsx(
              "px-3 py-1.5 rounded-lg text-xs font-display uppercase tracking-wider border transition-colors",
              statusFilter === s ? "bg-primary/20 border-primary/50 text-primary" : "border-white/10 text-muted-foreground hover:border-white/20"
            )}
          >
            {s ?? "All"}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map((session: any) => {
          const isExpanded = expandedId === session.id;
          const flagCount = session.flags.length;
          const hasCritical = session.flags.some((f: any) => f.severity === "critical");

          return (
            <motion.div
              key={session.id}
              layout
              className={`glass-panel rounded-xl border-l-4 overflow-hidden ${
                session.status === "flagged" ? (hasCritical ? "border-red-500" : "border-orange-500") :
                session.status === "terminated" ? "border-rose-500" :
                session.status === "expired" ? "border-gray-500" : "border-emerald-500"
              }`}
            >
              <button
                onClick={() => setExpandedId(isExpanded ? null : session.id)}
                className="w-full p-4 flex items-center gap-4 text-left hover:bg-white/[0.02] transition-colors"
              >
                <div className={`p-2 rounded-lg bg-black/40 ${
                  session.status === "flagged" ? "text-red-400" :
                  session.status === "terminated" ? "text-rose-400" :
                  session.status === "expired" ? "text-gray-400" : "text-emerald-400"
                }`}>
                  {session.status === "flagged" ? <ShieldAlert className="w-5 h-5" /> :
                   session.status === "terminated" ? <XCircle className="w-5 h-5" /> :
                   session.status === "expired" ? <Clock className="w-5 h-5" /> :
                   <Users className="w-5 h-5" />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-sm font-display text-white">{session.user}</span>
                    <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border ${SESSION_ROLE_BADGE[session.role] || "border-white/10 text-white/50"}`}>
                      {session.role}
                    </span>
                    <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border ${SESSION_STATUS_BADGE[session.status] || ""}`}>
                      {session.status}
                    </span>
                    {flagCount > 0 && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded border bg-red-500/20 text-red-400 border-red-500/30">
                        {flagCount} flag{flagCount !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                    <span className="flex items-center gap-1"><Globe className="w-3 h-3" /> {session.ipAddress}</span>
                    <span>{session.location}</span>
                    <span className="flex items-center gap-1"><Monitor className="w-3 h-3" /> {session.device}</span>
                  </div>
                </div>

                <div className="text-right shrink-0 text-xs text-muted-foreground">
                  <p>{session.id}</p>
                  <p className="text-[10px]">Active: {format(new Date(session.lastActivity), "HH:mm:ss")}</p>
                </div>

                {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
              </button>

              {isExpanded && (
                <div className="px-4 pb-4 border-t border-white/5 pt-4 space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { label: "Session Started", value: format(new Date(session.startedAt), "MMM d, HH:mm:ss") },
                      { label: "Last Activity", value: format(new Date(session.lastActivity), "HH:mm:ss") },
                      { label: "Expires", value: format(new Date(session.expiresAt), "MMM d, HH:mm") },
                      { label: "MFA Method", value: session.mfaMethod },
                    ].map((info) => (
                      <div key={info.label} className="p-2 rounded-lg bg-black/20 border border-white/5">
                        <span className="text-[10px] font-display uppercase tracking-widest text-muted-foreground block">{info.label}</span>
                        <span className="text-xs font-mono text-white">{info.value}</span>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: "Pages Visited", value: session.pagesVisited, icon: FileText, color: "text-blue-400" },
                      { label: "API Calls", value: session.apiCalls.toLocaleString(), icon: Activity, color: "text-cyan-400" },
                      { label: "Data Downloaded", value: session.dataDownloaded, icon: Download, color: session.dataDownloaded.includes("GB") || parseFloat(session.dataDownloaded) > 100 ? "text-red-400" : "text-emerald-400" },
                    ].map((metric) => (
                      <div key={metric.label} className="p-3 rounded-lg bg-black/20 border border-white/5 flex items-center gap-3">
                        <metric.icon className={`w-4 h-4 ${metric.color}`} />
                        <div>
                          <span className="text-[10px] font-display uppercase tracking-widest text-muted-foreground block">{metric.label}</span>
                          <span className={`text-sm font-mono font-bold ${metric.color}`}>{metric.value}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="p-3 rounded-lg bg-black/20 border border-white/5">
                    <span className="text-[10px] font-display uppercase tracking-widest text-muted-foreground block mb-1">Session Token</span>
                    <span className="text-xs font-mono text-gray-400">{session.sessionToken}</span>
                  </div>

                  {session.flags.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 mb-1">
                        <AlertTriangle className="w-4 h-4 text-red-400" />
                        <span className="text-xs font-display uppercase tracking-widest text-red-400">Security Flags ({session.flags.length})</span>
                      </div>
                      {session.flags.map((flag: any, i: number) => (
                        <div key={i} className={`p-3 rounded-lg border ${FLAG_SEVERITY_COLOR[flag.severity] || ""}`}>
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border ${
                              flag.severity === "critical" ? "bg-red-500/20 text-red-400 border-red-500/30" :
                              flag.severity === "high" ? "bg-orange-500/20 text-orange-400 border-orange-500/30" :
                              "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                            }`}>
                              {flag.severity}
                            </span>
                            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-white/5 border border-white/10 text-muted-foreground">
                              {FLAG_TYPE_ICON[flag.type] || flag.type.replace(/_/g, " ")}
                            </span>
                          </div>
                          <p className="text-xs text-gray-300 mt-1"><AutoJargon text={flag.description} /></p>
                        </div>
                      ))}
                    </div>
                  )}

                  {session.flags.length === 0 && (
                    <div className="p-4 rounded-lg bg-emerald-500/5 border border-emerald-500/20 text-center">
                      <CheckCircle className="w-5 h-5 text-emerald-400 mx-auto mb-2" />
                      <p className="text-sm text-emerald-400 font-display uppercase">Clean Session — No Anomalies Detected</p>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          );
        })}

        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Users className="w-8 h-8 mx-auto mb-3 text-cyan-400" />
            <p className="font-display text-sm uppercase tracking-wider">No sessions match this filter</p>
          </div>
        )}
      </div>
    </>
  );
}

const DRIFT_STATUS_BADGE: Record<string, string> = {
  drifted: "bg-red-500/20 text-red-400 border-red-500/30",
  baseline: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
};

const DRIFT_SEVERITY_BADGE: Record<string, string> = {
  critical: "bg-red-500/20 text-red-400 border-red-500/30",
  high: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  low: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
};

const APPROVAL_BADGE: Record<string, string> = {
  unapproved: "bg-red-500/20 text-red-400 border-red-500/30",
  pending_review: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  approved: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  baseline: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
};

const CATEGORY_COLOR: Record<string, string> = {
  authentication: "text-violet-400 bg-violet-500/10 border-violet-500/30",
  database: "text-blue-400 bg-blue-500/10 border-blue-500/30",
  network: "text-cyan-400 bg-cyan-500/10 border-cyan-500/30",
  security: "text-orange-400 bg-orange-500/10 border-orange-500/30",
  observability: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
  secrets: "text-red-400 bg-red-500/10 border-red-500/30",
  application: "text-gray-400 bg-gray-500/10 border-gray-500/30",
  authorization: "text-amber-400 bg-amber-500/10 border-amber-500/30",
};

function ConfigDriftPanel() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);

  useEffect(() => {
    fetch("/api/openclaw/config-drift")
      .then((r) => { if (!r.ok) throw new Error("Failed"); return r.json(); })
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <CyberLoading text="Checking configuration changes..." />;
  if (!data) return <div className="text-muted-foreground text-center py-12">Couldn't load configuration data. Please try again.</div>;

  const { configs, summary } = data;
  const filtered = statusFilter
    ? configs.filter((c: any) => c.status === statusFilter)
    : configs;

  return (
    <>
      {summary.criticalDrifts > 0 && (
        <div className="glass-panel p-4 rounded-xl border border-red-500/20 bg-red-500/5 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <FileWarning className="w-4 h-4 text-red-400 animate-pulse" />
            <span className="text-xs font-display uppercase tracking-widest text-red-400">Critical Configuration Drift Detected</span>
          </div>
          <p className="text-sm text-gray-300">
            <span className="text-red-400 font-mono">{summary.criticalDrifts} critical</span> and{" "}
            <span className="text-orange-400 font-mono">{summary.highDrifts} high</span> severity configuration drifts detected.{" "}
            <span className="text-red-400 font-mono">{summary.unapprovedChanges} unapproved change{summary.unapprovedChanges !== 1 ? "s" : ""}</span> require immediate review.{" "}
            <span className="text-muted-foreground">{summary.totalChanges} total field changes across {summary.driftedConfigs} config files.</span>
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        {[
          { label: "Total Configs", value: summary.totalConfigs, icon: FileCode, color: "text-primary" },
          { label: "Drifted", value: summary.driftedConfigs, icon: GitCompare, color: "text-red-400" },
          { label: "Baseline", value: summary.baselineConfigs, icon: CheckCircle, color: "text-emerald-400" },
          { label: "Total Changes", value: summary.totalChanges, icon: AlertTriangle, color: "text-orange-400" },
          { label: "Unapproved", value: summary.unapprovedChanges, icon: ShieldAlert, color: "text-red-400" },
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
        {[undefined, "drifted", "baseline"].map((s) => (
          <button
            key={s ?? "all"}
            onClick={() => setStatusFilter(s)}
            className={clsx(
              "px-3 py-1.5 rounded-lg text-xs font-display uppercase tracking-wider border transition-colors",
              statusFilter === s ? "bg-primary/20 border-primary/50 text-primary" : "border-white/10 text-muted-foreground hover:border-white/20"
            )}
          >
            {s ?? "All"}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map((config: any) => {
          const isExpanded = expandedId === config.id;
          const changeCount = config.changes.length;

          return (
            <motion.div
              key={config.id}
              layout
              className={`glass-panel rounded-xl border-l-4 overflow-hidden ${
                config.status === "drifted" ? (
                  config.severity === "critical" ? "border-red-500" :
                  config.severity === "high" ? "border-orange-500" : "border-yellow-500"
                ) : "border-emerald-500"
              }`}
            >
              <button
                onClick={() => setExpandedId(isExpanded ? null : config.id)}
                className="w-full p-4 flex items-center gap-4 text-left hover:bg-white/[0.02] transition-colors"
              >
                <div className={`p-2 rounded-lg bg-black/40 ${
                  config.status === "drifted" ? "text-red-400" : "text-emerald-400"
                }`}>
                  {config.status === "drifted" ? <FileWarning className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-sm font-mono text-white">{config.filePath}</span>
                    <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border ${CATEGORY_COLOR[config.category] || ""}`}>
                      {config.category}
                    </span>
                    <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border ${DRIFT_STATUS_BADGE[config.status] || ""}`}>
                      {config.status}
                    </span>
                    {config.status === "drifted" && (
                      <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border ${DRIFT_SEVERITY_BADGE[config.severity] || ""}`}>
                        {config.severity}
                      </span>
                    )}
                    {changeCount > 0 && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded border bg-red-500/20 text-red-400 border-red-500/30">
                        {changeCount} change{changeCount !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                    <span>{config.id}</span>
                    {config.modifiedBy && <span>Modified by: {config.modifiedBy}</span>}
                    <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border ${APPROVAL_BADGE[config.approvalStatus] || ""}`}>
                      {config.approvalStatus.replace(/_/g, " ")}
                    </span>
                  </div>
                </div>

                <div className="text-right shrink-0 text-xs text-muted-foreground">
                  <p>Checked: {format(new Date(config.lastChecked), "HH:mm:ss")}</p>
                </div>

                {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
              </button>

              {isExpanded && (
                <div className="px-4 pb-4 border-t border-white/5 pt-4 space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { label: "Baseline Hash", value: config.baselineHash },
                      { label: "Current Hash", value: config.currentHash },
                      { label: "Baseline Set", value: format(new Date(config.lastBaseline), "MMM d, yyyy") },
                      { label: "Drift Detected", value: config.driftDetectedAt ? format(new Date(config.driftDetectedAt), "MMM d, HH:mm") : "N/A" },
                    ].map((info) => (
                      <div key={info.label} className="p-2 rounded-lg bg-black/20 border border-white/5">
                        <span className="text-[10px] font-display uppercase tracking-widest text-muted-foreground block">{info.label}</span>
                        <span className="text-xs font-mono text-white break-all">{info.value}</span>
                      </div>
                    ))}
                  </div>

                  {config.changes.length === 0 ? (
                    <div className="p-4 rounded-lg bg-emerald-500/5 border border-emerald-500/20 text-center">
                      <CheckCircle className="w-5 h-5 text-emerald-400 mx-auto mb-2" />
                      <p className="text-sm text-emerald-400 font-display uppercase">Configuration Matches Baseline — No Drift</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 mb-1">
                        <GitCompare className="w-4 h-4 text-red-400" />
                        <span className="text-xs font-display uppercase tracking-widest text-red-400">Configuration Changes ({config.changes.length})</span>
                      </div>
                      {config.changes.map((change: any, i: number) => (
                        <div key={i} className={`p-4 rounded-lg border ${
                          change.severity === "critical" ? "bg-red-500/5 border-red-500/20" :
                          change.severity === "high" ? "bg-orange-500/5 border-orange-500/20" :
                          "bg-yellow-500/5 border-yellow-500/20"
                        }`}>
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <span className="text-xs font-mono text-white bg-white/5 px-2 py-0.5 rounded">{change.field}</span>
                            <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border ${DRIFT_SEVERITY_BADGE[change.severity] || ""}`}>
                              {change.severity}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-2 mb-3">
                            <div className="p-2 rounded-lg bg-emerald-500/5 border border-emerald-500/15">
                              <span className="text-[10px] font-display uppercase tracking-widest text-emerald-400 block">Baseline</span>
                              <span className="text-xs font-mono text-emerald-300">{change.baseline}</span>
                            </div>
                            <div className="p-2 rounded-lg bg-red-500/5 border border-red-500/15">
                              <span className="text-[10px] font-display uppercase tracking-widest text-red-400 block">Current</span>
                              <span className="text-xs font-mono text-red-300">{change.current}</span>
                            </div>
                          </div>

                          <p className="text-xs text-gray-300"><AutoJargon text={change.description} /></p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          );
        })}

        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <GitCompare className="w-8 h-8 mx-auto mb-3 text-cyan-400" />
            <p className="font-display text-sm uppercase tracking-wider">No configs match this filter</p>
          </div>
        )}
      </div>
    </>
  );
}

interface BreachAlert {
  id: string;
  type: string;
  severity: string;
  title: string;
  detail: string;
  timestamp: string;
  actionRequired: boolean;
}

interface BreachAlertsData {
  breachMode: "active" | "elevated" | "monitoring" | "normal";
  totalAlerts: number;
  actionRequired: number;
  alerts: BreachAlert[];
  lockdownActive: boolean;
  recentAnomalyCount: number;
  configChangeCount: number;
}

const BREACH_MODE_CONFIG: Record<string, { label: string; color: string; borderColor: string; bgColor: string }> = {
  active: { label: "BREACH ACTIVE", color: "text-rose-400", borderColor: "border-rose-500", bgColor: "bg-rose-500/5" },
  elevated: { label: "ELEVATED THREAT", color: "text-orange-400", borderColor: "border-orange-500", bgColor: "bg-orange-500/5" },
  monitoring: { label: "MONITORING", color: "text-amber-400", borderColor: "border-amber-500", bgColor: "bg-amber-500/5" },
  normal: { label: "ALL CLEAR", color: "text-emerald-400", borderColor: "border-emerald-500", bgColor: "bg-emerald-500/5" },
};

const ALERT_TYPE_ICONS: Record<string, typeof Siren> = {
  lockdown_active: Lock,
  config_change: FileWarning,
  security_event: ShieldAlert,
};

function BreachAlertsPanel() {
  const [data, setData] = useState<BreachAlertsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAlerts = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const res = await fetch("/api/openclaw/breach-alerts");
      if (!res.ok) throw new Error("Failed");
      const json = await res.json();
      if (json.breachMode) setData(json);
    } catch {
      if (!isRefresh) setData(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchAlerts(); }, []);

  if (loading) return <CyberLoading text="Checking breach alerts..." />;
  if (!data) return <div className="text-muted-foreground text-center py-12">Couldn't load breach alert data. Please try again.</div>;

  const modeConfig = BREACH_MODE_CONFIG[data.breachMode] || BREACH_MODE_CONFIG.normal;

  return (
    <>
      <div className={`glass-panel p-4 rounded-xl mb-6 border-l-4 ${modeConfig.borderColor} ${modeConfig.bgColor}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-lg bg-black/40 ${modeConfig.color}`}>
              <Siren className={`w-6 h-6 ${data.breachMode === "active" ? "animate-pulse" : ""}`} />
            </div>
            <div>
              <h3 className="font-display text-lg uppercase tracking-wider text-white">
                Breach Status: <span className={modeConfig.color}>{modeConfig.label}</span>
              </h3>
              <p className="text-xs text-muted-foreground">
                {data.totalAlerts} alert{data.totalAlerts !== 1 ? "s" : ""}
                {data.actionRequired > 0 && <> · <span className="text-rose-400">{data.actionRequired} require action</span></>}
                {data.lockdownActive && <> · <span className="text-rose-400 font-bold">Lockdown Active</span></>}
              </p>
            </div>
          </div>
          <button
            onClick={() => fetchAlerts(true)}
            disabled={refreshing}
            className="px-4 py-2 rounded-lg text-xs font-display uppercase tracking-wider border border-white/10 text-muted-foreground hover:text-white hover:border-white/20 transition-colors flex items-center gap-2"
          >
            <RefreshCw className={`w-3 h-3 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Total Alerts", value: data.totalAlerts, icon: AlertTriangle, color: data.totalAlerts > 0 ? "text-amber-400" : "text-emerald-400" },
          { label: "Action Required", value: data.actionRequired, icon: Zap, color: data.actionRequired > 0 ? "text-rose-400" : "text-emerald-400" },
          { label: "Anomalies (6h)", value: data.recentAnomalyCount, icon: Activity, color: data.recentAnomalyCount > 0 ? "text-orange-400" : "text-emerald-400" },
          { label: "Config Changes", value: data.configChangeCount, icon: FileWarning, color: data.configChangeCount > 0 ? "text-amber-400" : "text-emerald-400" },
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

      {data.alerts.length === 0 ? (
        <div className="text-center py-12">
          <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
          <p className="font-display text-sm uppercase tracking-wider text-emerald-400">No Active Breach Alerts</p>
          <p className="text-xs text-muted-foreground mt-1">All systems operating normally. No post-breach anomalies detected.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {data.alerts.map((alert) => {
            const Icon = ALERT_TYPE_ICONS[alert.type] || (alert.type.startsWith("anomaly_") ? Bug : ShieldAlert);
            const severityColor =
              alert.severity === "critical" ? "border-rose-500 bg-rose-500/[0.03]" :
              alert.severity === "high" ? "border-orange-500 bg-orange-500/[0.03]" :
              alert.severity === "warning" ? "border-amber-500 bg-amber-500/[0.03]" :
              "border-blue-500 bg-blue-500/[0.03]";
            const severityBadge =
              alert.severity === "critical" ? "bg-rose-500/20 text-rose-400 border-rose-500/30" :
              alert.severity === "high" ? "bg-orange-500/20 text-orange-400 border-orange-500/30" :
              alert.severity === "warning" ? "bg-amber-500/20 text-amber-400 border-amber-500/30" :
              "bg-blue-500/20 text-blue-400 border-blue-500/30";
            const iconColor =
              alert.severity === "critical" ? "text-rose-400" :
              alert.severity === "high" ? "text-orange-400" :
              alert.severity === "warning" ? "text-amber-400" : "text-blue-400";

            return (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className={`glass-panel rounded-xl border-l-4 p-4 ${severityColor}`}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg bg-black/40 shrink-0 ${iconColor}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded border ${severityBadge}`}>
                        {alert.severity}
                      </span>
                      <span className="text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded border bg-white/5 border-white/10 text-muted-foreground">
                        {alert.type.replace(/_/g, " ")}
                      </span>
                      {alert.actionRequired && (
                        <span className="text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded border bg-rose-500/20 text-rose-400 border-rose-500/30 animate-pulse">
                          Action Required
                        </span>
                      )}
                      <span className="text-[10px] font-mono text-muted-foreground">{alert.id}</span>
                    </div>
                    <h4 className="text-sm font-display text-white mb-1">{alert.title.replace(/_/g, " ")}</h4>
                    <p className="text-xs text-muted-foreground">{alert.detail}</p>
                  </div>
                  <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                    {format(new Date(alert.timestamp), "MMM dd, HH:mm")}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </>
  );
}

interface BookmarkItem {
  id: number;
  url: string;
  label: string;
  category: string;
  status: string;
  lastChecked: string | null;
  addedAt: string;
}

const BOOKMARK_CATEGORIES = [
  "Financial Platform",
  "Exchange",
  "Wallet",
  "DeFi",
  "Payment Processor",
  "Bank Portal",
  "Trading Platform",
  "Other",
];

function BookmarksPanel() {
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newUrl, setNewUrl] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [newCategory, setNewCategory] = useState("Financial Platform");
  const [adding, setAdding] = useState(false);

  const loadBookmarks = () => {
    fetch("/api/openclaw/bookmarks")
      .then((r) => r.json())
      .then((d) => { setBookmarks(d.bookmarks || []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { loadBookmarks(); }, []);

  const addBookmark = async () => {
    if (!newUrl.trim() || !newLabel.trim()) return;
    setAdding(true);
    try {
      const res = await fetch("/api/openclaw/bookmarks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: newUrl.trim(), label: newLabel.trim(), category: newCategory }),
      });
      if (res.ok) {
        setNewUrl("");
        setNewLabel("");
        setShowAddForm(false);
        loadBookmarks();
      }
    } catch {}
    setAdding(false);
  };

  const deleteBookmark = async (id: number) => {
    try {
      await fetch(`/api/openclaw/bookmarks/${id}`, { method: "DELETE" });
      loadBookmarks();
    } catch {}
  };

  if (loading) return <CyberLoading text="Loading bookmarks..." />;

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Bookmark className="w-5 h-5 text-primary" />
          <span className="text-sm font-display uppercase tracking-widest text-white">Monitored URLs ({bookmarks.length})</span>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-4 py-2 rounded-lg text-xs font-display uppercase tracking-wider bg-primary/20 border border-primary/40 text-primary hover:bg-primary/30 flex items-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add URL
        </button>
      </div>

      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-6"
          >
            <div className="glass-panel p-4 rounded-xl border border-primary/20 space-y-3">
              <div className="flex items-center gap-2 mb-2">
                <LinkIcon className="w-4 h-4 text-primary" />
                <span className="text-xs font-display uppercase tracking-widest text-primary">Add URL to Monitor</span>
              </div>
              <input
                type="text"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="Label (e.g. Coinbase Pro)"
                className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-sm text-white placeholder-gray-500 focus:border-primary/40 focus:outline-none"
              />
              <input
                type="url"
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                placeholder="URL (e.g. https://pro.coinbase.com)"
                className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-sm text-white placeholder-gray-500 focus:border-primary/40 focus:outline-none"
              />
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-sm text-white focus:border-primary/40 focus:outline-none"
              >
                {BOOKMARK_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <div className="flex gap-2">
                <button
                  onClick={addBookmark}
                  disabled={!newUrl.trim() || !newLabel.trim() || adding}
                  className={clsx(
                    "flex-1 px-4 py-2 rounded-lg text-xs font-display uppercase tracking-wider flex items-center justify-center gap-2 transition-colors",
                    newUrl.trim() && newLabel.trim() && !adding
                      ? "bg-primary/20 border border-primary/40 text-primary hover:bg-primary/30"
                      : "bg-white/5 border border-white/10 text-gray-500 cursor-not-allowed"
                  )}
                >
                  <Plus className="w-4 h-4" /> {adding ? "Adding..." : "Add Bookmark"}
                </button>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 rounded-lg text-xs font-display uppercase tracking-wider border border-white/10 text-muted-foreground hover:border-white/20 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {bookmarks.length === 0 ? (
        <div className="text-center py-12">
          <Bookmark className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground font-display uppercase tracking-wider">No URLs being monitored</p>
          <p className="text-xs text-muted-foreground mt-1">Add financial platform URLs to monitor for security changes</p>
        </div>
      ) : (
        <div className="space-y-3">
          {bookmarks.map((bm) => (
            <motion.div
              key={bm.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-panel rounded-xl p-4 border border-white/5 hover:border-primary/20 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
                  <LinkIcon className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-sm font-display text-white">{bm.label}</span>
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded border bg-cyan-500/20 text-cyan-400 border-cyan-500/30">
                      {bm.category}
                    </span>
                    <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border ${
                      bm.status === "active" ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : "bg-white/10 text-muted-foreground border-white/10"
                    }`}>
                      {bm.status}
                    </span>
                  </div>
                  <a href={bm.url} target="_blank" rel="noopener noreferrer" className="text-xs font-mono text-primary/70 hover:text-primary flex items-center gap-1 truncate">
                    <ExternalLink className="w-3 h-3 shrink-0" /> {bm.url}
                  </a>
                  <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                    <span>Added: {new Date(bm.addedAt).toLocaleDateString()}</span>
                    {bm.lastChecked && <span>Last checked: {new Date(bm.lastChecked).toLocaleString()}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => deleteBookmark(bm.id)}
                    className="p-2 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors"
                    title="Remove bookmark"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </>
  );
}
