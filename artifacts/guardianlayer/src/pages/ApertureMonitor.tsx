import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { API_BASE } from "@/lib/constants";
import { authFetch } from "@/lib/auth";
import {
  Radio, ShieldCheck, ShieldX, Globe, ExternalLink, Search,
  ArrowRight, CheckCircle2, Clock, XCircle, Zap, BarChart3, Eye,
  AlertTriangle, ChevronDown, ChevronUp,
} from "lucide-react";

interface ApertureApp {
  id: number;
  appName: string;
  appUrl: string | null;
  category: string;
  aiProviders: string;
  routedThroughAperture: boolean;
  migrationStatus: string;
  estimatedMonthlyCost: string | null;
  notes: string | null;
  lastChecked: string | null;
  createdAt: string;
}

interface Stats {
  totalApps: number;
  routedThroughAperture: number;
  notStarted: number;
  inProgress: number;
  completed: number;
  coveragePercent: number;
  providerCounts: Record<string, number>;
}

const STATUS_STYLES: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  not_started: { label: "Not Started", color: "text-muted-foreground", icon: XCircle },
  in_progress: { label: "In Progress", color: "text-amber-400", icon: Clock },
  completed: { label: "Routed", color: "text-emerald-400", icon: CheckCircle2 },
};

const PROVIDER_COLORS: Record<string, string> = {
  OpenAI: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  Anthropic: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  "Google Gemini": "bg-blue-500/20 text-blue-400 border-blue-500/30",
  "AWS Bedrock": "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  Groq: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  Replicate: "bg-rose-500/20 text-rose-400 border-rose-500/30",
  Cohere: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  "Hugging Face": "bg-amber-500/20 text-amber-400 border-amber-500/30",
};

function PageHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-8">
      <h1 className="font-display text-2xl uppercase tracking-[0.2em] text-white mb-2">{title}</h1>
      <p className="text-sm text-muted-foreground max-w-2xl">{description}</p>
    </div>
  );
}

function CyberLoading({ text }: { text: string }) {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm text-muted-foreground font-display uppercase tracking-widest">{text}</p>
      </div>
    </div>
  );
}

