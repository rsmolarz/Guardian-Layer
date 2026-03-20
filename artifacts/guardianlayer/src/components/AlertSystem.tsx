import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { AlertTriangle, X, Bell, BellRing, Volume2, Shield, Info, XCircle } from "lucide-react";

interface AlertData {
  id: number;
  title: string;
  message: string;
  severity: string;
  category: string | null;
  source: string | null;
  dismissed: boolean;
  createdAt: string;
}

interface AlertPref {
  channel: string;
  enabled: boolean;
  minSeverity: string | null;
}

interface AlertContextType {
  alerts: AlertData[];
  undismissedCount: number;
  pushPermission: NotificationPermission | "default";
  requestPushPermission: () => void;
  dismissToast: (id: number) => void;
  sendTestAlert: () => void;
}

const AlertContext = createContext<AlertContextType>({
  alerts: [],
  undismissedCount: 0,
  pushPermission: "default",
  requestPushPermission: () => {},
  dismissToast: () => {},
  sendTestAlert: () => {},
});

export const useAlerts = () => useContext(AlertContext);

const SEVERITY_CONFIG: Record<string, { color: string; bgColor: string; borderColor: string; icon: any; sound: boolean }> = {
  critical: { color: "text-red-400", bgColor: "bg-red-500/10", borderColor: "border-red-500/40", icon: XCircle, sound: true },
  high: { color: "text-orange-400", bgColor: "bg-orange-500/10", borderColor: "border-orange-500/40", icon: AlertTriangle, sound: true },
  medium: { color: "text-amber-400", bgColor: "bg-amber-500/10", borderColor: "border-amber-500/40", icon: Bell, sound: false },
  low: { color: "text-blue-400", bgColor: "bg-blue-500/10", borderColor: "border-blue-500/40", icon: Info, sound: false },
  info: { color: "text-gray-400", bgColor: "bg-gray-500/10", borderColor: "border-gray-500/40", icon: Info, sound: false },
};

function playAlertSound(severity: string) {
  try {
    const ctx = new AudioContext();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.connect(gain);
    gain.connect(ctx.destination);

    if (severity === "critical") {
      oscillator.frequency.setValueAtTime(880, ctx.currentTime);
      oscillator.frequency.setValueAtTime(440, ctx.currentTime + 0.15);
      oscillator.frequency.setValueAtTime(880, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.5);
    } else {
      oscillator.frequency.setValueAtTime(660, ctx.currentTime);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.3);
    }
  } catch {}
}

function sendBrowserNotification(alert: AlertData) {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
  try {
    new Notification(`[${alert.severity.toUpperCase()}] ${alert.title}`, {
      body: alert.message.substring(0, 200),
      icon: "/favicon.ico",
      tag: `guardian-alert-${alert.id}`,
      requireInteraction: alert.severity === "critical",
    });
  } catch {}
}

