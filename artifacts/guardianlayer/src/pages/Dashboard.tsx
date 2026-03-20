import { useState, useRef, useEffect } from "react";
import { useGetDashboardStats, useGetRiskTimeline } from "@workspace/api-client-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { CyberLoading } from "@/components/ui/CyberLoading";
import { CyberError } from "@/components/ui/CyberError";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, ShieldAlert, ShieldCheck, Zap, Ban, Database, Bot, Send, AlertTriangle, Link2, Radio, MessageSquare, X, Crosshair, Landmark } from "lucide-react";
import { ThreatEvaluator } from "@/components/ThreatEvaluator";
import { ResponsiveContainer, AreaChart, CartesianGrid, XAxis, YAxis, Tooltip, Area } from "recharts";

import { SecurityHealthScore, calculateHealthGrade } from "@/components/clarity/SecurityHealthScore";
import { ProtectionStatus, generateProtectionAreas } from "@/components/clarity/ProtectionStatus";
import { WhatHappenedToday, generateDailyEvents } from "@/components/clarity/WhatHappenedToday";
import { RecommendedActions, generateRecommendedActions } from "@/components/clarity/RecommendedActions";
import { ThreatComparison } from "@/components/clarity/ThreatComparison";
import { ExecutiveSummary } from "@/components/clarity/ExecutiveSummary";
import { UrgencyBadge } from "@/components/clarity/UrgencyIndicators";
import { ThreatExplainer } from "@/components/clarity/ThreatExplainer";
import { PlainEnglishThreatCard } from "@/components/clarity/PlainEnglishThreatCard";
import { ThreatTimeline } from "@/components/clarity/ThreatTimeline";
import type { ThreatTimelineEvent } from "@/components/clarity/ThreatTimeline";

const AI_RESPONSES: Record<string, string> = {
  default: "I can help you understand your security status, review risks, and suggest next steps. Try asking about recent threats, risk trends, or compliance status.",
  threat: "In the last 24 hours, we detected 3 serious threats. The most common attack type is fake emails (phishing) at 42%, followed by password-guessing attempts at 28%. I'd recommend checking the Email Security and Network Security pages for details.",
  risk: "Good news — your average risk score is down 12% this week. However, 2 devices need security updates. The highest-risk area is overseas wire transfers with a 0.87 average risk score.",
  compliance: "7 out of 10 devices are fully up to date. 2 contracts need review — one data agreement and your cyber insurance expires in 15 days. All privacy controls are active. The insurance renewal should be your top priority.",
  phishing: "We caught 12 fake emails this period. The most common brands being impersonated: PayPal, Microsoft, FedEx, and AWS. 83% came from Nigeria, Russia, and China. All were blocked successfully with a 95.2% detection rate.",
  endpoint: "10 devices are being monitored. 2 need attention — one is missing antivirus and another has an outdated operating system. The HR workstation (WS-HR-004) is the highest priority with 8 security gaps and no disk encryption.",
  network: "2,857 network events processed. One active attack is being blocked right now (DDoS). Two suspicious activities need investigation — a possible database attack and a known hacker signature. Most attacks came from Russia, Nigeria, Iran, and China.",
};

function getAIResponse(input: string): string {
  const lower = input.toLowerCase();
  if (lower.includes("threat") || lower.includes("attack")) return AI_RESPONSES.threat;
  if (lower.includes("risk") || lower.includes("score")) return AI_RESPONSES.risk;
  if (lower.includes("compliance") || lower.includes("compliant") || lower.includes("gdpr")) return AI_RESPONSES.compliance;
  if (lower.includes("phish") || lower.includes("email")) return AI_RESPONSES.phishing;
  if (lower.includes("endpoint") || lower.includes("device") || lower.includes("patch")) return AI_RESPONSES.endpoint;
  if (lower.includes("network") || lower.includes("firewall") || lower.includes("ddos")) return AI_RESPONSES.network;
  return AI_RESPONSES.default;
}

