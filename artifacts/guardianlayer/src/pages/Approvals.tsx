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
        title="Manual Override Queue" 
        description="Transactions flagged by ML models requiring human-in-the-loop authorization."
      />

      {isLoading ? (
        <CyberLoading text="FETCHING HELD PAYLOADS..." />
      ) : isError || !data ? (
        <CyberError title="QUEUE FAULT" message="Unable to load approval queue." />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AnimatePresence>
            {data.transactions.length === 0 && (
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="col-span-full py-20 flex flex-col items-center justify-center text-muted-foreground glass-panel rounded-2xl border-dashed border-2 border-white/5"
              >
                <ShieldAlert className="w-12 h-12 mb-4 opacity-50" />
                <p className="font-mono text-sm tracking-widest uppercase">Zero pending approvals.</p>
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
                    <span className="text-[10px] uppercase font-display tracking-widest text-muted-foreground">Risk Vector</span>
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
