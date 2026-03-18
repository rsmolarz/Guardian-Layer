import { useState } from "react";
import {
  useListNetworkEvents,
  useGetNetworkStats,
  type NetworkEvent,
} from "@workspace/api-client-react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import {
  Network,
  ShieldAlert,
  AlertTriangle,
  Shield,
  Flame,
  Radar,
  Activity,
  Scan,
  Globe,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Zap,
} from "lucide-react";

import { PageHeader } from "@/components/ui/PageHeader";
import { CyberLoading } from "@/components/ui/CyberLoading";

const EVENT_ICONS: Record<string, typeof Network> = {
  firewall: Flame,
  ids: Shield,
  anomaly: Activity,
  portscan: Scan,
  ddos: Zap,
};

const SEVERITY_COLORS: Record<string, string> = {
  critical: "text-rose-500 border-rose-500/30 bg-rose-500/10",
  high: "text-orange-400 border-orange-400/30 bg-orange-400/10",
  medium: "text-amber-400 border-amber-400/30 bg-amber-400/10",
  low: "text-blue-400 border-blue-400/30 bg-blue-400/10",
};

const ACTION_BADGE: Record<string, string> = {
  blocked: "bg-rose-500/20 text-rose-400 border-rose-500/30",
  alerted: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  monitored: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  mitigated: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  allowed: "bg-white/10 text-muted-foreground border-white/10",
};

type EventTypeFilter = "firewall" | "ids" | "anomaly" | "portscan" | "ddos" | undefined;
type SeverityFilter = "critical" | "high" | "medium" | "low" | undefined;

