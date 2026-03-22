import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Globe, RefreshCw, Search, CheckCircle2, XCircle, AlertTriangle,
  Clock, Zap, Plus, Trash2, ExternalLink, Loader2, Signal, Filter
} from "lucide-react";
import { API_BASE } from "@/lib/constants";

interface AppEntry {
  id: number;
  url: string;
  label: string;
  category: string;
  status: string;
  addedAt: string;
  lastChecked: string | null;
}

interface CheckResult {
  id: number;
  url: string;
  status: "online" | "offline" | "error";
  statusCode?: number;
  responseTimeMs?: number;
  ssl?: { valid: boolean };
  error?: string;
}

interface CheckSummary {
  total: number;
  online: number;
  offline: number;
  errors: number;
}

const CATEGORY_COLORS: Record<string, string> = {
  "AI / Infrastructure": "bg-violet-500/20 text-violet-400 border-violet-500/30",
  "Business Intelligence": "bg-blue-500/20 text-blue-400 border-blue-500/30",
  "CRM / Sales": "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  "Travel / AI": "bg-sky-500/20 text-sky-400 border-sky-500/30",
  "Trading / Finance": "bg-amber-500/20 text-amber-400 border-amber-500/30",
  "Finance / Trading": "bg-amber-500/20 text-amber-400 border-amber-500/30",
  "Finance / Analytics": "bg-amber-500/20 text-amber-400 border-amber-500/30",
  "Finance / Investing": "bg-amber-500/20 text-amber-400 border-amber-500/30",
  "Professional Development": "bg-teal-500/20 text-teal-400 border-teal-500/30",
  "Content / Marketing": "bg-pink-500/20 text-pink-400 border-pink-500/30",
  "Content / AI": "bg-pink-500/20 text-pink-400 border-pink-500/30",
  "Lead Generation": "bg-orange-500/20 text-orange-400 border-orange-500/30",
  "Website Builder": "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  "Project Management": "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
  "Security / Auth": "bg-red-500/20 text-red-400 border-red-500/30",
  "Identity / Auth": "bg-red-500/20 text-red-400 border-red-500/30",
  "AI Platform": "bg-violet-500/20 text-violet-400 border-violet-500/30",
  "AI / VPS": "bg-violet-500/20 text-violet-400 border-violet-500/30",
  "Utilities": "bg-gray-500/20 text-gray-400 border-gray-500/30",
  "Media / AI": "bg-fuchsia-500/20 text-fuchsia-400 border-fuchsia-500/30",
  "Remote Control": "bg-lime-500/20 text-lime-400 border-lime-500/30",
  "Healthcare / EMR": "bg-green-500/20 text-green-400 border-green-500/30",
  "Healthcare / API": "bg-green-500/20 text-green-400 border-green-500/30",
  "Medical Education": "bg-green-500/20 text-green-400 border-green-500/30",
  "Analytics": "bg-blue-500/20 text-blue-400 border-blue-500/30",
  "Family / Lifestyle": "bg-rose-500/20 text-rose-400 border-rose-500/30",
  "Mobile": "bg-sky-500/20 text-sky-400 border-sky-500/30",
  "Mobile / Wearable": "bg-sky-500/20 text-sky-400 border-sky-500/30",
  "Investing / Finance": "bg-amber-500/20 text-amber-400 border-amber-500/30",
  "Home Management": "bg-teal-500/20 text-teal-400 border-teal-500/30",
  "Community / Healthcare": "bg-green-500/20 text-green-400 border-green-500/30",
  "Physician Investing": "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  "Estate Planning": "bg-gray-500/20 text-gray-400 border-gray-500/30",
  "Accessibility": "bg-purple-500/20 text-purple-400 border-purple-500/30",
  "Legal / Finance": "bg-slate-500/20 text-slate-400 border-slate-500/30",
  "Manufacturing": "bg-orange-500/20 text-orange-400 border-orange-500/30",
  "Business / Sales": "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
};

function StatusIcon({ result }: { result?: CheckResult }) {
  if (!result) return <Clock className="w-4 h-4 text-muted-foreground" />;
  if (result.status === "online") return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
  if (result.status === "offline") return <XCircle className="w-4 h-4 text-rose-400" />;
  return <AlertTriangle className="w-4 h-4 text-amber-400" />;
}

function ResponseBadge({ ms }: { ms?: number }) {
  if (!ms) return null;
  const color = ms < 500 ? "text-emerald-400" : ms < 1500 ? "text-amber-400" : "text-rose-400";
  return (
    <span className={`text-[10px] font-mono ${color}`}>
      {ms}ms
    </span>
  );
}

