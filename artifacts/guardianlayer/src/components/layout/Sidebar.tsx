import { Link, useLocation } from "wouter";
import { Shield, LayoutDashboard, Activity, CheckSquare, Bell, Plug2, Monitor, Eye, Mail, Laptop, Network, Key, Scale, RefreshCw, Crosshair, BookOpen, HardDrive, ShieldOff, ShieldAlert, FileSearch } from "lucide-react";
import { clsx } from "clsx";
import { useGetLockdownStatus } from "@workspace/api-client-react";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/transactions", label: "Transactions", icon: Activity },
  { href: "/approvals", label: "Approvals", icon: CheckSquare },
  { href: "/alerts", label: "Security Alerts", icon: Bell },
  { href: "/email-security", label: "Email Security", icon: Mail },
  { href: "/endpoints", label: "Device Security", icon: Laptop },
  { href: "/network", label: "Network Security", icon: Network },
  { href: "/yubikey", label: "Security Keys", icon: Key },
  { href: "/openclaw", label: "Contract Monitor", icon: Scale },
  { href: "/integrations", label: "Connected Services", icon: Plug2 },
  { href: "/monitoring", label: "System Health", icon: Monitor },
  { href: "/dark-web", label: "Data Exposure", icon: Eye },
  { href: "/recovery", label: "Recovery Center", icon: RefreshCw },
  { href: "/disaster-recovery", label: "Disaster Recovery", icon: ShieldAlert },
  { href: "/threat-neutralization", label: "Threat Response", icon: Crosshair },
  { href: "/glossary", label: "Glossary", icon: BookOpen },
  { href: "/backups", label: "Backups", icon: HardDrive },
  { href: "/workspace-monitor", label: "Workspace Monitor", icon: FileSearch },
];

export function Sidebar() {
  const [location] = useLocation();
  const { data: lockdownStatus } = useGetLockdownStatus();
  const isLockdownActive = lockdownStatus?.isActive ?? false;

  return (
    <aside className="w-64 fixed inset-y-0 left-0 z-50 glass-panel border-r-white/5 flex flex-col">
      <div className="h-20 flex items-center px-6 border-b border-white/5 relative overflow-hidden">
        <div className="absolute inset-0 bg-primary/5" />
        <Shield className="w-8 h-8 text-primary mr-3 animate-pulse-glow" />
        <div>
          <h1 className="font-display font-bold text-lg text-white leading-none tracking-wider">GUARDIAN<span className="text-primary">LAYER</span></h1>
          <span className="text-[10px] font-mono text-primary/70 tracking-widest">ENTERPRISE</span>
        </div>
      </div>

      <nav className="flex-1 py-4 px-4 space-y-1 overflow-y-auto">
        <Link href="/emergency-lockdown" className="block mb-2">
          <div className={clsx(
            "flex items-center px-4 py-3 rounded-xl font-display text-sm uppercase tracking-wider transition-all duration-300 relative overflow-hidden group cursor-pointer border-2",
            location === "/emergency-lockdown"
              ? isLockdownActive
                ? "bg-rose-500/15 text-rose-400 border-rose-500/40 shadow-[inset_0_0_20px_rgba(244,63,94,0.15),0_0_15px_rgba(244,63,94,0.2)]"
                : "bg-primary/10 text-primary border-primary/20 shadow-[inset_0_0_20px_rgba(6,182,212,0.1)]"
              : isLockdownActive
                ? "text-rose-400 border-rose-500/30 bg-rose-500/5 hover:bg-rose-500/10"
                : "text-amber-400 border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10"
          )}>
            {location === "/emergency-lockdown" && (
              <div className={clsx(
                "absolute left-0 top-0 bottom-0 w-1",
                isLockdownActive ? "bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,1)]" : "bg-primary shadow-[0_0_10px_rgba(6,182,212,1)]"
              )} />
            )}
            <ShieldOff className={clsx(
              "w-5 h-5 mr-3 transition-transform group-hover:scale-110",
              isLockdownActive && "animate-pulse"
            )} />
            Lockdown
            {isLockdownActive && (
              <span className="ml-auto w-2 h-2 rounded-full bg-rose-500 animate-pulse shadow-[0_0_8px_rgba(244,63,94,0.8)]" />
            )}
          </div>
        </Link>

        {NAV_ITEMS.map((item) => {
          const isActive = location === item.href;
          return (
            <Link key={item.href} href={item.href} className="block">
              <div className={clsx(
                "flex items-center px-4 py-3 rounded-xl font-display text-sm uppercase tracking-wider transition-all duration-300 relative overflow-hidden group cursor-pointer",
                isActive 
                  ? "bg-primary/10 text-primary border border-primary/20 shadow-[inset_0_0_20px_rgba(6,182,212,0.1)]" 
                  : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
              )}>
                {isActive && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary shadow-[0_0_10px_rgba(6,182,212,1)]" />
                )}
                <item.icon className={clsx("w-5 h-5 mr-3 transition-transform group-hover:scale-110", isActive && "text-primary")} />
                {item.label}
              </div>
            </Link>
          );
        })}
      </nav>

      <div className="p-6 border-t border-white/5">
        <div className="flex items-center space-x-3">
          {isLockdownActive ? (
            <>
              <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shadow-[0_0_8px_rgba(244,63,94,0.8)]" />
              <span className="font-mono text-xs text-rose-500/80 tracking-widest">LOCKDOWN ACTIVE</span>
            </>
          ) : (
            <>
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
              <span className="font-mono text-xs text-emerald-500/80">SYSTEM SECURE</span>
            </>
          )}
        </div>
      </div>
    </aside>
  );
}
