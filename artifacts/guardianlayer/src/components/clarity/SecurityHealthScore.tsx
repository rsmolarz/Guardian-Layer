import { motion } from "framer-motion";
import { ShieldCheck, ShieldAlert, ShieldX } from "lucide-react";

interface SecurityHealthScoreProps {
  grade: "A" | "B" | "C" | "D" | "F";
  summary: string;
  issuesCount: number;
}

const GRADE_STYLES: Record<string, { color: string; bg: string; icon: typeof ShieldCheck }> = {
  A: { color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20", icon: ShieldCheck },
  B: { color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20", icon: ShieldCheck },
  C: { color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20", icon: ShieldAlert },
  D: { color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/20", icon: ShieldAlert },
  F: { color: "text-rose-400", bg: "bg-rose-500/10 border-rose-500/20", icon: ShieldX },
};

export function SecurityHealthScore({ grade, summary, issuesCount }: SecurityHealthScoreProps) {
  const style = GRADE_STYLES[grade] || GRADE_STYLES.C;
  const Icon = style.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`glass-panel p-6 rounded-2xl border ${style.bg} relative overflow-hidden`}
    >
      <div className="flex items-center gap-6">
        <div className="relative">
          <div className={`w-20 h-20 rounded-2xl flex items-center justify-center ${style.bg} border`}>
            <span className={`text-4xl font-display font-bold ${style.color}`}>{grade}</span>
          </div>
          <Icon className={`absolute -bottom-1 -right-1 w-6 h-6 ${style.color}`} />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-display uppercase tracking-widest text-muted-foreground mb-1">Security Health Score</h3>
          <p className="text-base text-white leading-relaxed">{summary}</p>
          {issuesCount > 0 && (
            <p className="text-xs text-muted-foreground mt-2">
              {issuesCount} {issuesCount === 1 ? "issue needs" : "issues need"} your attention
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export function calculateHealthGrade(stats: {
  totalBlocked: number;
  totalHeld: number;
  averageRiskScore: number;
  protectionIssuesTotal?: number;
  protectionIssuesFixed?: number;
}): { grade: "A" | "B" | "C" | "D" | "F"; summary: string; issuesCount: number } {
  const avgRisk = stats.averageRiskScore;
  const apiIssues = stats.totalBlocked + stats.totalHeld;
  const protectionTotal = stats.protectionIssuesTotal ?? 0;
  const protectionFixed = stats.protectionIssuesFixed ?? 0;
  const protectionRemaining = Math.max(0, protectionTotal - protectionFixed);
  const issuesCount = apiIssues + protectionRemaining;

  const riskReduction = protectionTotal > 0 ? (protectionFixed / protectionTotal) * 0.15 : 0;
  const effectiveRisk = Math.max(0, avgRisk - riskReduction);

  if (effectiveRisk < 0.2 && issuesCount === 0) {
    return { grade: "A", summary: "Your organization is well-protected. No immediate threats detected.", issuesCount: 0 };
  } else if (effectiveRisk < 0.3 && issuesCount <= 2) {
    return { grade: "B", summary: `Your security is strong, but ${issuesCount} minor ${issuesCount === 1 ? "issue needs" : "issues need"} attention.`, issuesCount };
  } else if (effectiveRisk < 0.5) {
    return { grade: "C", summary: `Your organization is mostly safe, but ${issuesCount} ${issuesCount === 1 ? "issue needs" : "issues need"} attention.`, issuesCount };
  } else if (effectiveRisk < 0.7) {
    return { grade: "D", summary: `Several security concerns need prompt attention. ${issuesCount} active ${issuesCount === 1 ? "issue" : "issues"} detected.`, issuesCount };
  } else {
    return { grade: "F", summary: `Critical security issues require immediate action. ${issuesCount} ${issuesCount === 1 ? "threat" : "threats"} detected.`, issuesCount };
  }
}
