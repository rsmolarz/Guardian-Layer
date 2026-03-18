import { useState } from "react";
import {
  useGetSystemHealth,
  useGetActivityLog,
  useGetThreatMap,
  useGetThroughput,
  useGetRiskDistribution,
  useGetTopThreats,
} from "@workspace/api-client-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { CyberLoading } from "@/components/ui/CyberLoading";
import { CyberError } from "@/components/ui/CyberError";
import { motion } from "framer-motion";
import { clsx } from "clsx";
import { format } from "date-fns";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts";
import {
  Monitor,
  Activity,
  Shield,
  Globe,
  Clock,
  Cpu,
  HardDrive,
  Wifi,
  AlertTriangle,
  CheckCircle,
  XCircle,
  ChevronDown,
  Server,
  Database,
  Brain,
  Radio,
  Bell,
  Zap,
  TrendingUp,
  BarChart3,
  Eye,
} from "lucide-react";

const SEVERITY_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  info: { bg: "bg-primary/10", text: "text-primary", border: "border-primary/20" },
  warning: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/20" },
  error: { bg: "bg-rose-500/10", text: "text-rose-400", border: "border-rose-500/20" },
  critical: { bg: "bg-red-500/10", text: "text-red-400", border: "border-red-500/20" },
};

const CATEGORY_ICONS: Record<string, typeof Activity> = {
  transaction: Activity,
  approval: CheckCircle,
  alert: Bell,
  integration: Wifi,
  system: Server,
  auth: Shield,
};

const THREAT_COLORS = ["#06b6d4", "#f43f5e", "#f59e0b", "#10b981", "#8b5cf6", "#ec4899", "#3b82f6", "#14b8a6", "#f97316", "#6366f1"];

const SERVICE_ICONS: Record<string, typeof Server> = {
  "API Server": Server,
  "PostgreSQL Database": Database,
  "ML Risk Engine": Brain,
  "Webhook Processor": Radio,
  "Alert Pipeline": Bell,
};

type Tab = "overview" | "activity" | "threats" | "throughput";

export default function Monitoring() {
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [activityCategory, setActivityCategory] = useState<string>("");
  const [activitySeverity, setActivitySeverity] = useState<string>("");

  const tabs: { id: Tab; label: string; icon: typeof Monitor }[] = [
    { id: "overview", label: "System Health", icon: Monitor },
    { id: "activity", label: "Activity Log", icon: Eye },
    { id: "threats", label: "Threat Intel", icon: Globe },
    { id: "throughput", label: "Throughput", icon: TrendingUp },
  ];

  return (
    <div className="pb-12">
      <PageHeader
        title="System Monitoring"
        description="Real-time infrastructure health, audit trail, threat intelligence, and performance metrics."
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

      {activeTab === "overview" && <SystemHealthPanel />}
      {activeTab === "activity" && (
        <ActivityLogPanel
          category={activityCategory}
          severity={activitySeverity}
          onCategoryChange={setActivityCategory}
          onSeverityChange={setActivitySeverity}
        />
      )}
      {activeTab === "threats" && <ThreatIntelPanel />}
      {activeTab === "throughput" && <ThroughputPanel />}
    </div>
  );
}

