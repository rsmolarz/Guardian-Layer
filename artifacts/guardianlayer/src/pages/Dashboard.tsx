import { useState, useRef, useEffect } from "react";
import { useGetDashboardStats, useGetRiskTimeline } from "@workspace/api-client-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { CyberLoading } from "@/components/ui/CyberLoading";
import { CyberError } from "@/components/ui/CyberError";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, ShieldAlert, ShieldCheck, Zap, Ban, Database, Bot, Send, AlertTriangle, Link2, Radio, MessageSquare, X } from "lucide-react";
import { ResponsiveContainer, AreaChart, CartesianGrid, XAxis, YAxis, Tooltip, Area } from "recharts";

const AI_RESPONSES: Record<string, string> = {
  default: "I can help you analyze security threats, review risk patterns, and provide recommendations. Try asking about recent threats, risk trends, or compliance status.",
  threat: "Based on current telemetry: 3 critical threats detected in the last 24h. The primary attack vector is phishing (42%), followed by brute-force SSH attempts (28%). Recommend reviewing the Email Security and Network Security dashboards for detailed analysis.",
  risk: "Current risk assessment: Average network risk score is trending down 12% this week. However, 2 endpoints show elevated risk due to pending patches. The offshore wire transfer category remains the highest-risk transaction type at 0.87 avg risk score.",
  compliance: "Compliance overview: 7/10 endpoints are fully compliant. 2 contracts flagged for review (data processing agreement and cyber liability insurance expiring in 15 days). All GDPR-related controls are active. Recommend immediate attention to the expiring insurance policy.",
  phishing: "Phishing analysis: 12 phishing attempts detected this period. Top impersonated brands: PayPal, Microsoft, FedEx, AWS. 83% originated from NG, RU, and CN. All were blocked or quarantined. Sender reputation scoring is actively filtering with 95.2% detection rate.",
  endpoint: "Endpoint fleet status: 10 devices monitored. 2 non-compliant (missing antivirus, outdated OS). 19 total vulnerabilities detected across fleet. Priority: WS-HR-004 has 8 vulnerabilities and disabled encryption - immediate remediation required.",
  network: "Network security summary: 2,857 total events processed. 1 active DDoS mitigation in progress. 2 IDS alerts require investigation (SQL injection and APT signature). Top attack sources: Russia (3), Nigeria (2), Iran (2), China (2).",
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
  { time: "2m ago", type: "critical", source: "Email Gateway", detail: "Ransomware payload blocked in attachment from security@paypa1-verify.com" },
  { time: "8m ago", type: "high", source: "Network IDS", detail: "SQL injection attempt from 103.44.55.66 targeting production API" },
  { time: "15m ago", type: "high", source: "Endpoint EDR", detail: "Suspicious process execution on WS-HR-004 - investigation required" },
  { time: "22m ago", type: "medium", source: "Auth Monitor", detail: "3 failed YubiKey auth attempts for hr@corp.com from foreign IP" },
  { time: "31m ago", type: "critical", source: "Network Firewall", detail: "DDoS SYN flood mitigated - 500k packets/sec from 1,200 IPs" },
  { time: "45m ago", type: "medium", source: "Contract AI", detail: "Cyber liability insurance policy expiring in 15 days - renewal required" },
  { time: "1h ago", type: "high", source: "Dark Web Scanner", detail: "New credential exposure found on underground marketplace" },
  { time: "1h ago", type: "medium", source: "Stripe Monitor", detail: "Unusual transaction pattern detected - 3 high-value transfers in 10 minutes" },
];

const CORRELATIONS = [
  { severity: "critical", title: "Coordinated Attack Pattern Detected", sources: ["Email Gateway", "Network IDS", "Endpoint EDR"], detail: "Phishing email from paypa1-verify.com correlates with SQL injection attempts from same subnet (103.44.x.x). Possible coordinated APT campaign targeting finance department.", confidence: 94 },
  { severity: "high", title: "Insider Threat Risk - HR Department", sources: ["Auth Monitor", "Endpoint EDR", "YubiKey MFA"], detail: "HR workstation WS-HR-004 shows: disabled encryption, 8 vulnerabilities, 15 failed YubiKey auths from foreign IPs. Possible account compromise.", confidence: 87 },
  { severity: "medium", title: "Data Exfiltration Attempt", sources: ["Network Firewall", "Endpoint EDR"], detail: "2.4GB outbound transfer from marketing workstation to unknown external host on non-standard port. Correlates with C2 communication pattern.", confidence: 72 },
];

