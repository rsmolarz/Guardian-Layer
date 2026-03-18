import { useState } from "react";
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
  const [isScanOpen, setIsScanOpen] = useState(false);
  
  const { data, isLoading, isError } = useListTransactions({ 
    status: filter === "ALL" ? undefined : filter,
    limit: 100
  });

  return (
    <div className="pb-12">
      <PageHeader 
        title="Transaction Ledger" 
        description="Global stream of monetary movements analyzed by GuardianLayer ML models."
        action={
          <button 
            onClick={() => setIsScanOpen(true)}
            className="cyber-button px-6 py-3 bg-primary text-primary-foreground rounded-xl flex items-center shadow-[0_0_20px_rgba(6,182,212,0.4)] hover:shadow-[0_0_30px_rgba(6,182,212,0.6)]"
          >
            <Radar className="w-5 h-5 mr-2" />
            Scan Payload
          </button>
        }
      />

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
        <CyberLoading text="QUERYING LEDGER DATABASE..." />
      ) : isError || !data ? (
        <CyberError title="DATA CORRUPTION" message="Unable to read transaction stream." />
      ) : (
        <div className="glass-panel rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 bg-black/40 text-xs font-display uppercase tracking-widest text-muted-foreground">
                  <th className="px-6 py-4 font-semibold">ID</th>
                  <th className="px-6 py-4 font-semibold">Timestamp</th>
                  <th className="px-6 py-4 font-semibold">Vector (Src → Dest)</th>
                  <th className="px-6 py-4 font-semibold">Value</th>
                  <th className="px-6 py-4 font-semibold">Risk Factor</th>
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
                    <motion.tr 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      key={tx.id} 
                      className="hover:bg-white/5 transition-colors group"
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
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs border inline-block ${STATUS_COLORS[tx.status]}`}>
                          {tx.status}
                        </span>
                      </td>
                    </motion.tr>
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
            NEW SCAN PAYLOAD
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
              Abort
            </button>
            <button 
              type="submit" 
              disabled={scanMutation.isPending}
              className="cyber-button px-6 py-2 rounded-xl bg-primary text-primary-foreground text-sm flex items-center shadow-[0_0_15px_rgba(6,182,212,0.3)] disabled:opacity-50"
            >
              {scanMutation.isPending ? "Executing..." : "Execute Scan"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
