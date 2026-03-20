import { useState, useEffect, useRef } from "react";
import { Lock, Eye, EyeOff, ShieldCheck } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL || "";
const SESSION_KEY = "gl_pin_verified";
const SESSION_TTL = 30 * 60 * 1000;

interface PinGateProps {
  children: React.ReactNode;
}

export function PinGate({ children }: PinGateProps) {
  const [hasPin, setHasPin] = useState<boolean | null>(null);
  const [verified, setVerified] = useState(false);
  const [showSetup, setShowSetup] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem(SESSION_KEY);
    if (stored) {
      const ts = parseInt(stored, 10);
      if (Date.now() - ts < SESSION_TTL) {
        setVerified(true);
      } else {
        sessionStorage.removeItem(SESSION_KEY);
      }
    }

    fetch(`${API_BASE}/api/platform-pin/status`)
      .then(r => r.json())
      .then(d => setHasPin(d.hasPin))
      .catch(() => setHasPin(false));
  }, []);

  if (hasPin === null) return null;

  if (!hasPin && !showSetup) {
    return (
      <div className="space-y-4">
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-5 flex items-start gap-4">
          <Lock className="h-5 w-5 text-amber-400 mt-0.5 shrink-0" />
          <div>
            <h3 className="text-sm font-semibold text-amber-400 mb-1">No PIN Set</h3>
            <p className="text-xs text-gray-400 mb-3">
              This page contains sensitive security settings. Set a PIN to protect access to this page.
            </p>
            <button
              onClick={() => setShowSetup(true)}
              className="px-4 py-2 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs font-bold uppercase tracking-wider hover:bg-amber-500/30 transition-colors"
            >
              Set Up PIN Protection
            </button>
          </div>
        </div>
        {children}
      </div>
    );
  }

  if (!hasPin && showSetup) {
    return <PinSetupScreen onComplete={() => { setHasPin(true); setVerified(true); sessionStorage.setItem(SESSION_KEY, Date.now().toString()); }} />;
  }

  if (hasPin && !verified) {
    return <PinEntryScreen onSuccess={() => { setVerified(true); sessionStorage.setItem(SESSION_KEY, Date.now().toString()); }} />;
  }

  return <>{children}</>;
}

function PinSetupScreen({ onComplete }: { onComplete: () => void }) {
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleSubmit = async () => {
    if (pin.length < 4) { setError("PIN must be at least 4 characters"); return; }
    if (pin !== confirm) { setError("PINs don't match"); return; }

    setSaving(true);
    setError("");
    try {
      const r = await fetch(`${API_BASE}/api/platform-pin/set`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      if (!r.ok) throw new Error("Failed");
      onComplete();
    } catch {
      setError("Failed to set PIN");
    }
    setSaving(false);
  };

  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="bg-gray-900/80 border border-gray-700 rounded-2xl p-8 w-full max-w-sm space-y-5">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-cyan-500/10 border border-cyan-500/20 mb-4">
            <ShieldCheck className="h-7 w-7 text-cyan-400" />
          </div>
          <h2 className="text-lg font-bold text-white">Set Access PIN</h2>
          <p className="text-xs text-gray-500 mt-1">
            Create a PIN to protect access to your security settings.
          </p>
        </div>

        <div>
          <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 block mb-1.5">New PIN</label>
          <div className="relative">
            <input
              ref={inputRef}
              type={show ? "text" : "password"}
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="Enter PIN (min 4 characters)"
              className="w-full bg-black/40 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-cyan-500/40 pr-10"
              onKeyDown={(e) => e.key === "Enter" && confirm && handleSubmit()}
            />
            <button
              type="button"
              onClick={() => setShow(!show)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400"
            >
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div>
          <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 block mb-1.5">Confirm PIN</label>
          <input
            type={show ? "text" : "password"}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Confirm your PIN"
            className="w-full bg-black/40 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-cyan-500/40"
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          />
        </div>

        {error && <p className="text-xs text-red-400 text-center">{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={saving || pin.length < 4}
          className="w-full px-4 py-2.5 rounded-lg bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 text-xs font-bold uppercase tracking-widest hover:bg-cyan-500/30 transition-colors disabled:opacity-40"
        >
          {saving ? "Setting PIN..." : "Set PIN & Continue"}
        </button>
      </div>
    </div>
  );
}

function PinEntryScreen({ onSuccess }: { onSuccess: () => void }) {
  const [pin, setPin] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleSubmit = async () => {
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
        onSuccess();
      } else {
        setAttempts(prev => prev + 1);
        setError(attempts >= 2 ? "Too many failed attempts. Please try again carefully." : "Incorrect PIN. Try again.");
        setPin("");
        inputRef.current?.focus();
      }
    } catch {
      setError("Verification failed. Please try again.");
    }
    setChecking(false);
  };

  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="bg-gray-900/80 border border-gray-700 rounded-2xl p-8 w-full max-w-sm space-y-5">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-red-500/10 border border-red-500/20 mb-4">
            <Lock className="h-7 w-7 text-red-400" />
          </div>
          <h2 className="text-lg font-bold text-white">Enter Access PIN</h2>
          <p className="text-xs text-gray-500 mt-1">
            This page is protected. Enter your PIN to continue.
          </p>
        </div>

        <div>
          <div className="relative">
            <input
              ref={inputRef}
              type={show ? "text" : "password"}
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="Enter your PIN"
              className="w-full bg-black/40 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-cyan-500/40 pr-10"
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            />
            <button
              type="button"
              onClick={() => setShow(!show)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400"
            >
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {error && <p className="text-xs text-red-400 text-center">{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={checking || !pin}
          className="w-full px-4 py-2.5 rounded-lg bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 text-xs font-bold uppercase tracking-widest hover:bg-cyan-500/30 transition-colors disabled:opacity-40"
        >
          {checking ? "Verifying..." : "Unlock"}
        </button>
      </div>
    </div>
  );
}
