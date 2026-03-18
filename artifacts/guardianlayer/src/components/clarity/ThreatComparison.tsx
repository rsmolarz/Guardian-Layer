import { motion } from "framer-motion";
import { TrendingDown, TrendingUp, Minus } from "lucide-react";

interface ThreatComparisonProps {
  currentCount: number;
  previousCount: number;
  periodLabel?: string;
}

export function ThreatComparison({ currentCount, previousCount, periodLabel = "last week" }: ThreatComparisonProps) {
  const diff = currentCount - previousCount;
  const percentChange = previousCount > 0 ? Math.abs(Math.round((diff / previousCount) * 100)) : 0;
  const isImproved = diff < 0;
  const isWorse = diff > 0;

  let message: string;
  let color: string;
  let Icon = Minus;

  if (isImproved) {
    message = `${periodLabel} we had ${previousCount} threats, this week we have ${currentCount} — that's a ${percentChange}% improvement.`;
    color = "text-emerald-400";
    Icon = TrendingDown;
  } else if (isWorse) {
    message = `${periodLabel} we had ${previousCount} threats, this week we have ${currentCount} — that's a ${percentChange}% increase. Extra vigilance recommended.`;
    color = "text-rose-400";
    Icon = TrendingUp;
  } else {
    message = `Threat levels are holding steady compared to ${periodLabel} — ${currentCount} threats both periods.`;
    color = "text-blue-400";
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-panel p-4 rounded-xl flex items-center gap-4"
    >
      <div className={`p-2.5 rounded-xl ${isImproved ? "bg-emerald-500/10" : isWorse ? "bg-rose-500/10" : "bg-blue-500/10"}`}>
        <Icon className={`w-5 h-5 ${color}`} />
      </div>
      <div className="flex-1">
        <span className="text-[10px] font-display uppercase tracking-widest text-muted-foreground block mb-0.5">Threat Trend</span>
        <p className="text-sm text-gray-300">{message}</p>
      </div>
      <span className={`text-2xl font-mono font-bold ${color}`}>
        {isImproved ? "↓" : isWorse ? "↑" : "–"}{percentChange}%
      </span>
    </motion.div>
  );
}
