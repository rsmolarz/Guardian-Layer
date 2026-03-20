import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import {
  Globe,
  Plus,
  Trash2,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  Mail,
  Loader2,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  ExternalLink,
  Copy,
  Check,
  Info,
  X,
  Zap,
  FileText,
  Server,
  Code,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { WhyThisMatters } from "@/components/clarity/WhyThisMatters";

const API_BASE = import.meta.env.VITE_API_URL || "";

interface BreachResult {
  id: number;
  breachName: string;
  breachTitle: string | null;
  breachDomain: string | null;
  breachDate: string | null;
  pwnCount: number | null;
  dataClasses: string | null;
  isVerified: boolean;
}

interface DomainEmail {
  id: number;
  domainId: number;
  email: string;
  lastCheckedAt: string | null;
  breachCount: number;
  verdict: string;
}

interface MonitoredDomain {
  id: number;
  domain: string;
  notes: string | null;
  hibpVerified: boolean;
  lastScanAt: string | null;
  emails: DomainEmail[];
}

const verdictConfig: Record<string, { color: string; bg: string; icon: typeof ShieldCheck; label: string }> = {
  clean: { color: "text-green-400", bg: "bg-green-500/10 border-green-500/30", icon: ShieldCheck, label: "CLEAN" },
  exposed: { color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/30", icon: ShieldAlert, label: "EXPOSED" },
  critical: { color: "text-red-400", bg: "bg-red-500/10 border-red-500/30", icon: ShieldX, label: "CRITICAL" },
  unchecked: { color: "text-slate-400", bg: "bg-slate-500/10 border-slate-500/30", icon: Shield, label: "UNCHECKED" },
};

function VerificationGuide({ domain, onClose }: { domain: string; onClose: () => void }) {
  const [tab, setTab] = useState<"dns" | "file" | "meta">("dns");
  const [copied, setCopied] = useState(false);

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const tabs = [
    { id: "dns" as const, label: "DNS TXT Record", icon: Server },
    { id: "file" as const, label: "File Upload", icon: FileText },
    { id: "meta" as const, label: "Meta Tag", icon: Code },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className="border border-cyan-500/30 bg-cyan-500/5 rounded-lg p-4 space-y-4"
    >
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-mono font-semibold text-cyan-400">
          HIBP DOMAIN VERIFICATION GUIDE — {domain}
        </h4>
        <button onClick={onClose} className="text-slate-400 hover:text-white">
          <X className="w-4 h-4" />
        </button>
      </div>

      <p className="text-xs text-slate-400">
        To enable full domain-level breach searching on Have I Been Pwned, you need to verify domain ownership.
        Choose the method that's easiest for you:
      </p>

      <div className="flex gap-2">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono rounded transition-colors ${
              tab === t.id ? "bg-cyan-600 text-white" : "bg-slate-700/50 text-slate-400 hover:bg-slate-700"
            }`}
          >
            <t.icon className="w-3 h-3" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === "dns" && (
        <div className="space-y-3 text-xs text-slate-300">
          <p className="font-semibold text-slate-200">Recommended — works with any DNS provider including NameSilo</p>
          <ol className="list-decimal list-inside space-y-2">
            <li>Go to <a href="https://haveibeenpwned.com/DomainSearch" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">haveibeenpwned.com/DomainSearch <ExternalLink className="w-3 h-3 inline" /></a></li>
            <li>Enter <span className="font-mono text-cyan-300">{domain}</span> and start the verification</li>
            <li>Select "DNS TXT Record" as verification method</li>
            <li>Copy the verification code HIBP gives you</li>
            <li>Log into your DNS provider (NameSilo, Cloudflare, GoDaddy, etc.)</li>
            <li>Add a new <span className="font-mono text-cyan-300">TXT</span> record:
              <div className="bg-slate-900 rounded p-2 mt-1 font-mono">
                <div>Host: <span className="text-cyan-300">@</span> (or leave blank)</div>
                <div>Type: <span className="text-cyan-300">TXT</span></div>
                <div>Value: <span className="text-cyan-300">[paste HIBP verification code]</span></div>
              </div>
            </li>
            <li>Wait 5-15 minutes for DNS propagation</li>
            <li>Go back to HIBP and click "Verify"</li>
          </ol>
          <p className="text-slate-500 italic">For NameSilo specifically: Domain Manager → Manage DNS → Add TXT record</p>
        </div>
      )}

      {tab === "file" && (
        <div className="space-y-3 text-xs text-slate-300">
          <p className="font-semibold text-slate-200">Best if you have FTP/SSH access to your web server</p>
          <ol className="list-decimal list-inside space-y-2">
            <li>Go to <a href="https://haveibeenpwned.com/DomainSearch" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">haveibeenpwned.com/DomainSearch <ExternalLink className="w-3 h-3 inline" /></a></li>
            <li>Enter <span className="font-mono text-cyan-300">{domain}</span> and select "File Upload"</li>
            <li>HIBP will give you a filename and content to create</li>
            <li>Upload the file to your website's root directory:
              <div className="bg-slate-900 rounded p-2 mt-1 font-mono text-cyan-300">
                https://{domain}/.well-known/[filename].txt
              </div>
            </li>
            <li>Verify the file is accessible in a browser</li>
            <li>Go back to HIBP and click "Verify"</li>
          </ol>
        </div>
      )}

      {tab === "meta" && (
        <div className="space-y-3 text-xs text-slate-300">
          <p className="font-semibold text-slate-200">Best if you can edit your website's HTML</p>
          <ol className="list-decimal list-inside space-y-2">
            <li>Go to <a href="https://haveibeenpwned.com/DomainSearch" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">haveibeenpwned.com/DomainSearch <ExternalLink className="w-3 h-3 inline" /></a></li>
            <li>Enter <span className="font-mono text-cyan-300">{domain}</span> and select "Meta Tag"</li>
            <li>HIBP will give you a meta tag to add</li>
            <li>Add it to your website's <span className="font-mono text-cyan-300">&lt;head&gt;</span> section:
              <div className="bg-slate-900 rounded p-2 mt-1 font-mono text-cyan-300">
                &lt;meta name="hibp" content="[verification-code]" /&gt;
              </div>
            </li>
            <li>Deploy your website with the updated HTML</li>
            <li>Go back to HIBP and click "Verify"</li>
          </ol>
        </div>
      )}

      <div className="flex items-center gap-2 pt-2 border-t border-slate-700/50">
        <a
          href="https://haveibeenpwned.com/DomainSearch"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono bg-cyan-600 hover:bg-cyan-500 text-white rounded transition-colors"
        >
          <ExternalLink className="w-3 h-3" />
          OPEN HIBP DOMAIN SEARCH
        </a>
      </div>
    </motion.div>
  );
}

function EmailBreachDetails({ emailId }: { emailId: number }) {
  const [breaches, setBreaches] = useState<BreachResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/api/domain-monitor/emails/${emailId}/breaches`)
      .then(r => r.json())
      .then(data => { setBreaches(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [emailId]);

  if (loading) return <Loader2 className="w-4 h-4 animate-spin text-cyan-400 mx-auto my-2" />;
  if (breaches.length === 0) return <p className="text-xs text-slate-500 py-2 text-center">No breach data stored yet. Run a scan first.</p>;

  return (
    <div className="space-y-2 py-2">
      {breaches.map(b => {
        let dataClasses: string[] = [];
        try { dataClasses = b.dataClasses ? JSON.parse(b.dataClasses) : []; } catch {}

        return (
          <div key={b.id} className="bg-slate-900/50 rounded p-3 border border-slate-700/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-slate-200">{b.breachTitle || b.breachName}</span>
                {b.isVerified && <CheckCircle className="w-3 h-3 text-green-500" />}
              </div>
              <span className="text-xs text-slate-500">{b.breachDate || "Unknown date"}</span>
            </div>
            {b.breachDomain && (
              <p className="text-xs text-slate-400 mt-1">Domain: {b.breachDomain}</p>
            )}
            {b.pwnCount && (
              <p className="text-xs text-slate-500">
                {b.pwnCount.toLocaleString()} accounts affected
              </p>
            )}
            {dataClasses.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {dataClasses.map((dc, i) => (
                  <span key={i} className="text-[10px] px-1.5 py-0.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded">
                    {dc}
                  </span>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function DomainCard({
  domain,
  onDelete,
  onRefresh,
}: {
  domain: MonitoredDomain;
  onDelete: (id: number) => void;
  onRefresh: () => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const [newEmail, setNewEmail] = useState("");
  const [addingEmail, setAddingEmail] = useState(false);
  const [scanningAll, setScanningAll] = useState(false);
  const [scanningId, setScanningId] = useState<number | null>(null);
  const [showVerifyGuide, setShowVerifyGuide] = useState(false);
  const [expandedEmails, setExpandedEmails] = useState<Set<number>>(new Set());

  const totalBreaches = domain.emails.reduce((sum, e) => sum + e.breachCount, 0);
  const worstVerdict = domain.emails.some(e => e.verdict === "critical") ? "critical"
    : domain.emails.some(e => e.verdict === "exposed") ? "exposed"
    : domain.emails.some(e => e.verdict === "clean") ? "clean"
    : "unchecked";

  const vc = verdictConfig[worstVerdict];
  const VerdictIcon = vc.icon;

  const addEmail = async () => {
    if (!newEmail.trim()) return;
    setAddingEmail(true);
    try {
      await fetch(`${API_BASE}/api/domain-monitor/domains/${domain.id}/emails`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: newEmail.trim() }),
      });
      setNewEmail("");
      onRefresh();
    } catch {}
    setAddingEmail(false);
  };

  const deleteEmail = async (emailId: number) => {
    await fetch(`${API_BASE}/api/domain-monitor/emails/${emailId}`, { method: "DELETE" });
    onRefresh();
  };

  const scanEmail = async (emailId: number) => {
    setScanningId(emailId);
    try {
      const res = await fetch(`${API_BASE}/api/domain-monitor/emails/${emailId}/scan`, { method: "POST" });
      if (res.status === 429) {
        alert("HIBP rate limit reached. Please wait a few seconds and try again.");
      }
      onRefresh();
    } catch {}
    setScanningId(null);
  };

  const scanAll = async () => {
    setScanningAll(true);
    try {
      const res = await fetch(`${API_BASE}/api/domain-monitor/domains/${domain.id}/scan-all`, { method: "POST" });
      if (res.status === 429) {
        alert("HIBP rate limit reached during scan. Some results may be incomplete.");
      }
      onRefresh();
    } catch {}
    setScanningAll(false);
  };

  const toggleEmailExpand = (id: number) => {
    setExpandedEmails(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`border rounded-lg bg-slate-800/30 overflow-hidden ${vc.bg}`}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-slate-700/20 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Globe className="w-5 h-5 text-cyan-400" />
          <div className="text-left">
            <span className="font-mono text-sm font-semibold text-slate-200">{domain.domain}</span>
            <div className="flex items-center gap-3 mt-0.5">
              <span className="text-xs text-slate-500">{domain.emails.length} email(s)</span>
              {totalBreaches > 0 && (
                <span className="text-xs text-red-400">{totalBreaches} breach(es)</span>
              )}
              {domain.lastScanAt && (
                <span className="text-xs text-slate-500">
                  Scanned {formatDistanceToNow(new Date(domain.lastScanAt), { addSuffix: true })}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`flex items-center gap-1 text-xs font-mono ${vc.color}`}>
            <VerdictIcon className="w-4 h-4" /> {vc.label}
          </span>
          {expanded ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3">
              <div className="flex gap-2">
                <input
                  type="email"
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && addEmail()}
                  placeholder={`user@${domain.domain}`}
                  className="flex-1 bg-slate-900/50 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                />
                <button
                  onClick={addEmail}
                  disabled={addingEmail || !newEmail.trim()}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-mono bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white rounded transition-colors"
                >
                  {addingEmail ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                  ADD EMAIL
                </button>
              </div>

              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={scanAll}
                  disabled={scanningAll || domain.emails.length === 0}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono border border-cyan-500/30 text-cyan-400 rounded hover:bg-cyan-500/10 disabled:opacity-50 transition-colors"
                >
                  {scanningAll ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                  SCAN ALL EMAILS
                </button>
                <button
                  onClick={() => setShowVerifyGuide(!showVerifyGuide)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono border border-yellow-500/30 text-yellow-400 rounded hover:bg-yellow-500/10 transition-colors"
                >
                  <Info className="w-3 h-3" />
                  HIBP VERIFICATION GUIDE
                </button>
                <button
                  onClick={() => onDelete(domain.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono border border-red-500/30 text-red-400 rounded hover:bg-red-500/10 transition-colors ml-auto"
                >
                  <Trash2 className="w-3 h-3" />
                  REMOVE DOMAIN
                </button>
              </div>

              <AnimatePresence>
                {showVerifyGuide && (
                  <VerificationGuide domain={domain.domain} onClose={() => setShowVerifyGuide(false)} />
                )}
              </AnimatePresence>

              {domain.emails.length === 0 ? (
                <div className="text-center py-6 text-slate-500 text-sm">
                  <Mail className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p>No emails added yet</p>
                  <p className="text-xs mt-1">Add email addresses you use on this domain to check for breaches</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {domain.emails.map(email => {
                    const ev = verdictConfig[email.verdict] || verdictConfig.unchecked;
                    const EvIcon = ev.icon;
                    const isExpanded = expandedEmails.has(email.id);

                    return (
                      <div key={email.id} className="bg-slate-900/40 rounded border border-slate-700/30">
                        <div className="flex items-center gap-3 p-3">
                          <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <span className="text-sm text-slate-200 font-mono">{email.email}</span>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className={`flex items-center gap-1 text-[10px] font-mono ${ev.color}`}>
                                <EvIcon className="w-3 h-3" /> {ev.label}
                              </span>
                              {email.breachCount > 0 && (
                                <span className="text-[10px] text-red-400">{email.breachCount} breach(es)</span>
                              )}
                              {email.lastCheckedAt && (
                                <span className="text-[10px] text-slate-500">
                                  Checked {formatDistanceToNow(new Date(email.lastCheckedAt), { addSuffix: true })}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            {email.breachCount > 0 && (
                              <button
                                onClick={() => toggleEmailExpand(email.id)}
                                className="p-1.5 text-slate-400 hover:text-cyan-400 transition-colors"
                                title="View breaches"
                              >
                                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                              </button>
                            )}
                            <button
                              onClick={() => scanEmail(email.id)}
                              disabled={scanningId === email.id}
                              className="p-1.5 text-slate-400 hover:text-cyan-400 transition-colors"
                              title="Scan email"
                            >
                              {scanningId === email.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                            </button>
                            <button
                              onClick={() => deleteEmail(email.id)}
                              className="p-1.5 text-slate-400 hover:text-red-400 transition-colors"
                              title="Remove email"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden px-3 pb-3"
                            >
                              <EmailBreachDetails emailId={email.id} />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function DomainMonitor() {
  const [domains, setDomains] = useState<MonitoredDomain[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDomain, setShowAddDomain] = useState(false);
  const [newDomain, setNewDomain] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [adding, setAdding] = useState(false);

  const fetchDomains = useCallback(async () => {
    try {
      const r = await fetch(`${API_BASE}/api/domain-monitor/domains`);
      const data = await r.json();
      setDomains(data);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { fetchDomains(); }, [fetchDomains]);

  const addDomain = async () => {
    if (!newDomain.trim()) return;
    setAdding(true);
    try {
      const res = await fetch(`${API_BASE}/api/domain-monitor/domains`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: newDomain.trim(), notes: newNotes.trim() || null }),
      });
      if (res.ok) {
        setNewDomain("");
        setNewNotes("");
        setShowAddDomain(false);
        fetchDomains();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to add domain");
      }
    } catch {}
    setAdding(false);
  };

  const deleteDomain = async (id: number) => {
    if (!confirm("Remove this domain and all its tracked emails?")) return;
    await fetch(`${API_BASE}/api/domain-monitor/domains/${id}`, { method: "DELETE" });
    fetchDomains();
  };

  const totalEmails = domains.reduce((s, d) => s + d.emails.length, 0);
  const totalBreaches = domains.reduce((s, d) => s + d.emails.reduce((es, e) => es + e.breachCount, 0), 0);
  const exposedEmails = domains.reduce((s, d) => s + d.emails.filter(e => e.verdict === "exposed" || e.verdict === "critical").length, 0);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <PageHeader
        title="Domain Breach Monitor"
        subtitle="Track and verify breach exposure across your domains"
      />

      <WhyThisMatters>
        Instead of checking emails one at a time on Have I Been Pwned, add your domains here
        and list every email address you use on each one. Then scan them all at once to see
        which accounts have been compromised. This also guides you through HIBP's domain
        verification process so you can unlock full domain-level breach searching.
      </WhyThisMatters>

      {!loading && domains.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-4 text-center">
            <div className="text-2xl font-mono font-bold text-cyan-400">{domains.length}</div>
            <div className="text-xs text-slate-400 mt-1">Domains</div>
          </div>
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-4 text-center">
            <div className="text-2xl font-mono font-bold text-slate-200">{totalEmails}</div>
            <div className="text-xs text-slate-400 mt-1">Emails Tracked</div>
          </div>
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-4 text-center">
            <div className={`text-2xl font-mono font-bold ${totalBreaches > 0 ? "text-red-400" : "text-green-400"}`}>
              {totalBreaches}
            </div>
            <div className="text-xs text-slate-400 mt-1">Breaches Found</div>
          </div>
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-4 text-center">
            <div className={`text-2xl font-mono font-bold ${exposedEmails > 0 ? "text-yellow-400" : "text-green-400"}`}>
              {exposedEmails}
            </div>
            <div className="text-xs text-slate-400 mt-1">Exposed Emails</div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <span className="text-sm text-slate-400 font-mono">
          {domains.length} domain(s) monitored
        </span>
        <button
          onClick={() => setShowAddDomain(!showAddDomain)}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-mono bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          ADD DOMAIN
        </button>
      </div>

      <AnimatePresence>
        {showAddDomain && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="border border-cyan-500/30 bg-slate-800/40 rounded-lg p-4 space-y-3">
              <h3 className="text-sm font-mono font-semibold text-cyan-400">ADD DOMAIN</h3>
              <input
                type="text"
                value={newDomain}
                onChange={e => setNewDomain(e.target.value)}
                placeholder="example.com"
                className="w-full bg-slate-900/50 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500"
              />
              <input
                type="text"
                value={newNotes}
                onChange={e => setNewNotes(e.target.value)}
                placeholder="Notes (optional) — e.g., Personal domain, Business domain"
                className="w-full bg-slate-900/50 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500"
              />
              <div className="flex gap-2">
                <button
                  onClick={addDomain}
                  disabled={adding || !newDomain.trim()}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-mono bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white rounded transition-colors"
                >
                  {adding ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                  ADD DOMAIN
                </button>
                <button
                  onClick={() => { setShowAddDomain(false); setNewDomain(""); setNewNotes(""); }}
                  className="px-4 py-2 text-xs font-mono text-slate-400 border border-slate-700 rounded hover:bg-slate-700/50 transition-colors"
                >
                  CANCEL
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
        </div>
      ) : domains.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 space-y-4">
          <Globe className="w-16 h-16 text-slate-700" />
          <div className="text-center space-y-2">
            <h3 className="text-lg font-mono font-semibold text-slate-300">No Domains Monitored</h3>
            <p className="text-sm text-slate-500 max-w-md">
              Add your domains (e.g., drryans.com) and the email addresses you use on them.
              Then scan to check if any have been compromised in known data breaches.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {domains.map(d => (
            <DomainCard key={d.id} domain={d} onDelete={deleteDomain} onRefresh={fetchDomains} />
          ))}
        </div>
      )}
    </div>
  );
}