export default function NetworkSecurity() {
  const [eventFilter, setEventFilter] = useState<EventTypeFilter>(undefined);
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>(undefined);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const { data: stats, isLoading: isStatsLoading } = useGetNetworkStats();
  const { data: eventsData, isLoading: isEventsLoading } = useListNetworkEvents({
    eventType: eventFilter,
    severity: severityFilter,
  });

  if (isStatsLoading) return <CyberLoading text="SCANNING NETWORK PERIMETER..." />;

  return (
    <div className="pb-12">
      <PageHeader
        title="Network Security"
        description="Real-time AI network monitoring with firewall events, IDS/IPS alerts, and traffic anomaly detection."
      />

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-7 gap-4 mb-8">
        {[
          { label: "Total Events", value: stats?.totalEvents?.toLocaleString() ?? "0", icon: Radar, color: "text-primary" },
          { label: "Blocked", value: stats?.blockedCount ?? 0, icon: Flame, color: "text-rose-400" },
          { label: "Alerted", value: stats?.alertedCount ?? 0, icon: AlertTriangle, color: "text-amber-400" },
          { label: "Critical", value: stats?.criticalCount ?? 0, icon: ShieldAlert, color: "text-rose-500 animate-pulse" },
          { label: "High Severity", value: stats?.highCount ?? 0, icon: Shield, color: "text-orange-400" },
          { label: "Active DDoS", value: stats?.activeDdos ?? 0, icon: Zap, color: stats?.activeDdos ? "text-rose-500 animate-pulse" : "text-emerald-400" },
          { label: "Source Countries", value: stats?.topSourceCountries?.length ?? 0, icon: Globe, color: "text-cyan-400" },
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

      {stats?.topSourceCountries && stats.topSourceCountries.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-panel p-5 rounded-xl mb-8">
          <h3 className="font-display text-sm uppercase tracking-widest text-muted-foreground mb-3">Top Attack Source Countries</h3>
          <div className="flex flex-wrap gap-3">
            {stats.topSourceCountries.map((c) => (
              <div key={c.country} className="glass-panel px-4 py-2 rounded-lg flex items-center gap-2">
                <Globe className="w-4 h-4 text-rose-400" />
                <span className="font-mono text-sm text-white">{c.country}</span>
                <span className="font-mono text-xs text-muted-foreground">{c.count} events</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="glass-panel p-1.5 rounded-xl inline-flex gap-1">
          <span className="px-3 py-2 text-[10px] font-display uppercase tracking-widest text-muted-foreground border-r border-white/10">Type</span>
          {[undefined, "firewall", "ids", "anomaly", "portscan", "ddos"].map((t) => (
            <button
              key={t ?? "all"}
              onClick={() => setEventFilter(t as EventTypeFilter)}
              className={`px-3 py-2 rounded-lg text-xs font-mono transition-colors uppercase ${
                eventFilter === t ? "bg-white/10 text-white" : "text-muted-foreground hover:text-white"
              }`}
            >
              {t ?? "All"}
            </button>
          ))}
        </div>
        <div className="glass-panel p-1.5 rounded-xl inline-flex gap-1">
          <span className="px-3 py-2 text-[10px] font-display uppercase tracking-widest text-muted-foreground border-r border-white/10">Severity</span>
          {[undefined, "critical", "high", "medium", "low"].map((s) => (
            <button
              key={s ?? "all"}
              onClick={() => setSeverityFilter(s as SeverityFilter)}
              className={`px-3 py-2 rounded-lg text-xs font-mono transition-colors uppercase ${
                severityFilter === s ? "bg-white/10 text-white" : "text-muted-foreground hover:text-white"
              }`}
            >
              {s ?? "All"}
            </button>
          ))}
        </div>
      </div>

      {isEventsLoading ? (
        <CyberLoading text="LOADING EVENTS..." />
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {(eventsData?.events ?? []).map((event: NetworkEvent, idx: number) => {
              const Icon = EVENT_ICONS[event.eventType] || Network;
              const isExpanded = expandedId === event.id;

              return (
                <motion.div
                  key={event.id}
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.04 }}
                  className={`glass-panel rounded-xl border-l-4 overflow-hidden ${
                    event.severity === "critical" ? "border-rose-500" :
                    event.severity === "high" ? "border-orange-400" :
                    event.severity === "medium" ? "border-amber-400" :
                    "border-blue-400"
                  }`}
                >
                  <div
                    className="p-4 cursor-pointer flex flex-col md:flex-row gap-3 items-start md:items-center justify-between group"
                    onClick={() => setExpandedId(isExpanded ? null : event.id)}
                  >
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`p-2.5 rounded-lg bg-black/40 ${event.severity === "critical" ? "text-rose-500" : event.severity === "high" ? "text-orange-400" : "text-primary"} shrink-0`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className={`text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded border ${SEVERITY_COLORS[event.severity] || ""}`}>
                            {event.severity}
                          </span>
                          <span className={`text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded border ${ACTION_BADGE[event.action] || ""}`}>
                            {event.action}
                          </span>
                          <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground px-2 py-0.5 rounded border border-white/10">
                            {event.eventType}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm font-mono">
                          <span className="text-white">{event.sourceIp}</span>
                          {event.sourcePort && <span className="text-muted-foreground">:{event.sourcePort}</span>}
                          <ArrowRight className="w-3 h-3 text-muted-foreground" />
                          <span className="text-white">{event.destinationIp}</span>
                          {event.destinationPort && <span className="text-muted-foreground">:{event.destinationPort}</span>}
                          <span className="text-muted-foreground text-xs">({event.protocol})</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {event.country && (
                        <span className="text-xs font-mono text-muted-foreground flex items-center gap-1">
                          <Globe className="w-3 h-3" /> {event.country}
                        </span>
                      )}
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
                        <div className="px-4 pb-4 border-t border-white/5 pt-3 space-y-2">
                          {event.details && <p className="text-sm text-muted-foreground">{event.details}</p>}
                          <div className="flex flex-wrap gap-4 text-xs font-mono text-muted-foreground">
                            {event.ruleName && <span>Rule: <span className="text-primary">{event.ruleName}</span></span>}
                            {event.bytesTransferred != null && event.bytesTransferred > 0 && (
                              <span>Bytes: <span className="text-white">{event.bytesTransferred.toLocaleString()}</span></span>
                            )}
                            <span>Risk: <span className={event.riskScore > 0.8 ? "text-rose-400" : "text-amber-400"}>{(event.riskScore * 100).toFixed(0)}%</span></span>
                            <span>Status: <span className="text-white">{event.status}</span></span>
                            <span>{format(new Date(event.createdAt), "PPpp")}</span>
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
