import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield, Lock, CheckCircle, Circle, AlertTriangle, ExternalLink,
  ChevronDown, ChevronUp, CreditCard, Building2, FileCheck, Eye,
  RefreshCw, ShieldCheck, Info, Snowflake,
} from "lucide-react";
import { API_BASE } from "@/lib/constants";

interface ChecklistItem {
  id: string;
  category: string;
  title: string;
  description: string;
  priority: "critical" | "high" | "medium" | "low";
  phase: "immediate" | "ongoing" | "recovery";
  actionUrl?: string;
  actionLabel?: string;
}

interface Phase {
  label: string;
  items: ChecklistItem[];
}

interface Resource {
  title: string;
  content: string;
}

const priorityColors: Record<string, string> = {
  critical: "text-red-400 bg-red-500/15 border-red-500/30",
  high: "text-orange-400 bg-orange-500/15 border-orange-500/30",
  medium: "text-yellow-400 bg-yellow-500/15 border-yellow-500/30",
  low: "text-cyan-400 bg-cyan-500/15 border-cyan-500/30",
};

const phaseConfig: Record<string, { icon: typeof Shield; color: string; bgColor: string }> = {
  immediate: { icon: Snowflake, color: "text-cyan-400", bgColor: "border-cyan-500/30" },
  ongoing: { icon: Eye, color: "text-violet-400", bgColor: "border-violet-500/30" },
  recovery: { icon: ShieldCheck, color: "text-rose-400", bgColor: "border-rose-500/30" },
};

const STORAGE_KEY = "gl_credit_protection";

