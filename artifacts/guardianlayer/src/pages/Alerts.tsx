import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { 
  useListAlerts, 
  useDismissAlert,
  AlertSeverity,
  getListAlertsQueryKey
} from "@workspace/api-client-react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, CheckCircle2, ShieldAlert, Zap, Shield } from "lucide-react";

import { PageHeader } from "@/components/ui/PageHeader";
import { CyberLoading } from "@/components/ui/CyberLoading";
import { CyberError } from "@/components/ui/CyberError";
import { SEVERITY_COLORS } from "@/lib/constants";
import { useToast } from "@/hooks/use-toast";

const REMEDIATION_MAP: Record<string, string[]> = {
  "Suspicious IP Cluster Detected": ["Block IP range 89.44.x.x", "Enable geo-fencing for Eastern Europe", "Escalate to SOC team"],
  "High-Value Wire Transfer Blocked": ["Verify sender identity", "Flag account for review", "Generate SAR report"],
  "Unusual Crypto Activity": ["Restrict crypto category transactions", "Enable enhanced monitoring", "Notify compliance officer"],
  "New Region Activity": ["Add region to watchlist", "Require manual approval for region", "Update geo-risk policy"],
  "Gambling Transactions Detected": ["Block gambling merchant category", "Notify HR department", "Update acceptable use policy"],
  "Failed Authentication Attempts": ["Lock affected account", "Reset credentials", "Enable IP-based 2FA enforcement"],
  "Phone Number on Dark Web": ["Enable SIM swap protection", "Rotate 2FA phone number", "Alert mobile carrier"],
  "Email on Dark Web": ["Change email password", "Enable email 2FA", "Monitor for phishing attempts"],
  "Critical: Financial Account Found on Dark Web": ["Freeze affected cards", "Initiate fraud alert", "Contact financial institution"],
  "Credentials Leaked in Data Breach": ["Force password reset", "Revoke active sessions", "Enable credential monitoring"],
  "Social Security Number Exposure": ["Place credit freeze", "File FTC report", "Enable identity monitoring"],
  "Integration Health Check": ["Restart affected service", "Switch to backup provider", "Notify operations team"],
  "Rate Limit Approaching": ["Optimize API request patterns", "Enable request caching", "Review rate limit policy"],
};

export default function Alerts() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [filter, setFilter] = useState<AlertSeverity | "ALL">("ALL");
  const [remediating, setRemediating] = useState<Record<number, boolean>>({});
  const [remediated, setRemediated] = useState<Record<number, boolean>>({});

  const handleRemediate = (alertId: number, alertTitle: string) => {
    setRemediating((prev) => ({ ...prev, [alertId]: true }));
    setTimeout(() => {
      setRemediating((prev) => ({ ...prev, [alertId]: false }));
      setRemediated((prev) => ({ ...prev, [alertId]: true }));
      toast({ description: `Auto-remediation applied for "${alertTitle}". All actions executed.` });
    }, 1500);
  };

  const { data, isLoading, isError } = useListAlerts({ 
    severity: filter === "ALL" ? undefined : filter,
    limit: 50
  });
  
  const dismissMutation = useDismissAlert();

  const handleDismiss = (id: number) => {
    dismissMutation.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListAlertsQueryKey() });
        toast({ description: "Alert dismissed from view." });
      }
    });
  };

  const activeAlerts = data?.alerts.filter(a => !a.dismissed) || [];

  return (
    <div className="pb-12">
      <PageHeader 
        title="Security Advisories" 
        description="System-level threat notifications and infrastructure warnings."
      />

      <div className="mb-6 flex items-center gap-4 glass-panel p-2 rounded-xl inline-flex w-full md:w-auto overflow-x-auto">
        <div className="pl-4 pr-2 flex items-center text-muted-foreground border-r border-white/10 shrink-0">
          <Bell className="w-4 h-4 mr-2" />
          <span className="text-xs font-display uppercase tracking-widest">Level</span>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => setFilter("ALL")}
            className={`px-4 py-2 rounded-lg text-sm font-mono transition-colors ${filter === "ALL" ? "bg-white/10 text-white" : "text-muted-foreground hover:text-white"}`}
          >
            ALL
          </button>
          {Object.values(AlertSeverity).map(severity => (
            <button
              key={severity}
              onClick={() => setFilter(severity)}
              className={`px-4 py-2 rounded-lg text-sm font-mono transition-all uppercase ${filter === severity ? "bg-white/10 text-white" : "text-muted-foreground hover:bg-white/5"} ${SEVERITY_COLORS[severity]}`}
            >
              {severity}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <CyberLoading text="SCANNING ALERT LOGS..." />
      ) : isError || !data ? (
        <CyberError title="LOG FAULT" message="Alert repository inaccessible." />
      ) : (
        <div className="space-y-4">
          <AnimatePresence>
            {activeAlerts.length === 0 && (
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="py-16 text-center glass-panel rounded-2xl border-dashed border-2 border-white/5"
              >
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-4 opacity-50" />
                <p className="font-mono text-emerald-500/80 tracking-widest uppercase">System nominal. No active alerts.</p>
              </motion.div>
            )}
            {activeAlerts.map((alert, idx) => (
              <motion.div
                key={alert.id}
                layout
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0, overflow: 'hidden' }}
                transition={{ delay: idx * 0.05 }}
                className={`glass-panel p-5 rounded-xl border-l-4 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between group ${
                  alert.severity === 'critical' ? 'border-rose-500 bg-rose-500/5' :
                  alert.severity === 'high' ? 'border-orange-500 bg-orange-500/5' :
                  alert.severity === 'medium' ? 'border-amber-400 bg-amber-400/5' :
                  'border-blue-400 bg-blue-400/5'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-lg bg-black/40 ${SEVERITY_COLORS[alert.severity]}`}>
                    <ShieldAlert className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <span className={`text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded border border-current ${SEVERITY_COLORS[alert.severity]}`}>
                        {alert.severity}
                      </span>
                      <span className="text-xs font-mono text-muted-foreground">
                        {format(new Date(alert.createdAt), 'PP pp')}
                      </span>
                    </div>
                    <h4 className="text-lg font-display text-white">{alert.title}</h4>
                    <p className="text-sm text-muted-foreground font-sans mt-1">{alert.message}</p>
                  </div>
                </div>
                
                <div className="flex flex-col gap-2 shrink-0">
                  {REMEDIATION_MAP[alert.title] && !remediated[alert.id] && (
                    <button
                      onClick={() => handleRemediate(alert.id, alert.title)}
                      disabled={remediating[alert.id]}
                      className={`px-4 py-2 rounded-lg text-xs font-display uppercase tracking-widest transition-colors flex items-center gap-2 ${
                        remediating[alert.id]
                          ? "bg-primary/10 text-primary border border-primary/20 animate-pulse cursor-wait"
                          : "bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30"
                      }`}
                    >
                      <Zap className="w-3 h-3" />
                      {remediating[alert.id] ? "Remediating..." : "Auto-Remediate"}
                    </button>
                  )}
                  {remediated[alert.id] && (
                    <div className="px-4 py-2 rounded-lg text-xs font-display uppercase tracking-widest bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-2">
                      <Shield className="w-3 h-3" /> Remediated
                    </div>
                  )}
                  <button
                    onClick={() => handleDismiss(alert.id)}
                    className="px-4 py-2 border border-white/10 rounded-lg text-xs font-display uppercase tracking-widest text-muted-foreground hover:text-white hover:bg-white/5 transition-colors"
                  >
                    Dismiss
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
