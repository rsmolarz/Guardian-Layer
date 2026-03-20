import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format, formatDistanceToNow } from "date-fns";
import {
  Shield,
  Plus,
  Check,
  Clock,
  History,
  Trash2,
  Edit3,
  X,
  AlertTriangle,
  CheckCircle,
  Settings,
  Loader2,
  Lock,
  Key,
  Smartphone,
  Mail,
  Globe,
  CreditCard,
  ChevronDown,
  ChevronUp,
  RefreshCw,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { WhyThisMatters } from "@/components/clarity/WhyThisMatters";
import { PinGate } from "@/components/PinGate";

const API_BASE = import.meta.env.VITE_API_URL || "";

interface SecuritySetting {
  id: number;
  category: string;
  settingName: string;
  currentValue: string;
  notes: string | null;
  lastVerifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ChangeLogEntry {
  id: number;
  settingId: number;
  previousValue: string;
  newValue: string;
  changedBy: string;
  createdAt: string;
}

const CATEGORY_CONFIG: Record<string, { icon: typeof Shield; color: string; label: string }> = {
  google: { icon: Globe, color: "text-blue-400", label: "Google Account" },
  email: { icon: Mail, color: "text-cyan-400", label: "Email Security" },
  banking: { icon: CreditCard, color: "text-emerald-400", label: "Banking & Financial" },
  passwords: { icon: Key, color: "text-amber-400", label: "Passwords & Auth" },
  devices: { icon: Smartphone, color: "text-purple-400", label: "Devices & Apps" },
  other: { icon: Settings, color: "text-gray-400", label: "Other" },
};

const PRESET_SETTINGS: Record<string, string[]> = {
  google: [
    "2-Step Verification",
    "Recovery Phone",
    "Recovery Email",
    "Passkeys & Security Keys",
    "Google Authenticator",
    "Google Prompt Devices",
    "Backup Codes",
    "Password Last Changed",
    "Third-Party App Access",
    "Skip Password When Possible",
  ],
  email: [
    "Primary Email Provider",
    "Email 2FA Method",
    "Email Recovery Address",
    "Email Forwarding Rules",
    "Email App Passwords",
  ],
  banking: [
    "Primary Bank MFA Method",
    "Bank Alert Notifications",
    "Bank Recovery Phone",
    "Credit Card Alert Settings",
    "Credit Freeze Status (Equifax)",
    "Credit Freeze Status (Experian)",
    "Credit Freeze Status (TransUnion)",
  ],
  passwords: [
    "Password Manager",
    "Master Password Last Changed",
    "Biometric Login Enabled",
    "Auto-Lock Timeout",
  ],
  devices: [
    "Primary Phone Lock Method",
    "Phone Auto-Lock Timeout",
    "Find My Device Enabled",
    "Remote Wipe Enabled",
    "Trusted Devices Count",
  ],
};

function getStaleStatus(lastVerified: string | null): { label: string; color: string; urgent: boolean } {
  if (!lastVerified) return { label: "Never verified", color: "text-red-400", urgent: true };
  const days = Math.floor((Date.now() - new Date(lastVerified).getTime()) / (1000 * 60 * 60 * 24));
  if (days <= 7) return { label: `Verified ${formatDistanceToNow(new Date(lastVerified))} ago`, color: "text-emerald-400", urgent: false };
  if (days <= 30) return { label: `Verified ${days} days ago`, color: "text-amber-400", urgent: false };
  return { label: `Verified ${days} days ago — needs review`, color: "text-red-400", urgent: true };
}

export default function SecuritySettings() {
  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Security Settings Monitor"
        description="Track and verify your security settings across all accounts. Get alerted when something changes."
      />
      <WhyThisMatters explanation="Hackers often change your security settings (recovery phone, 2FA, backup email) after breaking in, so they can stay in control. This page lets you record your correct settings as a baseline, verify them regularly, and track any changes. If something doesn't match, you'll know immediately that your account may be compromised." />
      <PinGate>
        <SettingsContent />
      </PinGate>
    </div>
  );
}

function SettingsContent() {
  const [settings, setSettings] = useState<SecuritySetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [showPresets, setShowPresets] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [historyId, setHistoryId] = useState<number | null>(null);
  const [history, setHistory] = useState<ChangeLogEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API_BASE}/api/security-settings`);
      if (!r.ok) throw new Error("Failed");
      const d = await r.json();
      setSettings(d.settings || []);
    } catch {
      setSettings([]);
    }
    setLoading(false);
  };

  useEffect(() => { fetchSettings(); }, []);

  const handleVerify = async (id: number) => {
    try {
      await fetch(`${API_BASE}/api/security-settings/${id}/verify`, { method: "POST" });
      fetchSettings();
    } catch {}
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Remove this setting from your checklist?")) return;
    try {
      await fetch(`${API_BASE}/api/security-settings/${id}`, { method: "DELETE" });
      fetchSettings();
    } catch {}
  };

  const loadHistory = async (id: number) => {
    if (historyId === id) { setHistoryId(null); return; }
    setHistoryId(id);
    setHistoryLoading(true);
    try {
      const r = await fetch(`${API_BASE}/api/security-settings/${id}/history`);
      const d = await r.json();
      setHistory(d.history || []);
    } catch {
      setHistory([]);
    }
    setHistoryLoading(false);
  };

  const grouped = settings.reduce<Record<string, SecuritySetting[]>>((acc, s) => {
    const cat = s.category in CATEGORY_CONFIG ? s.category : "other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(s);
    return acc;
  }, {});

  const staleCount = settings.filter(s => getStaleStatus(s.lastVerifiedAt).urgent).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 text-cyan-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {staleCount > 0 && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-red-400 shrink-0" />
          <div>
            <span className="text-sm text-red-400 font-semibold">{staleCount} setting(s) need verification</span>
            <p className="text-xs text-gray-500 mt-0.5">Some settings haven't been verified recently. Check them to make sure nothing was changed without your knowledge.</p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500">{settings.length} settings tracked</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowPresets(!showPresets)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-500/20 border border-purple-500/30 text-purple-400 text-xs font-bold uppercase tracking-wider hover:bg-purple-500/30 transition-colors"
          >
            <Settings className="h-3 w-3" />
            Quick Add Presets
          </button>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 text-xs font-bold uppercase tracking-wider hover:bg-cyan-500/30 transition-colors"
          >
            <Plus className="h-3 w-3" />
            Add Custom Setting
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showPresets && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <PresetSelector
              existingSettings={settings}
              onAdd={fetchSettings}
              onClose={() => setShowPresets(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAdd && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <AddSettingForm onAdd={fetchSettings} onClose={() => setShowAdd(false)} />
          </motion.div>
        )}
      </AnimatePresence>

      {settings.length === 0 && !showAdd && !showPresets ? (
        <div className="bg-gray-900/50 border border-gray-700 border-dashed rounded-xl p-12 text-center">
          <Shield className="h-10 w-10 text-gray-700 mx-auto mb-4" />
          <p className="text-sm text-gray-400 mb-1">No security settings tracked yet</p>
          <p className="text-xs text-gray-600">Use "Quick Add Presets" to get started with common settings, or add custom ones.</p>
        </div>
      ) : (
        Object.entries(CATEGORY_CONFIG).map(([catKey, catConfig]) => {
          const items = grouped[catKey];
          if (!items || items.length === 0) return null;
          const CatIcon = catConfig.icon;

          return (
            <div key={catKey} className="space-y-2">
              <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gray-500">
                <CatIcon className={`h-4 w-4 ${catConfig.color}`} />
                {catConfig.label}
                <span className="text-gray-700">({items.length})</span>
              </h3>

              <div className="space-y-1.5">
                {items.map((setting) => {
                  const stale = getStaleStatus(setting.lastVerifiedAt);
                  const isEditing = editingId === setting.id;
                  const showingHistory = historyId === setting.id;

                  return (
                    <div key={setting.id}>
                      <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-3.5 flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full shrink-0 ${stale.urgent ? "bg-red-400 animate-pulse" : "bg-emerald-400"}`} />

                        {isEditing ? (
                          <EditSettingInline
                            setting={setting}
                            onSave={() => { setEditingId(null); fetchSettings(); }}
                            onCancel={() => setEditingId(null)}
                          />
                        ) : (
                          <>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-medium text-white">{setting.settingName}</span>
                                <code className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded">{setting.currentValue}</code>
                              </div>
                              <div className="flex items-center gap-3 mt-1 flex-wrap">
                                <span className={`text-[10px] font-mono ${stale.color}`}>
                                  <Clock className="h-3 w-3 inline mr-1" />
                                  {stale.label}
                                </span>
                                {setting.notes && (
                                  <span className="text-[10px] text-gray-600">{setting.notes}</span>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => handleVerify(setting.id)}
                                title="Mark as verified (still correct)"
                                className="p-1.5 rounded-md text-emerald-400/60 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                              >
                                <CheckCircle className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => setEditingId(setting.id)}
                                title="Update value"
                                className="p-1.5 rounded-md text-blue-400/60 hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
                              >
                                <Edit3 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => loadHistory(setting.id)}
                                title="View change history"
                                className="p-1.5 rounded-md text-amber-400/60 hover:text-amber-400 hover:bg-amber-500/10 transition-colors"
                              >
                                <History className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(setting.id)}
                                title="Remove"
                                className="p-1.5 rounded-md text-red-400/60 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </>
                        )}
                      </div>

                      <AnimatePresence>
                        {showingHistory && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="ml-5 mt-1 border-l-2 border-amber-500/20 pl-3 py-2 space-y-2">
                              {historyLoading ? (
                                <span className="text-xs text-gray-500">Loading history...</span>
                              ) : history.length === 0 ? (
                                <span className="text-xs text-gray-600">No changes recorded yet.</span>
                              ) : (
                                history.map((h) => (
                                  <div key={h.id} className="text-xs space-y-0.5">
                                    <div className="flex items-center gap-2 text-gray-500">
                                      <RefreshCw className="h-3 w-3 text-amber-400" />
                                      <span>{format(new Date(h.createdAt), "MMM d, yyyy 'at' h:mm a")}</span>
                                    </div>
                                    <div className="ml-5 flex items-center gap-2">
                                      <span className="text-red-400/70 line-through">{h.previousValue}</span>
                                      <span className="text-gray-600">&rarr;</span>
                                      <span className="text-emerald-400">{h.newValue}</span>
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })
      )}

      <PinManagement />
    </div>
  );
}

