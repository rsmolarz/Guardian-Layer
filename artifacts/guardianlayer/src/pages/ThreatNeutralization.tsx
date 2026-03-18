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
import { WhyThisMatters } from "@/components/clarity/WhyThisMatters";
import { SimilarPastIncidents, getSimilarIncidents } from "@/components/clarity/SimilarPastIncidents";
import { IncidentResponsePlaybook, getPlaybookForThreatType } from "@/components/clarity/IncidentResponsePlaybook";
import { UrgencyBadge } from "@/components/clarity/UrgencyIndicators";
import { WhatIfScenario } from "@/components/clarity/WhatIfScenario";
import { PlainEnglishThreatCard, getUrgencyFromSeverity } from "@/components/clarity/PlainEnglishThreatCard";
import { ThreatExplainer } from "@/components/clarity/ThreatExplainer";
import { RiskImpactCalculator } from "@/components/clarity/RiskImpactCalculator";
import { SuccessStory } from "@/components/clarity/SuccessStories";
import { ExecutiveSummary } from "@/components/clarity/ExecutiveSummary";
import { AutoJargon } from "@/components/clarity/JargonTranslator";

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

  if (isThreatsLoading || isSummaryLoading) return <CyberLoading text="Loading active threats..." />;
  if (isThreatsError || !threats) return <CyberError title="Couldn't Load Threats" message="We couldn't load active threat data. Please try again." />;

  const summaryCards = [
    { label: "Active Threats", value: summary?.totalActive ?? 0, icon: ShieldX, color: "text-rose-400", glow: "shadow-[0_0_20px_rgba(244,63,94,0.15)]" },
    { label: "Being Contained", value: summary?.threatsContained ?? 0, icon: ShieldAlert, color: "text-blue-400", glow: "shadow-[0_0_20px_rgba(59,130,246,0.15)]" },
    { label: "Fully Stopped", value: summary?.threatsNeutralized ?? 0, icon: ShieldCheck, color: "text-emerald-400", glow: "shadow-[0_0_20px_rgba(16,185,129,0.15)]" },
    { label: "Avg Response Time", value: `${summary?.avgContainmentMinutes ?? 0}m`, icon: Clock, color: "text-primary", glow: "shadow-[0_0_20px_rgba(6,182,212,0.15)]" },
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
        title="Threat Response"
        description="View and manage active security threats — contain them, neutralize them, and track every step of the response."
      />

      <div className="mb-8">
        <ExecutiveSummary
          title="Threat Response"
          sections={[
            { heading: "Current Situation", content: `There are ${summary?.totalActive ?? 0} active threats requiring attention. ${summary?.threatsContained ?? 0} threats are being contained, and ${summary?.threatsNeutralized ?? 0} have been fully stopped.` },
            { heading: "Response Time", content: `The average response time is ${summary?.avgContainmentMinutes ?? 0} minutes. Faster response times mean less potential damage.` },
            { heading: "Recommended Action", content: summary?.totalActive ? "Review the active threats below, starting with 'Act Now' items. Use the Quick Actions to contain threats and follow the step-by-step workflow to resolve them." : "No active threats at this time. Continue monitoring." },
          ]}
        />
      </div>

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
                  {sev === "critical" ? "Act Now" : sev === "high" ? "Needs Attention" : "Monitor"}
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
              <UrgencyBadge severity={threat.severity} />
            </div>
            <p className="text-sm text-muted-foreground font-sans mt-1 line-clamp-2"><AutoJargon text={threat.description} /></p>
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
  const [executingAction, setExecutingAction] = useState<IsolationActionRequestAction | null>(null);

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: getListThreatsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetThreatSummaryQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetThreatDetailQueryKey(threatId) });
  };

  const handleIsolate = (action: IsolationActionRequestAction) => {
    setExecutingAction(action);
    isolateMutation.mutate(
      { id: threatId, data: { action } },
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
          toast({ description: "Couldn't complete this step. Please try again.", variant: "destructive" });
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

      <ThreatExplainer narrative={
        data.threat.type === "SSN Exposure"
          ? "We found a Social Security Number linked to your organization being sold on a dark web marketplace. The seller listed it alongside full names and dates of birth, which makes it especially dangerous because criminals can use this combination to open new bank accounts, apply for credit cards, or even file fake tax returns in the victim's name."
          : data.threat.type === "Credit Card Compromise"
          ? "Three credit cards connected to your organization were found in a database of stolen card numbers. Criminals have already started testing these cards with small purchases. If not stopped quickly, they'll begin making larger fraudulent charges."
          : data.threat.type === "Email Account Breach"
          ? "An email account in your organization appears to have been taken over by an unauthorized user. The attacker can read private conversations, send emails pretending to be the account owner, and use password reset links to access other connected services."
          : "A security threat has been detected that requires attention. Expanding the details below will show you exactly what was found, where the problem is, and what steps are being taken to resolve it."
      } />

      <PlainEnglishThreatCard
        severity={getUrgencyFromSeverity(data.threat.severity)}
        breakdown={{
          whatWeFound: data.threat.description,
          howWeFoundIt: `Detected by ${data.threat.detectionSource} monitoring systems`,
          whereTheThreatIs: data.threat.affectedAssets,
          whatThisMeans: data.threat.type === "SSN Exposure" ? "Someone's personal identity information is exposed and could be used for fraud." : data.threat.type === "Credit Card Compromise" ? "Stolen card data could be used for unauthorized purchases at any time." : "This threat needs immediate attention to prevent potential damage.",
          potentialImpact: data.threat.type === "SSN Exposure" ? "Identity theft, fraudulent accounts, credit damage lasting years." : data.threat.type === "Credit Card Compromise" ? "Unauthorized charges, financial loss, potential cascading fraud." : "Potential data loss, unauthorized access, or financial harm.",
          whatCanBeDone: "Use the Quick Actions above to contain the threat, then follow the step-by-step workflow to fully resolve it.",
          howItsBeingHandled: `Current status: ${data.threat.status}. ${completedSteps}/${totalSteps} response steps completed.`,
          recoverySteps: "After the threat is neutralized, follow the Recovery Center to restore any compromised items.",
        }}
      />

      <RiskImpactCalculator
        financialImpact={data.threat.type === "Credit Card Compromise" ? "Potential unauthorized charges on compromised cards" : data.threat.type === "SSN Exposure" ? "Identity theft can cost victims thousands in recovery" : "Financial impact depends on the scope of the threat"}
        dataExposureScope={data.threat.affectedAssets}
        businessDisruption={data.threat.type === "SSN Exposure" ? "HR and legal teams may need to issue notifications" : data.threat.type === "Credit Card Compromise" ? "Finance team needs to reissue cards and review charges" : "Remediation effort required across affected teams"}
      />

      <WhyThisMatters explanation={
        data.threat.type === "SSN Exposure" 
          ? "A Social Security Number is one of the most valuable pieces of personal data for criminals. If misused, it can lead to identity theft, fraudulent accounts, and long-term financial damage that takes years to resolve."
          : data.threat.type === "Credit Card Compromise"
          ? "Stolen credit card numbers can be used immediately for fraudulent purchases. Quick containment is essential to limit financial losses and prevent cascading fraud."
          : data.threat.type === "Email Account Breach"
          ? "A compromised email account gives attackers access to password reset links for other services, sensitive communications, and can be used to trick your colleagues."
          : "This threat could lead to unauthorized access, data loss, or financial harm if not addressed promptly."
      } />

      <SimilarPastIncidents incidents={getSimilarIncidents(data.threat.type)} />

      <IncidentResponsePlaybook
        threatType={data.threat.type}
        steps={getPlaybookForThreatType(data.threat.type.toLowerCase().includes("email") ? "phishing" : data.threat.type.toLowerCase().includes("malware") ? "malware" : "default")}
      />

      <WhatIfScenario
        scenario={
          data.threat.type === "SSN Exposure"
            ? "If left unresolved, your SSN could be used to open new credit accounts, file fraudulent tax returns, or commit identity fraud — potentially costing thousands and taking months to resolve."
            : data.threat.type === "Credit Card Compromise"
            ? "Unaddressed card compromises can result in unauthorized charges, cascading fraud across linked accounts, and potential liability for fraudulent transactions."
            : "Without action, this threat could expand to affect more systems, compromise additional data, or enable more sophisticated follow-up attacks."
        }
        timeframe={
          data.threat.type === "SSN Exposure" ? "Risk increases daily — act within 24 hours"
            : data.threat.type === "Credit Card Compromise" ? "Fraudulent charges can begin within hours"
            : "Prompt action recommended"
        }
      />

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
