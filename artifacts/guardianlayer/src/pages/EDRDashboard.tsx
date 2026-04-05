import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck, AlertTriangle, XCircle, Activity, Cpu, HardDrive, Network,
  Eye, Clock, Loader2, Play, Pause, RefreshCw, ChevronDown, ChevronRight,
  Zap, Shield, Crosshair, Ban, CheckCircle2, Info,
} from "lucide-react";
import { clsx } from "clsx";

interface Endpoint {
  id: string;
  hostname: string;
  ip: string;
  os: string;
  status: "protected" | "threat-detected" | "isolated" | "offline";
  agent: string;
  lastSeen: string;
  cpuUsage: number;
  memUsage: number;
  threats: ThreatEvent[];
}

interface ThreatEvent {
  id: string;
  type: string;
  severity: "critical" | "high" | "medium" | "low";
  description: string;
  process: string;
  path: string;
  timestamp: string;
  action: "blocked" | "quarantined" | "allowed" | "investigating";
}

const STATUS_CONFIG = {
  protected: { color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/30", icon: ShieldCheck, label: "Protected" },
  "threat-detected": { color: "text-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/30", icon: AlertTriangle, label: "Threat Detected" },
  isolated: { color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/30", icon: Ban, label: "Isolated" },
  offline: { color: "text-gray-400", bg: "bg-gray-500/10", border: "border-gray-500/30", icon: XCircle, label: "Offline" },
};

const SEVERITY_COLORS = {
  critical: "text-rose-400 bg-rose-500/10 border-rose-500/30",
  high: "text-orange-400 bg-orange-500/10 border-orange-500/30",
  medium: "text-amber-400 bg-amber-500/10 border-amber-500/30",
  low: "text-blue-400 bg-blue-500/10 border-blue-500/30",
};

function generateEndpoints(): Endpoint[] {
  const now = Date.now();
  return [
    {
      id: "ep-1", hostname: "VIENT", ip: "100.70.218.39", os: "Windows 11 Pro", status: "protected", agent: "CrowdStrike Falcon 7.14", lastSeen: new Date(now - 30000).toISOString(), cpuUsage: 23, memUsage: 45,
      threats: [],
    },
    {
      id: "ep-2", hostname: "VIENT3STX", ip: "100.72.255.50", os: "Windows 11 Pro", status: "threat-detected", agent: "CrowdStrike Falcon 7.14", lastSeen: new Date(now - 15000).toISOString(), cpuUsage: 67, memUsage: 72,
      threats: [
        { id: "t-1", type: "Ransomware", severity: "critical", description: "Suspicious file encryption behavior detected — process attempting to encrypt files in C:\\Users\\Public\\Documents", process: "svchost_update.exe", path: "C:\\Windows\\Temp\\svchost_update.exe", timestamp: new Date(now - 120000).toISOString(), action: "blocked" },
        { id: "t-2", type: "C2 Beacon", severity: "high", description: "Outbound connection to known C2 server 185.234.72.x on port 443 via encrypted tunnel", process: "powershell.exe", path: "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe", timestamp: new Date(now - 180000).toISOString(), action: "blocked" },
      ],
    },
    {
      id: "ep-3", hostname: "Framework", ip: "100.80.169.25", os: "Windows 11 Pro", status: "protected", agent: "CrowdStrike Falcon 7.14", lastSeen: new Date(now - 45000).toISOString(), cpuUsage: 12, memUsage: 38,
      threats: [],
    },
    {
      id: "ep-4", hostname: "prod-web-01", ip: "10.0.1.10", os: "Ubuntu 22.04 LTS", status: "protected", agent: "SentinelOne 23.4", lastSeen: new Date(now - 10000).toISOString(), cpuUsage: 34, memUsage: 56,
      threats: [
        { id: "t-3", type: "Privilege Escalation", severity: "medium", description: "Unexpected sudo execution by non-root user — potential CVE-2023-22809 exploit attempt", process: "bash", path: "/usr/bin/bash", timestamp: new Date(now - 600000).toISOString(), action: "quarantined" },
      ],
    },
    {
      id: "ep-5", hostname: "SURFACE-Travel", ip: "100.104.28.9", os: "Windows 11 Pro", status: "offline", agent: "CrowdStrike Falcon 7.14", lastSeen: new Date(now - 86400000).toISOString(), cpuUsage: 0, memUsage: 0,
      threats: [],
    },
    {
      id: "ep-6", hostname: "prod-db-01", ip: "10.0.1.20", os: "Rocky Linux 9.3", status: "protected", agent: "SentinelOne 23.4", lastSeen: new Date(now - 5000).toISOString(), cpuUsage: 41, memUsage: 63,
      threats: [],
    },
    {
      id: "ep-7", hostname: "WS-HR-004", ip: "10.0.3.22", os: "Windows 10 Enterprise", status: "isolated", agent: "CrowdStrike Falcon 7.12", lastSeen: new Date(now - 300000).toISOString(), cpuUsage: 89, memUsage: 91,
      threats: [
        { id: "t-4", type: "Malware", severity: "critical", description: "Trojan.GenericKD detected — binary matches known APT28 toolkit signature", process: "update_service.exe", path: "C:\\ProgramData\\update_service.exe", timestamp: new Date(now - 3600000).toISOString(), action: "quarantined" },
        { id: "t-5", type: "Data Exfiltration", severity: "high", description: "Large volume of data being staged for transfer to external IP via DNS tunneling", process: "dns_helper.exe", path: "C:\\ProgramData\\dns_helper.exe", timestamp: new Date(now - 3500000).toISOString(), action: "blocked" },
        { id: "t-6", type: "Persistence", severity: "high", description: "New scheduled task created to execute suspicious binary on system boot", process: "schtasks.exe", path: "C:\\Windows\\System32\\schtasks.exe", timestamp: new Date(now - 3400000).toISOString(), action: "blocked" },
      ],
    },
    {
      id: "ep-8", hostname: "homeassistant", ip: "100.117.115.24", os: "Linux (HassOS)", status: "protected", agent: "OSSEC 3.7", lastSeen: new Date(now - 60000).toISOString(), cpuUsage: 8, memUsage: 22,
      threats: [],
    },
  ];
}

function ThreatRow({ threat }: { threat: ThreatEvent }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="border-b border-gray-800/50 last:border-0">
      <button onClick={() => setExpanded(!expanded)} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-800/30 transition-colors text-left">
        {expanded ? <ChevronDown className="w-3.5 h-3.5 text-gray-500 shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 text-gray-500 shrink-0" />}
        <span className={clsx("text-[10px] px-1.5 py-0.5 rounded border font-mono uppercase shrink-0", SEVERITY_COLORS[threat.severity])}>{threat.severity}</span>
        <span className="text-white text-sm flex-1 truncate">{threat.type}</span>
        <span className={clsx("text-[10px] px-2 py-0.5 rounded-full shrink-0",
          threat.action === "blocked" ? "text-emerald-400 bg-emerald-500/10" :
          threat.action === "quarantined" ? "text-amber-400 bg-amber-500/10" :
          threat.action === "investigating" ? "text-cyan-400 bg-cyan-500/10" :
          "text-rose-400 bg-rose-500/10"
        )}>{threat.action}</span>
        <span className="text-gray-500 text-xs shrink-0">{new Date(threat.timestamp).toLocaleTimeString()}</span>
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
            <div className="px-4 pb-3 pl-12 space-y-1">
              <p className="text-gray-400 text-xs">{threat.description}</p>
              <div className="flex gap-4 text-[11px] text-gray-500 font-mono">
                <span>Process: {threat.process}</span>
                <span>Path: {threat.path}</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function EDRDashboard() {
  const [endpoints] = useState(generateEndpoints);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);

  const selected = endpoints.find(e => e.id === selectedId);
  const totalThreats = endpoints.reduce((sum, e) => sum + e.threats.length, 0);
  const protectedCount = endpoints.filter(e => e.status === "protected").length;
  const threatCount = endpoints.filter(e => e.status === "threat-detected").length;
  const isolatedCount = endpoints.filter(e => e.status === "isolated").length;

  const handleFullScan = async () => {
    setScanning(true);
    await new Promise(r => setTimeout(r, 3000));
    setScanning(false);
  };

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30">
              <Crosshair className="w-6 h-6 text-rose-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Endpoint Detection & Response</h1>
              <p className="text-gray-400 text-sm">Real-time threat detection, investigation, and automated response</p>
            </div>
          </div>
          <button onClick={handleFullScan} disabled={scanning} className="flex items-center gap-2 bg-rose-600 hover:bg-rose-500 disabled:bg-gray-700 text-white font-medium px-5 py-2 rounded-lg transition-all text-sm disabled:opacity-50">
            {scanning ? <><Loader2 className="w-4 h-4 animate-spin" /> Scanning...</> : <><RefreshCw className="w-4 h-4" /> Full Scan</>}
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-xl border p-4 bg-emerald-500/10 border-emerald-500/30">
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <span className="text-sm font-medium text-emerald-400">Protected</span>
            </div>
            <p className="text-3xl font-bold text-emerald-400">{protectedCount}</p>
          </div>
          <div className="rounded-xl border p-4 bg-rose-500/10 border-rose-500/30">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-rose-400" />
              <span className="text-sm font-medium text-rose-400">Threats</span>
            </div>
            <p className="text-3xl font-bold text-rose-400">{threatCount}</p>
          </div>
          <div className="rounded-xl border p-4 bg-amber-500/10 border-amber-500/30">
            <div className="flex items-center gap-2 mb-2">
              <Ban className="w-5 h-5 text-amber-400" />
              <span className="text-sm font-medium text-amber-400">Isolated</span>
            </div>
            <p className="text-3xl font-bold text-amber-400">{isolatedCount}</p>
          </div>
          <div className="rounded-xl border p-4 bg-cyan-500/10 border-cyan-500/30">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-5 h-5 text-cyan-400" />
              <span className="text-sm font-medium text-cyan-400">Total Events</span>
            </div>
            <p className="text-3xl font-bold text-cyan-400">{totalThreats}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-2">
            <h2 className="text-sm font-display uppercase tracking-widest text-gray-400 mb-3">Monitored Endpoints</h2>
            {endpoints.map(ep => {
              const cfg = STATUS_CONFIG[ep.status];
              const Icon = cfg.icon;
              return (
                <button key={ep.id} onClick={() => setSelectedId(ep.id)} className={clsx(
                  "w-full text-left p-3 rounded-xl border transition-all",
                  selectedId === ep.id ? "bg-cyan-500/10 border-cyan-500/30" : `${cfg.bg} ${cfg.border} hover:bg-white/5`
                )}>
                  <div className="flex items-center gap-3">
                    <Icon className={clsx("w-4 h-4 shrink-0", cfg.color)} />
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">{ep.hostname}</p>
                      <p className="text-gray-500 text-xs">{ep.ip} · {ep.os}</p>
                    </div>
                    {ep.threats.length > 0 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-rose-500/20 text-rose-400 font-mono">{ep.threats.length}</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="lg:col-span-2">
            {selected ? (
              <div className="space-y-4">
                <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-white">{selected.hostname}</h3>
                      <p className="text-gray-400 text-sm">{selected.ip} · {selected.os} · Agent: {selected.agent}</p>
                    </div>
                    <span className={clsx("text-xs px-3 py-1.5 rounded-lg border", STATUS_CONFIG[selected.status].bg, STATUS_CONFIG[selected.status].border, STATUS_CONFIG[selected.status].color)}>
                      {STATUS_CONFIG[selected.status].label}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-3 rounded-lg bg-gray-800/50">
                      <div className="flex items-center gap-2 text-gray-400 text-xs mb-1"><Cpu className="w-3.5 h-3.5" /> CPU</div>
                      <p className={clsx("text-xl font-bold", selected.cpuUsage > 80 ? "text-rose-400" : selected.cpuUsage > 50 ? "text-amber-400" : "text-emerald-400")}>{selected.cpuUsage}%</p>
                    </div>
                    <div className="p-3 rounded-lg bg-gray-800/50">
                      <div className="flex items-center gap-2 text-gray-400 text-xs mb-1"><HardDrive className="w-3.5 h-3.5" /> Memory</div>
                      <p className={clsx("text-xl font-bold", selected.memUsage > 80 ? "text-rose-400" : selected.memUsage > 60 ? "text-amber-400" : "text-emerald-400")}>{selected.memUsage}%</p>
                    </div>
                    <div className="p-3 rounded-lg bg-gray-800/50">
                      <div className="flex items-center gap-2 text-gray-400 text-xs mb-1"><Clock className="w-3.5 h-3.5" /> Last Seen</div>
                      <p className="text-sm font-medium text-white">{new Date(selected.lastSeen).toLocaleTimeString()}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden">
                  <div className="px-5 py-3 border-b border-gray-800 flex items-center justify-between">
                    <h4 className="text-sm font-display uppercase tracking-wider text-gray-400">Threat Events ({selected.threats.length})</h4>
                  </div>
                  {selected.threats.length === 0 ? (
                    <div className="p-8 text-center">
                      <ShieldCheck className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
                      <p className="text-emerald-400 text-sm">No threats detected</p>
                    </div>
                  ) : (
                    selected.threats.map(t => <ThreatRow key={t.id} threat={t} />)
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-12 flex flex-col items-center justify-center">
                <Crosshair className="w-12 h-12 text-gray-600 mb-3" />
                <p className="text-gray-500">Select an endpoint to view details</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
