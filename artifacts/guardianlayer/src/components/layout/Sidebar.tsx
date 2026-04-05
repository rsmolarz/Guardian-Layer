import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import {
  Shield, LayoutDashboard, Activity, CheckSquare, Bell, Plug2, Monitor, Eye,
  Mail, Laptop, Network, Key, Scale, RefreshCw, Crosshair, BookOpen, HardDrive,
  ShieldOff, ShieldAlert, FileSearch, Radar, Siren, Radio, BellRing, ChevronDown,
  Settings, Zap, Globe, Lock, ScanSearch, LogOut, Users, Bug, Plane, Wrench, Signal, CreditCard, Rocket, Stethoscope,
  Target, Database, Filter, Cloud, Smartphone,
} from "lucide-react";
import { clsx } from "clsx";
import { useGetLockdownStatus } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";

interface NavItem {
  href: string;
  label: string;
  icon: typeof Shield;
}

interface NavGroup {
  label: string;
  icon: typeof Shield;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Security",
    icon: Shield,
    items: [
      { href: "/alerts", label: "Security Alerts", icon: Bell },
      { href: "/security-settings", label: "Settings Monitor", icon: Settings },
      { href: "/self-scanner", label: "DAST Self-Scanner", icon: Zap },
      { href: "/virus-scanner", label: "Virus & Malware", icon: Bug },
      { href: "/email-security", label: "Email Security", icon: Mail },
      { href: "/endpoints", label: "Device Security", icon: Laptop },
      { href: "/network", label: "Network Security", icon: Network },
      { href: "/travel-security", label: "Travel Security", icon: Plane },
      { href: "/yubikey", label: "Security Keys", icon: Key },
      { href: "/secure-vault", label: "Secure Vault", icon: Lock },
      { href: "/credit-protection", label: "Credit Protection", icon: CreditCard },
    ],
  },
  {
    label: "Threats & Response",
    icon: Crosshair,
    items: [
      { href: "/threat-detection", label: "Threat Detection", icon: ScanSearch },
      { href: "/threat-intel", label: "Threat Intel Hub", icon: Radar },
      { href: "/threat-neutralization", label: "Threat Response", icon: Crosshair },
      { href: "/breach-response", label: "Breach Response", icon: Siren },
      { href: "/dark-web", label: "Data Exposure", icon: Eye },
      { href: "/domain-monitor", label: "Domain Breach Monitor", icon: Globe },
      { href: "/alert-center", label: "Alert Center", icon: BellRing },
    ],
  },
  {
    label: "Recovery",
    icon: RefreshCw,
    items: [
      { href: "/recovery", label: "Recovery Center", icon: RefreshCw },
      { href: "/disaster-recovery", label: "Disaster Recovery", icon: ShieldAlert },
      { href: "/backups", label: "Backups", icon: HardDrive },
    ],
  },
  {
    label: "Operations",
    icon: Monitor,
    items: [
      { href: "/transactions", label: "Transactions", icon: Activity },
      { href: "/approvals", label: "Approvals", icon: CheckSquare },
      { href: "/monitoring", label: "System Health", icon: Monitor },
      { href: "/openclaw", label: "Contract Monitor", icon: Scale },
      { href: "/integrations", label: "Connected Services", icon: Plug2 },
      { href: "/remote-maintenance", label: "Remote Maintenance", icon: Wrench },
      { href: "/node-diagnostics", label: "Node Diagnostics", icon: Stethoscope },
      { href: "/vient-monitor", label: "VIENT Workflow", icon: Eye },
      { href: "/app-fleet", label: "App Fleet Monitor", icon: Signal },
      { href: "/aperture", label: "Aperture AI Gateway", icon: Radio },
      { href: "/workspace-monitor", label: "Workspace Monitor", icon: FileSearch },
      { href: "/devops", label: "DevOps Control Plane", icon: Rocket },
    ],
  },
  {
    label: "Security Tools",
    icon: Target,
    items: [
      { href: "/edr", label: "EDR", icon: Crosshair },
      { href: "/siem", label: "SIEM", icon: Database },
      { href: "/vulnerability-scanner", label: "Vuln Scanner", icon: Target },
      { href: "/password-manager", label: "Password Manager", icon: Key },
      { href: "/dns-filtering", label: "DNS Filtering", icon: Filter },
      { href: "/email-gateway", label: "Email Gateway", icon: Mail },
      { href: "/backup-solution", label: "Backup Solution", icon: Cloud },
      { href: "/mdm", label: "MDM", icon: Smartphone },
    ],
  },
  {
    label: "Developer",
    icon: Radio,
    items: [
      { href: "/api-gateway", label: "API Gateway", icon: Radio },
      { href: "/glossary", label: "Glossary", icon: BookOpen },
    ],
  },
];

