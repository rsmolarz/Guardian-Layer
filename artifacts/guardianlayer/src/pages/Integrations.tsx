import { useListIntegrations } from "@workspace/api-client-react";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { Plug2, CheckCircle2, AlertTriangle, XCircle, Database, Server, Mail, CreditCard, Network } from "lucide-react";

import { PageHeader } from "@/components/ui/PageHeader";
import { CyberLoading } from "@/components/ui/CyberLoading";
import { CyberError } from "@/components/ui/CyberError";

const PROVIDER_ICONS: Record<string, any> = {
  stripe: CreditCard,
  plaid: Database,
  cloudflare: Network,
  gmail: Mail,
  twilio: Server,
};

export default function Integrations() {
  const { data, isLoading, isError } = useListIntegrations();

  return (
    <div className="pb-12">
      <PageHeader 
        title="External Linkages" 
        description="Status of connected 3rd-party intelligence and operational APIs."
      />

      {isLoading ? (
        <CyberLoading text="PINGING EXTERNAL NODES..." />
      ) : isError || !data ? (
        <CyberError title="LINK FAULT" message="Cannot retrieve integration telemetry." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {data.integrations.map((int, idx) => {
            const Icon = PROVIDER_ICONS[int.provider.toLowerCase()] || Plug2;
            const isOnline = int.status === 'online';
            const isDegraded = int.status === 'degraded';
            
            return (
              <motion.div
                key={int.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="glass-panel p-6 rounded-2xl border border-white/5 relative overflow-hidden"
              >
                <div className={`absolute top-0 left-0 w-1 h-full ${
                  isOnline ? 'bg-emerald-500 shadow-[0_0_15px_#10b981]' : 
                  isDegraded ? 'bg-amber-500' : 'bg-rose-500'
                }`} />
                
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-display text-lg text-white font-bold">{int.name}</h3>
                      <span className="font-mono text-xs text-muted-foreground uppercase">{int.provider}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-black/30 rounded-xl p-4 border border-white/5 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-display uppercase tracking-widest text-muted-foreground block mb-1">Status</span>
                    <div className="flex items-center gap-2">
                      {isOnline ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> :
                       isDegraded ? <AlertTriangle className="w-4 h-4 text-amber-500" /> :
                       <XCircle className="w-4 h-4 text-rose-500" />}
                      <span className={`font-mono text-sm font-bold uppercase tracking-widest ${
                        isOnline ? 'text-emerald-500' : isDegraded ? 'text-amber-500' : 'text-rose-500'
                      }`}>
                        {int.status}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-display uppercase tracking-widest text-muted-foreground block mb-1">Last Sync</span>
                    <span className="font-mono text-xs text-white/80">{format(new Date(int.lastChecked), 'HH:mm:ss')}</span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
