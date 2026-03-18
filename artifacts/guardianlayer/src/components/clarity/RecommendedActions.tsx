import { motion } from "framer-motion";
import { Lightbulb, ArrowRight, CheckCircle2 } from "lucide-react";
import { useState } from "react";

interface ActionItem {
  id: string;
  title: string;
  description: string;
  priority: "urgent" | "important" | "suggested";
}

interface RecommendedActionsProps {
  actions: ActionItem[];
}

const PRIORITY_STYLES = {
  urgent: { bg: "bg-rose-500/10 border-rose-500/30 hover:bg-rose-500/15", text: "text-rose-400", label: "Urgent" },
  important: { bg: "bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/15", text: "text-amber-400", label: "Important" },
  suggested: { bg: "bg-blue-500/10 border-blue-500/30 hover:bg-blue-500/15", text: "text-blue-400", label: "Suggested" },
};

export function RecommendedActions({ actions }: RecommendedActionsProps) {
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());

  const toggleComplete = (id: string) => {
    setCompletedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (actions.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="glass-panel p-6 rounded-2xl"
    >
      <h3 className="text-sm font-display uppercase tracking-widest text-primary mb-4 flex items-center gap-2">
        <Lightbulb className="w-4 h-4" />
        Recommended Actions — Most Important First
      </h3>
      <div className="space-y-2">
        {actions.map((action, i) => {
          const isCompleted = completedIds.has(action.id);
          const style = PRIORITY_STYLES[action.priority];
          return (
            <motion.div
              key={action.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 + i * 0.05 }}
              className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                isCompleted ? "bg-emerald-500/5 border-emerald-500/20 opacity-60" : style.bg
              }`}
            >
              <span className={`text-xs font-mono ${isCompleted ? "text-emerald-400" : style.text} shrink-0 w-6 text-center`}>
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className={`text-sm ${isCompleted ? "text-muted-foreground line-through" : "text-white"}`}>
                  {action.description}
                </p>
              </div>
              <span className={`text-[9px] font-display uppercase tracking-wider px-2 py-0.5 rounded ${
                isCompleted ? "text-emerald-400 bg-emerald-500/20" : style.text + " bg-white/5"
              } shrink-0`}>
                {isCompleted ? "Done" : style.label}
              </span>
              <button
                onClick={() => toggleComplete(action.id)}
                className={`shrink-0 p-1.5 rounded-lg transition-colors ${
                  isCompleted
                    ? "text-emerald-400 bg-emerald-500/20"
                    : "text-muted-foreground hover:text-white hover:bg-white/10"
                }`}
              >
                {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
              </button>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}

export function generateRecommendedActions(): ActionItem[] {
  return [
    { id: "1", title: "Update HR workstation", description: "Update the HR department workstation (WS-HR-004) — it has 8 known security gaps that need patching.", priority: "urgent" },
    { id: "2", title: "Review held transfers", description: "Review the 3 flagged money transfers that are waiting for manual approval.", priority: "urgent" },
    { id: "3", title: "Renew cyber insurance", description: "Your cyber liability insurance expires in 15 days — renew it before coverage lapses.", priority: "important" },
    { id: "4", title: "Enable encryption", description: "Turn on disk encryption for 2 devices that currently store data unprotected.", priority: "important" },
    { id: "5", title: "Review dark web findings", description: "Check the latest dark web scan results — new credential exposures were found.", priority: "suggested" },
  ];
}
