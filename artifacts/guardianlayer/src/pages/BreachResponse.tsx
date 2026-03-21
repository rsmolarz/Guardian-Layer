import { useState, useEffect } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { WhyThisMatters } from "@/components/clarity/WhyThisMatters";
import { ExecutiveSummary } from "@/components/clarity/ExecutiveSummary";
import {
  Shield,
  AlertTriangle,
  Clock,
  MapPin,
  Activity,
  Lock,
  Globe,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Zap,
} from "lucide-react";
import { IncidentReportGenerator } from "@/components/IncidentReportGenerator";

import { API_BASE } from "@/lib/constants";

interface TimelineEvent {
  timestamp: string;
  type: string;
  severity: string;
  title: string;
  detail: string;
  source: string;
}

interface BreachData {
  breachStatus: string;
  timeWindow: { hours: number; since: string };
  summary: {
    totalAnomalies: number;
    criticalCount: number;
    highCount: number;
    affectedIps: number;
    affectedEndpoints: number;
    networkEvents: number;
    lockdownsTriggered: number;
    activeLockdown: boolean;
  };
  typeBreakdown: Record<string, number>;
  timeline: TimelineEvent[];
  affectedIps: string[];
  affectedEndpoints: string[];
  anomalies: any[];
  lockdownSessions: any[];
}

function severityColor(severity: string): string {
  switch (severity) {
    case "critical": return "text-red-400";
    case "high": return "text-orange-400";
    case "medium": return "text-yellow-400";
    case "low": return "text-blue-400";
    default: return "text-gray-400";
  }
}

function severityBg(severity: string): string {
  switch (severity) {
    case "critical": return "bg-red-500/20 border-red-500/30";
    case "high": return "bg-orange-500/20 border-orange-500/30";
    case "medium": return "bg-yellow-500/20 border-yellow-500/30";
    case "low": return "bg-blue-500/20 border-blue-500/30";
    default: return "bg-gray-500/20 border-gray-500/30";
  }
}

