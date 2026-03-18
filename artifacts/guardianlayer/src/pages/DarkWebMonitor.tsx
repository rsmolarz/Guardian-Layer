import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListDarkWebExposures,
  useListRecoveryActions,
  useGetDarkWebSummary,
  useToggleRecoveryAction,
  getListRecoveryActionsQueryKey,
  getGetDarkWebSummaryQueryKey,
  DarkWebExposureSeverity,
  ListRecoveryActionsCategory,
  type DarkWebExposureList,
  type DarkWebExposure,
  type RecoveryActionList,
  type RecoveryAction,
  type DarkWebSummary,
} from "@workspace/api-client-react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import {
  Eye,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronUp,
  Globe,
  CreditCard,
  Mail,
  Key,
  Phone,
  Fingerprint,
  Lock,
  FileText,
  Scale,
} from "lucide-react";

import { PageHeader } from "@/components/ui/PageHeader";
import { CyberLoading } from "@/components/ui/CyberLoading";
import { CyberError } from "@/components/ui/CyberError";
import { SEVERITY_COLORS } from "@/lib/constants";
import { useToast } from "@/hooks/use-toast";
import { WhyThisMatters } from "@/components/clarity/WhyThisMatters";
import { UrgencyBadge } from "@/components/clarity/UrgencyIndicators";
import { PlainEnglishThreatCard, getUrgencyFromSeverity } from "@/components/clarity/PlainEnglishThreatCard";
import { ThreatExplainer } from "@/components/clarity/ThreatExplainer";
import { ExecutiveSummary } from "@/components/clarity/ExecutiveSummary";
import { RiskImpactCalculator } from "@/components/clarity/RiskImpactCalculator";
import { AutoJargon } from "@/components/clarity/JargonTranslator";

const DATA_TYPE_ICONS: Record<string, typeof ShieldAlert> = {
  SSN: Fingerprint,
  Email: Mail,
  Credentials: Key,
  "Financial Account": CreditCard,
  "Phone Number": Phone,
};

const DATA_TYPE_COLORS: Record<string, string> = {
  SSN: "text-rose-500",
  Email: "text-amber-400",
  Credentials: "text-orange-500",
  "Financial Account": "text-rose-400",
  "Phone Number": "text-cyan-400",
};

const STATUS_BADGE: Record<string, string> = {
  active: "bg-rose-500/20 text-rose-400 border-rose-500/30",
  monitoring: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  resolved: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
};

const CATEGORY_ICONS: Record<string, typeof Lock> = {
  credit_protection: Lock,
  account_security: ShieldCheck,
  legal_reporting: Scale,
};

const CATEGORY_LABELS: Record<string, string> = {
  credit_protection: "Credit Protection",
  account_security: "Account Security",
  legal_reporting: "Legal & Reporting",
};

type Tab = "exposures" | "recovery";