type ChatMessage = { role: "user" | "assistant"; text: string };

export default function Dashboard() {
  const { data: stats, isLoading: isStatsLoading, isError: isStatsError } = useGetDashboardStats();
  const { data: timeline, isLoading: isTimelineLoading } = useGetRiskTimeline({ days: 7 });
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { role: "assistant", text: "GuardianLayer AI Risk Assistant online. How can I help you analyze security threats today?" },
  ]);
  const chatEndRef = useRef<HTMLDivElement>(null);

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

  if (isStatsLoading || isTimelineLoading) return <CyberLoading text="AGGREGATING TELEMETRY..." />;
  if (isStatsError || !stats) return <CyberError title="TELEMETRY FAULT" message="Failed to retrieve dashboard statistics from the core." />;

  const statCards = [
    { label: "Total Monitored", value: stats.totalTransactions, icon: Activity, color: "text-primary" },
    { label: "Threats Blocked", value: stats.totalBlocked, icon: Ban, color: "text-rose-500" },
    { label: "Held For Review", value: stats.totalHeld, icon: ShieldAlert, color: "text-amber-400" },
    { label: "Safe Transfers", value: stats.totalAllowed, icon: ShieldCheck, color: "text-emerald-400" },
    { label: "Avg Network Risk", value: stats.averageRiskScore.toFixed(2), icon: Zap, color: "text-secondary" },
    { label: "Active Integrations", value: stats.integrationsOnline, icon: Database, color: "text-primary" },
  ];

  return (
    <div className="pb-12">
      <PageHeader 
        title="Command Center" 
        description="Real-time overview of network transaction security, threat vectors, and mitigation actions." 
      />

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
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="glass-panel p-6 rounded-2xl"
        >
          <h3 className="font-display text-sm uppercase tracking-widest text-primary mb-4 flex items-center gap-2">
            <Link2 className="w-4 h-4" />
            Threat Correlation Engine
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
                  <h4 className="text-sm font-display text-white">{c.title}</h4>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                    c.confidence > 90 ? "text-rose-400 bg-rose-500/20" :
                    c.confidence > 80 ? "text-orange-400 bg-orange-500/20" :
                    "text-amber-400 bg-amber-500/20"
                  }`}>
                    {c.confidence}% confidence
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mb-2">{c.detail}</p>
                <div className="flex gap-2 flex-wrap">
                  {c.sources.map((s) => (
                    <span key={s} className="text-[9px] font-mono px-2 py-0.5 rounded bg-white/5 text-muted-foreground border border-white/10">{s}</span>
                  ))}
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
            Real-Time Threat Intel Feed
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
                    <span className={`text-[9px] font-mono uppercase tracking-widest ${
                      item.type === "critical" ? "text-rose-400" : item.type === "high" ? "text-orange-400" : "text-amber-400"
                    }`}>{item.type}</span>
                    <span className="text-[9px] font-mono text-muted-foreground">{item.source}</span>
                    <span className="text-[9px] font-mono text-muted-foreground ml-auto">{item.time}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{item.detail}</p>
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
          7-Day Risk & Volume Topology
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
                  name="Avg Risk Score"
                />
                <Area 
                  yAxisId="right"
                  type="monotone" 
                  dataKey="transactionCount" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorCount)" 
                  name="Total Volume"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center font-mono text-muted-foreground">
              INSUFFICIENT DATA FOR VISUALIZATION
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
                <span className="font-display text-sm uppercase tracking-widest text-primary">AI Risk Assistant</span>
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
                  placeholder="Ask about threats, risks, compliance..."
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
                {["Recent threats", "Risk trends", "Compliance status", "Phishing analysis"].map((q) => (
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
    </div>
  );
}
