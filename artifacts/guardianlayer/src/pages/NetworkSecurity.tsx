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
  Search,
  Tag,
  Clock,
  Hash,
  Lock,
  MapPin,
  Wifi,
  UserCheck,
  ArrowUpDown,
  CheckCircle,
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
type Tab = "events" | "ids" | "dns" | "vpn";

export default function NetworkSecurity() {
  const [activeTab, setActiveTab] = useState<Tab>("events");

  const tabs: { id: Tab; label: string; icon: typeof Network }[] = [
    { id: "events", label: "Events Monitor", icon: Radar },
    { id: "ids", label: "Intrusion Detection", icon: Fingerprint },
    { id: "dns", label: "DNS Security", icon: Search },
    { id: "vpn", label: "VPN & Zero-Trust", icon: Lock },
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
      {activeTab === "dns" && <DnsSecurityPanel />}
      {activeTab === "vpn" && <VpnZeroTrustPanel />}
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

interface DnsQuery {
  id: number;
  timestamp: string;
  queryDomain: string;
  queryType: string;
  sourceIp: string;
  hostname: string;
  user: string;
  threatType: string;
  severity: string;
  action: string;
  confidence: number;
  detail: string;
  resolvedIp: string;
  ttl: number;
  queryCount: number;
  firstSeen: string;
  threatIntelSource: string;
  iocTags: string[];
}

interface DnsData {
  queries: DnsQuery[];
  summary: {
    totalQueries: number;
    blockedQueries: number;
    alertedQueries: number;
    criticalThreats: number;
    threatTypes: Record<string, number>;
  };
}

const THREAT_TYPE_CONFIG: Record<string, { label: string; color: string; icon: typeof Network }> = {
  c2_beacon: { label: "C2 Beacon", color: "text-red-400", icon: Radar },
  dns_tunneling: { label: "DNS Tunneling", color: "text-red-400", icon: Activity },
  malicious_domain: { label: "Malicious Domain", color: "text-orange-400", icon: ShieldAlert },
  fast_flux: { label: "Fast-Flux", color: "text-orange-400", icon: Zap },
  dga_domain: { label: "DGA Domain", color: "text-yellow-400", icon: Hash },
  suspicious_ns: { label: "Suspicious NS", color: "text-yellow-400", icon: Search },
  clean: { label: "Clean", color: "text-green-400", icon: Shield },
};

function DnsSecurityPanel() {
  const [data, setData] = useState<DnsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [threatFilter, setThreatFilter] = useState<string | undefined>(undefined);

  useEffect(() => {
    fetch("/api/network/dns-security")
      .then((r) => { if (!r.ok) throw new Error("Failed"); return r.json(); })
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <CyberLoading text="ANALYZING DNS QUERIES..." />;
  if (!data) return <div className="text-muted-foreground text-center py-12">Failed to load DNS security data.</div>;

  const { queries, summary } = data;
  const filtered = threatFilter ? queries.filter((q) => q.threatType === threatFilter) : queries;

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
    { label: "Total Queries", value: summary.totalQueries, icon: Search, color: "text-primary" },
    { label: "Blocked", value: summary.blockedQueries, icon: Ban, color: "text-red-400" },
    { label: "Alerted", value: summary.alertedQueries, icon: AlertTriangle, color: "text-yellow-400" },
    { label: "Critical Threats", value: summary.criticalThreats, icon: ShieldAlert, color: "text-red-400" },
  ];

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
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
        <h3 className="text-[10px] font-display uppercase tracking-widest text-muted-foreground mb-3">Threat Types Detected</h3>
        <div className="flex flex-wrap gap-2">
          {Object.entries(summary.threatTypes).map(([type, count]) => {
            const cfg = THREAT_TYPE_CONFIG[type] || { label: type, color: "text-muted-foreground", icon: Network };
            return (
              <div key={type} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/20 border border-white/5">
                <cfg.icon className={`w-3.5 h-3.5 ${cfg.color}`} />
                <span className="text-xs font-display uppercase text-white">{cfg.label}</span>
                <span className="text-xs font-mono text-muted-foreground">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        <button
          onClick={() => setThreatFilter(undefined)}
          className={clsx(
            "px-3 py-1.5 rounded-lg text-xs font-display uppercase tracking-wider border transition-colors",
            !threatFilter ? "bg-primary/20 border-primary/50 text-primary" : "border-white/10 text-muted-foreground hover:border-white/20"
          )}
        >
          All
        </button>
        {Object.entries(THREAT_TYPE_CONFIG).filter(([k]) => k !== "clean").map(([key, cfg]) => (
          <button
            key={key}
            onClick={() => setThreatFilter(key)}
            className={clsx(
              "px-3 py-1.5 rounded-lg text-xs font-display uppercase tracking-wider border transition-colors",
              threatFilter === key ? "bg-primary/20 border-primary/50 text-primary" : "border-white/10 text-muted-foreground hover:border-white/20"
            )}
          >
            {cfg.label}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map((query) => {
          const isExpanded = expandedId === query.id;
          const cfg = THREAT_TYPE_CONFIG[query.threatType] || { label: query.threatType, color: "text-muted-foreground", icon: Network };
          const ThreatIcon = cfg.icon;

          return (
            <motion.div
              key={query.id}
              layout
              className={`glass-panel rounded-xl border-l-4 overflow-hidden ${
                query.severity === "critical" ? "border-red-500" :
                query.severity === "high" ? "border-orange-400" :
                query.severity === "medium" ? "border-yellow-400" : "border-green-400"
              }`}
            >
              <button
                onClick={() => setExpandedId(isExpanded ? null : query.id)}
                className="w-full p-4 flex items-center gap-4 text-left hover:bg-white/[0.02] transition-colors"
              >
                <div className={`p-2.5 rounded-xl ${
                  query.severity === "critical" ? "bg-red-500/15" :
                  query.severity === "high" ? "bg-orange-500/10" :
                  query.severity === "medium" ? "bg-yellow-500/10" : "bg-green-500/10"
                }`}>
                  <ThreatIcon className={`w-5 h-5 ${cfg.color}`} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-sm font-mono font-bold text-white truncate">{query.queryDomain}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-display uppercase font-bold ${severityColor(query.severity)} border-current/30`}>
                      {query.severity}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded border font-display uppercase ${
                      query.action === "blocked" ? "bg-red-500/20 text-red-400 border-red-500/30" :
                      query.action === "alerted" ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" :
                      "bg-green-500/20 text-green-400 border-green-500/30"
                    }`}>
                      {query.action}
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border border-white/10 font-display uppercase ${cfg.color}`}>
                      {cfg.label}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    <span className="text-primary/80 font-mono">{query.hostname}</span>
                    <span className="mx-2">|</span>
                    {query.user}
                    <span className="mx-2">|</span>
                    <span className="font-mono">{query.queryType}</span>
                    <span className="mx-2">|</span>
                    {query.queryCount.toLocaleString()} queries
                    <span className="mx-2">|</span>
                    {format(new Date(query.timestamp), "MMM d, HH:mm")}
                  </p>
                </div>

                <div className="text-right flex items-center gap-3">
                  <div>
                    <span className="text-[10px] font-display uppercase tracking-widest text-muted-foreground block">Confidence</span>
                    <span className={`text-lg font-mono font-bold ${query.confidence > 0.9 ? "text-red-400" : query.confidence > 0.7 ? "text-orange-400" : "text-yellow-400"}`}>
                      {(query.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </div>
              </button>

              {isExpanded && (
                <div className="px-4 pb-4 border-t border-white/5 pt-4 space-y-3">
                  <p className="text-xs text-gray-300">{query.detail}</p>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-2 rounded-lg bg-black/20 border border-white/5">
                      <span className="text-[10px] font-display uppercase tracking-widest text-muted-foreground block">Resolved IP</span>
                      <span className="text-xs font-mono text-primary">{query.resolvedIp}</span>
                    </div>
                    <div className="p-2 rounded-lg bg-black/20 border border-white/5">
                      <span className="text-[10px] font-display uppercase tracking-widest text-muted-foreground block">Source IP</span>
                      <span className="text-xs font-mono text-white">{query.sourceIp}</span>
                    </div>
                    <div className="p-2 rounded-lg bg-black/20 border border-white/5">
                      <span className="text-[10px] font-display uppercase tracking-widest text-muted-foreground block">TTL</span>
                      <span className={`text-xs font-mono ${query.ttl < 120 ? "text-red-400" : "text-white"}`}>{query.ttl}s</span>
                    </div>
                    <div className="p-2 rounded-lg bg-black/20 border border-white/5">
                      <span className="text-[10px] font-display uppercase tracking-widest text-muted-foreground block">First Seen</span>
                      <span className="text-xs font-mono text-white">{format(new Date(query.firstSeen), "MMM d, HH:mm")}</span>
                    </div>
                  </div>

                  <div className="p-2 rounded-lg bg-black/20 border border-white/5">
                    <span className="text-[10px] font-display uppercase tracking-widest text-muted-foreground block mb-1">Threat Intel Source</span>
                    <span className="text-xs font-mono text-white">{query.threatIntelSource}</span>
                  </div>

                  {query.iocTags.length > 0 && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <Tag className="w-3.5 h-3.5 text-muted-foreground" />
                      {query.iocTags.map((tag) => (
                        <span key={tag} className="text-[10px] font-mono px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">{tag}</span>
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
            <p className="font-display text-sm uppercase tracking-wider">No DNS queries match this filter</p>
          </div>
        )}
      </div>
    </>
  );
}

interface PolicyViolation {
  policy: string;
  status: string;
  detail: string;
}

interface GeoAnomaly {
  type: string;
  previousLocation: string;
  currentLocation: string;
  timeBetween: string;
  distanceKm: number;
  confidence: number;
}

interface VpnSession {
  id: number;
  user: string;
  email: string;
  department: string;
  hostname: string;
  vpnStatus: string;
  vpnProtocol: string;
  vpnServer: string;
  assignedIp: string | null;
  publicIp: string;
  location: string;
  connectedSince: string | null;
  bandwidthUp: number;
  bandwidthDown: number;
  zeroTrustScore: number;
  zeroTrustStatus: string;
  policyViolations: PolicyViolation[];
  geoAnomaly: GeoAnomaly | null;
  lastAuthentication: string;
  sessionRisk: string;
}

interface VpnData {
  sessions: VpnSession[];
  summary: {
    totalSessions: number;
    activeSessions: number;
    compliantUsers: number;
    nonCompliantUsers: number;
    geoAnomalies: number;
    criticalSessions: number;
  };
}

function VpnZeroTrustPanel() {
  const [data, setData] = useState<VpnData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);

  useEffect(() => {
    fetch("/api/network/vpn-zerotrust")
      .then((r) => { if (!r.ok) throw new Error("Failed"); return r.json(); })
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <CyberLoading text="VERIFYING ZERO-TRUST POLICIES..." />;
  if (!data) return <div className="text-muted-foreground text-center py-12">Failed to load VPN/Zero-Trust data.</div>;

  const { sessions, summary } = data;
  const filtered = statusFilter ? sessions.filter((s) => s.zeroTrustStatus === statusFilter) : sessions;

  const formatBytes = (bytes: number) => {
    if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
    if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(0)} MB`;
    return `${(bytes / 1e3).toFixed(0)} KB`;
  };

  const riskColor = (r: string) => {
    switch (r) {
      case "critical": return "text-red-400";
      case "high": return "text-orange-400";
      case "medium": return "text-yellow-400";
      case "low": return "text-green-400";
      default: return "text-muted-foreground";
    }
  };

  const trustColor = (score: number) => score >= 0.8 ? "text-green-400" : score >= 0.5 ? "text-yellow-400" : "text-red-400";

  const summaryCards = [
    { label: "Total Users", value: summary.totalSessions, icon: UserCheck, color: "text-primary" },
    { label: "Active VPN", value: summary.activeSessions, icon: Wifi, color: "text-green-400" },
    { label: "Compliant", value: summary.compliantUsers, icon: CheckCircle, color: "text-green-400" },
    { label: "Non-Compliant", value: summary.nonCompliantUsers, icon: ShieldAlert, color: "text-red-400" },
    { label: "Geo Anomalies", value: summary.geoAnomalies, icon: MapPin, color: "text-orange-400" },
    { label: "Critical Risk", value: summary.criticalSessions, icon: AlertTriangle, color: "text-red-400" },
  ];

  const filterButtons: { label: string; value: string | undefined }[] = [
    { label: "All", value: undefined },
    { label: "Compliant", value: "compliant" },
    { label: "At Risk", value: "at_risk" },
    { label: "Non-Compliant", value: "non_compliant" },
  ];

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
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

      <div className="flex gap-2 mb-6 flex-wrap">
        {filterButtons.map((btn) => (
          <button
            key={btn.label}
            onClick={() => setStatusFilter(btn.value)}
            className={clsx(
              "px-3 py-1.5 rounded-lg text-xs font-display uppercase tracking-wider border transition-colors",
              statusFilter === btn.value
                ? "bg-primary/20 border-primary/50 text-primary"
                : "border-white/10 text-muted-foreground hover:border-white/20"
            )}
          >
            {btn.label}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map((session) => {
          const isExpanded = expandedId === session.id;
          const isConnected = session.vpnStatus === "connected";

          return (
            <motion.div
              key={session.id}
              layout
              className={`glass-panel rounded-xl border-l-4 overflow-hidden ${
                session.sessionRisk === "critical" ? "border-red-500" :
                session.sessionRisk === "high" ? "border-orange-400" :
                session.sessionRisk === "medium" ? "border-yellow-400" : "border-green-400"
              }`}
            >
              <button
                onClick={() => setExpandedId(isExpanded ? null : session.id)}
                className="w-full p-4 flex items-center gap-4 text-left hover:bg-white/[0.02] transition-colors"
              >
                <div className={`relative p-2.5 rounded-xl ${isConnected ? "bg-green-500/10" : "bg-white/5"}`}>
                  <Wifi className={`w-5 h-5 ${isConnected ? "text-green-400" : "text-muted-foreground"}`} />
                  {session.geoAnomaly && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-background animate-pulse" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-sm font-mono font-bold text-white">{session.user}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-display uppercase font-bold ${
                      isConnected ? "text-green-400 border-green-400/30" : "text-muted-foreground border-white/20"
                    }`}>
                      {session.vpnStatus}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded border font-display uppercase ${
                      session.zeroTrustStatus === "compliant" ? "bg-green-500/20 text-green-400 border-green-500/30" :
                      session.zeroTrustStatus === "at_risk" ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" :
                      "bg-red-500/20 text-red-400 border-red-500/30"
                    }`}>
                      {session.zeroTrustStatus.replace(/_/g, " ")}
                    </span>
                    {session.geoAnomaly && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 font-display uppercase animate-pulse">Geo Anomaly</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    <span className="text-primary/80 font-mono">{session.hostname}</span>
                    <span className="mx-2">|</span>
                    {session.department}
                    <span className="mx-2">|</span>
                    <MapPin className="w-3 h-3 inline" /> {session.location}
                    <span className="mx-2">|</span>
                    {session.vpnProtocol}
                    {session.policyViolations.length > 0 && (
                      <><span className="mx-2">|</span><span className="text-red-400">{session.policyViolations.length} violation{session.policyViolations.length > 1 ? "s" : ""}</span></>
                    )}
                  </p>
                </div>

                <div className="text-right flex items-center gap-3">
                  <div>
                    <span className="text-[10px] font-display uppercase tracking-widest text-muted-foreground block">Trust Score</span>
                    <span className={`text-lg font-mono font-bold ${trustColor(session.zeroTrustScore)}`}>
                      {(session.zeroTrustScore * 100).toFixed(0)}%
                    </span>
                  </div>
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </div>
              </button>

              {isExpanded && (
                <div className="px-4 pb-4 border-t border-white/5 pt-4 space-y-3">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-2 rounded-lg bg-black/20 border border-white/5">
                      <span className="text-[10px] font-display uppercase tracking-widest text-muted-foreground block">VPN Server</span>
                      <span className="text-xs font-mono text-white">{session.vpnServer}</span>
                    </div>
                    <div className="p-2 rounded-lg bg-black/20 border border-white/5">
                      <span className="text-[10px] font-display uppercase tracking-widest text-muted-foreground block">Public IP</span>
                      <span className="text-xs font-mono text-primary">{session.publicIp}</span>
                    </div>
                    <div className="p-2 rounded-lg bg-black/20 border border-white/5">
                      <span className="text-[10px] font-display uppercase tracking-widest text-muted-foreground block">Assigned IP</span>
                      <span className="text-xs font-mono text-white">{session.assignedIp || "—"}</span>
                    </div>
                    <div className="p-2 rounded-lg bg-black/20 border border-white/5">
                      <span className="text-[10px] font-display uppercase tracking-widest text-muted-foreground block">Session Risk</span>
                      <span className={`text-xs font-mono font-bold uppercase ${riskColor(session.sessionRisk)}`}>{session.sessionRisk}</span>
                    </div>
                  </div>

                  {isConnected && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <div className="p-2 rounded-lg bg-black/20 border border-white/5">
                        <span className="text-[10px] font-display uppercase tracking-widest text-muted-foreground block">Connected Since</span>
                        <span className="text-xs font-mono text-white">{session.connectedSince ? format(new Date(session.connectedSince), "MMM d, HH:mm") : "—"}</span>
                      </div>
                      <div className="p-2 rounded-lg bg-black/20 border border-white/5">
                        <span className="text-[10px] font-display uppercase tracking-widest text-muted-foreground block flex items-center gap-1"><ArrowUpDown className="w-3 h-3" /> Upload</span>
                        <span className="text-xs font-mono text-white">{formatBytes(session.bandwidthUp)}</span>
                      </div>
                      <div className="p-2 rounded-lg bg-black/20 border border-white/5">
                        <span className="text-[10px] font-display uppercase tracking-widest text-muted-foreground block flex items-center gap-1"><ArrowUpDown className="w-3 h-3" /> Download</span>
                        <span className="text-xs font-mono text-white">{formatBytes(session.bandwidthDown)}</span>
                      </div>
                    </div>
                  )}

                  <div className="p-2 rounded-lg bg-black/20 border border-white/5">
                    <span className="text-[10px] font-display uppercase tracking-widest text-muted-foreground block">Last Authentication</span>
                    <span className="text-xs font-mono text-white">{format(new Date(session.lastAuthentication), "MMM d, HH:mm")}</span>
                  </div>

                  {session.geoAnomaly && (
                    <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                      <div className="flex items-center gap-2 mb-2">
                        <MapPin className="w-4 h-4 text-red-400" />
                        <span className="text-[10px] font-display uppercase tracking-widest text-red-400 font-bold">Geo Anomaly — {session.geoAnomaly.type.replace(/_/g, " ")}</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                        <div>
                          <span className="text-muted-foreground block">Previous</span>
                          <span className="font-mono text-white">{session.geoAnomaly.previousLocation}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block">Current</span>
                          <span className="font-mono text-red-400">{session.geoAnomaly.currentLocation}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block">Time Between</span>
                          <span className="font-mono text-red-400">{session.geoAnomaly.timeBetween}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block">Distance</span>
                          <span className="font-mono text-red-400">{session.geoAnomaly.distanceKm.toLocaleString()} km</span>
                        </div>
                      </div>
                      <p className="text-[10px] text-red-400/80 mt-2">Confidence: {(session.geoAnomaly.confidence * 100).toFixed(0)}%</p>
                    </div>
                  )}

                  {session.policyViolations.length > 0 && (
                    <div>
                      <h4 className="text-[10px] font-display uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-2">
                        <ShieldAlert className="w-3 h-3" /> Policy Violations
                      </h4>
                      <div className="space-y-1.5">
                        {session.policyViolations.map((v, i) => (
                          <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-black/20 border border-white/5">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-display uppercase font-bold ${
                              v.status === "fail" ? "text-red-400 bg-red-500/10" : "text-yellow-400 bg-yellow-500/10"
                            }`}>{v.status}</span>
                            <span className="text-xs text-white font-mono">{v.policy}</span>
                            <span className="text-xs text-muted-foreground flex-1">{v.detail}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {session.policyViolations.length === 0 && !session.geoAnomaly && (
                    <div className="text-center py-4 text-muted-foreground">
                      <CheckCircle className="w-5 h-5 mx-auto mb-1 text-green-400" />
                      <p className="text-xs font-display uppercase tracking-wider">All zero-trust policies satisfied</p>
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
            <p className="font-display text-sm uppercase tracking-wider">No sessions match this filter</p>
          </div>
        )}
      </div>
    </>
  );
}