export default function DarkWebMonitor() {
  const [tab, setTab] = useState<Tab>("exposures");
  const [expandedExposure, setExpandedExposure] = useState<number | null>(null);
  const [severityFilter, setSeverityFilter] = useState<DarkWebExposureSeverity | "ALL">("ALL");
  const [categoryFilter, setCategoryFilter] = useState<ListRecoveryActionsCategory | "ALL">("ALL");

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: summary, isLoading: isSummaryLoading } = useGetDarkWebSummary();
  const { data: exposuresData, isLoading: isExposuresLoading, isError: isExposuresError } = useListDarkWebExposures({
    severity: severityFilter === "ALL" ? undefined : severityFilter,
  });
  const { data: actionsData, isLoading: isActionsLoading } = useListRecoveryActions({
    category: categoryFilter === "ALL" ? undefined : categoryFilter,
  });

  const toggleMutation = useToggleRecoveryAction();

  const handleToggle = (id: number) => {
    toggleMutation.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListRecoveryActionsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDarkWebSummaryQueryKey() });
        toast({ description: "Recovery action updated." });
      },
    });
  };

  if (isSummaryLoading) return <CyberLoading text="Checking for exposed data..." />;

  const globalProgress = summary?.recoveryProgress ?? 0;

  return (
    <div className="pb-12">
      <PageHeader
        title="Data Exposure Monitor"
        description="We scan hidden parts of the internet for your stolen personal data — passwords, credit cards, and identity information."
      />

      <div className="mb-8">
        <ExecutiveSummary
          title="Data Exposure"
          sections={[
            { heading: "Current Status", content: `${summary?.totalExposures ?? 0} total data exposures found, with ${summary?.activeExposures ?? 0} currently active and ${summary?.criticalExposures ?? 0} requiring immediate attention.` },
            { heading: "Recovery Progress", content: `${globalProgress}% of recovery actions have been completed. Continue working through the recovery checklist to protect your accounts and identity.` },
            { heading: "What This Means", content: summary?.criticalExposures ? "Critical personal data has been found on dark web marketplaces. Follow the recovery steps to minimize damage — the sooner you act, the less impact it will have." : "No critical exposures found. Continue monitoring and keep your passwords updated regularly." },
          ]}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total Exposures", value: summary?.totalExposures ?? 0, icon: Globe, color: "text-primary" },
          { label: "Active Threats", value: summary?.activeExposures ?? 0, icon: AlertTriangle, color: "text-rose-500" },
          { label: "Critical", value: summary?.criticalExposures ?? 0, icon: ShieldAlert, color: "text-rose-400 animate-pulse-glow" },
          { label: "Recovery Progress", value: `${globalProgress}%`, icon: ShieldCheck, color: "text-emerald-400" },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="glass-panel p-5 rounded-xl relative overflow-hidden group hover:border-primary/30 transition-colors"
          >
            <div className={`absolute top-0 right-0 p-3 opacity-10 ${stat.color} group-hover:scale-150 transition-transform duration-700`}>
              <stat.icon className="w-16 h-16" />
            </div>
            <span className="font-display uppercase text-[10px] tracking-widest text-muted-foreground block mb-2">{stat.label}</span>
            <span className="text-3xl font-mono font-bold text-foreground">{stat.value}</span>
          </motion.div>
        ))}
      </div>

      <div className="mb-6 flex items-center gap-2 glass-panel p-1.5 rounded-xl inline-flex">
        <button
          onClick={() => setTab("exposures")}
          className={`px-6 py-2.5 rounded-lg text-sm font-display uppercase tracking-widest transition-all flex items-center gap-2 ${
            tab === "exposures" ? "bg-primary/15 text-primary border border-primary/20" : "text-muted-foreground hover:text-white hover:bg-white/5"
          }`}
        >
          <Eye className="w-4 h-4" />
          Exposures
        </button>
        <button
          onClick={() => setTab("recovery")}
          className={`px-6 py-2.5 rounded-lg text-sm font-display uppercase tracking-widest transition-all flex items-center gap-2 ${
            tab === "recovery" ? "bg-primary/15 text-primary border border-primary/20" : "text-muted-foreground hover:text-white hover:bg-white/5"
          }`}
        >
          <FileText className="w-4 h-4" />
          Recovery Center
          {actionsData && actionsData.total > 0 && (
            <span className="text-[10px] font-mono bg-white/10 px-2 py-0.5 rounded">{actionsData.completedCount}/{actionsData.total}</span>
          )}
        </button>
      </div>

      {tab === "exposures" && (
        <ExposuresTab
          exposuresData={exposuresData}
          isLoading={isExposuresLoading}
          isError={isExposuresError}
          severityFilter={severityFilter}
          setSeverityFilter={setSeverityFilter}
          expandedExposure={expandedExposure}
          setExpandedExposure={setExpandedExposure}
        />
      )}

      {tab === "recovery" && (
        <RecoveryTab
          actionsData={actionsData}
          isLoading={isActionsLoading}
          categoryFilter={categoryFilter}
          setCategoryFilter={setCategoryFilter}
          onToggle={handleToggle}
          globalProgress={globalProgress}
          summary={summary}
        />
      )}
    </div>
  );
}

