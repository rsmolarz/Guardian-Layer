import { useState } from "react";
import {
  useListOpenclawContracts,
  useGetOpenclawStats,
  type OpenclawContract,
} from "@workspace/api-client-react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
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

type RiskFilter = "low" | "medium" | "high" | "critical" | undefined;
type StatusFilter = "active" | "expired" | "expiring_soon" | "draft" | undefined;

export default function OpenclawMonitor() {
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
    <div className="pb-12">
      <PageHeader
        title="OpenClaw Monitor"
        description="AI-powered contract analysis, clause risk detection, and regulatory compliance monitoring."
      />

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
    </div>
  );
}
