import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield, ShieldCheck, ShieldAlert, Mail, Network, Laptop, Key, Eye, CreditCard, Scale,
  X, CheckCircle2, AlertTriangle, Wrench, ArrowRight, Loader2
} from "lucide-react";

interface ProtectionIssue {
  id: string;
  title: string;
  description: string;
  severity: "critical" | "warning" | "info";
  fixable: boolean;
  fixLabel?: string;
}

interface ProtectionArea {
  name: string;
  status: "protected" | "issue" | "offline";
  detail: string;
  icon: typeof Shield;
  issues?: ProtectionIssue[];
  route?: string;
}

interface ProtectionStatusProps {
  areas: ProtectionArea[];
}

const STATUS_STYLES = {
  protected: { color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20", label: "Protected" },
  issue: { color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20", label: "Issue" },
  offline: { color: "text-rose-400", bg: "bg-rose-500/10 border-rose-500/20", label: "Offline" },
};

const SEVERITY_STYLES = {
  critical: { color: "text-rose-400", bg: "bg-rose-500/10 border-rose-500/30", icon: ShieldAlert },
  warning: { color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/30", icon: AlertTriangle },
  info: { color: "text-cyan-400", bg: "bg-cyan-500/10 border-cyan-500/30", icon: Shield },
};

function IssueCard({ issue, onFix }: { issue: ProtectionIssue; onFix: (id: string) => void }) {
  const [fixing, setFixing] = useState(false);
  const [fixed, setFixed] = useState(false);
  const sev = SEVERITY_STYLES[issue.severity];
  const SevIcon = sev.icon;

  const handleFix = async () => {
    setFixing(true);
    await new Promise(r => setTimeout(r, 1500 + Math.random() * 1000));
    setFixed(true);
    setFixing(false);
    onFix(issue.id);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10, height: 0 }}
      className={`p-3 rounded-lg border ${sev.bg} flex items-start gap-3`}
    >
      <SevIcon className={`w-4 h-4 mt-0.5 shrink-0 ${sev.color}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white font-medium">{issue.title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{issue.description}</p>
      </div>
      {issue.fixable && !fixed && (
        <button
          onClick={handleFix}
          disabled={fixing}
          className="shrink-0 px-3 py-1.5 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-xs font-display uppercase tracking-wider hover:bg-cyan-500/30 transition-colors disabled:opacity-50 flex items-center gap-1.5"
        >
          {fixing ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin" />
              Fixing
            </>
          ) : (
            <>
              <Wrench className="w-3 h-3" />
              {issue.fixLabel || "Fix"}
            </>
          )}
        </button>
      )}
      {fixed && (
        <span className="shrink-0 px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-display uppercase tracking-wider flex items-center gap-1.5">
          <CheckCircle2 className="w-3 h-3" />
          Fixed
        </span>
      )}
    </motion.div>
  );
}

function DetailPanel({ area, onClose }: { area: ProtectionArea; onClose: () => void }) {
  const style = STATUS_STYLES[area.status];
  const Icon = area.icon;
  const [fixedIds, setFixedIds] = useState<Set<string>>(new Set());
  const [fixingAll, setFixingAll] = useState(false);

  const issues = area.issues || [];
  const unfixedIssues = issues.filter(i => !fixedIds.has(i.id));
  const fixableIssues = unfixedIssues.filter(i => i.fixable);
  const allFixed = unfixedIssues.length === 0 && issues.length > 0;

  const handleFix = (id: string) => {
    setFixedIds(prev => new Set(prev).add(id));
  };

  const handleFixAll = async () => {
    setFixingAll(true);
    for (const issue of fixableIssues) {
      await new Promise(r => setTimeout(r, 800 + Math.random() * 700));
      setFixedIds(prev => new Set(prev).add(issue.id));
    }
    setFixingAll(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="relative glass-panel rounded-2xl border border-white/10 w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className={`p-5 border-b border-white/5 flex items-center gap-3`}>
          <div className={`w-10 h-10 rounded-xl ${style.bg} border flex items-center justify-center`}>
            <Icon className={`w-5 h-5 ${style.color}`} />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-display text-white">{area.name}</h3>
            <p className={`text-xs ${style.color}`}>{allFixed ? "All issues resolved" : area.detail}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/5 transition-colors text-muted-foreground hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex-1 space-y-3">
          {allFixed ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-8"
            >
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
              <p className="text-emerald-400 font-display text-sm uppercase tracking-wider">All Clear</p>
              <p className="text-muted-foreground text-xs mt-1">All issues have been resolved</p>
            </motion.div>
          ) : issues.length === 0 ? (
            <div className="text-center py-8">
              <ShieldCheck className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
              <p className="text-emerald-400 font-display text-sm uppercase tracking-wider">Fully Protected</p>
              <p className="text-muted-foreground text-xs mt-1">No issues detected in this area</p>
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              {issues.map(issue => (
                <IssueCard
                  key={issue.id}
                  issue={{ ...issue, fixable: issue.fixable && !fixedIds.has(issue.id) }}
                  onFix={handleFix}
                />
              ))}
            </AnimatePresence>
          )}
        </div>

        {fixableIssues.length > 1 && !allFixed && (
          <div className="p-4 border-t border-white/5 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {fixableIssues.length} fixable issue{fixableIssues.length !== 1 ? "s" : ""} remaining
            </p>
            <button
              onClick={handleFixAll}
              disabled={fixingAll}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500/20 to-violet-500/20 text-cyan-400 border border-cyan-500/30 text-xs font-display uppercase tracking-wider hover:from-cyan-500/30 hover:to-violet-500/30 transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {fixingAll ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Fixing All...
                </>
              ) : (
                <>
                  <Wrench className="w-3.5 h-3.5" />
                  Fix All Issues
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

export function ProtectionStatus({ areas }: ProtectionStatusProps) {
  const [selectedArea, setSelectedArea] = useState<ProtectionArea | null>(null);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-panel p-6 rounded-2xl"
      >
        <h3 className="text-sm font-display uppercase tracking-widest text-primary mb-4 flex items-center gap-2">
          <Shield className="w-4 h-4" />
          Protection Status — At a Glance
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {areas.map((area, i) => {
            const style = STATUS_STYLES[area.status];
            const Icon = area.icon;
            return (
              <motion.button
                key={area.name}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 + i * 0.05 }}
                whileHover={{ scale: 1.03, y: -2 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setSelectedArea(area)}
                className={`p-3 rounded-xl border ${style.bg} text-center cursor-pointer transition-shadow hover:shadow-lg hover:shadow-cyan-500/5`}
              >
                <Icon className={`w-5 h-5 mx-auto mb-2 ${style.color}`} />
                <p className="text-xs font-display uppercase tracking-wider text-white mb-0.5">{area.name}</p>
                <p className={`text-[10px] ${style.color}`}>{area.detail}</p>
              </motion.button>
            );
          })}
        </div>
      </motion.div>

      <AnimatePresence>
        {selectedArea && (
          <DetailPanel area={selectedArea} onClose={() => setSelectedArea(null)} />
        )}
      </AnimatePresence>
    </>
  );
}

export function generateProtectionAreas(): ProtectionArea[] {
  return [
    {
      name: "Email",
      status: "protected",
      detail: "All clear",
      icon: Mail,
      issues: [],
    },
    {
      name: "Network",
      status: "issue",
      detail: "1 issue needs fixing",
      icon: Network,
      issues: [
        {
          id: "net-1",
          title: "DNS resolver using unencrypted queries",
          description: "Your network DNS resolver is not using DNS-over-HTTPS (DoH) or DNS-over-TLS (DoT). This exposes DNS queries to interception.",
          severity: "warning",
          fixable: true,
          fixLabel: "Enable DoH",
        },
      ],
    },
    {
      name: "Devices",
      status: "issue",
      detail: "2 need updates",
      icon: Laptop,
      issues: [
        {
          id: "dev-1",
          title: "Tailscale client outdated on 2 devices",
          description: "PodcastPC and h2rgraphics are running Tailscale v1.74.1 — latest is v1.82.0. Update recommended for security patches.",
          severity: "warning",
          fixable: true,
          fixLabel: "Update",
        },
        {
          id: "dev-2",
          title: "3 devices have keys expiring within 30 days",
          description: "Framework, homeassistant, and PodcastPC have Tailscale keys expiring soon. Renew to avoid losing connectivity.",
          severity: "warning",
          fixable: true,
          fixLabel: "Renew Keys",
        },
      ],
    },
    {
      name: "Authentication",
      status: "protected",
      detail: "MFA \u{1F512} active",
      icon: Key,
      issues: [],
    },
    {
      name: "Dark Web",
      status: "protected",
      detail: "Monitoring active",
      icon: Eye,
      issues: [],
    },
    {
      name: "Payments",
      status: "protected",
      detail: "All transactions scanned",
      icon: CreditCard,
      issues: [],
    },
    {
      name: "Contracts",
      status: "issue",
      detail: "1 expiring soon",
      icon: Scale,
      issues: [
        {
          id: "con-1",
          title: "OpenClaw monitoring contract expires in 14 days",
          description: "Your OpenClaw security monitoring contract is set to expire on April 5, 2026. Renew to maintain continuous coverage.",
          severity: "warning",
          fixable: true,
          fixLabel: "Renew",
        },
      ],
    },
  ];
}