const THREAT_FEED = [
  { time: "2m ago", type: "critical", source: "Email Security", detail: "Blocked a dangerous email attachment pretending to be from PayPal — it contained ransomware." },
  { time: "8m ago", type: "high", source: "Network Monitor", detail: "Someone tried to break into our database from IP 103.44.55.66 — the attempt was blocked." },
  { time: "15m ago", type: "high", source: "Device Monitor", detail: "A suspicious program was detected on an HR workstation (WS-HR-004) — under investigation." },
  { time: "22m ago", type: "medium", source: "Login Monitor", detail: "3 failed security key login attempts for hr@corp.com from an unfamiliar location." },
  { time: "31m ago", type: "critical", source: "Network Firewall", detail: "A flood attack was stopped — 500,000 fake requests per second from 1,200 different sources." },
  { time: "45m ago", type: "medium", source: "Contract Monitor", detail: "Cyber liability insurance expires in 15 days — renewal needed to maintain coverage." },
  { time: "1h ago", type: "high", source: "Data Exposure", detail: "Employee login credentials found on an underground marketplace — password resets initiated." },
  { time: "1h ago", type: "medium", source: "Payment Monitor", detail: "Unusual pattern detected — 3 large transfers in 10 minutes flagged for review." },
];

const CORRELATIONS = [
  {
    severity: "critical",
    title: "Coordinated Attack Detected",
    sources: ["Email Security", "Network Monitor", "Device Monitor"],
    detail: "The fake PayPal email and the database attack came from the same network (103.44.x.x). This looks like a coordinated attempt targeting the finance department.",
    confidence: 94,
    timeline: [
      { time: "09:12 AM", title: "Phishing Email Sent", description: "A fake PayPal notification was sent to the finance team from IP 103.44.x.x.", status: "detected" as const },
      { time: "09:14 AM", title: "Email Blocked", description: "Our email security filter caught the fake email and prevented delivery.", status: "contained" as const },
      { time: "09:18 AM", title: "Database Probe Detected", description: "SQL injection attempt detected from the same IP range targeting the payment database.", status: "detected" as const },
      { time: "09:19 AM", title: "Network Block Applied", description: "Firewall rule added to block all traffic from 103.44.x.x range.", status: "contained" as const },
      { time: "09:25 AM", title: "Correlation Identified", description: "System linked the phishing email and database attack as a coordinated effort.", status: "investigating" as const },
      { time: "09:45 AM", title: "Threat Neutralized", description: "All attack vectors blocked. No data was accessed or exfiltrated.", status: "resolved" as const },
    ],
    breakdown: {
      whatWeFound: "A coordinated attack combining fake emails and database intrusion attempts, all originating from the same network (103.44.x.x), targeting your finance department.",
      howWeFoundIt: "Our email filter caught the phishing attempt first, then network monitoring detected SQL injection probes from the same IP range within minutes.",
      whereTheThreatIs: "The attack targeted two entry points: employee email (phishing) and your payment database (SQL injection). Both came from IP range 103.44.x.x.",
      whatThisMeans: "This was a sophisticated, multi-pronged attack. The attackers tried to trick employees via email while simultaneously probing for database vulnerabilities — a common advanced persistent threat (APT) tactic.",
      potentialImpact: "If successful, attackers could have gained access to financial records, payment data, and employee credentials. The coordinated nature suggests professional threat actors.",
      whatCanBeDone: "Both attack vectors have been blocked. Consider adding the IP range to your permanent blocklist and running targeted phishing awareness training for the finance team.",
      howItsBeingHandled: "All traffic from the attacking network is blocked. Email filters have been updated with the new threat signatures. The incident has been logged for compliance reporting.",
      recoverySteps: "No data was compromised, so no data recovery is needed. Recommended: rotate finance team passwords as a precaution and enable enhanced monitoring for 72 hours.",
    },
  },
  {
    severity: "high",
    title: "Possible Account Compromise — HR Department",
    sources: ["Login Monitor", "Device Monitor", "Security Keys"],
    detail: "An HR workstation has disabled encryption, 8 security gaps, and 15 failed login attempts from overseas. This account may be compromised.",
    confidence: 87,
    timeline: [
      { time: "Yesterday 11:30 PM", title: "Unusual Login Attempts", description: "15 failed login attempts from Nigeria and Russia on the HR admin account.", status: "detected" as const },
      { time: "Today 6:15 AM", title: "Device Scan Flagged", description: "HR workstation WS-HR-004 found with disabled disk encryption and 8 unpatched vulnerabilities.", status: "detected" as const },
      { time: "Today 7:00 AM", title: "Account Monitoring Increased", description: "Enhanced logging enabled for all HR accounts. Security key requirement enforced.", status: "investigating" as const },
    ],
    breakdown: {
      whatWeFound: "An HR workstation with disabled security protections combined with overseas login attempts on the same account — a strong indicator of account compromise.",
      howWeFoundIt: "Login monitoring detected repeated failed attempts from unusual locations, and the device scanner found the workstation's protections had been disabled.",
      whereTheThreatIs: "HR workstation WS-HR-004 and the associated HR admin account. The failed logins came from Nigeria and Russia.",
      whatThisMeans: "Someone may have obtained the HR admin credentials and is trying to log in from overseas. The disabled device protections make this workstation especially vulnerable.",
      potentialImpact: "HR accounts typically have access to employee records, payroll data, and benefits information. A compromise could expose sensitive personal data for all employees.",
      whatCanBeDone: "Reset the HR admin password immediately. Re-enable disk encryption on WS-HR-004. Apply all 8 pending security patches. Consider requiring security key authentication.",
      howItsBeingHandled: "Enhanced monitoring is active. Security key requirement has been enforced for all HR accounts. The workstation has been flagged for urgent patching.",
      recoverySteps: "If the account was compromised: audit all HR data access logs for the past 30 days, notify affected employees per data breach protocol, and reset all HR team credentials.",
    },
  },
  {
    severity: "medium",
    title: "Possible Data Leak Attempt",
    sources: ["Network Firewall", "Device Monitor"],
    detail: "A marketing workstation sent 2.4GB of data to an unknown external server on an unusual port. This pattern looks like unauthorized data transfer.",
    confidence: 72,
    timeline: [
      { time: "Today 3:22 AM", title: "Large Transfer Detected", description: "2.4GB outbound transfer from marketing workstation to external IP on port 8443.", status: "detected" as const },
      { time: "Today 3:25 AM", title: "Transfer Flagged", description: "Automated firewall rules flagged the transfer as suspicious due to unusual port and time of day.", status: "investigating" as const },
    ],
    breakdown: {
      whatWeFound: "A marketing workstation transferred 2.4GB of data to an external server at 3:22 AM using an unusual network port — a pattern consistent with data exfiltration.",
      howWeFoundIt: "Network firewall rules automatically flag large outbound transfers to unknown destinations, especially during off-hours and on non-standard ports.",
      whereTheThreatIs: "The marketing workstation that initiated the transfer. The destination was an unrecognized external server on port 8443.",
      whatThisMeans: "This could be unauthorized data theft, malware sending collected data to an external server, or (less likely) a legitimate large file upload. The timing and port are suspicious.",
      potentialImpact: "If this was a data leak, 2.4GB could contain significant amounts of customer data, marketing assets, competitive intelligence, or internal documents.",
      whatCanBeDone: "Investigate the marketing workstation — check what files were transferred, scan for malware, and verify whether any employee authorized this transfer.",
      howItsBeingHandled: "The transfer has been logged and the destination IP is under review. The marketing workstation has been flagged for investigation.",
      recoverySteps: "If confirmed as data theft: identify exactly what data was sent, block the destination IP, scan the workstation for malware, and follow data breach notification procedures.",
    },
  },
];

