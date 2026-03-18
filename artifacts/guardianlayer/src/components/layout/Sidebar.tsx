import { Link, useLocation } from "wouter";
import { Shield, LayoutDashboard, Activity, CheckSquare, Bell, Plug2, Monitor, Eye, Mail, Laptop, Network, Key, Scale, RefreshCw, Crosshair, BookOpen, HardDrive } from "lucide-react";
import { clsx } from "clsx";

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
  { href: "/threat-neutralization", label: "Threat Response", icon: Crosshair },
  { href: "/glossary", label: "Glossary", icon: BookOpen },
  { href: "/backups", label: "Backups", icon: HardDrive },
];

export function Sidebar() {
  const [location] = useLocation();

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
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
          <span className="font-mono text-xs text-emerald-500/80">ALL SYSTEMS PROTECTED</span>
        </div>
      </div>
    </aside>
  );
}
