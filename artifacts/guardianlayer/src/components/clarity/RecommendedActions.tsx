import { motion, AnimatePresence } from "framer-motion";
import { Lightbulb, ArrowRight, CheckCircle2, Wrench, Loader2, Zap, ChevronDown, ChevronUp } from "lucide-react";
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

const FIX_STEPS: Record<string, string[]> = {
  "1": [
    "Connecting to WS-HR-004 (10.0.3.22)...",
    "Scanning installed packages for known CVEs...",
    "Found 8 vulnerable packages: openssl 3.0.2, curl 7.81, libxml2 2.9.13, sudo 1.9.9, systemd 249, polkit 0.105, vim 8.2, openssh 8.9",
    "Downloading security patches (247 MB)...",
    "Applying patch 1/8: openssl 3.0.2 → 3.0.14 (CVE-2024-0727)...",
    "Applying patch 2/8: curl 7.81 → 7.88 (CVE-2023-38545)...",
    "Applying patch 3/8: libxml2 2.9.13 → 2.9.14 (CVE-2022-40303)...",
    "Applying patch 4/8: sudo 1.9.9 → 1.9.15p5 (CVE-2023-22809)...",
    "Applying patch 5/8: systemd 249 → 249.17 (CVE-2023-26604)...",
    "Applying patch 6/8: polkit 0.105 → 0.105-33 (CVE-2021-4034)...",
    "Applying patch 7/8: vim 8.2 → 8.2.5172 (CVE-2022-1621)...",
    "Applying patch 8/8: openssh 8.9 → 8.9p1-3.6 (CVE-2023-38408)...",
    "Verifying installations...",
    "All 8 security patches applied successfully. System is now up to date.",
  ],
  "2": [
    "Connecting to payment gateway API...",
    "Loading flagged transfers pending review...",
    "Transfer #TXN-8834: $4,250.00 → Vendor Services LLC — flagged: unusual recipient",
    "  → Running fraud analysis... Risk score: 12/100 (low). Origin matches known payroll pattern.",
    "  → Auto-approving transfer #TXN-8834 ✓",
    "Transfer #TXN-8841: $890.00 → Cloud Infrastructure Corp — flagged: after-hours submission",
    "  → Running fraud analysis... Risk score: 8/100 (low). Matches recurring AWS billing.",
    "  → Auto-approving transfer #TXN-8841 ✓",
    "Transfer #TXN-8847: $12,500.00 → Cyber Insurance Partners — flagged: amount above threshold",
    "  → Running fraud analysis... Risk score: 5/100 (low). Matches insurance renewal invoice #INV-2026-0412.",
    "  → Auto-approving transfer #TXN-8847 ✓",
    "All 3 transfers approved. Total: $17,640.00 released.",
  ],
  "3": [
    "Connecting to insurance provider portal...",
    "Retrieving current policy details...",
    "Policy: GL-CYBER-2025-4492 | Cyber Liability Insurance",
    "  Coverage: $5M aggregate, $1M per occurrence",
    "  Provider: CyberShield Insurance Group",
    "  Expires: April 20, 2026 (15 days remaining)",
    "Generating renewal quote...",
    "Renewal quote received: $14,800/year (3.2% increase from prior term)",
    "  Coverage remains: $5M aggregate, $1M per occurrence",
    "  Added benefit: Ransomware negotiation services included",
    "Submitting auto-renewal request...",
    "Renewal confirmation received. New expiry: April 20, 2027.",
    "Updated policy document saved to /compliance/insurance/GL-CYBER-2026-4492.pdf",
  ],
  "4": [
    "Scanning network for devices without disk encryption...",
    "Found 2 unencrypted devices:",
    "  1. LAPTOP-MKT-007 (Marketing - Sarah Chen) — Windows 11, 512GB NVMe",
    "  2. WS-FIN-003 (Finance - James Park) — Windows 11, 1TB SSD",
    "Initiating BitLocker encryption on LAPTOP-MKT-007...",
    "  → Generating recovery key: ████-████-████-████-████-████-████-████",
    "  → Recovery key escrowed to Active Directory ✓",
    "  → Encryption started (estimated: 45 minutes for 512GB)",
    "Initiating BitLocker encryption on WS-FIN-003...",
    "  → Generating recovery key: ████-████-████-████-████-████-████-████",
    "  → Recovery key escrowed to Active Directory ✓",
    "  → Encryption started (estimated: 90 minutes for 1TB)",
    "Both devices now encrypting. Users can continue working during encryption.",
    "Recovery keys backed up to vault. Encryption will complete in background.",
  ],
  "5": [
    "Connecting to dark web monitoring service...",
    "Retrieving latest scan results from April 5, 2026...",
    "Found 4 new credential exposures:",
    "  1. j.martinez@company.com — found on paste site (breach: InfoTech Corp, March 2026)",
    "  2. a.williams@company.com — found on dark web marketplace (breach: DataVault leak)",
    "  3. k.johnson@company.com — found in credential dump (breach: CloudSync, Feb 2026)",
    "  4. m.thompson@company.com — found on hacker forum (breach: NetServ incident)",
    "Initiating automatic remediation...",
    "  → Forcing password reset for j.martinez@company.com ✓",
    "  → Forcing password reset for a.williams@company.com ✓",
    "  → Forcing password reset for k.johnson@company.com ✓",
    "  → Forcing password reset for m.thompson@company.com ✓",
    "  → Enabling mandatory MFA for all 4 accounts ✓",
    "  → Notification emails sent to affected users ✓",
    "All exposed credentials invalidated. Users must set new passwords on next login.",
  ],
};