function AlertToast({ alert, onDismiss }: { alert: AlertData; onDismiss: (id: number) => void }) {
  const config = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.info;
  const Icon = config.icon;
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (alert.severity !== "critical") {
      const timer = setTimeout(() => {
        setIsExiting(true);
        setTimeout(() => onDismiss(alert.id), 300);
      }, alert.severity === "high" ? 15000 : 8000);
      return () => clearTimeout(timer);
    }
  }, [alert, onDismiss]);

  return (
    <div
      className={`
        ${config.bgColor} ${config.borderColor} border backdrop-blur-xl rounded-lg p-4 shadow-2xl
        transition-all duration-300 max-w-md w-full
        ${isExiting ? "opacity-0 translate-x-full" : "opacity-100 translate-x-0"}
        ${alert.severity === "critical" ? "animate-pulse ring-2 ring-red-500/50" : ""}
      `}
    >
      <div className="flex items-start gap-3">
        <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${config.color}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded ${config.bgColor} ${config.color}`}>
              {alert.severity}
            </span>
            {alert.category && (
              <span className="text-[10px] font-mono text-gray-500 uppercase">{alert.category}</span>
            )}
          </div>
          <h4 className="text-sm font-semibold text-white leading-tight">{alert.title}</h4>
          <p className="text-xs text-gray-400 mt-1 line-clamp-2">{alert.message}</p>
        </div>
        <button
          onClick={() => {
            setIsExiting(true);
            setTimeout(() => onDismiss(alert.id), 300);
          }}
          className="text-gray-500 hover:text-gray-300 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function CriticalBanner({ alert, onDismiss }: { alert: AlertData; onDismiss: (id: number) => void }) {
  return (
    <div className="fixed top-0 left-64 right-0 z-[100] bg-red-500/15 border-b border-red-500/40 backdrop-blur-xl px-6 py-3 animate-pulse">
      <div className="flex items-center gap-3">
        <XCircle className="w-5 h-5 text-red-400 animate-pulse" />
        <div className="flex-1">
          <span className="text-red-400 font-mono text-sm font-bold uppercase tracking-wider">CRITICAL ALERT: </span>
          <span className="text-red-300 text-sm">{alert.title}</span>
          <span className="text-red-400/70 text-xs ml-3">{alert.message.substring(0, 120)}</span>
        </div>
        <button onClick={() => onDismiss(alert.id)} className="text-red-400 hover:text-red-300 text-xs font-mono uppercase tracking-wider border border-red-500/30 px-3 py-1 rounded hover:bg-red-500/10 transition-colors">
          Acknowledge
        </button>
      </div>
    </div>
  );
}

export function AlertProvider({ children }: { children: React.ReactNode }) {
  const [allAlerts, setAllAlerts] = useState<AlertData[]>([]);
  const [toastAlerts, setToastAlerts] = useState<AlertData[]>([]);
  const [undismissedCount, setUndismissedCount] = useState(0);
  const [pushPermission, setPushPermission] = useState<NotificationPermission>("default");
  const [preferences, setPreferences] = useState<AlertPref[]>([]);
  const seenIdsRef = useRef<Set<number>>(new Set());
  const baseUrl = import.meta.env.BASE_URL || "/";

  useEffect(() => {
    if (typeof Notification !== "undefined") {
      setPushPermission(Notification.permission);
    }
  }, []);

  const requestPushPermission = useCallback(() => {
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission().then((perm) => setPushPermission(perm));
    }
  }, []);

  const isChannelEnabled = useCallback((channel: string, severity: string): boolean => {
    const pref = preferences.find(p => p.channel === channel);
    if (!pref || !pref.enabled) return false;
    const levels: Record<string, number> = { critical: 5, high: 4, medium: 3, low: 2, info: 1 };
    return (levels[severity] ?? 0) >= (levels[pref.minSeverity || "medium"] ?? 0);
  }, [preferences]);

  const fetchPreferences = useCallback(async () => {
    try {
      const res = await fetch(`${baseUrl}api/alerts/preferences`);
      if (res.ok) {
        const data = await res.json();
        setPreferences(data.preferences || []);
      }
    } catch {}
  }, [baseUrl]);

  useEffect(() => { fetchPreferences(); }, [fetchPreferences]);

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await fetch(`${baseUrl}api/alerts/recent?minutes=2`);
      if (!res.ok) return;
      const data = await res.json();
      const incoming: AlertData[] = data.alerts || [];
      setAllAlerts(incoming);

      const newAlerts = incoming.filter((a) => !seenIdsRef.current.has(a.id));

      if (newAlerts.length > 0) {
        for (const alert of newAlerts) {
          seenIdsRef.current.add(alert.id);

          if (isChannelEnabled("sound", alert.severity)) {
            playAlertSound(alert.severity);
          }

          if (isChannelEnabled("push", alert.severity)) {
            sendBrowserNotification(alert);
          }
        }

        if (preferences.length === 0 || newAlerts.some(a => isChannelEnabled("inapp", a.severity))) {
          setToastAlerts((prev) => [...newAlerts.filter(a => isChannelEnabled("inapp", a.severity) || preferences.length === 0), ...prev].slice(0, 10));
        }
      }

      const statsRes = await fetch(`${baseUrl}api/alerts/stats`);
      if (statsRes.ok) {
        const stats = await statsRes.json();
        setUndismissedCount(stats.undismissed || 0);
      }
    } catch {}
  }, [baseUrl, isChannelEnabled, preferences]);

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 10000);
    return () => clearInterval(interval);
  }, [fetchAlerts]);

  const dismissToast = useCallback((id: number) => {
    setToastAlerts((prev) => prev.filter((a) => a.id !== id));
    fetch(`${baseUrl}api/alerts/${id}/dismiss`, { method: "POST" }).catch(() => {});
  }, [baseUrl]);

  const sendTestAlert = useCallback(async () => {
    try {
      await fetch(`${baseUrl}api/alerts/test`, { method: "POST" });
      setTimeout(fetchAlerts, 1000);
    } catch {}
  }, [baseUrl, fetchAlerts]);

  const criticalAlerts = toastAlerts.filter((a) => a.severity === "critical");
  const nonCriticalAlerts = toastAlerts.filter((a) => a.severity !== "critical");

  return (
    <AlertContext.Provider value={{ alerts: allAlerts, undismissedCount, pushPermission, requestPushPermission, dismissToast, sendTestAlert }}>
      {children}

      {criticalAlerts.map((alert) => (
        <CriticalBanner key={`crit-${alert.id}`} alert={alert} onDismiss={dismissToast} />
      ))}

      <div className="fixed bottom-4 right-4 z-[90] flex flex-col gap-2 pointer-events-none">
        {nonCriticalAlerts.map((alert) => (
          <div key={`toast-${alert.id}`} className="pointer-events-auto">
            <AlertToast alert={alert} onDismiss={dismissToast} />
          </div>
        ))}
      </div>
    </AlertContext.Provider>
  );
}
