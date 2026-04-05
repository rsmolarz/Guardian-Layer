import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import {
  Activity, AlertTriangle, Search, Filter, Clock, Server, Shield, XCircle,
  CheckCircle2, ChevronDown, Loader2, Database, Zap, Eye, RefreshCw,
} from "lucide-react";
import { clsx } from "clsx";

interface LogEvent {
  id: string;
  timestamp: string;
  source: string;
  level: "critical" | "error" | "warning" | "info" | "debug";
  category: string;
  message: string;
  metadata?: Record<string, string>;
}

const LEVEL_STYLES = {
  critical: { color: "text-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/30", dot: "bg-rose-500" },
  error: { color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/30", dot: "bg-orange-500" },
  warning: { color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/30", dot: "bg-amber-500" },
  info: { color: "text-cyan-400", bg: "bg-cyan-500/10", border: "border-cyan-500/30", dot: "bg-cyan-500" },
  debug: { color: "text-gray-400", bg: "bg-gray-500/10", border: "border-gray-500/30", dot: "bg-gray-500" },
};

const SOURCES = ["Firewall", "IDS/IPS", "Active Directory", "Web Server", "VPN Gateway", "DNS Server", "Endpoint Agent", "Email Gateway", "Database", "API Gateway"];
const CATEGORIES = ["Authentication", "Network", "Malware", "Policy Violation", "Data Access", "System", "Application"];

function generateEvents(): LogEvent[] {
  const now = Date.now();
  const events: LogEvent[] = [
    { id: "e1", timestamp: new Date(now - 5000).toISOString(), source: "Firewall", level: "critical", category: "Network", message: "Blocked 847 connection attempts from 185.234.72.0/24 — known APT28 infrastructure", metadata: { rule: "GEO-BLOCK-RU", srcIP: "185.234.72.44", dstPort: "445" } },
    { id: "e2", timestamp: new Date(now - 12000).toISOString(), source: "Active Directory", level: "error", category: "Authentication", message: "Brute force detected: 23 failed logins for admin@corp.local from 10.0.5.88 in 2 minutes", metadata: { user: "admin@corp.local", srcIP: "10.0.5.88", attempts: "23" } },
    { id: "e3", timestamp: new Date(now - 18000).toISOString(), source: "Endpoint Agent", level: "warning", category: "Malware", message: "Suspicious PowerShell execution: encoded command with bypass flags on WS-HR-004", metadata: { host: "WS-HR-004", process: "powershell.exe", cmdline: "-enc JABjAD0..." } },
    { id: "e4", timestamp: new Date(now - 25000).toISOString(), source: "Email Gateway", level: "warning", category: "Malware", message: "Quarantined phishing email targeting CFO — spoofed sender bank-notify@chase-secure.com", metadata: { to: "cfo@company.com", subject: "Urgent: Account Verification Required", attachments: "1 (invoice.pdf.exe)" } },
    { id: "e5", timestamp: new Date(now - 30000).toISOString(), source: "Web Server", level: "info", category: "Application", message: "SSL certificate renewed for api.guardianlayer.io — expires in 90 days", metadata: { domain: "api.guardianlayer.io", issuer: "Let's Encrypt" } },
    { id: "e6", timestamp: new Date(now - 40000).toISOString(), source: "VPN Gateway", level: "info", category: "Authentication", message: "User rsmolarz connected via WireGuard from 73.12.xx.xx (Chicago, IL)", metadata: { user: "rsmolarz", protocol: "WireGuard", location: "Chicago, IL" } },
    { id: "e7", timestamp: new Date(now - 55000).toISOString(), source: "IDS/IPS", level: "error", category: "Network", message: "SQL injection attempt detected on /api/v2/users?id=1 OR 1=1 — blocked and logged", metadata: { rule: "SQL-INJ-001", srcIP: "104.28.55.12", uri: "/api/v2/users" } },
    { id: "e8", timestamp: new Date(now - 70000).toISOString(), source: "Database", level: "warning", category: "Data Access", message: "Unusual bulk SELECT on customers table — 45,000 rows accessed by svc_reports user", metadata: { user: "svc_reports", table: "customers", rows: "45,000" } },
    { id: "e9", timestamp: new Date(now - 90000).toISOString(), source: "DNS Server", level: "info", category: "Network", message: "Blocked DNS query to malware domain update-flash-player[.]xyz from 10.0.3.22", metadata: { domain: "update-flash-player.xyz", srcIP: "10.0.3.22", category: "malware" } },
    { id: "e10", timestamp: new Date(now - 120000).toISOString(), source: "Firewall", level: "info", category: "Network", message: "GeoIP block active: 12 countries restricted per compliance policy", metadata: { blocked: "CN, RU, KP, IR, SY, CU, SD, MM, BY, VE, NI, ZW" } },
    { id: "e11", timestamp: new Date(now - 150000).toISOString(), source: "Active Directory", level: "critical", category: "Policy Violation", message: "Service account svc_backup granted Domain Admin privileges — unauthorized change detected", metadata: { account: "svc_backup", changedBy: "unknown", group: "Domain Admins" } },
    { id: "e12", timestamp: new Date(now - 200000).toISOString(), source: "API Gateway", level: "warning", category: "Application", message: "Rate limit exceeded: client app-id-7732 hit 5000 req/min on /api/v2/search endpoint", metadata: { clientId: "app-id-7732", endpoint: "/api/v2/search", rate: "5000/min" } },
    { id: "e13", timestamp: new Date(now - 250000).toISOString(), source: "Endpoint Agent", level: "info", category: "System", message: "Agent update pushed to 35 endpoints — CrowdStrike Falcon 7.14.16805", metadata: { version: "7.14.16805", endpoints: "35", status: "complete" } },
    { id: "e14", timestamp: new Date(now - 300000).toISOString(), source: "VPN Gateway", level: "error", category: "Authentication", message: "Certificate authentication failed for device 'unknown-macbook' — certificate expired 3 days ago", metadata: { device: "unknown-macbook", certExpiry: "2026-04-02", reason: "expired" } },
  ];
  return events;
}

export default function SIEMDashboard() {
  const [events] = useState(generateEvents);
  const [searchQuery, setSearchQuery] = useState("");
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [live, setLive] = useState(true);
  const [liveCount, setLiveCount] = useState(0);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!live) return;
    const interval = setInterval(() => {
      setLiveCount(c => c + Math.floor(Math.random() * 3) + 1);
    }, 2000);
    return () => clearInterval(interval);
  }, [live]);

  const filtered = events.filter(e => {
    if (levelFilter !== "all" && e.level !== levelFilter) return false;
    if (sourceFilter !== "all" && e.source !== sourceFilter) return false;
    if (searchQuery && !e.message.toLowerCase().includes(searchQuery.toLowerCase()) && !e.source.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const criticals = events.filter(e => e.level === "critical").length;
  const errors = events.filter(e => e.level === "error").length;
  const warnings = events.filter(e => e.level === "warning").length;
  const eps = Math.floor(events.length / 5 + liveCount / 10);

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-violet-500/10 border border-violet-500/30">
              <Database className="w-6 h-6 text-violet-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">SIEM — Log & Event Management</h1>
              <p className="text-gray-400 text-sm">Centralized security event correlation and analysis</p>
            </div>
          </div>
          <button onClick={() => setLive(!live)} className={clsx("flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all border", live ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" : "bg-gray-800 text-gray-400 border-gray-700")}>
            {live ? <><span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Live</> : <><Loader2 className="w-4 h-4" /> Paused</>}
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-xl border p-4 bg-rose-500/10 border-rose-500/30">
            <div className="flex items-center gap-2 text-rose-400 text-sm mb-1"><XCircle className="w-4 h-4" /> Critical</div>
            <p className="text-3xl font-bold text-rose-400">{criticals}</p>
          </div>
          <div className="rounded-xl border p-4 bg-orange-500/10 border-orange-500/30">
            <div className="flex items-center gap-2 text-orange-400 text-sm mb-1"><AlertTriangle className="w-4 h-4" /> Errors</div>
            <p className="text-3xl font-bold text-orange-400">{errors}</p>
          </div>
          <div className="rounded-xl border p-4 bg-amber-500/10 border-amber-500/30">
            <div className="flex items-center gap-2 text-amber-400 text-sm mb-1"><AlertTriangle className="w-4 h-4" /> Warnings</div>
            <p className="text-3xl font-bold text-amber-400">{warnings}</p>
          </div>
          <div className="rounded-xl border p-4 bg-cyan-500/10 border-cyan-500/30">
            <div className="flex items-center gap-2 text-cyan-400 text-sm mb-1"><Zap className="w-4 h-4" /> Events/sec</div>
            <p className="text-3xl font-bold text-cyan-400">{eps}</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search events, sources, IPs..." className="w-full bg-gray-900/50 border border-gray-800 rounded-lg pl-10 pr-4 py-2.5 text-white text-sm focus:outline-none focus:border-violet-500/50" />
          </div>
          <select value={levelFilter} onChange={e => setLevelFilter(e.target.value)} className="bg-gray-900/50 border border-gray-800 rounded-lg px-3 py-2.5 text-white text-sm">
            <option value="all">All Levels</option>
            {Object.keys(LEVEL_STYLES).map(l => <option key={l} value={l}>{l.charAt(0).toUpperCase() + l.slice(1)}</option>)}
          </select>
          <select value={sourceFilter} onChange={e => setSourceFilter(e.target.value)} className="bg-gray-900/50 border border-gray-800 rounded-lg px-3 py-2.5 text-white text-sm">
            <option value="all">All Sources</option>
            {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div ref={logRef} className="bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-800 flex items-center justify-between">
            <span className="text-sm text-gray-400">{filtered.length} events {searchQuery && `matching "${searchQuery}"`}</span>
            {live && <span className="text-xs text-emerald-400 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> +{liveCount} new events</span>}
          </div>
          <div className="max-h-[500px] overflow-y-auto divide-y divide-gray-800/50">
            {filtered.map((event, i) => {
              const style = LEVEL_STYLES[event.level];
              return (
                <motion.div key={event.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }} className="px-5 py-3 hover:bg-gray-800/20 transition-colors">
                  <div className="flex items-start gap-3">
                    <span className={clsx("w-2 h-2 rounded-full mt-1.5 shrink-0", style.dot)} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={clsx("text-[10px] px-1.5 py-0.5 rounded border uppercase font-mono", style.bg, style.border, style.color)}>{event.level}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-400 border border-gray-700">{event.source}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-500 border border-gray-700">{event.category}</span>
                        <span className="text-gray-600 text-[10px] font-mono ml-auto shrink-0">{new Date(event.timestamp).toLocaleTimeString()}</span>
                      </div>
                      <p className="text-sm text-white">{event.message}</p>
                      {event.metadata && (
                        <div className="flex gap-3 mt-1 flex-wrap">
                          {Object.entries(event.metadata).map(([k, v]) => (
                            <span key={k} className="text-[10px] text-gray-500 font-mono">{k}=<span className="text-gray-400">{v}</span></span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