function statusBadge(status: string) {
  const styles: Record<string, string> = {
    active: "bg-red-500/20 text-red-400 border border-red-500/30",
    contained: "bg-orange-500/20 text-orange-400 border border-orange-500/30",
    monitoring: "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30",
    clear: "bg-green-500/20 text-green-400 border border-green-500/30",
  };
  const labels: Record<string, string> = {
    active: "BREACH ACTIVE",
    contained: "CONTAINED",
    monitoring: "MONITORING",
    clear: "ALL CLEAR",
  };
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${styles[status] || styles.clear}`}>
      {labels[status] || status}
    </span>
  );
}

function formatTime(ts: string): string {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function formatDate(ts: string): string {
  const d = new Date(ts);
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function BreachResponse() {
  const [data, setData] = useState<BreachData | null>(null);
  const [loading, setLoading] = useState(true);
  const [hours, setHours] = useState(24);
  const [expandedEvents, setExpandedEvents] = useState<Set<number>>(new Set());
  const [filterSeverity, setFilterSeverity] = useState<string>("all");

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/breach/incidents?hours=${hours}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json.summary) setData(json);
    } catch (err) {
      console.error("Failed to fetch breach data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [hours]);

  useEffect(() => {
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [hours]);

  const toggleEvent = (idx: number) => {
    setExpandedEvents((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const filteredTimeline = data?.timeline.filter(
    (e) => filterSeverity === "all" || e.severity === filterSeverity
  ) || [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Breach Incident Response"
        description="Real-time breach detection, timeline analysis, and incident forensics."
      />

      <div className="space-y-3">
        <WhyThisMatters explanation="When a security breach happens, speed matters. This page shows you everything that has happened during a breach — what was attacked, which systems were affected, and the full timeline. Use it to understand what happened, what is still happening, and what you need to do next." />
        <ExecutiveSummary
          title="Breach Response"
          sections={[
            { heading: "What This Page Shows", content: "A real-time view of security incidents detected by the system. You'll see a timeline of events, which IP addresses and systems were involved, and whether the breach is still active or has been contained." },
            { heading: "What the Status Badges Mean", content: "BREACH ACTIVE means an attack is currently happening and needs immediate attention. CONTAINED means the attack has been stopped but you should review what happened. MONITORING means the system is watching for follow-up attacks. ALL CLEAR means no active threats were detected in the selected time window." },
            { heading: "What To Do", content: "If the status shows ACTIVE: go to Emergency Lockdown immediately to freeze all accounts. If CONTAINED: review the timeline to understand what happened and check if any data was exposed. If ALL CLEAR: no action needed, but review the timeline periodically to stay informed." },
            { heading: "Time Window", content: "Use the time buttons (1h, 6h, 12h, 24h, 48h, 7d) to look at different periods. A wider window shows more history. Narrow it down when investigating a specific incident." },
          ]}
        />
      </div>

      {data?.summary.activeLockdown && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex items-center gap-3 animate-pulse">
          <Lock className="h-5 w-5 text-red-400" />
          <span className="text-red-400 font-semibold">Emergency lockdown is currently active.</span>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {data && statusBadge(data.breachStatus)}
          <select
            value={hours}
            onChange={(e) => setHours(Number(e.target.value))}
            className="bg-gray-800 border border-gray-700 text-gray-300 px-3 py-1.5 rounded-md text-sm"
          >
            <option value={1}>Last 1 hour</option>
            <option value={6}>Last 6 hours</option>
            <option value={12}>Last 12 hours</option>
            <option value={24}>Last 24 hours</option>
            <option value={48}>Last 48 hours</option>
            <option value={72}>Last 72 hours</option>
          </select>
        </div>
        <button onClick={fetchData} disabled={loading} className="flex items-center gap-2 bg-gray-800 border border-gray-700 px-3 py-1.5 rounded-md text-sm text-gray-300 hover:bg-gray-700">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {data && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {[
            { label: "Anomalies", value: data.summary.totalAnomalies, icon: Zap, color: "text-purple-400" },
            { label: "Critical", value: data.summary.criticalCount, icon: AlertTriangle, color: "text-red-400" },
            { label: "High", value: data.summary.highCount, icon: AlertTriangle, color: "text-orange-400" },
            { label: "Affected IPs", value: data.summary.affectedIps, icon: Globe, color: "text-cyan-400" },
            { label: "Endpoints Hit", value: data.summary.affectedEndpoints, icon: MapPin, color: "text-blue-400" },
            { label: "Network Events", value: data.summary.networkEvents, icon: Activity, color: "text-green-400" },
            { label: "Lockdowns", value: data.summary.lockdownsTriggered, icon: Lock, color: "text-red-400" },
          ].map((stat, i) => (
            <div key={i} className="bg-gray-900/50 border border-gray-800 rounded-lg p-3 text-center">
              <stat.icon className={`h-4 w-4 mx-auto mb-1 ${stat.color}`} />
              <div className="text-xl font-bold text-white">{stat.value}</div>
              <div className="text-xs text-gray-500">{stat.label}</div>
            </div>
          ))}
        </div>
      )}

      {data && Object.keys(data.typeBreakdown).length > 0 && (
        <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-400 mb-3">Attack Type Breakdown</h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(data.typeBreakdown).map(([type, count]) => (
              <span key={type} className="bg-gray-800 border border-gray-700 px-3 py-1 rounded-full text-xs text-gray-300">
                {type.replace(/_/g, " ")} <span className="text-white font-bold ml-1">{count}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {data && data.affectedIps.length > 0 && (
        <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
            <Globe className="h-4 w-4" /> Affected IP Addresses
          </h3>
          <div className="flex flex-wrap gap-2">
            {data.affectedIps.map((ip) => (
              <span key={ip} className="bg-red-500/10 border border-red-500/20 px-3 py-1 rounded-full text-xs text-red-400 font-mono">
                {ip}
              </span>
            ))}
          </div>
        </div>
      )}

      {data && <IncidentReportGenerator data={data} hours={hours} />}

      <div className="bg-gray-900/50 border border-gray-800 rounded-lg overflow-hidden">
        <div className="p-4 border-b border-gray-800 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-400 flex items-center gap-2">
            <Clock className="h-4 w-4" /> Incident Timeline
            <span className="text-gray-600">({filteredTimeline.length} events)</span>
          </h3>
          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
            className="bg-gray-800 border border-gray-700 text-gray-300 px-2 py-1 rounded text-xs"
          >
            <option value="all">All Severity</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>

        <div className="max-h-[500px] overflow-y-auto divide-y divide-gray-800/50">
          {loading && !data ? (
            <div className="p-8 text-center text-gray-500">Loading incident data...</div>
          ) : filteredTimeline.length === 0 ? (
            <div className="p-8 text-center text-gray-500 flex flex-col items-center gap-2">
              <Shield className="h-8 w-8 text-green-500/50" />
              <span>No incidents detected in this time window.</span>
            </div>
          ) : (
            filteredTimeline.map((event, idx) => (
              <div
                key={idx}
                className="p-3 hover:bg-gray-800/30 cursor-pointer transition-colors"
                onClick={() => toggleEvent(idx)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      event.severity === "critical" ? "bg-red-400" :
                      event.severity === "high" ? "bg-orange-400" :
                      event.severity === "medium" ? "bg-yellow-400" : "bg-blue-400"
                    }`} />
                    <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${severityBg(event.severity)} ${severityColor(event.severity)}`}>
                      {event.type}
                    </span>
                    <span className="text-sm text-gray-300 truncate">{event.title}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                    <span className="text-xs text-gray-500">{timeAgo(event.timestamp)}</span>
                    {expandedEvents.has(idx) ? (
                      <ChevronUp className="h-3 w-3 text-gray-600" />
                    ) : (
                      <ChevronDown className="h-3 w-3 text-gray-600" />
                    )}
                  </div>
                </div>
                {expandedEvents.has(idx) && (
                  <div className="mt-2 ml-5 pl-3 border-l border-gray-700 space-y-1">
                    <p className="text-xs text-gray-400">{event.detail}</p>
                    <div className="flex items-center gap-4 text-xs text-gray-600">
                      <span>Source: {event.source}</span>
                      <span>{formatDate(event.timestamp)} {formatTime(event.timestamp)}</span>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