function ExposuresTab({
  exposuresData,
  isLoading,
  isError,
  severityFilter,
  setSeverityFilter,
  expandedExposure,
  setExpandedExposure,
}: {
  exposuresData: DarkWebExposureList | undefined;
  isLoading: boolean;
  isError: boolean;
  severityFilter: DarkWebExposureSeverity | "ALL";
  setSeverityFilter: (s: DarkWebExposureSeverity | "ALL") => void;
  expandedExposure: number | null;
  setExpandedExposure: (id: number | null) => void;
}) {
  return (
    <div>
      <div className="mb-6 flex items-center gap-4 glass-panel p-2 rounded-xl inline-flex w-full md:w-auto overflow-x-auto">
        <div className="pl-4 pr-2 flex items-center text-muted-foreground border-r border-white/10 shrink-0">
          <ShieldAlert className="w-4 h-4 mr-2" />
          <span className="text-xs font-display uppercase tracking-widest">Severity</span>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => setSeverityFilter("ALL")}
            className={`px-4 py-2 rounded-lg text-sm font-mono transition-colors ${severityFilter === "ALL" ? "bg-white/10 text-white" : "text-muted-foreground hover:text-white"}`}
          >
            ALL
          </button>
          {Object.values(DarkWebExposureSeverity).map(sev => (
            <button
              key={sev}
              onClick={() => setSeverityFilter(sev)}
              className={`px-4 py-2 rounded-lg text-sm font-mono transition-all uppercase ${severityFilter === sev ? "bg-white/10 text-white" : "text-muted-foreground hover:bg-white/5"} ${SEVERITY_COLORS[sev] || ""}`}
            >
              {sev}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <CyberLoading text="Loading exposure details..." />
      ) : isError || !exposuresData ? (
        <CyberError title="Couldn't Load Scan Results" message="We couldn't load exposure data. Please try again." />
      ) : exposuresData.exposures.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-16 text-center glass-panel rounded-2xl border-dashed border-2 border-white/5">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-4 opacity-50" />
          <p className="font-mono text-emerald-500/80 tracking-widest uppercase">No exposures found matching current filters.</p>
        </motion.div>
      ) : (
        <div className="space-y-4">
          <AnimatePresence>
            {exposuresData.exposures.map((exposure: DarkWebExposure, idx: number) => {
              const Icon = DATA_TYPE_ICONS[exposure.dataType] || ShieldAlert;
              const iconColor = DATA_TYPE_COLORS[exposure.dataType] || "text-primary";
              const isExpanded = expandedExposure === exposure.id;
              let actions: string[] = [];
              try { actions = JSON.parse(exposure.recommendedActions); } catch { /* ignore parse errors */ }

              return (
                <motion.div
                  key={exposure.id}
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className={`glass-panel rounded-xl border-l-4 overflow-hidden ${
                    exposure.severity === "critical" ? "border-rose-500 bg-rose-500/5" :
                    exposure.severity === "high" ? "border-orange-500 bg-orange-500/5" :
                    exposure.severity === "medium" ? "border-amber-400 bg-amber-400/5" :
                    "border-blue-400 bg-blue-400/5"
                  }`}
                >
                  <div
                    className="p-5 cursor-pointer flex flex-col md:flex-row gap-4 items-start md:items-center justify-between group"
                    onClick={() => setExpandedExposure(isExpanded ? null : exposure.id)}
                  >
                    <div className="flex items-start gap-4 flex-1">
                      <div className={`p-3 rounded-lg bg-black/40 ${iconColor}`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1 flex-wrap">
                          <UrgencyBadge severity={exposure.severity} />
                          <span className={`text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded border ${STATUS_BADGE[exposure.status] || ""}`}>
                            {exposure.status}
                          </span>
                          <span className="text-xs font-mono text-muted-foreground">
                            {format(new Date(exposure.discoveryDate), "PP")}
                          </span>
                        </div>
                        <h4 className="text-lg font-display text-white">
                          {exposure.dataType} <span className="text-muted-foreground font-sans text-sm">— {exposure.sourceMarketplace}</span>
                        </h4>
                        <p className="text-sm text-muted-foreground font-sans mt-1 line-clamp-2"><AutoJargon text={exposure.description} /></p>
                      </div>
                    </div>
                    <div className="shrink-0 text-muted-foreground group-hover:text-white transition-colors">
                      {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </div>
                  </div>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="px-5 pb-5 pt-0 border-t border-white/5 space-y-4">
                          <p className="text-sm text-muted-foreground font-sans mt-4"><AutoJargon text={exposure.description} /></p>

                          <ThreatExplainer narrative={
                            exposure.dataType === "SSN"
                              ? "Your Social Security Number was found being sold in an underground marketplace. Criminals buy these to open bank accounts, apply for loans, or file tax returns in your name. The sooner you freeze your credit and set up monitoring, the less damage they can cause."
                              : exposure.dataType === "Financial Account"
                              ? "Financial account information linked to you has appeared on hidden parts of the internet. Criminals may attempt unauthorized transactions or use this data to access your banking services."
                              : exposure.dataType === "Credentials"
                              ? "Login credentials associated with your accounts were found in a leaked database. Criminals often try these passwords across many different services, so if you reuse passwords, multiple accounts could be at risk."
                              : "Personal data connected to you has surfaced on parts of the internet used for illegal trading. This means someone has either stolen or leaked this information, and it could be used for fraud."
                          } />

                          <PlainEnglishThreatCard
                            severity={getUrgencyFromSeverity(exposure.severity)}
                            breakdown={{
                              whatWeFound: exposure.description,
                              howWeFoundIt: `Discovered on ${exposure.sourceMarketplace} through dark web monitoring`,
                              whereTheThreatIs: `Found on marketplace: ${exposure.sourceMarketplace}`,
                              whatThisMeans: exposure.dataType === "SSN" ? "Someone could use your SSN to steal your identity." : exposure.dataType === "Financial Account" ? "Your financial accounts may be at risk of unauthorized access." : "Your personal information is exposed and could be misused.",
                              potentialImpact: exposure.dataType === "SSN" ? "Identity theft, fraudulent accounts, credit damage." : exposure.dataType === "Financial Account" ? "Unauthorized charges, account takeover." : "Account compromise, identity fraud.",
                              whatCanBeDone: actions.length > 0 ? actions.join(". ") : "Follow the recovery steps in the Recovery Center tab.",
                              howItsBeingHandled: `Status: ${exposure.status}. Our monitoring continues to track this exposure.`,
                              recoverySteps: "Visit the Recovery Center tab for detailed step-by-step recovery guidance.",
                            }}
                          />

                          <RiskImpactCalculator
                            financialImpact={exposure.dataType === "SSN" ? "High — identity theft costs an average of $1,000+ per incident" : exposure.dataType === "Financial Account" ? "Direct financial loss from unauthorized transactions" : "Moderate — depends on what accounts use these credentials"}
                            dataExposureScope={`${exposure.dataType} data exposed on ${exposure.sourceMarketplace}`}
                            businessDisruption={exposure.dataType === "SSN" ? "Credit monitoring, fraud alerts, potential legal filings needed" : exposure.dataType === "Financial Account" ? "Account freeze, card replacement, charge disputes" : "Password resets across affected services"}
                          />

                          <WhyThisMatters explanation={
                            exposure.dataType === "SSN"
                              ? "Your Social Security Number is one of the most valuable pieces of personal data. If criminals use it, they can open accounts in your name, file false tax returns, and cause long-lasting financial damage."
                              : exposure.dataType === "Financial Account"
                              ? "Exposed financial data can be used immediately for unauthorized transactions. Quick action prevents financial losses."
                              : exposure.dataType === "Credentials"
                              ? "Leaked login credentials can be used to access your accounts, steal data, or impersonate you. Criminals often try reused passwords across many services."
                              : "Exposed personal data on the dark web puts you at risk of fraud, identity theft, or targeted attacks."
                          } />

                          {actions.length > 0 && (
                            <div>
                              <h5 className="text-xs font-display uppercase tracking-widest text-primary mb-3">What You Should Do</h5>
                              <ul className="space-y-2">
                                {actions.map((action: string, i: number) => (
                                  <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
                                    {action}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

function RecoveryTab({
  actionsData,
  isLoading,
  categoryFilter,
  setCategoryFilter,
  onToggle,
  globalProgress,
  summary,
}: {
  actionsData: RecoveryActionList | undefined;
  isLoading: boolean;
  categoryFilter: ListRecoveryActionsCategory | "ALL";
  setCategoryFilter: (c: ListRecoveryActionsCategory | "ALL") => void;
  onToggle: (id: number) => void;
  globalProgress: number;
  summary: DarkWebSummary | undefined;
}) {
  const actions: RecoveryAction[] = actionsData?.actions ?? [];

  const grouped: Record<string, RecoveryAction[]> = {
    credit_protection: actions.filter(a => a.category === "credit_protection"),
    account_security: actions.filter(a => a.category === "account_security"),
    legal_reporting: actions.filter(a => a.category === "legal_reporting"),
  };

  const categoriesToShow = categoryFilter === "ALL"
    ? (Object.keys(grouped) as string[])
    : [categoryFilter as string];

  return (
    <div>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel p-5 rounded-xl mb-6"
      >
        <div className="flex items-center justify-between mb-3">
          <span className="font-display text-sm uppercase tracking-widest text-muted-foreground">Overall Recovery Progress</span>
          <span className="font-mono text-lg text-primary font-bold">{globalProgress}%</span>
        </div>
        <div className="w-full h-3 bg-black/40 rounded-full overflow-hidden relative">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${globalProgress}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className={`h-full rounded-full ${
              globalProgress < 33 ? "bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]" :
              globalProgress < 66 ? "bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.5)]" :
              "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
            }`}
          />
        </div>
        <p className="text-xs font-mono text-muted-foreground mt-2">
          {actionsData?.completedCount ?? 0} of {actionsData?.total ?? 0} actions completed
        </p>
      </motion.div>

      <div className="mb-6 flex items-center gap-4 glass-panel p-2 rounded-xl inline-flex w-full md:w-auto overflow-x-auto">
        <div className="pl-4 pr-2 flex items-center text-muted-foreground border-r border-white/10 shrink-0">
          <FileText className="w-4 h-4 mr-2" />
          <span className="text-xs font-display uppercase tracking-widest">Category</span>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => setCategoryFilter("ALL")}
            className={`px-4 py-2 rounded-lg text-sm font-mono transition-colors ${categoryFilter === "ALL" ? "bg-white/10 text-white" : "text-muted-foreground hover:text-white"}`}
          >
            ALL
          </button>
          {Object.values(ListRecoveryActionsCategory).map(cat => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-4 py-2 rounded-lg text-sm font-mono transition-all ${categoryFilter === cat ? "bg-white/10 text-white" : "text-muted-foreground hover:bg-white/5"}`}
            >
              {CATEGORY_LABELS[cat] || cat}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <CyberLoading text="Loading recovery options..." />
      ) : (
        <div className="space-y-6">
          {categoriesToShow.map((category, catIdx) => {
            const categoryActions = grouped[category] ?? [];
            if (categoryActions.length === 0) return null;
            const CatIcon = CATEGORY_ICONS[category] || ShieldCheck;
            const completedInCat = categoryActions.filter(a => a.completed).length;

            return (
              <motion.div
                key={category}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: catIdx * 0.1 }}
                className="glass-panel rounded-xl overflow-hidden"
              >
                <div className="p-5 border-b border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CatIcon className="w-5 h-5 text-primary" />
                    <h3 className="font-display text-sm uppercase tracking-widest text-white">
                      {CATEGORY_LABELS[category] || category}
                    </h3>
                  </div>
                  <span className="text-xs font-mono text-muted-foreground">
                    {completedInCat}/{categoryActions.length}
                  </span>
                </div>

                <div className="divide-y divide-white/5">
                  {categoryActions.map((action: RecoveryAction, i: number) => (
                    <motion.div
                      key={action.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.03 }}
                      className={`px-5 py-4 flex items-start gap-4 group cursor-pointer transition-colors ${
                        action.completed ? "opacity-60" : "hover:bg-white/[0.02]"
                      }`}
                      onClick={() => onToggle(action.id)}
                    >
                      <div className="mt-0.5 shrink-0">
                        {action.completed ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        ) : (
                          <Circle className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                        )}
                      </div>
                      <div className="flex-1">
                        <h4 className={`text-sm font-display ${action.completed ? "line-through text-muted-foreground" : "text-white"}`}>
                          {action.title}
                        </h4>
                        <p className="text-xs text-muted-foreground mt-1">{action.description}</p>
                      </div>
                      <span className={`text-[9px] font-mono uppercase tracking-widest px-2 py-0.5 rounded border shrink-0 ${
                        action.priority === 1 ? "text-rose-400 border-rose-500/30" :
                        action.priority === 2 ? "text-amber-400 border-amber-500/30" :
                        "text-blue-400 border-blue-500/30"
                      }`}>
                        P{action.priority}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