export function RecommendedActions({ actions }: RecommendedActionsProps) {
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [fixingId, setFixingId] = useState<string | null>(null);
  const [fixingAll, setFixingAll] = useState(false);
  const [fixLogs, setFixLogs] = useState<Record<string, string[]>>({});
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());

  const runFix = async (actionId: string) => {
    setFixingId(actionId);
    setExpandedLogs(prev => new Set(prev).add(actionId));
    setFixLogs(prev => ({ ...prev, [actionId]: [] }));

    const steps = FIX_STEPS[actionId] || [
      "Analyzing issue...",
      "Applying automated fix...",
      "Verifying changes...",
      "Fix applied successfully.",
    ];

    for (const step of steps) {
      await new Promise(r => setTimeout(r, 400 + Math.random() * 600));
      setFixLogs(prev => ({
        ...prev,
        [actionId]: [...(prev[actionId] || []), step],
      }));
    }

    setFixingId(null);
    setCompletedIds(prev => new Set(prev).add(actionId));
  };

  const runFixAll = async () => {
    setFixingAll(true);
    for (const action of actions) {
      if (completedIds.has(action.id)) continue;
      await runFix(action.id);
      await new Promise(r => setTimeout(r, 300));
    }
    setFixingAll(false);
  };

  const toggleLog = (id: string) => {
    setExpandedLogs(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  if (actions.length === 0) return null;

  const allDone = actions.every(a => completedIds.has(a.id));
  const unfixedCount = actions.filter(a => !completedIds.has(a.id)).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="glass-panel p-6 rounded-2xl"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-display uppercase tracking-widest text-primary flex items-center gap-2">
          <Lightbulb className="w-4 h-4" />
          Recommended Actions — Most Important First
        </h3>
        {!allDone && (
          <button
            onClick={runFixAll}
            disabled={fixingAll || fixingId !== null}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500/20 to-violet-500/20 text-cyan-400 border border-cyan-500/30 text-xs font-display uppercase tracking-wider hover:from-cyan-500/30 hover:to-violet-500/30 transition-all disabled:opacity-50 shadow-[0_0_15px_rgba(6,182,212,0.1)] hover:shadow-[0_0_20px_rgba(6,182,212,0.2)]"
          >
            {fixingAll ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Fixing All ({unfixedCount} left)...
              </>
            ) : (
              <>
                <Zap className="w-3.5 h-3.5" />
                Auto-Fix All ({unfixedCount})
              </>
            )}
          </button>
        )}
        {allDone && (
          <span className="flex items-center gap-1.5 text-emerald-400 text-xs font-display uppercase tracking-wider">
            <CheckCircle2 className="w-4 h-4" />
            All Resolved
          </span>
        )}
      </div>
      <div className="space-y-2">
        {actions.map((action, i) => {
          const isCompleted = completedIds.has(action.id);
          const isFixing = fixingId === action.id;
          const style = PRIORITY_STYLES[action.priority];
          const logs = fixLogs[action.id] || [];
          const isLogExpanded = expandedLogs.has(action.id);

          return (
            <motion.div
              key={action.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 + i * 0.05 }}
              className="rounded-xl border overflow-hidden"
            >
              <div
                className={`flex items-center gap-3 p-3 transition-colors ${
                  isCompleted ? "bg-emerald-500/5 border-emerald-500/20" : isFixing ? "bg-cyan-500/5 border-cyan-500/20" : style.bg
                }`}
              >
                <span className={`text-xs font-mono ${isCompleted ? "text-emerald-400" : isFixing ? "text-cyan-400" : style.text} shrink-0 w-6 text-center`}>
                  {isCompleted ? "✓" : i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${isCompleted ? "text-muted-foreground line-through" : "text-white"}`}>
                    {action.description}
                  </p>
                </div>
                <span className={`text-[9px] font-display uppercase tracking-wider px-2 py-0.5 rounded shrink-0 ${
                  isCompleted ? "text-emerald-400 bg-emerald-500/20" : isFixing ? "text-cyan-400 bg-cyan-500/20 animate-pulse" : style.text + " bg-white/5"
                }`}>
                  {isCompleted ? "Fixed" : isFixing ? "Fixing..." : style.label}
                </span>
                {logs.length > 0 && (
                  <button
                    onClick={() => toggleLog(action.id)}
                    className="shrink-0 p-1 rounded text-gray-500 hover:text-gray-300 transition-colors"
                  >
                    {isLogExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                )}
                {!isCompleted && !isFixing && (
                  <button
                    onClick={() => runFix(action.id)}
                    disabled={fixingId !== null}
                    className="shrink-0 px-3 py-1.5 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-xs font-display uppercase tracking-wider hover:bg-cyan-500/30 transition-colors disabled:opacity-30 flex items-center gap-1.5"
                  >
                    <Wrench className="w-3 h-3" />
                    Fix
                  </button>
                )}
                {isFixing && (
                  <span className="shrink-0 px-3 py-1.5 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-xs font-display uppercase tracking-wider flex items-center gap-1.5">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Running
                  </span>
                )}
                {isCompleted && !isFixing && (
                  <span className="shrink-0 p-1.5 rounded-lg text-emerald-400 bg-emerald-500/20">
                    <CheckCircle2 className="w-4 h-4" />
                  </span>
                )}
              </div>

              <AnimatePresence>
                {isLogExpanded && logs.length > 0 && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 py-3 bg-gray-950/80 border-t border-gray-800/50 max-h-48 overflow-y-auto">
                      <div className="font-mono text-[11px] space-y-0.5">
                        {logs.map((line, li) => (
                          <motion.div
                            key={li}
                            initial={{ opacity: 0, x: -5 }}
                            animate={{ opacity: 1, x: 0 }}
                            className={`${
                              line.includes("✓") || line.includes("successfully") || line.includes("approved") || line.includes("cleared") || line.includes("complete")
                                ? "text-emerald-400"
                                : line.includes("→")
                                ? "text-cyan-400/80"
                                : line.includes("Found") || line.includes("flagged")
                                ? "text-amber-400/80"
                                : "text-gray-400"
                            }`}
                          >
                            <span className="text-gray-600 mr-2 select-none">{String(li + 1).padStart(2, " ")}│</span>
                            {line}
                          </motion.div>
                        ))}
                        {isFixing && (
                          <div className="text-cyan-400/60 flex items-center gap-1 mt-1">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            <span>Processing...</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
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
