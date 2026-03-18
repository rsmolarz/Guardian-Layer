import { useListIntegrations, useGetGoogleWorkspaceStatus, useGetStripeStatus, useSyncStripeTransactions, useConfigureIntegration, getListIntegrationsQueryKey, getGetStripeStatusQueryKey, getGetGoogleWorkspaceStatusQueryKey } from "@workspace/api-client-react";

interface StripeSyncResult {
  synced: number;
  skipped: number;
  errors: string[];
  message: string;
}

interface ConfigureIntegrationResult {
  id: string;
  name: string;
  status: string;
  message: string;
}
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AnimatePresence } from "framer-motion";
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
  HardDrive,
  Calendar,
  FileText,
  Table2,
  Lock,
  RefreshCw,
  Zap,
  X,
} from "lucide-react";
import { clsx } from "clsx";

import { PageHeader } from "@/components/ui/PageHeader";
import { CyberLoading } from "@/components/ui/CyberLoading";
import { CyberError } from "@/components/ui/CyberError";
import { AutoJargon } from "@/components/clarity/JargonTranslator";
import { WhyThisMatters } from "@/components/clarity/WhyThisMatters";
import { ExecutiveSummary } from "@/components/clarity/ExecutiveSummary";

import type { LucideIcon } from "lucide-react";

const PROVIDER_ICONS: Record<string, LucideIcon> = {
  stripe: CreditCard,
  plaid: Database,
  cloudflare: Network,
  gmail: Mail,
  twilio: Server,
  avg: Shield,
  incognito: Eye,
  deleteme: UserX,
  identityforce: Fingerprint,
  "google-workspace": Shield,
  "google-workspace-admin": Lock,
};

