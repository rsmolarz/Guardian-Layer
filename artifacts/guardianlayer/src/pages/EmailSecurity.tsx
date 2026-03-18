import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListEmailThreats,
  useGetEmailSecurityStats,
  useQuarantineEmail,
  useReleaseEmail,
  getListEmailThreatsQueryKey,
  getGetEmailSecurityStatsQueryKey,
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
  CheckCircle,
  XCircle,
  Key,
  FileCheck,
  RefreshCw,
} from "lucide-react";
import { clsx } from "clsx";

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
type Tab = "threats" | "auth-monitor";

export default function EmailSecurity() {
  const [activeTab, setActiveTab] = useState<Tab>("threats");

  const tabs: { id: Tab; label: string; icon: typeof Mail }[] = [
    { id: "threats", label: "Threat Scanner", icon: ShieldAlert },
    { id: "auth-monitor", label: "Auth Monitor", icon: Key },
  ];

  return (
    <div className="pb-12">
      <PageHeader
        title="Email Security"
        description="AI-powered email threat detection, phishing analysis, authentication monitoring, and quarantine management."
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

      {activeTab === "threats" && <ThreatScannerPanel />}
      {activeTab === "auth-monitor" && <AuthMonitorPanel />}
    </div>
  );
}

function ThreatScannerPanel() {
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
    <>
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
    </>
  );
}

type AuthRecord = {
  status: string;
  record?: string | null;
  selector?: string | null;
  keyLength?: number | null;
  policy?: string | null;
  lastChecked: string;
  issues: string[];
};

type DomainAuth = {
  domain: string;
  spf: AuthRecord;
  dkim: AuthRecord;
  dmarc: AuthRecord;
  overallScore: number;
  recommendations: string[];
};

type AuthMonitorData = {
  domains: DomainAuth[];
  summary: { totalDomains: number; fullyAuthenticated: number; atRisk: number; avgScore: number };
};

