import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListEmailThreats,
  useGetEmailSecurityStats,
  useQuarantineEmail,
  useReleaseEmail,
  getListEmailThreatsQueryKey,
  getGetEmailSecurityStatsQueryKey,
  type EmailThreatList,
  type EmailThreat,
} from "@workspace/api-client-react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mail,
  ShieldAlert,
  AlertTriangle,
  Shield,
  Lock,
  Unlock,
  Paperclip,
  ChevronDown,
  ChevronUp,
  Globe,
  Inbox,
  Bug,
  UserX,
  MessageSquareWarning,
  Scan,
} from "lucide-react";

import { PageHeader } from "@/components/ui/PageHeader";
import { CyberLoading } from "@/components/ui/CyberLoading";
import { useToast } from "@/hooks/use-toast";

const THREAT_ICONS: Record<string, typeof Mail> = {
  phishing: UserX,
  malware: Bug,
  spoofing: Globe,
  bec: MessageSquareWarning,
  spam: Inbox,
};

const THREAT_COLORS: Record<string, string> = {
  phishing: "text-rose-400",
  malware: "text-red-500",
  spoofing: "text-amber-400",
  bec: "text-orange-400",
  spam: "text-blue-400",
};

const STATUS_BADGE: Record<string, string> = {
  detected: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  quarantined: "bg-violet-500/20 text-violet-400 border-violet-500/30",
  released: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  blocked: "bg-rose-500/20 text-rose-400 border-rose-500/30",
};

type ThreatFilter = "phishing" | "malware" | "spoofing" | "bec" | "spam" | undefined;
type StatusFilter = "detected" | "quarantined" | "released" | "blocked" | undefined;

