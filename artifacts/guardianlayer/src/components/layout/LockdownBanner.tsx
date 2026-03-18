import { useGetLockdownStatus } from "@workspace/api-client-react";
import { Link } from "wouter";
import { ShieldAlert } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export function LockdownBanner() {
  const { data: status } = useGetLockdownStatus();

  if (!status?.isActive || !status.session) return null;

  const activatedAt = new Date(status.session.activatedAt);
  const activeCount = status.session.actions.filter((a) => a.status === "active").length;

  return (
    <div className="bg-rose-500/10 border-b border-rose-500/30 px-6 py-3 flex items-center gap-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-rose-500/5 via-transparent to-rose-500/5 animate-pulse" style={{ animationDuration: "4s" }} />
      <div className="relative flex items-center gap-4 w-full">
        <ShieldAlert className="w-5 h-5 text-rose-400 animate-pulse shrink-0" />
        <div className="flex-1 flex items-center gap-4 flex-wrap">
          <span className="font-display text-xs uppercase tracking-widest text-rose-400">
            Emergency Lockdown Active
          </span>
          <span className="font-mono text-xs text-rose-400/70">
            {activeCount} containment actions active
          </span>
          <span className="font-mono text-xs text-rose-400/50">
            Since {formatDistanceToNow(activatedAt)} ago
          </span>
        </div>
        <Link href="/emergency-lockdown">
          <span className="shrink-0 px-3 py-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-400 font-display text-[10px] uppercase tracking-widest hover:bg-rose-500/20 transition-colors cursor-pointer">
            Manage
          </span>
        </Link>
      </div>
    </div>
  );
}