function AuthMonitorPanel() {
  const [data, setData] = useState<AuthMonitorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedDomain, setExpandedDomain] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/email-security/auth-monitor")
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <CyberLoading text="QUERYING DNS RECORDS..." />;
  if (!data) return <div className="text-center text-muted-foreground py-12">Failed to load auth monitor data.</div>;

  const { domains, summary } = data;

  const statusIcon = (s: string) => {
    if (s === "pass") return <CheckCircle className="w-4 h-4 text-emerald-400" />;
    if (s === "warning") return <AlertTriangle className="w-4 h-4 text-amber-400" />;
    return <XCircle className="w-4 h-4 text-rose-400" />;
  };

  const statusColor = (s: string) => {
    if (s === "pass") return "text-emerald-400";
    if (s === "warning") return "text-amber-400";
    return "text-rose-400";
  };

  const statusBg = (s: string) => {
    if (s === "pass") return "bg-emerald-500/10 border-emerald-500/20";
    if (s === "warning") return "bg-amber-500/10 border-amber-500/20";
    return "bg-rose-500/10 border-rose-500/20";
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Monitored Domains", value: summary.totalDomains, icon: Globe, color: "text-primary" },
          { label: "Fully Authenticated", value: summary.fullyAuthenticated, icon: CheckCircle, color: "text-emerald-400" },
          { label: "At Risk", value: summary.atRisk, icon: AlertTriangle, color: summary.atRisk > 0 ? "text-rose-400" : "text-emerald-400" },
          { label: "Avg Auth Score", value: `${summary.avgScore}%`, icon: Shield, color: summary.avgScore > 80 ? "text-emerald-400" : summary.avgScore > 50 ? "text-amber-400" : "text-rose-400" },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="glass-panel p-5 rounded-xl relative overflow-hidden"
          >
            <div className={`absolute top-0 right-0 p-3 opacity-10 ${stat.color}`}>
              <stat.icon className="w-12 h-12" />
            </div>
            <span className="font-display uppercase text-[10px] tracking-widest text-muted-foreground block mb-2">{stat.label}</span>
            <span className={clsx("text-2xl font-mono font-bold", stat.color)}>{stat.value}</span>
          </motion.div>
        ))}
      </div>

      <div className="space-y-4">
        {domains.map((domain, i) => {
          const isExpanded = expandedDomain === domain.domain;
          const borderColor = domain.overallScore >= 90 ? "border-emerald-500" :
            domain.overallScore >= 50 ? "border-amber-400" : "border-rose-500";

          return (
            <motion.div
              key={domain.domain}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={clsx("glass-panel rounded-xl border-l-4 overflow-hidden", borderColor)}
            >
              <div
                className="p-5 cursor-pointer flex items-center justify-between"
                onClick={() => setExpandedDomain(isExpanded ? null : domain.domain)}
              >
                <div className="flex items-center gap-4">
                  <Globe className={clsx("w-6 h-6",
                    domain.overallScore >= 90 ? "text-emerald-400" :
                    domain.overallScore >= 50 ? "text-amber-400" : "text-rose-400"
                  )} />
                  <div>
                    <h4 className="font-display text-sm text-white">{domain.domain}</h4>
                    <div className="flex items-center gap-3 mt-1">
                      <div className="flex items-center gap-1.5">
                        {statusIcon(domain.spf.status)}
                        <span className="text-[10px] font-mono text-muted-foreground">SPF</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {statusIcon(domain.dkim.status)}
                        <span className="text-[10px] font-mono text-muted-foreground">DKIM</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {statusIcon(domain.dmarc.status)}
                        <span className="text-[10px] font-mono text-muted-foreground">DMARC</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span className={clsx("text-xl font-mono font-bold",
                      domain.overallScore >= 90 ? "text-emerald-400" :
                      domain.overallScore >= 50 ? "text-amber-400" : "text-rose-400"
                    )}>
                      {domain.overallScore}%
                    </span>
                  </div>
                  <ChevronDown className={clsx("w-4 h-4 text-muted-foreground transition-transform", isExpanded && "rotate-180")} />
                </div>
              </div>

              {isExpanded && (
                <div className="px-5 pb-5 border-t border-white/5 pt-4 space-y-4">
                  <div className="w-full h-2 bg-black/40 rounded-full overflow-hidden">
                    <div
                      className={clsx("h-full rounded-full transition-all",
                        domain.overallScore >= 90 ? "bg-emerald-500" :
                        domain.overallScore >= 50 ? "bg-amber-400" : "bg-rose-500"
                      )}
                      style={{ width: `${domain.overallScore}%` }}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {([
                      { label: "SPF", data: domain.spf, desc: "Sender Policy Framework" },
                      { label: "DKIM", data: domain.dkim, desc: "DomainKeys Identified Mail" },
                      { label: "DMARC", data: domain.dmarc, desc: "Domain-based Message Authentication" },
                    ] as const).map((auth) => (
                      <div key={auth.label} className={clsx("p-4 rounded-xl border", statusBg(auth.data.status))}>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            {statusIcon(auth.data.status)}
                            <span className="font-display text-sm text-white">{auth.label}</span>
                          </div>
                          <span className={clsx("text-[10px] font-mono uppercase tracking-widest", statusColor(auth.data.status))}>
                            {auth.data.status}
                          </span>
                        </div>
                        <p className="text-[10px] font-mono text-muted-foreground mb-2">{auth.desc}</p>
                        {auth.data.record && (
                          <div className="bg-black/30 rounded-lg p-2 mb-2">
                            <code className="text-[10px] font-mono text-primary/80 break-all">{auth.data.record}</code>
                          </div>
                        )}
                        {auth.label === "DKIM" && auth.data.selector && (
                          <div className="text-xs font-mono text-muted-foreground mb-1">
                            Selector: <span className="text-white">{auth.data.selector}</span>
                            {auth.data.keyLength && <> · Key: <span className={auth.data.keyLength >= 2048 ? "text-emerald-400" : "text-amber-400"}>{auth.data.keyLength} bits</span></>}
                          </div>
                        )}
                        {auth.label === "DMARC" && auth.data.policy && (
                          <div className="text-xs font-mono text-muted-foreground mb-1">
                            Policy: <span className={auth.data.policy === "reject" ? "text-emerald-400" : auth.data.policy === "quarantine" ? "text-amber-400" : "text-rose-400"}>{auth.data.policy}</span>
                          </div>
                        )}
                        {auth.data.issues.length > 0 && (
                          <ul className="mt-2 space-y-1">
                            {auth.data.issues.map((issue: string, j: number) => (
                              <li key={j} className="flex items-start gap-1.5 text-[10px] text-muted-foreground">
                                <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0 mt-0.5" />
                                {issue}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>

                  {domain.recommendations.length > 0 && (
                    <div className="glass-panel p-4 rounded-xl">
                      <h5 className="text-[10px] font-display uppercase tracking-widest text-primary mb-3 flex items-center gap-2">
                        <FileCheck className="w-3 h-3" />
                        Recommendations
                      </h5>
                      <ul className="space-y-2">
                        {domain.recommendations.map((rec, j) => (
                          <li key={j} className={clsx("flex items-start gap-2 text-xs",
                            rec.startsWith("CRITICAL") ? "text-rose-400" : "text-muted-foreground"
                          )}>
                            <RefreshCw className={clsx("w-3 h-3 shrink-0 mt-0.5",
                              rec.startsWith("CRITICAL") ? "text-rose-400" : "text-primary"
                            )} />
                            {rec}
                          </li>
                        ))}
                      </ul>
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

function DetailRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[10px] font-display uppercase tracking-widest text-muted-foreground">{label}</span>
      <span className={`text-sm font-mono ${color || "text-white"}`}>{value}</span>
    </div>
  );
}
