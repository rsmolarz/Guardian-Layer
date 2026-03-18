import { useListIntegrations } from "@workspace/api-client-react";
import { format } from "date-fns";
import { motion } from "framer-motion";
import {
  Plug2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Database,
  Server,
  Mail,
  CreditCard,
  Network,
  Shield,
  UserX,
  Fingerprint,
  Eye,
  Clock,
  Settings,
} from "lucide-react";
import { clsx } from "clsx";

import { PageHeader } from "@/components/ui/PageHeader";
import { CyberLoading } from "@/components/ui/CyberLoading";
import { CyberError } from "@/components/ui/CyberError";

const PROVIDER_ICONS: Record<string, any> = {
  stripe: CreditCard,
  plaid: Database,
  cloudflare: Network,
  gmail: Mail,
  twilio: Server,
  avg: Shield,
  incognito: Eye,
  deleteme: UserX,
  identityforce: Fingerprint,
};

const CATEGORY_LABELS: Record<string, string> = {
  payments: "Payments",
  banking: "Banking",
  security: "Security",
  notifications: "Notifications",
  sms: "SMS",
  identity_protection: "Identity Protection",
  privacy: "Privacy",
};

const CATEGORY_COLORS: Record<string, string> = {
  payments: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  banking: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  security: "bg-rose-500/10 text-rose-400 border-rose-500/20",
  notifications: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  sms: "bg-violet-500/10 text-violet-400 border-violet-500/20",
  identity_protection: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  privacy: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
};

const STATUS_CONFIG: Record<string, { icon: any; color: string; barColor: string; label: string }> = {
  online: { icon: CheckCircle2, color: "text-emerald-500", barColor: "bg-emerald-500 shadow-[0_0_15px_#10b981]", label: "ONLINE" },
  degraded: { icon: AlertTriangle, color: "text-amber-500", barColor: "bg-amber-500", label: "DEGRADED" },
  offline: { icon: XCircle, color: "text-rose-500", barColor: "bg-rose-500", label: "OFFLINE" },
  pending: { icon: Clock, color: "text-slate-400", barColor: "bg-slate-500 animate-pulse", label: "AWAITING CONFIG" },
};

export default function Integrations() {
  const { data, isLoading, isError } = useListIntegrations();

  if (isLoading) return <CyberLoading text="PINGING EXTERNAL NODES..." />;
  if (isError || !data) return <CyberError title="LINK FAULT" message="Cannot retrieve integration telemetry." />;

  const active = data.integrations.filter((i) => i.status !== "pending");
  const pending = data.integrations.filter((i) => i.status === "pending");

  return (
    <div className="pb-12">
      <PageHeader
        title="External Linkages"
        description="Status of connected 3rd-party intelligence, identity protection, and operational APIs."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {active.map((int, idx) => (
          <IntegrationCard key={int.id} integration={int} index={idx} />
        ))}
      </div>

      {pending.length > 0 && (
        <>
          <div className="mt-12 mb-6 flex items-center gap-3">
            <Settings className="w-5 h-5 text-slate-400" />
            <h2 className="font-display text-lg uppercase tracking-widest text-slate-400">
              Available Integrations
            </h2>
            <div className="flex-1 h-px bg-white/5" />
            <span className="font-mono text-xs text-muted-foreground">{pending.length} awaiting configuration</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {pending.map((int, idx) => (
              <IntegrationCard key={int.id} integration={int} index={active.length + idx} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function IntegrationCard({
  integration: int,
  index,
}: {
  integration: {
    id: string;
    name: string;
    provider: string;
    status: string;
    category: string;
    description: string;
    lastChecked: Date;
  };
  index: number;
}) {
  const Icon = PROVIDER_ICONS[int.id] || Plug2;
  const status = STATUS_CONFIG[int.status] || STATUS_CONFIG.offline;
  const StatusIcon = status.icon;
  const isPending = int.status === "pending";
  const catLabel = CATEGORY_LABELS[int.category] || int.category;
  const catColor = CATEGORY_COLORS[int.category] || "bg-white/5 text-muted-foreground border-white/10";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
      className={clsx(
        "glass-panel p-6 rounded-2xl border relative overflow-hidden group transition-colors",
        isPending ? "border-white/5 hover:border-slate-500/30" : "border-white/5 hover:border-primary/20"
      )}
    >
      <div className={clsx("absolute top-0 left-0 w-1 h-full", status.barColor)} />

      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-4">
          <div className={clsx(
            "p-3 rounded-xl border",
            isPending ? "bg-white/[0.03] border-white/5" : "bg-white/5 border-white/10"
          )}>
            <Icon className={clsx("w-6 h-6", isPending ? "text-slate-400" : "text-white")} />
          </div>
          <div>
            <h3 className={clsx("font-display text-lg font-bold", isPending ? "text-slate-300" : "text-white")}>
              {int.name}
            </h3>
            <span className="font-mono text-xs text-muted-foreground uppercase">{int.provider}</span>
          </div>
        </div>
      </div>

      <div className="mb-4">
        <span className={clsx("px-2 py-0.5 rounded text-[10px] font-display uppercase tracking-wider border", catColor)}>
          {catLabel}
        </span>
      </div>

      <p className="font-mono text-xs text-muted-foreground mb-5 leading-relaxed min-h-[2.5rem]">
        {int.description}
      </p>

      {isPending ? (
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/30">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-display text-xs uppercase tracking-widest text-slate-400">Configuration Required</span>
          </div>
          <p className="font-mono text-[11px] text-slate-500 leading-relaxed">
            Provide API credentials to activate this integration. Contact your {int.provider} account representative for enterprise API access.
          </p>
          <button className="mt-3 w-full py-2 rounded-lg bg-white/5 border border-white/10 hover:border-primary/30 hover:bg-primary/5 transition-all font-display text-xs uppercase tracking-wider text-muted-foreground hover:text-primary">
            Configure Connection
          </button>
        </div>
      ) : (
        <div className="bg-black/30 rounded-xl p-4 border border-white/5 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-display uppercase tracking-widest text-muted-foreground block mb-1">Status</span>
            <div className="flex items-center gap-2">
              <StatusIcon className={clsx("w-4 h-4", status.color)} />
              <span className={clsx("font-mono text-sm font-bold uppercase tracking-widest", status.color)}>
                {status.label}
              </span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-display uppercase tracking-widest text-muted-foreground block mb-1">Last Sync</span>
            <span className="font-mono text-xs text-white/80">{format(new Date(int.lastChecked), 'HH:mm:ss')}</span>
          </div>
        </div>
      )}
    </motion.div>
  );
}
