import { useState, useEffect, Component, type ReactNode, type ErrorInfo } from "react";
import {
  useListYubikeyDevices,
  useListYubikeyEvents,
  useGetYubikeyStats,
  type YubikeyDevice,
  type YubikeyAuthEvent,
} from "@workspace/api-client-react";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { API_BASE } from "@/lib/constants";
import { authFetch } from "@/lib/auth";
import { clsx } from "clsx";
import {
  Key,
  ShieldCheck,
  ShieldX,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  User,
  Fingerprint,
  Clock,
  Cpu,
  Usb,
  ChevronDown,
  ChevronUp,
  Package,
  Lock,
  BookOpen,
  MapPin,
  Globe,
  Truck,
  Ban,
  Brain,
  FileText,
  Shield,
  CheckCircle,
  ExternalLink,
  Siren,
  RotateCcw,
  Mail,
  Hash,
  BarChart3,
  Smartphone,
  MessageSquare,
  CircleSlash,
  Zap,
  Navigation,
  Timer,
  Layers,
} from "lucide-react";

import { PageHeader } from "@/components/ui/PageHeader";
import { CyberLoading } from "@/components/ui/CyberLoading";
import { ThreatExplainer } from "@/components/clarity/ThreatExplainer";
import { UrgencyBadge } from "@/components/clarity/UrgencyIndicators";
import { PlainEnglishThreatCard, getUrgencyFromSeverity } from "@/components/clarity/PlainEnglishThreatCard";
import { WhyThisMatters } from "@/components/clarity/WhyThisMatters";
import { ExecutiveSummary } from "@/components/clarity/ExecutiveSummary";
import { AutoJargon } from "@/components/clarity/JargonTranslator";

const STATUS_BADGE: Record<string, string> = {
  active: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  suspended: "bg-rose-500/20 text-rose-400 border-rose-500/30",
  revoked: "bg-red-500/20 text-red-400 border-red-500/30",
  unassigned: "bg-white/10 text-muted-foreground border-white/10",
};

const EVENT_BADGE: Record<string, string> = {
  auth_success: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  auth_failure: "bg-rose-500/20 text-rose-400 border-rose-500/30",
  key_enrolled: "bg-primary/20 text-primary border-primary/30",
  key_revoked: "bg-red-500/20 text-red-400 border-red-500/30",
};

type Tab = "devices" | "events" | "enrollment" | "failed-auth" | "policies" | "lost-stolen" | "mfa-compliance" | "anomaly-detector" | "register-key" | "app-coverage";
type StatusFilter = "active" | "suspended" | "revoked" | "unassigned" | undefined;
type EventFilter = "auth_success" | "auth_failure" | "key_enrolled" | "key_revoked" | undefined;

class YubikeyErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[YubiKey] Component crashed:", error, info.componentStack);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="pb-12">
          <PageHeader title="Security Keys" description="Manage physical security keys used by employees." />
          <div className="glass-panel rounded-xl p-8 text-center mt-6">
            <ShieldAlert className="w-12 h-12 text-rose-400 mx-auto mb-4" />
            <h2 className="text-lg font-bold text-white mb-2">Security Keys Module Error</h2>
            <p className="text-muted-foreground mb-4">Something went wrong loading this page. This has been logged for review.</p>
            <p className="text-xs text-rose-400/60 font-mono mb-4">{this.state.error?.message}</p>
            <button onClick={() => this.setState({ hasError: false, error: null })} className="px-4 py-2 bg-primary/20 text-primary rounded-lg hover:bg-primary/30 transition-colors">
              Try Again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function YubikeySecurity() {
  return (
    <YubikeyErrorBoundary>
      <YubikeySecurityInner />
    </YubikeyErrorBoundary>
  );
}

