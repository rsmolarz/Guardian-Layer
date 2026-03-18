import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { 
  useListTransactions, 
  useScanTransaction,
  TransactionStatus,
  getListTransactionsQueryKey
} from "@workspace/api-client-react";
import { format } from "date-fns";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { Radar, Filter, X, Zap } from "lucide-react";

import { PageHeader } from "@/components/ui/PageHeader";
import { CyberLoading } from "@/components/ui/CyberLoading";
import { CyberError } from "@/components/ui/CyberError";
import { STATUS_COLORS, getRiskColor } from "@/lib/constants";
import { useToast } from "@/hooks/use-toast";
import { UrgencyBadge } from "@/components/clarity/UrgencyIndicators";
import { WhyThisMatters } from "@/components/clarity/WhyThisMatters";
import { ExecutiveSummary } from "@/components/clarity/ExecutiveSummary";
import { ThreatExplainer } from "@/components/clarity/ThreatExplainer";
import { PlainEnglishThreatCard } from "@/components/clarity/PlainEnglishThreatCard";
import type { ThreatBreakdown } from "@/components/clarity/PlainEnglishThreatCard";

function getTransactionBreakdown(tx: { source: string; destination: string; amount: number; currency: string; riskScore: number; status: string }): ThreatBreakdown {
  const riskPct = (tx.riskScore * 100).toFixed(1);
  return {
    whatWeFound: `A ${tx.currency} ${tx.amount.toLocaleString()} transaction from "${tx.source}" to "${tx.destination}" with a risk score of ${riskPct}%.`,
    howWeFoundIt: "Our automated fraud scanner evaluates every transaction against known patterns of suspicious financial activity.",
    whereTheThreatIs: `The transaction path from "${tx.source}" to "${tx.destination}" — specifically the combination of amount, destination, and timing.`,
    whatThisMeans: tx.riskScore > 0.7
      ? "This transaction has a very high risk score. It closely matches patterns seen in fraud, money laundering, or unauthorized transfers."
      : tx.riskScore > 0.4
        ? "This transaction shows some suspicious patterns but hasn't been confirmed as fraudulent. It warrants a closer look."
        : "This transaction appears normal. Low risk scores indicate the transfer matches expected legitimate business patterns.",
    potentialImpact: tx.riskScore > 0.7
      ? "If this is fraud, the full amount could be lost. High-risk transactions may also indicate a broader compromise of financial systems."
      : "Low to moderate financial risk. Monitoring continues to catch any pattern changes.",
    whatCanBeDone: tx.status === "flagged"
      ? "Review this transaction on the Approvals page. You can approve it if legitimate or block it to prevent the transfer."
      : "No action needed right now. The system will continue monitoring for pattern changes.",
    howItsBeingHandled: tx.status === "flagged"
      ? "This transaction has been held for your review and will not proceed until you approve it."
      : tx.status === "blocked"
        ? "This transaction has been blocked and the funds are safe."
        : "The transaction has been processed. Continuous monitoring remains active.",
    recoverySteps: tx.riskScore > 0.7
      ? "If confirmed fraudulent: freeze the source account, initiate a chargeback, and file an incident report."
      : "No recovery needed at this time.",
  };
}

const scanSchema = z.object({
  source: z.string().min(1, "Source required"),
  destination: z.string().min(1, "Destination required"),
  amount: z.coerce.number().min(0.01, "Invalid amount"),
  currency: z.string().min(3, "Required").max(3).toUpperCase(),
  category: z.string().optional(),
  ipAddress: z.string().optional(),
  country: z.string().optional()
});

