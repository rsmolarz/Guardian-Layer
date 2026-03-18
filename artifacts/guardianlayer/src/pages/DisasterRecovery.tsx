import { useState } from "react";
import {
  useGetDrDashboard,
  useListDrProcedures,
  useGetDrProcedure,
  useListDrTestResults,
  useListDrBusinessImpact,
  useListDrFailover,
  useListDrCommunicationPlan,
  useListDrCompliance,
  useUpdateDrComplianceStatus,
  getGetDrDashboardQueryKey,
  getListDrComplianceQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Activity,
  Server,
  Users,
  FileText,
  Target,
  Gauge,
  Loader2,
  Database,
  Globe,
  Lock,
  Zap,
  HardDrive,
  Phone,
  Mail,
  ArrowUpDown,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { CyberLoading } from "@/components/ui/CyberLoading";
import { CyberError } from "@/components/ui/CyberError";
import { useToast } from "@/hooks/use-toast";

type TabKey = "dashboard" | "procedures" | "impact" | "testing" | "compliance" | "communication";

const TABS: { key: TabKey; label: string }[] = [
  { key: "dashboard", label: "Overview" },
  { key: "procedures", label: "Recovery Procedures" },
  { key: "impact", label: "Business Impact" },
  { key: "testing", label: "DR Testing" },
  { key: "compliance", label: "Compliance" },
  { key: "communication", label: "Communication" },
];

const SCENARIO_ICONS: Record<string, typeof Shield> = {
  database_failure: Database,
  application_server_failure: Server,
  network_outage: Globe,
  security_breach: Lock,
  data_corruption: HardDrive,
  ransomware_attack: ShieldAlert,
  infrastructure_loss: Zap,
};

const PRIORITY_STYLES: Record<string, { bg: string; text: string }> = {
  critical: { bg: "bg-rose-500/10 border-rose-500/30", text: "text-rose-400" },
  high: { bg: "bg-amber-500/10 border-amber-500/30", text: "text-amber-400" },
  medium: { bg: "bg-blue-500/10 border-blue-500/30", text: "text-blue-400" },
  low: { bg: "bg-zinc-500/10 border-zinc-500/30", text: "text-zinc-400" },
};

const OUTCOME_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  pass: { bg: "bg-emerald-500/10 border-emerald-500/30", text: "text-emerald-400", label: "Passed" },
  partial: { bg: "bg-amber-500/10 border-amber-500/30", text: "text-amber-400", label: "Partial" },
  fail: { bg: "bg-rose-500/10 border-rose-500/30", text: "text-rose-400", label: "Failed" },
};

