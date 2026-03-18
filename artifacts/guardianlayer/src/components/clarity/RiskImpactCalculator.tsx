import { DollarSign, Users, Clock } from "lucide-react";

interface RiskImpactProps {
  financialImpact: string;
  dataExposureScope: string;
  businessDisruption: string;
  affectedUsers?: number;
  estimatedCost?: string;
}

export function RiskImpactCalculator({
  financialImpact,
  dataExposureScope,
  businessDisruption,
  affectedUsers,
  estimatedCost,
}: RiskImpactProps) {
  return (
    <div className="rounded-xl border border-orange-500/20 bg-orange-500/5 p-4">
      <h4 className="text-[10px] font-display uppercase tracking-widest text-orange-400 mb-3 flex items-center gap-2">
        <DollarSign className="w-3.5 h-3.5" />
        Estimated Risk Impact
      </h4>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="p-3 rounded-lg bg-black/20 border border-white/5">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="w-3 h-3 text-orange-400" />
            <span className="text-[10px] font-display uppercase tracking-widest text-muted-foreground">Financial Impact</span>
          </div>
          <p className="text-sm text-white">{financialImpact}</p>
          {estimatedCost && <p className="text-xs text-orange-400 mt-1">{estimatedCost}</p>}
        </div>
        <div className="p-3 rounded-lg bg-black/20 border border-white/5">
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-3 h-3 text-amber-400" />
            <span className="text-[10px] font-display uppercase tracking-widest text-muted-foreground">Data Exposure</span>
          </div>
          <p className="text-sm text-white">{dataExposureScope}</p>
          {affectedUsers && <p className="text-xs text-amber-400 mt-1">{affectedUsers.toLocaleString()} users potentially affected</p>}
        </div>
        <div className="p-3 rounded-lg bg-black/20 border border-white/5">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-3 h-3 text-red-400" />
            <span className="text-[10px] font-display uppercase tracking-widest text-muted-foreground">Business Disruption</span>
          </div>
          <p className="text-sm text-white">{businessDisruption}</p>
        </div>
      </div>
    </div>
  );
}
