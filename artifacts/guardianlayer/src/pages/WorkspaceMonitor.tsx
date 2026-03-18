import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { clsx } from "clsx";
import {
  Mail,
  HardDrive,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader2,
  RefreshCw,
  Brain,
  Wifi,
  WifiOff,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";

interface ScanResult {
  id: string;
  source: string;
  type: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
  title: string;
  description: string;
  detectedAt: string;
  metadata: Record<string, string>;
  aiAnalysis?: string;
}

interface MonitorStatus {
  gmail: { connected: boolean; error?: string };
  drive: { connected: boolean; error?: string };
  lastScanAt: string | null;
  isScanning: boolean;
  resultsCount: number;
  threats: number;
}

const SEVERITY_BADGE: Record<string, string> = {
  critical: "bg-red-500/20 text-red-400 border-red-500/30",
  high: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  low: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  info: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
};

export default function WorkspaceMonitor() {
  const [status, setStatus] = useState<MonitorStatus | null>(null);
  const [results, setResults] = useState<ScanResult[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [scanLog, setScanLog] = useState<string[]>([]);
  const [lastScanAt, setLastScanAt] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/workspace-monitor/status")
      .then((r) => r.json())
      .then((d) => setStatus(d))
      .catch(() => {});

    fetch("/api/workspace-monitor/results")
      .then((r) => r.json())
      .then((d) => {
        setResults(d.results || []);
        setLastScanAt(d.lastScanAt);
      })
      .catch(() => {});
  }, []);

  const startScan = async () => {
    if (isScanning) return;
    setIsScanning(true);
    setScanLog([]);
    setResults([]);

    try {
      const response = await fetch("/api/workspace-monitor/scan", { method: "POST" });
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.substring(6));
                if (data.message) {
                  setScanLog((prev) => [...prev, data.message]);
                }
                if (data.results) {
                  setResults(data.results);
                  setLastScanAt(new Date().toISOString());
                }
              } catch {
                // skip
              }
            }
          }
        }
      }
    } catch {
      setScanLog((prev) => [...prev, "Scan failed — please try again"]);
    } finally {
      setIsScanning(false);
      fetch("/api/workspace-monitor/status")
        .then((r) => r.json())
        .then((d) => setStatus(d))
        .catch(() => {});
    }
  };

  const highThreats = results.filter((r) => r.severity === "critical" || r.severity === "high");

  return (
    <div className="p-6">
      <PageHeader
        title="Google Workspace Monitor"
        subtitle="Continuously scan Gmail, Google Drive, and Google services for security threats"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="glass-panel p-4 rounded-xl border border-white/5">
          <div className="flex items-center gap-2 mb-2">
            <Mail className="w-4 h-4 text-blue-400" />
            <span className="text-[10px] font-display uppercase tracking-widest text-muted-foreground">Gmail</span>
          </div>
          <div className="flex items-center gap-2">
            {status?.gmail.connected ? (
              <><Wifi className="w-4 h-4 text-emerald-400" /><span className="text-sm text-emerald-400 font-mono">Connected</span></>
            ) : (
              <><WifiOff className="w-4 h-4 text-red-400" /><span className="text-sm text-red-400 font-mono">Not Connected</span></>
            )}
          </div>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-white/5">
          <div className="flex items-center gap-2 mb-2">
            <HardDrive className="w-4 h-4 text-yellow-400" />
            <span className="text-[10px] font-display uppercase tracking-widest text-muted-foreground">Google Drive</span>
          </div>
          <div className="flex items-center gap-2">
            {status?.drive.connected ? (
              <><Wifi className="w-4 h-4 text-emerald-400" /><span className="text-sm text-emerald-400 font-mono">Connected</span></>
            ) : (
              <><WifiOff className="w-4 h-4 text-red-400" /><span className="text-sm text-red-400 font-mono">Not Connected</span></>
            )}
          </div>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-white/5">
          <div className="flex items-center gap-2 mb-2">
            <ShieldAlert className="w-4 h-4 text-red-400" />
            <span className="text-[10px] font-display uppercase tracking-widest text-muted-foreground">Threats Found</span>
          </div>
          <p className={`text-2xl font-mono font-bold ${highThreats.length > 0 ? "text-red-400" : "text-emerald-400"}`}>
            {highThreats.length}
          </p>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-white/5">
          <div className="flex items-center gap-2 mb-2">
            <RefreshCw className="w-4 h-4 text-cyan-400" />
            <span className="text-[10px] font-display uppercase tracking-widest text-muted-foreground">Last Scan</span>
          </div>
          <p className="text-sm font-mono text-cyan-400">
            {lastScanAt ? new Date(lastScanAt).toLocaleString() : "Never"}
          </p>
        </div>
      </div>

      <div className="glass-panel p-4 rounded-xl border border-white/5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Brain className="w-4 h-4 text-primary" />
            <span className="text-xs font-display uppercase tracking-widest text-white">Security Scanner</span>
          </div>
          <button
            onClick={startScan}
            disabled={isScanning}
            className={clsx(
              "px-4 py-2 rounded-lg text-xs font-display uppercase tracking-wider flex items-center gap-2 transition-colors",
              isScanning
                ? "bg-white/5 border border-white/10 text-gray-500 cursor-not-allowed"
                : "bg-primary/20 border border-primary/40 text-primary hover:bg-primary/30"
            )}
          >
            {isScanning ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Scanning...</>
            ) : (
              <><RefreshCw className="w-4 h-4" /> Scan Now</>
            )}
          </button>
        </div>

        {scanLog.length > 0 && (
          <div className="p-3 rounded-lg bg-black/40 border border-white/5 max-h-40 overflow-y-auto mb-4">
            {scanLog.map((log, i) => (
              <div key={i} className="text-xs font-mono text-gray-400 py-0.5">
                <span className="text-muted-foreground mr-2">[{String(i + 1).padStart(2, "0")}]</span>
                {log}
              </div>
            ))}
          </div>
        )}

        {!isScanning && results.length === 0 && lastScanAt && (
          <div className="text-center py-8">
            <ShieldCheck className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
            <p className="text-sm text-emerald-400 font-display uppercase tracking-wider">No Threats Detected</p>
            <p className="text-xs text-muted-foreground mt-1">Your Google Workspace appears clean</p>
          </div>
        )}

        {!isScanning && results.length === 0 && !lastScanAt && (
          <div className="text-center py-8">
            <Mail className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground font-display uppercase tracking-wider">No scan results yet</p>
            <p className="text-xs text-muted-foreground mt-1">Click "Scan Now" to check your Google Workspace for threats</p>
          </div>
        )}
      </div>

      {results.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-orange-400" />
            <span className="text-xs font-display uppercase tracking-widest text-white">Scan Results ({results.length})</span>
          </div>
          {results.map((result) => (
            <motion.div
              key={result.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`glass-panel rounded-xl border-l-4 p-4 ${
                result.severity === "critical" ? "border-red-500" :
                result.severity === "high" ? "border-orange-500" :
                result.severity === "medium" ? "border-yellow-500" : "border-emerald-500"
              }`}
            >
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                {result.source === "Gmail" ? <Mail className="w-4 h-4 text-blue-400" /> : <HardDrive className="w-4 h-4 text-yellow-400" />}
                <span className="text-sm font-display text-white">{result.title}</span>
                <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border ${SEVERITY_BADGE[result.severity]}`}>
                  {result.severity}
                </span>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded border border-white/10 text-muted-foreground">
                  {result.source}
                </span>
              </div>
              <p className="text-xs text-gray-300 mb-2">{result.description}</p>

              {result.metadata && Object.keys(result.metadata).length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {Object.entries(result.metadata).map(([key, value]) => (
                    <span key={key} className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 border border-white/5 text-muted-foreground">
                      {key}: {String(value).substring(0, 60)}
                    </span>
                  ))}
                </div>
              )}

              {result.aiAnalysis && (
                <div className="mt-3 p-3 rounded-lg bg-primary/5 border border-primary/15">
                  <div className="flex items-center gap-2 mb-2">
                    <Brain className="w-3 h-3 text-primary" />
                    <span className="text-[10px] font-display uppercase tracking-widest text-primary">AI Analysis</span>
                  </div>
                  <p className="text-xs text-gray-300 whitespace-pre-wrap">{result.aiAnalysis}</p>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
