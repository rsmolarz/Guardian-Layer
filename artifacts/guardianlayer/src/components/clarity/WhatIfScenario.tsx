import { AlertTriangle, Clock } from "lucide-react";

interface WhatIfScenarioProps {
  scenario: string;
  timeframe?: string;
}

export function WhatIfScenario({ scenario, timeframe }: WhatIfScenarioProps) {
  return (
    <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" />
        <div>
          <span className="text-[10px] font-display uppercase tracking-widest text-rose-400 block mb-1">
            What If This Goes Unresolved?
          </span>
          <p className="text-sm text-gray-300 leading-relaxed">{scenario}</p>
          {timeframe && (
            <p className="text-xs text-rose-400/70 mt-2 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {timeframe}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
