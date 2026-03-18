import { useQueryClient } from "@tanstack/react-query";
import { 
  useListTransactions, 
  useApproveTransaction, 
  useRejectTransaction,
  TransactionStatus,
  getListTransactionsQueryKey
} from "@workspace/api-client-react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X, ShieldAlert, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

import { PageHeader } from "@/components/ui/PageHeader";
import { CyberLoading } from "@/components/ui/CyberLoading";
import { CyberError } from "@/components/ui/CyberError";
import { getRiskColor } from "@/lib/constants";
import { UrgencyBadge } from "@/components/clarity/UrgencyIndicators";
import { ThreatExplainer } from "@/components/clarity/ThreatExplainer";
import { PlainEnglishThreatCard, getUrgencyFromSeverity } from "@/components/clarity/PlainEnglishThreatCard";
import { WhyThisMatters } from "@/components/clarity/WhyThisMatters";
import { ExecutiveSummary } from "@/components/clarity/ExecutiveSummary";

export default function Approvals() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const { data, isLoading, isError } = useListTransactions({ status: TransactionStatus.HELD });
  const approveMutation = useApproveTransaction();
  const rejectMutation = useRejectTransaction();

  const handleAction = (id: number, action: 'approve' | 'reject') => {
    const mutation = action === 'approve' ? approveMutation : rejectMutation;
    mutation.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListTransactionsQueryKey({ status: TransactionStatus.HELD }) });
        toast({
          title: `Transaction ${action === 'approve' ? 'Approved' : 'Rejected'}`,
          description: `Payload #${id} has been processed.`,
        });
      }
    });
  };

  return (
    <div className="pb-12">
      <PageHeader 
        title="Approval Queue" 
        description="Transactions that were flagged as potentially risky and need your review before processing."
      />

      <div className="mb-6 space-y-3">
        <WhyThisMatters explanation="These transactions were automatically flagged because they show unusual patterns — large amounts, high-risk countries, or suspicious categories. Your review ensures legitimate transactions proceed while fraudulent ones are blocked." />
        <ExecutiveSummary
          title="Approval Queue"
          sections={[
            { heading: "What This Shows", content: "Transactions that were automatically held because they exceeded your organization's risk thresholds. Each one needs a human decision before it can proceed." },
            { heading: "Your Role", content: "Review each transaction's source, destination, amount, and risk score. Approve legitimate transactions and block suspicious ones. Your decision is final — blocked transactions cannot be reversed." },
            { heading: "What to Do", content: "For each item: check if the sender and recipient are known parties, verify the amount is expected, and review the origin country. When in doubt, block the transaction — it's safer to investigate and resubmit than to allow potential fraud." },
          ]}
        />
      </div>

      {isLoading ? (
        <CyberLoading text="Loading items awaiting your review..." />
      ) : isError || !data ? (
        <CyberError title="Couldn't Load Review Queue" message="We couldn't load items waiting for review. Please try again." />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AnimatePresence>
            {data.transactions.length === 0 && (
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="col-span-full py-20 flex flex-col items-center justify-center text-muted-foreground glass-panel rounded-2xl border-dashed border-2 border-white/5"
              >
                <ShieldAlert className="w-12 h-12 mb-4 opacity-50" />
                <p className="font-mono text-sm tracking-widest uppercase">No items waiting for review.</p>
              </motion.div>
            )}
            {data.transactions.map((tx, idx) => (
              <motion.div
                key={tx.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: idx * 0.05 }}
                className="glass-panel p-6 rounded-2xl border border-amber-500/20 relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 blur-3xl rounded-full" />
                
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                      <span className="font-mono text-xs text-amber-500 tracking-widest uppercase">ID: {tx.id}</span>
                    </div>
                    <span className="text-2xl font-mono text-white font-bold block">
                      {tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })} <span className="text-muted-foreground">{tx.currency}</span>
                    </span>
                  </div>
                  <div className="text-right">
                    <span className={`text-2xl font-bold font-mono ${getRiskColor(tx.riskScore)} block drop-shadow-[0_0_8px_currentColor]`}>
                      {(tx.riskScore * 100).toFixed(1)}%
                    </span>
                    <span className="text-[10px] uppercase font-display tracking-widest text-muted-foreground">Risk Level</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6 bg-black/40 p-4 rounded-xl border border-white/5">
                  <div>
                    <span className="text-[10px] font-display uppercase tracking-widest text-muted-foreground block mb-1">Source</span>
                    <span className="font-mono text-sm text-white/90 truncate block">{tx.source}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-display uppercase tracking-widest text-muted-foreground block mb-1">Destination</span>
                    <span className="font-mono text-sm text-white/90 truncate block">{tx.destination}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-display uppercase tracking-widest text-muted-foreground block mb-1">Timestamp</span>
                    <span className="font-mono text-sm text-white/70 block">{format(new Date(tx.createdAt), 'MMM dd HH:mm')}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-display uppercase tracking-widest text-muted-foreground block mb-1">IP Location</span>
                    <span className="font-mono text-sm text-white/70 block">{tx.ipAddress || 'Unknown'} / {tx.country || 'N/A'}</span>
                  </div>
                </div>

                <div className="mb-4">
                  <UrgencyBadge severity={tx.riskScore > 0.7 ? "critical" : tx.riskScore > 0.4 ? "high" : "medium"} showExplanation />
                </div>
                <div className="mb-4 space-y-2">
                  <ThreatExplainer
                    narrative={`This ${tx.amount.toLocaleString()} ${tx.currency} transaction from "${tx.source}" to "${tx.destination}" was flagged with a ${(tx.riskScore * 100).toFixed(0)}% risk score. ${tx.riskScore > 0.7 ? "This is a high-risk transaction that should be carefully reviewed before approving." : "This transaction has some suspicious characteristics. Review the details to decide if it should proceed."} ${tx.country ? `Origin: ${tx.country}.` : ""}`}
                  />
                  <PlainEnglishThreatCard
                    breakdown={{
                      whatWeFound: `A ${tx.amount.toLocaleString()} ${tx.currency} transaction from "${tx.source}" to "${tx.destination}" was flagged as potentially risky with a ${(tx.riskScore * 100).toFixed(0)}% risk score.`,
                      howWeFoundIt: `Our ML risk scoring system analyzed the transaction amount, destination, ${tx.country ? `origin country (${tx.country}),` : ""} and category to calculate this risk score.`,
                      whereTheThreatIs: `Source: ${tx.source}. Destination: ${tx.destination}. ${tx.ipAddress ? `IP: ${tx.ipAddress}.` : ""} ${tx.country ? `Country: ${tx.country}.` : ""}`,
                      whatThisMeans: tx.riskScore > 0.7 ? "This transaction has multiple high-risk indicators and could be fraudulent." : "This transaction triggered our risk threshold but may be legitimate.",
                      potentialImpact: "If fraudulent, this could result in direct financial loss. If legitimate, blocking it could disrupt business operations.",
                      whatCanBeDone: "Review the source, destination, amount, and origin. If you recognize the parties and the amount seems appropriate, approve it. Otherwise, block it.",
                      howItsBeingHandled: "This transaction is currently held and cannot be processed until you approve or block it.",
                      recoverySteps: "1. Verify the sender and recipient are known. 2. Confirm the amount is expected. 3. Check if the origin country matches expected activity. 4. Approve or block based on your assessment.",
                    }}
                    severity={getUrgencyFromSeverity(tx.riskScore > 0.7 ? "critical" : tx.riskScore > 0.4 ? "high" : "medium")}
                  />
                </div>

                <div className="flex gap-3 mt-4">
                  <button
                    onClick={() => handleAction(tx.id, 'reject')}
                    disabled={rejectMutation.isPending || approveMutation.isPending}
                    className="flex-1 py-3 rounded-xl border border-rose-500/30 text-rose-400 font-display uppercase tracking-widest text-sm font-bold flex items-center justify-center hover:bg-rose-500/10 transition-colors disabled:opacity-50"
                  >
                    <X className="w-4 h-4 mr-2" /> Block
                  </button>
                  <button
                    onClick={() => handleAction(tx.id, 'approve')}
                    disabled={rejectMutation.isPending || approveMutation.isPending}
                    className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-display uppercase tracking-widest text-sm font-bold flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.3)] hover:shadow-[0_0_25px_rgba(6,182,212,0.5)] transition-shadow disabled:opacity-50"
                  >
                    <Check className="w-4 h-4 mr-2" /> Allow
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
