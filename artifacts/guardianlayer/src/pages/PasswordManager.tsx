import { useState } from "react";
import { motion } from "framer-motion";
import {
  Key, Shield, AlertTriangle, CheckCircle2, Eye, EyeOff, Copy, Plus,
  Search, Lock, Unlock, Clock, RefreshCw, ExternalLink, Loader2,
  Users, Globe, Server, CreditCard,
} from "lucide-react";
import { clsx } from "clsx";

interface PasswordEntry {
  id: string;
  title: string;
  username: string;
  url?: string;
  category: string;
  vault: string;
  strength: "strong" | "good" | "weak" | "compromised";
  lastChanged: string;
  lastAccessed: string;
  mfaEnabled: boolean;
  shared: boolean;
  sharedWith?: string[];
}

const STRENGTH_CONFIG = {
  strong: { color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/30", label: "Strong", width: "100%" },
  good: { color: "text-cyan-400", bg: "bg-cyan-500/10", border: "border-cyan-500/30", label: "Good", width: "75%" },
  weak: { color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/30", label: "Weak", width: "40%" },
  compromised: { color: "text-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/30", label: "Compromised", width: "10%" },
};

const CATEGORY_ICONS: Record<string, typeof Key> = {
  "Infrastructure": Server,
  "Cloud Services": Globe,
  "Financial": CreditCard,
  "Team": Users,
  "Personal": Lock,
};

function generateEntries(): PasswordEntry[] {
  const now = Date.now();
  return [
    { id: "p1", title: "AWS Root Account", username: "admin@guardianlayer.io", url: "https://aws.amazon.com/console", category: "Cloud Services", vault: "Infrastructure", strength: "strong", lastChanged: new Date(now - 86400000 * 15).toISOString(), lastAccessed: new Date(now - 3600000).toISOString(), mfaEnabled: true, shared: true, sharedWith: ["rsmolarz", "ops-team"] },
    { id: "p2", title: "Cloudflare Dashboard", username: "security@guardianlayer.io", url: "https://dash.cloudflare.com", category: "Cloud Services", vault: "Infrastructure", strength: "strong", lastChanged: new Date(now - 86400000 * 30).toISOString(), lastAccessed: new Date(now - 7200000).toISOString(), mfaEnabled: true, shared: true, sharedWith: ["rsmolarz"] },
    { id: "p3", title: "GitHub Organization", username: "rsmolarz", url: "https://github.com", category: "Cloud Services", vault: "Development", strength: "strong", lastChanged: new Date(now - 86400000 * 45).toISOString(), lastAccessed: new Date(now - 1800000).toISOString(), mfaEnabled: true, shared: false },
    { id: "p4", title: "Production Database (PostgreSQL)", username: "gl_admin", category: "Infrastructure", vault: "Infrastructure", strength: "strong", lastChanged: new Date(now - 86400000 * 7).toISOString(), lastAccessed: new Date(now - 86400000).toISOString(), mfaEnabled: false, shared: true, sharedWith: ["ops-team", "db-admins"] },
    { id: "p5", title: "Stripe Dashboard", username: "billing@guardianlayer.io", url: "https://dashboard.stripe.com", category: "Financial", vault: "Finance", strength: "good", lastChanged: new Date(now - 86400000 * 60).toISOString(), lastAccessed: new Date(now - 86400000 * 3).toISOString(), mfaEnabled: true, shared: true, sharedWith: ["finance-team"] },
    { id: "p6", title: "CrowdStrike Falcon Console", username: "admin@guardianlayer.io", url: "https://falcon.crowdstrike.com", category: "Infrastructure", vault: "Security", strength: "strong", lastChanged: new Date(now - 86400000 * 20).toISOString(), lastAccessed: new Date(now - 43200000).toISOString(), mfaEnabled: true, shared: true, sharedWith: ["security-team"] },
    { id: "p7", title: "Slack Workspace Admin", username: "rsmolarz@rsmolarz.com", url: "https://slack.com", category: "Team", vault: "Communication", strength: "weak", lastChanged: new Date(now - 86400000 * 180).toISOString(), lastAccessed: new Date(now - 900000).toISOString(), mfaEnabled: false, shared: false },
    { id: "p8", title: "Jenkins CI Server", username: "admin", url: "https://ci.guardianlayer.io", category: "Infrastructure", vault: "Development", strength: "compromised", lastChanged: new Date(now - 86400000 * 365).toISOString(), lastAccessed: new Date(now - 86400000 * 14).toISOString(), mfaEnabled: false, shared: true, sharedWith: ["dev-team"] },
    { id: "p9", title: "Tailscale Admin Panel", username: "rsmolarz@rsmolarz.com", url: "https://login.tailscale.com/admin", category: "Infrastructure", vault: "Infrastructure", strength: "strong", lastChanged: new Date(now - 86400000 * 10).toISOString(), lastAccessed: new Date(now - 21600000).toISOString(), mfaEnabled: true, shared: false },
    { id: "p10", title: "1Password Business", username: "rsmolarz@rsmolarz.com", url: "https://my.1password.com", category: "Infrastructure", vault: "Admin", strength: "strong", lastChanged: new Date(now - 86400000 * 5).toISOString(), lastAccessed: new Date(now - 600000).toISOString(), mfaEnabled: true, shared: false },
    { id: "p11", title: "Domain Registrar (NameSilo)", username: "rsmolarz", url: "https://www.namesilo.com", category: "Infrastructure", vault: "Infrastructure", strength: "good", lastChanged: new Date(now - 86400000 * 90).toISOString(), lastAccessed: new Date(now - 86400000 * 30).toISOString(), mfaEnabled: true, shared: false },
    { id: "p12", title: "VPN Root Certificate", username: "vpn-ca", category: "Infrastructure", vault: "Security", strength: "strong", lastChanged: new Date(now - 86400000 * 60).toISOString(), lastAccessed: new Date(now - 86400000 * 7).toISOString(), mfaEnabled: false, shared: true, sharedWith: ["ops-team"] },
  ];
}

export default function PasswordManager() {
  const [entries] = useState(generateEntries);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [auditing, setAuditing] = useState(false);

  const filtered = entries.filter(e => {
    if (categoryFilter !== "all" && e.category !== categoryFilter) return false;
    if (search && !e.title.toLowerCase().includes(search.toLowerCase()) && !e.username.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const weakCount = entries.filter(e => e.strength === "weak" || e.strength === "compromised").length;
  const noMfaCount = entries.filter(e => !e.mfaEnabled).length;
  const oldCount = entries.filter(e => Date.now() - new Date(e.lastChanged).getTime() > 86400000 * 90).length;
  const categories = [...new Set(entries.map(e => e.category))];

  const handleAudit = async () => {
    setAuditing(true);
    await new Promise(r => setTimeout(r, 3000));
    setAuditing(false);
  };

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30">
              <Key className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Password Manager</h1>
              <p className="text-gray-400 text-sm">1Password integration — credential management and audit</p>
            </div>
          </div>
          <button onClick={handleAudit} disabled={auditing} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 text-white font-medium px-5 py-2 rounded-lg transition-all text-sm disabled:opacity-50">
            {auditing ? <><Loader2 className="w-4 h-4 animate-spin" /> Auditing...</> : <><Shield className="w-4 h-4" /> Security Audit</>}
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-xl border p-4 bg-cyan-500/10 border-cyan-500/30">
            <p className="text-sm text-cyan-400 mb-1">Total Credentials</p>
            <p className="text-3xl font-bold text-cyan-400">{entries.length}</p>
          </div>
          <div className="rounded-xl border p-4 bg-rose-500/10 border-rose-500/30">
            <p className="text-sm text-rose-400 mb-1">Weak/Compromised</p>
            <p className="text-3xl font-bold text-rose-400">{weakCount}</p>
          </div>
          <div className="rounded-xl border p-4 bg-amber-500/10 border-amber-500/30">
            <p className="text-sm text-amber-400 mb-1">No MFA</p>
            <p className="text-3xl font-bold text-amber-400">{noMfaCount}</p>
          </div>
          <div className="rounded-xl border p-4 bg-orange-500/10 border-orange-500/30">
            <p className="text-sm text-orange-400 mb-1">90+ Days Old</p>
            <p className="text-3xl font-bold text-orange-400">{oldCount}</p>
          </div>
        </div>

        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search credentials..." className="w-full bg-gray-900/50 border border-gray-800 rounded-lg pl-10 pr-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500/50" />
          </div>
          <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="bg-gray-900/50 border border-gray-800 rounded-lg px-3 py-2.5 text-white text-sm">
            <option value="all">All Categories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div className="space-y-2">
          {filtered.map((entry, i) => {
            const cfg = STRENGTH_CONFIG[entry.strength];
            const CatIcon = CATEGORY_ICONS[entry.category] || Lock;
            const daysSinceChange = Math.floor((Date.now() - new Date(entry.lastChanged).getTime()) / 86400000);
            return (
              <motion.div key={entry.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={clsx("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", cfg.bg, "border", cfg.border)}>
                    <CatIcon className={clsx("w-5 h-5", cfg.color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-white text-sm font-medium truncate">{entry.title}</p>
                      {entry.mfaEnabled && <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">MFA</span>}
                      {entry.shared && <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/30">Shared</span>}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-gray-500 font-mono">{entry.username}</span>
                      <span className="text-[10px] text-gray-600">Changed {daysSinceChange}d ago</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="w-20">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className={clsx("text-[10px]", cfg.color)}>{cfg.label}</span>
                      </div>
                      <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
                        <div className={clsx("h-full rounded-full", cfg.color.replace("text-", "bg-").replace("-400", "-500"))} style={{ width: cfg.width }} />
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