function PhaseSection({
  phaseKey,
  phase,
  checked,
  onToggle,
}: {
  phaseKey: string;
  phase: Phase;
  checked: Record<string, boolean>;
  onToggle: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const completedCount = phase.items.filter(i => checked[i.id]).length;
  const config = phaseConfig[phaseKey] || phaseConfig.immediate;
  const Icon = config.icon;

  return (
    <div className={`border ${config.bgColor} rounded-xl bg-slate-800/30 overflow-hidden`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-slate-700/20 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Icon className={`w-5 h-5 ${config.color}`} />
          <span className="font-display text-sm font-semibold text-slate-200 uppercase tracking-wider">
            {phase.label}
          </span>
          <span className="text-[10px] text-muted-foreground bg-white/5 px-2 py-0.5 rounded-full">
            {completedCount}/{phase.items.length} done
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-24 h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className={`h-full ${completedCount === phase.items.length ? "bg-emerald-400" : "bg-cyan-400"} transition-all duration-500`}
              style={{ width: `${(completedCount / phase.items.length) * 100}%` }}
            />
          </div>
          {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 pt-0 space-y-2">
              {phase.items.map((item) => (
                <ChecklistRow
                  key={item.id}
                  item={item}
                  isChecked={!!checked[item.id]}
                  onToggle={() => onToggle(item.id)}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ChecklistRow({
  item,
  isChecked,
  onToggle,
}: {
  item: ChecklistItem;
  isChecked: boolean;
  onToggle: () => void;
}) {
  const [showDetail, setShowDetail] = useState(false);

  return (
    <div className={`rounded-lg border transition-all ${isChecked ? "border-emerald-500/20 bg-emerald-500/5" : "border-white/5 bg-white/[0.02] hover:bg-white/[0.04]"}`}>
      <div className="flex items-start gap-3 p-3">
        <button onClick={onToggle} className="mt-0.5 shrink-0">
          {isChecked ? (
            <CheckCircle className="w-5 h-5 text-emerald-400" />
          ) : (
            <Circle className="w-5 h-5 text-muted-foreground hover:text-cyan-400 transition-colors" />
          )}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-sm font-medium ${isChecked ? "text-emerald-400 line-through opacity-70" : "text-white"}`}>
              {item.title}
            </span>
            <span className={`px-1.5 py-0.5 rounded text-[9px] font-display uppercase tracking-wider border ${priorityColors[item.priority]}`}>
              {item.priority}
            </span>
            <span className="text-[9px] text-muted-foreground bg-white/5 px-1.5 py-0.5 rounded">
              {item.category}
            </span>
          </div>

          <AnimatePresence>
            {showDetail && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                  {item.description}
                </p>
                {item.actionUrl && (
                  <a
                    href={item.actionUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 mt-2 px-3 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-[11px] font-display uppercase tracking-wider hover:bg-cyan-500/20 transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" />
                    {item.actionLabel}
                  </a>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <button
          onClick={() => setShowDetail(!showDetail)}
          className="p-1 rounded hover:bg-white/10 transition-colors text-muted-foreground hover:text-white shrink-0"
        >
          <Info className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export default function CreditProtection() {
  const [phases, setPhases] = useState<Record<string, Phase>>({});
  const [resources, setResources] = useState<Resource[]>([]);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [showResources, setShowResources] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try { setChecked(JSON.parse(saved)); } catch {}
    }

    Promise.all([
      fetch(`${API_BASE}/api/credit-protection/checklist`).then(r => r.json()),
      fetch(`${API_BASE}/api/credit-protection/resources`).then(r => r.json()),
    ])
      .then(([checklistData, resourceData]) => {
        setPhases(checklistData.phases);
        setResources(resourceData.resources);
      })
      .catch(err => console.error("Failed to load credit protection data:", err))
      .finally(() => setLoading(false));
  }, []);

  const toggleItem = (id: string) => {
    setChecked(prev => {
      const next = { ...prev, [id]: !prev[id] };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const allItems = Object.values(phases).flatMap(p => p.items);
  const totalItems = allItems.length;
  const completedItems = allItems.filter(i => checked[i.id]).length;
  const criticalItems = allItems.filter(i => i.priority === "critical");
  const criticalDone = criticalItems.filter(i => checked[i.id]).length;
  const score = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  const getGrade = () => {
    if (score >= 90) return { letter: "A", color: "text-emerald-400", bg: "bg-emerald-500/20 border-emerald-500/30" };
    if (score >= 75) return { letter: "B", color: "text-cyan-400", bg: "bg-cyan-500/20 border-cyan-500/30" };
    if (score >= 50) return { letter: "C", color: "text-amber-400", bg: "bg-amber-500/20 border-amber-500/30" };
    if (score >= 25) return { letter: "D", color: "text-orange-400", bg: "bg-orange-500/20 border-orange-500/30" };
    return { letter: "F", color: "text-rose-400", bg: "bg-rose-500/20 border-rose-500/30" };
  };

  const grade = getGrade();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-cyan-400 mx-auto" />
          <p className="text-muted-foreground text-sm mt-2">Loading credit protection checklist...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold text-white tracking-tight">
          Credit Protection
        </h1>
        <p className="text-muted-foreground mt-1">
          Protect your credit, freeze your files, and monitor for identity theft.
        </p>
        <div className="h-0.5 bg-gradient-to-r from-cyan-500 via-violet-500 to-transparent mt-3 w-48" />
      </div>

      <div className="glass-panel rounded-xl p-5 border border-white/10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-cyan-400" />
            <span className="font-display text-sm text-white uppercase tracking-wider">Why This Matters</span>
          </div>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Identity theft affected 1.4 million Americans in 2023 alone. A credit freeze is the most effective 
          single action you can take — it's free, takes minutes, and prevents anyone from opening new accounts 
          in your name. This checklist walks you through every layer of protection, from freezing your credit 
          at all bureaus to securing your tax identity and monitoring for unauthorized activity.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`glass-panel p-4 rounded-xl text-center border ${grade.bg}`}>
          <p className={`text-3xl font-display ${grade.color}`}>{grade.letter}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">Protection Grade</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="glass-panel p-4 rounded-xl text-center">
          <p className="text-2xl font-display text-white">{completedItems}<span className="text-sm text-muted-foreground">/{totalItems}</span></p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">Steps Complete</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className={`glass-panel p-4 rounded-xl text-center border ${criticalDone === criticalItems.length ? "border-emerald-500/30" : "border-rose-500/30"}`}>
          <p className={`text-2xl font-display ${criticalDone === criticalItems.length ? "text-emerald-400" : "text-rose-400"}`}>{criticalDone}<span className="text-sm text-muted-foreground">/{criticalItems.length}</span></p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">Critical Done</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glass-panel p-4 rounded-xl text-center">
          <div className="relative w-12 h-12 mx-auto">
            <svg viewBox="0 0 36 36" className="w-12 h-12 -rotate-90">
              <circle cx="18" cy="18" r="15.91" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3" />
              <circle
                cx="18" cy="18" r="15.91" fill="none"
                stroke={score >= 75 ? "#34d399" : score >= 50 ? "#fbbf24" : "#f87171"}
                strokeWidth="3"
                strokeDasharray={`${score} ${100 - score}`}
                strokeLinecap="round"
                className="transition-all duration-1000"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-xs font-display text-white">{score}%</span>
          </div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">Overall</p>
        </motion.div>
      </div>

      {criticalDone < criticalItems.length && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-start gap-3 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30"
        >
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-rose-400">
              {criticalItems.length - criticalDone} critical step{criticalItems.length - criticalDone !== 1 ? "s" : ""} remaining
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Your credit is not fully protected until all credit freezes are in place and PINs are stored securely.
            </p>
          </div>
        </motion.div>
      )}

      {criticalDone === criticalItems.length && criticalItems.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-start gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30"
        >
          <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-emerald-400">All critical protections in place</p>
            <p className="text-xs text-muted-foreground mt-1">
              Your credit is frozen at all bureaus and your PINs are secured. Continue with the ongoing protection steps for maximum coverage.
            </p>
          </div>
        </motion.div>
      )}

      <div className="space-y-4">
        {Object.entries(phases).map(([key, phase]) => (
          <PhaseSection
            key={key}
            phaseKey={key}
            phase={phase}
            checked={checked}
            onToggle={toggleItem}
          />
        ))}
      </div>

      <div className={`border border-white/10 rounded-xl bg-slate-800/30 overflow-hidden`}>
        <button
          onClick={() => setShowResources(!showResources)}
          className="w-full flex items-center justify-between p-4 hover:bg-slate-700/20 transition-colors"
        >
          <div className="flex items-center gap-3">
            <FileCheck className="w-5 h-5 text-cyan-400" />
            <span className="font-display text-sm font-semibold text-slate-200 uppercase tracking-wider">
              Frequently Asked Questions
            </span>
          </div>
          {showResources ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </button>
        <AnimatePresence>
          {showResources && (
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: "auto" }}
              exit={{ height: 0 }}
              className="overflow-hidden"
            >
              <div className="p-4 pt-0 space-y-2">
                {resources.map((resource, i) => (
                  <div
                    key={i}
                    className="rounded-lg border border-white/5 bg-white/[0.02] overflow-hidden"
                  >
                    <button
                      onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}
                      className="w-full text-left p-3 flex items-center justify-between hover:bg-white/[0.03] transition-colors"
                    >
                      <span className="text-sm font-medium text-white">{resource.title}</span>
                      {expandedFaq === i ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
                    </button>
                    <AnimatePresence>
                      {expandedFaq === i && (
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: "auto" }}
                          exit={{ height: 0 }}
                          className="overflow-hidden"
                        >
                          <p className="px-3 pb-3 text-xs text-muted-foreground leading-relaxed">
                            {resource.content}
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="glass-panel rounded-xl p-4">
        <p className="text-xs text-muted-foreground">
          <span className="text-white font-medium">Credit Protection Score: {score}%</span> — {completedItems} of {totalItems} steps completed.
          {score < 100 && " Complete all steps for maximum identity theft protection."}
          {score === 100 && " Full protection achieved. Review quarterly to maintain coverage."}
        </p>
      </div>
    </div>
  );
}
