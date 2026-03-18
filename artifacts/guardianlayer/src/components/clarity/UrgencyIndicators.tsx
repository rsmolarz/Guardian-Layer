import { AlertOctagon, AlertTriangle, Eye, CheckCircle2 } from "lucide-react";

const URGENCY_MAP: Record<string, { label: string; icon: typeof AlertOctagon; color: string; bg: string; explanation: string }> = {
  critical: {
    label: "Act Now",
    icon: AlertOctagon,
    color: "text-rose-400",
    bg: "bg-rose-500/20 border-rose-500/30",
    explanation: "This requires immediate action to prevent damage.",
  },
  high: {
    label: "Needs Attention",
    icon: AlertTriangle,
    color: "text-amber-400",
    bg: "bg-amber-500/20 border-amber-500/30",
    explanation: "This should be addressed soon to reduce risk.",
  },
  medium: {
    label: "Monitor",
    icon: Eye,
    color: "text-blue-400",
    bg: "bg-blue-500/20 border-blue-500/30",
    explanation: "Keep an eye on this — no immediate action needed.",
  },
  low: {
    label: "All Clear",
    icon: CheckCircle2,
    color: "text-emerald-400",
    bg: "bg-emerald-500/20 border-emerald-500/30",
    explanation: "This is under control. No action needed.",
  },
};

export function UrgencyBadge({ severity, showExplanation = false }: { severity: string; showExplanation?: boolean }) {
  const urgency = URGENCY_MAP[severity?.toLowerCase()] || URGENCY_MAP.medium;
  const Icon = urgency.icon;

  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border ${urgency.bg}`}>
      <Icon className={`w-3.5 h-3.5 ${urgency.color}`} />
      <span className={`text-[10px] font-display uppercase tracking-widest ${urgency.color}`}>{urgency.label}</span>
      {showExplanation && (
        <span className="text-[10px] text-muted-foreground ml-1">— {urgency.explanation}</span>
      )}
    </div>
  );
}

export function getUrgencyLabel(severity: string): string {
  return URGENCY_MAP[severity?.toLowerCase()]?.label || "Monitor";
}

export { URGENCY_MAP };
