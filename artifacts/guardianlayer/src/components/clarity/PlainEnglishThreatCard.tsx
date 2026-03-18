import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  MapPin,
  AlertTriangle,
  DollarSign,
  Wrench,
  Shield,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Eye,
  Lightbulb,
} from "lucide-react";

export interface ThreatBreakdown {
  whatWeFound: string;
  howWeFoundIt: string;
  whereTheThreatIs: string;
  whatThisMeans: string;
  potentialImpact: string;
  whatCanBeDone: string;
  howItsBeingHandled: string;
  recoverySteps: string;
}

interface PlainEnglishThreatCardProps {
  breakdown: ThreatBreakdown;
  severity?: "act-now" | "needs-attention" | "monitor" | "all-clear";
}

const SECTIONS = [
  { key: "whatWeFound" as const, label: "What We Found", icon: Search, color: "text-rose-400" },
  { key: "howWeFoundIt" as const, label: "How We Found It", icon: Eye, color: "text-blue-400" },
  { key: "whereTheThreatIs" as const, label: "Where The Threat Is", icon: MapPin, color: "text-amber-400" },
  { key: "whatThisMeans" as const, label: "What This Means", icon: AlertTriangle, color: "text-orange-400" },
  { key: "potentialImpact" as const, label: "Potential Impact", icon: DollarSign, color: "text-red-400" },
  { key: "whatCanBeDone" as const, label: "What Can Be Done", icon: Lightbulb, color: "text-emerald-400" },
  { key: "howItsBeingHandled" as const, label: "How It's Being Handled", icon: Shield, color: "text-primary" },
  { key: "recoverySteps" as const, label: "Recovery Steps", icon: RefreshCw, color: "text-violet-400" },
];

const URGENCY_STYLES = {
  "act-now": { bg: "bg-rose-500/10 border-rose-500/30", label: "Act Now", labelColor: "text-rose-400 bg-rose-500/20" },
  "needs-attention": { bg: "bg-amber-500/10 border-amber-500/30", label: "Needs Attention", labelColor: "text-amber-400 bg-amber-500/20" },
  "monitor": { bg: "bg-blue-500/10 border-blue-500/30", label: "Monitor", labelColor: "text-blue-400 bg-blue-500/20" },
  "all-clear": { bg: "bg-emerald-500/10 border-emerald-500/30", label: "All Clear", labelColor: "text-emerald-400 bg-emerald-500/20" },
};

export function PlainEnglishThreatCard({ breakdown, severity = "needs-attention" }: PlainEnglishThreatCardProps) {
  const [expanded, setExpanded] = useState(false);
  const style = URGENCY_STYLES[severity];

  return (
    <div className={`rounded-xl border ${style.bg} overflow-hidden`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-center justify-between text-left hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-3">
          <Wrench className="w-4 h-4 text-primary" />
          <span className="text-sm font-display uppercase tracking-wider text-white">Plain English Breakdown</span>
          <span className={`text-[10px] font-display uppercase tracking-wider px-2 py-0.5 rounded ${style.labelColor}`}>
            {style.label}
          </span>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              {SECTIONS.map(({ key, label, icon: Icon, color }) => (
                <div key={key} className="p-3 rounded-lg bg-black/20 border border-white/5">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Icon className={`w-3.5 h-3.5 ${color}`} />
                    <span className="text-[10px] font-display uppercase tracking-widest text-muted-foreground">{label}</span>
                  </div>
                  <p className="text-sm text-gray-300 leading-relaxed">{breakdown[key]}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function getUrgencyFromSeverity(severity: string): "act-now" | "needs-attention" | "monitor" | "all-clear" {
  switch (severity?.toLowerCase()) {
    case "critical": return "act-now";
    case "high": return "needs-attention";
    case "medium": return "monitor";
    case "low": return "all-clear";
    default: return "monitor";
  }
}
