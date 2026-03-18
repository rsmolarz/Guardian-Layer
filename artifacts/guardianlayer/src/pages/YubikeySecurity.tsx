import { useState } from "react";
import {
  useListYubikeyDevices,
  useListYubikeyEvents,
  useGetYubikeyStats,
  type YubikeyDevice,
  type YubikeyAuthEvent,
} from "@workspace/api-client-react";
import { format } from "date-fns";
import { motion } from "framer-motion";
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

type Tab = "devices" | "events";
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
        title="YubiKey MFA"
        description="Hardware security key management, authentication monitoring, and MFA policy enforcement."
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

      <div className="mb-6 flex items-center gap-2 glass-panel p-1.5 rounded-xl inline-flex">
        <button
          onClick={() => setTab("devices")}
          className={`px-6 py-2.5 rounded-lg text-sm font-display uppercase tracking-widest transition-all flex items-center gap-2 ${
            tab === "devices" ? "bg-primary/15 text-primary border border-primary/20" : "text-muted-foreground hover:text-white hover:bg-white/5"
          }`}
        >
          <Key className="w-4 h-4" /> Key Inventory
        </button>
        <button
          onClick={() => setTab("events")}
          className={`px-6 py-2.5 rounded-lg text-sm font-display uppercase tracking-widest transition-all flex items-center gap-2 ${
            tab === "events" ? "bg-primary/15 text-primary border border-primary/20" : "text-muted-foreground hover:text-white hover:bg-white/5"
          }`}
        >
          <Fingerprint className="w-4 h-4" /> Auth Events
        </button>
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
    </div>
  );
}
