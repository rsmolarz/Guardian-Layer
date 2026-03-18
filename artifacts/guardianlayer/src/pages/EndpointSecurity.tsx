import { useState } from "react";
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
} from "lucide-react";

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

export default function EndpointSecurity() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(undefined);
  const [complianceFilter, setComplianceFilter] = useState<ComplianceFilter>(undefined);

  const { data: stats, isLoading: isStatsLoading } = useGetEndpointStats();
  const { data: endpointsData, isLoading: isEndpointsLoading } = useListEndpoints({
    status: statusFilter,
    complianceStatus: complianceFilter,
  });

  if (isStatsLoading) return <CyberLoading text="SCANNING ENDPOINT FLEET..." />;

  return (
    <div className="pb-12">
      <PageHeader
        title="Endpoint Security"
        description="AI-driven endpoint monitoring, compliance enforcement, and vulnerability management."
      />

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
    </div>
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
