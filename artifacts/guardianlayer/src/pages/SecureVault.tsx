import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import {
  Shield, Lock, Plus, Trash2, Eye, EyeOff, CreditCard, Phone,
  ExternalLink, FileText, Edit2, Save, X, Loader2, AlertTriangle,
  Globe, ShieldCheck, ChevronDown, ChevronUp, Building, Key,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { WhyThisMatters } from "@/components/clarity/WhyThisMatters";

const API_BASE = import.meta.env.VITE_API_URL || "";
const PIN_SESSION_KEY = "gl_pin_verified";
const PIN_SESSION_TTL = 30 * 60 * 1000;

interface VaultEntry {
  id: number;
  entryType: string;
  label: string;
  issuer: string | null;
  lastFour: string | null;
  websiteUrl: string | null;
  phoneNumber: string | null;
  breachInstructions: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

const entryTypeConfig: Record<string, { icon: typeof CreditCard; label: string; color: string }> = {
  card: { icon: CreditCard, label: "Credit/Debit Card", color: "text-amber-400" },
  bank: { icon: Building, label: "Bank Account", color: "text-blue-400" },
  login: { icon: Key, label: "Login Credentials", color: "text-purple-400" },
  identity: { icon: Shield, label: "Identity Document", color: "text-red-400" },
  other: { icon: FileText, label: "Other", color: "text-slate-400" },
};

const DEFAULT_BREACH_INSTRUCTIONS: Record<string, string> = {
  card: `1. IMMEDIATELY call the fraud hotline number listed above
2. Report the card as compromised and request a new card number
3. Review recent transactions for unauthorized charges
4. Dispute any fraudulent charges
5. Set up transaction alerts on the new card
6. Update any auto-pay/subscription services with the new card number
7. Monitor your statements closely for the next 3-6 months
8. Consider placing a fraud alert with the credit bureaus:
   - Equifax: 1-800-525-6285
   - Experian: 1-888-397-3742
   - TransUnion: 1-800-680-7289
9. File a report with the FTC at identitytheft.gov
10. If charges exceed $1,000, file a police report`,
  bank: `1. Call your bank's fraud department immediately using the number above
2. Place a temporary hold on your account
3. Change your online banking password and security questions
4. Review recent transactions and flag unauthorized ones
5. Request new account numbers if needed
6. Set up transaction alerts and two-factor authentication
7. Monitor your account daily for the next 30 days
8. File a complaint with your bank in writing
9. Report to the FTC at identitytheft.gov`,
  login: `1. Change the password immediately on the affected account
2. Enable two-factor authentication if not already active
3. Check for any unauthorized changes to account settings
4. Review login history and active sessions
5. Revoke access for any unrecognized devices
6. If the email was compromised, change passwords on all accounts using that email
7. Check if the credentials were reused on other sites (haveibeenpwned.com)
8. Consider using a password manager to generate unique passwords`,
  identity: `1. Place a fraud alert with all three credit bureaus
2. Consider a credit freeze:
   - Equifax: 1-800-349-9960
   - Experian: 1-888-397-3742
   - TransUnion: 1-888-909-8872
3. Report to FTC at identitytheft.gov
4. File a police report
5. Contact the IRS Identity Protection Unit: 1-800-908-4490
6. Monitor your credit reports at annualcreditreport.com
7. Check for any new accounts opened in your name
8. Contact Social Security if your SSN was exposed: 1-800-772-1213`,
};

function PinGateInline({ children }: { children: React.ReactNode }) {
  const [hasPin, setHasPin] = useState<boolean | null>(null);
  const [verified, setVerified] = useState(false);
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);
  const [setupPin, setSetupPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [showSetup, setShowSetup] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem(PIN_SESSION_KEY);
    if (stored && Date.now() - parseInt(stored, 10) < PIN_SESSION_TTL) {
      setVerified(true);
    }
    fetch(`${API_BASE}/api/platform-pin/status`)
      .then(r => r.json())
      .then(d => setHasPin(d.hasPin))
      .catch(() => setHasPin(false));
  }, []);

  if (hasPin === null) return null;

  if (!hasPin && !showSetup) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="bg-gray-900/80 border border-red-500/30 rounded-2xl p-8 w-full max-w-md space-y-5 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 mb-2">
            <Lock className="h-8 w-8 text-red-400" />
          </div>
          <h2 className="text-xl font-bold text-white">Secure Vault Requires PIN</h2>
          <p className="text-sm text-gray-400">
            Before you can access the Secure Vault, you must set up a platform PIN.
            This PIN protects your most sensitive data.
          </p>
          <button
            onClick={() => setShowSetup(true)}
            className="px-6 py-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 text-sm font-bold uppercase tracking-wider hover:bg-red-500/30 transition-colors"
          >
            Set Up PIN Now
          </button>
        </div>
      </div>
    );
  }

  if (!hasPin && showSetup) {
    const handleSetup = async () => {
      if (setupPin.length < 4) { setError("PIN must be at least 4 characters"); return; }
      if (setupPin !== confirmPin) { setError("PINs don't match"); return; }
      setSaving(true);
      setError("");
      try {
        const r = await fetch(`${API_BASE}/api/platform-pin/set`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pin: setupPin }),
        });
        if (!r.ok) throw new Error();
        setHasPin(true);
        setVerified(true);
        sessionStorage.setItem(PIN_SESSION_KEY, Date.now().toString());
      } catch {
        setError("Failed to set PIN");
      }
      setSaving(false);
    };

    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="bg-gray-900/80 border border-gray-700 rounded-2xl p-8 w-full max-w-sm space-y-5">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-cyan-500/10 border border-cyan-500/20 mb-4">
              <ShieldCheck className="h-7 w-7 text-cyan-400" />
            </div>
            <h2 className="text-lg font-bold text-white">Set Access PIN</h2>
            <p className="text-xs text-gray-500 mt-1">Create a PIN to protect your Secure Vault.</p>
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 block mb-1.5">New PIN</label>
            <input
              type={showPin ? "text" : "password"}
              value={setupPin}
              onChange={e => setSetupPin(e.target.value)}
              placeholder="Enter PIN (min 4 characters)"
              className="w-full bg-black/40 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-cyan-500/40"
              autoFocus
            />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 block mb-1.5">Confirm PIN</label>
            <input
              type={showPin ? "text" : "password"}
              value={confirmPin}
              onChange={e => setConfirmPin(e.target.value)}
              placeholder="Confirm your PIN"
              className="w-full bg-black/40 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-cyan-500/40"
              onKeyDown={e => e.key === "Enter" && handleSetup()}
            />
          </div>
          {error && <p className="text-xs text-red-400 text-center">{error}</p>}
          <button
            onClick={handleSetup}
            disabled={saving || setupPin.length < 4}
            className="w-full px-4 py-2.5 rounded-lg bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 text-xs font-bold uppercase tracking-widest hover:bg-cyan-500/30 transition-colors disabled:opacity-40"
          >
            {saving ? "Setting PIN..." : "Set PIN & Continue"}
          </button>
        </div>
      </div>
    );
  }

  if (hasPin && !verified) {
    const handleVerify = async () => {
      if (!pin) return;
      setChecking(true);
      setError("");
      try {
        const r = await fetch(`${API_BASE}/api/platform-pin/verify`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pin }),
        });
        const d = await r.json();
        if (d.valid) {
          setVerified(true);
          sessionStorage.setItem(PIN_SESSION_KEY, Date.now().toString());
        } else {
          setError("Incorrect PIN");
          setPin("");
        }
      } catch {
        setError("Verification failed");
      }
      setChecking(false);
    };

    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="bg-gray-900/80 border border-red-500/30 rounded-2xl p-8 w-full max-w-sm space-y-5">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-red-500/10 border border-red-500/20 mb-4">
              <Lock className="h-7 w-7 text-red-400" />
            </div>
            <h2 className="text-lg font-bold text-white">Secure Vault Locked</h2>
            <p className="text-xs text-gray-500 mt-1">Enter your PIN to access sensitive data.</p>
          </div>
          <div className="relative">
            <input
              type={showPin ? "text" : "password"}
              value={pin}
              onChange={e => setPin(e.target.value)}
              placeholder="Enter your PIN"
              className="w-full bg-black/40 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-red-500/40 pr-10"
              onKeyDown={e => e.key === "Enter" && handleVerify()}
              autoFocus
            />
            <button
              onClick={() => setShowPin(!showPin)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400"
            >
              {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {error && <p className="text-xs text-red-400 text-center">{error}</p>}
          <button
            onClick={handleVerify}
            disabled={checking || !pin}
            className="w-full px-4 py-2.5 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-bold uppercase tracking-widest hover:bg-red-500/30 transition-colors disabled:opacity-40"
          >
            {checking ? "Verifying..." : "Unlock Vault"}
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

function VaultEntryCard({
  entry,
  onDelete,
  onRefresh,
}: {
  entry: VaultEntry;
  onDelete: (id: number) => void;
  onRefresh: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [sensitiveData, setSensitiveData] = useState<any>(null);
  const [revealing, setRevealing] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editLabel, setEditLabel] = useState(entry.label);
  const [editIssuer, setEditIssuer] = useState(entry.issuer || "");
  const [editPhone, setEditPhone] = useState(entry.phoneNumber || "");
  const [editUrl, setEditUrl] = useState(entry.websiteUrl || "");
  const [editInstructions, setEditInstructions] = useState(entry.breachInstructions || "");
  const [editNotes, setEditNotes] = useState(entry.notes || "");
  const [saving, setSaving] = useState(false);

  const config = entryTypeConfig[entry.entryType] || entryTypeConfig.other;
  const Icon = config.icon;

  const revealData = async () => {
    const stored = sessionStorage.getItem(PIN_SESSION_KEY);
    if (!stored || Date.now() - parseInt(stored, 10) >= PIN_SESSION_TTL) {
      alert("PIN session expired. Please re-enter your PIN.");
      window.location.reload();
      return;
    }

    setRevealing(true);
    try {
      const r = await fetch(`${API_BASE}/api/secure-vault/entries/${entry.id}/reveal`);
      if (r.ok) {
        const data = await r.json();
        setSensitiveData(data.sensitiveData);
        setRevealed(true);
      }
    } catch {}
    setRevealing(false);
  };

  const hideData = () => {
    setRevealed(false);
    setSensitiveData(null);
  };

  const saveEdit = async () => {
    setSaving(true);
    try {
      await fetch(`${API_BASE}/api/secure-vault/entries/${entry.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: editLabel,
          issuer: editIssuer || null,
          phoneNumber: editPhone || null,
          websiteUrl: editUrl || null,
          breachInstructions: editInstructions || null,
          notes: editNotes || null,
        }),
      });
      setEditing(false);
      onRefresh();
    } catch {}
    setSaving(false);
  };

  return (
    <motion.div
      layout
      className="border border-slate-700/50 bg-slate-800/40 rounded-lg overflow-hidden"
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-slate-700/20 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg bg-slate-900/50 ${config.color}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div className="text-left">
            <div className="text-sm font-mono font-semibold text-slate-200">{entry.label}</div>
            <div className="text-xs text-slate-500 flex items-center gap-2">
              <span>{config.label}</span>
              {entry.issuer && <span>— {entry.issuer}</span>}
              {entry.lastFour && <span className="font-mono">••••{entry.lastFour}</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Lock className="w-3 h-3 text-red-400" />
          {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
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
            <div className="px-4 pb-4 space-y-4 border-t border-slate-700/30 pt-4">
              {!revealed ? (
                <div className="flex items-center justify-center py-6">
                  <button
                    onClick={revealData}
                    disabled={revealing}
                    className="flex items-center gap-2 px-6 py-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 hover:bg-red-500/20 transition-colors text-sm font-mono"
                  >
                    {revealing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
                    {revealing ? "DECRYPTING..." : "REVEAL SENSITIVE DATA"}
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-red-400 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> SENSITIVE DATA VISIBLE
                    </span>
                    <button
                      onClick={hideData}
                      className="flex items-center gap-1 px-3 py-1 text-xs font-mono text-slate-400 border border-slate-700 rounded hover:bg-slate-700/50 transition-colors"
                    >
                      <EyeOff className="w-3 h-3" /> HIDE
                    </button>
                  </div>
                  <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-4 space-y-2">
                    {sensitiveData && Object.entries(sensitiveData).map(([key, value]) => (
                      <div key={key} className="flex items-start gap-2">
                        <span className="text-xs text-slate-500 font-mono min-w-[120px] uppercase">{key.replace(/([A-Z])/g, " $1").trim()}:</span>
                        <span className="text-sm text-white font-mono break-all">{String(value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!editing ? (
                <div className="space-y-3">
                  {entry.phoneNumber && (
                    <div className="flex items-center gap-2 bg-slate-900/40 rounded-lg p-3">
                      <Phone className="w-4 h-4 text-green-400 shrink-0" />
                      <div>
                        <div className="text-[10px] text-slate-500 uppercase">Fraud Hotline</div>
                        <a href={`tel:${entry.phoneNumber}`} className="text-sm text-green-400 font-mono hover:underline">
                          {entry.phoneNumber}
                        </a>
                      </div>
                    </div>
                  )}

                  {entry.websiteUrl && (
                    <div className="flex items-center gap-2 bg-slate-900/40 rounded-lg p-3">
                      <Globe className="w-4 h-4 text-cyan-400 shrink-0" />
                      <div>
                        <div className="text-[10px] text-slate-500 uppercase">Account Website</div>
                        <a
                          href={entry.websiteUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-cyan-400 hover:underline flex items-center gap-1"
                        >
                          {entry.websiteUrl} <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  )}

                  {entry.breachInstructions && (
                    <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="w-4 h-4 text-amber-400" />
                        <span className="text-xs font-mono font-semibold text-amber-400">IF BREACHED — DO THIS:</span>
                      </div>
                      <pre className="text-xs text-slate-300 whitespace-pre-wrap font-mono leading-relaxed">
                        {entry.breachInstructions}
                      </pre>
                    </div>
                  )}

                  {entry.notes && (
                    <div className="text-xs text-slate-500 bg-slate-900/30 rounded p-3">
                      <span className="font-semibold text-slate-400">Notes:</span> {entry.notes}
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-2 border-t border-slate-700/30">
                    <button
                      onClick={() => setEditing(true)}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-mono text-cyan-400 border border-cyan-500/30 rounded hover:bg-cyan-500/10 transition-colors"
                    >
                      <Edit2 className="w-3 h-3" /> EDIT
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Delete "${entry.label}" from the vault? This cannot be undone.`)) {
                          onDelete(entry.id);
                        }
                      }}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-mono text-red-400 border border-red-500/30 rounded hover:bg-red-500/10 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" /> DELETE
                    </button>
                    <span className="text-[10px] text-slate-600 ml-auto">
                      Updated {formatDistanceToNow(new Date(entry.updatedAt), { addSuffix: true })}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 border-t border-slate-700/30 pt-3">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-1">Label</label>
                    <input value={editLabel} onChange={e => setEditLabel(e.target.value)}
                      className="w-full bg-slate-900/50 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-1">Issuer / Bank</label>
                    <input value={editIssuer} onChange={e => setEditIssuer(e.target.value)}
                      className="w-full bg-slate-900/50 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-1">Fraud Phone Number</label>
                    <input value={editPhone} onChange={e => setEditPhone(e.target.value)} placeholder="e.g., 1-800-555-1234"
                      className="w-full bg-slate-900/50 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-1">Website URL</label>
                    <input value={editUrl} onChange={e => setEditUrl(e.target.value)} placeholder="https://..."
                      className="w-full bg-slate-900/50 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-1">Breach Response Instructions</label>
                    <textarea value={editInstructions} onChange={e => setEditInstructions(e.target.value)} rows={8}
                      className="w-full bg-slate-900/50 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 font-mono" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-1">Notes</label>
                    <input value={editNotes} onChange={e => setEditNotes(e.target.value)}
                      className="w-full bg-slate-900/50 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500" />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={saveEdit} disabled={saving}
                      className="flex items-center gap-1 px-4 py-2 text-xs font-mono bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white rounded transition-colors">
                      {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} SAVE
                    </button>
                    <button onClick={() => setEditing(false)}
                      className="px-4 py-2 text-xs font-mono text-slate-400 border border-slate-700 rounded hover:bg-slate-700/50 transition-colors">
                      CANCEL
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function AddEntryForm({ onCreated }: { onCreated: () => void }) {
  const [entryType, setEntryType] = useState("card");
  const [label, setLabel] = useState("");
  const [issuer, setIssuer] = useState("");
  const [lastFour, setLastFour] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [sensitiveFields, setSensitiveFields] = useState<Record<string, string>>({});
  const [creating, setCreating] = useState(false);

  const sensitiveFieldDefs: Record<string, { label: string; placeholder: string }[]> = {
    card: [
      { label: "Card Number", placeholder: "1234 5678 9012 3456" },
      { label: "Expiration", placeholder: "MM/YY" },
      { label: "CVV", placeholder: "123" },
      { label: "Cardholder Name", placeholder: "JOHN DOE" },
      { label: "Billing ZIP", placeholder: "12345" },
    ],
    bank: [
      { label: "Account Number", placeholder: "Account number" },
      { label: "Routing Number", placeholder: "Routing number" },
      { label: "Account Type", placeholder: "Checking / Savings" },
      { label: "Online Username", placeholder: "Username" },
    ],
    login: [
      { label: "Username", placeholder: "Username or email" },
      { label: "Password", placeholder: "Password" },
      { label: "Recovery Email", placeholder: "Recovery email" },
      { label: "2FA Backup Codes", placeholder: "Backup codes (comma separated)" },
    ],
    identity: [
      { label: "Document Type", placeholder: "SSN / Passport / Driver License" },
      { label: "Document Number", placeholder: "Document number" },
      { label: "Issue Date", placeholder: "MM/DD/YYYY" },
      { label: "Expiry Date", placeholder: "MM/DD/YYYY" },
    ],
    other: [
      { label: "Data 1", placeholder: "Sensitive data" },
      { label: "Data 2", placeholder: "Additional data" },
    ],
  };

  const fields = sensitiveFieldDefs[entryType] || sensitiveFieldDefs.other;
  const defaultInstructions = DEFAULT_BREACH_INSTRUCTIONS[entryType] || "";
  const [breachInstructions, setBreachInstructions] = useState(defaultInstructions);

  useEffect(() => {
    setBreachInstructions(DEFAULT_BREACH_INSTRUCTIONS[entryType] || "");
    setSensitiveFields({});
  }, [entryType]);

  const handleCreate = async () => {
    if (!label.trim()) return;
    setCreating(true);
    try {
      const cleanSensitive: Record<string, string> = {};
      for (const [k, v] of Object.entries(sensitiveFields)) {
        if (v.trim()) cleanSensitive[k] = v.trim();
      }

      const res = await fetch(`${API_BASE}/api/secure-vault/entries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entryType,
          label: label.trim(),
          issuer: issuer.trim() || null,
          lastFour: lastFour.trim() || null,
          sensitiveData: cleanSensitive,
          phoneNumber: phoneNumber.trim() || null,
          websiteUrl: websiteUrl.trim() || null,
          breachInstructions: breachInstructions.trim() || null,
          notes: notes.trim() || null,
        }),
      });
      if (res.ok) {
        setLabel("");
        setIssuer("");
        setLastFour("");
        setPhoneNumber("");
        setWebsiteUrl("");
        setNotes("");
        setSensitiveFields({});
        onCreated();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to create entry");
      }
    } catch {
      alert("Failed to create vault entry");
    }
    setCreating(false);
  };

  return (
    <div className="border border-cyan-500/30 bg-slate-800/40 rounded-lg p-5 space-y-4">
      <h3 className="text-sm font-mono font-semibold text-cyan-400">ADD NEW VAULT ENTRY</h3>

      <div>
        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-1.5">Entry Type</label>
        <div className="flex flex-wrap gap-2">
          {Object.entries(entryTypeConfig).map(([key, cfg]) => {
            const TypeIcon = cfg.icon;
            return (
              <button
                key={key}
                onClick={() => setEntryType(key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono rounded-lg border transition-colors ${
                  entryType === key
                    ? "bg-cyan-600/20 border-cyan-500/50 text-cyan-400"
                    : "border-slate-700 text-slate-400 hover:bg-slate-700/50"
                }`}
              >
                <TypeIcon className="w-3.5 h-3.5" />
                {cfg.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-1">Label *</label>
          <input value={label} onChange={e => setLabel(e.target.value)} placeholder="e.g., Chase Sapphire"
            className="w-full bg-slate-900/50 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500" />
        </div>
        <div>
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-1">Issuer / Bank</label>
          <input value={issuer} onChange={e => setIssuer(e.target.value)} placeholder="e.g., JPMorgan Chase"
            className="w-full bg-slate-900/50 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500" />
        </div>
      </div>

      {(entryType === "card" || entryType === "bank") && (
        <div>
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-1">
            {entryType === "card" ? "Last 4 Digits" : "Last 4 of Account"}
          </label>
          <input value={lastFour} onChange={e => setLastFour(e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="1234" maxLength={4}
            className="w-32 bg-slate-900/50 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200 font-mono focus:outline-none focus:border-cyan-500" />
        </div>
      )}

      <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Lock className="w-4 h-4 text-red-400" />
          <span className="text-xs font-mono font-semibold text-red-400">ENCRYPTED SENSITIVE DATA</span>
        </div>
        <p className="text-[10px] text-slate-500">
          This data is encrypted with AES-256-GCM before storage. It can only be revealed with your PIN.
        </p>
        {fields.map(field => (
          <div key={field.label}>
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-1">{field.label}</label>
            <input
              type="password"
              value={sensitiveFields[field.label] || ""}
              onChange={e => setSensitiveFields(prev => ({ ...prev, [field.label]: e.target.value }))}
              placeholder={field.placeholder}
              className="w-full bg-black/30 border border-red-500/20 rounded px-3 py-2 text-sm text-slate-200 font-mono focus:outline-none focus:border-red-500/40"
            />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-1">Fraud Phone Number</label>
          <input value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} placeholder="1-800-555-1234"
            className="w-full bg-slate-900/50 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500" />
        </div>
        <div>
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-1">Website URL</label>
          <input value={websiteUrl} onChange={e => setWebsiteUrl(e.target.value)} placeholder="https://www.chase.com"
            className="w-full bg-slate-900/50 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500" />
        </div>
      </div>

      <div>
        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-1">
          Breach Response Instructions
        </label>
        <textarea
          value={breachInstructions}
          onChange={e => setBreachInstructions(e.target.value)}
          rows={8}
          className="w-full bg-slate-900/50 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
        />
      </div>

      <div>
        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-1">Notes</label>
        <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional notes"
          className="w-full bg-slate-900/50 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500" />
      </div>

      <button
        onClick={handleCreate}
        disabled={creating || !label.trim()}
        className="flex items-center gap-1.5 px-5 py-2.5 text-xs font-mono bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white rounded-lg transition-colors"
      >
        {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
        ENCRYPT & SAVE
      </button>
    </div>
  );
}

export default function SecureVault() {
  const [entries, setEntries] = useState<VaultEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  const fetchEntries = useCallback(async () => {
    try {
      const r = await fetch(`${API_BASE}/api/secure-vault/entries`);
      const data = await r.json();
      setEntries(data);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  const deleteEntry = async (id: number) => {
    await fetch(`${API_BASE}/api/secure-vault/entries/${id}`, { method: "DELETE" });
    fetchEntries();
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <PageHeader
        title="Secure Vault"
        subtitle="PIN-protected encrypted storage for sensitive financial data"
      />

      <PinGateInline>
        <WhyThisMatters>
          Store your credit card numbers, bank accounts, and login credentials here with AES-256 encryption.
          Each entry includes the fraud hotline number, website URL, and step-by-step breach response instructions
          so you know exactly what to do if any account is compromised. Everything is encrypted at rest and
          requires your PIN to reveal.
        </WhyThisMatters>

        <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-3 flex items-center gap-2">
          <Lock className="w-4 h-4 text-red-400 shrink-0" />
          <span className="text-xs text-red-300">
            All sensitive data is encrypted with AES-256-GCM. Revealing data is logged for audit purposes.
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-400 font-mono">{entries.length} vault entry(s)</span>
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-mono bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            ADD ENTRY
          </button>
        </div>

        <AnimatePresence>
          {showAdd && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <AddEntryForm onCreated={() => { setShowAdd(false); fetchEntries(); }} />
            </motion.div>
          )}
        </AnimatePresence>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
          </div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 space-y-4">
            <Lock className="w-16 h-16 text-slate-700" />
            <div className="text-center space-y-2">
              <h3 className="text-lg font-mono font-semibold text-slate-300">Vault Empty</h3>
              <p className="text-sm text-slate-500 max-w-md">
                Add your credit cards, bank accounts, and login credentials.
                Each entry stores the fraud hotline number and breach response instructions
                so you know exactly who to call and what to do.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {entries.map(entry => (
              <VaultEntryCard key={entry.id} entry={entry} onDelete={deleteEntry} onRefresh={fetchEntries} />
            ))}
          </div>
        )}
      </PinGateInline>
    </div>
  );
}
