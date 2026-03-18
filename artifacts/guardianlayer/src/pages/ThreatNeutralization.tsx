import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListThreats,
  useGetThreatSummary,
  useGetThreatDetail,
  useUpdateThreatStatus,
  useExecuteIsolationAction,
  useCompleteNeutralizationStep,
  getListThreatsQueryKey,
  getGetThreatSummaryQueryKey,
  getGetThreatDetailQueryKey,
  ThreatItemSeverity,
  ThreatItemStatus,
  IsolationActionRequestAction,
} from "@workspace/api-client-react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { clsx } from "clsx";
import {
  Crosshair,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  Clock,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Mail,
  Fingerprint,
  Lock,
  AlertTriangle,
  CheckCircle2,
  Circle,
  Loader2,
  Zap,
  Flag,
  KeyRound,
  Target,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { CyberLoading } from "@/components/ui/CyberLoading";
import { CyberError } from "@/components/ui/CyberError";
import { useToast } from "@/hooks/use-toast";

const STATUS_STYLES: Record<string, { bg: string; text: string; border: string; glow: string }> = {
  detected: { bg: "bg-rose-500/10", text: "text-rose-400", border: "border-rose-500/30", glow: "shadow-[0_0_15px_rgba(244,63,94,0.3)]" },
  isolating: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/30", glow: "shadow-[0_0_15px_rgba(245,158,11,0.3)]" },
  contained: { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/30", glow: "shadow-[0_0_15px_rgba(59,130,246,0.3)]" },
  neutralized: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/30", glow: "shadow-[0_0_15px_rgba(16,185,129,0.3)]" },
};

const SEVERITY_STYLES: Record<string, { bg: string; text: string }> = {
  critical: { bg: "bg-rose-500/20", text: "text-rose-400" },
  high: { bg: "bg-orange-500/20", text: "text-orange-400" },
  medium: { bg: "bg-amber-500/20", text: "text-amber-400" },
};

const THREAT_TYPE_ICONS: Record<string, typeof ShieldAlert> = {
  "SSN Exposure": Fingerprint,
  "Credit Card Compromise": CreditCard,
  "Email Account Breach": Mail,
};

const ISOLATION_ACTIONS = [
  { action: IsolationActionRequestAction.freeze_credit, label: "Freeze Credit", icon: Lock, description: "All 3 bureaus" },
  { action: IsolationActionRequestAction.lock_cards, label: "Lock Cards", icon: CreditCard, description: "All compromised" },
  { action: IsolationActionRequestAction.secure_email, label: "Secure Email", icon: Mail, description: "Reset + 2FA" },
  { action: IsolationActionRequestAction.invalidate_credentials, label: "Invalidate Creds", icon: KeyRound, description: "Force rotation" },
  { action: IsolationActionRequestAction.flag_passport, label: "Flag Passport", icon: Flag, description: "Alert authorities" },
];

const STEP_STATUS_ICONS: Record<string, typeof Circle> = {
  pending: Circle,
  in_progress: Loader2,
  completed: CheckCircle2,
};

export default function ThreatNeutralization() {
  const { data: threats, isLoading: isThreatsLoading, isError: isThreatsError } = useListThreats();
  const { data: summary, isLoading: isSummaryLoading } = useGetThreatSummary();
  const [expandedThreat, setExpandedThreat] = useState<number | null>(null);

  if (isThreatsLoading || isSummaryLoading) return <CyberLoading text="SCANNING THREAT MATRIX..." />;
  if (isThreatsError || !threats) return <CyberError title="THREAT SCAN FAILED" message="Unable to retrieve threat data from the neutralization system." />;

  const summaryCards = [
    { label: "Active Threats", value: summary?.totalActive ?? 0, icon: ShieldX, color: "text-rose-400", glow: "shadow-[0_0_20px_rgba(244,63,94,0.15)]" },
    { label: "Contained", value: summary?.threatsContained ?? 0, icon: ShieldAlert, color: "text-blue-400", glow: "shadow-[0_0_20px_rgba(59,130,246,0.15)]" },
    { label: "Neutralized", value: summary?.threatsNeutralized ?? 0, icon: ShieldCheck, color: "text-emerald-400", glow: "shadow-[0_0_20px_rgba(16,185,129,0.15)]" },
    { label: "Avg Containment", value: `${summary?.avgContainmentMinutes ?? 0}m`, icon: Clock, color: "text-primary", glow: "shadow-[0_0_20px_rgba(6,182,212,0.15)]" },
  ];

  const groupedThreats: Record<string, typeof threats.threats> = {};
  for (const threat of threats.threats) {
    const sev = threat.severity;
    if (!groupedThreats[sev]) groupedThreats[sev] = [];
    groupedThreats[sev].push(threat);
  }

  const severityOrder = ["critical", "high", "medium"];

  return (
    <div className="pb-12">
      <PageHeader
        title="Threat Neutralization"
        description="Active threat containment, isolation actions, and multi-step neutralization workflows."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {summaryCards.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className={clsx("glass-panel p-6 rounded-2xl relative overflow-hidden group hover:border-primary/30 transition-colors", stat.glow)}
          >
            <div className={clsx("absolute top-0 right-0 p-4 opacity-10 group-hover:scale-150 transition-transform duration-700 ease-out", stat.color)}>
              <stat.icon className="w-20 h-20" />
            </div>
            <div className="relative z-10">
              <span className="font-display uppercase text-xs tracking-widest text-muted-foreground mb-4 block">
                {stat.label}
              </span>
              <div className="flex items-end justify-between">
                <span className="text-4xl font-mono font-bold text-foreground drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">
                  {stat.value}
                </span>
                <stat.icon className={clsx("w-6 h-6 drop-shadow-[0_0_8px_currentColor]", stat.color)} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="space-y-8">
        {severityOrder.map((sev) => {
          const group = groupedThreats[sev];
          if (!group || group.length === 0) return null;
          const sevStyle = SEVERITY_STYLES[sev] || SEVERITY_STYLES.medium;

          return (
            <motion.div
              key={sev}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className={clsx("w-3 h-3 rounded-full animate-pulse", sev === "critical" ? "bg-rose-500" : sev === "high" ? "bg-orange-500" : "bg-amber-500")} />
                <h2 className={clsx("font-display text-sm uppercase tracking-widest", sevStyle.text)}>
                  {sev} Severity
                </h2>
                <span className="font-mono text-xs text-muted-foreground">({group.length})</span>
              </div>

              <div className="space-y-4">
                <AnimatePresence>
                  {group.map((threat) => (
                    <ThreatCard
                      key={threat.id}
                      threat={threat}
                      isExpanded={expandedThreat === threat.id}
                      onToggle={() => setExpandedThreat(expandedThreat === threat.id ? null : threat.id)}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function ThreatCard({ threat, isExpanded, onToggle }: {
  threat: { id: number; type: string; severity: string; status: string; affectedAssets: string; detectionSource: string; description: string; detectedAt: string };
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const statusStyle = STATUS_STYLES[threat.status] || STATUS_STYLES.detected;
  const Icon = THREAT_TYPE_ICONS[threat.type] || ShieldAlert;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className={clsx("glass-panel rounded-2xl overflow-hidden border-l-4 transition-all", statusStyle.border, isExpanded && statusStyle.glow)}
    >
      <div
        className="p-5 cursor-pointer hover:bg-white/[0.02] transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-start gap-4">
          <div className={clsx("p-3 rounded-xl", statusStyle.bg)}>
            <Icon className={clsx("w-6 h-6", statusStyle.text)} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap mb-1">
              <h3 className="font-display text-lg text-white">{threat.type}</h3>
              <span className={clsx("px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-widest border", statusStyle.bg, statusStyle.text, statusStyle.border)}>
                {threat.status}
              </span>
              <span className={clsx("px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-widest",
                SEVERITY_STYLES[threat.severity]?.bg, SEVERITY_STYLES[threat.severity]?.text
              )}>
                {threat.severity}
              </span>
            </div>
            <p className="text-sm text-muted-foreground font-sans mt-1 line-clamp-2">{threat.description}</p>
            <div className="flex items-center gap-6 mt-3 font-mono text-xs text-muted-foreground">
              <span>Source: <span className="text-foreground">{threat.detectionSource}</span></span>
              <span>Detected: <span className="text-foreground">{format(new Date(threat.detectedAt), "MMM dd, HH:mm")}</span></span>
            </div>
          </div>
          <button className="p-2 rounded-lg hover:bg-white/5 transition-colors shrink-0">
            {isExpanded ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <ThreatDetailPanel threatId={threat.id} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function ThreatDetailPanel({ threatId }: { threatId: number }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data, isLoading } = useGetThreatDetail(threatId);
  const isolateMutation = useExecuteIsolationAction();
  const completeMutation = useCompleteNeutralizationStep();
  const [executingAction, setExecutingAction] = useState<string | null>(null);

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: getListThreatsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetThreatSummaryQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetThreatDetailQueryKey(threatId) });
  };

  const handleIsolate = (action: string) => {
    setExecutingAction(action);
    isolateMutation.mutate(
      { id: threatId, data: { action: action as any } },
      {
        onSuccess: (result) => {
          toast({ description: result.message });
          invalidateAll();
          setTimeout(() => setExecutingAction(null), 1500);
        },
        onError: () => {
          toast({ description: "Isolation action failed.", variant: "destructive" });
          setExecutingAction(null);
        },
      }
    );
  };

  const handleCompleteStep = (stepId: number) => {
    completeMutation.mutate(
      { threatId, stepId },
      {
        onSuccess: () => {
          toast({ description: "Neutralization step completed." });
          invalidateAll();
        },
        onError: () => {
          toast({ description: "Failed to complete step.", variant: "destructive" });
        },
      }
    );
  };

  if (isLoading || !data) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
        <span className="ml-3 font-mono text-sm text-primary">Loading threat data...</span>
      </div>
    );
  }

  const completedSteps = data.steps.filter(s => s.status === "completed").length;
  const totalSteps = data.steps.length;
  const progressPercent = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

  return (
    <div className="border-t border-white/5 p-5 space-y-6">
      <div className="glass-panel rounded-xl p-4">
        <h4 className="font-display text-xs uppercase tracking-widest text-muted-foreground mb-3">Affected Assets</h4>
        <div className="flex flex-wrap gap-2">
          {data.threat.affectedAssets.split(", ").map((asset, i) => (
            <span key={i} className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 font-mono text-xs text-foreground">
              {asset}
            </span>
          ))}
        </div>
      </div>

      <div>
        <h4 className="font-display text-xs uppercase tracking-widest text-primary mb-4 flex items-center gap-2">
          <Zap className="w-4 h-4" />
          Quick Isolation Actions
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {ISOLATION_ACTIONS.map(({ action, label, icon: ActionIcon, description }) => {
            const isExecuting = executingAction === action;
            return (
              <button
                key={action}
                onClick={() => handleIsolate(action)}
                disabled={isExecuting}
                className={clsx(
                  "flex flex-col items-center gap-2 p-4 rounded-xl border transition-all duration-300 group",
                  isExecuting
                    ? "bg-primary/10 border-primary/30 text-primary"
                    : "bg-white/[0.02] border-white/10 text-muted-foreground hover:bg-primary/5 hover:border-primary/20 hover:text-primary"
                )}
              >
                {isExecuting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <ActionIcon className="w-5 h-5 group-hover:scale-110 transition-transform" />
                )}
                <span className="font-display text-[10px] uppercase tracking-wider text-center">{label}</span>
                <span className="font-mono text-[9px] opacity-60">{description}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-display text-xs uppercase tracking-widest text-primary flex items-center gap-2">
            <Target className="w-4 h-4" />
            Neutralization Workflow
          </h4>
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs text-muted-foreground">{completedSteps}/{totalSteps} steps</span>
            <div className="w-32 h-2 rounded-full bg-white/5 overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-primary to-emerald-400"
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          {data.steps.map((step, idx) => {
            const StepIcon = STEP_STATUS_ICONS[step.status] || Circle;
            const isCompleted = step.status === "completed";
            const isInProgress = step.status === "in_progress";
            return (
              <div
                key={step.id}
                className={clsx(
                  "flex items-center gap-4 p-4 rounded-xl border transition-colors",
                  isCompleted ? "bg-emerald-500/5 border-emerald-500/20" :
                  isInProgress ? "bg-amber-500/5 border-amber-500/20" :
                  "bg-white/[0.01] border-white/5"
                )}
              >
                <div className="flex items-center gap-3 shrink-0">
                  <span className="font-mono text-xs text-muted-foreground w-6 text-right">{idx + 1}.</span>
                  <StepIcon className={clsx(
                    "w-5 h-5",
                    isCompleted ? "text-emerald-400" :
                    isInProgress ? "text-amber-400 animate-spin" :
                    "text-muted-foreground/40"
                  )} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-display text-sm text-foreground">{step.title}</div>
                  <div className="font-mono text-xs text-muted-foreground mt-0.5 truncate">{step.description}</div>
                  {step.completedAt && (
                    <div className="font-mono text-[10px] text-emerald-500/70 mt-1">
                      Completed {format(new Date(step.completedAt), "MMM dd, HH:mm")}
                    </div>
                  )}
                  {isInProgress && step.startedAt && (
                    <div className="font-mono text-[10px] text-amber-400/70 mt-1">
                      Started {format(new Date(step.startedAt), "MMM dd, HH:mm")}
                    </div>
                  )}
                </div>
                {!isCompleted && (
                  <button
                    onClick={() => handleCompleteStep(step.id)}
                    disabled={completeMutation.isPending}
                    className="shrink-0 px-3 py-1.5 rounded-lg border border-white/10 text-[10px] font-display uppercase tracking-widest text-muted-foreground hover:text-emerald-400 hover:border-emerald-500/30 hover:bg-emerald-500/5 transition-all"
                  >
                    Complete
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {data.timeline.length > 0 && (
        <div>
          <h4 className="font-display text-xs uppercase tracking-widest text-primary mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Threat Timeline
          </h4>
          <div className="relative pl-6 space-y-4">
            <div className="absolute left-2 top-2 bottom-2 w-px bg-gradient-to-b from-primary/50 via-white/10 to-transparent" />
            {data.timeline.map((entry, i) => {
              const typeColors: Record<string, string> = {
                detection: "text-rose-400 bg-rose-500/20",
                isolation: "text-amber-400 bg-amber-500/20",
                step_complete: "text-emerald-400 bg-emerald-500/20",
                containment: "text-blue-400 bg-blue-500/20",
                neutralization: "text-emerald-400 bg-emerald-500/20",
              };
              const color = typeColors[entry.type] || "text-primary bg-primary/20";
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="relative flex gap-4"
                >
                  <div className={clsx("w-2 h-2 rounded-full mt-2 shrink-0 -ml-[17px]", color.split(" ")[1])} />
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={clsx("px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider", color)}>
                        {entry.type.replace("_", " ")}
                      </span>
                      <span className="font-mono text-xs text-muted-foreground">
                        {format(new Date(entry.timestamp), "MMM dd, HH:mm:ss")}
                      </span>
                    </div>
                    <div className="font-display text-sm text-foreground mt-1">{entry.action}</div>
                    <div className="font-mono text-xs text-muted-foreground mt-0.5">{entry.detail}</div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