function EditSettingInline({
  setting,
  onSave,
  onCancel,
}: {
  setting: SecuritySetting;
  onSave: () => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(setting.currentValue);
  const [notes, setNotes] = useState(setting.notes || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch(`${API_BASE}/api/security-settings/${setting.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentValue: value, notes }),
      });
      onSave();
    } catch {}
    setSaving(false);
  };

  return (
    <div className="flex-1 flex items-center gap-2">
      <span className="text-sm text-gray-400 shrink-0">{setting.settingName}:</span>
      <input
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="flex-1 bg-black/40 border border-cyan-500/30 rounded px-2 py-1 text-sm text-white focus:outline-none"
        onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") onCancel(); }}
      />
      <button onClick={handleSave} disabled={saving} className="p-1 text-emerald-400 hover:bg-emerald-500/10 rounded">
        <Check className="h-4 w-4" />
      </button>
      <button onClick={onCancel} className="p-1 text-gray-500 hover:bg-gray-700 rounded">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

function AddSettingForm({ onAdd, onClose }: { onAdd: () => void; onClose: () => void }) {
  const [category, setCategory] = useState("google");
  const [name, setName] = useState("");
  const [value, setValue] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim() || !value.trim()) return;
    setSaving(true);
    try {
      await fetch(`${API_BASE}/api/security-settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, settingName: name.trim(), currentValue: value.trim(), notes: notes.trim() || undefined }),
      });
      onAdd();
      setName("");
      setValue("");
      setNotes("");
    } catch {}
    setSaving(false);
  };

  return (
    <div className="bg-gray-900/50 border border-cyan-500/20 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold uppercase tracking-widest text-cyan-400">Add Custom Setting</h4>
        <button onClick={onClose} className="text-gray-600 hover:text-gray-400"><X className="h-4 w-4" /></button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div>
          <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 block mb-1">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full bg-black/40 border border-gray-700 rounded-lg px-2 py-2 text-sm text-white focus:outline-none focus:border-cyan-500/40"
          >
            {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => (
              <option key={key} value={key}>{cfg.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 block mb-1">Setting Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Recovery Phone"
            className="w-full bg-black/40 border border-gray-700 rounded-lg px-2 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-cyan-500/40"
          />
        </div>
        <div>
          <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 block mb-1">Current Value</label>
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="e.g., (903) 555-1234"
            className="w-full bg-black/40 border border-gray-700 rounded-lg px-2 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-cyan-500/40"
          />
        </div>
        <div>
          <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 block mb-1">Notes (optional)</label>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any notes..."
            className="w-full bg-black/40 border border-gray-700 rounded-lg px-2 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-cyan-500/40"
          />
        </div>
      </div>
      <div className="flex justify-end">
        <button
          onClick={handleSubmit}
          disabled={saving || !name.trim() || !value.trim()}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 text-xs font-bold uppercase tracking-wider hover:bg-cyan-500/30 transition-colors disabled:opacity-40"
        >
          {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
          {saving ? "Adding..." : "Add Setting"}
        </button>
      </div>
    </div>
  );
}

function PresetSelector({
  existingSettings,
  onAdd,
  onClose,
}: {
  existingSettings: SecuritySetting[];
  onAdd: () => void;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState(false);
  const [expandedCat, setExpandedCat] = useState<string | null>("google");

  const existingNames = new Set(existingSettings.map(s => `${s.category}:${s.settingName}`));

  const toggle = (key: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const handleAdd = async () => {
    setAdding(true);
    for (const key of selected) {
      const [cat, ...nameParts] = key.split(":");
      const settingName = nameParts.join(":");
      try {
        await fetch(`${API_BASE}/api/security-settings`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ category: cat, settingName, currentValue: "Not set — fill in" }),
        });
      } catch {}
    }
    setSelected(new Set());
    onAdd();
    setAdding(false);
    onClose();
  };

  return (
    <div className="bg-gray-900/50 border border-purple-500/20 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold uppercase tracking-widest text-purple-400">Quick Add Common Settings</h4>
        <button onClick={onClose} className="text-gray-600 hover:text-gray-400"><X className="h-4 w-4" /></button>
      </div>
      <p className="text-xs text-gray-500">Select the settings you want to track. Already-tracked settings are grayed out.</p>

      <div className="space-y-2">
        {Object.entries(PRESET_SETTINGS).map(([cat, items]) => {
          const catConfig = CATEGORY_CONFIG[cat];
          const CatIcon = catConfig.icon;
          const isExpanded = expandedCat === cat;

          return (
            <div key={cat} className="border border-gray-800 rounded-lg overflow-hidden">
              <button
                onClick={() => setExpandedCat(isExpanded ? null : cat)}
                className="w-full flex items-center gap-2 p-3 text-left hover:bg-gray-800/30 transition-colors"
              >
                <CatIcon className={`h-4 w-4 ${catConfig.color}`} />
                <span className="text-xs font-bold uppercase tracking-widest text-gray-400 flex-1">{catConfig.label}</span>
                {isExpanded ? <ChevronUp className="h-3 w-3 text-gray-600" /> : <ChevronDown className="h-3 w-3 text-gray-600" />}
              </button>
              {isExpanded && (
                <div className="px-3 pb-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-1.5">
                  {items.map((item) => {
                    const key = `${cat}:${item}`;
                    const exists = existingNames.has(key);
                    const isSelected = selected.has(key);

                    return (
                      <button
                        key={key}
                        onClick={() => !exists && toggle(key)}
                        disabled={exists}
                        className={`text-left px-3 py-2 rounded-md text-xs transition-colors ${
                          exists
                            ? "text-gray-600 bg-gray-800/30 cursor-not-allowed"
                            : isSelected
                            ? "text-purple-300 bg-purple-500/20 border border-purple-500/30"
                            : "text-gray-400 hover:bg-gray-800/50 border border-transparent"
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          {exists ? <Check className="h-3 w-3 text-gray-600" /> : isSelected ? <Check className="h-3 w-3 text-purple-400" /> : <Plus className="h-3 w-3" />}
                          {item}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {selected.size > 0 && (
        <div className="flex items-center justify-between pt-2 border-t border-gray-800">
          <span className="text-xs text-gray-500">{selected.size} setting(s) selected</span>
          <button
            onClick={handleAdd}
            disabled={adding}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-500/20 border border-purple-500/30 text-purple-400 text-xs font-bold uppercase tracking-wider hover:bg-purple-500/30 transition-colors disabled:opacity-40"
          >
            {adding ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
            {adding ? "Adding..." : "Add Selected"}
          </button>
        </div>
      )}
    </div>
  );
}

function PinManagement() {
  const [hasPin, setHasPin] = useState(false);
  const [changing, setChanging] = useState(false);
  const [newPin, setNewPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`${API_BASE}/api/platform-pin/status`)
      .then(r => r.json())
      .then(d => setHasPin(d.hasPin))
      .catch(() => {});
  }, []);

  const handleChangePin = async () => {
    if (newPin.length < 4) { setError("PIN must be at least 4 characters"); return; }
    if (newPin !== confirm) { setError("PINs don't match"); return; }
    setSaving(true);
    setError("");
    try {
      await fetch(`${API_BASE}/api/platform-pin/set`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: newPin }),
      });
      setHasPin(true);
      setChanging(false);
      setNewPin("");
      setConfirm("");
    } catch {
      setError("Failed to update PIN");
    }
    setSaving(false);
  };

  const handleRemovePin = async () => {
    if (!window.confirm("Remove PIN protection? Anyone will be able to access this page.")) return;
    try {
      await fetch(`${API_BASE}/api/platform-pin`, { method: "DELETE" });
      setHasPin(false);
      sessionStorage.removeItem("gl_pin_verified");
    } catch {}
  };

  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
      <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400 flex items-center gap-2 mb-3">
        <Lock className="h-4 w-4 text-amber-400" />
        PIN Protection Settings
      </h4>

      {!changing ? (
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500">
              {hasPin
                ? "This page is PIN-protected. You'll need to enter your PIN each session."
                : "No PIN is set. This page is accessible without a password."
              }
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setChanging(true)}
              className="px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-bold uppercase tracking-wider hover:bg-amber-500/20 transition-colors"
            >
              {hasPin ? "Change PIN" : "Set PIN"}
            </button>
            {hasPin && (
              <button
                onClick={handleRemovePin}
                className="px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-bold uppercase tracking-wider hover:bg-red-500/20 transition-colors"
              >
                Remove PIN
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input
              type="password"
              value={newPin}
              onChange={(e) => setNewPin(e.target.value)}
              placeholder="New PIN (min 4 chars)"
              className="bg-black/40 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-amber-500/40"
            />
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Confirm PIN"
              className="bg-black/40 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-amber-500/40"
              onKeyDown={(e) => e.key === "Enter" && handleChangePin()}
            />
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <div className="flex gap-2 justify-end">
            <button onClick={() => { setChanging(false); setError(""); }} className="text-xs text-gray-500 hover:text-gray-300">Cancel</button>
            <button
              onClick={handleChangePin}
              disabled={saving}
              className="px-3 py-1.5 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-400 text-[10px] font-bold uppercase tracking-wider hover:bg-amber-500/30 transition-colors disabled:opacity-40"
            >
              {saving ? "Saving..." : "Save PIN"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