const GOOGLE_SERVICE_ICONS: Record<string, LucideIcon> = {
  Gmail: Mail,
  "Google Drive": HardDrive,
  "Google Calendar": Calendar,
  "Google Docs": FileText,
  "Google Sheets": Table2,
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

const STATUS_CONFIG: Record<string, { icon: LucideIcon; color: string; barColor: string; label: string }> = {
  online: { icon: CheckCircle2, color: "text-emerald-500", barColor: "bg-emerald-500 shadow-[0_0_15px_#10b981]", label: "ONLINE" },
  degraded: { icon: AlertTriangle, color: "text-amber-500", barColor: "bg-amber-500", label: "DEGRADED" },
  offline: { icon: XCircle, color: "text-rose-500", barColor: "bg-rose-500", label: "OFFLINE" },
  pending: { icon: Clock, color: "text-slate-400", barColor: "bg-slate-500 animate-pulse", label: "AWAITING CONFIG" },
};

export default function Integrations() {
  const { data, isLoading, isError } = useListIntegrations();
  const [configureId, setConfigureId] = useState<{ id: string; name: string; provider: string } | null>(null);

  if (isLoading) return <CyberLoading text="Loading connected services..." />;
  if (isError || !data) return <CyberError title="Couldn't Load Services" message="We couldn't load your connected services. Please try again." />;

  const active = data.integrations.filter((i) => i.status !== "pending");
  const pending = data.integrations.filter((i) => i.status === "pending");
  const hasGoogleWorkspace = active.some((i) => i.id === "google-workspace");
  const hasStripe = active.some((i) => i.id === "stripe");

  return (
    <div className="pb-12">
      <PageHeader
        title="Connected Services"
        description="View the status of all external services connected to your security platform — payments, identity protection, and more."
      />

      <div className="mb-6 space-y-3">
        <WhyThisMatters explanation="This page shows all external services connected to your security platform. Each service needs to be properly connected and monitored to ensure your defenses work together." />
        <ExecutiveSummary
          title="Connected Services"
          sections={[
            { heading: "What This Shows", content: "The status of all third-party services integrated with your security platform — payment processors, identity protection services, email providers, and more." },
            { heading: "Status Indicators", content: "Green (online) means the service is working correctly. Yellow (degraded) means it's partially working. Red (offline) means it's disconnected and needs attention. Gray means it hasn't been set up yet." },
            { heading: "What to Do", content: "Ensure all critical services show green. If any service is offline, check its API credentials or contact the service provider. You can configure new integrations by clicking on the available services below." },
          ]}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {active.map((int, idx) => (
          <IntegrationCard key={int.id} integration={int} index={idx} />
        ))}
      </div>

      {hasStripe && <StripePanel />}
      {hasGoogleWorkspace && <GoogleWorkspacePanel />}

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
              <IntegrationCard
                key={int.id}
                integration={int}
                index={active.length + idx}
                onConfigure={() => setConfigureId({ id: int.id, name: int.name, provider: int.provider })}
              />
            ))}
          </div>
        </>
      )}

      <AnimatePresence>
        {configureId && (
          <ConfigureModal
            integrationId={configureId.id}
            integrationName={configureId.name}
            provider={configureId.provider}
            onClose={() => setConfigureId(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function StripePanel() {
  const { data: status, isLoading: statusLoading } = useGetStripeStatus({
    query: { queryKey: getGetStripeStatusQueryKey(), refetchInterval: 30000 },
  });
  const syncMutation = useSyncStripeTransactions();
  const [syncResult, setSyncResult] = useState<StripeSyncResult | null>(null);

  const handleSync = () => {
    setSyncResult(null);
    syncMutation.mutate(undefined, {
      onSuccess: (data) => {
        setSyncResult(data as StripeSyncResult);
      },
    });
  };

  if (statusLoading || !status) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
      className="mt-8 glass-panel p-6 rounded-2xl border border-primary/10"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <CreditCard className="w-5 h-5 text-primary" />
          <h3 className="font-display text-sm uppercase tracking-widest text-primary">
            Stripe Transaction Sync
          </h3>
        </div>
        <div className="flex items-center gap-3">
          <span className={clsx(
            "font-mono text-xs uppercase tracking-wider px-2 py-0.5 rounded border",
            status.connected
              ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
              : "text-rose-400 bg-rose-500/10 border-rose-500/20"
          )}>
            {status.connected ? "Connected" : "Disconnected"}
          </span>
          {status.mode && (
            <span className="font-mono text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded uppercase">
              {status.mode} mode
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="p-4 rounded-xl bg-black/30 border border-white/5">
          <div className="text-[10px] font-display uppercase tracking-widest text-muted-foreground mb-1">Connection</div>
          <div className="flex items-center gap-2">
            {status.connected ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <XCircle className="w-4 h-4 text-rose-400" />
            )}
            <span className="font-mono text-sm text-foreground">
              {status.connected ? "API Key Valid" : (status.error || "Not configured")}
            </span>
          </div>
        </div>
        <div className="p-4 rounded-xl bg-black/30 border border-white/5">
          <div className="text-[10px] font-display uppercase tracking-widest text-muted-foreground mb-1">Account</div>
          <span className="font-mono text-sm text-foreground">
            {status.accountName || "Stripe Account"}
          </span>
        </div>
        <div className="p-4 rounded-xl bg-black/30 border border-white/5">
          <div className="text-[10px] font-display uppercase tracking-widest text-muted-foreground mb-1">Mode</div>
          <div className="flex items-center gap-2">
            <Zap className={clsx("w-4 h-4", status.mode === "live" ? "text-emerald-400" : "text-amber-400")} />
            <span className="font-mono text-sm text-foreground uppercase">
              {status.mode || "test"}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={handleSync}
          disabled={!status.connected || syncMutation.isPending}
          className={clsx(
            "flex items-center gap-2 px-6 py-3 rounded-xl font-display text-sm uppercase tracking-wider transition-all border",
            status.connected
              ? "bg-primary/10 border-primary/30 text-primary hover:bg-primary/20 hover:border-primary/50"
              : "bg-white/5 border-white/10 text-muted-foreground cursor-not-allowed"
          )}
        >
          <RefreshCw className={clsx("w-4 h-4", syncMutation.isPending && "animate-spin")} />
          {syncMutation.isPending ? "Syncing..." : "Sync Transactions from Stripe"}
        </button>

        {syncResult && (
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            className={clsx(
              "flex items-center gap-2 px-4 py-2 rounded-xl border font-mono text-xs",
              syncResult.synced > 0
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                : syncResult.errors.length > 0
                ? "bg-rose-500/10 border-rose-500/20 text-rose-400"
                : "bg-amber-500/10 border-amber-500/20 text-amber-400"
            )}
          >
            {syncResult.synced > 0 ? (
              <CheckCircle2 className="w-3.5 h-3.5" />
            ) : syncResult.errors.length > 0 ? (
              <XCircle className="w-3.5 h-3.5" />
            ) : (
              <AlertTriangle className="w-3.5 h-3.5" />
            )}
            {syncResult.message}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

function GoogleWorkspacePanel() {
  const { data, isLoading } = useGetGoogleWorkspaceStatus({
    query: { queryKey: getGetGoogleWorkspaceStatusQueryKey(), refetchInterval: 30000 },
  });

  if (isLoading || !data) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="mt-8 glass-panel p-6 rounded-2xl border border-primary/10"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Shield className="w-5 h-5 text-primary" />
          <h3 className="font-display text-sm uppercase tracking-widest text-primary">
            Google Workspace Protection — Live Status
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <span className={clsx(
            "font-mono text-sm font-bold",
            data.connectedCount === data.totalCount ? "text-emerald-400" : "text-amber-400"
          )}>
            {data.connectedCount}/{data.totalCount}
          </span>
          <span className="font-display text-xs uppercase tracking-wider text-muted-foreground">Services Connected</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {data.services.map((svc, i) => {
          const Icon = GOOGLE_SERVICE_ICONS[svc.service] || Shield;
          return (
            <motion.div
              key={svc.service}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 + i * 0.05 }}
              className={clsx(
                "p-4 rounded-xl border transition-colors",
                svc.connected
                  ? "bg-emerald-500/5 border-emerald-500/15 hover:border-emerald-500/30"
                  : "bg-rose-500/5 border-rose-500/15 hover:border-rose-500/30"
              )}
            >
              <div className="flex items-center gap-3 mb-3">
                <Icon className={clsx("w-5 h-5", svc.connected ? "text-emerald-400" : "text-rose-400")} />
                <div className="font-display text-sm text-foreground font-bold">{svc.service}</div>
              </div>
              <div className="flex items-center gap-1.5 mb-2">
                {svc.connected ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <XCircle className="w-3.5 h-3.5 text-rose-400" />
                )}
                <span className={clsx(
                  "font-mono text-xs uppercase tracking-wider",
                  svc.connected ? "text-emerald-400" : "text-rose-400"
                )}>
                  {svc.connected ? "Connected" : "Disconnected"}
                </span>
              </div>
              <div className="font-mono text-[10px] text-muted-foreground/60">
                {svc.permissions.length} permission{svc.permissions.length !== 1 ? "s" : ""}
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}

function ConfigureModal({
  integrationId,
  integrationName,
  provider,
  onClose,
}: {
  integrationId: string;
  integrationName: string;
  provider: string;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const configureMutation = useConfigureIntegration();
  const [apiKey, setApiKey] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [success, setSuccess] = useState<string | null>(null);

  const handleSave = () => {
    if (!apiKey.trim()) return;
    configureMutation.mutate(
      { id: integrationId, data: { apiKey, webhookUrl: webhookUrl || null, environment: null } },
      {
        onSuccess: (result) => {
          setSuccess((result as ConfigureIntegrationResult).message);
          queryClient.invalidateQueries({ queryKey: getListIntegrationsQueryKey() });
          setTimeout(onClose, 1500);
        },
      }
    );
  };

  const inputClass = "w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 font-mono text-sm text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all placeholder:text-white/20";

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
          <div>
            <h2 className="font-display font-bold text-lg text-white flex items-center gap-2">
              <Settings className="w-5 h-5 text-primary" />
              CONFIGURE {integrationName.toUpperCase()}
            </h2>
            <span className="font-mono text-xs text-muted-foreground">{provider}</span>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {success ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20"
            >
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span className="font-mono text-sm text-emerald-400">{success}</span>
            </motion.div>
          ) : (
            <>
              <div className="space-y-1.5">
                <label className="text-xs font-display uppercase tracking-widest text-muted-foreground">
                  API Key <span className="text-rose-400">*</span>
                </label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className={inputClass}
                  placeholder="Enter API key..."
                  autoFocus
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-display uppercase tracking-widest text-muted-foreground">
                  Webhook URL <span className="text-muted-foreground/50">(optional)</span>
                </label>
                <input
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  className={inputClass}
                  placeholder="https://..."
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-xl text-sm font-display uppercase tracking-widest text-muted-foreground hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={!apiKey.trim() || configureMutation.isPending}
                  className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-display uppercase tracking-wider flex items-center gap-2 shadow-[0_0_15px_rgba(6,182,212,0.3)] disabled:opacity-50 transition-all hover:shadow-[0_0_25px_rgba(6,182,212,0.5)]"
                >
                  {configureMutation.isPending ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <Plug2 className="w-4 h-4" />
                      Save & Connect
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}

function IntegrationCard({
  integration: int,
  index,
  onConfigure,
}: {
  integration: {
    id: string;
    name: string;
    provider: string;
    status: string;
    category: string;
    description: string;
    lastChecked: Date | string;
  };
  index: number;
  onConfigure?: () => void;
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
        <AutoJargon text={int.description} />
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
          <button
            onClick={onConfigure}
            className="mt-3 w-full py-2 rounded-lg bg-white/5 border border-white/10 hover:border-primary/30 hover:bg-primary/5 transition-all font-display text-xs uppercase tracking-wider text-muted-foreground hover:text-primary"
          >
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
