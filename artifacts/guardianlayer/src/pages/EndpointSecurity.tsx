import { useState, useEffect } from "react";
import {
  useListEndpoints,
  useGetEndpointStats,
  type EndpointDevice,
} from "@workspace/api-client-react";
import { format } from "date-fns";
import { motion } from "framer-motion";
import {
  Monitor,
  Laptop,
  Server,
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HardDrive,
  Bug,
  Wrench,
  Lock,
  Flame,
  Wifi,
  Scan,
  FileX,
  ChevronDown,
  ChevronUp,
  Cpu,
  Activity,
  CheckCircle,
  ClipboardCheck,
  Clock,
  RefreshCw,
  Download,
} from "lucide-react";
import { clsx } from "clsx";

import { PageHeader } from "@/components/ui/PageHeader";
import { CyberLoading } from "@/components/ui/CyberLoading";

const DEVICE_ICONS: Record<string, typeof Monitor> = {
  workstation: Monitor,
  laptop: Laptop,
  server: Server,
  kiosk: HardDrive,
};

const STATUS_COLORS: Record<string, string> = {
  online: "text-emerald-400",
  offline: "text-rose-400",
  degraded: "text-amber-400",
};

const COMPLIANCE_BADGE: Record<string, string> = {
  compliant: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  non_compliant: "bg-rose-500/20 text-rose-400 border-rose-500/30",
  at_risk: "bg-amber-500/20 text-amber-400 border-amber-500/30",
};

type StatusFilter = "online" | "offline" | "degraded" | undefined;
type ComplianceFilter = "compliant" | "non_compliant" | "at_risk" | undefined;
type Tab = "fleet" | "malware" | "patches";

