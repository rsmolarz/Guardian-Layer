import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Plane, Shield, Wifi, WifiOff, Smartphone, Lock, Key, HardDrive, Eye,
  CheckCircle, Circle, AlertTriangle, Info, ChevronDown, ChevronUp,
  MapPin, ClipboardCopy, Check,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { WhyThisMatters } from "@/components/clarity/WhyThisMatters";
import { API_BASE } from "@/lib/constants";

interface ChecklistItem {
  id: string;
  category: string;
  title: string;
  description: string;
  priority: "critical" | "high" | "medium" | "low";
  when: "before" | "during" | "after";
}

interface Phase {
  label: string;
  items: ChecklistItem[];
}

interface NetworkTip {
  title: string;
  risk: string;
  detail: string;
  mitigation: string;
}

const priorityColors: Record<string, string> = {
  critical: "text-red-400 bg-red-500/15 border-red-500/30",
  high: "text-orange-400 bg-orange-500/15 border-orange-500/30",
  medium: "text-yellow-400 bg-yellow-500/15 border-yellow-500/30",
  low: "text-cyan-400 bg-cyan-500/15 border-cyan-500/30",
};

const riskColors: Record<string, string> = {
  critical: "bg-red-500/15 border-red-500/40 text-red-400",
  high: "bg-orange-500/15 border-orange-500/40 text-orange-400",
  medium: "bg-yellow-500/15 border-yellow-500/40 text-yellow-400",
  low: "bg-green-500/15 border-green-500/40 text-green-400",
};

const phaseIcons: Record<string, typeof Plane> = {
  before: Lock,
  during: Plane,
  after: Shield,
};

