import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListRecoveryCases,
  useGetRecoverySummary,
  useGetRecoveryCase,
  useUpdateRecoveryStepStatus,
  useVerifyRecoveryCase,
  useGetRecoveryTimeline,
  getListRecoveryCasesQueryKey,
  getGetRecoverySummaryQueryKey,
  getGetRecoveryCaseQueryKey,
  getGetRecoveryTimelineQueryKey,
  RecoveryCaseStatus,
  RecoveryStepStatus,
} from "@workspace/api-client-react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import {
  RefreshCw,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Clock,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  FileText,
  Mail,
  CreditCard,
  Fingerprint,
  AlertTriangle,
  Loader2,
} from "lucide-react";

import { PageHeader } from "@/components/ui/PageHeader";
import { CyberLoading } from "@/components/ui/CyberLoading";
import { CyberError } from "@/components/ui/CyberError";
import { useToast } from "@/hooks/use-toast";

const ASSET_ICONS: Record<string, typeof Shield> = {
  passport: FileText,
  email: Mail,
  credit_card: CreditCard,
  ssn: Fingerprint,
};

const ASSET_LABELS: Record<string, string> = {
  passport: "Passport",
  email: "Email Account",
  credit_card: "Credit Card",
  ssn: "Social Security Number",
};

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: "bg-zinc-500/10 border-zinc-500/30", text: "text-zinc-400", label: "Pending" },
  in_progress: { bg: "bg-amber-500/10 border-amber-500/30", text: "text-amber-400", label: "In Progress" },
  verified: { bg: "bg-blue-500/10 border-blue-500/30", text: "text-blue-400", label: "Verified" },
  recovered: { bg: "bg-emerald-500/10 border-emerald-500/30", text: "text-emerald-400", label: "Recovered" },
};

const STEP_STATUS_STYLES: Record<string, { color: string; label: string }> = {
  not_started: { color: "text-zinc-500", label: "Not Started" },
  in_progress: { color: "text-amber-400", label: "In Progress" },
  completed: { color: "text-blue-400", label: "Completed" },
  verified: { color: "text-emerald-400", label: "Verified" },
};

