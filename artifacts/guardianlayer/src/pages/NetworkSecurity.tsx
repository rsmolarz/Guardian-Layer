import { useState, useEffect } from "react";
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
  Fingerprint,
  Target,
  Ban,
  FileCode,
  Eye,
} from "lucide-react";
import { clsx } from "clsx";

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
type Tab = "events" | "ids";

export default function NetworkSecurity() {
  const [activeTab, setActiveTab] = useState<Tab>("events");

  const tabs: { id: Tab; label: string; icon: typeof Network }[] = [
    { id: "events", label: "Events Monitor", icon: Radar },
    { id: "ids", label: "Intrusion Detection", icon: Fingerprint },
  ];

  return (
    <div className="pb-12">
      <PageHeader
        title="Network Security"
        description="Real-time AI network monitoring with firewall events, IDS/IPS alerts, and traffic anomaly detection."
      />

      <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={clsx(
              "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-display uppercase tracking-wider border transition-all whitespace-nowrap",
              activeTab === tab.id
                ? "bg-primary/10 border-primary/40 text-primary shadow-lg shadow-primary/10"
                : "border-white/10 text-muted-foreground hover:border-white/20 hover:text-white"
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "events" && <EventsMonitorPanel />}
      {activeTab === "ids" && <IdsPanel />}
    </div>
  );
}

function EventsMonitorPanel() {
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
    <>
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
    </>
  );
}

interface Intrusion {
  id: number;
  timestamp: string;
  attackType: string;
  signature: string;
  signatureId: string;
  sourceIp: string;
  sourcePort: number;
  destinationIp: string;
  destinationPort: number;
  protocol: string;
  country: string;
  severity: string;
  action: string;
  confidence: number;
  payload: string;
  matchedRule: string;
  category: string;
  sessionsAffected: number;
  packetsInspected: number;
  relatedCves: string[];
}

interface IdsData {
  intrusions: Intrusion[];
  summary: {
    totalIntrusions: number;
    blockedCount: number;
    alertedCount: number;
    criticalCount: number;
    uniqueAttackers: number;
    categories: Record<string, number>;
  };
}

const CATEGORY_ICONS: Record<string, typeof Network> = {
  web_attack: FileCode,
  brute_force: Target,
  malware_c2: ShieldAlert,
  exfiltration: Activity,
  reconnaissance: Scan,
  zero_day: Zap,
};

const CATEGORY_LABELS: Record<string, string> = {
  web_attack: "Web Attack",
  brute_force: "Brute Force",
  malware_c2: "Malware C2",
  exfiltration: "Exfiltration",
  reconnaissance: "Reconnaissance",
  zero_day: "Zero-Day",
};