function findGroupForPath(path: string): string | null {
  for (const group of NAV_GROUPS) {
    if (group.items.some(item => item.href === path)) {
      return group.label;
    }
  }
  return null;
}

function LogoutButton() {
  const { logout, user } = useAuth();
  return (
    <button
      onClick={logout}
      className="flex items-center gap-1.5 text-gray-500 hover:text-red-400 transition-colors"
      title={`Logout ${user?.username || ""}`}
    >
      <LogOut className="w-3.5 h-3.5" />
      <span className="text-xs font-mono">EXIT</span>
    </button>
  );
}

export function Sidebar() {
  const [location] = useLocation();
  const { user } = useAuth();
  const { data: lockdownStatus } = useGetLockdownStatus();
  const isLockdownActive = lockdownStatus?.isActive ?? false;

  const activeGroup = findGroupForPath(location);
  const [openGroups, setOpenGroups] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    if (activeGroup) initial.add(activeGroup);
    return initial;
  });

  useEffect(() => {
    if (activeGroup && !openGroups.has(activeGroup)) {
      setOpenGroups(prev => new Set(prev).add(activeGroup));
    }
  }, [activeGroup]);

  const toggleGroup = (label: string) => {
    setOpenGroups(prev => {
      const next = new Set(prev);
      if (next.has(label)) {
        next.delete(label);
      } else {
        next.add(label);
      }
      return next;
    });
  };

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

        <Link href="/" className="block">
          <div className={clsx(
            "flex items-center px-4 py-3 rounded-xl font-display text-sm uppercase tracking-wider transition-all duration-300 relative overflow-hidden group cursor-pointer",
            location === "/"
              ? "bg-primary/10 text-primary border border-primary/20 shadow-[inset_0_0_20px_rgba(6,182,212,0.1)]"
              : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
          )}>
            {location === "/" && (
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary shadow-[0_0_10px_rgba(6,182,212,1)]" />
            )}
            <LayoutDashboard className={clsx("w-5 h-5 mr-3 transition-transform group-hover:scale-110", location === "/" && "text-primary")} />
            Dashboard
          </div>
        </Link>

        <div className="pt-2 space-y-0.5">
          {NAV_GROUPS.map((group) => {
            const isOpen = openGroups.has(group.label);
            const hasActiveChild = group.items.some(item => item.href === location);
            const GroupIcon = group.icon;

            return (
              <div key={group.label}>
                <button
                  onClick={() => toggleGroup(group.label)}
                  className={clsx(
                    "w-full flex items-center px-4 py-2.5 rounded-xl font-display text-[11px] uppercase tracking-widest transition-all duration-200 group",
                    hasActiveChild
                      ? "text-primary bg-primary/5"
                      : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                  )}
                >
                  <GroupIcon className="w-4 h-4 mr-3 shrink-0" />
                  <span className="flex-1 text-left">{group.label}</span>
                  <ChevronDown className={clsx(
                    "w-3.5 h-3.5 shrink-0 transition-transform duration-200",
                    isOpen && "rotate-180"
                  )} />
                </button>

                <div className={clsx(
                  "overflow-hidden transition-all duration-200",
                  isOpen ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
                )}>
                  <div className="pl-3 py-1 space-y-0.5">
                    {group.items.map((item) => {
                      const isActive = location === item.href;
                      return (
                        <Link key={item.href} href={item.href} className="block">
                          <div className={clsx(
                            "flex items-center px-3 py-2 rounded-lg font-display text-xs uppercase tracking-wider transition-all duration-200 relative overflow-hidden group cursor-pointer",
                            isActive
                              ? "bg-primary/10 text-primary border border-primary/20"
                              : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                          )}>
                            {isActive && (
                              <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-primary shadow-[0_0_8px_rgba(6,182,212,1)]" />
                            )}
                            <item.icon className={clsx("w-4 h-4 mr-2.5 transition-transform group-hover:scale-110", isActive && "text-primary")} />
                            {item.label}
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </nav>

      {user?.role === "superadmin" && (
        <div className="px-4 pb-2">
          <Link href="/user-management" className="block">
            <div className={clsx(
              "flex items-center px-4 py-2.5 rounded-xl font-display text-xs uppercase tracking-wider transition-all duration-200 relative overflow-hidden group cursor-pointer",
              location === "/user-management"
                ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
            )}>
              {location === "/user-management" && (
                <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,1)]" />
              )}
              <Users className={clsx("w-4 h-4 mr-2.5 transition-transform group-hover:scale-110", location === "/user-management" && "text-amber-400")} />
              User Management
            </div>
          </Link>
        </div>
      )}

      <div className="p-6 border-t border-white/5 space-y-3">
        <div className="flex items-center justify-between">
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
          <LogoutButton />
        </div>
      </div>
    </aside>
  );
}
