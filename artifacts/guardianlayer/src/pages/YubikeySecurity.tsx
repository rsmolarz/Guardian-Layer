import { useState, useEffect } from "react";
import {
  useListYubikeyDevices,
  useListYubikeyEvents,
  useGetYubikeyStats,
  type YubikeyDevice,
  type YubikeyAuthEvent,
} from "@workspace/api-client-react";
import { format } from "date-fns";
import { motion } from "framer-motion";
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
} from "lucide-react";

import { PageHeader } from "@/components/ui/PageHeader";
import { CyberLoading } from "@/components/ui/CyberLoading";

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

type Tab = "devices" | "events" | "enrollment" | "failed-auth" | "policies";
type StatusFilter = "active" | "suspended" | "revoked" | "unassigned" | undefined;
type EventFilter = "auth_success" | "auth_failure" | "key_enrolled" | "key_revoked" | undefined;

export default function YubikeySecurity() {
  const [tab, setTab] = useState<Tab>("devices");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(undefined);
  const [eventFilter, setEventFilter] = useState<EventFilter>(undefined);

  const { data: stats, isLoading: isStatsLoading } = useGetYubikeyStats();
  const { data: devicesData, isLoading: isDevicesLoading } = useListYubikeyDevices({ status: statusFilter });
  const { data: eventsData, isLoading: isEventsLoading } = useListYubikeyEvents({ eventType: eventFilter });

  if (isStatsLoading) return <CyberLoading text="SCANNING YUBIKEY FLEET..." />;

  return (
    <div className="pb-12">
      <PageHeader
        title="YubiKey & Hardware MFA"
        description="Hardware security key management, authentication monitoring, enrollment lifecycle, and MFA policy enforcement."
      />

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-7 gap-4 mb-8">
        {[
          { label: "Total Keys", value: stats?.totalDevices ?? 0, icon: Key, color: "text-primary" },
          { label: "Active", value: stats?.activeCount ?? 0, icon: ShieldCheck, color: "text-emerald-400" },
          { label: "Suspended", value: stats?.suspendedCount ?? 0, icon: ShieldX, color: "text-rose-400" },
          { label: "Unassigned", value: stats?.unassignedCount ?? 0, icon: Usb, color: "text-muted-foreground" },
          { label: "Auth Success", value: stats?.totalAuthSuccess?.toLocaleString() ?? "0", icon: CheckCircle2, color: "text-emerald-400" },
          { label: "Auth Failures", value: stats?.totalAuthFail ?? 0, icon: XCircle, color: "text-rose-400" },
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
          { id: "devices" as Tab, label: "Key Inventory", icon: Key },
          { id: "events" as Tab, label: "Auth Events", icon: Fingerprint },
          { id: "enrollment" as Tab, label: "Enrollment", icon: Package },
          { id: "failed-auth" as Tab, label: "Failed Auth", icon: Ban },
          { id: "policies" as Tab, label: "Policies", icon: BookOpen },
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

      {tab === "devices" && (
        <>
          <div className="mb-6 glass-panel p-1.5 rounded-xl inline-flex gap-1">
            <span className="px-3 py-2 text-[10px] font-display uppercase tracking-widest text-muted-foreground border-r border-white/10">Status</span>
            {[undefined, "active", "suspended", "revoked", "unassigned"].map((s) => (
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

          {isDevicesLoading ? (
            <CyberLoading text="LOADING KEYS..." />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {(devicesData?.devices ?? []).map((device: YubikeyDevice, idx: number) => (
                <motion.div
                  key={device.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.04 }}
                  className={`glass-panel rounded-xl p-5 border-l-4 ${
                    device.status === "suspended" ? "border-rose-500" :
                    device.status === "active" ? "border-emerald-500" :
                    "border-white/20"
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-lg bg-black/40 text-primary">
                        <Key className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-mono text-sm text-white font-bold">{device.serialNumber}</h4>
                        <p className="text-xs text-muted-foreground">{device.model} · FW {device.firmwareVersion}</p>
                      </div>
                    </div>
                    <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border ${STATUS_BADGE[device.status] || ""}`}>
                      {device.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <User className="w-3 h-3" />
                      <span>{device.assignedUser || "Unassigned"}</span>
                    </div>
                    {device.department && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Cpu className="w-3 h-3" />
                        <span>{device.department}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-400">{device.authSuccessCount} success</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <XCircle className="w-3 h-3 text-rose-400" />
                      <span className={device.authFailCount > 5 ? "text-rose-400" : "text-muted-foreground"}>{device.authFailCount} failures</span>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between text-xs text-muted-foreground">
                    <span className="font-mono">{device.protocols}</span>
                    {device.lastUsed && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {format(new Date(device.lastUsed), "PP")}
                      </span>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </>
      )}

      {tab === "events" && (
        <>
          <div className="mb-6 glass-panel p-1.5 rounded-xl inline-flex gap-1">
            <span className="px-3 py-2 text-[10px] font-display uppercase tracking-widest text-muted-foreground border-r border-white/10">Event</span>
            {[undefined, "auth_success", "auth_failure", "key_enrolled", "key_revoked"].map((e) => (
              <button
                key={e ?? "all"}
                onClick={() => setEventFilter(e as EventFilter)}
                className={`px-3 py-2 rounded-lg text-xs font-mono transition-colors ${
                  eventFilter === e ? "bg-white/10 text-white" : "text-muted-foreground hover:text-white"
                }`}
              >
                {e?.replace("_", " ") ?? "All"}
              </button>
            ))}
          </div>

          {isEventsLoading ? (
            <CyberLoading text="LOADING AUTH EVENTS..." />
          ) : (
            <div className="space-y-2">
              {(eventsData?.events ?? []).map((event: YubikeyAuthEvent, idx: number) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  className={`glass-panel rounded-xl p-4 flex items-center gap-4 border-l-4 ${
                    event.eventType === "auth_failure" ? "border-rose-500" :
                    event.eventType === "auth_success" ? "border-emerald-500" :
                    "border-primary"
                  }`}
                >
                  <div className={`p-2 rounded-lg bg-black/40 ${event.eventType === "auth_failure" ? "text-rose-400" : event.eventType === "auth_success" ? "text-emerald-400" : "text-primary"}`}>
                    {event.eventType === "auth_success" ? <CheckCircle2 className="w-5 h-5" /> :
                     event.eventType === "auth_failure" ? <XCircle className="w-5 h-5" /> :
                     <Key className="w-5 h-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border ${EVENT_BADGE[event.eventType] || ""}`}>
                        {event.eventType.replace("_", " ")}
                      </span>
                      <span className="text-[10px] font-mono text-muted-foreground">{event.protocol}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <span className="font-mono text-white">{event.user}</span>
                      <span className="text-muted-foreground text-xs">Key: {event.deviceSerial}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0 text-xs text-muted-foreground">
                    {event.location && <p>{event.location}</p>}
                    {event.ipAddress && <p className="font-mono">{event.ipAddress}</p>}
                    <p>{format(new Date(event.createdAt), "PPp")}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </>
      )}

      {tab === "enrollment" && <EnrollmentPanel />}
      {tab === "failed-auth" && <FailedAuthPanel />}
      {tab === "policies" && <PoliciesPanel />}
    </div>
  );
}

function EnrollmentPanel() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);

  useEffect(() => {
    fetch("/api/yubikey/enrollment")
      .then((r) => { if (!r.ok) throw new Error("Failed"); return r.json(); })
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <CyberLoading text="LOADING ENROLLMENT REQUESTS..." />;
  if (!data) return <div className="text-muted-foreground text-center py-12">Failed to load enrollment data.</div>;

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
    fetch("/api/yubikey/failed-auth")
      .then((r) => { if (!r.ok) throw new Error("Failed"); return r.json(); })
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <CyberLoading text="ANALYZING FAILED AUTHENTICATIONS..." />;
  if (!data) return <div className="text-muted-foreground text-center py-12">Failed to load failed auth data.</div>;

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
    fetch("/api/yubikey/policies")
      .then((r) => { if (!r.ok) throw new Error("Failed"); return r.json(); })
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <CyberLoading text="LOADING MFA POLICIES..." />;
  if (!data) return <div className="text-muted-foreground text-center py-12">Failed to load policy data.</div>;

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
                    <p className="text-xs text-gray-300">{policy.description}</p>
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
