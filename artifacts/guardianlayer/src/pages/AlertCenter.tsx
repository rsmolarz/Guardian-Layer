import { useState, useEffect, useCallback } from "react";
import { Bell, BellRing, Filter, RefreshCw, Trash2, CheckCircle2, XCircle, AlertTriangle, Info, Send, Settings, Volume2, Mail, Smartphone, Monitor, ChevronDown } from "lucide-react";
import { useAlerts } from "@/components/AlertSystem";
import { API_BASE } from "@/lib/constants";

interface AlertData {
  id: number;
  title: string;
  message: string;
  severity: string;
  category: string | null;
  source: string | null;
  dismissed: boolean;
  emailSent: boolean | null;
  pushSent: boolean | null;
  readAt: string | null;
  metadata: any;
  createdAt: string;
}

interface AlertStats {
  total: number;
  undismissed: number;
  critical: number;
  lastHour: number;
}

interface AlertPref {
  id: number;
  channel: string;
  enabled: boolean;
  minSeverity: string | null;
}

const SEVERITY_CONFIG: Record<string, { color: string; bg: string; border: string; icon: any }> = {
  critical: { color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/30", icon: XCircle },
  high: { color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/30", icon: AlertTriangle },
  medium: { color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/30", icon: Bell },
  low: { color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/30", icon: Info },
  info: { color: "text-gray-400", bg: "bg-gray-500/10", border: "border-gray-500/30", icon: Info },
};

const CHANNEL_ICONS: Record<string, any> = {
  inapp: Monitor,
  push: Smartphone,
  email: Mail,
  sound: Volume2,
};

const CHANNEL_LABELS: Record<string, string> = {
  inapp: "In-App Notifications",
  push: "Browser Push",
  email: "Email Alerts",
  sound: "Alert Sounds",
};

export default function AlertCenter() {
  const [alerts, setAlerts] = useState<AlertData[]>([]);
  const [stats, setStats] = useState<AlertStats | null>(null);
  const [preferences, setPreferences] = useState<AlertPref[]>([]);
  const [activeTab, setActiveTab] = useState<"alerts" | "preferences" | "create">("alerts");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [showDismissed, setShowDismissed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const { sendTestAlert, pushPermission, requestPushPermission } = useAlerts();
  const baseUrl = API_BASE;

  const [newAlert, setNewAlert] = useState({ title: "", message: "", severity: "medium", category: "security", source: "manual" });

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "50", offset: "0" });
      if (severityFilter !== "all") params.set("severity", severityFilter);
      if (!showDismissed) params.set("dismissed", "false");
      const res = await fetch(`${baseUrl}api/alerts?${params}`);
      if (res.ok) {
        const data = await res.json();
        setAlerts(data.alerts || []);
        setTotal(data.total || 0);
      }
    } catch {} finally { setLoading(false); }
  }, [baseUrl, severityFilter, showDismissed]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`${baseUrl}api/alerts/stats`);
      if (res.ok) setStats(await res.json());
    } catch {}
  }, [baseUrl]);

  const fetchPreferences = useCallback(async () => {
    try {
      const res = await fetch(`${baseUrl}api/alerts/preferences`);
      if (res.ok) {
        const data = await res.json();
        setPreferences(data.preferences || []);
      }
    } catch {}
  }, [baseUrl]);

  useEffect(() => {
    fetchAlerts();
    fetchStats();
    fetchPreferences();
  }, [fetchAlerts, fetchStats, fetchPreferences]);

  const dismissAlert = async (id: number) => {
    await fetch(`${baseUrl}api/alerts/${id}/dismiss`, { method: "POST" });
    fetchAlerts();
    fetchStats();
  };

  const dismissAll = async () => {
    await fetch(`${baseUrl}api/alerts/dismiss-all`, { method: "POST" });
    fetchAlerts();
    fetchStats();
  };

  const togglePref = async (channel: string, field: "enabled", value: boolean) => {
    await fetch(`${baseUrl}api/alerts/preferences`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channel, [field]: value }),
    });
    fetchPreferences();
  };

  const updatePrefSeverity = async (channel: string, minSeverity: string) => {
    await fetch(`${baseUrl}api/alerts/preferences`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channel, minSeverity }),
    });
    fetchPreferences();
  };

  const createAlert = async () => {
    if (!newAlert.title || !newAlert.message) return;
    await fetch(`${baseUrl}api/alerts/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newAlert),
    });
    setNewAlert({ title: "", message: "", severity: "medium", category: "security", source: "manual" });
    fetchAlerts();
    fetchStats();
  };

  const tabs = [
    { id: "alerts" as const, label: "ALERTS", icon: Bell },
    { id: "preferences" as const, label: "PREFERENCES", icon: Settings },
    { id: "create" as const, label: "CREATE ALERT", icon: Send },
  ];

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-4xl font-display font-bold tracking-wider text-white mb-2">
          ALERT <span className="text-primary">CENTER</span>
        </h1>
        <p className="font-mono text-sm text-muted-foreground">
          Multi-channel alert management with browser push, email, and in-app notifications.
        </p>
      </div>

      <div className="h-px bg-gradient-to-r from-primary/50 via-primary/20 to-transparent" />

      <div className="glass-panel border border-white/5 rounded-xl p-4 bg-white/[0.02]">
        <p className="text-xs text-gray-400 leading-relaxed">
          <strong className="text-cyan-400">How it works:</strong> The alert system watches for security events across the entire platform. When something important happens, you get notified through the channels you choose.
          <strong className="text-white"> Alerts tab</strong> shows all alerts with color-coded severity — red is critical (act now), orange is high priority, yellow needs attention, blue is informational.
          <strong className="text-white"> Preferences tab</strong> lets you control how you're notified — turn channels on/off and set the minimum severity for each.
          <strong className="text-white"> Create Alert tab</strong> lets you manually create alerts for your team.
          To make an alert go away, click the checkmark icon to dismiss it. Use "Dismiss All" to clear everything at once.
        </p>
      </div>

      {stats && (
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: "Total Alerts", value: stats.total, color: "text-cyan-400" },
            { label: "Unread", value: stats.undismissed, color: stats.undismissed > 0 ? "text-amber-400" : "text-emerald-400" },
            { label: "Critical", value: stats.critical, color: stats.critical > 0 ? "text-red-400" : "text-emerald-400" },
            { label: "Last Hour", value: stats.lastHour, color: "text-blue-400" },
          ].map((stat, i) => (
            <div key={i} className="glass-panel border border-white/5 rounded-xl p-4">
              <p className="text-[10px] font-mono text-gray-500 uppercase tracking-wider mb-1">{stat.label}</p>
              <p className={`text-2xl font-bold font-mono ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2">
        {tabs.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-xs uppercase tracking-wider transition-all ${
              activeTab === tab.id
                ? "bg-primary/10 text-primary border border-primary/30"
                : "text-gray-500 hover:text-gray-300 border border-transparent hover:border-white/10"
            }`}>
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
        <div className="flex-1" />
        {activeTab === "alerts" && (
          <>
            <button onClick={() => sendTestAlert()} className="text-xs font-mono text-gray-500 hover:text-cyan-400 transition-colors border border-white/10 px-3 py-1.5 rounded-lg hover:border-cyan-500/30">
              Send Test
            </button>
            <button onClick={dismissAll} className="text-xs font-mono text-gray-500 hover:text-amber-400 transition-colors border border-white/10 px-3 py-1.5 rounded-lg hover:border-amber-500/30 flex items-center gap-1.5">
              <Trash2 className="w-3 h-3" /> Dismiss All
            </button>
            <button onClick={() => { fetchAlerts(); fetchStats(); }} className="text-gray-500 hover:text-cyan-400 transition-colors p-1.5">
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </>
        )}
      </div>

      {activeTab === "alerts" && (
        <>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-gray-500">
              <Filter className="w-3 h-3" /> SEVERITY:
            </div>
            {["all", "critical", "high", "medium", "low", "info"].map((s) => (
              <button key={s} onClick={() => setSeverityFilter(s)}
                className={`text-[10px] font-mono uppercase px-2 py-1 rounded transition-colors ${
                  severityFilter === s ? "bg-primary/20 text-primary border border-primary/30" : "text-gray-500 hover:text-gray-300"
                }`}>
                {s}
              </button>
            ))}
            <div className="flex-1" />
            <label className="flex items-center gap-2 text-[10px] font-mono text-gray-500 cursor-pointer">
              <input type="checkbox" checked={showDismissed} onChange={(e) => setShowDismissed(e.target.checked)}
                className="rounded border-white/20 bg-white/5 text-primary focus:ring-primary/30" />
              Show dismissed
            </label>
          </div>

          <div className="space-y-2">
            {alerts.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Bell className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="font-mono text-sm">No alerts to display</p>
                <p className="font-mono text-xs mt-1">Use "Send Test" to create a test alert</p>
              </div>
            ) : (
              alerts.map((alert) => {
                const config = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.info;
                const Icon = config.icon;
                const isExpanded = expandedId === alert.id;

                return (
                  <div key={alert.id}
                    className={`${config.bg} ${config.border} border rounded-xl p-4 transition-all ${alert.dismissed ? "opacity-50" : ""}`}>
                    <div className="flex items-start gap-3">
                      <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${config.color}`} />
                      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : alert.id)}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[10px] font-mono uppercase px-1.5 py-0.5 rounded ${config.bg} ${config.color}`}>
                            {alert.severity}
                          </span>
                          {alert.category && (
                            <span className="text-[10px] font-mono text-gray-500 uppercase">{alert.category}</span>
                          )}
                          <span className="text-[10px] font-mono text-gray-600">
                            {new Date(alert.createdAt).toLocaleString()}
                          </span>
                          {alert.emailSent && <Mail className="w-3 h-3 text-cyan-400/50" title="Email sent" />}
                        </div>
                        <h4 className="text-sm font-semibold text-white">{alert.title}</h4>
                        <p className={`text-xs text-gray-400 mt-1 ${isExpanded ? "" : "line-clamp-2"}`}>{alert.message}</p>
                        {isExpanded && alert.source && (
                          <p className="text-[10px] font-mono text-gray-500 mt-2">Source: {alert.source}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {!alert.dismissed && (
                          <button onClick={() => dismissAlert(alert.id)}
                            className="text-gray-500 hover:text-emerald-400 transition-colors p-1" title="Dismiss">
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                        )}
                        <ChevronDown className={`w-4 h-4 text-gray-600 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          {total > 50 && (
            <p className="text-center text-[10px] font-mono text-gray-500">Showing 50 of {total} alerts</p>
          )}
        </>
      )}

      {activeTab === "preferences" && (
        <div className="space-y-4">
          {pushPermission !== "granted" && (
            <div className="glass-panel border border-amber-500/20 rounded-xl p-4 bg-amber-500/5">
              <div className="flex items-center gap-3">
                <Smartphone className="w-5 h-5 text-amber-400" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-white">Browser push notifications not enabled</p>
                  <p className="text-xs text-gray-400">Enable browser notifications for real-time alerts even when the tab is in the background.</p>
                </div>
                <button onClick={requestPushPermission}
                  className="text-xs font-mono text-amber-400 border border-amber-500/30 px-3 py-1.5 rounded-lg hover:bg-amber-500/10 transition-colors">
                  Enable
                </button>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {preferences.map((pref) => {
              const ChannelIcon = CHANNEL_ICONS[pref.channel] || Bell;
              return (
                <div key={pref.id} className="glass-panel border border-white/5 rounded-xl p-4">
                  <div className="flex items-center gap-4">
                    <ChannelIcon className={`w-5 h-5 ${pref.enabled ? "text-cyan-400" : "text-gray-600"}`} />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white">{CHANNEL_LABELS[pref.channel] || pref.channel}</p>
                      <p className="text-[10px] font-mono text-gray-500">
                        Min severity: {pref.minSeverity || "medium"}
                      </p>
                    </div>
                    <select
                      value={pref.minSeverity || "medium"}
                      onChange={(e) => updatePrefSeverity(pref.channel, e.target.value)}
                      className="bg-white/5 border border-white/10 rounded px-2 py-1 text-xs font-mono text-gray-300 focus:border-primary/30 focus:outline-none"
                    >
                      {["info", "low", "medium", "high", "critical"].map((s) => (
                        <option key={s} value={s} className="bg-[#1a1a2e]">{s}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => togglePref(pref.channel, "enabled", !pref.enabled)}
                      className={`w-12 h-6 rounded-full transition-colors relative ${
                        pref.enabled ? "bg-cyan-500/30" : "bg-white/10"
                      }`}
                    >
                      <div className={`absolute w-5 h-5 rounded-full top-0.5 transition-all ${
                        pref.enabled ? "right-0.5 bg-cyan-400" : "left-0.5 bg-gray-500"
                      }`} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === "create" && (
        <div className="glass-panel border border-white/5 rounded-xl p-6 space-y-4 max-w-2xl">
          <div>
            <label className="block text-[10px] font-mono text-gray-400 uppercase tracking-wider mb-1.5">Title</label>
            <input type="text" value={newAlert.title} onChange={(e) => setNewAlert({ ...newAlert, title: e.target.value })}
              placeholder="Alert title..."
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-primary/30 focus:outline-none font-mono" />
          </div>
          <div>
            <label className="block text-[10px] font-mono text-gray-400 uppercase tracking-wider mb-1.5">Message</label>
            <textarea value={newAlert.message} onChange={(e) => setNewAlert({ ...newAlert, message: e.target.value })}
              placeholder="Alert details..."
              rows={3}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-primary/30 focus:outline-none font-mono resize-none" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-[10px] font-mono text-gray-400 uppercase tracking-wider mb-1.5">Severity</label>
              <select value={newAlert.severity} onChange={(e) => setNewAlert({ ...newAlert, severity: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-primary/30 focus:outline-none font-mono">
                {["critical", "high", "medium", "low", "info"].map((s) => (
                  <option key={s} value={s} className="bg-[#1a1a2e]">{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-mono text-gray-400 uppercase tracking-wider mb-1.5">Category</label>
              <select value={newAlert.category} onChange={(e) => setNewAlert({ ...newAlert, category: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-primary/30 focus:outline-none font-mono">
                {["security", "breach", "config", "session", "network", "system", "general"].map((c) => (
                  <option key={c} value={c} className="bg-[#1a1a2e]">{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-mono text-gray-400 uppercase tracking-wider mb-1.5">Source</label>
              <input type="text" value={newAlert.source} onChange={(e) => setNewAlert({ ...newAlert, source: e.target.value })}
                placeholder="manual"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-primary/30 focus:outline-none font-mono" />
            </div>
          </div>
          <button onClick={createAlert} disabled={!newAlert.title || !newAlert.message}
            className="flex items-center gap-2 px-6 py-2.5 bg-primary/20 text-primary border border-primary/30 rounded-lg font-mono text-sm uppercase tracking-wider hover:bg-primary/30 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
            <Send className="w-4 h-4" /> Create Alert
          </button>
        </div>
      )}
    </div>
  );
}
