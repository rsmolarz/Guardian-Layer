import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { clsx } from "clsx";
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  Search,
  Globe,
  Server,
  Mail,
  Lock,
  Unlock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader2,
  ExternalLink,
  Wifi,
  WifiOff,
  Bug,
  Eye,
  Fingerprint,
  Database,
  Key,
  Info,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";

type Tab = "virustotal" | "abuseipdb" | "shodan" | "hibp" | "ssllabs";

interface ServiceStatus {
  configured: boolean;
  name: string;
  description: string;
}

const VERDICT_BADGE: Record<string, string> = {
  clean: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  secure: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  normal: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  acceptable: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  suspicious: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  exposed: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  vulnerable: "bg-red-500/20 text-red-400 border-red-500/30",
  malicious: "bg-red-500/20 text-red-400 border-red-500/30",
  critical: "bg-red-500/20 text-red-400 border-red-500/30",
  "needs-improvement": "bg-orange-500/20 text-orange-400 border-orange-500/30",
  pending: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
};

export default function ThreatIntel() {
  const [tab, setTab] = useState<Tab>("virustotal");
  const [statuses, setStatuses] = useState<Record<string, ServiceStatus>>({});

  useEffect(() => {
    fetch("/api/threat-intel/status")
      .then((r) => r.json())
      .then((d) => setStatuses(d.services || {}))
      .catch(() => {});
  }, []);

  const tabs: { id: Tab; label: string; icon: any; key: string }[] = [
    { id: "virustotal", label: "VirusTotal", icon: Bug, key: "virustotal" },
    { id: "abuseipdb", label: "AbuseIPDB", icon: Fingerprint, key: "abuseipdb" },
    { id: "shodan", label: "Shodan", icon: Eye, key: "shodan" },
    { id: "hibp", label: "HIBP", icon: Database, key: "hibp" },
    { id: "ssllabs", label: "SSL Labs", icon: Lock, key: "ssllabs" },
  ];

  return (
    <div className="p-6 pb-12">
      <PageHeader
        title="Threat Intelligence Hub"
        subtitle="Scan URLs, IPs, domains, and emails against global threat databases"
      />

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
        {tabs.map((t) => {
          const s = statuses[t.key];
          return (
            <div key={t.key} className="glass-panel p-3 rounded-xl border border-white/5">
              <div className="flex items-center gap-2 mb-1">
                <t.icon className="w-4 h-4 text-primary" />
                <span className="text-[10px] font-display uppercase tracking-widest text-muted-foreground">{t.label}</span>
              </div>
              <div className="flex items-center gap-1">
                {s?.configured ? (
                  <><Wifi className="w-3 h-3 text-emerald-400" /><span className="text-xs text-emerald-400 font-mono">Ready</span></>
                ) : (
                  <><WifiOff className="w-3 h-3 text-yellow-400" /><span className="text-xs text-yellow-400 font-mono">{t.key === "ssllabs" ? "Ready" : "Needs Key"}</span></>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mb-6 flex gap-1 glass-panel p-1.5 rounded-xl w-fit flex-wrap">
        {tabs.map((t) => (
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

      {tab === "virustotal" && <VirusTotalPanel />}
      {tab === "abuseipdb" && <AbuseIPDBPanel />}
      {tab === "shodan" && <ShodanPanel />}
      {tab === "hibp" && <HIBPPanel />}
      {tab === "ssllabs" && <SSLLabsPanel />}
    </div>
  );
}

function NotConfiguredBanner({ service, setupUrl }: { service: string; setupUrl?: string }) {
  return (
    <div className="glass-panel p-6 rounded-xl border border-yellow-500/20 bg-yellow-500/5 text-center">
      <Key className="w-10 h-10 text-yellow-400 mx-auto mb-3" />
      <h3 className="text-sm font-display uppercase tracking-wider text-yellow-400 mb-2">API Key Required</h3>
      <p className="text-xs text-gray-300 mb-3">
        {service} requires an API key to function. Add the key to your environment secrets to enable this scanner.
      </p>
      {setupUrl && (
        <a
          href={setupUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-display uppercase tracking-wider bg-yellow-500/20 border border-yellow-500/40 text-yellow-400 hover:bg-yellow-500/30 transition-colors"
        >
          <ExternalLink className="w-3 h-3" /> Get Free API Key
        </a>
      )}
    </div>
  );
}

function VirusTotalPanel() {
  const [mode, setMode] = useState<"url" | "domain">("url");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const scan = async () => {
    if (!input.trim() || loading) return;
    setLoading(true);
    setResult(null);
    try {
      let res;
      if (mode === "url") {
        res = await fetch("/api/threat-intel/virustotal/url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: input.trim() }),
        });
      } else {
        res = await fetch(`/api/threat-intel/virustotal/domain/${encodeURIComponent(input.trim())}`);
      }
      setResult(await res.json());
    } catch { setResult({ error: "Scan failed" }); }
    setLoading(false);
  };

  if (result && result.configured === false) {
    return <NotConfiguredBanner service="VirusTotal" setupUrl={result.setupUrl} />;
  }

  return (
    <div className="space-y-4">
      <div className="glass-panel p-4 rounded-xl border border-white/5">
        <div className="flex items-center gap-2 mb-3">
          <Bug className="w-4 h-4 text-primary" />
          <span className="text-xs font-display uppercase tracking-widest text-white">VirusTotal Scanner</span>
        </div>
        <p className="text-xs text-gray-400 mb-4">Scan URLs and domains against 70+ antivirus engines and threat databases.</p>
        <div className="flex gap-2 mb-3">
          {(["url", "domain"] as const).map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); setResult(null); }}
              className={clsx(
                "px-3 py-1.5 rounded-lg text-xs font-display uppercase tracking-wider border transition-colors",
                mode === m ? "bg-primary/20 border-primary/50 text-primary" : "border-white/10 text-muted-foreground hover:border-white/20"
              )}
            >
              {m === "url" ? "URL Scan" : "Domain Lookup"}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={mode === "url" ? "https://example.com/suspicious-page" : "example.com"}
            className="flex-1 px-4 py-2.5 rounded-lg bg-black/40 border border-white/10 text-sm text-white placeholder-gray-500 focus:border-primary/40 focus:outline-none"
            onKeyDown={(e) => { if (e.key === "Enter") scan(); }}
          />
          <button
            onClick={scan}
            disabled={!input.trim() || loading}
            className={clsx(
              "px-4 py-2.5 rounded-lg text-xs font-display uppercase tracking-wider flex items-center gap-2 transition-colors",
              input.trim() && !loading
                ? "bg-primary/20 border border-primary/40 text-primary hover:bg-primary/30"
                : "bg-white/5 border border-white/10 text-gray-500 cursor-not-allowed"
            )}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Scan
          </button>
        </div>
      </div>

      {result && !result.error && mode === "url" && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-panel p-4 rounded-xl border border-white/5">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-display text-white">Scan Results</span>
            <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border ${VERDICT_BADGE[result.verdict] || ""}`}>
              {result.verdict}
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
            {[
              { label: "Malicious", value: result.stats?.malicious, color: "text-red-400" },
              { label: "Suspicious", value: result.stats?.suspicious, color: "text-orange-400" },
              { label: "Harmless", value: result.stats?.harmless, color: "text-emerald-400" },
              { label: "Undetected", value: result.stats?.undetected, color: "text-gray-400" },
              { label: "Total Engines", value: result.totalEngines, color: "text-primary" },
            ].map((s) => (
              <div key={s.label} className="p-3 rounded-lg bg-black/20 border border-white/5 text-center">
                <span className="text-[10px] font-display uppercase tracking-widest text-muted-foreground block mb-1">{s.label}</span>
                <span className={`text-xl font-mono font-bold ${s.color}`}>{s.value}</span>
              </div>
            ))}
          </div>
          {result.detections?.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-display uppercase tracking-widest text-red-400">Detections ({result.detections.length})</span>
              {result.detections.map((d: any, i: number) => (
                <div key={i} className="p-2 rounded-lg bg-red-500/5 border border-red-500/15 flex items-center justify-between">
                  <span className="text-xs font-mono text-white">{d.engine}</span>
                  <span className="text-xs font-mono text-red-400">{d.result || d.category}</span>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {result && !result.error && mode === "domain" && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-panel p-4 rounded-xl border border-white/5">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-display text-white">Domain: {result.domain}</span>
            <span className="text-xs font-mono text-primary">Reputation: {result.reputation}</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            {[
              { label: "Malicious", value: result.lastAnalysis?.malicious, color: "text-red-400" },
              { label: "Suspicious", value: result.lastAnalysis?.suspicious, color: "text-orange-400" },
              { label: "Harmless", value: result.lastAnalysis?.harmless, color: "text-emerald-400" },
              { label: "Undetected", value: result.lastAnalysis?.undetected, color: "text-gray-400" },
            ].map((s) => (
              <div key={s.label} className="p-3 rounded-lg bg-black/20 border border-white/5 text-center">
                <span className="text-[10px] font-display uppercase tracking-widest text-muted-foreground block mb-1">{s.label}</span>
                <span className={`text-xl font-mono font-bold ${s.color}`}>{s.value}</span>
              </div>
            ))}
          </div>
          {result.registrar && (
            <div className="p-3 rounded-lg bg-black/20 border border-white/5">
              <span className="text-[10px] font-display uppercase tracking-widest text-muted-foreground block mb-1">Registrar</span>
              <span className="text-xs font-mono text-white">{result.registrar}</span>
            </div>
          )}
          {result.lastDnsRecords?.length > 0 && (
            <div className="mt-3 space-y-1">
              <span className="text-xs font-display uppercase tracking-widest text-muted-foreground">DNS Records</span>
              {result.lastDnsRecords.map((r: any, i: number) => (
                <div key={i} className="p-2 rounded-lg bg-black/20 border border-white/5 flex items-center gap-3 text-xs font-mono">
                  <span className="text-cyan-400 w-12">{r.type}</span>
                  <span className="text-white truncate">{r.value}</span>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}

function AbuseIPDBPanel() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const check = async () => {
    if (!input.trim() || loading) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(`/api/threat-intel/abuseipdb/check/${encodeURIComponent(input.trim())}`);
      setResult(await res.json());
    } catch { setResult({ error: "Check failed" }); }
    setLoading(false);
  };

  if (result && result.configured === false) {
    return <NotConfiguredBanner service="AbuseIPDB" setupUrl={result.setupUrl} />;
  }

  return (
    <div className="space-y-4">
      <div className="glass-panel p-4 rounded-xl border border-white/5">
        <div className="flex items-center gap-2 mb-3">
          <Fingerprint className="w-4 h-4 text-primary" />
          <span className="text-xs font-display uppercase tracking-widest text-white">IP Reputation Checker</span>
        </div>
        <p className="text-xs text-gray-400 mb-4">Check any IP address against AbuseIPDB's database of reported malicious IPs.</p>
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="e.g. 185.220.101.34"
            className="flex-1 px-4 py-2.5 rounded-lg bg-black/40 border border-white/10 text-sm text-white placeholder-gray-500 focus:border-primary/40 focus:outline-none"
            onKeyDown={(e) => { if (e.key === "Enter") check(); }}
          />
          <button
            onClick={check}
            disabled={!input.trim() || loading}
            className={clsx(
              "px-4 py-2.5 rounded-lg text-xs font-display uppercase tracking-wider flex items-center gap-2 transition-colors",
              input.trim() && !loading
                ? "bg-primary/20 border border-primary/40 text-primary hover:bg-primary/30"
                : "bg-white/5 border border-white/10 text-gray-500 cursor-not-allowed"
            )}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Check
          </button>
        </div>
      </div>

      {result && !result.error && result.configured !== false && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-panel p-4 rounded-xl border border-white/5">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-display text-white">IP: {result.ip}</span>
            <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border ${VERDICT_BADGE[result.verdict] || ""}`}>
              {result.verdict}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <div className="p-3 rounded-lg bg-black/20 border border-white/5 text-center">
              <span className="text-[10px] font-display uppercase tracking-widest text-muted-foreground block mb-1">Abuse Score</span>
              <span className={`text-2xl font-mono font-bold ${result.abuseConfidenceScore > 75 ? "text-red-400" : result.abuseConfidenceScore > 25 ? "text-orange-400" : "text-emerald-400"}`}>
                {result.abuseConfidenceScore}%
              </span>
            </div>
            <div className="p-3 rounded-lg bg-black/20 border border-white/5 text-center">
              <span className="text-[10px] font-display uppercase tracking-widest text-muted-foreground block mb-1">Reports</span>
              <span className="text-2xl font-mono font-bold text-white">{result.totalReports}</span>
            </div>
            <div className="p-3 rounded-lg bg-black/20 border border-white/5 text-center">
              <span className="text-[10px] font-display uppercase tracking-widest text-muted-foreground block mb-1">Country</span>
              <span className="text-lg font-mono font-bold text-white">{result.countryCode}</span>
            </div>
            <div className="p-3 rounded-lg bg-black/20 border border-white/5 text-center">
              <span className="text-[10px] font-display uppercase tracking-widest text-muted-foreground block mb-1">Reporters</span>
              <span className="text-2xl font-mono font-bold text-white">{result.numDistinctUsers}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            {[
              { label: "ISP", value: result.isp },
              { label: "Domain", value: result.domain },
              { label: "Usage", value: result.usageType },
              { label: "TOR Node", value: result.isTor ? "Yes" : "No" },
            ].map((info) => (
              <div key={info.label} className="p-2 rounded-lg bg-black/20 border border-white/5">
                <span className="text-[10px] font-display uppercase tracking-widest text-muted-foreground block">{info.label}</span>
                <span className="text-xs font-mono text-white">{info.value}</span>
              </div>
            ))}
          </div>

          {result.reports?.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-display uppercase tracking-widest text-red-400">Recent Reports</span>
              {result.reports.map((r: any, i: number) => (
                <div key={i} className="p-2 rounded-lg bg-red-500/5 border border-red-500/15">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-mono text-muted-foreground">{new Date(r.reportedAt).toLocaleString()}</span>
                    <span className="text-[10px] font-mono text-gray-400">from {r.reporterCountryCode}</span>
                  </div>
                  {r.comment && <p className="text-xs text-gray-300">{r.comment}</p>}
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}

function ShodanPanel() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const lookup = async () => {
    if (!input.trim() || loading) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(`/api/threat-intel/shodan/host/${encodeURIComponent(input.trim())}`);
      setResult(await res.json());
    } catch { setResult({ error: "Lookup failed" }); }
    setLoading(false);
  };

  if (result && result.configured === false) {
    return <NotConfiguredBanner service="Shodan" setupUrl={result.setupUrl} />;
  }

  return (
    <div className="space-y-4">
      <div className="glass-panel p-4 rounded-xl border border-white/5">
        <div className="flex items-center gap-2 mb-3">
          <Eye className="w-4 h-4 text-primary" />
          <span className="text-xs font-display uppercase tracking-widest text-white">Shodan Host Scanner</span>
        </div>
        <p className="text-xs text-gray-400 mb-4">Discover open ports, running services, and known vulnerabilities on any IP address.</p>
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="e.g. 8.8.8.8"
            className="flex-1 px-4 py-2.5 rounded-lg bg-black/40 border border-white/10 text-sm text-white placeholder-gray-500 focus:border-primary/40 focus:outline-none"
            onKeyDown={(e) => { if (e.key === "Enter") lookup(); }}
          />
          <button
            onClick={lookup}
            disabled={!input.trim() || loading}
            className={clsx(
              "px-4 py-2.5 rounded-lg text-xs font-display uppercase tracking-wider flex items-center gap-2 transition-colors",
              input.trim() && !loading
                ? "bg-primary/20 border border-primary/40 text-primary hover:bg-primary/30"
                : "bg-white/5 border border-white/10 text-gray-500 cursor-not-allowed"
            )}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Scan
          </button>
        </div>
      </div>

      {result && !result.error && result.found === false && (
        <div className="glass-panel p-6 rounded-xl border border-white/5 text-center">
          <Info className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Host not found in Shodan database</p>
        </div>
      )}

      {result && !result.error && result.found && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-panel p-4 rounded-xl border border-white/5">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-display text-white">Host: {result.ip}</span>
            <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border ${VERDICT_BADGE[result.verdict] || ""}`}>
              {result.verdict}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            {[
              { label: "Open Ports", value: result.openPorts?.length || 0 },
              { label: "Vulnerabilities", value: result.vulns?.length || 0 },
              { label: "Country", value: result.country },
              { label: "OS", value: result.os },
            ].map((s) => (
              <div key={s.label} className="p-3 rounded-lg bg-black/20 border border-white/5">
                <span className="text-[10px] font-display uppercase tracking-widest text-muted-foreground block mb-1">{s.label}</span>
                <span className="text-sm font-mono text-white">{s.value}</span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            {[
              { label: "Organization", value: result.org },
              { label: "ISP", value: result.isp },
              { label: "Hostnames", value: result.hostnames?.join(", ") || "None" },
              { label: "City", value: result.city },
            ].map((info) => (
              <div key={info.label} className="p-2 rounded-lg bg-black/20 border border-white/5">
                <span className="text-[10px] font-display uppercase tracking-widest text-muted-foreground block">{info.label}</span>
                <span className="text-xs font-mono text-white truncate block">{info.value}</span>
              </div>
            ))}
          </div>

          {result.vulns?.length > 0 && (
            <div className="mb-4">
              <span className="text-xs font-display uppercase tracking-widest text-red-400 block mb-2">Known Vulnerabilities</span>
              <div className="flex flex-wrap gap-2">
                {result.vulns.map((v: string) => (
                  <span key={v} className="text-[10px] font-mono px-2 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30">{v}</span>
                ))}
              </div>
            </div>
          )}

          {result.services?.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-display uppercase tracking-widest text-cyan-400">Services ({result.services.length})</span>
              {result.services.map((svc: any, i: number) => (
                <div key={i} className="p-3 rounded-lg bg-black/20 border border-white/5">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-xs font-mono text-primary">:{svc.port}/{svc.transport}</span>
                    <span className="text-xs font-mono text-white">{svc.product} {svc.version || ""}</span>
                    {svc.ssl && <Lock className="w-3 h-3 text-emerald-400" />}
                  </div>
                  {svc.banner && <p className="text-[10px] font-mono text-gray-500 truncate">{svc.banner}</p>}
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}

function HIBPPanel() {
  const [mode, setMode] = useState<"email" | "domain">("email");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const check = async () => {
    if (!input.trim() || loading) return;
    setLoading(true);
    setResult(null);
    try {
      const endpoint = mode === "email"
        ? `/api/threat-intel/hibp/breaches/${encodeURIComponent(input.trim())}`
        : `/api/threat-intel/hibp/domain/${encodeURIComponent(input.trim())}`;
      const res = await fetch(endpoint);
      setResult(await res.json());
    } catch { setResult({ error: "Check failed" }); }
    setLoading(false);
  };

  if (result && result.configured === false) {
    return <NotConfiguredBanner service="Have I Been Pwned" setupUrl={result.setupUrl} />;
  }

  return (
    <div className="space-y-4">
      <div className="glass-panel p-4 rounded-xl border border-white/5">
        <div className="flex items-center gap-2 mb-3">
          <Database className="w-4 h-4 text-primary" />
          <span className="text-xs font-display uppercase tracking-widest text-white">Data Breach Monitor</span>
        </div>
        <p className="text-xs text-gray-400 mb-4">Check if email addresses or domains appear in known data breaches.</p>
        <div className="flex gap-2 mb-3">
          {(["email", "domain"] as const).map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); setResult(null); }}
              className={clsx(
                "px-3 py-1.5 rounded-lg text-xs font-display uppercase tracking-wider border transition-colors",
                mode === m ? "bg-primary/20 border-primary/50 text-primary" : "border-white/10 text-muted-foreground hover:border-white/20"
              )}
            >
              {m === "email" ? "Email Check" : "Domain Check"}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={mode === "email" ? "user@example.com" : "example.com"}
            className="flex-1 px-4 py-2.5 rounded-lg bg-black/40 border border-white/10 text-sm text-white placeholder-gray-500 focus:border-primary/40 focus:outline-none"
            onKeyDown={(e) => { if (e.key === "Enter") check(); }}
          />
          <button
            onClick={check}
            disabled={!input.trim() || loading}
            className={clsx(
              "px-4 py-2.5 rounded-lg text-xs font-display uppercase tracking-wider flex items-center gap-2 transition-colors",
              input.trim() && !loading
                ? "bg-primary/20 border border-primary/40 text-primary hover:bg-primary/30"
                : "bg-white/5 border border-white/10 text-gray-500 cursor-not-allowed"
            )}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Check
          </button>
        </div>
      </div>

      {result && !result.error && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-panel p-4 rounded-xl border border-white/5">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-display text-white">{result.email || result.domain}</span>
            {result.verdict && (
              <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border ${VERDICT_BADGE[result.verdict] || ""}`}>
                {result.verdict}
              </span>
            )}
          </div>

          <div className="p-3 rounded-lg bg-black/20 border border-white/5 mb-4 text-center">
            <span className="text-[10px] font-display uppercase tracking-widest text-muted-foreground block mb-1">Breaches Found</span>
            <span className={`text-3xl font-mono font-bold ${result.totalBreaches > 0 ? "text-red-400" : "text-emerald-400"}`}>
              {result.totalBreaches}
            </span>
          </div>

          {result.totalBreaches === 0 && (
            <div className="p-4 rounded-lg bg-emerald-500/5 border border-emerald-500/20 text-center">
              <ShieldCheck className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
              <p className="text-sm text-emerald-400 font-display uppercase">No Breaches Found</p>
            </div>
          )}

          {result.breaches?.length > 0 && (
            <div className="space-y-3">
              {result.breaches.map((b: any, i: number) => (
                <div key={i} className="p-3 rounded-lg bg-red-500/5 border border-red-500/15">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-display text-white">{b.title || b.name}</span>
                    <span className="text-[10px] font-mono text-muted-foreground">{b.breachDate}</span>
                  </div>
                  {b.domain && <span className="text-[10px] font-mono text-cyan-400 block mb-1">{b.domain}</span>}
                  {b.pwnCount && <span className="text-xs font-mono text-red-400">{b.pwnCount.toLocaleString()} accounts affected</span>}
                  {b.dataClasses && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {b.dataClasses.map((dc: string) => (
                        <span key={dc} className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 border border-white/10 text-muted-foreground">{dc}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}

function SSLLabsPanel() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const analyze = async () => {
    if (!input.trim() || loading) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(`/api/threat-intel/ssllabs/analyze/${encodeURIComponent(input.trim())}`);
      setResult(await res.json());
    } catch { setResult({ error: "Analysis failed" }); }
    setLoading(false);
  };

  const gradeColor = (grade: string) => {
    if (grade === "A+" || grade === "A") return "text-emerald-400";
    if (grade === "B") return "text-yellow-400";
    if (grade === "C" || grade === "D") return "text-orange-400";
    if (grade === "F" || grade === "T") return "text-red-400";
    return "text-cyan-400";
  };

  return (
    <div className="space-y-4">
      <div className="glass-panel p-4 rounded-xl border border-white/5">
        <div className="flex items-center gap-2 mb-3">
          <Lock className="w-4 h-4 text-primary" />
          <span className="text-xs font-display uppercase tracking-widest text-white">SSL/TLS Certificate Analyzer</span>
        </div>
        <p className="text-xs text-gray-400 mb-4">Analyze SSL/TLS configuration and certificate health of any website. No API key needed.</p>
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="e.g. google.com"
            className="flex-1 px-4 py-2.5 rounded-lg bg-black/40 border border-white/10 text-sm text-white placeholder-gray-500 focus:border-primary/40 focus:outline-none"
            onKeyDown={(e) => { if (e.key === "Enter") analyze(); }}
          />
          <button
            onClick={analyze}
            disabled={!input.trim() || loading}
            className={clsx(
              "px-4 py-2.5 rounded-lg text-xs font-display uppercase tracking-wider flex items-center gap-2 transition-colors",
              input.trim() && !loading
                ? "bg-primary/20 border border-primary/40 text-primary hover:bg-primary/30"
                : "bg-white/5 border border-white/10 text-gray-500 cursor-not-allowed"
            )}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Analyze
          </button>
        </div>
        {loading && (
          <p className="text-xs text-muted-foreground mt-2">SSL analysis can take 30-60 seconds for fresh scans...</p>
        )}
      </div>

      {result && !result.error && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-panel p-4 rounded-xl border border-white/5">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-display text-white">{result.host}</span>
            <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border ${VERDICT_BADGE[result.verdict] || ""}`}>
              {result.verdict}
            </span>
          </div>

          {result.status === "READY" && result.endpoints?.length > 0 ? (
            <div className="space-y-3">
              {result.endpoints.map((ep: any, i: number) => (
                <div key={i} className={`p-4 rounded-lg border ${
                  ep.grade === "A+" || ep.grade === "A" ? "bg-emerald-500/5 border-emerald-500/15" :
                  ep.grade === "B" ? "bg-yellow-500/5 border-yellow-500/15" :
                  "bg-red-500/5 border-red-500/15"
                }`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-mono text-muted-foreground">{ep.ipAddress}</span>
                      <p className="text-xs text-gray-400">{ep.statusMessage}</p>
                    </div>
                    <div className="text-center">
                      <span className={`text-4xl font-mono font-bold ${gradeColor(ep.grade)}`}>{ep.grade}</span>
                      {ep.hasWarnings && <p className="text-[10px] text-yellow-400 mt-1">Has warnings</p>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 rounded-lg bg-cyan-500/5 border border-cyan-500/15 text-center">
              <Loader2 className="w-6 h-6 text-cyan-400 mx-auto mb-2 animate-spin" />
              <p className="text-sm text-cyan-400 font-display uppercase">Analysis in Progress</p>
              <p className="text-xs text-muted-foreground mt-1">Status: {result.status || "Processing"}</p>
              <p className="text-xs text-muted-foreground">Try again in a few moments</p>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
