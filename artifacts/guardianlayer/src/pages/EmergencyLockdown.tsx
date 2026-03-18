import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetLockdownStatus,
  useActivateLockdown,
  useLiftLockdown,
  useToggleLockdownAction,
  useGetLockdownHistory,
  getGetLockdownStatusQueryKey,
  getGetLockdownHistoryQueryKey,
} from "@workspace/api-client-react";
import { motion, AnimatePresence } from "framer-motion";
import { format, formatDistanceToNow } from "date-fns";
import { clsx } from "clsx";
import {
  ShieldOff,
  ShieldAlert,
  Lock,
  CreditCard,
  Mail,
  KeyRound,
  Laptop,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Power,
  Unlock,
  Activity,
  XCircle,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { CyberLoading } from "@/components/ui/CyberLoading";
import { CyberError } from "@/components/ui/CyberError";
import { useToast } from "@/hooks/use-toast";

const ACTION_ICONS: Record<string, typeof Lock> = {
  freeze_credit: Lock,
  lock_cards: CreditCard,
  secure_email: Mail,
  invalidate_credentials: KeyRound,
  isolate_endpoints: Laptop,
};

export default function EmergencyLockdown() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: status, isLoading, isError } = useGetLockdownStatus();
  const { data: history } = useGetLockdownHistory();
  const activateMutation = useActivateLockdown();
  const liftMutation = useLiftLockdown();
  const toggleMutation = useToggleLockdownAction();

  const [showActivateConfirm, setShowActivateConfirm] = useState(false);
  const [showLiftConfirm, setShowLiftConfirm] = useState(false);
  const [reason, setReason] = useState("");
  const [liftSummary, setLiftSummary] = useState<string | null>(null);

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: getGetLockdownStatusQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetLockdownHistoryQueryKey() });
  };

  const handleActivate = () => {
    if (!reason.trim()) return;
    activateMutation.mutate(
      { data: { reason: reason.trim() } },
      {
        onSuccess: () => {
          toast({ description: "Emergency lockdown activated. All containment actions are now in effect." });
          setShowActivateConfirm(false);
          setReason("");
          invalidateAll();
        },
        onError: () => {
          toast({ description: "Failed to activate lockdown.", variant: "destructive" });
        },
      }
    );
  };

  const handleLift = () => {
    liftMutation.mutate(undefined, {
      onSuccess: (result) => {
        toast({ description: "Lockdown has been lifted. All restrictions removed." });
        setShowLiftConfirm(false);
        setLiftSummary(result.summary);
        invalidateAll();
      },
      onError: () => {
        toast({ description: "Failed to lift lockdown.", variant: "destructive" });
      },
    });
  };

  const handleToggleAction = (actionId: number) => {
    toggleMutation.mutate(
      { actionId },
      {
        onSuccess: (result) => {
          toast({ description: `${result.label} ${result.status === "lifted" ? "lifted" : "reactivated"}.` });
          invalidateAll();
        },
        onError: () => {
          toast({ description: "Failed to toggle action.", variant: "destructive" });
        },
      }
    );
  };

  if (isLoading) return <CyberLoading text="CHECKING LOCKDOWN STATUS..." />;
  if (isError) return <CyberError title="LOCKDOWN SYSTEM ERROR" message="Unable to retrieve lockdown status." />;

  const isActive = status?.isActive ?? false;
  const session = status?.session;

  return (
    <div className="pb-12">
      <PageHeader
        title="Emergency Lockdown"
        description="Coordinated containment across all security domains. Activate to freeze all accounts, lock cards, secure emails, and isolate endpoints simultaneously."
      />

      {liftSummary && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 glass-panel rounded-2xl p-6 border-emerald-500/30 bg-emerald-500/5"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-sm uppercase tracking-widest text-emerald-400 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Lockdown Summary Report
            </h3>
            <button
              onClick={() => setLiftSummary(null)}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <XCircle className="w-4 h-4" />
            </button>
          </div>
          <pre className="font-mono text-xs text-foreground/80 whitespace-pre-wrap">{liftSummary}</pre>
        </motion.div>
      )}

      {!isActive ? (
        <InactiveState
          showConfirm={showActivateConfirm}
          setShowConfirm={setShowActivateConfirm}
          reason={reason}
          setReason={setReason}
          onActivate={handleActivate}
          isPending={activateMutation.isPending}
        />
      ) : (
        <ActiveDashboard
          session={session!}
          onToggleAction={handleToggleAction}
          showLiftConfirm={showLiftConfirm}
          setShowLiftConfirm={setShowLiftConfirm}
          onLift={handleLift}
          isLiftPending={liftMutation.isPending}
          isTogglePending={toggleMutation.isPending}
        />
      )}

      {history && history.logs.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-10"
        >
          <h3 className="font-display text-sm uppercase tracking-widest text-primary mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Lockdown Activity Log
          </h3>
          <div className="glass-panel rounded-2xl overflow-hidden">
            <div className="max-h-[400px] overflow-y-auto">
              {history.logs.map((log) => {
                const severityColor =
                  log.severity === "critical" ? "text-rose-400 bg-rose-500/10" :
                  log.severity === "warning" ? "text-amber-400 bg-amber-500/10" :
                  "text-primary bg-primary/10";
                return (
                  <div
                    key={log.id}
                    className="flex items-start gap-4 p-4 border-b border-white/5 last:border-b-0 hover:bg-white/[0.02] transition-colors"
                  >
                    <span className={clsx("px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider shrink-0 mt-0.5", severityColor)}>
                      {log.severity}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="font-display text-sm text-foreground">{log.action.replace(/_/g, " ")}</div>
                      <div className="font-mono text-xs text-muted-foreground mt-0.5 line-clamp-2">{log.detail}</div>
                    </div>
                    <span className="font-mono text-xs text-muted-foreground shrink-0">
                      {format(new Date(log.createdAt), "MMM dd, HH:mm")}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

function InactiveState({
  showConfirm,
  setShowConfirm,
  reason,
  setReason,
  onActivate,
  isPending,
}: {
  showConfirm: boolean;
  setShowConfirm: (v: boolean) => void;
  reason: string;
  setReason: (v: string) => void;
  onActivate: () => void;
  isPending: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-16"
    >
      <div className="relative mb-8">
        <div className="w-32 h-32 rounded-full bg-rose-500/10 border-2 border-rose-500/20 flex items-center justify-center">
          <ShieldOff className="w-16 h-16 text-rose-400/60" />
        </div>
        <div className="absolute inset-0 rounded-full animate-ping bg-rose-500/5" style={{ animationDuration: "3s" }} />
      </div>

      <h2 className="font-display text-2xl text-foreground mb-2 tracking-wider">LOCKDOWN INACTIVE</h2>
      <p className="text-muted-foreground text-sm font-sans max-w-md text-center mb-8">
        No active lockdown. Activate emergency lockdown to simultaneously freeze all financial accounts, lock cards, secure email, invalidate credentials, and isolate endpoints.
      </p>

      <AnimatePresence>
        {!showConfirm ? (
          <motion.button
            key="activate-btn"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowConfirm(true)}
            className="px-8 py-4 rounded-xl bg-rose-500/20 border-2 border-rose-500/40 text-rose-400 font-display text-sm uppercase tracking-widest hover:bg-rose-500/30 hover:border-rose-500/60 hover:shadow-[0_0_30px_rgba(244,63,94,0.3)] transition-all duration-300 flex items-center gap-3"
          >
            <Power className="w-5 h-5" />
            Initiate Lockdown
          </motion.button>
        ) : (
          <motion.div
            key="confirm-dialog"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-lg glass-panel rounded-2xl p-6 border-rose-500/30 bg-rose-500/5"
          >
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-rose-400" />
              <h3 className="font-display text-lg text-rose-400 tracking-wider">CONFIRM LOCKDOWN</h3>
            </div>
            <p className="text-sm text-muted-foreground font-sans mb-4">
              This will activate all containment actions simultaneously. All financial accounts will be frozen, cards locked, email accounts secured, credentials invalidated, and endpoints isolated.
            </p>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Enter reason for lockdown activation..."
              className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-foreground font-mono text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:border-rose-500/40 resize-none h-20 mb-4"
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => { setShowConfirm(false); setReason(""); }}
                className="px-4 py-2 rounded-lg border border-white/10 text-muted-foreground font-display text-xs uppercase tracking-widest hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={onActivate}
                disabled={isPending || !reason.trim()}
                className="px-6 py-2 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-400 font-display text-xs uppercase tracking-widest hover:bg-rose-500/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isPending ? (
                  <>
                    <div className="w-3 h-3 border-2 border-rose-400/40 border-t-rose-400 rounded-full animate-spin" />
                    Activating...
                  </>
                ) : (
                  <>
                    <Power className="w-3 h-3" />
                    Activate Lockdown
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function ActiveDashboard({
  session,
  onToggleAction,
  showLiftConfirm,
  setShowLiftConfirm,
  onLift,
  isLiftPending,
  isTogglePending,
}: {
  session: {
    id: number;
    status: string;
    reason: string;
    activatedAt: string;
    actions: Array<{
      id: number;
      actionType: string;
      label: string;
      description: string;
      status: string;
      activatedAt: string;
      liftedAt?: string | null;
    }>;
  };
  onToggleAction: (id: number) => void;
  showLiftConfirm: boolean;
  setShowLiftConfirm: (v: boolean) => void;
  onLift: () => void;
  isLiftPending: boolean;
  isTogglePending: boolean;
}) {
  const activeCount = session.actions.filter((a) => a.status === "active").length;
  const liftedCount = session.actions.filter((a) => a.status === "lifted").length;
  const activatedTime = new Date(session.activatedAt);

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-1 sm:grid-cols-3 gap-6"
      >
        <div className="glass-panel p-6 rounded-2xl border-rose-500/20 shadow-[0_0_20px_rgba(244,63,94,0.1)]">
          <div className="flex items-center gap-3 mb-2">
            <ShieldAlert className="w-5 h-5 text-rose-400" />
            <span className="font-display text-xs uppercase tracking-widest text-muted-foreground">Status</span>
          </div>
          <div className="font-mono text-2xl text-rose-400 font-bold">ACTIVE</div>
          <div className="font-mono text-xs text-muted-foreground mt-1">
            Since {format(activatedTime, "MMM dd, HH:mm")}
          </div>
        </div>
        <div className="glass-panel p-6 rounded-2xl">
          <div className="flex items-center gap-3 mb-2">
            <Clock className="w-5 h-5 text-primary" />
            <span className="font-display text-xs uppercase tracking-widest text-muted-foreground">Duration</span>
          </div>
          <div className="font-mono text-2xl text-foreground font-bold">
            {formatDistanceToNow(activatedTime)}
          </div>
          <div className="font-mono text-xs text-muted-foreground mt-1">Lockdown elapsed</div>
        </div>
        <div className="glass-panel p-6 rounded-2xl">
          <div className="flex items-center gap-3 mb-2">
            <Lock className="w-5 h-5 text-amber-400" />
            <span className="font-display text-xs uppercase tracking-widest text-muted-foreground">Actions</span>
          </div>
          <div className="font-mono text-2xl text-foreground font-bold">
            {activeCount}/{session.actions.length}
          </div>
          <div className="font-mono text-xs text-muted-foreground mt-1">
            {activeCount} active, {liftedCount} lifted
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-panel rounded-2xl p-6"
      >
        <div className="flex items-center gap-3 mb-2">
          <AlertTriangle className="w-4 h-4 text-rose-400" />
          <span className="font-display text-xs uppercase tracking-widest text-muted-foreground">Lockdown Reason</span>
        </div>
        <p className="font-sans text-sm text-foreground/80">{session.reason}</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <h3 className="font-display text-sm uppercase tracking-widest text-primary mb-4 flex items-center gap-2">
          <Lock className="w-4 h-4" />
          Containment Actions
        </h3>
        <div className="space-y-3">
          {session.actions.map((action) => {
            const Icon = ACTION_ICONS[action.actionType] || Lock;
            const isActionActive = action.status === "active";
            return (
              <motion.div
                key={action.id}
                layout
                className={clsx(
                  "glass-panel rounded-xl p-4 flex items-center gap-4 border-l-4 transition-all",
                  isActionActive ? "border-rose-500/40 bg-rose-500/[0.03]" : "border-emerald-500/30 bg-emerald-500/[0.03]"
                )}
              >
                <div className={clsx(
                  "p-3 rounded-xl shrink-0",
                  isActionActive ? "bg-rose-500/10" : "bg-emerald-500/10"
                )}>
                  <Icon className={clsx("w-5 h-5", isActionActive ? "text-rose-400" : "text-emerald-400")} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-0.5">
                    <h4 className="font-display text-sm text-foreground">{action.label}</h4>
                    <span className={clsx(
                      "px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-widest border",
                      isActionActive
                        ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                        : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                    )}>
                      {action.status}
                    </span>
                  </div>
                  <p className="font-mono text-xs text-muted-foreground">{action.description}</p>
                  {action.liftedAt && (
                    <p className="font-mono text-[10px] text-emerald-500/70 mt-1">
                      Lifted {format(new Date(action.liftedAt), "MMM dd, HH:mm")}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => onToggleAction(action.id)}
                  disabled={isTogglePending}
                  className={clsx(
                    "shrink-0 px-4 py-2 rounded-lg border font-display text-[10px] uppercase tracking-widest transition-all flex items-center gap-2",
                    isActionActive
                      ? "border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                      : "border-rose-500/30 text-rose-400 hover:bg-rose-500/10"
                  )}
                >
                  {isActionActive ? (
                    <>
                      <Unlock className="w-3 h-3" />
                      Lift
                    </>
                  ) : (
                    <>
                      <Lock className="w-3 h-3" />
                      Reactivate
                    </>
                  )}
                </button>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex justify-center pt-4"
      >
        <AnimatePresence>
          {!showLiftConfirm ? (
            <motion.button
              key="lift-btn"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowLiftConfirm(true)}
              className="px-8 py-4 rounded-xl bg-emerald-500/20 border-2 border-emerald-500/40 text-emerald-400 font-display text-sm uppercase tracking-widest hover:bg-emerald-500/30 hover:border-emerald-500/60 hover:shadow-[0_0_30px_rgba(16,185,129,0.3)] transition-all duration-300 flex items-center gap-3"
            >
              <Unlock className="w-5 h-5" />
              Lift Lockdown
            </motion.button>
          ) : (
            <motion.div
              key="lift-confirm"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg glass-panel rounded-2xl p-6 border-emerald-500/30 bg-emerald-500/5"
            >
              <div className="flex items-center gap-3 mb-4">
                <Unlock className="w-6 h-6 text-emerald-400" />
                <h3 className="font-display text-lg text-emerald-400 tracking-wider">CONFIRM LIFT LOCKDOWN</h3>
              </div>
              <p className="text-sm text-muted-foreground font-sans mb-4">
                This will lift all remaining active containment actions and generate a summary report. Are you sure you want to proceed?
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowLiftConfirm(false)}
                  className="px-4 py-2 rounded-lg border border-white/10 text-muted-foreground font-display text-xs uppercase tracking-widest hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={onLift}
                  disabled={isLiftPending}
                  className="px-6 py-2 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 font-display text-xs uppercase tracking-widest hover:bg-emerald-500/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isLiftPending ? (
                    <>
                      <div className="w-3 h-3 border-2 border-emerald-400/40 border-t-emerald-400 rounded-full animate-spin" />
                      Lifting...
                    </>
                  ) : (
                    <>
                      <Unlock className="w-3 h-3" />
                      Lift Lockdown
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