export default function Transactions() {
  const [filter, setFilter] = useState<TransactionStatus | "ALL">("ALL");
  const [expandedTx, setExpandedTx] = useState<number | null>(null);
  const [isScanOpen, setIsScanOpen] = useState(false);
  
  const { data, isLoading, isError } = useListTransactions({ 
    status: filter === "ALL" ? undefined : filter,
    limit: 100
  });

  return (
    <div className="pb-12">
      <PageHeader 
        title="Transaction Monitor" 
        description="Every financial transaction is automatically scanned for fraud and suspicious activity."
        action={
          <button 
            onClick={() => setIsScanOpen(true)}
            className="cyber-button px-6 py-3 bg-primary text-primary-foreground rounded-xl flex items-center shadow-[0_0_20px_rgba(6,182,212,0.4)] hover:shadow-[0_0_30px_rgba(6,182,212,0.6)]"
          >
            <Radar className="w-5 h-5 mr-2" />
            Check Transaction
          </button>
        }
      />

      <div className="mb-6 space-y-3">
        <WhyThisMatters explanation="This page monitors all financial transactions flowing through your systems. Each transaction gets a risk score — the higher the number, the more suspicious the activity. Flagged transactions are held for your review on the Approvals page." />
        <ExecutiveSummary
          title="Transaction Monitor"
          sections={[
            { heading: "What This Shows", content: "Every financial transaction is automatically scanned and assigned a risk score from 0% (safe) to 100% (highly suspicious). Transactions above a certain threshold are flagged for manual review." },
            { heading: "Risk Scores", content: "Green (0-30%) means normal activity. Yellow (30-70%) means some suspicious patterns were detected. Red (70-100%) means the transaction closely matches known fraud patterns." },
            { heading: "What to Do", content: "Review flagged transactions on the Approvals page. Click any transaction row to see a detailed breakdown of why it was scored the way it was. Use the 'Check Transaction' button to manually scan a specific transaction." },
          ]}
        />
      </div>

      <div className="mb-6 flex items-center gap-4 glass-panel p-2 rounded-xl inline-flex w-full md:w-auto overflow-x-auto">
        <div className="pl-4 pr-2 flex items-center text-muted-foreground border-r border-white/10 shrink-0">
          <Filter className="w-4 h-4 mr-2" />
          <span className="text-xs font-display uppercase tracking-widest">Filter</span>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => setFilter("ALL")}
            className={`px-4 py-2 rounded-lg text-sm font-mono transition-colors ${filter === "ALL" ? "bg-white/10 text-white" : "text-muted-foreground hover:text-white"}`}
          >
            ALL
          </button>
          {Object.values(TransactionStatus).map(status => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg text-sm font-mono transition-all ${filter === status ? STATUS_COLORS[status] : "text-muted-foreground hover:bg-white/5"}`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <CyberLoading text="Loading transaction history..." />
      ) : isError || !data ? (
        <CyberError title="Couldn't Load Transactions" message="We couldn't load your transaction history. Please try refreshing." />
      ) : (
        <div className="glass-panel rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 bg-black/40 text-xs font-display uppercase tracking-widest text-muted-foreground">
                  <th className="px-6 py-4 font-semibold">ID</th>
                  <th className="px-6 py-4 font-semibold">Timestamp</th>
                  <th className="px-6 py-4 font-semibold">From → To</th>
                  <th className="px-6 py-4 font-semibold">Amount</th>
                  <th className="px-6 py-4 font-semibold">Risk Level</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-mono text-sm">
                <AnimatePresence>
                  {data.transactions.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground italic">
                        No transactions found matching criteria.
                      </td>
                    </tr>
                  )}
                  {data.transactions.map((tx, idx) => (
                    <React.Fragment key={tx.id}>
                    <motion.tr 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="hover:bg-white/5 transition-colors group cursor-pointer"
                      onClick={() => setExpandedTx(expandedTx === tx.id ? null : tx.id)}
                    >
                      <td className="px-6 py-4 text-muted-foreground">#{tx.id}</td>
                      <td className="px-6 py-4 text-white/80">{format(new Date(tx.createdAt), 'MMM dd HH:mm:ss')}</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <span className="text-white truncate max-w-[200px]">{tx.source}</span>
                          <span className="text-muted-foreground text-xs">↳ {tx.destination}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-white">
                        {tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })} {tx.currency}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className={`font-bold ${getRiskColor(tx.riskScore)}`}>
                            {(tx.riskScore * 100).toFixed(1)}%
                          </div>
                          <div className="w-16 h-1.5 bg-black/50 rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${tx.riskScore > 0.7 ? 'bg-rose-500 shadow-[0_0_5px_#f43f5e]' : tx.riskScore > 0.3 ? 'bg-amber-400' : 'bg-emerald-400'}`} 
                              style={{ width: `${tx.riskScore * 100}%` }}
                            />
                          </div>
                          <UrgencyBadge severity={tx.riskScore > 0.7 ? "critical" : tx.riskScore > 0.4 ? "high" : tx.riskScore > 0.2 ? "medium" : "low"} />
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs border inline-block ${STATUS_COLORS[tx.status]}`}>
                          {tx.status}
                        </span>
                      </td>
                    </motion.tr>
                    {expandedTx === tx.id && (
                      <tr>
                        <td colSpan={6} className="px-6 py-4 bg-black/20">
                          <div className="space-y-3 max-w-4xl">
                            <ThreatExplainer
                              narrative={`This ${tx.currency} ${tx.amount.toLocaleString()} transfer from "${tx.source}" to "${tx.destination}" received a risk score of ${(tx.riskScore * 100).toFixed(1)}%. ${tx.riskScore > 0.7 ? "This is very high — the transaction closely matches known fraud patterns and has been flagged for your review." : tx.riskScore > 0.4 ? "Some suspicious patterns were detected. Worth investigating but not necessarily fraudulent." : "This looks like normal business activity. No action needed."}`}
                            />
                            <PlainEnglishThreatCard
                              breakdown={getTransactionBreakdown(tx)}
                              severity={tx.riskScore > 0.7 ? "act-now" : tx.riskScore > 0.4 ? "needs-attention" : tx.riskScore > 0.2 ? "monitor" : "all-clear"}
                            />
                          </div>
                        </td>
                      </tr>
                    )}
                    </React.Fragment>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Scan Modal */}
      <AnimatePresence>
        {isScanOpen && <ScanModal onClose={() => setIsScanOpen(false)} />}
      </AnimatePresence>
    </div>
  );
}

function ScanModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const scanMutation = useScanTransaction();
  
  const form = useForm<z.infer<typeof scanSchema>>({
    resolver: zodResolver(scanSchema),
    defaultValues: { amount: 0, currency: "USD" }
  });

  const onSubmit = (values: z.infer<typeof scanSchema>) => {
    scanMutation.mutate({ data: values }, {
      onSuccess: (result) => {
        queryClient.invalidateQueries({ queryKey: getListTransactionsQueryKey() });
        toast({
          title: "Scan Complete",
          description: `Transaction logged. Risk: ${(result.transaction.riskScore * 100).toFixed(1)}%`,
        });
        onClose();
      },
      onError: () => {
        toast({
          title: "Scan Failed",
          description: "Could not process the transaction payload.",
          variant: "destructive"
        });
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }} 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }} 
        animate={{ scale: 1, opacity: 1 }} 
        exit={{ scale: 0.95, opacity: 0 }} 
        className="relative w-full max-w-lg glass-panel border border-primary/30 rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(6,182,212,0.15)]"
      >
        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-black/20">
          <h2 className="font-display font-bold text-xl text-white flex items-center">
            <Zap className="w-5 h-5 text-primary mr-2" />
            Check a Transaction
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={form.handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-mono text-muted-foreground uppercase">Source Account</label>
              <input 
                {...form.register("source")} 
                className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2 font-mono text-sm text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all" 
                placeholder="0x..."
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-mono text-muted-foreground uppercase">Destination</label>
              <input 
                {...form.register("destination")} 
                className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2 font-mono text-sm text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all" 
                placeholder="0x..."
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-mono text-muted-foreground uppercase">Amount</label>
              <input 
                type="number" step="0.01"
                {...form.register("amount")} 
                className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2 font-mono text-sm text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all" 
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-mono text-muted-foreground uppercase">Currency</label>
              <input 
                {...form.register("currency")} 
                className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2 font-mono text-sm text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all uppercase" 
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-mono text-muted-foreground uppercase">IP Address (Opt)</label>
              <input 
                {...form.register("ipAddress")} 
                className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2 font-mono text-sm text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all" 
                placeholder="192.168.1.1"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-mono text-muted-foreground uppercase">Category (Opt)</label>
              <input 
                {...form.register("category")} 
                className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2 font-mono text-sm text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all" 
                placeholder="e-commerce"
              />
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <button 
              type="button" 
              onClick={onClose}
              className="px-6 py-2 rounded-xl text-sm font-display uppercase tracking-widest text-muted-foreground hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={scanMutation.isPending}
              className="cyber-button px-6 py-2 rounded-xl bg-primary text-primary-foreground text-sm flex items-center shadow-[0_0_15px_rgba(6,182,212,0.3)] disabled:opacity-50"
            >
              {scanMutation.isPending ? "Scanning..." : "Run Security Check"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
