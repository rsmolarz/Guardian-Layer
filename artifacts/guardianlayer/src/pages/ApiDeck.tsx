import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { clsx } from "clsx";
import { format } from "date-fns";
import {
  Radio,
  Activity,
  Send,
  Server,
  Clock,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  AlertTriangle,
  Zap,
  Globe,
  Shield,
  Play,
  Copy,
  Terminal,
  Layers,
  Cpu,
  HardDrive,
  Users,
  Rocket,
  Key,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Loader2,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { CyberLoading } from "@/components/ui/CyberLoading";
import { WhyThisMatters } from "@/components/clarity/WhyThisMatters";
import { ExecutiveSummary } from "@/components/clarity/ExecutiveSummary";

const API_BASE = "";

const METHOD_BADGE: Record<string, string> = {
  GET: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  POST: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  PUT: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  DELETE: "bg-rose-500/20 text-rose-400 border-rose-500/30",
  PATCH: "bg-violet-500/20 text-violet-400 border-violet-500/30",
};

const EVENT_TYPE_COLORS: Record<string, string> = {
  task_requested: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  task_started: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  task_progress: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
  task_completed: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  task_failed: "bg-rose-500/20 text-rose-400 border-rose-500/30",
  agent_online: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  agent_offline: "bg-rose-500/20 text-rose-400 border-rose-500/30",
  deployment_started: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  deployment_finished: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  backup_started: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  backup_completed: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  backup_failed: "bg-rose-500/20 text-rose-400 border-rose-500/30",
};

interface GatewayRoute {
  method: string;
  path: string;
  description: string;
  auth: string;
  params?: string;
  body?: string;
}

interface GatewayStatus {
  status: string;
  uptime: number;
  eventBus: {
    totalPublished: number;
    totalDelivered: number;
    subscriberCount: number;
    recentEventsCount: number;
    subscribedTypes: string[];
  };
  totalPersistedEvents: number;
  recentEvents: Array<{
    type: string;
    payload: any;
    source: string;
    timestamp: string;
  }>;
}

interface EventEntry {
  id: number;
  eventType: string;
  payload: any;
  sourceService: string;
  createdAt: string;
}

type DeckTab = "routes" | "status" | "events" | "publish" | "api-keys";

export default function ApiDeck() {
  const [tab, setTab] = useState<DeckTab>("routes");

  return (
    <div className="pb-12">
      <PageHeader
        title="API Gateway"
        description="Your central control panel for all system communication. See every connection, monitor live events, and test integrations."
      />

      <div className="mb-6 space-y-3">
        <WhyThisMatters explanation="The API Gateway is the central hub that connects all parts of the security platform together. Every action — from detecting a threat to sending an alert — flows through here. This page lets you monitor that traffic, check that everything is connected, and troubleshoot if something stops working." />
        <ExecutiveSummary
          title="API Gateway"
          sections={[
            { heading: "Endpoints Tab", content: "Shows every available connection point in the system. Think of these like phone numbers — other systems call these endpoints to communicate. Each card shows what the endpoint does and how to use it." },
            { heading: "Gateway Status Tab", content: "A health check for the entire communication system. Shows how many events have been processed, how many listeners are active, and whether the gateway is working properly. Green 'OPERATIONAL' means everything is fine." },
            { heading: "Event Stream Tab", content: "A live feed of every event flowing through the system — like a security camera for data. You can filter by event type and see exactly what happened and when." },
            { heading: "Publish Event Tab", content: "Lets you manually send test events through the system. Use the quick presets to simulate common scenarios and verify the system responds correctly. This is mainly for testing and troubleshooting." },
          ]}
        />
      </div>

      <div className="mb-6 flex gap-1 glass-panel p-1.5 rounded-xl w-fit flex-wrap">
        {([
          { id: "routes" as DeckTab, label: "Endpoints", icon: Layers },
          { id: "api-keys" as DeckTab, label: "API Keys", icon: Key },
          { id: "status" as DeckTab, label: "Gateway Status", icon: Activity },
          { id: "events" as DeckTab, label: "Event Stream", icon: Radio },
          { id: "publish" as DeckTab, label: "Publish Event", icon: Send },
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

      {tab === "routes" && <RoutesPanel />}
      {tab === "api-keys" && <ApiKeysPanel />}
      {tab === "status" && <StatusPanel />}
      {tab === "events" && <EventStreamPanel />}
      {tab === "publish" && <PublishPanel />}
    </div>
  );
}

function RoutesPanel() {
  const [routes, setRoutes] = useState<GatewayRoute[]>([]);
  const [eventTypes, setEventTypes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/gateway/routes`)
      .then((r) => { if (!r.ok) throw new Error("Failed"); return r.json(); })
      .then((d) => {
        setRoutes(d.routes || []);
        setEventTypes(d.eventTypes || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <CyberLoading text="Loading API routes..." />;

  const routeIcons: Record<string, typeof Server> = {
    "/api/gateway/status": Activity,
    "/api/gateway/events": Radio,
    "/api/gateway/event": Send,
    "/api/gateway/task": Zap,
    "/api/gateway/agent/register": Users,
    "/api/gateway/deploy": Rocket,
    "/api/gateway/backup": HardDrive,
    "/api/gateway/routes": Globe,
  };

  return (
    <>
      <div className="space-y-3 mb-8">
        {routes.map((route, idx) => {
          const isExpanded = expandedIdx === idx;
          const Icon = routeIcons[route.path] || Server;

          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.04 }}
              className={clsx(
                "glass-panel rounded-xl border-l-4 overflow-hidden transition-colors",
                route.method === "GET" ? "border-emerald-500" : "border-blue-500"
              )}
            >
              <button
                onClick={() => setExpandedIdx(isExpanded ? null : idx)}
                className="w-full p-4 flex items-center gap-4 text-left hover:bg-white/[0.02] transition-colors"
              >
                <div className={clsx(
                  "p-2 rounded-lg bg-black/40 shrink-0",
                  route.method === "GET" ? "text-emerald-400" : "text-blue-400"
                )}>
                  <Icon className="w-5 h-5" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={`text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded border ${METHOD_BADGE[route.method] || ""}`}>
                      {route.method}
                    </span>
                    <span className="text-sm font-mono text-white">{route.path}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{route.description}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded border bg-white/5 border-white/10 text-muted-foreground">
                    {route.auth}
                  </span>
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </div>
              </button>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 border-t border-white/5 pt-3 space-y-3">
                      {route.params && (
                        <div>
                          <span className="text-[10px] font-display uppercase tracking-widest text-muted-foreground block mb-1">Query Parameters</span>
                          <code className="text-xs font-mono text-cyan-400 bg-black/40 px-3 py-1.5 rounded-lg border border-white/5 block">{route.params}</code>
                        </div>
                      )}
                      {route.body && (
                        <div>
                          <span className="text-[10px] font-display uppercase tracking-widest text-muted-foreground block mb-1">Request Body</span>
                          <code className="text-xs font-mono text-amber-400 bg-black/40 px-3 py-1.5 rounded-lg border border-white/5 block">{route.body}</code>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Terminal className="w-3 h-3 text-muted-foreground" />
                        <span className="text-[10px] font-display uppercase tracking-widest text-muted-foreground">cURL Example</span>
                      </div>
                      <div className="relative">
                        <code className="text-[11px] font-mono text-emerald-300 bg-black/60 px-3 py-2 rounded-lg border border-white/5 block break-all">
                          {route.method === "GET"
                            ? `curl -s ${route.path}${route.params ? route.params.split("?")[1] ? "?" + route.params.split("?")[1] : "" : ""}`
                            : `curl -X ${route.method} ${route.path} -H "Content-Type: application/json" -d '${route.body || "{}"}'`
                          }
                        </code>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigator.clipboard.writeText(
                              route.method === "GET"
                                ? `curl -s ${route.path}`
                                : `curl -X ${route.method} ${route.path} -H "Content-Type: application/json" -d '${route.body || "{}"}'`
                            );
                          }}
                          className="absolute top-2 right-2 p-1 rounded hover:bg-white/10 text-muted-foreground hover:text-white transition-colors"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      <div>
        <h3 className="font-display text-sm uppercase tracking-widest text-primary mb-4 flex items-center gap-2">
          <Radio className="w-4 h-4" />
          Supported Event Types
        </h3>
        <div className="flex flex-wrap gap-2">
          {eventTypes.map((type) => (
            <span
              key={type}
              className={`text-[10px] font-mono uppercase tracking-widest px-3 py-1.5 rounded-lg border ${EVENT_TYPE_COLORS[type] || "bg-white/5 text-muted-foreground border-white/10"}`}
            >
              {type}
            </span>
          ))}
        </div>
      </div>
    </>
  );
}

function StatusPanel() {
  const [data, setData] = useState<GatewayStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStatus = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const res = await fetch(`${API_BASE}/api/gateway/status`);
      if (!res.ok) throw new Error("Failed");
      setData(await res.json());
    } catch {
      if (!isRefresh) setData(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchStatus(); }, []);

  if (loading) return <CyberLoading text="Checking gateway status..." />;
  if (!data) return <div className="text-muted-foreground text-center py-12">Couldn't load gateway status.</div>;

  const uptimeHours = (data.uptime / 3600).toFixed(1);
  const uptimeMins = Math.floor(data.uptime / 60);

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div className={`glass-panel p-4 rounded-xl border-l-4 flex-1 ${
          data.status === "operational" ? "border-emerald-500 bg-emerald-500/5" : "border-rose-500 bg-rose-500/5"
        }`}>
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-lg bg-black/40 ${data.status === "operational" ? "text-emerald-400" : "text-rose-400"}`}>
              {data.status === "operational" ? <CheckCircle className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
            </div>
            <div>
              <h3 className="font-display text-lg uppercase tracking-wider text-white">
                Gateway: <span className={data.status === "operational" ? "text-emerald-400" : "text-rose-400"}>{data.status.toUpperCase()}</span>
              </h3>
              <p className="text-xs text-muted-foreground">
                Uptime: {uptimeHours}h ({uptimeMins} min) · {data.totalPersistedEvents} persisted events
              </p>
            </div>
          </div>
        </div>
        <button
          onClick={() => fetchStatus(true)}
          disabled={refreshing}
          className="ml-4 px-4 py-2 rounded-lg text-xs font-display uppercase tracking-wider border border-white/10 text-muted-foreground hover:text-white hover:border-white/20 transition-colors flex items-center gap-2"
        >
          <RefreshCw className={`w-3 h-3 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {[
          { label: "Events Published", value: data.eventBus.totalPublished, icon: Send, color: "text-blue-400" },
          { label: "Events Delivered", value: data.eventBus.totalDelivered, icon: CheckCircle, color: "text-emerald-400" },
          { label: "Active Subscribers", value: data.eventBus.subscriberCount, icon: Users, color: "text-cyan-400" },
          { label: "Persisted Events", value: data.totalPersistedEvents, icon: HardDrive, color: "text-primary" },
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

      {data.eventBus.subscribedTypes.length > 0 && (
        <div className="mb-8">
          <h3 className="font-display text-sm uppercase tracking-widest text-primary mb-3 flex items-center gap-2">
            <Cpu className="w-4 h-4" />
            Active Subscriptions
          </h3>
          <div className="flex flex-wrap gap-2">
            {data.eventBus.subscribedTypes.map((type) => (
              <span key={type} className={`text-[10px] font-mono uppercase tracking-widest px-3 py-1.5 rounded-lg border ${EVENT_TYPE_COLORS[type] || "bg-white/5 text-muted-foreground border-white/10"}`}>
                {type}
              </span>
            ))}
          </div>
        </div>
      )}

      {data.recentEvents.length > 0 && (
        <div>
          <h3 className="font-display text-sm uppercase tracking-widest text-primary mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Recent In-Memory Events
          </h3>
          <div className="glass-panel rounded-2xl overflow-hidden">
            <div className="max-h-[400px] overflow-y-auto">
              {data.recentEvents.map((evt, i) => (
                <div key={i} className="flex items-center gap-4 p-3 border-b border-white/5 last:border-b-0 hover:bg-white/[0.02] transition-colors">
                  <span className={`text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded border shrink-0 ${EVENT_TYPE_COLORS[evt.type] || "bg-white/5 text-muted-foreground border-white/10"}`}>
                    {evt.type}
                  </span>
                  <span className="text-xs font-mono text-muted-foreground shrink-0">{evt.source}</span>
                  <span className="text-xs text-muted-foreground truncate flex-1">{JSON.stringify(evt.payload).slice(0, 80)}</span>
                  <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                    {format(new Date(evt.timestamp), "HH:mm:ss")}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function EventStreamPanel() {
  const [events, setEvents] = useState<EventEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [availableTypes, setAvailableTypes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string | undefined>(undefined);
  const [page, setPage] = useState(0);
  const limit = 30;

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: String(limit), offset: String(page * limit) });
      if (typeFilter) params.set("type", typeFilter);
      const res = await fetch(`${API_BASE}/api/gateway/events?${params}`);
      if (!res.ok) throw new Error("Failed");
      const d = await res.json();
      setEvents(d.events || []);
      setTotal(d.total || 0);
      setAvailableTypes(d.availableTypes || []);
    } catch {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchEvents(); }, [typeFilter, page]);

  return (
    <>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => { setTypeFilter(undefined); setPage(0); }}
            className={clsx(
              "px-3 py-1.5 rounded-lg text-xs font-display uppercase tracking-wider border transition-colors",
              !typeFilter ? "bg-primary/20 border-primary/50 text-primary" : "border-white/10 text-muted-foreground hover:border-white/20"
            )}
          >
            All ({total})
          </button>
          {availableTypes.map((t) => (
            <button
              key={t}
              onClick={() => { setTypeFilter(t); setPage(0); }}
              className={clsx(
                "px-3 py-1.5 rounded-lg text-xs font-mono uppercase tracking-wider border transition-colors",
                typeFilter === t ? "bg-primary/20 border-primary/50 text-primary" : "border-white/10 text-muted-foreground hover:border-white/20"
              )}
            >
              {t}
            </button>
          ))}
        </div>
        <button
          onClick={fetchEvents}
          className="px-4 py-2 rounded-lg text-xs font-display uppercase tracking-wider border border-white/10 text-muted-foreground hover:text-white hover:border-white/20 transition-colors flex items-center gap-2"
        >
          <RefreshCw className="w-3 h-3" />
          Refresh
        </button>
      </div>

      {loading ? (
        <CyberLoading text="Loading events..." />
      ) : events.length === 0 ? (
        <div className="text-center py-12">
          <Radio className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="font-display text-sm uppercase tracking-wider text-muted-foreground">No Events Found</p>
          <p className="text-xs text-muted-foreground mt-1">Publish events via the gateway to see them here.</p>
        </div>
      ) : (
        <>
          <div className="glass-panel rounded-2xl overflow-hidden mb-4">
            <div className="max-h-[500px] overflow-y-auto">
              {events.map((evt) => (
                <div key={evt.id} className="p-4 border-b border-white/5 last:border-b-0 hover:bg-white/[0.02] transition-colors">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <span className="text-[10px] font-mono text-muted-foreground">#{evt.id}</span>
                    <span className={`text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded border ${EVENT_TYPE_COLORS[evt.eventType] || "bg-white/5 text-muted-foreground border-white/10"}`}>
                      {evt.eventType}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded border bg-white/5 border-white/10 text-muted-foreground">
                      {evt.sourceService}
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground ml-auto">
                      {format(new Date(evt.createdAt), "MMM dd, HH:mm:ss")}
                    </span>
                  </div>
                  <pre className="text-xs font-mono text-foreground/70 bg-black/20 rounded-lg p-2 overflow-x-auto max-h-24">
                    {JSON.stringify(evt.payload, null, 2)}
                  </pre>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-mono">
              Showing {page * limit + 1}-{Math.min((page + 1) * limit, total)} of {total}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
                className="px-3 py-1.5 rounded-lg text-xs font-display uppercase tracking-wider border border-white/10 text-muted-foreground hover:text-white disabled:opacity-30 transition-colors"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(page + 1)}
                disabled={(page + 1) * limit >= total}
                className="px-3 py-1.5 rounded-lg text-xs font-display uppercase tracking-wider border border-white/10 text-muted-foreground hover:text-white disabled:opacity-30 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}

function PublishPanel() {
  const [type, setType] = useState("task_requested");
  const [source, setSource] = useState("manual");
  const [payloadStr, setPayloadStr] = useState('{\n  "taskName": "example_task",\n  "priority": "normal"\n}');
  const [publishing, setPublishing] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const handlePublish = async () => {
    setPublishing(true);
    setResult(null);
    try {
      let payload: any;
      try {
        payload = JSON.parse(payloadStr);
      } catch {
        setResult({ success: false, message: "Invalid JSON in payload." });
        setPublishing(false);
        return;
      }

      const res = await fetch(`${API_BASE}/api/gateway/event`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, payload, source }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setResult({ success: true, message: `Event "${type}" published from "${source}".` });
    } catch (err: any) {
      setResult({ success: false, message: err.message || "Failed to publish event." });
    } finally {
      setPublishing(false);
    }
  };

  const presets = [
    { label: "Task Request", type: "task_requested", payload: '{\n  "taskName": "security_scan",\n  "priority": "high",\n  "assignee": "scanner_agent"\n}' },
    { label: "Agent Online", type: "agent_online", payload: '{\n  "agentId": "agent_001",\n  "agentName": "SecurityScanner",\n  "capabilities": ["scan", "report"]\n}' },
    { label: "Deployment", type: "deployment_started", payload: '{\n  "environment": "staging",\n  "version": "2.1.0",\n  "service": "api-server"\n}' },
    { label: "Backup", type: "backup_started", payload: '{\n  "targets": ["database", "config"],\n  "initiatedBy": "admin"\n}' },
  ];

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <span className="text-[10px] font-display uppercase tracking-widest text-muted-foreground block mb-2">Quick Presets</span>
        <div className="flex gap-2 flex-wrap">
          {presets.map((preset) => (
            <button
              key={preset.label}
              onClick={() => { setType(preset.type); setPayloadStr(preset.payload); }}
              className={clsx(
                "px-3 py-1.5 rounded-lg text-xs font-display uppercase tracking-wider border transition-colors",
                type === preset.type
                  ? "bg-primary/20 border-primary/50 text-primary"
                  : "border-white/10 text-muted-foreground hover:border-white/20 hover:text-white"
              )}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      <div className="glass-panel rounded-2xl p-6 space-y-4">
        <div>
          <label className="text-[10px] font-display uppercase tracking-widest text-muted-foreground block mb-2">Event Type</label>
          <input
            type="text"
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-sm font-mono text-white focus:border-primary/40 focus:outline-none"
          />
        </div>

        <div>
          <label className="text-[10px] font-display uppercase tracking-widest text-muted-foreground block mb-2">Source Service</label>
          <input
            type="text"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-sm font-mono text-white focus:border-primary/40 focus:outline-none"
          />
        </div>

        <div>
          <label className="text-[10px] font-display uppercase tracking-widest text-muted-foreground block mb-2">Payload (JSON)</label>
          <textarea
            value={payloadStr}
            onChange={(e) => setPayloadStr(e.target.value)}
            rows={6}
            className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-sm font-mono text-white focus:border-primary/40 focus:outline-none resize-none"
          />
        </div>

        {result && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-3 rounded-xl border ${result.success ? "bg-emerald-500/5 border-emerald-500/20" : "bg-rose-500/5 border-rose-500/20"}`}
          >
            <div className="flex items-center gap-2">
              {result.success ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-rose-400" />}
              <span className={`text-xs font-mono ${result.success ? "text-emerald-400" : "text-rose-400"}`}>{result.message}</span>
            </div>
          </motion.div>
        )}

        <button
          onClick={handlePublish}
          disabled={publishing || !type.trim() || !source.trim()}
          className="px-6 py-2 rounded-lg bg-primary/20 border border-primary/40 text-primary font-display text-xs uppercase tracking-widest hover:bg-primary/30 transition-all disabled:opacity-40 flex items-center gap-2"
        >
          {publishing ? (
            <>
              <div className="w-3 h-3 border-2 border-primary/40 border-t-primary rounded-full animate-spin" />
              Publishing...
            </>
          ) : (
            <>
              <Play className="w-3 h-3" />
              Publish Event
            </>
          )}
        </button>
      </div>
    </div>
  );
}

interface ApiKeyEntry {
  id: number;
  name: string;
  keyPrefix: string;
  scopes: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
  revoked: boolean;
  createdAt: string;
}

function ApiKeysPanel() {
  const [keys, setKeys] = useState<ApiKeyEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyScopes, setNewKeyScopes] = useState("read,write");
  const [newKeyExpiry, setNewKeyExpiry] = useState("90");
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [revealedKeyId, setRevealedKeyId] = useState<number | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [revoking, setRevoking] = useState<number | null>(null);
  const [showPinDialog, setShowPinDialog] = useState<number | null>(null);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");
  const [revealing, setRevealing] = useState(false);

  const fetchKeys = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API_BASE}/api/gateway/api-keys`);
      if (!r.ok) throw new Error("Failed");
      const d = await r.json();
      setKeys(d.keys || []);
    } catch {
      setKeys([]);
    }
    setLoading(false);
  };

  useEffect(() => { fetchKeys(); }, []);

  const handleCreate = async () => {
    if (!newKeyName.trim()) return;
    setCreating(true);
    try {
      const r = await fetch(`${API_BASE}/api/gateway/api-keys`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newKeyName.trim(),
          scopes: newKeyScopes,
          expiresInDays: newKeyExpiry ? parseInt(newKeyExpiry, 10) : undefined,
        }),
      });
      if (!r.ok) throw new Error("Failed");
      const d = await r.json();
      setRevealedKey(d.rawKey);
      setShowCreate(false);
      setNewKeyName("");
      fetchKeys();
    } catch {
      alert("Failed to create API key");
    }
    setCreating(false);
  };

  const handleRevoke = async (id: number) => {
    setRevoking(id);
    try {
      const r = await fetch(`${API_BASE}/api/gateway/api-keys/${id}`, { method: "DELETE" });
      if (!r.ok) throw new Error("Failed");
      fetchKeys();
    } catch {
      alert("Failed to revoke key");
    }
    setRevoking(null);
  };

  const copyKey = () => {
    if (revealedKey) {
      navigator.clipboard.writeText(revealedKey);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    }
  };

  const handleReveal = async (keyId: number) => {
    if (!pinInput.trim()) {
      setPinError("Enter your platform PIN");
      return;
    }
    setRevealing(true);
    setPinError("");
    try {
      const r = await fetch(`${API_BASE}/api/gateway/api-keys/${keyId}/reveal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: pinInput }),
      });
      const d = await r.json();
      if (!r.ok) {
        setPinError(d.error || "Failed to reveal key");
        setRevealing(false);
        return;
      }
      setRevealedKey(d.rawKey);
      setRevealedKeyId(keyId);
      setShowPinDialog(null);
      setPinInput("");
      setPinError("");
    } catch {
      setPinError("Failed to reveal key");
    }
    setRevealing(false);
  };

  const activeKeys = keys.filter(k => !k.revoked);
  const revokedKeys = keys.filter(k => k.revoked);

  if (loading) return <CyberLoading text="Loading API keys..." />;

  return (
    <div className="space-y-6">
      <AnimatePresence>
        {revealedKey && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="glass-panel rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-5"
          >
            <div className="flex items-center gap-2 mb-3">
              <Key className="w-5 h-5 text-emerald-400" />
              <h3 className="font-display text-sm uppercase tracking-widest text-emerald-400">API Key Created</h3>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              {revealedKeyId ? "Your full API key is shown below. Use your platform PIN to reveal it again anytime." : "Copy this key now. You can reveal it again later using your platform PIN."} Use it in the <code className="text-primary">Authorization</code> header as <code className="text-primary">Bearer {'<key>'}</code>.
            </p>
            <div className="flex items-center gap-2 bg-black/40 rounded-lg p-3 border border-white/10">
              <code className="flex-1 text-sm text-emerald-300 font-mono break-all select-all">{revealedKey}</code>
              <button
                onClick={copyKey}
                className="shrink-0 p-2 rounded-lg bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-white transition-colors"
              >
                {copiedKey ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <div className="mt-3 flex justify-end">
              <button
                onClick={() => { setRevealedKey(null); setRevealedKeyId(null); }}
                className="text-xs font-display uppercase tracking-widest text-muted-foreground hover:text-white transition-colors"
              >
                I've saved this key
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display text-sm uppercase tracking-widest text-white flex items-center gap-2">
            <Key className="w-4 h-4 text-primary" />
            Your API Keys
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Create API keys to access GuardianLayer from external systems, scripts, or integrations.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/20 border border-primary/30 text-primary font-display text-xs uppercase tracking-widest hover:bg-primary/30 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create API Key
        </button>
      </div>

      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="glass-panel rounded-xl p-5 border border-primary/20 space-y-4">
              <h4 className="font-display text-xs uppercase tracking-widest text-primary">Create New API Key</h4>

              <div>
                <label className="text-[10px] font-display uppercase tracking-widest text-muted-foreground block mb-1.5">Key Name</label>
                <input
                  type="text"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="e.g., CI/CD Pipeline, SIEM Integration, Monitoring Script"
                  className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/40"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-display uppercase tracking-widest text-muted-foreground block mb-1.5">Permissions</label>
                  <select
                    value={newKeyScopes}
                    onChange={(e) => setNewKeyScopes(e.target.value)}
                    className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/40"
                  >
                    <option value="read">Read Only</option>
                    <option value="read,write">Read & Write</option>
                    <option value="read,write,admin">Full Access</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-display uppercase tracking-widest text-muted-foreground block mb-1.5">Expires In</label>
                  <select
                    value={newKeyExpiry}
                    onChange={(e) => setNewKeyExpiry(e.target.value)}
                    className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/40"
                  >
                    <option value="30">30 days</option>
                    <option value="90">90 days</option>
                    <option value="180">6 months</option>
                    <option value="365">1 year</option>
                    <option value="">Never</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowCreate(false)}
                  className="px-4 py-2 rounded-lg text-xs font-display uppercase tracking-widest text-muted-foreground hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  disabled={creating || !newKeyName.trim()}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/20 border border-primary/30 text-primary font-display text-xs uppercase tracking-widest hover:bg-primary/30 transition-colors disabled:opacity-40"
                >
                  {creating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Key className="w-3 h-3" />}
                  {creating ? "Creating..." : "Generate Key"}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {activeKeys.length === 0 && !showCreate ? (
        <div className="glass-panel rounded-xl p-12 text-center border-dashed border-2 border-white/5">
          <Key className="w-10 h-10 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-sm text-muted-foreground mb-1">No API keys yet</p>
          <p className="text-xs text-muted-foreground/60">Create a key to start accessing GuardianLayer from external systems.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {activeKeys.map((k, i) => (
            <motion.div
              key={k.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="glass-panel rounded-xl p-4 flex items-center gap-4"
            >
              <div className="p-2 rounded-lg bg-primary/10">
                <Key className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-display text-white">{k.name}</span>
                  <code className="text-[10px] font-mono text-muted-foreground bg-white/5 px-2 py-0.5 rounded">{k.keyPrefix}</code>
                </div>
                <div className="flex items-center gap-3 mt-1 flex-wrap">
                  <span className="text-[10px] font-mono text-muted-foreground">
                    Scopes: {k.scopes.split(",").map(s => s.trim()).join(", ")}
                  </span>
                  <span className="text-[10px] font-mono text-muted-foreground">
                    Created: {format(new Date(k.createdAt), "MMM d, yyyy")}
                  </span>
                  {k.expiresAt && (
                    <span className={clsx(
                      "text-[10px] font-mono",
                      new Date(k.expiresAt) < new Date() ? "text-rose-400" : "text-muted-foreground"
                    )}>
                      {new Date(k.expiresAt) < new Date() ? "Expired" : `Expires: ${format(new Date(k.expiresAt), "MMM d, yyyy")}`}
                    </span>
                  )}
                  {k.lastUsedAt && (
                    <span className="text-[10px] font-mono text-muted-foreground">
                      Last used: {format(new Date(k.lastUsedAt), "MMM d, h:mm a")}
                    </span>
                  )}
                </div>
              </div>
              <div className="shrink-0 flex items-center gap-2">
                <button
                  onClick={() => { setShowPinDialog(k.id); setPinInput(""); setPinError(""); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-display uppercase tracking-widest text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
                >
                  <Eye className="w-3 h-3" />
                  Reveal
                </button>
                <button
                  onClick={() => handleRevoke(k.id)}
                  disabled={revoking === k.id}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-display uppercase tracking-widest text-rose-400 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 transition-colors disabled:opacity-40"
                >
                  {revoking === k.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                  Revoke
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {revokedKeys.length > 0 && (
        <div>
          <h4 className="font-display text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Revoked Keys</h4>
          <div className="space-y-1">
            {revokedKeys.map((k) => (
              <div key={k.id} className="glass-panel rounded-lg p-3 flex items-center gap-3 opacity-50">
                <Key className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs font-display text-muted-foreground line-through">{k.name}</span>
                <code className="text-[9px] font-mono text-muted-foreground/60">{k.keyPrefix}</code>
                <span className="text-[9px] font-mono text-rose-400/60 ml-auto">REVOKED</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <AnimatePresence>
        {showPinDialog !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => setShowPinDialog(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-panel rounded-xl p-6 border border-primary/30 w-full max-w-sm mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-2 mb-4">
                <Key className="w-5 h-5 text-primary" />
                <h3 className="font-display text-sm uppercase tracking-widest text-white">Reveal API Key</h3>
              </div>
              <p className="text-xs text-muted-foreground mb-4">
                Enter your platform PIN to reveal the full API key.
              </p>
              <input
                type="password"
                value={pinInput}
                onChange={(e) => { setPinInput(e.target.value); setPinError(""); }}
                onKeyDown={(e) => { if (e.key === "Enter" && showPinDialog !== null) handleReveal(showPinDialog); }}
                placeholder="Enter PIN"
                autoFocus
                className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/40 mb-3"
              />
              {pinError && (
                <p className="text-xs text-rose-400 mb-3 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  {pinError}
                </p>
              )}
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowPinDialog(null)}
                  className="px-4 py-2 rounded-lg text-xs font-display uppercase tracking-widest text-muted-foreground hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => showPinDialog !== null && handleReveal(showPinDialog)}
                  disabled={revealing || !pinInput.trim()}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/20 border border-primary/30 text-primary font-display text-xs uppercase tracking-widest hover:bg-primary/30 transition-colors disabled:opacity-40"
                >
                  {revealing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Eye className="w-3 h-3" />}
                  {revealing ? "Revealing..." : "Reveal Key"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="glass-panel rounded-xl p-5 border border-white/5">
        <h4 className="font-display text-xs uppercase tracking-widest text-white mb-3 flex items-center gap-2">
          <Terminal className="w-4 h-4 text-primary" />
          How to Use Your API Key
        </h4>
        <div className="space-y-3">
          <div>
            <p className="text-[10px] font-display uppercase tracking-widest text-muted-foreground mb-1.5">HTTP Header</p>
            <code className="block text-xs font-mono text-primary bg-black/40 p-3 rounded-lg border border-white/5">
              Authorization: Bearer gl_your_api_key_here
            </code>
          </div>
          <div>
            <p className="text-[10px] font-display uppercase tracking-widest text-muted-foreground mb-1.5">cURL Example</p>
            <code className="block text-xs font-mono text-primary bg-black/40 p-3 rounded-lg border border-white/5 whitespace-pre-wrap">
              {`curl -H "Authorization: Bearer gl_your_api_key_here" \\
  https://your-domain/api/gateway/status`}
            </code>
          </div>
          <div>
            <p className="text-[10px] font-display uppercase tracking-widest text-muted-foreground mb-1.5">Python Example</p>
            <code className="block text-xs font-mono text-primary bg-black/40 p-3 rounded-lg border border-white/5 whitespace-pre-wrap">
              {`import requests

headers = {"Authorization": "Bearer gl_your_api_key_here"}
response = requests.get(
    "https://your-domain/api/gateway/status",
    headers=headers
)
print(response.json())`}
            </code>
          </div>
        </div>
      </div>
    </div>
  );
}
