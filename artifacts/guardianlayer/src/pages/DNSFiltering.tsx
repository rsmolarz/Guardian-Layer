import { useState } from "react";
import { motion } from "framer-motion";
import {
  Globe, Shield, AlertTriangle, CheckCircle2, XCircle, Search, Plus,
  Trash2, ToggleLeft, ToggleRight, Activity, Clock, Ban, Filter,
} from "lucide-react";
import { clsx } from "clsx";

interface DNSRule {
  id: string;
  domain: string;
  category: string;
  action: "block" | "allow" | "log";
  enabled: boolean;
  hits: number;
  lastHit?: string;
}

interface DNSStats {
  totalQueries: number;
  blockedQueries: number;
  malwareBlocked: number;
  phishingBlocked: number;
  adsBlocked: number;
  topBlocked: { domain: string; count: number; category: string }[];
  topAllowed: { domain: string; count: number }[];
}

function generateRules(): DNSRule[] {
  const now = Date.now();
  return [
    { id: "r1", domain: "*.malware-distribution.xyz", category: "Malware", action: "block", enabled: true, hits: 847, lastHit: new Date(now - 60000).toISOString() },
    { id: "r2", domain: "*.phishing-site.com", category: "Phishing", action: "block", enabled: true, hits: 234, lastHit: new Date(now - 300000).toISOString() },
    { id: "r3", domain: "facebook.com", category: "Social Media", action: "block", enabled: true, hits: 1523, lastHit: new Date(now - 30000).toISOString() },
    { id: "r4", domain: "*.tiktok.com", category: "Social Media", action: "block", enabled: true, hits: 892, lastHit: new Date(now - 120000).toISOString() },
    { id: "r5", domain: "*.doubleclick.net", category: "Advertising", action: "block", enabled: true, hits: 12847, lastHit: new Date(now - 5000).toISOString() },
    { id: "r6", domain: "*.googlesyndication.com", category: "Advertising", action: "block", enabled: true, hits: 8934, lastHit: new Date(now - 10000).toISOString() },
    { id: "r7", domain: "update-flash-player.xyz", category: "Malware", action: "block", enabled: true, hits: 3, lastHit: new Date(now - 3600000).toISOString() },
    { id: "r8", domain: "*.crypto-mining.ru", category: "Cryptojacking", action: "block", enabled: true, hits: 156, lastHit: new Date(now - 900000).toISOString() },
    { id: "r9", domain: "github.com", category: "Development", action: "allow", enabled: true, hits: 5432 },
    { id: "r10", domain: "*.amazonaws.com", category: "Cloud", action: "allow", enabled: true, hits: 24567 },
    { id: "r11", domain: "*.gambling-online.com", category: "Gambling", action: "block", enabled: false, hits: 0 },
    { id: "r12", domain: "*.torproject.org", category: "Anonymizer", action: "log", enabled: true, hits: 12, lastHit: new Date(now - 7200000).toISOString() },
  ];
}

function generateStats(): DNSStats {
  return {
    totalQueries: 2847563,
    blockedQueries: 148923,
    malwareBlocked: 1247,
    phishingBlocked: 892,
    adsBlocked: 134782,
    topBlocked: [
      { domain: "doubleclick.net", count: 12847, category: "Advertising" },
      { domain: "googlesyndication.com", count: 8934, category: "Advertising" },
      { domain: "facebook.com", count: 1523, category: "Social Media" },
      { domain: "tiktok.com", count: 892, category: "Social Media" },
      { domain: "malware-distribution.xyz", count: 847, category: "Malware" },
    ],
    topAllowed: [
      { domain: "amazonaws.com", count: 24567 },
      { domain: "cloudflare.com", count: 18234 },
      { domain: "google.com", count: 15892 },
      { domain: "github.com", count: 5432 },
      { domain: "microsoft.com", count: 4567 },
    ],
  };
}