function IdsPanel() {
  const [data, setData] = useState<IdsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [severityFilter, setSeverityFilter] = useState<string | undefined>(undefined);

  useEffect(() => {
    fetch("/api/network/ids")
      .then((r) => { if (!r.ok) throw new Error("Failed"); return r.json(); })
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <CyberLoading text="SCANNING FOR INTRUSIONS..." />;
  if (!data) return <div className="text-muted-foreground text-center py-12">Failed to load IDS data.</div>;

  const { intrusions, summary } = data;
  const filtered = severityFilter ? intrusions.filter((i) => i.severity === severityFilter) : intrusions;

  const severityColor = (s: string) => {
    switch (s) {
      case "critical": return "text-red-400";
      case "high": return "text-orange-400";
      case "medium": return "text-yellow-400";
      case "low": return "text-green-400";
      default: return "text-muted-foreground";
    }
  };

  const summaryCards = [
    { label: "Total Intrusions", value: summary.totalIntrusions, icon: Fingerprint, color: "text-primary" },
    { label: "Blocked", value: summary.blockedCount, icon: Ban, color: "text-red-400" },
    { label: "Alerted", value: summary.alertedCount, icon: AlertTriangle, color: "text-yellow-400" },
    { label: "Critical", value: summary.criticalCount, icon: ShieldAlert, color: "text-red-400" },
    { label: "Unique Attackers", value: summary.uniqueAttackers, icon: Target, color: "text-orange-400" },
  ];

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
        {summaryCards.map((card) => (
          <div key={card.label} className="glass-panel p-4 rounded-xl border border-white/5">
            <div className="flex items-center gap-2 mb-2">
              <card.icon className={`w-4 h-4 ${card.color}`} />
              <span className="text-[10px] font-display uppercase tracking-widest text-muted-foreground">{card.label}</span>
            </div>
            <p className={`text-2xl font-mono font-bold ${card.color}`}>{card.value}</p>
          </div>
        ))}
      </div>

      <div className="glass-panel p-4 rounded-xl mb-6">
        <h3 className="text-[10px] font-display uppercase tracking-widest text-muted-foreground mb-3">Attack Categories</h3>
        <div className="flex flex-wrap gap-2">
          {Object.entries(summary.categories).map(([cat, count]) => {
            const CatIcon = CATEGORY_ICONS[cat] || Shield;
            return (
              <div key={cat} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/20 border border-white/5">
                <CatIcon className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-display uppercase text-white">{CATEGORY_LABELS[cat] || cat}</span>
                <span className="text-xs font-mono text-muted-foreground">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        {[undefined, "critical", "high", "medium", "low"].map((s) => (
          <button
            key={s ?? "all"}
            onClick={() => setSeverityFilter(s)}
            className={clsx(
              "px-3 py-1.5 rounded-lg text-xs font-display uppercase tracking-wider border transition-colors",
              severityFilter === s
                ? "bg-primary/20 border-primary/50 text-primary"
                : "border-white/10 text-muted-foreground hover:border-white/20"
            )}
          >
            {s ?? "All"}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map((intrusion) => {
          const isExpanded = expandedId === intrusion.id;
          const CatIcon = CATEGORY_ICONS[intrusion.category] || Shield;

          return (
            <motion.div
              key={intrusion.id}
              layout
              className={`glass-panel rounded-xl border-l-4 overflow-hidden ${
                intrusion.severity === "critical" ? "border-red-500" :
                intrusion.severity === "high" ? "border-orange-400" :
                intrusion.severity === "medium" ? "border-yellow-400" : "border-blue-400"
              }`}
            >
              <button
                onClick={() => setExpandedId(isExpanded ? null : intrusion.id)}
                className="w-full p-4 flex items-center gap-4 text-left hover:bg-white/[0.02] transition-colors"
              >
                <div className={`p-2.5 rounded-xl ${
                  intrusion.severity === "critical" ? "bg-red-500/15" :
                  intrusion.severity === "high" ? "bg-orange-500/10" : "bg-primary/10"
                }`}>
                  <CatIcon className={`w-5 h-5 ${severityColor(intrusion.severity)}`} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-sm font-mono font-bold text-white">{intrusion.attackType}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-display uppercase font-bold ${severityColor(intrusion.severity)} border-current/30`}>
                      {intrusion.severity}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded border font-display uppercase ${
                      intrusion.action === "blocked" ? "bg-red-500/20 text-red-400 border-red-500/30" : "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                    }`}>
                      {intrusion.action}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-mono text-primary/80">{intrusion.sourceIp}:{intrusion.sourcePort}</span>
                    <ArrowRight className="w-3 h-3" />
                    <span className="font-mono">{intrusion.destinationIp}:{intrusion.destinationPort}</span>
                    <span className="mx-1">|</span>
                    <span>{intrusion.protocol}</span>
                    <span className="mx-1">|</span>
                    <Globe className="w-3 h-3" />
                    <span>{intrusion.country}</span>
                    <span className="mx-1">|</span>
                    <span>{format(new Date(intrusion.timestamp), "MMM d, HH:mm")}</span>
                  </div>
                </div>

                <div className="text-right flex items-center gap-3">
                  <div>
                    <span className="text-[10px] font-display uppercase tracking-widest text-muted-foreground block">Confidence</span>
                    <span className={`text-lg font-mono font-bold ${intrusion.confidence > 0.95 ? "text-red-400" : intrusion.confidence > 0.85 ? "text-orange-400" : "text-yellow-400"}`}>
                      {(intrusion.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </div>
              </button>

              {isExpanded && (
                <div className="px-4 pb-4 border-t border-white/5 pt-4 space-y-3">
                  <div className="p-3 rounded-lg bg-black/30 border border-white/5">
                    <div className="flex items-center gap-2 mb-2">
                      <Fingerprint className="w-3.5 h-3.5 text-primary" />
                      <span className="text-[10px] font-display uppercase tracking-widest text-muted-foreground">Signature</span>
                    </div>
                    <p className="text-xs font-mono text-white">{intrusion.signature}</p>
                    <p className="text-[10px] text-muted-foreground mt-1 font-mono">{intrusion.signatureId}</p>
                  </div>

                  <div className="p-3 rounded-lg bg-black/30 border border-white/5">
                    <div className="flex items-center gap-2 mb-2">
                      <Eye className="w-3.5 h-3.5 text-primary" />
                      <span className="text-[10px] font-display uppercase tracking-widest text-muted-foreground">Payload / Detail</span>
                    </div>
                    <p className="text-xs text-gray-300 font-mono break-all">{intrusion.payload}</p>
                  </div>

                  <div className="p-3 rounded-lg bg-black/30 border border-white/5">
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="w-3.5 h-3.5 text-primary" />
                      <span className="text-[10px] font-display uppercase tracking-widest text-muted-foreground">Matched Rule</span>
                    </div>
                    <p className="text-xs text-gray-300">{intrusion.matchedRule}</p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-2 rounded-lg bg-black/20 border border-white/5">
                      <span className="text-[10px] font-display uppercase tracking-widest text-muted-foreground block">Category</span>
                      <span className="text-xs font-mono text-white">{CATEGORY_LABELS[intrusion.category] || intrusion.category}</span>
                    </div>
                    <div className="p-2 rounded-lg bg-black/20 border border-white/5">
                      <span className="text-[10px] font-display uppercase tracking-widest text-muted-foreground block">Sessions</span>
                      <span className="text-xs font-mono text-white">{intrusion.sessionsAffected.toLocaleString()}</span>
                    </div>
                    <div className="p-2 rounded-lg bg-black/20 border border-white/5">
                      <span className="text-[10px] font-display uppercase tracking-widest text-muted-foreground block">Packets Inspected</span>
                      <span className="text-xs font-mono text-white">{intrusion.packetsInspected.toLocaleString()}</span>
                    </div>
                    <div className="p-2 rounded-lg bg-black/20 border border-white/5">
                      <span className="text-[10px] font-display uppercase tracking-widest text-muted-foreground block">Protocol</span>
                      <span className="text-xs font-mono text-primary">{intrusion.protocol}</span>
                    </div>
                  </div>

                  {intrusion.relatedCves.length > 0 && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-display uppercase tracking-widest text-muted-foreground">Related CVEs:</span>
                      {intrusion.relatedCves.map((cve) => (
                        <span key={cve} className="text-xs font-mono px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20">{cve}</span>
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
            <Shield className="w-8 h-8 mx-auto mb-3 text-green-400" />
            <p className="font-display text-sm uppercase tracking-wider">No intrusions match this filter</p>
          </div>
        )}
      </div>
    </>
  );
}
