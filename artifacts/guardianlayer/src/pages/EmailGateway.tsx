import { useState } from "react";
import { motion } from "framer-motion";
import {
  Mail, Shield, AlertTriangle, CheckCircle2, XCircle, Search, Eye,
  Ban, Clock, FileWarning, Paperclip, ChevronDown, ChevronRight, Loader2,
} from "lucide-react";
import { clsx } from "clsx";

interface EmailEvent {
  id: string;
  timestamp: string;
  from: string;
  to: string;
  subject: string;
  verdict: "clean" | "spam" | "phishing" | "malware" | "quarantined" | "blocked";
  score: number;
  details: string;
  attachments: number;
  hasLink: boolean;
  headers: Record<string, string>;
}

const VERDICT_CONFIG = {
  clean: { color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/30", icon: CheckCircle2, label: "Clean" },
  spam: { color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/30", icon: AlertTriangle, label: "Spam" },
  phishing: { color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/30", icon: FileWarning, label: "Phishing" },
  malware: { color: "text-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/30", icon: XCircle, label: "Malware" },
  quarantined: { color: "text-violet-400", bg: "bg-violet-500/10", border: "border-violet-500/30", icon: Ban, label: "Quarantined" },
  blocked: { color: "text-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/30", icon: Ban, label: "Blocked" },
};

function generateEmails(): EmailEvent[] {
  const now = Date.now();
  return [
    { id: "em1", timestamp: new Date(now - 60000).toISOString(), from: "ceo@partner-corp.com", to: "rsmolarz@rsmolarz.com", subject: "Q2 Partnership Review — Confidential", verdict: "clean", score: 2, details: "SPF: pass, DKIM: pass, DMARC: pass. No threats detected.", attachments: 1, hasLink: false, headers: { "X-Spam-Score": "2", "SPF": "pass", "DKIM": "pass" } },
    { id: "em2", timestamp: new Date(now - 180000).toISOString(), from: "bank-notify@chase-secure.com", to: "cfo@company.com", subject: "Urgent: Account Verification Required", verdict: "phishing", score: 94, details: "Domain spoofing detected: chase-secure.com is not an official Chase domain. SPF: fail. Contains suspicious URL leading to credential harvesting page.", attachments: 0, hasLink: true, headers: { "X-Spam-Score": "94", "SPF": "fail", "DKIM": "none", "X-Threat": "phishing" } },
    { id: "em3", timestamp: new Date(now - 420000).toISOString(), from: "hr-noreply@company-benefits.org", to: "all-staff@company.com", subject: "Updated Benefits Package — Action Required", verdict: "phishing", score: 87, details: "Impersonation attempt: sender domain mimics internal HR. Attachment is an HTML file with embedded JavaScript designed to steal credentials.", attachments: 1, hasLink: true, headers: { "X-Spam-Score": "87", "SPF": "none", "DKIM": "fail", "X-Threat": "credential-harvest" } },
    { id: "em4", timestamp: new Date(now - 900000).toISOString(), from: "updates@github.com", to: "dev-team@company.com", subject: "[GitHub] Security alert — dependabot", verdict: "clean", score: 1, details: "Verified GitHub notification. SPF: pass, DKIM: pass, DMARC: pass.", attachments: 0, hasLink: true, headers: { "X-Spam-Score": "1", "SPF": "pass", "DKIM": "pass" } },
    { id: "em5", timestamp: new Date(now - 1200000).toISOString(), from: "support@micr0soft-365.com", to: "admin@company.com", subject: "Your Microsoft 365 subscription is expiring", verdict: "malware", score: 98, details: "Malicious attachment detected: invoice.pdf.exe (Trojan.GenericKD). Domain is a typosquat of microsoft.com. Blocked at gateway.", attachments: 1, hasLink: true, headers: { "X-Spam-Score": "98", "SPF": "fail", "DKIM": "none", "X-Malware": "Trojan.GenericKD" } },
    { id: "em6", timestamp: new Date(now - 1800000).toISOString(), from: "newsletter@techcrunch.com", to: "rsmolarz@rsmolarz.com", subject: "TechCrunch Daily — Top Stories", verdict: "clean", score: 5, details: "Newsletter from verified sender. SPF: pass, DKIM: pass.", attachments: 0, hasLink: true, headers: { "X-Spam-Score": "5", "SPF": "pass", "DKIM": "pass" } },
    { id: "em7", timestamp: new Date(now - 2400000).toISOString(), from: "promo@discount-electronics-store.biz", to: "purchasing@company.com", subject: "INCREDIBLE DEALS 90% OFF LAPTOPS!!!", verdict: "spam", score: 72, details: "High spam score: excessive capitalization, urgency markers, unverified sender domain.", attachments: 0, hasLink: true, headers: { "X-Spam-Score": "72", "SPF": "none", "DKIM": "none" } },
    { id: "em8", timestamp: new Date(now - 3600000).toISOString(), from: "aws-billing@amazon.com", to: "ops@company.com", subject: "AWS Invoice Available — March 2026", verdict: "clean", score: 3, details: "Verified Amazon SES sender. SPF: pass, DKIM: pass, DMARC: pass.", attachments: 1, hasLink: true, headers: { "X-Spam-Score": "3", "SPF": "pass", "DKIM": "pass" } },
    { id: "em9", timestamp: new Date(now - 5400000).toISOString(), from: "unknown@free-vpn-download.ru", to: "staff@company.com", subject: "Get Free VPN Access — Limited Time", verdict: "blocked", score: 99, details: "Blocked: Sender from geo-restricted region (RU). Known malware distribution domain. Contains link to drive-by-download.", attachments: 0, hasLink: true, headers: { "X-Spam-Score": "99", "SPF": "fail", "X-GeoBlock": "RU" } },
    { id: "em10", timestamp: new Date(now - 7200000).toISOString(), from: "compliance@company.com", to: "all-managers@company.com", subject: "Q1 Compliance Training — Due by Friday", verdict: "clean", score: 0, details: "Internal email from verified corporate sender.", attachments: 1, hasLink: true, headers: { "X-Spam-Score": "0", "SPF": "pass", "DKIM": "pass", "X-Internal": "true" } },
  ];
}

export default function EmailGateway() {
  const [emails] = useState(generateEmails);
  const [search, setSearch] = useState("");
  const [verdictFilter, setVerdictFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = emails.filter(e => {
    if (verdictFilter !== "all" && e.verdict !== verdictFilter) return false;
    if (search && !e.subject.toLowerCase().includes(search.toLowerCase()) && !e.from.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const threatCount = emails.filter(e => ["phishing", "malware", "blocked"].includes(e.verdict)).length;
  const spamCount = emails.filter(e => e.verdict === "spam").length;
  const cleanCount = emails.filter(e => e.verdict === "clean").length;

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-teal-500/10 border border-teal-500/30">
            <Mail className="w-6 h-6 text-teal-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Email Security Gateway</h1>
            <p className="text-gray-400 text-sm">Advanced phishing, spam, and malware filtering</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-xl border p-4 bg-cyan-500/10 border-cyan-500/30">
            <p className="text-sm text-cyan-400 mb-1">Total Processed</p>
            <p className="text-3xl font-bold text-cyan-400">{emails.length}</p>
          </div>
          <div className="rounded-xl border p-4 bg-emerald-500/10 border-emerald-500/30">
            <p className="text-sm text-emerald-400 mb-1">Clean</p>
            <p className="text-3xl font-bold text-emerald-400">{cleanCount}</p>
          </div>
          <div className="rounded-xl border p-4 bg-rose-500/10 border-rose-500/30">
            <p className="text-sm text-rose-400 mb-1">Threats Blocked</p>
            <p className="text-3xl font-bold text-rose-400">{threatCount}</p>
          </div>
          <div className="rounded-xl border p-4 bg-amber-500/10 border-amber-500/30">
            <p className="text-sm text-amber-400 mb-1">Spam Filtered</p>
            <p className="text-3xl font-bold text-amber-400">{spamCount}</p>
          </div>
        </div>

        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search emails by subject or sender..." className="w-full bg-gray-900/50 border border-gray-800 rounded-lg pl-10 pr-4 py-2.5 text-white text-sm focus:outline-none focus:border-teal-500/50" />
          </div>
          <select value={verdictFilter} onChange={e => setVerdictFilter(e.target.value)} className="bg-gray-900/50 border border-gray-800 rounded-lg px-3 py-2.5 text-white text-sm">
            <option value="all">All Verdicts</option>
            {Object.entries(VERDICT_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>

        <div className="space-y-1.5">
          {filtered.map((email, i) => {
            const cfg = VERDICT_CONFIG[email.verdict];
            const Icon = cfg.icon;
            const isExpanded = expandedId === email.id;
            return (
              <motion.div key={email.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }} className="bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden">
                <button onClick={() => setExpandedId(isExpanded ? null : email.id)} className="w-full flex items-center gap-3 p-4 hover:bg-gray-800/20 transition-colors text-left">
                  {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-500 shrink-0" /> : <ChevronRight className="w-4 h-4 text-gray-500 shrink-0" />}
                  <Icon className={clsx("w-4 h-4 shrink-0", cfg.color)} />
                  <span className={clsx("text-[10px] px-2 py-0.5 rounded border uppercase shrink-0 w-20 text-center", cfg.bg, cfg.border, cfg.color)}>{cfg.label}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{email.subject}</p>
                    <p className="text-xs text-gray-500 truncate">From: {email.from} → {email.to}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {email.attachments > 0 && <Paperclip className="w-3.5 h-3.5 text-gray-500" />}
                    <span className={clsx("text-xs font-mono px-2 py-0.5 rounded", email.score > 70 ? "text-rose-400 bg-rose-500/10" : email.score > 30 ? "text-amber-400 bg-amber-500/10" : "text-emerald-400 bg-emerald-500/10")}>{email.score}</span>
                    <span className="text-gray-600 text-xs">{new Date(email.timestamp).toLocaleTimeString()}</span>
                  </div>
                </button>
                {isExpanded && (
                  <div className="px-4 pb-4 pl-16 border-t border-gray-800 pt-3 space-y-2">
                    <p className="text-gray-400 text-sm">{email.details}</p>
                    <div className="flex gap-3 flex-wrap">
                      {Object.entries(email.headers).map(([k, v]) => (
                        <span key={k} className="text-[10px] font-mono text-gray-500">{k}: <span className={clsx(v === "pass" ? "text-emerald-400" : v === "fail" || v === "none" ? "text-rose-400" : "text-gray-400")}>{v}</span></span>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