export default function AppFleetMonitor() {
  const [apps, setApps] = useState<AppEntry[]>([]);
  const [results, setResults] = useState<Map<number, CheckResult>>(new Map());
  const [summary, setSummary] = useState<CheckSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newUrl, setNewUrl] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [newCategory, setNewCategory] = useState("");

  const fetchApps = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/app-fleet`);
      if (res.ok) {
        const data = await res.json();
        setApps(data.apps);
      }
    } catch (err) {
      console.error("Failed to fetch apps:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchApps();
  }, [fetchApps]);

  const runHealthCheck = async () => {
    setChecking(true);
    try {
      const res = await fetch(`${API_BASE}/api/app-fleet/check`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        const map = new Map<number, CheckResult>();
        data.results.forEach((r: CheckResult) => map.set(r.id, r));
        setResults(map);
        setSummary(data.summary);
      }
    } catch (err) {
      console.error("Health check failed:", err);
    } finally {
      setChecking(false);
    }
  };

  const checkSingle = async (id: number) => {
    try {
      const res = await fetch(`${API_BASE}/api/app-fleet/check/${id}`, { method: "POST" });
      if (res.ok) {
        const result = await res.json();
        setResults(prev => new Map(prev).set(id, result));
      }
    } catch (err) {
      console.error("Single check failed:", err);
    }
  };

  const addApp = async () => {
    if (!newUrl || !newLabel) return;
    try {
      const res = await fetch(`${API_BASE}/api/app-fleet`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: newUrl, label: newLabel, category: newCategory || "general" }),
      });
      if (res.ok) {
        setNewUrl("");
        setNewLabel("");
        setNewCategory("");
        setShowAdd(false);
        fetchApps();
      }
    } catch (err) {
      console.error("Add failed:", err);
    }
  };

  const removeApp = async (id: number) => {
    try {
      await fetch(`${API_BASE}/api/app-fleet/${id}`, { method: "DELETE" });
      setApps(prev => prev.filter(a => a.id !== id));
    } catch (err) {
      console.error("Remove failed:", err);
    }
  };

  const categories = [...new Set(apps.map(a => a.category))].sort();

  const filtered = apps.filter(a => {
    if (search) {
      const s = search.toLowerCase();
      if (!a.label.toLowerCase().includes(s) && !a.url.toLowerCase().includes(s) && !a.category.toLowerCase().includes(s)) return false;
    }
    if (categoryFilter && a.category !== categoryFilter) return false;
    if (statusFilter) {
      const r = results.get(a.id);
      if (statusFilter === "online" && r?.status !== "online") return false;
      if (statusFilter === "offline" && r?.status !== "offline") return false;
      if (statusFilter === "error" && r?.status !== "error") return false;
      if (statusFilter === "unchecked" && r) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold text-white tracking-tight">
          App Fleet Monitor
        </h1>
        <p className="text-muted-foreground mt-1">
          Monitor uptime and health across your entire application portfolio.
        </p>
        <div className="h-0.5 bg-gradient-to-r from-cyan-500 via-violet-500 to-transparent mt-3 w-48" />
      </div>

      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-panel p-4 rounded-xl text-center">
            <Globe className="w-5 h-5 mx-auto mb-1 text-cyan-400" />
            <p className="text-2xl font-display text-white">{summary.total}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total Apps</p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="glass-panel p-4 rounded-xl text-center border border-emerald-500/20">
            <CheckCircle2 className="w-5 h-5 mx-auto mb-1 text-emerald-400" />
            <p className="text-2xl font-display text-emerald-400">{summary.online}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Online</p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-panel p-4 rounded-xl text-center border border-rose-500/20">
            <XCircle className="w-5 h-5 mx-auto mb-1 text-rose-400" />
            <p className="text-2xl font-display text-rose-400">{summary.offline}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Offline</p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glass-panel p-4 rounded-xl text-center border border-amber-500/20">
            <AlertTriangle className="w-5 h-5 mx-auto mb-1 text-amber-400" />
            <p className="text-2xl font-display text-amber-400">{summary.errors}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Errors</p>
          </motion.div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search apps by name, URL, or category..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:border-cyan-500/50"
          />
        </div>

        <button
          onClick={runHealthCheck}
          disabled={checking}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500/20 to-violet-500/20 text-cyan-400 border border-cyan-500/30 text-xs font-display uppercase tracking-wider hover:from-cyan-500/30 hover:to-violet-500/30 transition-all disabled:opacity-50 flex items-center gap-2"
        >
          {checking ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Checking {apps.length} Apps...
            </>
          ) : (
            <>
              <Signal className="w-4 h-4" />
              Run Health Check
            </>
          )}
        </button>

        <button
          onClick={() => setShowAdd(!showAdd)}
          className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-display uppercase tracking-wider hover:bg-white/10 transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add App
        </button>
      </div>

      <AnimatePresence>
        {showAdd && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="glass-panel p-4 rounded-xl flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-[180px]">
                <label className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1">URL</label>
                <input value={newUrl} onChange={e => setNewUrl(e.target.value)} placeholder="https://myapp.replit.app" className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:border-cyan-500/50" />
              </div>
              <div className="flex-1 min-w-[150px]">
                <label className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1">Label</label>
                <input value={newLabel} onChange={e => setNewLabel(e.target.value)} placeholder="App Name" className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:border-cyan-500/50" />
              </div>
              <div className="min-w-[130px]">
                <label className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1">Category</label>
                <input value={newCategory} onChange={e => setNewCategory(e.target.value)} placeholder="general" className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:border-cyan-500/50" />
              </div>
              <button onClick={addApp} disabled={!newUrl || !newLabel} className="px-4 py-2 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-xs font-display uppercase tracking-wider hover:bg-cyan-500/30 transition-colors disabled:opacity-30">
                Add
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-wrap gap-2">
        {summary && (
          <>
            <button onClick={() => setStatusFilter(statusFilter === "online" ? null : "online")} className={`px-3 py-1 rounded-lg text-[10px] font-display uppercase tracking-wider border transition-colors ${statusFilter === "online" ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : "bg-white/5 text-muted-foreground border-white/10 hover:bg-white/10"}`}>
              Online ({summary.online})
            </button>
            <button onClick={() => setStatusFilter(statusFilter === "offline" ? null : "offline")} className={`px-3 py-1 rounded-lg text-[10px] font-display uppercase tracking-wider border transition-colors ${statusFilter === "offline" ? "bg-rose-500/20 text-rose-400 border-rose-500/30" : "bg-white/5 text-muted-foreground border-white/10 hover:bg-white/10"}`}>
              Offline ({summary.offline})
            </button>
            <button onClick={() => setStatusFilter(statusFilter === "error" ? null : "error")} className={`px-3 py-1 rounded-lg text-[10px] font-display uppercase tracking-wider border transition-colors ${statusFilter === "error" ? "bg-amber-500/20 text-amber-400 border-amber-500/30" : "bg-white/5 text-muted-foreground border-white/10 hover:bg-white/10"}`}>
              Errors ({summary.errors})
            </button>
          </>
        )}
        <div className="flex items-center gap-1 ml-auto">
          <Filter className="w-3 h-3 text-muted-foreground" />
          <select
            value={categoryFilter || ""}
            onChange={e => setCategoryFilter(e.target.value || null)}
            className="bg-white/5 border border-white/10 rounded-lg text-[10px] text-muted-foreground px-2 py-1 focus:outline-none focus:border-cyan-500/50"
          >
            <option value="">All Categories</option>
            {categories.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-cyan-400 mx-auto" />
          <p className="text-muted-foreground text-sm mt-2">Loading app fleet...</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((app, i) => {
            const result = results.get(app.id);
            const catStyle = CATEGORY_COLORS[app.category] || "bg-gray-500/20 text-gray-400 border-gray-500/30";
            return (
              <motion.div
                key={app.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.02 }}
                className="glass-panel rounded-xl p-3 flex items-center gap-3 hover:border-white/20 transition-colors group"
              >
                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                  <StatusIcon result={result} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-white truncate">{app.label}</p>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] border ${catStyle} shrink-0`}>
                      {app.category}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate">{app.url}</p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {result && <ResponseBadge ms={result.responseTimeMs} />}

                  {result?.statusCode && (
                    <span className={`text-[10px] font-mono ${result.statusCode < 400 ? "text-emerald-400" : result.statusCode < 500 ? "text-amber-400" : "text-rose-400"}`}>
                      {result.statusCode}
                    </span>
                  )}

                  {result?.status === "online" && result?.ssl?.valid && (
                    <span className="text-[9px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded">SSL</span>
                  )}

                  <button
                    onClick={() => checkSingle(app.id)}
                    className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-muted-foreground hover:text-cyan-400 opacity-0 group-hover:opacity-100"
                    title="Check this app"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>

                  <a
                    href={app.url.startsWith("http") ? app.url : `https://${app.url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-muted-foreground hover:text-white opacity-0 group-hover:opacity-100"
                    title="Open app"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>

                  <button
                    onClick={() => removeApp(app.id)}
                    className="p-1.5 rounded-lg hover:bg-rose-500/10 transition-colors text-muted-foreground hover:text-rose-400 opacity-0 group-hover:opacity-100"
                    title="Remove app"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            );
          })}

          {filtered.length === 0 && (
            <div className="text-center py-12 glass-panel rounded-xl">
              <Globe className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground text-sm">
                {search || categoryFilter ? "No apps match your filters" : "No apps being monitored yet"}
              </p>
            </div>
          )}
        </div>
      )}

      <div className="glass-panel rounded-xl p-4">
        <p className="text-xs text-muted-foreground">
          <span className="text-white font-medium">{apps.length}</span> apps monitored
          {apps.length > 0 && ` across ${categories.length} categories`}
          {summary && ` — Last check: ${summary.online} online, ${summary.offline} offline, ${summary.errors} errors`}
        </p>
      </div>
    </div>
  );
}