function YubikeySecurityInner() {
  const [tab, setTab] = useState<Tab>("devices");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(undefined);
  const [eventFilter, setEventFilter] = useState<EventFilter>(undefined);

  const { data: stats, isLoading: isStatsLoading } = useGetYubikeyStats();
  const { data: devicesData, isLoading: isDevicesLoading } = useListYubikeyDevices({ status: statusFilter });
  const { data: eventsData, isLoading: isEventsLoading } = useListYubikeyEvents({ eventType: eventFilter });

  if (isStatsLoading) return <CyberLoading text="Loading security key data..." />;

  return (
    <div className="pb-12">
      <PageHeader
        title="Security Keys"
        description="Manage physical security keys (YubiKeys) used by employees to securely log into systems."
      />

      <div className="mb-6">
        <ExecutiveSummary
          title="Security Keys"
          sections={[
            { heading: "What This Shows", content: "An overview of all physical security keys (YubiKeys) used by employees to securely log into company systems. These hardware keys provide the strongest form of authentication available." },
            { heading: "Key Metrics", content: "Active keys are working correctly. Suspended or revoked keys have been disabled. Failed logins may indicate stolen keys or brute force attacks. Recent failures deserve immediate attention." },
            { heading: "What to Do", content: "Monitor for failed login spikes — these could indicate a compromised key. Review the Lost/Stolen tab for reported keys that need deactivation. Ensure all employees in high-security roles have active keys assigned." },
          ]}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-7 gap-4 mb-8">
        {[
          { label: "Total Keys", value: stats?.totalDevices ?? 0, icon: Key, color: "text-primary" },
          { label: "Active", value: stats?.activeCount ?? 0, icon: ShieldCheck, color: "text-emerald-400" },
          { label: "Suspended", value: stats?.suspendedCount ?? 0, icon: ShieldX, color: "text-rose-400" },
          { label: "Unassigned", value: stats?.unassignedCount ?? 0, icon: Usb, color: "text-muted-foreground" },
          { label: "Successful Logins", value: stats?.totalAuthSuccess?.toLocaleString() ?? "0", icon: CheckCircle2, color: "text-emerald-400" },
          { label: "Failed Logins", value: stats?.totalAuthFail ?? 0, icon: XCircle, color: "text-rose-400" },
          { label: "Recent Failures", value: stats?.recentFailures ?? 0, icon: AlertTriangle, color: stats?.recentFailures ? "text-rose-500 animate-pulse" : "text-emerald-400" },
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

      <div className="mb-6 flex items-center gap-2 glass-panel p-1.5 rounded-xl inline-flex flex-wrap">
        {([
          { id: "devices" as Tab, label: "All Keys", icon: Key },
          { id: "events" as Tab, label: "Login History", icon: Fingerprint },
          { id: "enrollment" as Tab, label: "Key Requests", icon: Package },
          { id: "failed-auth" as Tab, label: "Failed Logins", icon: Ban },
          { id: "policies" as Tab, label: "Rules", icon: BookOpen },
          { id: "lost-stolen" as Tab, label: "Lost/Stolen", icon: ShieldAlert },
          { id: "mfa-compliance" as Tab, label: "Compliance", icon: ShieldCheck },
          { id: "anomaly-detector" as Tab, label: "Unusual Activity", icon: Brain },
          { id: "register-key" as Tab, label: "Register Key", icon: Fingerprint },
          { id: "app-coverage" as Tab, label: "App Coverage", icon: Globe },
        ]).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-5 py-2.5 rounded-lg text-sm font-display uppercase tracking-widest transition-all flex items-center gap-2 ${
              tab === t.id ? "bg-primary/15 text-primary border border-primary/20" : "text-muted-foreground hover:text-white hover:bg-white/5"
            }`}
          >
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {tab === "devices" && <FleetManagerPanel />}

      {tab === "events" && <AuditLogPanel />}

      {tab === "enrollment" && <EnrollmentPanel />}
      {tab === "failed-auth" && <FailedAuthPanel />}
      {tab === "policies" && <PoliciesPanel />}
      {tab === "lost-stolen" && <LostStolenPanel />}
      {tab === "mfa-compliance" && <MfaCompliancePanel />}
      {tab === "anomaly-detector" && <AnomalyDetectorPanel />}
      {tab === "register-key" && <RegisterKeyPanel />}
      {tab === "app-coverage" && <AppCoveragePanel />}
    </div>
  );
}

function EnrollmentPanel() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);

  useEffect(() => {
    fetch(`${API_BASE}/api/yubikey/enrollment`)
      .then((r) => { if (!r.ok) throw new Error("Failed"); return r.json(); })
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <CyberLoading text="Loading key requests..." />;
  if (!data) return <div className="text-muted-foreground text-center py-12">Couldn't load key enrollment data. Please try again.</div>;

  const { requests, summary } = data;
  const filtered = statusFilter ? requests.filter((r: any) => r.status === statusFilter) : requests;

  const statusColor = (s: string) => {
    switch (s) {
      case "pending_approval": return "text-yellow-400 bg-yellow-500/10 border-yellow-500/30";
      case "approved": return "text-primary bg-primary/10 border-primary/30";
      case "shipped": return "text-blue-400 bg-blue-500/10 border-blue-500/30";
      case "completed": return "text-emerald-400 bg-emerald-500/10 border-emerald-500/30";
      case "rejected": return "text-red-400 bg-red-500/10 border-red-500/30";
      default: return "text-muted-foreground bg-white/5 border-white/10";
    }
  };

  const priorityColor = (p: string) => {
    switch (p) {
      case "critical": return "text-red-400";
      case "high": return "text-orange-400";
      case "medium": return "text-yellow-400";
      default: return "text-muted-foreground";
    }
  };

  const borderColor = (s: string) => {
    switch (s) {
      case "pending_approval": return "border-yellow-500";
      case "approved": return "border-primary";
      case "shipped": return "border-blue-400";
      case "completed": return "border-emerald-500";
      case "rejected": return "border-red-500";
      default: return "border-white/20";
    }
  };

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {[
          { label: "Total Requests", value: summary.totalRequests, icon: Package, color: "text-primary" },
          { label: "Pending", value: summary.pending, icon: Clock, color: "text-yellow-400" },
          { label: "Approved", value: summary.approved, icon: CheckCircle2, color: "text-primary" },
          { label: "Shipped", value: summary.shipped, icon: Truck, color: "text-blue-400" },
          { label: "Completed", value: summary.completed, icon: CheckCircle, color: "text-emerald-400" },
          { label: "Rejected", value: summary.rejected, icon: XCircle, color: "text-red-400" },
        ].map((card) => (
          <div key={card.label} className="glass-panel p-4 rounded-xl border border-white/5">
            <div className="flex items-center gap-2 mb-2">
              <card.icon className={`w-4 h-4 ${card.color}`} />
              <span className="text-[10px] font-display uppercase tracking-widest text-muted-foreground">{card.label}</span>
            </div>
            <p className={`text-2xl font-mono font-bold ${card.color}`}>{card.value}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        {[undefined, "pending_approval", "approved", "shipped", "completed", "rejected"].map((s) => (
          <button
            key={s ?? "all"}
            onClick={() => setStatusFilter(s)}
            className={clsx(
              "px-3 py-1.5 rounded-lg text-xs font-display uppercase tracking-wider border transition-colors",
              statusFilter === s ? "bg-primary/20 border-primary/50 text-primary" : "border-white/10 text-muted-foreground hover:border-white/20"
            )}
          >
            {s?.replace("_", " ") ?? "All"}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map((req: any) => {
          const isExpanded = expandedId === req.id;
          return (
            <motion.div
              key={req.id}
              layout
              className={`glass-panel rounded-xl border-l-4 overflow-hidden ${borderColor(req.status)}`}
            >
              <button
                onClick={() => setExpandedId(isExpanded ? null : req.id)}
                className="w-full p-4 flex items-center gap-4 text-left hover:bg-white/[0.02] transition-colors"
              >
                <div className="p-2.5 rounded-xl bg-black/30">
                  <Package className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-sm font-mono font-bold text-white">{req.user}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded border font-display uppercase ${statusColor(req.status)}`}>
                      {req.status.replace("_", " ")}
                    </span>
                    <span className={`text-[10px] font-display uppercase ${priorityColor(req.priority)}`}>
                      {req.priority}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {req.keyType} · {req.department} · {format(new Date(req.requestDate), "MMM d, yyyy")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-muted-foreground">{req.id}</span>
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </div>
              </button>

              {isExpanded && (
                <div className="px-4 pb-4 border-t border-white/5 pt-4 space-y-3">
                  <div className="p-3 rounded-lg bg-black/30 border border-white/5">
                    <span className="text-[10px] font-display uppercase tracking-widest text-muted-foreground block mb-1">Justification</span>
                    <p className="text-xs text-gray-300">{req.justification}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-2 rounded-lg bg-black/20 border border-white/5">
                      <span className="text-[10px] font-display uppercase tracking-widest text-muted-foreground block">Email</span>
                      <span className="text-xs font-mono text-white">{req.email}</span>
                    </div>
                    <div className="p-2 rounded-lg bg-black/20 border border-white/5">
                      <span className="text-[10px] font-display uppercase tracking-widest text-muted-foreground block">Shipping</span>
                      <span className="text-xs font-mono text-white">{req.shippingAddress}</span>
                    </div>
                  </div>

                  {req.approver && (
                    <div className="p-2 rounded-lg bg-black/20 border border-white/5">
                      <span className="text-[10px] font-display uppercase tracking-widest text-muted-foreground block">Approved By</span>
                      <span className="text-xs font-mono text-white">{req.approver}</span>
                    </div>
                  )}

                  {req.trackingNumber && (
                    <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                      <div className="flex items-center gap-2">
                        <Truck className="w-3.5 h-3.5 text-blue-400" />
                        <span className="text-[10px] font-display uppercase tracking-widest text-blue-400">Tracking</span>
                      </div>
                      <span className="text-xs font-mono text-white">{req.trackingNumber}</span>
                    </div>
                  )}

                  {req.activatedDate && (
                    <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-[10px] font-display uppercase tracking-widest text-emerald-400">Activated</span>
                      </div>
                      <span className="text-xs font-mono text-white">{format(new Date(req.activatedDate), "MMM d, yyyy")}</span>
                    </div>
                  )}

                  {req.rejectionReason && (
                    <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                      <div className="flex items-center gap-2 mb-1">
                        <XCircle className="w-3.5 h-3.5 text-red-400" />
                        <span className="text-[10px] font-display uppercase tracking-widest text-red-400">Rejection Reason</span>
                      </div>
                      <p className="text-xs text-gray-300">{req.rejectionReason}</p>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          );
        })}

        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Package className="w-8 h-8 mx-auto mb-3 text-primary" />
            <p className="font-display text-sm uppercase tracking-wider">No enrollment requests match this filter</p>
          </div>
        )}
      </div>
    </>
  );
}

function FailedAuthPanel() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/yubikey/failed-auth`)
      .then((r) => { if (!r.ok) throw new Error("Failed"); return r.json(); })
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <CyberLoading text="Loading failed login attempts..." />;
  if (!data) return <div className="text-muted-foreground text-center py-12">Couldn't load failed login data. Please try again.</div>;

  const { incidents, summary } = data;

  const riskColor = (r: string) => {
    switch (r) {
      case "critical": return "text-red-400";
      case "high": return "text-orange-400";
      case "medium": return "text-yellow-400";
      default: return "text-green-400";
    }
  };

  const riskBorder = (r: string) => {
    switch (r) {
      case "critical": return "border-red-500";
      case "high": return "border-orange-400";
      case "medium": return "border-yellow-400";
      default: return "border-green-400";
    }
  };

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {[
          { label: "Incidents", value: summary.totalIncidents, icon: AlertTriangle, color: "text-primary" },
          { label: "Critical", value: summary.criticalIncidents, icon: ShieldAlert, color: "text-red-400" },
          { label: "Locked Accounts", value: summary.accountsLocked, icon: Lock, color: "text-rose-400" },
          { label: "Total Failures", value: summary.totalFailures, icon: XCircle, color: "text-orange-400" },
          { label: "Unique IPs", value: summary.uniqueIPs, icon: Globe, color: "text-blue-400" },
          { label: "Brute Force", value: summary.bruteForceDetected, icon: Ban, color: "text-red-400" },
        ].map((card) => (
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
        {incidents.map((inc: any) => {
          const isExpanded = expandedId === inc.id;
          return (
            <motion.div
              key={inc.id}
              layout
              className={`glass-panel rounded-xl border-l-4 overflow-hidden ${riskBorder(inc.riskLevel)}`}
            >
              <button
                onClick={() => setExpandedId(isExpanded ? null : inc.id)}
                className="w-full p-4 flex items-center gap-4 text-left hover:bg-white/[0.02] transition-colors"
              >
                <div className={`p-2.5 rounded-xl ${
                  inc.riskLevel === "critical" ? "bg-red-500/15" : inc.riskLevel === "high" ? "bg-orange-500/10" : "bg-yellow-500/10"
                }`}>
                  <AlertTriangle className={`w-5 h-5 ${riskColor(inc.riskLevel)}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-sm font-mono font-bold text-white">{inc.user}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-display uppercase font-bold ${riskColor(inc.riskLevel)} border-current/30`}>
                      {inc.riskLevel}
                    </span>
                    {inc.accountLocked && (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30 font-display uppercase">
                        Account Locked
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Key: {inc.deviceSerial} · {inc.failureCount} failures in {inc.timeWindow}
                    {inc.department && <> · {inc.department}</>}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-muted-foreground">{inc.id}</span>
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </div>
              </button>

              {isExpanded && (
                <div className="px-4 pb-4 border-t border-white/5 pt-4 space-y-3">
                  <UrgencyBadge severity={inc.riskLevel === "critical" ? "critical" : inc.riskLevel === "high" ? "high" : "medium"} showExplanation />
                  <ThreatExplainer
                    narrative={`User "${inc.user}" had ${inc.failureCount} failed login attempts in ${inc.timeWindow} using security key ${inc.deviceSerial}. ${inc.accountLocked ? "The account has been automatically locked for safety." : "The account remains active but is being monitored."} ${inc.riskLevel === "critical" ? "This pattern strongly suggests a brute force attack or stolen key." : "This could be a malfunctioning key or an unauthorized access attempt."}`}
                  />
                  <PlainEnglishThreatCard
                    breakdown={{
                      whatWeFound: `${inc.failureCount} failed login attempts for user "${inc.user}" within ${inc.timeWindow}.`,
                      howWeFoundIt: `Our authentication monitoring system detected repeated failures from security key ${inc.deviceSerial}.`,
                      whereTheThreatIs: `User: ${inc.user}. Key: ${inc.deviceSerial}. Source IPs: ${inc.ipAddresses.join(", ")}. Locations: ${inc.geoLocations.join(", ")}.`,
                      whatThisMeans: inc.bruteForce ? "The pattern of rapid repeated failures indicates a possible brute force attack — someone is trying to guess or force their way in." : "Multiple failed attempts may indicate a malfunctioning key, wrong key being used, or an unauthorized access attempt.",
                      potentialImpact: "If this is an attack, the attacker could gain access to the employee's accounts and sensitive company data.",
                      whatCanBeDone: inc.accountLocked ? "The account has been locked. Verify the employee's identity before unlocking." : "Monitor for additional failures. Consider locking the account if failures continue.",
                      howItsBeingHandled: `Risk level: ${inc.riskLevel}. ${inc.accountLocked ? "Account automatically locked." : "Account is being monitored."}`,
                      recoverySteps: inc.recommendation,
                    }}
                    severity={getUrgencyFromSeverity(inc.riskLevel === "critical" ? "critical" : inc.riskLevel === "high" ? "high" : "medium")}
                  />

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-2 rounded-lg bg-black/20 border border-white/5">
                      <span className="text-[10px] font-display uppercase tracking-widest text-muted-foreground block">First Failure</span>
                      <span className="text-xs font-mono text-white">{format(new Date(inc.firstFailure), "MMM d, HH:mm")}</span>
                    </div>
                    <div className="p-2 rounded-lg bg-black/20 border border-white/5">
                      <span className="text-[10px] font-display uppercase tracking-widest text-muted-foreground block">Last Failure</span>
                      <span className="text-xs font-mono text-white">{format(new Date(inc.lastFailure), "MMM d, HH:mm")}</span>
                    </div>
                    <div className="p-2 rounded-lg bg-black/20 border border-white/5">
                      <span className="text-[10px] font-display uppercase tracking-widest text-muted-foreground block">Source IPs</span>
                      <span className="text-xs font-mono text-white">{inc.ipAddresses.join(", ")}</span>
                    </div>
                    <div className="p-2 rounded-lg bg-black/20 border border-white/5">
                      <span className="text-[10px] font-display uppercase tracking-widest text-muted-foreground block">Locations</span>
                      <span className="text-xs font-mono text-white">{inc.geoLocations.join(", ")}</span>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-[10px] font-display uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-2">
                      <Brain className="w-3 h-3" /> Failure Breakdown
                    </h4>
                    <div className="space-y-1.5">
                      {inc.failureReasons.map((reason: any, i: number) => (
                        <div key={i} className="flex items-start gap-3 p-2 rounded-lg bg-black/20 border border-white/5">
                          <span className="text-xs font-mono text-red-400 shrink-0 w-6 text-right">{reason.count}×</span>
                          <div>
                            <span className="text-xs text-white font-mono">{reason.reason}</span>
                            <p className="text-xs text-muted-foreground mt-0.5">{reason.detail}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {inc.lockReason && (
                    <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                      <div className="flex items-center gap-2 mb-1">
                        <Lock className="w-3.5 h-3.5 text-red-400" />
                        <span className="text-[10px] font-display uppercase tracking-widest text-red-400">Lock Reason</span>
                      </div>
                      <p className="text-xs text-gray-300">{inc.lockReason}</p>
                    </div>
                  )}

                  <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircle className="w-3.5 h-3.5 text-primary" />
                      <span className="text-[10px] font-display uppercase tracking-widest text-primary">Recommendation</span>
                    </div>
                    <p className="text-xs text-gray-300">{inc.recommendation}</p>
                  </div>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </>
  );
}

function PoliciesPanel() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/yubikey/policies`)
      .then((r) => { if (!r.ok) throw new Error("Failed"); return r.json(); })
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <CyberLoading text="Loading authentication policies..." />;
  if (!data) return <div className="text-muted-foreground text-center py-12">Couldn't load policy data. Please try again.</div>;

  const { policies, overallCompliance } = data;

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3 mb-6">
        {[
          { label: "Total Policies", value: overallCompliance.totalPolicies, icon: BookOpen, color: "text-primary" },
          { label: "Enforced", value: overallCompliance.enforced, icon: Shield, color: "text-emerald-400" },
          { label: "Partial", value: overallCompliance.partial, icon: AlertTriangle, color: "text-yellow-400" },
          { label: "Total Users", value: overallCompliance.totalUsers, icon: User, color: "text-blue-400" },
          { label: "Compliant", value: overallCompliance.fullyCompliant, icon: CheckCircle, color: "text-emerald-400" },
          { label: "Compliance Rate", value: `${overallCompliance.complianceRate}%`, icon: ShieldCheck, color: "text-primary" },
          { label: "Critical Gaps", value: overallCompliance.criticalGaps, icon: ShieldAlert, color: "text-red-400" },
        ].map((card) => (
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
        {policies.map((policy: any) => {
          const isExpanded = expandedId === policy.id;
          const compliancePercent = Math.round((policy.compliance.compliant / policy.compliance.total) * 100);

          return (
            <motion.div
              key={policy.id}
              layout
              className={`glass-panel rounded-xl border-l-4 overflow-hidden ${
                policy.status === "enforced" ? "border-emerald-500" : "border-yellow-400"
              }`}
            >
              <button
                onClick={() => setExpandedId(isExpanded ? null : policy.id)}
                className="w-full p-4 flex items-center gap-4 text-left hover:bg-white/[0.02] transition-colors"
              >
                <div className={`p-2.5 rounded-xl ${policy.status === "enforced" ? "bg-emerald-500/10" : "bg-yellow-500/10"}`}>
                  <BookOpen className={`w-5 h-5 ${policy.status === "enforced" ? "text-emerald-400" : "text-yellow-400"}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-sm font-mono font-bold text-white">{policy.name}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded border font-display uppercase ${
                      policy.status === "enforced" ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/30" : "text-yellow-400 bg-yellow-500/10 border-yellow-500/30"
                    }`}>
                      {policy.status}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded border border-white/10 font-display uppercase text-muted-foreground">
                      {policy.scope}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {policy.compliance.compliant}/{policy.compliance.total} compliant ({compliancePercent}%)
                    {policy.compliance.exempted > 0 && <> · {policy.compliance.exempted} exempted</>}
                    {policy.compliance.nonCompliant > 0 && <> · <span className="text-red-400">{policy.compliance.nonCompliant} non-compliant</span></>}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-muted-foreground">{policy.id}</span>
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </div>
              </button>

              {isExpanded && (
                <div className="px-4 pb-4 border-t border-white/5 pt-4 space-y-3">
                  <div className="p-3 rounded-lg bg-black/30 border border-white/5">
                    <span className="text-[10px] font-display uppercase tracking-widest text-muted-foreground block mb-1">Description</span>
                    <p className="text-xs text-gray-300"><AutoJargon text={policy.description} /></p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="p-2 rounded-lg bg-black/20 border border-white/5">
                      <span className="text-[10px] font-display uppercase tracking-widest text-muted-foreground block">Enforcement</span>
                      <span className={`text-xs font-mono uppercase ${policy.enforcementLevel === "mandatory" ? "text-red-400" : "text-yellow-400"}`}>{policy.enforcementLevel}</span>
                    </div>
                    <div className="p-2 rounded-lg bg-black/20 border border-white/5">
                      <span className="text-[10px] font-display uppercase tracking-widest text-muted-foreground block">Created</span>
                      <span className="text-xs font-mono text-white">{format(new Date(policy.createdAt), "MMM d, yyyy")}</span>
                    </div>
                    <div className="p-2 rounded-lg bg-black/20 border border-white/5">
                      <span className="text-[10px] font-display uppercase tracking-widest text-muted-foreground block">Last Updated</span>
                      <span className="text-xs font-mono text-white">{format(new Date(policy.lastUpdated), "MMM d, yyyy")}</span>
                    </div>
                  </div>

                  <div className="w-full bg-black/30 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${compliancePercent >= 90 ? "bg-emerald-500" : compliancePercent >= 70 ? "bg-yellow-500" : "bg-red-500"}`}
                      style={{ width: `${compliancePercent}%` }}
                    />
                  </div>

                  <div>
                    <h4 className="text-[10px] font-display uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-2">
                      <FileText className="w-3 h-3" /> Policy Rules ({policy.rules.length})
                    </h4>
                    <div className="space-y-1.5">
                      {policy.rules.map((rule: any, i: number) => (
                        <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-black/20 border border-white/5">
                          {rule.status === "active" ? (
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          ) : (
                            <AlertTriangle className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
                          )}
                          <span className="text-xs text-gray-300 flex-1">{rule.rule}</span>
                          <span className={`text-[10px] font-display uppercase ${rule.status === "active" ? "text-emerald-400" : "text-yellow-400"}`}>
                            {rule.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </>
  );
}

function FleetManagerPanel() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [fleetFilter, setFleetFilter] = useState<string | undefined>(undefined);

  useEffect(() => {
    fetch(`${API_BASE}/api/yubikey/fleet`)
      .then((r) => { if (!r.ok) throw new Error("Failed"); return r.json(); })
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <CyberLoading text="Loading security key data..." />;
  if (!data) return <div className="text-muted-foreground text-center py-12">Couldn't load device data. Please try again.</div>;

  const fleet = data?.fleet ?? [];
  const summary = data?.summary ?? { totalDevices: 0, activeDevices: 0, fipsCertified: 0, firmwareOutdated: 0, totalAuths: 0 };
  const filtered = fleetFilter ? fleet.filter((d: any) => d.status === fleetFilter) : fleet;

  const attestColor = (s: string) => {
    switch (s) {
      case "verified": return "text-emerald-400 bg-emerald-500/10 border-emerald-500/30";
      case "expired": return "text-orange-400 bg-orange-500/10 border-orange-500/30";
      case "failed": return "text-red-400 bg-red-500/10 border-red-500/30";
      case "pending": return "text-yellow-400 bg-yellow-500/10 border-yellow-500/30";
      case "revoked": return "text-red-400 bg-red-500/10 border-red-500/30";
      default: return "text-muted-foreground bg-white/5 border-white/10";
    }
  };

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        {[
          { label: "Total Fleet", value: summary.totalDevices, icon: Key, color: "text-primary" },
          { label: "Active", value: summary.activeDevices, icon: ShieldCheck, color: "text-emerald-400" },
          { label: "FIPS Certified", value: summary.fipsCertified, icon: Shield, color: "text-blue-400" },
          { label: "FW Outdated", value: summary.firmwareOutdated, icon: AlertTriangle, color: summary.firmwareOutdated > 0 ? "text-orange-400" : "text-emerald-400" },
          { label: "Total Auths", value: summary.totalAuths.toLocaleString(), icon: Fingerprint, color: "text-primary" },
        ].map((card) => (
          <div key={card.label} className="glass-panel p-4 rounded-xl border border-white/5">
            <div className="flex items-center gap-2 mb-2">
              <card.icon className={`w-4 h-4 ${card.color}`} />
              <span className="text-[10px] font-display uppercase tracking-widest text-muted-foreground">{card.label}</span>
            </div>
            <p className={`text-2xl font-mono font-bold ${card.color}`}>{card.value}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        {[undefined, "active", "suspended", "revoked", "unassigned"].map((s) => (
          <button
            key={s ?? "all"}
            onClick={() => setFleetFilter(s)}
            className={clsx(
              "px-3 py-1.5 rounded-lg text-xs font-display uppercase tracking-wider border transition-colors",
              fleetFilter === s ? "bg-primary/20 border-primary/50 text-primary" : "border-white/10 text-muted-foreground hover:border-white/20"
            )}
          >
            {s ?? "All"}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map((device: any) => {
          const isExpanded = expandedId === device.id;
          const warrantyExpired = new Date(device.warrantyExpiry).getTime() < Date.now();

          return (
            <motion.div
              key={device.id}
              layout
              className={`glass-panel rounded-xl border-l-4 overflow-hidden ${
                device.status === "revoked" ? "border-red-500" :
                device.status === "suspended" ? "border-orange-400" :
                device.status === "active" ? "border-emerald-500" : "border-white/20"
              }`}
            >
              <button
                onClick={() => setExpandedId(isExpanded ? null : device.id)}
                className="w-full p-4 flex items-center gap-4 text-left hover:bg-white/[0.02] transition-colors"
              >
                <div className={`p-2.5 rounded-xl ${
                  device.status === "active" ? "bg-emerald-500/10" :
                  device.status === "suspended" ? "bg-orange-500/10" :
                  device.status === "revoked" ? "bg-red-500/10" : "bg-white/5"
                }`}>
                  <Key className={`w-5 h-5 ${
                    device.status === "active" ? "text-emerald-400" :
                    device.status === "suspended" ? "text-orange-400" :
                    device.status === "revoked" ? "text-red-400" : "text-muted-foreground"
                  }`} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-sm font-mono font-bold text-white">{device.serialNumber}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded border font-display uppercase ${STATUS_BADGE[device.status] || ""}`}>
                      {device.status}
                    </span>
                    {device.fipsCertified && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/30 font-display uppercase">FIPS</span>
                    )}
                    <span className={`text-[10px] px-2 py-0.5 rounded border font-display uppercase ${attestColor(device.attestationStatus)}`}>
                      {device.attestationStatus}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {device.model} · FW {device.firmwareVersion} · {device.formFactor}
                    {device.assignedUser && <> · <span className="text-white">{device.assignedUser}</span></>}
                    {device.department && <> ({device.department})</>}
                  </p>
                </div>

                <div className="text-right shrink-0">
                  {device.lastUsed && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
                      <Clock className="w-3 h-3" />
                      {format(new Date(device.lastUsed), "MMM d, HH:mm")}
                    </p>
                  )}
                  <p className="text-[10px] font-mono text-muted-foreground">{device.totalAuths.toLocaleString()} auths</p>
                </div>

                {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
              </button>

              {isExpanded && (
                <div className="px-4 pb-4 border-t border-white/5 pt-4 space-y-3">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-2 rounded-lg bg-black/20 border border-white/5">
                      <span className="text-[10px] font-display uppercase tracking-widest text-muted-foreground block">Registered</span>
                      <span className="text-xs font-mono text-white">{format(new Date(device.registeredAt), "MMM d, yyyy")}</span>
                    </div>
                    <div className="p-2 rounded-lg bg-black/20 border border-white/5">
                      <span className="text-[10px] font-display uppercase tracking-widest text-muted-foreground block">Warranty</span>
                      <span className={`text-xs font-mono ${warrantyExpired ? "text-red-400" : "text-white"}`}>
                        {format(new Date(device.warrantyExpiry), "MMM d, yyyy")}
                        {warrantyExpired && " (EXPIRED)"}
                      </span>
                    </div>
                    <div className="p-2 rounded-lg bg-black/20 border border-white/5">
                      <span className="text-[10px] font-display uppercase tracking-widest text-muted-foreground block">Uptime</span>
                      <span className="text-xs font-mono text-white">{device.uptime}</span>
                    </div>
                    <div className="p-2 rounded-lg bg-black/20 border border-white/5">
                      <span className="text-[10px] font-display uppercase tracking-widest text-muted-foreground block">Attestation</span>
                      <span className={`text-xs font-mono ${
                        device.attestationStatus === "verified" ? "text-emerald-400" :
                        device.attestationStatus === "expired" || device.attestationStatus === "failed" ? "text-red-400" : "text-yellow-400"
                      }`}>
                        {device.attestationDate ? format(new Date(device.attestationDate), "MMM d, yyyy") : "Pending"}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="p-2 rounded-lg bg-black/20 border border-white/5">
                      <span className="text-[10px] font-display uppercase tracking-widest text-muted-foreground block">Last Used App</span>
                      <span className="text-xs font-mono text-white">{device.lastUsedApp || "Never"}</span>
                    </div>
                    <div className="p-2 rounded-lg bg-black/20 border border-white/5">
                      <span className="text-[10px] font-display uppercase tracking-widest text-muted-foreground block">Last Location</span>
                      <span className="text-xs font-mono text-white">{device.lastUsedLocation || "N/A"}</span>
                    </div>
                    <div className="p-2 rounded-lg bg-black/20 border border-white/5">
                      <span className="text-[10px] font-display uppercase tracking-widest text-muted-foreground block">Auth Stats</span>
                      <span className="text-xs font-mono">
                        <span className="text-emerald-400">{device.totalAuths.toLocaleString()} ok</span>
                        <span className="text-muted-foreground"> / </span>
                        <span className={device.failedAuths > 10 ? "text-red-400" : "text-muted-foreground"}>{device.failedAuths} fail</span>
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <span className="text-[10px] font-display uppercase tracking-widest text-muted-foreground py-1">Interfaces:</span>
                    {device.interfaces.map((iface: string) => (
                      <span key={iface} className="text-[10px] px-2 py-1 rounded bg-primary/10 text-primary border border-primary/20 font-mono">{iface}</span>
                    ))}
                    <span className="text-[10px] font-display uppercase tracking-widest text-muted-foreground py-1 ml-2">Protocols:</span>
                    {device.protocols.map((proto: string) => (
                      <span key={proto} className="text-[10px] px-2 py-1 rounded bg-white/5 text-muted-foreground border border-white/10 font-mono">{proto}</span>
                    ))}
                  </div>

                  {device.notes && (
                    <div className="p-3 rounded-lg bg-black/30 border border-white/5">
                      <span className="text-[10px] font-display uppercase tracking-widest text-muted-foreground block mb-1">Notes</span>
                      <p className="text-xs text-gray-300">{device.notes}</p>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          );
        })}

        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Key className="w-8 h-8 mx-auto mb-3 text-primary" />
            <p className="font-display text-sm uppercase tracking-wider">No devices match this filter</p>
          </div>
        )}
      </div>
    </>
  );
}

function AuditLogPanel() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [eventFilter, setEventFilter] = useState<string | undefined>(undefined);

  useEffect(() => {
    fetch(`${API_BASE}/api/yubikey/audit-log`)
      .then((r) => { if (!r.ok) throw new Error("Failed"); return r.json(); })
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <CyberLoading text="Loading login history..." />;
  if (!data) return <div className="text-muted-foreground text-center py-12">Couldn't load the activity log. Please try again.</div>;

  const { events, summary } = data;
  const filtered = eventFilter ? events.filter((e: any) => e.eventType === eventFilter) : events;

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        {[
          { label: "Total Events", value: summary.totalEvents, icon: Fingerprint, color: "text-primary" },
          { label: "Successful", value: summary.successCount, icon: CheckCircle, color: "text-emerald-400" },
          { label: "Failed", value: summary.failureCount, icon: XCircle, color: "text-red-400" },
          { label: "Unique Users", value: summary.uniqueUsers, icon: User, color: "text-blue-400" },
          { label: "Avg Response", value: `${summary.avgResponseTime}ms`, icon: Clock, color: "text-primary" },
        ].map((card) => (
          <div key={card.label} className="glass-panel p-4 rounded-xl border border-white/5">
            <div className="flex items-center gap-2 mb-2">
              <card.icon className={`w-4 h-4 ${card.color}`} />
              <span className="text-[10px] font-display uppercase tracking-widest text-muted-foreground">{card.label}</span>
            </div>
            <p className={`text-2xl font-mono font-bold ${card.color}`}>{card.value}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        {[undefined, "auth_success", "auth_failure", "key_enrolled", "key_revoked"].map((e) => (
          <button
            key={e ?? "all"}
            onClick={() => setEventFilter(e)}
            className={clsx(
              "px-3 py-1.5 rounded-lg text-xs font-display uppercase tracking-wider border transition-colors",
              eventFilter === e ? "bg-primary/20 border-primary/50 text-primary" : "border-white/10 text-muted-foreground hover:border-white/20"
            )}
          >
            {e?.replace(/_/g, " ") ?? "All"}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {filtered.map((event: any) => {
          const isExpanded = expandedId === event.id;
          const isFail = event.eventType === "auth_failure";
          const isSuccess = event.eventType === "auth_success";
          const isEnroll = event.eventType === "key_enrolled";

          return (
            <motion.div
              key={event.id}
              layout
              className={`glass-panel rounded-xl border-l-4 overflow-hidden ${
                isFail ? "border-red-500" :
                isSuccess ? "border-emerald-500" :
                isEnroll ? "border-primary" : "border-orange-400"
              }`}
            >
              <button
                onClick={() => setExpandedId(isExpanded ? null : event.id)}
                className="w-full p-4 flex items-center gap-4 text-left hover:bg-white/[0.02] transition-colors"
              >
                <div className={`p-2 rounded-lg bg-black/40 ${
                  isFail ? "text-red-400" : isSuccess ? "text-emerald-400" : isEnroll ? "text-primary" : "text-orange-400"
                }`}>
                  {isSuccess ? <CheckCircle2 className="w-5 h-5" /> :
                   isFail ? <XCircle className="w-5 h-5" /> :
                   isEnroll ? <Package className="w-5 h-5" /> :
                   <Ban className="w-5 h-5" />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border ${EVENT_BADGE[event.eventType] || "bg-white/5 text-muted-foreground border-white/10"}`}>
                      {event.eventType.replace(/_/g, " ")}
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground">{event.protocol}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded border border-white/10 text-muted-foreground font-mono">{event.application}</span>
                    {event.riskFlag && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-display uppercase ${
                        event.riskFlag === "brute_force" ? "bg-red-500/20 text-red-400 border border-red-500/30" :
                        "bg-orange-500/10 text-orange-400 border border-orange-500/30"
                      }`}>
                        {event.riskFlag.replace(/_/g, " ")}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="font-mono text-white">{event.user}</span>
                    <span className="text-muted-foreground text-xs">Key: {event.deviceSerial}</span>
                    <span className="text-muted-foreground text-xs">{event.deviceModel}</span>
                  </div>
                </div>

                <div className="text-right shrink-0 text-xs text-muted-foreground">
                  <p>{event.location}</p>
                  <p className="font-mono">{event.ipAddress}</p>
                  <p>{format(new Date(event.timestamp), "HH:mm:ss")}</p>
                </div>

                {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
              </button>

              {isExpanded && (
                <div className="px-4 pb-4 border-t border-white/5 pt-4 space-y-3">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-2 rounded-lg bg-black/20 border border-white/5">
                      <span className="text-[10px] font-display uppercase tracking-widest text-muted-foreground block">Timestamp</span>
                      <span className="text-xs font-mono text-white">{format(new Date(event.timestamp), "MMM d, HH:mm:ss")}</span>
                    </div>
                    <div className="p-2 rounded-lg bg-black/20 border border-white/5">
                      <span className="text-[10px] font-display uppercase tracking-widest text-muted-foreground block">Auth Method</span>
                      <span className="text-xs font-mono text-white">{event.authMethod.replace(/_/g, " ")}</span>
                    </div>
                    <div className="p-2 rounded-lg bg-black/20 border border-white/5">
                      <span className="text-[10px] font-display uppercase tracking-widest text-muted-foreground block">Response Time</span>
                      <span className={`text-xs font-mono ${event.responseTime > 500 ? "text-yellow-400" : event.responseTime === 0 ? "text-red-400" : "text-emerald-400"}`}>
                        {event.responseTime > 0 ? `${event.responseTime}ms` : "N/A (failed)"}
                      </span>
                    </div>
                    <div className="p-2 rounded-lg bg-black/20 border border-white/5">
                      <span className="text-[10px] font-display uppercase tracking-widest text-muted-foreground block">Session ID</span>
                      <span className="text-xs font-mono text-white">{event.sessionId}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="p-2 rounded-lg bg-black/20 border border-white/5">
                      <span className="text-[10px] font-display uppercase tracking-widest text-muted-foreground block">Challenge</span>
                      <span className="text-xs font-mono text-white">{event.challenge}</span>
                    </div>
                    <div className="p-2 rounded-lg bg-black/20 border border-white/5">
                      <span className="text-[10px] font-display uppercase tracking-widest text-muted-foreground block">Relay Party</span>
                      <span className="text-xs font-mono text-white">{event.relayParty}</span>
                    </div>
                    <div className="p-2 rounded-lg bg-black/20 border border-white/5">
                      <span className="text-[10px] font-display uppercase tracking-widest text-muted-foreground block">User Agent</span>
                      <span className="text-xs font-mono text-white text-[10px]">{event.userAgent}</span>
                    </div>
                  </div>

                  {event.email && (
                    <div className="p-2 rounded-lg bg-black/20 border border-white/5">
                      <span className="text-[10px] font-display uppercase tracking-widest text-muted-foreground block">Email</span>
                      <span className="text-xs font-mono text-white">{event.email}</span>
                      {event.department && <span className="text-xs text-muted-foreground ml-2">({event.department})</span>}
                    </div>
                  )}

                  {event.failureReason && (
                    <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                      <div className="flex items-center gap-2 mb-1">
                        <XCircle className="w-3.5 h-3.5 text-red-400" />
                        <span className="text-[10px] font-display uppercase tracking-widest text-red-400">Failure Reason</span>
                      </div>
                      <p className="text-xs text-gray-300">{event.failureReason}</p>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          );
        })}

        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Fingerprint className="w-8 h-8 mx-auto mb-3 text-primary" />
            <p className="font-display text-sm uppercase tracking-wider">No events match this filter</p>
          </div>
        )}
      </div>
    </>
  );
}

const SEVERITY_BADGE: Record<string, string> = {
  critical: "bg-red-500/20 text-red-400 border-red-500/30",
  medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  low: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
};

const INCIDENT_STATUS_BADGE: Record<string, string> = {
  revoked: "bg-red-500/20 text-red-400 border-red-500/30",
  suspended: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  investigating: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
};

const INCIDENT_TYPE_ICON: Record<string, React.ReactNode> = {
  stolen: <Siren className="w-5 h-5" />,
  lost: <ShieldAlert className="w-5 h-5" />,
  damaged: <ShieldX className="w-5 h-5" />,
};

function LostStolenPanel() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);

  useEffect(() => {
    fetch(`${API_BASE}/api/yubikey/lost-stolen`)
      .then((r) => { if (!r.ok) throw new Error("Failed"); return r.json(); })
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <CyberLoading text="Loading incident details..." />;
  if (!data) return <div className="text-muted-foreground text-center py-12">Couldn't load incident data. Please try again.</div>;

  const { incidents, summary } = data;
  const filtered = statusFilter ? incidents.filter((i: any) => i.status === statusFilter) : incidents;

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {[
          { label: "Total Incidents", value: summary.totalIncidents, icon: ShieldAlert, color: "text-primary" },
          { label: "Investigating", value: summary.activeInvestigations, icon: Brain, color: "text-yellow-400" },
          { label: "Revoked", value: summary.revokedKeys, icon: Ban, color: "text-red-400" },
          { label: "Suspended", value: summary.suspendedKeys, icon: Lock, color: "text-orange-400" },
          { label: "Re-enrollment Pending", value: summary.reEnrollmentsPending, icon: RotateCcw, color: "text-blue-400" },
          { label: "Critical", value: summary.criticalIncidents, icon: Siren, color: "text-red-400" },
        ].map((card) => (
          <div key={card.label} className="glass-panel p-4 rounded-xl border border-white/5">
            <div className="flex items-center gap-2 mb-2">
              <card.icon className={`w-4 h-4 ${card.color}`} />
              <span className="text-[10px] font-display uppercase tracking-widest text-muted-foreground">{card.label}</span>
            </div>
            <p className={`text-2xl font-mono font-bold ${card.color}`}>{card.value}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        {[undefined, "investigating", "revoked", "suspended"].map((s) => (
          <button
            key={s ?? "all"}
            onClick={() => setStatusFilter(s)}
            className={clsx(
              "px-3 py-1.5 rounded-lg text-xs font-display uppercase tracking-wider border transition-colors",
              statusFilter === s ? "bg-primary/20 border-primary/50 text-primary" : "border-white/10 text-muted-foreground hover:border-white/20"
            )}
          >
            {s ?? "All"}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map((incident: any) => {
          const isExpanded = expandedId === incident.id;

          return (
            <motion.div
              key={incident.id}
              layout
              className={`glass-panel rounded-xl border-l-4 overflow-hidden ${
                incident.severity === "critical" ? "border-red-500" :
                incident.severity === "medium" ? "border-yellow-500" : "border-emerald-500"
              }`}
            >
              <button
                onClick={() => setExpandedId(isExpanded ? null : incident.id)}
                className="w-full p-4 flex items-center gap-4 text-left hover:bg-white/[0.02] transition-colors"
              >
                <div className={`p-2.5 rounded-lg bg-black/40 ${
                  incident.incidentType === "stolen" ? "text-red-400" :
                  incident.incidentType === "lost" ? "text-yellow-400" : "text-orange-400"
                }`}>
                  {INCIDENT_TYPE_ICON[incident.incidentType] ?? <ShieldAlert className="w-5 h-5" />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-xs font-mono text-muted-foreground">{incident.id}</span>
                    <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border ${SEVERITY_BADGE[incident.severity] || ""}`}>
                      {incident.severity}
                    </span>
                    <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border ${INCIDENT_STATUS_BADGE[incident.status] || "bg-white/5 text-muted-foreground border-white/10"}`}>
                      {incident.status}
                    </span>
                    <span className="text-[10px] font-display uppercase px-2 py-0.5 rounded bg-white/5 border border-white/10 text-muted-foreground">
                      {incident.incidentType}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="font-mono text-white">{incident.reportedBy}</span>
                    <span className="text-muted-foreground text-xs">{incident.department}</span>
                    <span className="text-muted-foreground text-xs">Key: {incident.deviceSerial}</span>
                  </div>
                </div>

                <div className="text-right shrink-0 text-xs text-muted-foreground">
                  <p>{incident.location}</p>
                  <p>{incident.deviceModel}</p>
                  <p>{format(new Date(incident.reportedAt), "MMM d, HH:mm")}</p>
                </div>

                {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
              </button>

              {isExpanded && (
                <div className="px-4 pb-4 border-t border-white/5 pt-4 space-y-4">
                  <UrgencyBadge severity={incident.severity === "critical" ? "critical" : incident.severity === "medium" ? "medium" : "high"} showExplanation />
                  <ThreatExplainer
                    narrative={`A ${incident.incidentType} security key was reported by ${incident.reportedBy} (${incident.department}). ${incident.description} The key (serial: ${incident.deviceSerial}, model: ${incident.deviceModel}) has been ${incident.status}. ${incident.severity === "critical" ? "This is a critical incident requiring immediate action." : "This incident is being investigated."}`}
                  />
                  <PlainEnglishThreatCard
                    breakdown={{
                      whatWeFound: `A YubiKey security key was reported as ${incident.incidentType} by ${incident.reportedBy} from the ${incident.department} department.`,
                      howWeFoundIt: `${incident.reportedBy} reported this incident at ${format(new Date(incident.reportedAt), "MMM d, HH:mm")} from ${incident.location}.`,
                      whereTheThreatIs: `Device: ${incident.deviceModel} (Serial: ${incident.deviceSerial}). Location: ${incident.location}.`,
                      whatThisMeans: incident.incidentType === "stolen" ? "A stolen security key could be used by an attacker to impersonate the employee and access company systems." : "A lost key could potentially be found and misused by someone to access company systems.",
                      potentialImpact: "If the key falls into the wrong hands, an attacker could bypass password protections and access sensitive company resources.",
                      whatCanBeDone: "The key has been revoked to prevent unauthorized use. A replacement key needs to be issued to the employee.",
                      howItsBeingHandled: `Status: ${incident.status}. The key has been revoked by ${incident.revokedBy || "the security team"}.`,
                      recoverySteps: "1. Verify the key is revoked. 2. Check for any suspicious login activity using this key. 3. Issue a replacement key. 4. Complete the re-enrollment process.",
                    }}
                    severity={getUrgencyFromSeverity(incident.severity === "critical" ? "critical" : incident.severity === "medium" ? "medium" : "high")}
                  />

                  <div className="p-3 rounded-lg bg-black/20 border border-white/5">
                    <span className="text-[10px] font-display uppercase tracking-widest text-muted-foreground block mb-1">Description</span>
                    <p className="text-sm text-gray-300"><AutoJargon text={incident.description} /></p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-2 rounded-lg bg-black/20 border border-white/5">
                      <span className="text-[10px] font-display uppercase tracking-widest text-muted-foreground block">Discovered</span>
                      <span className="text-xs font-mono text-white">{format(new Date(incident.discoveredAt), "MMM d, HH:mm")}</span>
                    </div>
                    <div className="p-2 rounded-lg bg-black/20 border border-white/5">
                      <span className="text-[10px] font-display uppercase tracking-widest text-muted-foreground block">Revoked At</span>
                      <span className="text-xs font-mono text-white">{format(new Date(incident.revokedAt), "MMM d, HH:mm")}</span>
                    </div>
                    <div className="p-2 rounded-lg bg-black/20 border border-white/5">
                      <span className="text-[10px] font-display uppercase tracking-widest text-muted-foreground block">Revoked By</span>
                      <span className="text-xs font-mono text-white">{incident.revokedBy}</span>
                    </div>
                    <div className="p-2 rounded-lg bg-black/20 border border-white/5">
                      <span className="text-[10px] font-display uppercase tracking-widest text-muted-foreground block">Reporter Email</span>
                      <span className="text-xs font-mono text-white">{incident.email}</span>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Clock className="w-4 h-4 text-primary" />
                      <span className="text-xs font-display uppercase tracking-widest text-primary">Incident Timeline</span>
                    </div>
                    <div className="relative pl-6 space-y-0">
                      {incident.timeline.map((entry: any, idx: number) => (
                        <div key={idx} className="relative pb-4">
                          <div className="absolute left-[-16px] top-1.5 w-2 h-2 rounded-full bg-primary" />
                          {idx < incident.timeline.length - 1 && (
                            <div className="absolute left-[-13px] top-3.5 w-0.5 h-full bg-white/10" />
                          )}
                          <div className="p-2 rounded-lg bg-black/20 border border-white/5">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[10px] font-mono text-muted-foreground">
                                {format(new Date(entry.time), "MMM d, HH:mm:ss")}
                              </span>
                              <span className="text-[10px] font-display uppercase text-muted-foreground">{entry.actor}</span>
                            </div>
                            <p className="text-xs text-gray-300">{entry.event}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Mail className="w-4 h-4 text-blue-400" />
                      <span className="text-xs font-display uppercase tracking-widest text-blue-400">Security Alerts</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {incident.securityAlerts.map((alert: any, idx: number) => (
                        <div key={idx} className="p-2 rounded-lg bg-black/20 border border-white/5">
                          <div className="flex items-center gap-2 mb-1">
                            {alert.type === "soc_ticket" && <Hash className="w-3 h-3 text-primary" />}
                            {alert.type === "email_alert" && <Mail className="w-3 h-3 text-blue-400" />}
                            {alert.type === "slack_alert" && <ExternalLink className="w-3 h-3 text-green-400" />}
                            {alert.type === "pagerduty" && <Siren className="w-3 h-3 text-red-400" />}
                            <span className="text-[10px] font-display uppercase text-muted-foreground">{alert.type.replace(/_/g, " ")}</span>
                          </div>
                          {alert.id && <p className="text-xs font-mono text-white">{alert.id} <span className={`text-[10px] ${alert.status === "resolved" ? "text-emerald-400" : alert.status === "investigating" ? "text-yellow-400" : "text-blue-400"}`}>({alert.status})</span></p>}
                          {alert.channel && <p className="text-xs font-mono text-white">{alert.channel}</p>}
                          {alert.recipients && <p className="text-[10px] text-muted-foreground">{alert.recipients.length} recipients</p>}
                          {alert.incidentId && <p className="text-xs font-mono text-white">{alert.incidentId}</p>}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <RotateCcw className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs font-display uppercase tracking-widest text-emerald-400">Re-Enrollment</span>
                    </div>
                    <div className="p-3 rounded-lg bg-black/20 border border-white/5">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border ${
                          incident.reEnrollment.status === "completed" ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" :
                          incident.reEnrollment.status === "pending" || incident.reEnrollment.status === "initiated" ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" :
                          "bg-white/5 text-muted-foreground border-white/10"
                        }`}>
                          {incident.reEnrollment.status}
                        </span>
                        <span className="text-xs font-mono text-muted-foreground">{incident.reEnrollment.enrollmentId}</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                        <div>
                          <span className="text-[10px] text-muted-foreground block">New Key</span>
                          <span className="font-mono text-white">{incident.reEnrollment.newKeySerial ?? "Pending"}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-muted-foreground block">Approved By</span>
                          <span className="font-mono text-white">{incident.reEnrollment.approvedBy ?? "Pending"}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-muted-foreground block">Shipped</span>
                          <span className="font-mono text-white">
                            {incident.reEnrollment.shippedAt ? format(new Date(incident.reEnrollment.shippedAt), "MMM d") : "Pending"}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-muted-foreground block">Activated</span>
                          <span className="font-mono text-white">
                            {incident.reEnrollment.activatedAt ? format(new Date(incident.reEnrollment.activatedAt), "MMM d") : "Pending"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Shield className="w-4 h-4 text-primary" />
                      <span className="text-xs font-display uppercase tracking-widest text-primary">Post-Incident Actions</span>
                    </div>
                    <div className="space-y-1.5">
                      {incident.postIncidentActions.map((action: string, idx: number) => (
                        <div key={idx} className="flex items-start gap-2 p-2 rounded-lg bg-black/20 border border-white/5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                          <span className="text-xs text-gray-300">{action}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          );
        })}

        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <ShieldAlert className="w-8 h-8 mx-auto mb-3 text-primary" />
            <p className="font-display text-sm uppercase tracking-wider">No incidents match this filter</p>
          </div>
        )}
      </div>
    </>
  );
}

const MFA_METHOD_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  hardware_key: { label: "Hardware Key", color: "text-emerald-400", icon: <Key className="w-4 h-4" /> },
  totp: { label: "TOTP", color: "text-yellow-400", icon: <Smartphone className="w-4 h-4" /> },
  sms: { label: "SMS", color: "text-orange-400", icon: <MessageSquare className="w-4 h-4" /> },
  none: { label: "None", color: "text-red-400", icon: <CircleSlash className="w-4 h-4" /> },
};

const RISK_BADGE: Record<string, string> = {
  low: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  high: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  critical: "bg-red-500/20 text-red-400 border-red-500/30",
};

function MfaCompliancePanel() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [methodFilter, setMethodFilter] = useState<string | undefined>(undefined);
  const [showNonCompliantOnly, setShowNonCompliantOnly] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/api/yubikey/mfa-compliance`)
      .then((r) => { if (!r.ok) throw new Error("Failed"); return r.json(); })
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <CyberLoading text="Checking authentication compliance..." />;
  if (!data) return <div className="text-muted-foreground text-center py-12">Couldn't load compliance data. Please try again.</div>;

  const { users, summary } = data;
  let filtered = methodFilter ? users.filter((u: any) => u.mfaMethod === methodFilter) : users;
  if (showNonCompliantOnly) filtered = filtered.filter((u: any) => !u.compliant);

  const compliancePercent = Math.round((summary.compliant / summary.totalUsers) * 100);

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3 mb-6">
        <div className="glass-panel p-4 rounded-xl border border-white/5 col-span-2 sm:col-span-1">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="w-4 h-4 text-primary" />
            <span className="text-[10px] font-display uppercase tracking-widest text-muted-foreground">Compliance Rate</span>
          </div>
          <p className={`text-3xl font-mono font-bold ${compliancePercent >= 80 ? "text-emerald-400" : compliancePercent >= 50 ? "text-yellow-400" : "text-red-400"}`}>
            {compliancePercent}%
          </p>
          <p className="text-[10px] text-muted-foreground mt-1">{summary.compliant}/{summary.totalUsers} users compliant</p>
        </div>
        {[
          { label: "Hardware Key", value: summary.hardwareKey, icon: Key, color: "text-emerald-400" },
          { label: "TOTP Only", value: summary.totp, icon: Smartphone, color: "text-yellow-400" },
          { label: "SMS Only", value: summary.sms, icon: MessageSquare, color: "text-orange-400" },
          { label: "No MFA", value: summary.none, icon: CircleSlash, color: "text-red-400" },
        ].map((card) => (
          <div key={card.label} className="glass-panel p-4 rounded-xl border border-white/5">
            <div className="flex items-center gap-2 mb-2">
              <card.icon className={`w-4 h-4 ${card.color}`} />
              <span className="text-[10px] font-display uppercase tracking-widest text-muted-foreground">{card.label}</span>
            </div>
            <p className={`text-2xl font-mono font-bold ${card.color}`}>{card.value}</p>
          </div>
        ))}
      </div>

      {(summary.criticalRisk > 0 || summary.highRisk > 0) && (
        <div className="glass-panel p-4 rounded-xl border border-red-500/20 bg-red-500/5 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <span className="text-xs font-display uppercase tracking-widest text-red-400">Risk Alert</span>
          </div>
          <p className="text-sm text-gray-300">
            {summary.criticalRisk > 0 && <span className="text-red-400 font-mono">{summary.criticalRisk} critical</span>}
            {summary.criticalRisk > 0 && summary.highRisk > 0 && " and "}
            {summary.highRisk > 0 && <span className="text-orange-400 font-mono">{summary.highRisk} high-risk</span>}
            {" "}user{(summary.criticalRisk + summary.highRisk) !== 1 ? "s" : ""} require immediate attention. Non-compliant accounts increase exposure to phishing, SIM swap, and credential theft attacks.
          </p>
        </div>
      )}

      <div className="flex gap-2 mb-6 flex-wrap items-center">
        {[undefined, "hardware_key", "totp", "sms", "none"].map((m) => (
          <button
            key={m ?? "all"}
            onClick={() => setMethodFilter(m)}
            className={clsx(
              "px-3 py-1.5 rounded-lg text-xs font-display uppercase tracking-wider border transition-colors",
              methodFilter === m ? "bg-primary/20 border-primary/50 text-primary" : "border-white/10 text-muted-foreground hover:border-white/20"
            )}
          >
            {m ? m.replace(/_/g, " ") : "All Methods"}
          </button>
        ))}
        <div className="h-6 w-px bg-white/10 mx-1" />
        <button
          onClick={() => setShowNonCompliantOnly(!showNonCompliantOnly)}
          className={clsx(
            "px-3 py-1.5 rounded-lg text-xs font-display uppercase tracking-wider border transition-colors",
            showNonCompliantOnly ? "bg-red-500/20 border-red-500/50 text-red-400" : "border-white/10 text-muted-foreground hover:border-white/20"
          )}
        >
          Non-Compliant Only
        </button>
      </div>

      <div className="space-y-2">
        {filtered.map((user: any) => {
          const methodCfg = MFA_METHOD_CONFIG[user.mfaMethod] || MFA_METHOD_CONFIG.none;

          return (
            <motion.div
              key={user.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className={`glass-panel rounded-xl p-4 border-l-4 ${
                user.compliant ? "border-emerald-500" :
                user.riskLevel === "critical" ? "border-red-500" :
                user.riskLevel === "high" ? "border-orange-500" : "border-yellow-500"
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`p-2 rounded-lg bg-black/40 ${methodCfg.color}`}>
                  {methodCfg.icon}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-mono text-white text-sm">{user.name}</span>
                    <span className="text-[10px] text-muted-foreground">{user.role}</span>
                    <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border ${
                      user.compliant ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : "bg-red-500/20 text-red-400 border-red-500/30"
                    }`}>
                      {user.compliant ? "compliant" : "non-compliant"}
                    </span>
                    <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border ${RISK_BADGE[user.riskLevel] || ""}`}>
                      {user.riskLevel}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                    <span>{user.department}</span>
                    <span className="font-mono">{user.email}</span>
                    <span className={`font-mono ${methodCfg.color}`}>{methodCfg.label}</span>
                    {user.deviceSerial && <span className="font-mono">Key: {user.deviceSerial}</span>}
                    {user.protocols.length > 0 && <span className="font-mono">{user.protocols.join(", ")}</span>}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="flex items-center gap-1 justify-end mb-1">
                    <span className="text-[10px] text-muted-foreground">Score:</span>
                    <span className={`text-sm font-mono font-bold ${
                      user.complianceScore >= 80 ? "text-emerald-400" :
                      user.complianceScore >= 50 ? "text-yellow-400" :
                      user.complianceScore > 0 ? "text-orange-400" : "text-red-400"
                    }`}>
                      {user.complianceScore}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Last auth: {format(new Date(user.lastAuth), "MMM d, HH:mm")}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    Backup: {user.backupMethod.replace(/_/g, " ")}
                  </p>
                </div>
              </div>

              {user.nonComplianceReason && (
                <div className="mt-3 p-3 rounded-lg bg-red-500/5 border border-red-500/15">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-400 mt-0.5 shrink-0" />
                    <p className="text-xs text-gray-300">{user.nonComplianceReason}</p>
                  </div>
                </div>
              )}
            </motion.div>
          );
        })}

        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <ShieldCheck className="w-8 h-8 mx-auto mb-3 text-emerald-400" />
            <p className="font-display text-sm uppercase tracking-wider">
              {showNonCompliantOnly ? "All visible users are compliant" : "No users match this filter"}
            </p>
          </div>
        )}
      </div>
    </>
  );
}

const ANOMALY_TYPE_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  impossible_travel: { label: "Impossible Travel", color: "text-red-400", icon: <Navigation className="w-5 h-5" /> },
  brute_force: { label: "Brute Force", color: "text-red-400", icon: <Zap className="w-5 h-5" /> },
  unusual_hours: { label: "Unusual Hours", color: "text-yellow-400", icon: <Timer className="w-5 h-5" /> },
  concurrent_sessions: { label: "Concurrent Sessions", color: "text-orange-400", icon: <Layers className="w-5 h-5" /> },
  protocol_mismatch: { label: "Protocol Mismatch", color: "text-yellow-400", icon: <AlertTriangle className="w-5 h-5" /> },
  rapid_auth: { label: "Rapid Auth", color: "text-blue-400", icon: <Zap className="w-5 h-5" /> },
};

const ANOMALY_STATUS_BADGE: Record<string, string> = {
  active: "bg-red-500/20 text-red-400 border-red-500/30",
  investigating: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  mitigated: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  resolved: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
};

function AnomalyDetectorPanel() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string | undefined>(undefined);
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);

  useEffect(() => {
    fetch(`${API_BASE}/api/yubikey/anomaly-detector`)
      .then((r) => { if (!r.ok) throw new Error("Failed"); return r.json(); })
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <CyberLoading text="Checking for unusual patterns..." />;
  if (!data) return <div className="text-muted-foreground text-center py-12">Couldn't load anomaly data. Please try again.</div>;

  const { anomalies, summary } = data;
  let filtered = typeFilter ? anomalies.filter((a: any) => a.type === typeFilter) : anomalies;
  if (statusFilter) filtered = filtered.filter((a: any) => a.status === statusFilter);

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        {[
          { label: "Total Anomalies", value: summary.totalAnomalies, icon: Brain, color: "text-primary" },
          { label: "Active", value: summary.active, icon: Siren, color: "text-red-400" },
          { label: "Investigating", value: summary.investigating, icon: AlertTriangle, color: "text-yellow-400" },
          { label: "Mitigated", value: summary.mitigated, icon: Shield, color: "text-blue-400" },
          { label: "Avg Risk Score", value: summary.avgRiskScore, icon: BarChart3, color: "text-primary" },
        ].map((card) => (
          <div key={card.label} className="glass-panel p-4 rounded-xl border border-white/5">
            <div className="flex items-center gap-2 mb-2">
              <card.icon className={`w-4 h-4 ${card.color}`} />
              <span className="text-[10px] font-display uppercase tracking-widest text-muted-foreground">{card.label}</span>
            </div>
            <p className={`text-2xl font-mono font-bold ${card.color}`}>{card.value}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-2 mb-4 flex-wrap items-center">
        <span className="text-[10px] font-display uppercase tracking-widest text-muted-foreground border-r border-white/10 pr-2 mr-1">Type</span>
        {[undefined, "impossible_travel", "brute_force", "unusual_hours", "concurrent_sessions", "protocol_mismatch", "rapid_auth"].map((t) => (
          <button
            key={t ?? "all"}
            onClick={() => setTypeFilter(t)}
            className={clsx(
              "px-2.5 py-1 rounded-lg text-[11px] font-display uppercase tracking-wider border transition-colors",
              typeFilter === t ? "bg-primary/20 border-primary/50 text-primary" : "border-white/10 text-muted-foreground hover:border-white/20"
            )}
          >
            {t?.replace(/_/g, " ") ?? "All"}
          </button>
        ))}
      </div>

      <div className="flex gap-2 mb-6 flex-wrap items-center">
        <span className="text-[10px] font-display uppercase tracking-widest text-muted-foreground border-r border-white/10 pr-2 mr-1">Status</span>
        {[undefined, "active", "investigating", "mitigated", "resolved"].map((s) => (
          <button
            key={s ?? "all"}
            onClick={() => setStatusFilter(s)}
            className={clsx(
              "px-2.5 py-1 rounded-lg text-[11px] font-display uppercase tracking-wider border transition-colors",
              statusFilter === s ? "bg-primary/20 border-primary/50 text-primary" : "border-white/10 text-muted-foreground hover:border-white/20"
            )}
          >
            {s ?? "All"}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map((anomaly: any) => {
          const isExpanded = expandedId === anomaly.id;
          const typeCfg = ANOMALY_TYPE_CONFIG[anomaly.type] || ANOMALY_TYPE_CONFIG.brute_force;

          return (
            <motion.div
              key={anomaly.id}
              layout
              className={`glass-panel rounded-xl border-l-4 overflow-hidden ${
                anomaly.severity === "critical" ? "border-red-500" :
                anomaly.severity === "high" ? "border-orange-500" :
                anomaly.severity === "medium" ? "border-yellow-500" : "border-blue-500"
              }`}
            >
              <button
                onClick={() => setExpandedId(isExpanded ? null : anomaly.id)}
                className="w-full p-4 flex items-center gap-4 text-left hover:bg-white/[0.02] transition-colors"
              >
                <div className={`p-2.5 rounded-lg bg-black/40 ${typeCfg.color}`}>
                  {typeCfg.icon}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-xs font-mono text-muted-foreground">{anomaly.id}</span>
                    <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border ${SEVERITY_BADGE[anomaly.severity] || ""}`}>
                      {anomaly.severity}
                    </span>
                    <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border ${ANOMALY_STATUS_BADGE[anomaly.status] || ""}`}>
                      {anomaly.status}
                    </span>
                    <span className={`text-[10px] font-display uppercase px-2 py-0.5 rounded bg-white/5 border border-white/10 ${typeCfg.color}`}>
                      {typeCfg.label}
                    </span>
                  </div>
                  <p className="text-sm text-white font-display mb-1">{anomaly.title}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="font-mono">{anomaly.user}</span>
                    <span>{anomaly.department}</span>
                    <span className="font-mono">Key: {anomaly.deviceSerial}</span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="flex items-center gap-1 justify-end mb-1">
                    <span className="text-[10px] text-muted-foreground">Risk:</span>
                    <span className={`text-lg font-mono font-bold ${
                      anomaly.riskScore >= 80 ? "text-red-400" :
                      anomaly.riskScore >= 50 ? "text-yellow-400" : "text-emerald-400"
                    }`}>
                      {anomaly.riskScore}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    {format(new Date(anomaly.detectedAt), "MMM d, HH:mm")}
                  </p>
                </div>

                {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
              </button>

              {isExpanded && (
                <div className="px-4 pb-4 border-t border-white/5 pt-4 space-y-4">
                  <div className="p-3 rounded-lg bg-black/20 border border-white/5">
                    <span className="text-[10px] font-display uppercase tracking-widest text-muted-foreground block mb-1">Description</span>
                    <p className="text-sm text-gray-300"><AutoJargon text={anomaly.description} /></p>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <MapPin className="w-4 h-4 text-primary" />
                      <span className="text-xs font-display uppercase tracking-widest text-primary">Locations</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {anomaly.locations.map((loc: any, idx: number) => (
                        <div key={idx} className="p-3 rounded-lg bg-black/20 border border-white/5">
                          <div className="flex items-center gap-2 mb-1">
                            <Globe className="w-3 h-3 text-primary" />
                            <span className="text-xs font-mono text-white">{loc.city}, {loc.country}</span>
                          </div>
                          <p className="text-[10px] font-mono text-muted-foreground">{loc.ip}</p>
                          <p className="text-[10px] text-muted-foreground">{loc.application}</p>
                          <p className="text-[10px] text-muted-foreground">{format(new Date(loc.timestamp), "HH:mm:ss")}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                    <div className="flex items-center gap-2 mb-2">
                      <Brain className="w-4 h-4 text-primary" />
                      <span className="text-xs font-display uppercase tracking-widest text-primary">AI Analysis</span>
                    </div>
                    <p className="text-sm text-gray-300">{anomaly.aiAnalysis}</p>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Shield className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs font-display uppercase tracking-widest text-emerald-400">Recommended Actions</span>
                    </div>
                    <div className="space-y-1.5">
                      {anomaly.recommendedActions.map((action: string, idx: number) => (
                        <div key={idx} className="flex items-start gap-2 p-2 rounded-lg bg-black/20 border border-white/5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                          <span className="text-xs text-gray-300">{action}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {anomaly.relatedAlerts.length > 0 && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-display uppercase tracking-widest text-muted-foreground">Related Alerts:</span>
                      {anomaly.relatedAlerts.map((alert: string) => (
                        <span key={alert} className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 border border-white/10 text-muted-foreground">{alert}</span>
                      ))}
                    </div>
                  )}

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-2 rounded-lg bg-black/20 border border-white/5">
                      <span className="text-[10px] font-display uppercase tracking-widest text-muted-foreground block">Device</span>
                      <span className="text-xs font-mono text-white">{anomaly.deviceModel}</span>
                    </div>
                    <div className="p-2 rounded-lg bg-black/20 border border-white/5">
                      <span className="text-[10px] font-display uppercase tracking-widest text-muted-foreground block">Serial</span>
                      <span className="text-xs font-mono text-white">{anomaly.deviceSerial}</span>
                    </div>
                    <div className="p-2 rounded-lg bg-black/20 border border-white/5">
                      <span className="text-[10px] font-display uppercase tracking-widest text-muted-foreground block">Email</span>
                      <span className="text-xs font-mono text-white">{anomaly.email}</span>
                    </div>
                    <div className="p-2 rounded-lg bg-black/20 border border-white/5">
                      <span className="text-[10px] font-display uppercase tracking-widest text-muted-foreground block">Detected</span>
                      <span className="text-xs font-mono text-white">{format(new Date(anomaly.detectedAt), "MMM d, HH:mm:ss")}</span>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          );
        })}

        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Brain className="w-8 h-8 mx-auto mb-3 text-primary" />
            <p className="font-display text-sm uppercase tracking-wider">No anomalies match this filter</p>
          </div>
        )}
      </div>
    </>
  );
}

interface WebAuthnCred {
  id: number;
  credentialId: string;
  createdAt: string;
  lastUsed: string | null;
  deviceName: string | null;
}

function RegisterKeyPanel() {
  const [creds, setCreds] = useState<WebAuthnCred[]>([]);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [keyName, setKeyName] = useState("");
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchCreds = async () => {
    try {
      const res = await authFetch(`${API_BASE}/api/auth/webauthn/credentials`);
      if (res.ok) {
        const data = await res.json();
        setCreds(data.credentials || []);
      }
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCreds(); }, []);

  const handleRegister = async () => {
    setRegistering(true);
    setMsg(null);
    try {
      const { startRegistration } = await import("@simplewebauthn/browser");
      const optRes = await authFetch(`${API_BASE}/api/auth/webauthn/register/options`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!optRes.ok) throw new Error((await optRes.json()).error || "Failed to get options");
      const options = await optRes.json();
      const credential = await startRegistration({ optionsJSON: options });
      const verRes = await authFetch(`${API_BASE}/api/auth/webauthn/register/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential, deviceName: keyName || "YubiKey" }),
      });
      if (!verRes.ok) throw new Error((await verRes.json()).error || "Verification failed");
      setMsg({ type: "success", text: "Security key registered successfully!" });
      setKeyName("");
      fetchCreds();
    } catch (e: any) {
      setMsg({ type: "error", text: e.message || "Registration failed" });
    } finally {
      setRegistering(false);
    }
  };

  const handleDelete = async (credId: number) => {
    if (!confirm("Remove this security key? You won't be able to use it to log in anymore.")) return;
    try {
      const res = await authFetch(`${API_BASE}/api/auth/webauthn/credentials/${credId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setCreds((prev) => prev.filter((c) => c.id !== credId));
        setMsg({ type: "success", text: "Key removed" });
      }
    } catch { setMsg({ type: "error", text: "Failed to delete" }); }
  };

  if (loading) return <CyberLoading text="Loading credentials..." />;

  return (
    <>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-panel rounded-xl p-6 mb-6">
        <h3 className="font-display uppercase tracking-widest text-sm text-primary mb-4 flex items-center gap-2">
          <Fingerprint className="w-5 h-5" /> Register a New Security Key
        </h3>
        <p className="text-xs text-muted-foreground mb-4">
          Insert your YubiKey and click Register to add it as a passwordless login method.
          Supports FIDO2/WebAuthn compatible keys.
        </p>
        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="Key name (e.g. YubiKey 5 NFC)"
            value={keyName}
            onChange={(e) => setKeyName(e.target.value)}
            className="flex-1 bg-black/30 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none"
          />
          <button
            onClick={handleRegister}
            disabled={registering}
            className="px-6 py-2.5 bg-primary/20 hover:bg-primary/30 border border-primary/30 rounded-lg text-primary font-display uppercase tracking-widest text-xs transition-all disabled:opacity-50"
          >
            {registering ? "Touch Your Key..." : "Register Key"}
          </button>
        </div>
        {msg && (
          <div className={`mt-3 text-sm ${msg.type === "success" ? "text-emerald-400" : "text-rose-400"}`}>
            {msg.type === "success" ? <CheckCircle2 className="w-4 h-4 inline mr-1" /> : <XCircle className="w-4 h-4 inline mr-1" />}
            {msg.text}
          </div>
        )}
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-panel rounded-xl p-6">
        <h3 className="font-display uppercase tracking-widest text-sm text-primary mb-4 flex items-center gap-2">
          <Key className="w-5 h-5" /> Registered Keys ({creds.length})
        </h3>
        {creds.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Usb className="w-8 h-8 mx-auto mb-3 text-primary/40" />
            <p className="font-display text-sm uppercase tracking-wider">No keys registered yet</p>
            <p className="text-xs mt-1">Register your first YubiKey above to enable passwordless login</p>
          </div>
        ) : (
          <div className="space-y-3">
            {creds.map((c) => (
              <div key={c.id} className="flex items-center justify-between p-4 bg-black/20 rounded-lg border border-white/5 hover:border-primary/20 transition-colors">
                <div className="flex items-center gap-3">
                  <Key className="w-5 h-5 text-amber-400" />
                  <div>
                    <span className="text-sm font-medium text-white">{c.deviceName || "Security Key"}</span>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[10px] font-mono text-muted-foreground">ID: {c.credentialId.slice(0, 12)}...</span>
                      <span className="text-[10px] text-muted-foreground">Added: {format(new Date(c.createdAt), "MMM d, yyyy")}</span>
                      {c.lastUsed && <span className="text-[10px] text-muted-foreground">Last used: {format(new Date(c.lastUsed), "MMM d, HH:mm")}</span>}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(c.id)}
                  className="p-2 text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                  title="Remove key"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </>
  );
}

interface CoverageApp {
  id: number;
  appName: string;
  appUrl: string;
  hasHardwareKey: boolean;
  protectionType: string;
  keySerials: string | null;
  notes: string | null;
  updatedAt: string;
}

function AppCoveragePanel() {
  const [apps, setApps] = useState<CoverageApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchApps = async () => {
    try {
      const res = await authFetch(`${API_BASE}/api/yubikey/coverage`);
      if (res.ok) {
        const data = await res.json();
        setApps(data.apps || []);
      }
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchApps(); }, []);

  const toggleProtected = async (app: CoverageApp) => {
    try {
      const res = await authFetch(`${API_BASE}/api/yubikey/coverage/${app.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hasHardwareKey: !app.hasHardwareKey }),
      });
      if (res.ok) {
        setApps((prev) => prev.map((a) => a.id === app.id ? { ...a, hasHardwareKey: !a.hasHardwareKey } : a));
        setMsg({ type: "success", text: `${app.appName} updated` });
        setTimeout(() => setMsg(null), 2000);
      }
    } catch { setMsg({ type: "error", text: "Update failed" }); }
  };

  if (loading) return <CyberLoading text="Loading app coverage..." />;

  const protectedCount = apps.filter((a) => a.hasHardwareKey).length;
  const percentage = apps.length > 0 ? Math.round((protectedCount / apps.length) * 100) : 0;
  const filtered = apps.filter((a) => a.appName.toLowerCase().includes(search.toLowerCase()));

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-panel p-5 rounded-xl">
          <span className="font-display uppercase text-[10px] tracking-widest text-muted-foreground block mb-1">Total Apps</span>
          <span className="text-2xl font-mono font-bold text-white">{apps.length}</span>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="glass-panel p-5 rounded-xl">
          <span className="font-display uppercase text-[10px] tracking-widest text-muted-foreground block mb-1">Hardware Key Protected</span>
          <span className="text-2xl font-mono font-bold text-emerald-400">{protectedCount}</span>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-panel p-5 rounded-xl">
          <span className="font-display uppercase text-[10px] tracking-widest text-muted-foreground block mb-1">Coverage</span>
          <span className={`text-2xl font-mono font-bold ${percentage >= 75 ? "text-emerald-400" : percentage >= 50 ? "text-amber-400" : "text-rose-400"}`}>{percentage}%</span>
        </motion.div>
      </div>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Search apps..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full md:w-80 bg-black/30 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none"
        />
      </div>

      {msg && (
        <div className={`mb-4 text-sm ${msg.type === "success" ? "text-emerald-400" : "text-rose-400"}`}>
          {msg.text}
        </div>
      )}

      <div className="space-y-2">
        {filtered.map((app, i) => (
          <motion.div
            key={app.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.02 }}
            className={`glass-panel rounded-xl p-4 border transition-colors ${app.hasHardwareKey ? "border-emerald-500/20 hover:border-emerald-500/40" : "border-white/5 hover:border-rose-500/20"}`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1">
                <button onClick={() => toggleProtected(app)} title="Toggle hardware key status">
                  {app.hasHardwareKey ? (
                    <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <ShieldX className="w-5 h-5 text-rose-400" />
                  )}
                </button>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white">{app.appName}</span>
                    {app.appUrl && (
                      <a href={app.appUrl} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                    <span className={`px-2 py-0.5 rounded text-[10px] font-display uppercase tracking-widest ${app.hasHardwareKey ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"}`}>
                      {app.hasHardwareKey ? "Protected" : "Unprotected"}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[10px] text-muted-foreground">{app.protectionType}</span>
                    {app.keySerials && <span className="text-[10px] font-mono text-amber-400/70">Keys: {app.keySerials}</span>}
                    {app.notes && <span className="text-[10px] text-muted-foreground italic">{app.notes}</span>}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ))}

        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Globe className="w-8 h-8 mx-auto mb-3 text-primary/40" />
            <p className="font-display text-sm uppercase tracking-wider">No apps match this search</p>
          </div>
        )}
      </div>
    </>
  );
}
