import { motion } from "framer-motion";
import { MapPin, CheckCircle2, Circle, Loader2 } from "lucide-react";

interface RoadmapStep {
  title: string;
  status: "completed" | "in-progress" | "upcoming";
  detail?: string;
}

interface RecoveryRoadmapProps {
  steps: RoadmapStep[];
  title?: string;
}

const STEP_STYLES = {
  completed: { icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-500/20", line: "bg-emerald-500" },
  "in-progress": { icon: Loader2, color: "text-amber-400", bg: "bg-amber-500/20", line: "bg-amber-400" },
  upcoming: { icon: Circle, color: "text-muted-foreground/40", bg: "bg-white/5", line: "bg-white/10" },
};

export function RecoveryRoadmap({ steps, title = "Recovery Roadmap" }: RecoveryRoadmapProps) {
  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
      <h4 className="text-[10px] font-display uppercase tracking-widest text-primary mb-4 flex items-center gap-2">
        <MapPin className="w-3.5 h-3.5" />
        {title}
      </h4>
      <div className="flex items-start gap-0 overflow-x-auto pb-2">
        {steps.map((step, i) => {
          const style = STEP_STYLES[step.status];
          const Icon = style.icon;
          const isLast = i === steps.length - 1;

          return (
            <div key={i} className="flex items-start flex-shrink-0">
              <div className="flex flex-col items-center w-28">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: i * 0.1 }}
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${style.bg}`}
                >
                  <Icon className={`w-4 h-4 ${style.color} ${step.status === "in-progress" ? "animate-spin" : ""}`} />
                </motion.div>
                <p className={`text-[10px] font-display uppercase tracking-wider mt-2 text-center ${style.color}`}>
                  {step.title}
                </p>
                {step.detail && (
                  <p className="text-[9px] text-muted-foreground text-center mt-0.5">{step.detail}</p>
                )}
              </div>
              {!isLast && (
                <div className="flex items-center mt-4 -mx-2">
                  <div className={`w-8 h-0.5 ${style.line}`} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