function ReadinessGauge({ score }: { score: number }) {
  const color = score >= 80 ? "text-emerald-400" : score >= 60 ? "text-amber-400" : "text-rose-400";
  const glow = score >= 80 ? "rgba(16,185,129,0.3)" : score >= 60 ? "rgba(245,158,11,0.3)" : "rgba(239,68,68,0.3)";

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-32 h-32">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="10" />
          <motion.circle
            cx="60" cy="60" r="50" fill="none"
            className={color}
            stroke="currentColor" strokeWidth="10" strokeLinecap="round"
            strokeDasharray={`${score * 3.14} ${314 - score * 3.14}`}
            initial={{ strokeDasharray: "0 314" }}
            animate={{ strokeDasharray: `${score * 3.14} ${314 - score * 3.14}` }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            style={{ filter: `drop-shadow(0 0 8px ${glow})` }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-3xl font-mono font-bold ${color}`}>{score}</span>
          <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Score</span>
        </div>
      </div>
      <span className="mt-2 text-xs font-display uppercase tracking-widest text-muted-foreground">DR Readiness</span>
    </div>
  );
}

function DashboardTab() {
  const { data: dashboard, isLoading, isError } = useGetDrDashboard();
  const { data: failover } = useListDrFailover();

  if (isLoading) return <CyberLoading text="Loading DR dashboard..." />;
  if (isError || !dashboard) return <CyberError title="Dashboard Error" message="Could not load disaster recovery dashboard." />;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-panel p-6 rounded-2xl flex items-center justify-center">
          <ReadinessGauge score={dashboard.readinessScore} />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-panel p-6 rounded-2xl space-y-4">
          <h3 className="font-display text-xs uppercase tracking-widest text-primary flex items-center gap-2"><Clock className="w-4 h-4" /> Recovery Objectives</h3>
          <div className="space-y-3">
            <div className="p-3 rounded-xl bg-black/20 border border-white/5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-mono text-muted-foreground">RTO (Recovery Time)</span>
                <span className={`text-xs font-mono ${dashboard.rtoStatus.onTarget ? "text-emerald-400" : "text-rose-400"}`}>
                  {dashboard.rtoStatus.onTarget ? "On Target" : "At Risk"}
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-mono font-bold text-white">{dashboard.rtoStatus.currentMinutes}min</span>
                <span className="text-xs font-mono text-muted-foreground">/ {dashboard.rtoStatus.targetMinutes}min target</span>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-black/20 border border-white/5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-mono text-muted-foreground">RPO (Recovery Point)</span>
                <span className={`text-xs font-mono ${dashboard.rpoStatus.onTarget ? "text-emerald-400" : "text-rose-400"}`}>
                  {dashboard.rpoStatus.onTarget ? "On Target" : "At Risk"}
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-mono font-bold text-white">{dashboard.rpoStatus.currentMinutes}min</span>
                <span className="text-xs font-mono text-muted-foreground">/ {dashboard.rpoStatus.targetMinutes}min target</span>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-panel p-6 rounded-2xl space-y-3">
          <h3 className="font-display text-xs uppercase tracking-widest text-primary flex items-center gap-2"><Target className="w-4 h-4" /> Quick Stats</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Procedures", value: dashboard.totalProcedures, icon: FileText },
              { label: "Tests Run", value: dashboard.totalTestsRun, icon: Activity },
              { label: "Compliance", value: `${dashboard.compliancePercentage}%`, icon: ShieldCheck },
              { label: "Open Gaps", value: dashboard.criticalGaps, icon: AlertTriangle },
            ].map((stat) => (
              <div key={stat.label} className="p-3 rounded-xl bg-black/20 border border-white/5">
                <div className="flex items-center gap-2 mb-1">
                  <stat.icon className="w-3 h-3 text-muted-foreground" />
                  <span className="text-[10px] font-mono text-muted-foreground uppercase">{stat.label}</span>
                </div>
                <span className="text-lg font-mono font-bold text-white">{stat.value}</span>
              </div>
            ))}
          </div>
          {dashboard.lastDrTest && (
            <div className="p-3 rounded-xl bg-black/20 border border-white/5">
              <span className="text-[10px] font-mono text-muted-foreground uppercase block mb-1">Last DR Test</span>
              <span className="text-sm text-white font-mono block">{dashboard.lastDrTest.procedureTitle}</span>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${OUTCOME_STYLES[dashboard.lastDrTest.outcome]?.bg ?? ""} ${OUTCOME_STYLES[dashboard.lastDrTest.outcome]?.text ?? ""}`}>
                  {OUTCOME_STYLES[dashboard.lastDrTest.outcome]?.label ?? dashboard.lastDrTest.outcome}
                </span>
                <span className="text-[10px] font-mono text-muted-foreground">{format(new Date(dashboard.lastDrTest.testDate), "PP")}</span>
              </div>
            </div>
          )}
        </motion.div>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-panel p-6 rounded-2xl">
        <h3 className="font-display text-xs uppercase tracking-widest text-primary mb-4 flex items-center gap-2">
          <Server className="w-4 h-4" /> Failover Status
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {(failover?.configs ?? dashboard.componentHealth.map((c: { component: string; status: string; lastChecked: string }) => ({
            id: 0, component: c.component, primaryStatus: c.status, secondaryStatus: "standby",
            failoverMode: "automatic", lastHealthCheckAt: c.lastChecked, rtoSeconds: 0, isActive: true,
          }))).map((config: { id: number; component: string; primaryStatus: string; secondaryStatus: string; failoverMode: string; rtoSeconds: number }) => {
            const isHealthy = config.primaryStatus === "healthy";
            return (
              <div key={config.component} className="p-4 rounded-xl bg-black/20 border border-white/5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-white font-mono">{config.component}</span>
                  <div className={`w-2 h-2 rounded-full ${isHealthy ? "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.8)]" : "bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.8)]"}`} />
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-mono">
                    <span className="text-muted-foreground">Primary</span>
                    <span className={isHealthy ? "text-emerald-400" : "text-amber-400"}>{config.primaryStatus}</span>
                  </div>
                  <div className="flex justify-between text-[10px] font-mono">
                    <span className="text-muted-foreground">Secondary</span>
                    <span className="text-zinc-400">{config.secondaryStatus}</span>
                  </div>
                  <div className="flex justify-between text-[10px] font-mono">
                    <span className="text-muted-foreground">Mode</span>
                    <span className="text-primary">{config.failoverMode}</span>
                  </div>
                  {config.rtoSeconds > 0 && (
                    <div className="flex justify-between text-[10px] font-mono">
                      <span className="text-muted-foreground">RTO</span>
                      <span className="text-zinc-300">{config.rtoSeconds < 60 ? `${config.rtoSeconds}s` : `${Math.round(config.rtoSeconds / 60)}min`}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}

function ProcedureDetail({ procedureId }: { procedureId: number }) {
  const { data, isLoading } = useGetDrProcedure(procedureId);

  if (isLoading) return <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>;
  if (!data) return null;

  return (
    <div className="space-y-3 mt-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="p-3 rounded-xl bg-black/30 border border-white/5">
          <span className="text-[10px] font-mono text-muted-foreground uppercase block mb-1">Estimated Recovery</span>
          <span className="text-lg font-mono font-bold text-white">{data.procedure.estimatedRecoveryMinutes} min</span>
        </div>
        <div className="p-3 rounded-xl bg-black/30 border border-white/5">
          <span className="text-[10px] font-mono text-muted-foreground uppercase block mb-1">Required Personnel</span>
          <span className="text-xs font-mono text-zinc-300">{data.procedure.requiredPersonnel}</span>
        </div>
        <div className="p-3 rounded-xl bg-black/30 border border-white/5">
          <span className="text-[10px] font-mono text-muted-foreground uppercase block mb-1">Dependencies</span>
          <span className="text-xs font-mono text-zinc-300">{data.procedure.dependencies}</span>
        </div>
      </div>

      <h4 className="font-display text-xs uppercase tracking-widest text-primary mt-4 flex items-center gap-2">
        <FileText className="w-4 h-4" /> Step-by-Step Runbook
      </h4>
      <div className="space-y-2">
        {data.steps.map((step) => (
          <div key={step.id} className="p-4 rounded-xl bg-black/20 border border-white/5 flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-xs font-mono font-bold text-primary shrink-0">
              {step.stepOrder}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h5 className="text-sm text-white font-medium">{step.title}</h5>
                <span className="text-[10px] font-mono text-muted-foreground shrink-0 ml-2">{step.estimatedMinutes} min</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{step.description}</p>
              <span className="text-[10px] font-mono text-primary/70 mt-1 block">{step.responsible}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProceduresTab() {
  const { data, isLoading, isError } = useListDrProcedures();
  const [expandedId, setExpandedId] = useState<number | null>(null);

  if (isLoading) return <CyberLoading text="Loading procedures..." />;
  if (isError || !data) return <CyberError title="Error" message="Could not load recovery procedures." />;

  return (
    <div className="space-y-4">
      <div className="glass-panel p-4 rounded-xl mb-4">
        <p className="text-sm text-muted-foreground">
          These are step-by-step runbooks for every disaster scenario. Each procedure includes estimated recovery time, required personnel, and dependencies. Expand a procedure to see the full checklist that can be followed during an emergency.
        </p>
      </div>
      {data.procedures.map((proc) => {
        const Icon = SCENARIO_ICONS[proc.scenario] ?? Shield;
        const priorityStyle = PRIORITY_STYLES[proc.priority] ?? PRIORITY_STYLES.medium;
        const isExpanded = expandedId === proc.id;

        return (
          <motion.div key={proc.id} layout className="glass-panel rounded-2xl overflow-hidden">
            <button
              onClick={() => setExpandedId(isExpanded ? null : proc.id)}
              className="w-full p-6 flex items-center justify-between hover:bg-white/[0.02] transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl ${priorityStyle.bg} border`}>
                  <Icon className={`w-6 h-6 ${priorityStyle.text}`} />
                </div>
                <div className="text-left">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-display text-white text-lg uppercase tracking-wider">{proc.title}</h3>
                    <span className={`text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded border ${priorityStyle.bg} ${priorityStyle.text}`}>
                      {proc.priority}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{proc.description.slice(0, 120)}...</p>
                </div>
              </div>
              <div className="flex items-center gap-6 shrink-0">
                <div className="hidden md:flex items-center gap-4 text-right">
                  <div>
                    <span className="text-[10px] font-mono text-muted-foreground block">RTO</span>
                    <span className="text-sm font-mono text-white">{proc.rtoMinutes}m</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono text-muted-foreground block">RPO</span>
                    <span className="text-sm font-mono text-white">{proc.rpoMinutes}m</span>
                  </div>
                  {proc.lastTestedAt && (
                    <div>
                      <span className="text-[10px] font-mono text-muted-foreground block">Tested</span>
                      <span className="text-sm font-mono text-white">{format(new Date(proc.lastTestedAt), "MMM d")}</span>
                    </div>
                  )}
                  {proc.lastTestResult && (
                    <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border ${OUTCOME_STYLES[proc.lastTestResult]?.bg ?? ""} ${OUTCOME_STYLES[proc.lastTestResult]?.text ?? ""}`}>
                      {OUTCOME_STYLES[proc.lastTestResult]?.label ?? proc.lastTestResult}
                    </span>
                  )}
                </div>
                {isExpanded ? <ChevronDown className="w-5 h-5 text-muted-foreground" /> : <ChevronRight className="w-5 h-5 text-muted-foreground" />}
              </div>
            </button>
            <AnimatePresence>
              {isExpanded && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }} className="overflow-hidden">
                  <div className="px-6 pb-6 border-t border-white/5 pt-4">
                    <ProcedureDetail procedureId={proc.id} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </div>
  );
}

function BusinessImpactTab() {
  const { data, isLoading, isError } = useListDrBusinessImpact();
  const [sortField, setSortField] = useState<"criticality" | "financial" | "downtime">("criticality");

  if (isLoading) return <CyberLoading text="Loading business impact analysis..." />;
  if (isError || !data) return <CyberError title="Error" message="Could not load business impact data." />;

  const critOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  const sorted = [...data.items].sort((a, b) => {
    if (sortField === "criticality") return (critOrder[a.criticality] ?? 4) - (critOrder[b.criticality] ?? 4);
    if (sortField === "financial") return b.financialImpactPerHour - a.financialImpactPerHour;
    return a.maxDowntimeMinutes - b.maxDowntimeMinutes;
  });

  return (
    <div className="space-y-4">
      <div className="glass-panel p-4 rounded-xl">
        <p className="text-sm text-muted-foreground">
          This analysis shows which systems are most critical to your business, their maximum tolerable downtime, and the financial impact of each hour of downtime. Use this to prioritize recovery efforts during a disaster.
        </p>
      </div>

      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-mono text-muted-foreground">Sort by:</span>
        {(["criticality", "financial", "downtime"] as const).map((field) => (
          <button
            key={field}
            onClick={() => setSortField(field)}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors ${sortField === field ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-white"}`}
          >
            <ArrowUpDown className="w-3 h-3 inline mr-1" />
            {field === "criticality" ? "Criticality" : field === "financial" ? "Financial Impact" : "Max Downtime"}
          </button>
        ))}
      </div>

      <div className="glass-panel rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                <th className="px-6 py-4 text-left text-[10px] font-display uppercase tracking-widest text-muted-foreground bg-black/40">System</th>
                <th className="px-4 py-4 text-left text-[10px] font-display uppercase tracking-widest text-muted-foreground bg-black/40">Criticality</th>
                <th className="px-4 py-4 text-left text-[10px] font-display uppercase tracking-widest text-muted-foreground bg-black/40">Max Downtime</th>
                <th className="px-4 py-4 text-left text-[10px] font-display uppercase tracking-widest text-muted-foreground bg-black/40">Impact/Hour</th>
                <th className="px-4 py-4 text-left text-[10px] font-display uppercase tracking-widest text-muted-foreground bg-black/40">Status</th>
                <th className="px-4 py-4 text-left text-[10px] font-display uppercase tracking-widest text-muted-foreground bg-black/40">Dependencies</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((item) => {
                const priorityStyle = PRIORITY_STYLES[item.criticality] ?? PRIORITY_STYLES.medium;
                return (
                  <tr key={item.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4">
                      <div className="text-sm text-white font-medium">{item.systemName}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{item.description.slice(0, 80)}...</div>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border ${priorityStyle.bg} ${priorityStyle.text}`}>
                        {item.criticality}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm font-mono text-white">
                      {item.maxDowntimeMinutes < 60 ? `${item.maxDowntimeMinutes} min` : `${Math.round(item.maxDowntimeMinutes / 60)}h ${item.maxDowntimeMinutes % 60}m`}
                    </td>
                    <td className="px-4 py-4 text-sm font-mono text-amber-400">
                      ${item.financialImpactPerHour.toLocaleString()}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1.5">
                        <div className={`w-2 h-2 rounded-full ${item.currentStatus === "operational" ? "bg-emerald-500" : item.currentStatus === "degraded" ? "bg-amber-500" : "bg-rose-500"}`} />
                        <span className="text-xs font-mono text-muted-foreground capitalize">{item.currentStatus}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-xs font-mono text-muted-foreground max-w-[200px] truncate">{item.dependencies}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function TestingTab() {
  const { data: testResults, isLoading: isTestsLoading } = useListDrTestResults();
  const { data: procedures } = useListDrProcedures();

  if (isTestsLoading) return <CyberLoading text="Loading test results..." />;

  const procMap = new Map((procedures?.procedures ?? []).map((p) => [p.id, p.title]));

  return (
    <div className="space-y-4">
      <div className="glass-panel p-4 rounded-xl">
        <p className="text-sm text-muted-foreground">
          Track disaster recovery test results, identify gaps in your procedures, and monitor remediation progress. Regular testing ensures your team is prepared when a real disaster strikes.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        {[
          { label: "Total Tests", value: testResults?.total ?? 0, icon: Activity, color: "text-primary" },
          { label: "Passed", value: testResults?.results.filter((r) => r.outcome === "pass").length ?? 0, icon: CheckCircle2, color: "text-emerald-400" },
          { label: "Gaps Found", value: testResults?.results.filter((r) => r.gapsFound).length ?? 0, icon: AlertTriangle, color: "text-amber-400" },
        ].map((stat) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-panel p-5 rounded-2xl">
            <div className="flex items-center gap-2 mb-2">
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
              <span className="text-[10px] font-display uppercase tracking-widest text-muted-foreground">{stat.label}</span>
            </div>
            <span className="text-2xl font-mono font-bold text-white">{stat.value}</span>
          </motion.div>
        ))}
      </div>

      <div className="space-y-3">
        {(testResults?.results ?? []).map((result) => {
          const outcomeStyle = OUTCOME_STYLES[result.outcome] ?? OUTCOME_STYLES.partial;
          return (
            <motion.div key={result.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-panel p-5 rounded-2xl">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="text-white font-display uppercase tracking-wider">{procMap.get(result.procedureId) ?? `Procedure #${result.procedureId}`}</h4>
                  <span className="text-xs font-mono text-muted-foreground">{format(new Date(result.testDate), "PPP")} — {result.conductedBy}</span>
                </div>
                <div className="flex items-center gap-3">
                  {result.actualRecoveryMinutes && (
                    <span className="text-xs font-mono text-zinc-300">{result.actualRecoveryMinutes} min actual</span>
                  )}
                  <span className={`text-[10px] font-mono uppercase px-2 py-1 rounded border ${outcomeStyle.bg} ${outcomeStyle.text}`}>
                    {outcomeStyle.label}
                  </span>
                </div>
              </div>
              {result.notes && (
                <p className="text-sm text-muted-foreground mb-2">{result.notes}</p>
              )}
              {result.gapsFound && (
                <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 mt-2">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle className="w-3 h-3 text-amber-400" />
                    <span className="text-[10px] font-mono text-amber-400 uppercase tracking-widest">Gaps Identified</span>
                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ml-auto ${
                      result.remediationStatus === "resolved" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30" :
                      result.remediationStatus === "in_progress" ? "bg-amber-500/10 text-amber-400 border border-amber-500/30" :
                      "bg-rose-500/10 text-rose-400 border border-rose-500/30"
                    }`}>
                      {result.remediationStatus}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{result.gapsFound}</p>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function ComplianceTab() {
  const { data, isLoading, isError } = useListDrCompliance();
  const updateMutation = useUpdateDrComplianceStatus();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [expandedFramework, setExpandedFramework] = useState<string | null>(null);

  if (isLoading) return <CyberLoading text="Loading compliance data..." />;
  if (isError || !data) return <CyberError title="Error" message="Could not load compliance data." />;

  const handleStatusChange = (id: number, status: string) => {
    updateMutation.mutate(
      { id, data: { status: status as "not_started" | "in_progress" | "compliant" | "non_compliant" } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListDrComplianceQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetDrDashboardQueryKey() });
          toast({ description: "Compliance status updated." });
        },
      },
    );
  };

  const frameworks = data.byFramework;
  const grouped = new Map<string, typeof data.items>();
  for (const item of data.items) {
    const list = grouped.get(item.framework) ?? [];
    list.push(item);
    grouped.set(item.framework, list);
  }

  const STATUS_COLORS: Record<string, string> = {
    compliant: "text-emerald-400",
    in_progress: "text-amber-400",
    not_started: "text-zinc-500",
    non_compliant: "text-rose-400",
  };

  return (
    <div className="space-y-4">
      <div className="glass-panel p-4 rounded-xl">
        <p className="text-sm text-muted-foreground">
          Track your disaster recovery compliance against enterprise standards. Each framework has specific controls that must be met. Update the status of each control as you implement and verify compliance.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        {frameworks.map((fw) => (
          <motion.div key={fw.framework} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-panel p-5 rounded-2xl">
            <h4 className="font-display text-xs uppercase tracking-widest text-primary mb-3">{fw.framework}</h4>
            <div className="flex items-end justify-between">
              <span className="text-2xl font-mono font-bold text-white">{fw.percentage}%</span>
              <span className="text-xs font-mono text-muted-foreground">{fw.compliant}/{fw.total} controls</span>
            </div>
            <div className="mt-2 w-full h-2 bg-black/40 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${fw.percentage}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
                className={`h-full rounded-full ${fw.percentage === 100 ? "bg-emerald-500" : fw.percentage >= 70 ? "bg-primary" : "bg-amber-500"}`}
              />
            </div>
          </motion.div>
        ))}
      </div>

      {Array.from(grouped.entries()).map(([framework, items]) => (
        <motion.div key={framework} layout className="glass-panel rounded-2xl overflow-hidden">
          <button
            onClick={() => setExpandedFramework(expandedFramework === framework ? null : framework)}
            className="w-full p-5 flex items-center justify-between hover:bg-white/[0.02] transition-colors"
          >
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-primary" />
              <span className="font-display text-white uppercase tracking-wider">{framework}</span>
              <span className="text-xs font-mono text-muted-foreground">{items.length} controls</span>
            </div>
            {expandedFramework === framework ? <ChevronDown className="w-5 h-5 text-muted-foreground" /> : <ChevronRight className="w-5 h-5 text-muted-foreground" />}
          </button>
          <AnimatePresence>
            {expandedFramework === framework && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="px-5 pb-5 border-t border-white/5 pt-3 space-y-2">
                  {items.map((item) => (
                    <div key={item.id} className="p-4 rounded-xl bg-black/20 border border-white/5 hover:border-white/10 transition-colors">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-mono text-primary">{item.controlId}</span>
                            <h5 className="text-sm text-white font-medium">{item.controlTitle}</h5>
                          </div>
                          <p className="text-xs text-muted-foreground">{item.description}</p>
                          {item.evidence && (
                            <p className="text-xs text-zinc-400 mt-1 italic">{item.evidence}</p>
                          )}
                          {item.assignedTo && (
                            <span className="text-[10px] font-mono text-primary/60 mt-1 block">Assigned: {item.assignedTo}</span>
                          )}
                        </div>
                        <select
                          value={item.status}
                          onChange={(e) => handleStatusChange(item.id, e.target.value)}
                          className={`bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-xs font-mono ${STATUS_COLORS[item.status] ?? "text-zinc-400"} focus:outline-none focus:border-primary/50 cursor-pointer shrink-0`}
                        >
                          <option value="not_started">Not Started</option>
                          <option value="in_progress">In Progress</option>
                          <option value="compliant">Compliant</option>
                          <option value="non_compliant">Non-Compliant</option>
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      ))}
    </div>
  );
}

function CommunicationTab() {
  const { data, isLoading, isError } = useListDrCommunicationPlan();

  if (isLoading) return <CyberLoading text="Loading communication plan..." />;
  if (isError || !data) return <CyberError title="Error" message="Could not load communication plan." />;

  const grouped = new Map<string, typeof data.entries>();
  for (const entry of data.entries) {
    const list = grouped.get(entry.scenario) ?? [];
    list.push(entry);
    grouped.set(entry.scenario, list);
  }

  for (const [, entries] of grouped) {
    entries.sort((a, b) => a.escalationLevel - b.escalationLevel);
  }

  return (
    <div className="space-y-4">
      <div className="glass-panel p-4 rounded-xl">
        <p className="text-sm text-muted-foreground">
          Escalation procedures and contact lists for each disaster scenario. Each scenario has tiered escalation levels with specific contacts and notification templates ready for immediate use.
        </p>
      </div>

      {Array.from(grouped.entries()).map(([scenario, entries]) => (
        <motion.div key={scenario} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-panel rounded-2xl overflow-hidden">
          <div className="p-5 border-b border-white/5">
            <h3 className="font-display text-white text-lg uppercase tracking-wider flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              {scenario}
            </h3>
          </div>
          <div className="p-5 space-y-3">
            {entries.map((entry) => (
              <div key={entry.id} className="p-4 rounded-xl bg-black/20 border border-white/5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-mono font-bold shrink-0 ${
                      entry.escalationLevel === 1 ? "bg-amber-500/20 text-amber-400" :
                      entry.escalationLevel === 2 ? "bg-rose-500/20 text-rose-400" :
                      "bg-red-900/30 text-red-400"
                    }`}>
                      L{entry.escalationLevel}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm text-white font-medium">{entry.contactName}</h4>
                        <span className="text-[10px] font-mono text-primary/70">{entry.contactRole}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="w-3 h-3" /> {entry.contactEmail}</span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="w-3 h-3" /> {entry.contactPhone}</span>
                      </div>
                      <div className="mt-2 p-2 rounded bg-black/30 border border-white/5">
                        <p className="text-xs text-zinc-400 italic">{entry.notificationTemplate}</p>
                      </div>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className="text-[10px] font-mono text-muted-foreground block">Response</span>
                    <span className="text-sm font-mono text-white">{entry.responseTimeMinutes} min</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      ))}
    </div>
  );
}

export default function DisasterRecovery() {
  const [activeTab, setActiveTab] = useState<TabKey>("dashboard");

  return (
    <div className="pb-12">
      <PageHeader
        title="Disaster Recovery"
        description="Enterprise disaster recovery planning, procedures, and compliance tracking."
      />

      <div className="mb-6 flex items-center gap-4 glass-panel p-2 rounded-xl inline-flex flex-wrap">
        <div className="pl-4 pr-2 flex items-center text-muted-foreground border-r border-white/10 shrink-0">
          <Gauge className="w-4 h-4 mr-2" />
          <span className="text-xs font-display uppercase tracking-widest">Section</span>
        </div>
        <div className="flex gap-1 flex-wrap">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-2 rounded-lg text-xs font-mono transition-colors ${activeTab === tab.key ? "bg-white/10 text-white" : "text-muted-foreground hover:text-white"}`}
            >
              {tab.label.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "dashboard" && <DashboardTab />}
      {activeTab === "procedures" && <ProceduresTab />}
      {activeTab === "impact" && <BusinessImpactTab />}
      {activeTab === "testing" && <TestingTab />}
      {activeTab === "compliance" && <ComplianceTab />}
      {activeTab === "communication" && <CommunicationTab />}
    </div>
  );
}