export default function ApertureMonitor() {
  const [apps, setApps] = useState<ApertureApp[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [providerFilter, setProviderFilter] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchData = async () => {
    try {
      const res = await authFetch(`${API_BASE}/api/aperture/apps`);
      if (res.ok) {
        const data = await res.json();
        setApps(data.apps || []);
        setStats(data.stats || null);
      }
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const updateApp = async (id: number, updates: Partial<ApertureApp>) => {
    try {
      const res = await authFetch(`${API_BASE}/api/aperture/apps/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        const data = await res.json();
        setApps((prev) => prev.map((a) => (a.id === id ? data.app : a)));
        setMsg({ type: "success", text: `${data.app.appName} updated` });
        setTimeout(() => setMsg(null), 2000);
        fetchData();
      }
    } catch {
      setMsg({ type: "error", text: "Update failed" });
    }
  };

  if (loading) return <CyberLoading text="Loading Aperture data..." />;

  const allProviders = Array.from(
    new Set(apps.flatMap((a) => a.aiProviders.split(",").map((p) => p.trim()).filter(Boolean)))
  ).sort();

  const filtered = apps.filter((a) => {
    if (search && !a.appName.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter !== "all" && a.migrationStatus !== statusFilter) return false;
    if (providerFilter !== "all") {
      const providers = a.aiProviders.split(",").map((p) => p.trim());
      if (!providers.includes(providerFilter)) return false;
    }
    return true;
  });

  return (
    <div className="pb-12">
      <PageHeader
        title="Aperture AI Gateway"
        description="Tailscale Aperture centralizes AI API keys across your app fleet. Route all AI requests through a single control point with identity-based access and usage tracking."
      />

      <div className="mb-6 p-4 rounded-xl border border-primary/20 bg-primary/5">
        <div className="flex items-start gap-3">
          <Radio className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm text-white font-medium mb-1">What is Aperture?</p>
            <p className="text-xs text-muted-foreground">
              Aperture keeps API keys in one place and routes AI requests through a single control point on your Tailscale network.
              Every request is tied to Tailscale identity, so you can see who or what is using AI, where, and how much.
              This page tracks which of your apps use AI providers and their migration status to route through Aperture.
            </p>
            <a href="https://login.tailscale.com/admin/aperture" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 mt-2 text-xs text-primary hover:underline">
              Open Aperture Dashboard <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          {[
            { label: "Total Apps Using AI", value: stats.totalApps, icon: Globe, color: "text-primary" },
            { label: "Routed via Aperture", value: stats.routedThroughAperture, icon: ShieldCheck, color: "text-emerald-400" },
            { label: "Coverage", value: `${stats.coveragePercent}%`, icon: BarChart3, color: stats.coveragePercent >= 75 ? "text-emerald-400" : stats.coveragePercent >= 50 ? "text-amber-400" : "text-rose-400" },
            { label: "Not Started", value: stats.notStarted, icon: XCircle, color: "text-muted-foreground" },
            { label: "In Progress", value: stats.inProgress, icon: Clock, color: "text-amber-400" },
            { label: "Completed", value: stats.completed, icon: CheckCircle2, color: "text-emerald-400" },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="glass-panel p-4 rounded-xl relative overflow-hidden"
            >
              <div className={`absolute top-0 right-0 p-2 opacity-10 ${stat.color}`}>
                <stat.icon className="w-10 h-10" />
              </div>
              <span className="font-display uppercase text-[9px] tracking-widest text-muted-foreground block mb-1">{stat.label}</span>
              <span className={`text-xl font-mono font-bold ${stat.color}`}>{stat.value}</span>
            </motion.div>
          ))}
        </div>
      )}

      {stats && Object.keys(stats.providerCounts).length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-panel rounded-xl p-5 mb-6">
          <h3 className="font-display uppercase tracking-widest text-xs text-primary mb-3 flex items-center gap-2">
            <Zap className="w-4 h-4" /> AI Provider Distribution
          </h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(stats.providerCounts)
              .sort((a, b) => b[1] - a[1])
              .map(([provider, count]) => (
                <span
                  key={provider}
                  className={`px-3 py-1.5 rounded-lg text-xs font-display uppercase tracking-wider border ${PROVIDER_COLORS[provider] || "bg-white/5 text-white/70 border-white/10"}`}
                >
                  {provider}: {count} app{count !== 1 ? "s" : ""}
                </span>
              ))}
          </div>
        </motion.div>
      )}

      <div className="flex flex-col md:flex-row items-start md:items-center gap-3 mb-6">
        <div className="relative flex-1 w-full md:w-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search apps..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-black/30 border border-white/10 rounded-lg text-sm text-white placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-black/30 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:border-primary/50 focus:outline-none"
        >
          <option value="all">All Statuses</option>
          <option value="not_started">Not Started</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
        </select>
        <select
          value={providerFilter}
          onChange={(e) => setProviderFilter(e.target.value)}
          className="bg-black/30 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:border-primary/50 focus:outline-none"
        >
          <option value="all">All Providers</option>
          {allProviders.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>

      {msg && (
        <div className={`mb-4 text-sm ${msg.type === "success" ? "text-emerald-400" : "text-rose-400"}`}>
          {msg.text}
        </div>
      )}

      <div className="space-y-2">
        {filtered.map((app, i) => {
          const statusInfo = STATUS_STYLES[app.migrationStatus] || STATUS_STYLES.not_started;
          const providers = app.aiProviders.split(",").map((p) => p.trim()).filter(Boolean);
          const isExpanded = expandedId === app.id;

          return (
            <motion.div
              key={app.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.02 }}
              className={`glass-panel rounded-xl border transition-colors ${
                app.routedThroughAperture
                  ? "border-emerald-500/20 hover:border-emerald-500/40"
                  : app.migrationStatus === "in_progress"
                  ? "border-amber-500/20 hover:border-amber-500/40"
                  : "border-white/5 hover:border-white/10"
              }`}
            >
              <div
                className="p-4 cursor-pointer"
                onClick={() => setExpandedId(isExpanded ? null : app.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <statusInfo.icon className={`w-5 h-5 ${statusInfo.color}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-white">{app.appName}</span>
                        {app.appUrl && (
                          <a
                            href={app.appUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-muted-foreground hover:text-primary transition-colors"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                        <span className="px-2 py-0.5 rounded text-[10px] font-display uppercase tracking-widest bg-white/5 text-muted-foreground border border-white/10">
                          {app.category}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-display uppercase tracking-widest ${
                          app.routedThroughAperture ? "bg-emerald-500/20 text-emerald-400" : "bg-white/5 text-muted-foreground"
                        }`}>
                          {statusInfo.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {providers.map((p) => (
                          <span
                            key={p}
                            className={`px-1.5 py-0.5 rounded text-[9px] font-display uppercase tracking-widest border ${PROVIDER_COLORS[p] || "bg-white/5 text-white/60 border-white/10"}`}
                          >
                            {p}
                          </span>
                        ))}
                        {app.estimatedMonthlyCost && (
                          <span className="text-[10px] text-muted-foreground ml-1">~{app.estimatedMonthlyCost}/mo</span>
                        )}
                      </div>
                    </div>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                  </div>
                </div>
              </div>

              {isExpanded && (
                <div className="px-4 pb-4 border-t border-white/5 pt-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                    {app.notes && (
                      <div className="p-3 rounded-lg bg-black/20 border border-white/5">
                        <span className="text-[10px] font-display uppercase tracking-widest text-muted-foreground block mb-1">Notes</span>
                        <span className="text-xs text-white">{app.notes}</span>
                      </div>
                    )}
                    {app.lastChecked && (
                      <div className="p-3 rounded-lg bg-black/20 border border-white/5">
                        <span className="text-[10px] font-display uppercase tracking-widest text-muted-foreground block mb-1">Last Checked</span>
                        <span className="text-xs font-mono text-white">{new Date(app.lastChecked).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-display uppercase tracking-widest text-muted-foreground">Migration Status:</span>
                    {(["not_started", "in_progress", "completed"] as const).map((status) => (
                      <button
                        key={status}
                        onClick={() => updateApp(app.id, {
                          migrationStatus: status,
                          routedThroughAperture: status === "completed",
                        })}
                        className={`px-3 py-1 rounded text-[10px] font-display uppercase tracking-widest transition-all border ${
                          app.migrationStatus === status
                            ? STATUS_STYLES[status].color + " bg-white/10 border-white/20"
                            : "text-muted-foreground hover:text-white border-transparent hover:border-white/10"
                        }`}
                      >
                        {STATUS_STYLES[status].label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          );
        })}

        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Radio className="w-8 h-8 mx-auto mb-3 text-primary/40" />
            <p className="font-display text-sm uppercase tracking-wider">No apps match this filter</p>
          </div>
        )}
      </div>
    </div>
  );
}
