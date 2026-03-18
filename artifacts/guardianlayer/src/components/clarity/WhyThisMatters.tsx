import { Info } from "lucide-react";

interface WhyThisMattersProps {
  explanation: string;
}

export function WhyThisMatters({ explanation }: WhyThisMattersProps) {
  return (
    <div className="rounded-xl border border-primary/15 bg-primary/5 p-4 flex items-start gap-3">
      <Info className="w-4 h-4 text-primary mt-0.5 shrink-0" />
      <div>
        <span className="text-[10px] font-display uppercase tracking-widest text-primary block mb-1">Why This Matters</span>
        <p className="text-sm text-gray-300 leading-relaxed">{explanation}</p>
      </div>
    </div>
  );
}