export default function EmailSecurity() {
  const [threatFilter, setThreatFilter] = useState<ThreatFilter>(undefined);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(undefined);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: stats, isLoading: isStatsLoading } = useGetEmailSecurityStats();
  const { data: threatsData, isLoading: isThreatsLoading } = useListEmailThreats({
    threatType: threatFilter,
    status: statusFilter,
  });

  const quarantineMutation = useQuarantineEmail();
  const releaseMutation = useReleaseEmail();

  const handleQuarantine = (id: number) => {
    quarantineMutation.mutate({ id }, {
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: getListEmailThreatsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetEmailSecurityStatsQueryKey() });
        toast({ description: data.message });
      },
    });
  };

  const handleRelease = (id: number) => {
    releaseMutation.mutate({ id }, {
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: getListEmailThreatsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetEmailSecurityStatsQueryKey() });
        toast({ description: data.message });
      },
    });
  };

  if (isStatsLoading) return <CyberLoading text="SCANNING EMAIL GATEWAY..." />;

  return (
    <div className="pb-12">
      <PageHeader
        title="Email Security"
        description="AI-powered email threat detection, phishing analysis, and quarantine management."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        {[
          { label: "Emails Scanned", value: stats?.totalScanned?.toLocaleString() ?? "0", icon: Scan, color: "text-primary" },
          { label: "Threats Found", value: stats?.threatsDetected ?? 0, icon: ShieldAlert, color: "text-rose-500" },
          { label: "Phishing Blocked", value: stats?.phishingBlocked ?? 0, icon: UserX, color: "text-rose-400" },
          { label: "Malware Blocked", value: stats?.malwareBlocked ?? 0, icon: Bug, color: "text-red-500" },
          { label: "Quarantined", value: stats?.quarantined ?? 0, icon: Lock, color: "text-violet-400" },
          { label: "Avg Risk Score", value: stats?.avgRiskScore?.toFixed(2) ?? "0", icon: AlertTriangle, color: "text-amber-400" },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="glass-panel p-5 rounded-xl relative overflow-hidden group hover:border-primary/30 transition-colors"
          >
            <div className={`absolute top-0 right-0 p-3 opacity-10 ${stat.color}`}>
              <stat.icon className="w-12 h-12" />
            </div>
            <span className="font-display uppercase text-[10px] tracking-widest text-muted-foreground block mb-2">{stat.label}</span>
            <span className="text-2xl font-mono font-bold text-foreground">{stat.value}</span>
          </motion.div>
        ))}
      </div>

      {stats && stats.topSenderDomains && stats.topSenderDomains.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel p-5 rounded-xl mb-8"
        >
          <h3 className="font-display text-sm uppercase tracking-widest text-muted-foreground mb-4">Top Threat Sender Domains</h3>
          <div className="flex flex-wrap gap-3">
            {stats.topSenderDomains.map((d) => (
              <div key={d.domain} className="glass-panel px-4 py-2 rounded-lg flex items-center gap-3">
                <Globe className="w-4 h-4 text-rose-400" />
                <span className="font-mono text-sm text-white">{d.domain}</span>
                <span className="font-mono text-xs text-muted-foreground">{d.count} threats</span>
                <span className={`font-mono text-xs ${d.avgRisk > 0.7 ? "text-rose-400" : d.avgRisk > 0.4 ? "text-amber-400" : "text-emerald-400"}`}>
                  risk: {d.avgRisk.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="glass-panel p-1.5 rounded-xl inline-flex gap-1">
          <span className="px-3 py-2 text-[10px] font-display uppercase tracking-widest text-muted-foreground border-r border-white/10">Type</span>
          {[undefined, "phishing", "malware", "spoofing", "bec", "spam"].map((t) => (
            <button
              key={t ?? "all"}
              onClick={() => setThreatFilter(t as ThreatFilter)}
              className={`px-3 py-2 rounded-lg text-xs font-mono transition-colors uppercase ${
                threatFilter === t ? "bg-white/10 text-white" : "text-muted-foreground hover:text-white"
              }`}
            >
              {t ?? "All"}
            </button>
          ))}
        </div>
        <div className="glass-panel p-1.5 rounded-xl inline-flex gap-1">
          <span className="px-3 py-2 text-[10px] font-display uppercase tracking-widest text-muted-foreground border-r border-white/10">Status</span>
          {[undefined, "detected", "quarantined", "released", "blocked"].map((s) => (
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
      </div>

      {isThreatsLoading ? (
        <CyberLoading text="ANALYZING THREATS..." />
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {(threatsData?.threats ?? []).map((threat: EmailThreat, idx: number) => {
              const Icon = THREAT_ICONS[threat.threatType] || ShieldAlert;
              const iconColor = THREAT_COLORS[threat.threatType] || "text-primary";
              const isExpanded = expandedId === threat.id;

              return (
                <motion.div
                  key={threat.id}
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.04 }}
                  className={`glass-panel rounded-xl border-l-4 overflow-hidden ${
                    threat.riskScore > 0.8 ? "border-rose-500" :
                    threat.riskScore > 0.5 ? "border-amber-400" :
                    "border-blue-400"
                  }`}
                >
                  <div
                    className="p-4 cursor-pointer flex flex-col md:flex-row gap-3 items-start md:items-center justify-between group"
                    onClick={() => setExpandedId(isExpanded ? null : threat.id)}
                  >
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`p-2.5 rounded-lg bg-black/40 ${iconColor} shrink-0`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className={`text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded border ${STATUS_BADGE[threat.status] || ""}`}>
                            {threat.status}
                          </span>
                          <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground px-2 py-0.5 rounded border border-white/10">
                            {threat.threatType}
                          </span>
                          <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                            threat.riskScore > 0.8 ? "text-rose-400 bg-rose-500/10" :
                            threat.riskScore > 0.5 ? "text-amber-400 bg-amber-500/10" :
                            "text-blue-400 bg-blue-500/10"
                          }`}>
                            Risk: {(threat.riskScore * 100).toFixed(0)}%
                          </span>
                          {threat.hasAttachment && (
                            <span className="text-[10px] font-mono text-orange-400 flex items-center gap-1">
                              <Paperclip className="w-3 h-3" />
                              {threat.attachmentName}
                            </span>
                          )}
                        </div>
                        <h4 className="text-sm font-display text-white truncate">{threat.subject}</h4>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          From: <span className="text-rose-400">{threat.sender}</span> → {threat.recipient}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {threat.status === "detected" && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleQuarantine(threat.id); }}
                          className="px-3 py-1.5 rounded-lg text-xs font-mono bg-violet-500/20 text-violet-400 border border-violet-500/30 hover:bg-violet-500/30 transition-colors flex items-center gap-1"
                        >
                          <Lock className="w-3 h-3" /> Quarantine
                        </button>
                      )}
                      {threat.status === "quarantined" && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleRelease(threat.id); }}
                          className="px-3 py-1.5 rounded-lg text-xs font-mono bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 transition-colors flex items-center gap-1"
                        >
                          <Unlock className="w-3 h-3" /> Release
                        </button>
                      )}
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                    </div>
                  </div>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-4 border-t border-white/5 pt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <DetailRow label="Sender Reputation" value={`${(threat.senderReputation * 100).toFixed(0)}%`} color={threat.senderReputation < 0.2 ? "text-rose-400" : "text-emerald-400"} />
                            {threat.country && <DetailRow label="Origin Country" value={threat.country} />}
                            {threat.ipAddress && <DetailRow label="Source IP" value={threat.ipAddress} />}
                            <DetailRow label="Detected" value={format(new Date(threat.createdAt), "PPpp")} />
                          </div>
                          <div className="space-y-2">
                            {threat.hasAttachment && threat.attachmentScanResult && (
                              <DetailRow label="Attachment Scan" value={threat.attachmentScanResult} color="text-rose-400" />
                            )}
                            {threat.details && (
                              <div>
                                <span className="text-[10px] font-display uppercase tracking-widest text-muted-foreground">AI Analysis</span>
                                <p className="text-sm text-muted-foreground mt-1">{threat.details}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[10px] font-display uppercase tracking-widest text-muted-foreground">{label}</span>
      <span className={`text-sm font-mono ${color || "text-white"}`}>{value}</span>
    </div>
  );
}