type ChatMessage = { role: "user" | "assistant"; text: string };

export default function Dashboard() {
  const { data: stats, isLoading: isStatsLoading, isError: isStatsError } = useGetDashboardStats();
  const { data: timeline, isLoading: isTimelineLoading } = useGetRiskTimeline({ days: 7 });
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { role: "assistant", text: "Hi! I'm your security assistant. Ask me anything about your organization's security — threats, risks, compliance, or device status." },
  ]);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [evaluatingThreat, setEvaluatingThreat] = useState<{
    title: string; detail: string; severity: string;
    sources?: string[]; confidence?: number;
    timeline?: Array<{ time: string; title: string; description: string; status: string }>;
  } | null>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const handleSend = () => {
    if (!chatInput.trim()) return;
    const userMsg = chatInput.trim();
    setChatMessages((prev) => [...prev, { role: "user", text: userMsg }]);
    setChatInput("");
    setTimeout(() => {
      setChatMessages((prev) => [...prev, { role: "assistant", text: getAIResponse(userMsg) }]);
    }, 600);
  };

  if (isStatsLoading || isTimelineLoading) return <CyberLoading text="Loading your security overview..." />;
  if (isStatsError || !stats) return <CyberError title="Couldn't Load Dashboard" message="We couldn't load your security overview. Please try again." />;

  const healthGrade = calculateHealthGrade({
    totalBlocked: stats.totalBlocked,
    totalHeld: stats.totalHeld,
    averageRiskScore: stats.averageRiskScore,
  });

  const statCards = [
    { label: "Transactions Scanned", value: stats.totalTransactions, icon: Activity, color: "text-primary" },
    { label: "Threats Blocked", value: stats.totalBlocked, icon: Ban, color: "text-rose-500" },
    { label: "Awaiting Review", value: stats.totalHeld, icon: ShieldAlert, color: "text-amber-400" },
    { label: "Safe Transfers", value: stats.totalAllowed, icon: ShieldCheck, color: "text-emerald-400" },
    { label: "Average Risk Level", value: stats.averageRiskScore.toFixed(2), icon: Zap, color: "text-secondary" },
    { label: "Connected Services", value: stats.integrationsOnline, icon: Database, color: "text-primary" },
  ];

  return (
    <div className="pb-12">
      <PageHeader 
        title="Security Dashboard" 
        description="Your organization's security at a glance — what's happening, what needs attention, and what's been handled." 
      />

      <div className="space-y-6 mb-10">
        <SecurityHealthScore grade={healthGrade.grade} summary={healthGrade.summary} issuesCount={healthGrade.issuesCount} />
        <ProtectionStatus areas={generateProtectionAreas()} />
        <ThreatComparison currentCount={stats.totalBlocked} previousCount={Math.max(1, stats.totalBlocked - 2)} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
        {statCards.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass-panel p-6 rounded-2xl relative overflow-hidden group hover:border-primary/30 transition-colors"
          >
            <div className={`absolute top-0 right-0 p-4 opacity-10 ${stat.color} group-hover:scale-150 transition-transform duration-700 ease-out`}>
              <stat.icon className="w-24 h-24" />
            </div>
            <div className="relative z-10 flex flex-col h-full justify-between">
              <span className="font-display uppercase text-xs tracking-widest text-muted-foreground mb-4 block">
                {stat.label}
              </span>
              <div className="flex items-end justify-between">
                <span className="text-4xl font-mono font-bold text-foreground drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">
                  {stat.value}
                </span>
                <stat.icon className={`w-6 h-6 ${stat.color} drop-shadow-[0_0_8px_currentColor]`} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
        <WhatHappenedToday events={generateDailyEvents()} />
        <RecommendedActions actions={generateRecommendedActions()} />
      </div>

      <div className="mb-10">
        <ExecutiveSummary
          title="Daily Security Report"
          sections={[
            { heading: "Overall Status", content: `Your organization's security health is rated "${healthGrade.grade}". ${healthGrade.summary}` },
            { heading: "Key Activity", content: `Today we scanned ${stats.totalTransactions} transactions and blocked ${stats.totalBlocked} threats. ${stats.totalHeld} items are waiting for your review.` },
            { heading: "Top Concern", content: "A coordinated attack targeting the finance department was detected and stopped. The attackers used fake emails combined with database intrusion attempts from the same network." },
            { heading: "Recommendation", content: "Priority action: Update the HR workstation (WS-HR-004) which has 8 known security gaps. Also review and renew the cyber liability insurance expiring in 15 days." },
          ]}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="glass-panel p-6 rounded-2xl"
        >
          <h3 className="font-display text-sm uppercase tracking-widest text-primary mb-4 flex items-center gap-2">
            <Link2 className="w-4 h-4" />
            Connected Threats — Attacks That May Be Related
          </h3>
          <div className="space-y-3">
            {CORRELATIONS.map((c, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 + i * 0.1 }}
                className={`p-4 rounded-xl border-l-4 ${
                  c.severity === "critical" ? "border-rose-500 bg-rose-500/5" :
                  c.severity === "high" ? "border-orange-400 bg-orange-400/5" :
                  "border-amber-400 bg-amber-400/5"
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-display text-white">{c.title}</h4>
                    <UrgencyBadge severity={c.severity} />
                  </div>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                    c.confidence > 90 ? "text-rose-400 bg-rose-500/20" :
                    c.confidence > 80 ? "text-orange-400 bg-orange-500/20" :
                    "text-amber-400 bg-amber-500/20"
                  }`}>
                    {c.confidence}% sure
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mb-2">{c.detail}</p>
                <div className="flex gap-2 flex-wrap mb-3">
                  {c.sources.map((s) => (
                    <span key={s} className="text-[9px] font-mono px-2 py-0.5 rounded bg-white/5 text-muted-foreground border border-white/10">{s}</span>
                  ))}
                </div>
                <div className="space-y-2">
                  {c.timeline && <ThreatTimeline events={c.timeline} incidentTitle={c.title} />}
                  <PlainEnglishThreatCard
                    breakdown={c.breakdown}
                    severity={c.severity === "critical" ? "act-now" : c.severity === "high" ? "needs-attention" : "monitor"}
                  />
                </div>
                <div className="mt-3 pt-3 border-t border-white/5 flex gap-2">
                  <button
                    onClick={() => setEvaluatingThreat({
                      title: c.title,
                      detail: c.detail,
                      severity: c.severity,
                      sources: c.sources,
                      confidence: c.confidence,
                      timeline: c.timeline,
                    })}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-display uppercase tracking-wider bg-primary/20 border border-primary/30 text-primary hover:bg-primary/30 transition-colors"
                  >
                    <Crosshair className="w-3 h-3" />
                    Evaluate & Eliminate
                  </button>
                  <button
                    onClick={() => setEvaluatingThreat({
                      title: c.title,
                      detail: c.detail + " — FOCUS ON GOVERNMENT REPORTING REQUIREMENTS",
                      severity: c.severity,
                      sources: c.sources,
                      confidence: c.confidence,
                      timeline: c.timeline,
                    })}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-display uppercase tracking-wider bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 transition-colors"
                  >
                    <Landmark className="w-3 h-3" />
                    Report to Authorities
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="glass-panel p-6 rounded-2xl"
        >
          <h3 className="font-display text-sm uppercase tracking-widest text-primary mb-4 flex items-center gap-2">
            <Radio className="w-4 h-4 animate-pulse" />
            Live Security Feed
          </h3>
          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
            {THREAT_FEED.map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 + i * 0.05 }}
                className={`p-3 rounded-lg flex items-start gap-3 border-l-2 ${
                  item.type === "critical" ? "border-rose-500 bg-rose-500/5" :
                  item.type === "high" ? "border-orange-400 bg-orange-400/5" :
                  "border-amber-400 bg-amber-400/5"
                }`}
              >
                <div className={`mt-0.5 ${
                  item.type === "critical" ? "text-rose-500" :
                  item.type === "high" ? "text-orange-400" :
                  "text-amber-400"
                }`}>
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <UrgencyBadge severity={item.type} />
                    <span className="text-[9px] font-mono text-muted-foreground">{item.source}</span>
                    <span className="text-[9px] font-mono text-muted-foreground ml-auto">{item.time}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-1.5">{item.detail}</p>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => setEvaluatingThreat({
                        title: item.detail.substring(0, 60),
                        detail: item.detail,
                        severity: item.type,
                        sources: [item.source],
                      })}
                      className="flex items-center gap-1 px-2 py-1 rounded text-[9px] font-display uppercase tracking-wider bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 transition-colors"
                    >
                      <Crosshair className="w-2.5 h-2.5" />
                      Evaluate
                    </button>
                    <button
                      onClick={() => setEvaluatingThreat({
                        title: item.detail.substring(0, 60),
                        detail: item.detail + " — FOCUS ON GOVERNMENT REPORTING REQUIREMENTS",
                        severity: item.type,
                        sources: [item.source],
                      })}
                      className="flex items-center gap-1 px-2 py-1 rounded text-[9px] font-display uppercase tracking-wider bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 transition-colors"
                    >
                      <Landmark className="w-2.5 h-2.5" />
                      Report
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="glass-panel p-6 rounded-2xl"
      >
        <h3 className="font-display text-lg uppercase tracking-widest text-primary mb-8 border-b border-white/5 pb-4 flex items-center">
          <Activity className="w-5 h-5 mr-3" />
          7-Day Risk & Transaction Volume
        </h3>
        
        <div className="h-[400px] w-full cyber-grid rounded-xl p-4">
          {timeline?.dataPoints ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timeline.dataPoints} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRisk" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis 
                  dataKey="date" 
                  stroke="hsl(var(--muted-foreground))" 
                  fontSize={12} 
                  fontFamily="JetBrains Mono" 
                  tickLine={false}
                  axisLine={false}
                  dy={10}
                />
                <YAxis 
                  yAxisId="left"
                  stroke="hsl(var(--muted-foreground))" 
                  fontSize={12} 
                  fontFamily="JetBrains Mono"
                  tickLine={false}
                  axisLine={false}
                  dx={-10}
                />
                <YAxis 
                  yAxisId="right" 
                  orientation="right" 
                  stroke="hsl(var(--muted-foreground))" 
                  fontSize={12} 
                  fontFamily="JetBrains Mono"
                  tickLine={false}
                  axisLine={false}
                  dx={10}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '0.5rem',
                    fontFamily: 'JetBrains Mono',
                    boxShadow: '0 0 20px rgba(0,0,0,0.5)'
                  }}
                  itemStyle={{ color: 'hsl(var(--foreground))' }}
                />
                <Area 
                  yAxisId="left"
                  type="monotone" 
                  dataKey="avgRisk" 
                  stroke="hsl(var(--destructive))" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorRisk)" 
                  name="Average Risk"
                />
                <Area 
                  yAxisId="right"
                  type="monotone" 
                  dataKey="transactionCount" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorCount)" 
                  name="Transaction Count"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center font-mono text-muted-foreground">
              Not enough data to show a chart yet
            </div>
          )}
        </div>
      </motion.div>

      <AnimatePresence>
        {chatOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-24 right-8 w-96 h-[500px] glass-panel rounded-2xl border border-primary/20 shadow-[0_0_40px_rgba(6,182,212,0.15)] flex flex-col z-50 overflow-hidden"
          >
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-primary/5">
              <div className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-primary" />
                <span className="font-display text-sm uppercase tracking-widest text-primary">Security Assistant</span>
              </div>
              <button onClick={() => setChatOpen(false)} className="text-muted-foreground hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] px-3 py-2 rounded-xl text-sm ${
                    msg.role === "user"
                      ? "bg-primary/20 text-primary border border-primary/20"
                      : "bg-white/5 text-muted-foreground border border-white/10"
                  }`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
            <div className="p-3 border-t border-white/10">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  placeholder="Ask about threats, risks, devices..."
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/30"
                />
                <button
                  onClick={handleSend}
                  className="p-2 rounded-lg bg-primary/20 text-primary hover:bg-primary/30 transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
              <div className="flex gap-1 mt-2 flex-wrap">
                {["Recent threats", "Risk trends", "Compliance status", "Email security"].map((q) => (
                  <button
                    key={q}
                    onClick={() => { setChatInput(q); }}
                    className="text-[9px] font-mono px-2 py-1 rounded bg-white/5 text-muted-foreground hover:text-white hover:bg-white/10 transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1 }}
        onClick={() => setChatOpen(!chatOpen)}
        className={`fixed bottom-8 right-8 p-4 rounded-full shadow-[0_0_20px_rgba(6,182,212,0.3)] z-50 transition-colors ${
          chatOpen ? "bg-primary text-white" : "bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30"
        }`}
      >
        <MessageSquare className="w-6 h-6" />
      </motion.button>

      {evaluatingThreat && (
        <ThreatEvaluator
          threat={evaluatingThreat}
          onClose={() => setEvaluatingThreat(null)}
        />
      )}
    </div>
  );
}
