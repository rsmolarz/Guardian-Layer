import { CheckCircle2, Clock, Shield } from "lucide-react";

interface SuccessStoryProps {
  summary: string;
  resolvedIn?: string;
  dataCompromised: boolean;
}

export function SuccessStory({ summary, resolvedIn, dataCompromised }: SuccessStoryProps) {
  return (
    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 flex items-start gap-3">
      <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
      <div>
        <span className="text-[10px] font-display uppercase tracking-widest text-emerald-400 block mb-0.5">Resolved</span>
        <p className="text-sm text-gray-300">{summary}</p>
        <div className="flex items-center gap-4 mt-1.5">
          {resolvedIn && (
            <span className="text-[10px] text-emerald-400/70 flex items-center gap-1">
              <Clock className="w-3 h-3" /> Resolved in {resolvedIn}
            </span>
          )}
          <span className={`text-[10px] flex items-center gap-1 ${dataCompromised ? "text-rose-400" : "text-emerald-400/70"}`}>
            <Shield className="w-3 h-3" />
            {dataCompromised ? "Data was compromised" : "No data was compromised"}
          </span>
        </div>
      </div>
    </div>
  );
}