const STORAGE_KEY = "gl_travel_checklist";

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
  const Icon = phaseIcons[phaseKey] || Shield;

  return (
    <div className="border border-slate-700/50 rounded-lg bg-slate-800/30 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-slate-700/20 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Icon className="w-5 h-5 text-cyan-400" />
          <span className="font-mono text-sm font-semibold text-slate-200 uppercase tracking-wider">
            {phase.label}
          </span>
          <span className="text-xs text-slate-500">
            {completedCount}/{phase.items.length} complete
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-20 h-1.5 rounded-full bg-slate-700 overflow-hidden">
            <div
              className="h-full bg-cyan-500 transition-all"
              style={{ width: `${phase.items.length ? (completedCount / phase.items.length) * 100 : 0}%` }}
            />
          </div>
          {expanded ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-3 space-y-2">
          {phase.items.map(item => (
            <div
              key={item.id}
              className={`flex items-start gap-3 p-3 rounded border transition-all ${
                checked[item.id] ? "bg-slate-800/20 border-slate-700/30 opacity-70" : "bg-slate-800/50 border-slate-700/50"
              }`}
            >
              <button
                onClick={() => onToggle(item.id)}
                className="mt-0.5 shrink-0"
              >
                {checked[item.id] ? (
                  <CheckCircle className="w-5 h-5 text-green-400" />
                ) : (
                  <Circle className="w-5 h-5 text-slate-600 hover:text-cyan-400 transition-colors" />
                )}
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-sm font-semibold ${checked[item.id] ? "text-slate-500 line-through" : "text-slate-200"}`}>
                    {item.title}
                  </span>
                  <span className={`text-[10px] font-mono uppercase px-1.5 py-0.5 rounded border ${priorityColors[item.priority]}`}>
                    {item.priority}
                  </span>
                  <span className="text-[10px] font-mono text-slate-600 uppercase">{item.category}</span>
                </div>
                <p className="text-xs text-slate-400 mt-1">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function TravelSecurity() {
  const [phases, setPhases] = useState<Record<string, Phase> | null>(null);
  const [tips, setTips] = useState<NetworkTip[]>([]);
  const [checked, setChecked] = useState<Record<string, boolean>>(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    } catch {
      return {};
    }
  });
  const [loading, setLoading] = useState(true);
  const [showTips, setShowTips] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`${API_BASE}/api/travel-security/checklist`).then(r => r.json()),
      fetch(`${API_BASE}/api/travel-security/network-tips`).then(r => r.json()),
    ]).then(([checklistData, tipsData]) => {
      setPhases(checklistData.phases);
      setTips(tipsData.tips);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleToggle = useCallback((id: string) => {
    setChecked(prev => {
      const next = { ...prev, [id]: !prev[id] };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const handleReset = useCallback(() => {
    setChecked({});
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const totalItems = phases ? Object.values(phases).reduce((sum, p) => sum + p.items.length, 0) : 0;
  const completedItems = Object.values(checked).filter(Boolean).length;

  const handleCopyChecklist = useCallback(() => {
    if (!phases) return;
    const lines: string[] = [];
    lines.push("=== GUARDIANLAYER TRAVEL SECURITY CHECKLIST ===");
    lines.push(`Progress: ${completedItems}/${totalItems} complete`);
    lines.push("");
    for (const [key, phase] of Object.entries(phases)) {
      lines.push(`── ${phase.label.toUpperCase()} ──`);
      phase.items.forEach(item => {
        const mark = checked[item.id] ? "[x]" : "[ ]";
        lines.push(`${mark} [${item.priority.toUpperCase()}] ${item.title}`);
        lines.push(`    ${item.description}`);
      });
      lines.push("");
    }
    lines.push("=== END OF CHECKLIST ===");
    navigator.clipboard.writeText(lines.join("\n")).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }, [phases, checked, completedItems, totalItems]);

  if (loading) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <PageHeader title="Travel Security" subtitle="Loading checklist..." />
        <div className="flex items-center justify-center py-16">
          <div className="text-cyan-400 animate-pulse font-mono text-sm">Loading travel security data...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <PageHeader
        title="Travel Security"
        subtitle="Pre-travel checklist, network safety, and secure connection guidance"
      />

      <WhyThisMatters>
        When you travel, you connect to networks you don't control — hotels, airports, cafes. Each
        one is a potential attack surface. This checklist covers everything you need to do before,
        during, and after travel to keep your devices and data secure. Your progress is saved locally
        so you can work through it over time.
      </WhyThisMatters>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-4 text-center">
          <div className="text-2xl font-mono font-bold text-cyan-400">{completedItems}</div>
          <div className="text-xs text-slate-400 mt-1">Completed</div>
        </div>
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-4 text-center">
          <div className="text-2xl font-mono font-bold text-slate-300">{totalItems - completedItems}</div>
          <div className="text-xs text-slate-400 mt-1">Remaining</div>
        </div>
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-4 text-center">
          <div className="text-2xl font-mono font-bold text-green-400">
            {totalItems ? Math.round((completedItems / totalItems) * 100) : 0}%
          </div>
          <div className="text-xs text-slate-400 mt-1">Ready</div>
        </div>
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-4 flex items-center justify-center gap-2">
          <button
            onClick={handleCopyChecklist}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono border rounded transition-colors text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
          >
            {copied ? <><Check className="w-3 h-3" /> COPIED</> : <><ClipboardCopy className="w-3 h-3" /> COPY</>}
          </button>
          <button
            onClick={handleReset}
            className="px-3 py-1.5 text-xs font-mono text-slate-500 border border-slate-700/50 rounded hover:text-red-400 hover:border-red-500/30 transition-colors"
          >
            RESET
          </button>
        </div>
      </div>

      {phases && (
        <div className="space-y-4">
          {(["before", "during", "after"] as const).map(key => (
            phases[key] && (
              <PhaseSection
                key={key}
                phaseKey={key}
                phase={phases[key]}
                checked={checked}
                onToggle={handleToggle}
              />
            )
          ))}
        </div>
      )}

      <div className="border border-slate-700/50 rounded-lg bg-slate-800/30 overflow-hidden">
        <button
          onClick={() => setShowTips(!showTips)}
          className="w-full flex items-center justify-between p-4 hover:bg-slate-700/20 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Wifi className="w-5 h-5 text-cyan-400" />
            <span className="font-mono text-sm font-semibold text-slate-200 uppercase tracking-wider">
              Network Threat Guide
            </span>
            <span className="text-xs text-slate-500">{tips.length} scenarios</span>
          </div>
          {showTips ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
        </button>

        {showTips && (
          <div className="px-4 pb-4 space-y-3">
            {tips.map((tip, i) => (
              <div key={i} className={`p-4 rounded-lg border ${riskColors[tip.risk] || riskColors.medium}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-slate-200">{tip.title}</span>
                  <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-slate-900/50">
                    {tip.risk} risk
                  </span>
                </div>
                <p className="text-xs text-slate-300 mb-2">{tip.detail}</p>
                <div className="flex items-start gap-2 p-2 bg-slate-900/40 rounded">
                  <Shield className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-cyan-300">{tip.mitigation}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
