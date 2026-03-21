import { TransactionStatus, AlertSeverity } from "@workspace/api-client-react";

export const API_BASE = import.meta.env.VITE_API_URL || "";

export const STATUS_COLORS: Record<string, string> = {
  [TransactionStatus.ALLOWED]: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.2)]",
  [TransactionStatus.HELD]: "bg-amber-500/10 text-amber-400 border-amber-500/30 shadow-[0_0_10px_rgba(245,158,11,0.2)]",
  [TransactionStatus.BLOCKED]: "bg-rose-500/10 text-rose-400 border-rose-500/30 shadow-[0_0_10px_rgba(244,63,94,0.2)]",
  [TransactionStatus.APPROVED]: "bg-blue-500/10 text-blue-400 border-blue-500/30 shadow-[0_0_10px_rgba(59,130,246,0.2)]",
  [TransactionStatus.REJECTED]: "bg-zinc-500/10 text-zinc-400 border-zinc-500/30",
};

export const SEVERITY_COLORS: Record<string, string> = {
  [AlertSeverity.low]: "text-blue-400",
  [AlertSeverity.medium]: "text-amber-400",
  [AlertSeverity.high]: "text-orange-500",
  [AlertSeverity.critical]: "text-rose-500 animate-pulse-glow",
};

export function getRiskColor(score: number): string {
  if (score < 0.3) return "text-emerald-400";
  if (score < 0.7) return "text-amber-400";
  return "text-rose-500 font-bold";
}
