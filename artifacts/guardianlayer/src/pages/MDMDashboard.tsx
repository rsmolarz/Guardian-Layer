import { useState } from "react";
import { motion } from "framer-motion";
import {
  Smartphone, Laptop, Tablet, Shield, AlertTriangle, CheckCircle2, XCircle,
  Lock, Unlock, MapPin, RefreshCw, Trash2, Eye, Clock, Wifi, Battery,
  Search, Loader2, HardDrive,
} from "lucide-react";
import { clsx } from "clsx";

interface ManagedDevice {
  id: string;
  name: string;
  type: "phone" | "tablet" | "laptop";
  os: string;
  osVersion: string;
  user: string;
  status: "compliant" | "non-compliant" | "lost" | "wiped";
  enrolled: string;
  lastCheckin: string;
  battery: number;
  storage: number;
  encrypted: boolean;
  passcodeSet: boolean;
  vpnActive: boolean;
  mdmProfile: string;
  location?: { city: string; country: string };
  issues: string[];
}

const TYPE_ICONS = {
  phone: Smartphone,
  tablet: Tablet,
  laptop: Laptop,
};

const STATUS_CONFIG = {
  compliant: { color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/30", label: "Compliant" },
  "non-compliant": { color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/30", label: "Non-Compliant" },
  lost: { color: "text-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/30", label: "Lost/Stolen" },
  wiped: { color: "text-gray-400", bg: "bg-gray-500/10", border: "border-gray-500/30", label: "Wiped" },
};

function generateDevices(): ManagedDevice[] {
  const now = Date.now();
  return [
    { id: "d1", name: "iPhone 15 Pro", type: "phone", os: "iOS", osVersion: "17.4.1", user: "rsmolarz", status: "compliant", enrolled: new Date(now - 86400000 * 180).toISOString(), lastCheckin: new Date(now - 300000).toISOString(), battery: 78, storage: 34, encrypted: true, passcodeSet: true, vpnActive: true, mdmProfile: "Executive", location: { city: "Chicago", country: "US" }, issues: [] },
    { id: "d2", name: "iPad Pro 12.9\"", type: "tablet", os: "iPadOS", osVersion: "17.4.1", user: "rsmolarz", status: "compliant", enrolled: new Date(now - 86400000 * 120).toISOString(), lastCheckin: new Date(now - 7200000).toISOString(), battery: 92, storage: 28, encrypted: true, passcodeSet: true, vpnActive: false, mdmProfile: "Executive", location: { city: "Chicago", country: "US" }, issues: [] },
    { id: "d3", name: "Samsung Galaxy S24", type: "phone", os: "Android", osVersion: "14", user: "j.martinez", status: "non-compliant", enrolled: new Date(now - 86400000 * 90).toISOString(), lastCheckin: new Date(now - 86400000).toISOString(), battery: 45, storage: 67, encrypted: true, passcodeSet: true, vpnActive: false, mdmProfile: "Standard", location: { city: "Miami", country: "US" }, issues: ["OS update required (Android 15 available)", "VPN not active"] },
    { id: "d4", name: "MacBook Pro 16\"", type: "laptop", os: "macOS", osVersion: "14.4", user: "a.williams", status: "compliant", enrolled: new Date(now - 86400000 * 365).toISOString(), lastCheckin: new Date(now - 1800000).toISOString(), battery: 100, storage: 42, encrypted: true, passcodeSet: true, vpnActive: true, mdmProfile: "Developer", location: { city: "Austin", country: "US" }, issues: [] },
    { id: "d5", name: "iPhone 14", type: "phone", os: "iOS", osVersion: "16.7.2", user: "k.johnson", status: "non-compliant", enrolled: new Date(now - 86400000 * 400).toISOString(), lastCheckin: new Date(now - 172800000).toISOString(), battery: 12, storage: 89, encrypted: true, passcodeSet: false, vpnActive: false, mdmProfile: "Standard", location: { city: "New York", country: "US" }, issues: ["iOS version outdated (17.x required)", "No passcode set", "Storage above 85%"] },
    { id: "d6", name: "Pixel 8 Pro", type: "phone", os: "Android", osVersion: "14", user: "m.thompson", status: "lost", enrolled: new Date(now - 86400000 * 200).toISOString(), lastCheckin: new Date(now - 86400000 * 3).toISOString(), battery: 0, storage: 55, encrypted: true, passcodeSet: true, vpnActive: false, mdmProfile: "Standard", location: { city: "London", country: "UK" }, issues: ["Device reported lost — remote lock initiated", "Last seen 3 days ago"] },
    { id: "d7", name: "ThinkPad X1 Carbon", type: "laptop", os: "Windows", osVersion: "11 23H2", user: "s.chen", status: "compliant", enrolled: new Date(now - 86400000 * 60).toISOString(), lastCheckin: new Date(now - 600000).toISOString(), battery: 65, storage: 51, encrypted: true, passcodeSet: true, vpnActive: true, mdmProfile: "Marketing", location: { city: "San Francisco", country: "US" }, issues: [] },
    { id: "d8", name: "iPhone 13 (old)", type: "phone", os: "iOS", osVersion: "15.8", user: "ex-employee", status: "wiped", enrolled: new Date(now - 86400000 * 500).toISOString(), lastCheckin: new Date(now - 86400000 * 30).toISOString(), battery: 0, storage: 0, encrypted: false, passcodeSet: false, vpnActive: false, mdmProfile: "Standard", location: undefined, issues: ["Device wiped on 2026-03-06 — employee offboarded"] },
  ];
}

export default function MDMDashboard() {
  const [devices] = useState(generateDevices);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [locking, setLocking] = useState<string | null>(null);

  const selected = devices.find(d => d.id === selectedId);
  const filtered = devices.filter(d => !search || d.name.toLowerCase().includes(search.toLowerCase()) || d.user.toLowerCase().includes(search.toLowerCase()));

  const compliantCount = devices.filter(d => d.status === "compliant").length;
  const nonCompliantCount = devices.filter(d => d.status === "non-compliant").length;
  const lostCount = devices.filter(d => d.status === "lost").length;

  const handleLock = async (id: string) => {
    setLocking(id);
    await new Promise(r => setTimeout(r, 2000));
    setLocking(null);
  };

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/30">
            <Smartphone className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Mobile Device Management</h1>
            <p className="text-gray-400 text-sm">Company device enrollment, compliance, and remote management</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-xl border p-4 bg-cyan-500/10 border-cyan-500/30">
            <p className="text-sm text-cyan-400 mb-1">Total Devices</p>
            <p className="text-3xl font-bold text-cyan-400">{devices.length}</p>
          </div>
          <div className="rounded-xl border p-4 bg-emerald-500/10 border-emerald-500/30">
            <p className="text-sm text-emerald-400 mb-1">Compliant</p>
            <p className="text-3xl font-bold text-emerald-400">{compliantCount}</p>
          </div>
          <div className="rounded-xl border p-4 bg-amber-500/10 border-amber-500/30">
            <p className="text-sm text-amber-400 mb-1">Non-Compliant</p>
            <p className="text-3xl font-bold text-amber-400">{nonCompliantCount}</p>
          </div>
          <div className="rounded-xl border p-4 bg-rose-500/10 border-rose-500/30">
            <p className="text-sm text-rose-400 mb-1">Lost/Stolen</p>
            <p className="text-3xl font-bold text-rose-400">{lostCount}</p>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search devices or users..." className="w-full bg-gray-900/50 border border-gray-800 rounded-lg pl-10 pr-4 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500/50" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-2 max-h-[600px] overflow-y-auto">
            {filtered.map(device => {
              const cfg = STATUS_CONFIG[device.status];
              const TypeIcon = TYPE_ICONS[device.type];
              return (
                <button key={device.id} onClick={() => setSelectedId(device.id)} className={clsx(
                  "w-full text-left p-3 rounded-xl border transition-all",
                  selectedId === device.id ? "bg-purple-500/10 border-purple-500/30" : `${cfg.bg} ${cfg.border} hover:bg-white/5`
                )}>
                  <div className="flex items-center gap-3">
                    <TypeIcon className={clsx("w-5 h-5 shrink-0", cfg.color)} />
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">{device.name}</p>
                      <p className="text-gray-500 text-xs">{device.user} · {device.os} {device.osVersion}</p>
                    </div>
                    {device.issues.length > 0 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400">{device.issues.length}</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="lg:col-span-2">
            {selected ? (
              <div className="space-y-4">
                <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      {(() => { const TIcon = TYPE_ICONS[selected.type]; return <TIcon className="w-6 h-6 text-purple-400" />; })()}
                      <div>
                        <h3 className="text-lg font-bold text-white">{selected.name}</h3>
                        <p className="text-gray-400 text-sm">{selected.user} · {selected.os} {selected.osVersion} · Profile: {selected.mdmProfile}</p>
                      </div>
                    </div>
                    <span className={clsx("text-xs px-3 py-1.5 rounded-lg border", STATUS_CONFIG[selected.status].bg, STATUS_CONFIG[selected.status].border, STATUS_CONFIG[selected.status].color)}>
                      {STATUS_CONFIG[selected.status].label}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="p-3 rounded-lg bg-gray-800/50">
                      <div className="flex items-center gap-1 text-gray-400 text-xs mb-1"><Battery className="w-3.5 h-3.5" /> Battery</div>
                      <p className={clsx("text-lg font-bold", selected.battery > 20 ? "text-emerald-400" : "text-rose-400")}>{selected.battery}%</p>
                    </div>
                    <div className="p-3 rounded-lg bg-gray-800/50">
                      <div className="flex items-center gap-1 text-gray-400 text-xs mb-1"><HardDrive className="w-3.5 h-3.5" /> Storage</div>
                      <p className={clsx("text-lg font-bold", selected.storage > 85 ? "text-rose-400" : "text-white")}>{selected.storage}%</p>
                    </div>
                    <div className="p-3 rounded-lg bg-gray-800/50">
                      <div className="flex items-center gap-1 text-gray-400 text-xs mb-1"><Lock className="w-3.5 h-3.5" /> Encrypted</div>
                      <p className={clsx("text-lg font-bold", selected.encrypted ? "text-emerald-400" : "text-rose-400")}>{selected.encrypted ? "Yes" : "No"}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-gray-800/50">
                      <div className="flex items-center gap-1 text-gray-400 text-xs mb-1"><Wifi className="w-3.5 h-3.5" /> VPN</div>
                      <p className={clsx("text-lg font-bold", selected.vpnActive ? "text-emerald-400" : "text-amber-400")}>{selected.vpnActive ? "Active" : "Off"}</p>
                    </div>
                  </div>

                  {selected.location && (
                    <div className="mt-3 flex items-center gap-2 text-sm text-gray-400">
                      <MapPin className="w-4 h-4" />
                      {selected.location.city}, {selected.location.country}
                      <span className="text-gray-600 text-xs ml-2">Last checkin: {new Date(selected.lastCheckin).toLocaleString()}</span>
                    </div>
                  )}
                </div>

                {selected.issues.length > 0 && (
                  <div className="bg-gray-900/50 border border-amber-500/20 rounded-xl p-4 space-y-2">
                    <h4 className="text-sm font-display uppercase tracking-wider text-amber-400 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" /> Compliance Issues ({selected.issues.length})
                    </h4>
                    {selected.issues.map((issue, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm text-gray-400 bg-amber-500/5 p-2 rounded-lg">
                        <XCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        {issue}
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-2">
                  <button onClick={() => handleLock(selected.id)} disabled={locking === selected.id} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 text-sm hover:bg-amber-500/30 transition-colors disabled:opacity-50">
                    {locking === selected.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                    Remote Lock
                  </button>
                  <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30 text-sm hover:bg-rose-500/30 transition-colors">
                    <Trash2 className="w-4 h-4" /> Remote Wipe
                  </button>
                  <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-sm hover:bg-cyan-500/30 transition-colors">
                    <RefreshCw className="w-4 h-4" /> Push Update
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-12 flex flex-col items-center justify-center">
                <Smartphone className="w-12 h-12 text-gray-600 mb-3" />
                <p className="text-gray-500">Select a device to manage</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
