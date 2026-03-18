import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, ChevronDown, ChevronUp, AlertTriangle, Shield, CheckCircle, Eye } from "lucide-react";

export interface ThreatTimelineEvent {
  time: string;
  title: string;
  description: string;
  status: "detected" | "investigating" | "contained" | "resolved";
}

interface ThreatTimelineProps {
  events: ThreatTimelineEvent[];
  incidentTitle?: string;
}

const STATUS_CONFIG = {
  detected: { icon: AlertTriangle, color: "text-rose-400", bg: "bg-rose-500/20", border: "border-rose-500/30", label: "Detected" },
  investigating: { icon: Eye, color: "text-amber-400", bg: "bg-amber-500/20", border: "border-amber-500/30", label: "Investigating" },
  contained: { icon: Shield, color: "text-blue-400", bg: "bg-blue-500/20", border: "border-blue-500/30", label: "Contained" },
  resolved: { icon: CheckCircle, color: "text-emerald-400", bg: "bg-emerald-500/20", border: "border-emerald-500/30", label: "Resolved" },
};

export function ThreatTimeline({ events, incidentTitle }: ThreatTimelineProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-violet-500/[0.05] transition-colors"
      >
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-violet-400" />
          <span className="text-sm font-display uppercase tracking-wider text-violet-400">
            {incidentTitle ? `Timeline — ${incidentTitle}` : "Incident Timeline"}
          </span>
          <span className="text-[10px] font-mono text-muted-foreground ml-2">{events.length} events</span>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-violet-400/60" /> : <ChevronDown className="w-4 h-4 text-violet-400/60" />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4">
              <div className="relative ml-4 border-l-2 border-white/10 space-y-0">
                {events.map((event, i) => {
                  const config = STATUS_CONFIG[event.status];
                  const Icon = config.icon;
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.08 }}
                      className="relative pl-8 py-3"
                    >
                      <div className={`absolute left-0 top-4 -translate-x-1/2 w-6 h-6 rounded-full flex items-center justify-center ${config.bg} border ${config.border}`}>
                        <Icon className={`w-3 h-3 ${config.color}`} />
                      </div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-mono text-muted-foreground">{event.time}</span>
                        <span className={`text-[10px] font-display uppercase tracking-wider px-1.5 py-0.5 rounded ${config.bg} ${config.color} border ${config.border}`}>
                          {config.label}
                        </span>
                      </div>
                      <h4 className="text-sm font-display text-white mb-0.5">{event.title}</h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">{event.description}</p>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