function SystemHealthPanel() {
  const { data: health, isLoading, isError } = useGetSystemHealth({
    query: { refetchInterval: 10000 },
  });

  if (isLoading) return <CyberLoading text="SCANNING SUBSYSTEMS..." />;
  if (isError || !health) return <CyberError title="HEALTH CHECK FAILED" message="Unable to reach system health endpoint." />;

  const overallColor = health.overall === "healthy" ? "text-emerald-400" : health.overall === "degraded" ? "text-amber-400" : "text-red-400";
  const overallBg = health.overall === "healthy" ? "bg-emerald-500/10 border-emerald-500/20" : health.overall === "degraded" ? "bg-amber-500/10 border-amber-500/20" : "bg-red-500/10 border-red-500/20";

  const uptimeHours = Math.floor(health.uptime / 3600);
  const uptimeMinutes = Math.floor((health.uptime % 3600) / 60);

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className={clsx("glass-panel p-6 rounded-2xl border", overallBg)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={clsx("w-4 h-4 rounded-full animate-pulse shadow-[0_0_12px_currentColor]", overallColor)} />
            <div>
              <h3 className={clsx("font-display text-2xl font-bold uppercase tracking-wider", overallColor)}>
                {health.overall}
              </h3>
              <p className="font-mono text-xs text-muted-foreground mt-1">Overall system status</p>
            </div>
          </div>
          <div className="text-right">
            <div className="font-mono text-sm text-muted-foreground">UPTIME</div>
            <div className="font-mono text-xl text-foreground">{uptimeHours}h {uptimeMinutes}m</div>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: "Req/min", value: health.metrics.requestsPerMinute, icon: Activity, color: "text-primary" },
          { label: "Avg Response", value: `${health.metrics.avgResponseMs}ms`, icon: Clock, color: "text-emerald-400" },
          { label: "Error Rate", value: `${(health.metrics.errorRate * 100).toFixed(1)}%`, icon: AlertTriangle, color: health.metrics.errorRate > 0.05 ? "text-red-400" : "text-emerald-400" },
          { label: "Connections", value: health.metrics.activeConnections, icon: Wifi, color: "text-primary" },
          { label: "Memory", value: `${health.metrics.memoryUsageMb}MB`, icon: HardDrive, color: "text-amber-400" },
          { label: "CPU", value: `${health.metrics.cpuPercent}%`, icon: Cpu, color: "text-secondary" },
        ].map((metric, i) => (
          <motion.div
            key={metric.label}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05 }}
            className="glass-panel p-4 rounded-xl text-center"
          >
            <metric.icon className={clsx("w-5 h-5 mx-auto mb-2", metric.color)} />
            <div className="font-mono text-lg font-bold text-foreground">{metric.value}</div>
            <div className="font-display text-[10px] uppercase tracking-widest text-muted-foreground mt-1">{metric.label}</div>
          </motion.div>
        ))}
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-panel p-6 rounded-2xl">
        <h3 className="font-display text-sm uppercase tracking-widest text-primary mb-6 flex items-center gap-2">
          <Server className="w-4 h-4" />
          Service Health Matrix
        </h3>
        <div className="space-y-3">
          {health.services.map((service, i) => {
            const Icon = SERVICE_ICONS[service.name] || Server;
            const statusColor = service.status === "healthy" ? "text-emerald-400" : service.status === "degraded" ? "text-amber-400" : "text-red-400";
            const StatusIcon = service.status === "healthy" ? CheckCircle : service.status === "degraded" ? AlertTriangle : XCircle;
            return (
              <motion.div
                key={service.name}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.05 }}
                className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:border-primary/20 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <Icon className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <div className="font-display text-sm text-foreground">{service.name}</div>
                    <div className="font-mono text-xs text-muted-foreground mt-0.5">{service.details}</div>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <div className="font-mono text-xs text-muted-foreground">LATENCY</div>
                    <div className="font-mono text-sm text-foreground">{service.latencyMs}ms</div>
                  </div>
                  <div className={clsx("flex items-center gap-1.5", statusColor)}>
                    <StatusIcon className="w-4 h-4" />
                    <span className="font-display text-xs uppercase tracking-wider">{service.status}</span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}

function ActivityLogPanel({
  category,
  severity,
  onCategoryChange,
  onSeverityChange,
}: {
  category: string;
  severity: string;
  onCategoryChange: (v: string) => void;
  onSeverityChange: (v: string) => void;
}) {
  const params: Record<string, any> = { limit: 50 };
  if (category) params.category = category;
  if (severity) params.severity = severity;

  const { data, isLoading, isError } = useGetActivityLog(params, {
    query: { refetchInterval: 5000 },
  });

  if (isLoading) return <CyberLoading text="LOADING AUDIT TRAIL..." />;
  if (isError || !data) return <CyberError title="LOG RETRIEVAL FAILED" message="Unable to fetch activity logs." />;

  const categories = ["", "transaction", "approval", "alert", "integration", "system", "auth"];
  const severities = ["", "info", "warning", "error", "critical"];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <span className="font-display text-xs uppercase tracking-widest text-muted-foreground">Category:</span>
          <div className="flex gap-1">
            {categories.map((c) => (
              <button
                key={c || "all"}
                onClick={() => onCategoryChange(c)}
                className={clsx(
                  "px-3 py-1.5 rounded-lg font-display text-xs uppercase tracking-wider transition-all",
                  category === c
                    ? "bg-primary/10 text-primary border border-primary/20"
                    : "text-muted-foreground hover:bg-white/5"
                )}
              >
                {c || "All"}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-display text-xs uppercase tracking-widest text-muted-foreground">Level:</span>
          <div className="flex gap-1">
            {severities.map((s) => {
              const style = s ? SEVERITY_STYLES[s] : { bg: "", text: "text-muted-foreground", border: "" };
              return (
                <button
                  key={s || "all"}
                  onClick={() => onSeverityChange(s)}
                  className={clsx(
                    "px-3 py-1.5 rounded-lg font-display text-xs uppercase tracking-wider transition-all",
                    severity === s
                      ? `${style.bg} ${style.text} border ${style.border}`
                      : "text-muted-foreground hover:bg-white/5"
                  )}
                >
                  {s || "All"}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="glass-panel rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          <h3 className="font-display text-sm uppercase tracking-widest text-primary flex items-center gap-2">
            <Eye className="w-4 h-4" />
            Audit Trail
          </h3>
          <span className="font-mono text-xs text-muted-foreground">{data.total} total entries</span>
        </div>

        <div className="divide-y divide-white/5 max-h-[600px] overflow-y-auto">
          {data.entries.map((entry, i) => {
            const style = SEVERITY_STYLES[entry.severity] || SEVERITY_STYLES.info;
            const Icon = CATEGORY_ICONS[entry.category] || Activity;
            return (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.02 }}
                className="flex items-start gap-4 p-4 hover:bg-white/[0.02] transition-colors"
              >
                <div className={clsx("p-2 rounded-lg shrink-0 mt-0.5", style.bg)}>
                  <Icon className={clsx("w-4 h-4", style.text)} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={clsx("px-2 py-0.5 rounded text-[10px] font-display uppercase tracking-wider border", style.bg, style.text, style.border)}>
                      {entry.severity}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-display uppercase tracking-wider bg-white/5 text-muted-foreground border border-white/10">
                      {entry.category}
                    </span>
                    <span className="font-mono text-xs text-muted-foreground">
                      {format(new Date(entry.createdAt), "MMM dd, yyyy HH:mm:ss")}
                    </span>
                  </div>
                  <div className="font-display text-sm text-foreground mt-1.5">{entry.action}</div>
                  <div className="font-mono text-xs text-muted-foreground mt-1 truncate">{entry.detail}</div>
                </div>
                <div className="text-right shrink-0">
                  {entry.responseTimeMs && (
                    <div className="font-mono text-xs text-muted-foreground">
                      {entry.responseTimeMs}ms
                    </div>
                  )}
                  {entry.ipAddress && (
                    <div className="font-mono text-[10px] text-muted-foreground/60 mt-1">
                      {entry.ipAddress}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
          {data.entries.length === 0 && (
            <div className="p-12 text-center font-mono text-muted-foreground">
              NO ENTRIES MATCH CURRENT FILTERS
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ThreatIntelPanel() {
  const { data: threatMap, isLoading: isMapLoading } = useGetThreatMap();
  const { data: riskDist, isLoading: isDistLoading } = useGetRiskDistribution();
  const { data: topThreats, isLoading: isThreatsLoading } = useGetTopThreats();

  if (isMapLoading || isDistLoading || isThreatsLoading) return <CyberLoading text="ANALYZING THREAT VECTORS..." />;

  return (
    <div className="space-y-6">
      {threatMap && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-panel p-6 rounded-2xl">
          <h3 className="font-display text-sm uppercase tracking-widest text-primary mb-6 flex items-center gap-2">
            <Globe className="w-4 h-4" />
            Geographic Threat Distribution
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {threatMap.regions.map((region, i) => {
              const levelColor = region.threatLevel === "critical" ? "text-red-400 border-red-500/20 bg-red-500/5" :
                region.threatLevel === "high" ? "text-orange-400 border-orange-500/20 bg-orange-500/5" :
                region.threatLevel === "medium" ? "text-amber-400 border-amber-500/20 bg-amber-500/5" :
                "text-emerald-400 border-emerald-500/20 bg-emerald-500/5";
              return (
                <motion.div
                  key={region.country}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05 }}
                  className={clsx("p-4 rounded-xl border", levelColor)}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="font-display text-sm font-bold text-foreground">{region.countryName}</div>
                      <div className="font-mono text-xs text-muted-foreground">{region.country}</div>
                    </div>
                    <span className={clsx("px-2 py-0.5 rounded text-[10px] font-display uppercase tracking-wider",
                      region.threatLevel === "critical" ? "bg-red-500/20 text-red-400" :
                      region.threatLevel === "high" ? "bg-orange-500/20 text-orange-400" :
                      region.threatLevel === "medium" ? "bg-amber-500/20 text-amber-400" :
                      "bg-emerald-500/20 text-emerald-400"
                    )}>
                      {region.threatLevel}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 font-mono text-xs">
                    <div>
                      <div className="text-muted-foreground">Total</div>
                      <div className="text-foreground font-bold">{region.totalTransactions}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Blocked</div>
                      <div className="text-rose-400 font-bold">{region.blockedTransactions}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Held</div>
                      <div className="text-amber-400 font-bold">{region.heldTransactions}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Avg Risk</div>
                      <div className={clsx("font-bold", region.avgRiskScore > 0.7 ? "text-red-400" : region.avgRiskScore > 0.4 ? "text-amber-400" : "text-emerald-400")}>
                        {(region.avgRiskScore * 100).toFixed(0)}%
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {riskDist && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-panel p-6 rounded-2xl">
            <h3 className="font-display text-sm uppercase tracking-widest text-primary mb-6 flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Risk Score Distribution
            </h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={riskDist.buckets}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="range" stroke="hsl(var(--muted-foreground))" fontSize={10} fontFamily="JetBrains Mono" angle={-45} textAnchor="end" height={60} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} fontFamily="JetBrains Mono" />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '0.5rem', fontFamily: 'JetBrains Mono' }}
                    itemStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Bar dataKey="count" name="Transactions" radius={[4, 4, 0, 0]}>
                    {riskDist.buckets.map((_, index) => (
                      <Cell key={index} fill={index < 4 ? "#10b981" : index < 7 ? "#f59e0b" : "#f43f5e"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 text-center font-mono text-xs text-muted-foreground">
              {riskDist.totalAnalyzed} transactions analyzed
            </div>
          </motion.div>
        )}

        {topThreats && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-panel p-6 rounded-2xl">
            <h3 className="font-display text-sm uppercase tracking-widest text-primary mb-6 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Threat Categories
            </h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={topThreats.byCategory}
                    dataKey="count"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    innerRadius={50}
                    paddingAngle={4}
                    label={({ category, count }) => `${category}: ${count}`}
                    labelLine={false}
                  >
                    {topThreats.byCategory.map((_, index) => (
                      <Cell key={index} fill={THREAT_COLORS[index % THREAT_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '0.5rem', fontFamily: 'JetBrains Mono' }}
                    itemStyle={{ color: 'hsl(var(--foreground))' }}
                    formatter={(value: any, _name: any, props: any) => [`${value} (Avg Risk: ${(props.payload.avgRisk * 100).toFixed(0)}%)`, props.payload.category]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        )}
      </div>

      {topThreats && topThreats.recentHighRisk.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="glass-panel p-6 rounded-2xl">
          <h3 className="font-display text-sm uppercase tracking-widest text-rose-400 mb-6 flex items-center gap-2">
            <Zap className="w-4 h-4" />
            Recent High-Risk Transactions
          </h3>
          <div className="space-y-3">
            {topThreats.recentHighRisk.map((txn) => (
              <div key={txn.id} className="flex items-center justify-between p-4 rounded-xl bg-rose-500/5 border border-rose-500/10 hover:border-rose-500/20 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="p-2 rounded-lg bg-rose-500/10">
                    <AlertTriangle className="w-4 h-4 text-rose-400" />
                  </div>
                  <div>
                    <div className="font-mono text-sm text-foreground">{txn.source} → {txn.destination}</div>
                    <div className="font-mono text-xs text-muted-foreground mt-0.5">
                      {txn.category} | {txn.country || "Unknown"} | {format(new Date(txn.createdAt), "MMM dd HH:mm")}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="font-mono text-sm font-bold text-foreground">{txn.amount.toLocaleString()} {txn.currency}</div>
                  </div>
                  <div className={clsx("font-mono text-sm font-bold px-3 py-1 rounded-lg",
                    txn.riskScore > 0.8 ? "bg-red-500/20 text-red-400" : "bg-orange-500/20 text-orange-400"
                  )}>
                    {(txn.riskScore * 100).toFixed(0)}%
                  </div>
                  <span className={clsx("px-2 py-1 rounded-lg text-xs font-display uppercase tracking-wider",
                    txn.status === "BLOCKED" ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" :
                    txn.status === "HELD" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                    "bg-primary/10 text-primary border border-primary/20"
                  )}>
                    {txn.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}

function ThroughputPanel() {
  const { data: throughput, isLoading, isError } = useGetThroughput({ hours: 48 }, {
    query: { refetchInterval: 15000 },
  });

  if (isLoading) return <CyberLoading text="COMPUTING THROUGHPUT METRICS..." />;
  if (isError || !throughput) return <CyberError title="METRICS UNAVAILABLE" message="Failed to retrieve throughput data." />;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: "Total Processed", value: throughput.summary.totalProcessed, icon: Activity, color: "text-primary" },
          { label: "Peak / Hour", value: throughput.summary.peakPerHour, icon: TrendingUp, color: "text-amber-400" },
          { label: "Avg / Hour", value: throughput.summary.avgPerHour.toFixed(1), icon: BarChart3, color: "text-emerald-400" },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass-panel p-6 rounded-2xl"
          >
            <stat.icon className={clsx("w-6 h-6 mb-3", stat.color)} />
            <div className="font-mono text-3xl font-bold text-foreground">{stat.value}</div>
            <div className="font-display text-xs uppercase tracking-widest text-muted-foreground mt-2">{stat.label}</div>
          </motion.div>
        ))}
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-panel p-6 rounded-2xl">
        <h3 className="font-display text-sm uppercase tracking-widest text-primary mb-6 flex items-center gap-2">
          <Activity className="w-4 h-4" />
          Transaction Volume Over Time
        </h3>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={throughput.dataPoints} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorProcessed" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorBlocked" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="timestamp" stroke="hsl(var(--muted-foreground))" fontSize={10} fontFamily="JetBrains Mono" angle={-45} textAnchor="end" height={60} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} fontFamily="JetBrains Mono" />
              <Tooltip
                contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '0.5rem', fontFamily: 'JetBrains Mono' }}
                itemStyle={{ color: 'hsl(var(--foreground))' }}
              />
              <Area type="monotone" dataKey="transactionsProcessed" stroke="#06b6d4" strokeWidth={2} fillOpacity={1} fill="url(#colorProcessed)" name="Processed" />
              <Area type="monotone" dataKey="blockedCount" stroke="#f43f5e" strokeWidth={2} fillOpacity={1} fill="url(#colorBlocked)" name="Blocked" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </motion.div>
    </div>
  );
}