export default function EndpointSecurity() {
  const [activeTab, setActiveTab] = useState<Tab>("fleet");

  const tabs: { id: Tab; label: string; icon: typeof Monitor }[] = [
    { id: "fleet", label: "Device Fleet", icon: Monitor },
    { id: "malware", label: "Malware Detection", icon: Bug },
    { id: "patches", label: "Patch Compliance", icon: ClipboardCheck },
  ];

  return (
    <div className="pb-12">
      <PageHeader
        title="Endpoint Security"
        description="AI-driven endpoint monitoring, compliance enforcement, and vulnerability management."
      />

      <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={clsx(
              "flex items-center gap-2 px-5 py-3 rounded-xl font-display text-sm uppercase tracking-wider transition-all duration-300 whitespace-nowrap",
              activeTab === tab.id
                ? "bg-primary/10 text-primary border border-primary/20 shadow-[inset_0_0_20px_rgba(6,182,212,0.1)]"
                : "text-muted-foreground hover:bg-white/5 hover:text-foreground glass-panel"
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "fleet" && <DeviceFleetPanel />}
      {activeTab === "malware" && <MalwareDetectionPanel />}
      {activeTab === "patches" && <PatchCompliancePanel />}
    </div>
  );
}

function DeviceFleetPanel() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(undefined);
  const [complianceFilter, setComplianceFilter] = useState<ComplianceFilter>(undefined);

  const { data: stats, isLoading: isStatsLoading } = useGetEndpointStats();
  const { data: endpointsData, isLoading: isEndpointsLoading } = useListEndpoints({
    status: statusFilter,
    complianceStatus: complianceFilter,
  });

  if (isStatsLoading) return <CyberLoading text="SCANNING ENDPOINT FLEET..." />;

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-9 gap-4 mb-8">
        {[
          { label: "Total Devices", value: stats?.totalDevices ?? 0, icon: Monitor, color: "text-primary" },
          { label: "Online", value: stats?.onlineCount ?? 0, icon: Wifi, color: "text-emerald-400" },
          { label: "Offline", value: stats?.offlineCount ?? 0, icon: XCircle, color: "text-rose-400" },
          { label: "Compliant", value: stats?.compliantCount ?? 0, icon: ShieldCheck, color: "text-emerald-400" },
          { label: "Non-Compliant", value: stats?.nonCompliantCount ?? 0, icon: ShieldX, color: "text-rose-400" },
          { label: "At Risk", value: stats?.atRiskCount ?? 0, icon: AlertTriangle, color: "text-amber-400" },
          { label: "Avg Risk", value: stats?.avgRiskScore?.toFixed(2) ?? "0", icon: ShieldAlert, color: "text-amber-400" },
          { label: "Vulnerabilities", value: stats?.totalVulnerabilities ?? 0, icon: Bug, color: "text-red-500" },
          { label: "Patches Pending", value: stats?.totalPatchesPending ?? 0, icon: Wrench, color: "text-orange-400" },
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

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="glass-panel p-1.5 rounded-xl inline-flex gap-1">
          <span className="px-3 py-2 text-[10px] font-display uppercase tracking-widest text-muted-foreground border-r border-white/10">Status</span>
          {[undefined, "online", "offline", "degraded"].map((s) => (
            <button
              key={s ?? "all"}
              onClick={() => setStatusFilter(s as StatusFilter)}
              className={`px-3 py-2 rounded-lg text-xs font-mono transition-colors uppercase ${
                statusFilter === s ? "bg-white/10 text-white" : "text-muted-foreground hover:text-white"
              }`}
            >
              {s ?? "All"}
            </button>
          ))}
        </div>
        <div className="glass-panel p-1.5 rounded-xl inline-flex gap-1">
          <span className="px-3 py-2 text-[10px] font-display uppercase tracking-widest text-muted-foreground border-r border-white/10">Compliance</span>
          {[undefined, "compliant", "non_compliant", "at_risk"].map((c) => (
            <button
              key={c ?? "all"}
              onClick={() => setComplianceFilter(c as ComplianceFilter)}
              className={`px-3 py-2 rounded-lg text-xs font-mono transition-colors ${
                complianceFilter === c ? "bg-white/10 text-white" : "text-muted-foreground hover:text-white"
              }`}
            >
              {c?.replace("_", " ") ?? "All"}
            </button>
          ))}
        </div>
      </div>

      {isEndpointsLoading ? (
        <CyberLoading text="LOADING DEVICES..." />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {(endpointsData?.endpoints ?? []).map((ep: EndpointDevice, idx: number) => {
            const DeviceIcon = DEVICE_ICONS[ep.deviceType] || Monitor;
            return (
              <motion.div
                key={ep.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
                className={`glass-panel rounded-xl p-5 border-l-4 ${
                  ep.complianceStatus === "non_compliant" ? "border-rose-500" :
                  ep.complianceStatus === "at_risk" ? "border-amber-400" :
                  "border-emerald-500"
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-lg bg-black/40 ${STATUS_COLORS[ep.status] || "text-primary"}`}>
                      <DeviceIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-mono text-sm text-white font-bold">{ep.hostname}</h4>
                      <p className="text-xs text-muted-foreground">{ep.os} {ep.osVersion}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${ep.status === "online" ? "bg-emerald-500 animate-pulse" : ep.status === "offline" ? "bg-rose-500" : "bg-amber-400 animate-pulse"}`} />
                    <span className={`text-[10px] font-mono uppercase ${STATUS_COLORS[ep.status]}`}>{ep.status}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="flex items-center gap-2 text-xs">
                    <span className={`px-2 py-0.5 rounded border text-[10px] font-mono uppercase ${COMPLIANCE_BADGE[ep.complianceStatus] || ""}`}>
                      {ep.complianceStatus.replace("_", " ")}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs font-mono ${ep.riskScore > 0.7 ? "text-rose-400" : ep.riskScore > 0.4 ? "text-amber-400" : "text-emerald-400"}`}>
                      Risk: {(ep.riskScore * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 mb-3">
                  <SecurityFlag icon={Lock} label="Encryption" enabled={ep.encryptionEnabled} />
                  <SecurityFlag icon={Flame} label="Firewall" enabled={ep.firewallEnabled} />
                  <SecurityFlag icon={Shield} label="Antivirus" enabled={ep.antivirusEnabled} />
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-white/5 pt-3">
                  <div className="flex gap-4">
                    {ep.vulnerabilities > 0 && (
                      <span className="text-rose-400 flex items-center gap-1">
                        <Bug className="w-3 h-3" /> {ep.vulnerabilities} vulns
                      </span>
                    )}
                    {ep.patchesPending > 0 && (
                      <span className="text-orange-400 flex items-center gap-1">
                        <Wrench className="w-3 h-3" /> {ep.patchesPending} patches
                      </span>
                    )}
                  </div>
                  <div className="flex gap-3">
                    {ep.assignedUser && <span>{ep.assignedUser}</span>}
                    {ep.location && <span>{ep.location}</span>}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </>
  );
}

function SecurityFlag({ icon: Icon, label, enabled }: { icon: typeof Shield; label: string; enabled: boolean }) {
  return (
    <div className={`flex items-center gap-1.5 text-[10px] font-mono uppercase ${enabled ? "text-emerald-400" : "text-rose-400"}`}>
      {enabled ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
      {label}
    </div>
  );
}

interface MalwareFile {
  fileName: string;
  path: string;
  detectedAt: string;
  signature: string;
  severity: string;
  action: string;
  hash: string;
}

interface BehaviorAnomaly {
  type: string;
  severity: string;
  detail: string;
  timestamp: string;
}

interface MalwareScan {
  id: number;
  hostname: string;
  deviceType: string;
  lastScanTime: string;
  scanStatus: string;
  threatsFound: number;
  quarantinedFiles: MalwareFile[];
  behaviorAnomalies: BehaviorAnomaly[];
  riskScore: number;
}

interface MalwareData {
  scans: MalwareScan[];
  summary: { totalScanned: number; threatsDetected: number; filesQuarantined: number; anomaliesDetected: number; cleanDevices: number };
}

function MalwareDetectionPanel() {
  const [data, setData] = useState<MalwareData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/endpoints/malware-scans")
      .then((r) => { if (!r.ok) throw new Error("Failed"); return r.json(); })
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <CyberLoading text="SCANNING FOR MALWARE..." />;
  if (!data) return <div className="text-muted-foreground text-center py-12">Failed to load malware scan data.</div>;

  const { scans, summary } = data;

  const severityColor = (level: string) => {
    switch (level) {
      case "critical": return "text-red-400";
      case "high": return "text-orange-400";
      case "medium": return "text-yellow-400";
      case "low": return "text-green-400";
      default: return "text-muted-foreground";
    }
  };

  const summaryCards = [
    { label: "Devices Scanned", value: summary.totalScanned, icon: Scan, color: "text-primary" },
    { label: "Threats Detected", value: summary.threatsDetected, icon: Bug, color: "text-red-400" },
    { label: "Files Quarantined", value: summary.filesQuarantined, icon: FileX, color: "text-orange-400" },
    { label: "Behavior Anomalies", value: summary.anomaliesDetected, icon: Activity, color: "text-yellow-400" },
    { label: "Clean Devices", value: summary.cleanDevices, icon: CheckCircle, color: "text-green-400" },
  ];

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-8">
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

      <div className="space-y-3">
        {scans.map((scan) => {
          const isExpanded = expandedId === scan.id;
          const DeviceIcon = DEVICE_ICONS[scan.deviceType] || Monitor;
          const hasThreats = scan.threatsFound > 0 || scan.behaviorAnomalies.length > 0;

          return (
            <motion.div
              key={scan.id}
              layout
              className="glass-panel rounded-xl border border-white/5 overflow-hidden"
            >
              <button
                onClick={() => setExpandedId(isExpanded ? null : scan.id)}
                className="w-full p-4 flex items-center gap-4 text-left hover:bg-white/[0.02] transition-colors"
              >
                <div className={`p-2.5 rounded-xl ${hasThreats ? "bg-red-500/15" : "bg-green-500/10"}`}>
                  <DeviceIcon className={`w-5 h-5 ${hasThreats ? "text-red-400" : "text-green-400"}`} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-mono font-bold text-white">{scan.hostname}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-display uppercase ${
                      scan.scanStatus === "scanning" ? "bg-blue-500/20 text-blue-400 border-blue-500/30 animate-pulse" :
                      hasThreats ? "bg-red-500/20 text-red-400 border-red-500/30" :
                      "bg-green-500/20 text-green-400 border-green-500/30"
                    }`}>
                      {scan.scanStatus === "scanning" ? "Scanning..." : hasThreats ? `${scan.threatsFound} threats` : "Clean"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Last scan: {format(new Date(scan.lastScanTime), "MMM d, HH:mm")}
                    {scan.quarantinedFiles.length > 0 && (
                      <><span className="mx-2">|</span><span className="text-orange-400">{scan.quarantinedFiles.length} quarantined</span></>
                    )}
                    {scan.behaviorAnomalies.length > 0 && (
                      <><span className="mx-2">|</span><span className="text-yellow-400">{scan.behaviorAnomalies.length} anomalies</span></>
                    )}
                  </p>
                </div>

                <div className="text-right flex items-center gap-3">
                  <div>
                    <span className="text-[10px] font-display uppercase tracking-widest text-muted-foreground block">Risk</span>
                    <span className={`text-lg font-mono font-bold ${scan.riskScore > 0.7 ? "text-red-400" : scan.riskScore > 0.3 ? "text-yellow-400" : "text-green-400"}`}>
                      {(scan.riskScore * 100).toFixed(0)}%
                    </span>
                  </div>
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </div>
              </button>

              {isExpanded && (
                <div className="px-4 pb-4 border-t border-white/5 pt-4 space-y-4">
                  {scan.quarantinedFiles.length > 0 && (
                    <div>
                      <h4 className="text-[10px] font-display uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
                        <FileX className="w-3 h-3" /> Quarantined Files & Detected Signatures
                      </h4>
                      <div className="space-y-2">
                        {scan.quarantinedFiles.map((f, i) => (
                          <div key={i} className="p-3 rounded-lg bg-black/20 border border-white/5">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-mono text-white font-bold">{f.fileName}</span>
                              <div className="flex items-center gap-2">
                                <span className={`text-[10px] px-1.5 py-0.5 rounded font-display uppercase font-bold ${severityColor(f.severity)}`}>{f.severity}</span>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded font-display uppercase ${
                                  f.action === "deleted" ? "text-red-400" : "text-orange-400"
                                }`}>{f.action}</span>
                              </div>
                            </div>
                            <p className="text-xs text-muted-foreground mb-1">{f.path}</p>
                            <div className="flex items-center gap-4 text-[10px]">
                              <span className="text-red-300 font-mono">{f.signature}</span>
                              <span className="text-muted-foreground">Hash: <code className="text-primary/70">{f.hash.substring(0, 16)}...</code></span>
                              <span className="text-muted-foreground ml-auto">{format(new Date(f.detectedAt), "MMM d, HH:mm")}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {scan.behaviorAnomalies.length > 0 && (
                    <div>
                      <h4 className="text-[10px] font-display uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
                        <Cpu className="w-3 h-3" /> Behavior Anomalies
                      </h4>
                      <div className="space-y-2">
                        {scan.behaviorAnomalies.map((a, i) => (
                          <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-black/20 border border-white/5">
                            <AlertTriangle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${severityColor(a.severity)}`} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`text-[10px] px-1.5 py-0.5 rounded font-display uppercase font-bold ${severityColor(a.severity)}`}>{a.severity}</span>
                                <span className="text-[10px] text-muted-foreground font-display uppercase">{a.type.replace(/_/g, " ")}</span>
                                <span className="text-[10px] text-muted-foreground font-mono ml-auto">{format(new Date(a.timestamp), "MMM d, HH:mm")}</span>
                              </div>
                              <p className="text-xs text-gray-300">{a.detail}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {scan.quarantinedFiles.length === 0 && scan.behaviorAnomalies.length === 0 && (
                    <div className="text-center py-6 text-muted-foreground">
                      <CheckCircle className="w-6 h-6 mx-auto mb-2 text-green-400" />
                      <p className="text-xs font-display uppercase tracking-wider">No threats or anomalies detected</p>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </>
  );
}

interface MissingPatch {
  id: string;
  title: string;
  severity: string;
  cveScore: number;
  cveId: string;
  category: string;
  releaseDate: string;
  daysOverdue: number;
}

interface PatchDevice {
  id: number;
  hostname: string;
  deviceType: string;
  os: string;
  osVersion: string;
  lastPatchCheck: string;
  complianceStatus: string;
  missingPatches: MissingPatch[];
  totalMissing: number;
  criticalMissing: number;
  highMissing: number;
  lastReboot: string;
  autoUpdateEnabled: boolean;
}

interface PatchData {
  devices: PatchDevice[];
  summary: { totalDevices: number; compliant: number; nonCompliant: number; totalMissingPatches: number; criticalPatches: number };
}

function PatchCompliancePanel() {
  const [data, setData] = useState<PatchData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    fetch("/api/endpoints/patch-compliance")
      .then((r) => { if (!r.ok) throw new Error("Failed"); return r.json(); })
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <CyberLoading text="CHECKING PATCH STATUS..." />;
  if (!data) return <div className="text-muted-foreground text-center py-12">Failed to load patch compliance data.</div>;

  const { devices, summary } = data;

  const filtered = filter === "all" ? devices : devices.filter((d) => d.complianceStatus === filter);

  const severityColor = (level: string) => {
    switch (level) {
      case "critical": return "text-red-400";
      case "high": return "text-orange-400";
      case "medium": return "text-yellow-400";
      case "low": return "text-green-400";
      default: return "text-muted-foreground";
    }
  };

  const cveColor = (score: number) => {
    if (score >= 9.0) return "text-red-400";
    if (score >= 7.0) return "text-orange-400";
    if (score >= 4.0) return "text-yellow-400";
    return "text-green-400";
  };

  const summaryCards = [
    { label: "Total Devices", value: summary.totalDevices, icon: Monitor, color: "text-primary" },
    { label: "Compliant", value: summary.compliant, icon: ShieldCheck, color: "text-green-400" },
    { label: "Non-Compliant", value: summary.nonCompliant, icon: ShieldX, color: "text-red-400" },
    { label: "Missing Patches", value: summary.totalMissingPatches, icon: Download, color: "text-orange-400" },
    { label: "Critical Patches", value: summary.criticalPatches, icon: AlertTriangle, color: "text-red-400" },
  ];

  const filterButtons = [
    { label: "All", value: "all" },
    { label: "Compliant", value: "compliant" },
    { label: "At Risk", value: "at_risk" },
    { label: "Non-Compliant", value: "non_compliant" },
  ];

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-8">
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

      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        <span className="text-[10px] font-display uppercase tracking-widest text-muted-foreground self-center mr-2">Status</span>
        {filterButtons.map((btn) => (
          <button
            key={btn.value}
            onClick={() => setFilter(btn.value)}
            className={clsx(
              "px-3 py-1.5 rounded-lg text-xs font-display uppercase tracking-wider transition-all",
              filter === btn.value
                ? "bg-primary/20 text-primary border border-primary/30"
                : "text-muted-foreground hover:text-white hover:bg-white/5 border border-transparent"
            )}
          >
            {btn.label}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map((device) => {
          const isExpanded = expandedId === device.id;
          const DeviceIcon = DEVICE_ICONS[device.deviceType] || Monitor;

          return (
            <motion.div
              key={device.id}
              layout
              className="glass-panel rounded-xl border border-white/5 overflow-hidden"
            >
              <button
                onClick={() => setExpandedId(isExpanded ? null : device.id)}
                className="w-full p-4 flex items-center gap-4 text-left hover:bg-white/[0.02] transition-colors"
              >
                <div className={`p-2.5 rounded-xl ${
                  device.complianceStatus === "non_compliant" ? "bg-red-500/15" :
                  device.complianceStatus === "at_risk" ? "bg-yellow-500/10" : "bg-green-500/10"
                }`}>
                  <DeviceIcon className={`w-5 h-5 ${
                    device.complianceStatus === "non_compliant" ? "text-red-400" :
                    device.complianceStatus === "at_risk" ? "text-yellow-400" : "text-green-400"
                  }`} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-mono font-bold text-white">{device.hostname}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-display uppercase ${
                      device.complianceStatus === "non_compliant" ? "bg-red-500/20 text-red-400 border-red-500/30" :
                      device.complianceStatus === "at_risk" ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" :
                      "bg-green-500/20 text-green-400 border-green-500/30"
                    }`}>
                      {device.complianceStatus.replace("_", " ")}
                    </span>
                    {!device.autoUpdateEnabled && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full border bg-orange-500/10 text-orange-400 border-orange-500/20 font-display uppercase">
                        Auto-update off
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {device.os} {device.osVersion}
                    <span className="mx-2">|</span>
                    {device.totalMissing} missing patch{device.totalMissing !== 1 ? "es" : ""}
                    {device.criticalMissing > 0 && (
                      <><span className="mx-1">—</span><span className="text-red-400">{device.criticalMissing} critical</span></>
                    )}
                    <span className="mx-2">|</span>
                    Checked: {format(new Date(device.lastPatchCheck), "MMM d, HH:mm")}
                  </p>
                </div>

                <div className="text-right flex items-center gap-3">
                  {device.totalMissing > 0 ? (
                    <div>
                      <span className="text-[10px] font-display uppercase tracking-widest text-muted-foreground block">Missing</span>
                      <span className={`text-lg font-mono font-bold ${device.criticalMissing > 0 ? "text-red-400" : "text-yellow-400"}`}>
                        {device.totalMissing}
                      </span>
                    </div>
                  ) : (
                    <div>
                      <span className="text-[10px] font-display uppercase tracking-widest text-muted-foreground block">Status</span>
                      <CheckCircle className="w-5 h-5 text-green-400 mx-auto" />
                    </div>
                  )}
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </div>
              </button>

              {isExpanded && (
                <div className="px-4 pb-4 border-t border-white/5 pt-4 space-y-4">
                  <div className="flex items-center gap-6 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Last reboot: <span className="text-white font-mono">{format(new Date(device.lastReboot), "MMM d, yyyy")}</span></span>
                    <span className="flex items-center gap-1"><RefreshCw className="w-3 h-3" /> Auto-update: <span className={device.autoUpdateEnabled ? "text-green-400" : "text-red-400"}>{device.autoUpdateEnabled ? "Enabled" : "Disabled"}</span></span>
                  </div>

                  {device.missingPatches.length > 0 ? (
                    <div>
                      <h4 className="text-[10px] font-display uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
                        <Download className="w-3 h-3" /> Missing Patches
                      </h4>
                      <div className="space-y-2">
                        {device.missingPatches.map((patch) => (
                          <div key={patch.id} className="p-3 rounded-lg bg-black/20 border border-white/5">
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-mono text-white font-bold">{patch.id}</span>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded font-display uppercase font-bold ${severityColor(patch.severity)}`}>{patch.severity}</span>
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/30 text-muted-foreground font-mono">{patch.category}</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className={`text-sm font-mono font-bold ${cveColor(patch.cveScore)}`}>CVSS {patch.cveScore}</span>
                              </div>
                            </div>
                            <p className="text-xs text-gray-300 mb-1">{patch.title}</p>
                            <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
                              <span className="font-mono text-primary/70">{patch.cveId}</span>
                              <span>Released: {patch.releaseDate}</span>
                              <span className={patch.daysOverdue > 60 ? "text-red-400 font-bold" : patch.daysOverdue > 30 ? "text-orange-400" : "text-yellow-400"}>
                                {patch.daysOverdue} days overdue
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-6 text-muted-foreground">
                      <CheckCircle className="w-6 h-6 mx-auto mb-2 text-green-400" />
                      <p className="text-xs font-display uppercase tracking-wider">All patches up to date</p>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          );
        })}

        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <CheckCircle className="w-8 h-8 mx-auto mb-3 text-green-400" />
            <p className="font-display text-sm uppercase tracking-wider">No devices match this filter</p>
          </div>
        )}
      </div>
    </>
  );
}