function RecoveryCaseCard({ caseId }: { caseId: number }) {
  const [expanded, setExpanded] = useState(false);
  const [editingNotes, setEditingNotes] = useState<number | null>(null);
  const [notesText, setNotesText] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data, isLoading } = useGetRecoveryCase(caseId, {
    query: { enabled: expanded },
  });

  const updateStepMutation = useUpdateRecoveryStepStatus();
  const verifyMutation = useVerifyRecoveryCase();

  const { data: casesData } = useListRecoveryCases();
  const caseInfo = casesData?.cases.find((c) => c.id === caseId);

  if (!caseInfo) return null;

  const Icon = ASSET_ICONS[caseInfo.assetType] ?? Shield;
  const statusStyle = STATUS_STYLES[caseInfo.status] ?? STATUS_STYLES.pending;

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: getListRecoveryCasesQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetRecoverySummaryQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetRecoveryCaseQueryKey(caseId) });
    queryClient.invalidateQueries({ queryKey: getGetRecoveryTimelineQueryKey() });
  };

  const handleStepStatusChange = (stepId: number, newStatus: string) => {
    updateStepMutation.mutate(
      { id: stepId, data: { status: newStatus as "not_started" | "in_progress" | "completed" | "verified", notes: undefined } },
      {
        onSuccess: () => {
          invalidateAll();
          toast({ description: "Step status updated." });
        },
      },
    );
  };

  const handleSaveNotes = (stepId: number) => {
    updateStepMutation.mutate(
      { id: stepId, data: { status: data?.steps.find(s => s.id === stepId)?.status as "not_started" | "in_progress" | "completed" | "verified" ?? "not_started", notes: notesText } },
      {
        onSuccess: () => {
          setEditingNotes(null);
          invalidateAll();
          toast({ description: "Notes saved." });
        },
      },
    );
  };

  const handleVerifyCase = () => {
    verifyMutation.mutate(
      { id: caseId },
      {
        onSuccess: () => {
          invalidateAll();
          toast({ description: "Asset marked as fully recovered." });
        },
      },
    );
  };

  const allStepsCompleted = data?.steps.every(
    (s) => s.status === "completed" || s.status === "verified",
  );

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-panel rounded-2xl overflow-hidden"
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-6 flex items-center justify-between hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-xl ${statusStyle.bg} border`}>
            <Icon className={`w-6 h-6 ${statusStyle.text}`} />
          </div>
          <div className="text-left">
            <div className="flex items-center gap-3 mb-1">
              <h3 className="font-display text-white text-lg uppercase tracking-wider">
                {ASSET_LABELS[caseInfo.assetType] ?? caseInfo.assetType}
              </h3>
              <span className={`text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded border ${statusStyle.bg} ${statusStyle.text}`}>
                {statusStyle.label}
              </span>
            </div>
            <p className="text-sm text-muted-foreground font-mono">{caseInfo.assetIdentifier}</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-right hidden md:block">
            <div className="flex items-center gap-2">
              <div className="w-32 h-2 bg-black/40 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    caseInfo.recoveryPercentage === 100
                      ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                      : caseInfo.recoveryPercentage > 0
                        ? "bg-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.3)]"
                        : "bg-zinc-600"
                  }`}
                  style={{ width: `${caseInfo.recoveryPercentage}%` }}
                />
              </div>
              <span className="font-mono text-sm text-muted-foreground w-10 text-right">
                {caseInfo.recoveryPercentage}%
              </span>
            </div>
          </div>
          {expanded ? (
            <ChevronDown className="w-5 h-5 text-muted-foreground" />
          ) : (
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          )}
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="px-6 pb-6 border-t border-white/5 pt-4">
              <div className="mb-4 p-4 rounded-xl bg-black/20 border border-white/5">
                <p className="text-sm text-muted-foreground flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 mt-0.5 text-amber-400 shrink-0" />
                  {caseInfo.compromiseDetails}
                </p>
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : (
                <>
                  <h4 className="font-display text-xs uppercase tracking-widest text-primary mb-4 flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    Recovery Steps
                  </h4>
                  <div className="space-y-3">
                    {data?.steps.map((step, idx) => {
                      const stepStyle = STEP_STATUS_STYLES[step.status] ?? STEP_STATUS_STYLES.not_started;
                      return (
                        <div
                          key={step.id}
                          className="p-4 rounded-xl bg-black/20 border border-white/5 hover:border-white/10 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-3 flex-1">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-mono font-bold ${
                                step.status === "verified" ? "bg-emerald-500/20 text-emerald-400" :
                                step.status === "completed" ? "bg-blue-500/20 text-blue-400" :
                                step.status === "in_progress" ? "bg-amber-500/20 text-amber-400" :
                                "bg-white/5 text-zinc-500"
                              }`}>
                                {step.status === "verified" ? (
                                  <CheckCircle2 className="w-4 h-4" />
                                ) : (
                                  idx + 1
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h5 className="text-white text-sm font-medium">{step.title}</h5>
                                <p className="text-xs text-muted-foreground mt-1">{step.description}</p>
                                {step.completedAt && (
                                  <span className="text-[10px] font-mono text-muted-foreground mt-2 block">
                                    Completed: {format(new Date(step.completedAt), "PP pp")}
                                  </span>
                                )}
                                {step.notes && editingNotes !== step.id && (
                                  <div className="mt-2 p-2 rounded bg-black/30 border border-white/5">
                                    <p className="text-xs text-muted-foreground italic">{step.notes}</p>
                                  </div>
                                )}
                                {editingNotes === step.id && (
                                  <div className="mt-2 flex gap-2">
                                    <input
                                      type="text"
                                      value={notesText}
                                      onChange={(e) => setNotesText(e.target.value)}
                                      className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-primary/50"
                                      placeholder="Add notes..."
                                    />
                                    <button
                                      onClick={() => handleSaveNotes(step.id)}
                                      className="px-3 py-1.5 bg-primary/20 text-primary text-xs rounded-lg hover:bg-primary/30 transition-colors font-mono"
                                    >
                                      Save
                                    </button>
                                    <button
                                      onClick={() => setEditingNotes(null)}
                                      className="px-3 py-1.5 text-zinc-400 text-xs rounded-lg hover:bg-white/5 transition-colors font-mono"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              {editingNotes !== step.id && (
                                <button
                                  onClick={() => {
                                    setEditingNotes(step.id);
                                    setNotesText(step.notes ?? "");
                                  }}
                                  className="px-2 py-1 text-[10px] font-mono text-zinc-500 hover:text-white transition-colors"
                                >
                                  Notes
                                </button>
                              )}
                              <select
                                value={step.status}
                                onChange={(e) => handleStepStatusChange(step.id, e.target.value)}
                                className={`bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-xs font-mono ${stepStyle.color} focus:outline-none focus:border-primary/50 cursor-pointer`}
                              >
                                <option value="not_started">Not Started</option>
                                <option value="in_progress">In Progress</option>
                                <option value="completed">Completed</option>
                                <option value="verified">Verified</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {allStepsCompleted && caseInfo.status !== "recovered" && (
                    <div className="mt-4 p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <ShieldCheck className="w-5 h-5 text-emerald-400" />
                          <div>
                            <p className="text-sm text-emerald-400 font-display uppercase tracking-wider">Ready for Verification</p>
                            <p className="text-xs text-muted-foreground">All recovery steps are complete. Verify to mark as fully recovered.</p>
                          </div>
                        </div>
                        <button
                          onClick={handleVerifyCase}
                          disabled={verifyMutation.isPending}
                          className="px-4 py-2 bg-emerald-500/20 text-emerald-400 rounded-lg text-xs font-display uppercase tracking-widest hover:bg-emerald-500/30 transition-colors border border-emerald-500/30 disabled:opacity-50"
                        >
                          {verifyMutation.isPending ? "Verifying..." : "Confirm Recovery"}
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function Recovery() {
  const [activeTab, setActiveTab] = useState<"cases" | "timeline">("cases");
  const { data: summary, isLoading: isSummaryLoading, isError: isSummaryError } = useGetRecoverySummary();
  const { data: casesData, isLoading: isCasesLoading } = useListRecoveryCases();
  const { data: timeline, isLoading: isTimelineLoading } = useGetRecoveryTimeline({
    query: { enabled: activeTab === "timeline" },
  });

  if (isSummaryLoading || isCasesLoading) return <CyberLoading text="SCANNING RECOVERY STATUS..." />;
  if (isSummaryError || !summary) return <CyberError title="RECOVERY FAULT" message="Unable to retrieve recovery data from the core." />;

  const summaryCards = [
    { label: "Assets Affected", value: summary.totalAffected, icon: ShieldAlert, color: "text-rose-500" },
    { label: "Recovered", value: summary.totalRecovered, icon: ShieldCheck, color: "text-emerald-400" },
    { label: "In Progress", value: summary.inProgress, icon: Clock, color: "text-amber-400" },
  ];

  return (
    <div className="pb-12">
      <PageHeader
        title="Recovery Center"
        description="Track and manage recovery of compromised assets. Restore access, replace credentials, and verify secure status."
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {summaryCards.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass-panel p-6 rounded-2xl relative overflow-hidden group"
          >
            <div className={`absolute top-0 right-0 p-4 opacity-10 ${stat.color}`}>
              <stat.icon className="w-16 h-16" />
            </div>
            <span className="font-display uppercase text-xs tracking-widest text-muted-foreground mb-3 block">
              {stat.label}
            </span>
            <span className="text-3xl font-mono font-bold text-foreground">
              {stat.value}
            </span>
          </motion.div>
        ))}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-panel p-6 rounded-2xl relative overflow-hidden"
        >
          <span className="font-display uppercase text-xs tracking-widest text-muted-foreground mb-3 block">
            Overall Recovery
          </span>
          <div className="flex items-end gap-3">
            <span className="text-3xl font-mono font-bold text-foreground">
              {summary.overallPercentage}%
            </span>
          </div>
          <div className="mt-3 w-full h-3 bg-black/40 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${summary.overallPercentage}%` }}
              transition={{ duration: 1, delay: 0.5, ease: "easeOut" }}
              className={`h-full rounded-full ${
                summary.overallPercentage === 100
                  ? "bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]"
                  : "bg-primary shadow-[0_0_15px_rgba(6,182,212,0.3)]"
              }`}
            />
          </div>
        </motion.div>
      </div>

      <div className="mb-6 flex items-center gap-4 glass-panel p-2 rounded-xl inline-flex">
        <div className="pl-4 pr-2 flex items-center text-muted-foreground border-r border-white/10 shrink-0">
          <RefreshCw className="w-4 h-4 mr-2" />
          <span className="text-xs font-display uppercase tracking-widest">View</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("cases")}
            className={`px-4 py-2 rounded-lg text-sm font-mono transition-colors ${activeTab === "cases" ? "bg-white/10 text-white" : "text-muted-foreground hover:text-white"}`}
          >
            RECOVERY CASES
          </button>
          <button
            onClick={() => setActiveTab("timeline")}
            className={`px-4 py-2 rounded-lg text-sm font-mono transition-colors ${activeTab === "timeline" ? "bg-white/10 text-white" : "text-muted-foreground hover:text-white"}`}
          >
            TIMELINE
          </button>
        </div>
      </div>

      {activeTab === "cases" && (
        <div className="space-y-4">
          {casesData?.cases.map((c) => (
            <RecoveryCaseCard key={c.id} caseId={c.id} />
          ))}
          {(!casesData?.cases || casesData.cases.length === 0) && (
            <div className="py-16 text-center glass-panel rounded-2xl border-dashed border-2 border-white/5">
              <ShieldCheck className="w-12 h-12 text-emerald-500 mx-auto mb-4 opacity-50" />
              <p className="font-mono text-emerald-500/80 tracking-widest uppercase">No recovery cases. All assets secure.</p>
            </div>
          )}
        </div>
      )}

      {activeTab === "timeline" && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel rounded-2xl p-6"
        >
          <h3 className="font-display text-lg uppercase tracking-widest text-primary mb-6 flex items-center gap-3 border-b border-white/5 pb-4">
            <Clock className="w-5 h-5" />
            Recovery Timeline
          </h3>

          {isTimelineLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : !timeline?.entries.length ? (
            <p className="font-mono text-muted-foreground text-center py-8">No timeline events yet.</p>
          ) : (
            <div className="relative">
              <div className="absolute left-6 top-0 bottom-0 w-px bg-white/10" />
              <div className="space-y-4">
                {timeline.entries.map((entry, idx) => {
                  const actionColor = entry.action === "verified" ? "text-emerald-400 bg-emerald-500/20" :
                    entry.action === "completed" ? "text-blue-400 bg-blue-500/20" :
                    "text-amber-400 bg-amber-500/20";
                  const EntryIcon = ASSET_ICONS[entry.assetType] ?? Shield;

                  return (
                    <motion.div
                      key={entry.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      className="flex items-start gap-4 pl-2"
                    >
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 relative z-10 ${actionColor}`}>
                        <EntryIcon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 pb-4">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded ${actionColor}`}>
                            {entry.action}
                          </span>
                          <span className="text-xs font-mono text-muted-foreground">
                            {format(new Date(entry.timestamp), "PP pp")}
                          </span>
                        </div>
                        <p className="text-sm text-white">{entry.stepTitle}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {ASSET_LABELS[entry.assetType] ?? entry.assetType}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