const ACTION_STYLES = {
  block: { color: "text-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/30", icon: Ban },
  allow: { color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/30", icon: CheckCircle2 },
  log: { color: "text-cyan-400", bg: "bg-cyan-500/10", border: "border-cyan-500/30", icon: Activity },
};

export default function DNSFiltering() {
  const [rules, setRules] = useState(generateRules);
  const [stats] = useState(generateStats);
  const [search, setSearch] = useState("");
  const [newDomain, setNewDomain] = useState("");

  const toggleRule = (id: string) => {
    setRules(prev => prev.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r));
  };

  const addRule = () => {
    if (!newDomain.trim()) return;
    setRules(prev => [...prev, {
      id: `r-${Date.now()}`, domain: newDomain.trim(), category: "Custom", action: "block", enabled: true, hits: 0,
    }]);
    setNewDomain("");
  };

  const filtered = rules.filter(r =>
    !search || r.domain.toLowerCase().includes(search.toLowerCase()) || r.category.toLowerCase().includes(search.toLowerCase())
  );

  const blockRate = ((stats.blockedQueries / stats.totalQueries) * 100).toFixed(1);

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/30">
            <Filter className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">DNS Filtering</h1>
            <p className="text-gray-400 text-sm">Network-level domain filtering and threat protection</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-xl border p-4 bg-cyan-500/10 border-cyan-500/30">
            <p className="text-sm text-cyan-400 mb-1">Total Queries</p>
            <p className="text-2xl font-bold text-cyan-400">{(stats.totalQueries / 1000000).toFixed(1)}M</p>
          </div>
          <div className="rounded-xl border p-4 bg-rose-500/10 border-rose-500/30">
            <p className="text-sm text-rose-400 mb-1">Blocked ({blockRate}%)</p>
            <p className="text-2xl font-bold text-rose-400">{(stats.blockedQueries / 1000).toFixed(0)}K</p>
          </div>
          <div className="rounded-xl border p-4 bg-orange-500/10 border-orange-500/30">
            <p className="text-sm text-orange-400 mb-1">Malware Blocked</p>
            <p className="text-2xl font-bold text-orange-400">{stats.malwareBlocked.toLocaleString()}</p>
          </div>
          <div className="rounded-xl border p-4 bg-amber-500/10 border-amber-500/30">
            <p className="text-sm text-amber-400 mb-1">Phishing Blocked</p>
            <p className="text-2xl font-bold text-amber-400">{stats.phishingBlocked.toLocaleString()}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search rules..." className="w-full bg-gray-900/50 border border-gray-800 rounded-lg pl-10 pr-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500/50" />
              </div>
              <div className="flex gap-2">
                <input value={newDomain} onChange={e => setNewDomain(e.target.value)} placeholder="Block domain..." className="bg-gray-900/50 border border-gray-800 rounded-lg px-3 py-2.5 text-white text-sm w-48 focus:outline-none focus:border-blue-500/50" onKeyDown={e => e.key === "Enter" && addRule()} />
                <button onClick={addRule} className="px-3 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"><Plus className="w-4 h-4" /></button>
              </div>
            </div>

            <div className="space-y-1.5">
              {filtered.map(rule => {
                const actionCfg = ACTION_STYLES[rule.action];
                const ActionIcon = actionCfg.icon;
                return (
                  <div key={rule.id} className={clsx("flex items-center gap-3 p-3 rounded-xl border bg-gray-900/50 transition-all", rule.enabled ? "border-gray-800" : "border-gray-800/50 opacity-50")}>
                    <button onClick={() => toggleRule(rule.id)} className="shrink-0">
                      {rule.enabled ? <ToggleRight className="w-5 h-5 text-emerald-400" /> : <ToggleLeft className="w-5 h-5 text-gray-600" />}
                    </button>
                    <ActionIcon className={clsx("w-4 h-4 shrink-0", actionCfg.color)} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white font-mono truncate">{rule.domain}</p>
                      <p className="text-[10px] text-gray-500">{rule.category} · {rule.hits.toLocaleString()} hits{rule.lastHit ? ` · Last: ${new Date(rule.lastHit).toLocaleTimeString()}` : ""}</p>
                    </div>
                    <span className={clsx("text-[10px] px-2 py-0.5 rounded-full uppercase", actionCfg.bg, actionCfg.color)}>{rule.action}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
              <h3 className="text-sm font-display uppercase tracking-wider text-gray-400 mb-3">Top Blocked Domains</h3>
              <div className="space-y-2">
                {stats.topBlocked.map((d, i) => (
                  <div key={d.domain} className="flex items-center gap-2">
                    <span className="text-xs text-gray-600 w-4">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white font-mono truncate">{d.domain}</p>
                      <p className="text-[10px] text-gray-600">{d.category}</p>
                    </div>
                    <span className="text-xs text-rose-400 font-mono">{d.count.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
              <h3 className="text-sm font-display uppercase tracking-wider text-gray-400 mb-3">Top Allowed Domains</h3>
              <div className="space-y-2">
                {stats.topAllowed.map((d, i) => (
                  <div key={d.domain} className="flex items-center gap-2">
                    <span className="text-xs text-gray-600 w-4">{i + 1}</span>
                    <p className="flex-1 text-xs text-white font-mono truncate">{d.domain}</p>
                    <span className="text-xs text-emerald-400 font-mono">{d.count.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
