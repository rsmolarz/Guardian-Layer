import { History, CheckCircle2 } from "lucide-react";

interface PastIncident {
  date: string;
  description: string;
  outcome: string;
  resolved: boolean;
}

interface SimilarPastIncidentsProps {
  incidents: PastIncident[];
}

export function SimilarPastIncidents({ incidents }: SimilarPastIncidentsProps) {
  if (incidents.length === 0) return null;

  return (
    <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
      <h4 className="text-[10px] font-display uppercase tracking-widest text-blue-400 mb-3 flex items-center gap-2">
        <History className="w-3.5 h-3.5" />
        Similar Past Incidents
      </h4>
      <div className="space-y-2">
        {incidents.map((incident, i) => (
          <div key={i} className="p-2.5 rounded-lg bg-black/20 border border-white/5 flex items-start gap-2.5">
            <CheckCircle2 className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${incident.resolved ? "text-emerald-400" : "text-amber-400"}`} />
            <div>
              <p className="text-xs text-gray-300">{incident.description}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {incident.date} — {incident.outcome}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function getSimilarIncidents(threatType: string): PastIncident[] {
  const incidents: Record<string, PastIncident[]> = {
    "SSN Exposure": [
      { date: "Jan 2026", description: "Similar SSN exposure found on a dark web forum. Credit was frozen within 2 hours.", outcome: "No fraudulent activity detected. All clear.", resolved: true },
      { date: "Nov 2025", description: "SSN appeared in a data breach from a third-party vendor.", outcome: "Identity monitoring activated. No issues found after 90 days.", resolved: true },
    ],
    "Credit Card Compromise": [
      { date: "Feb 2026", description: "Credit card numbers found on underground marketplace.", outcome: "Cards were replaced within 24 hours. No unauthorized charges.", resolved: true },
    ],
    "Email Account Breach": [
      { date: "Dec 2025", description: "Employee email credentials leaked in a third-party breach.", outcome: "Passwords reset, 2FA enforced. No unauthorized access detected.", resolved: true },
    ],
  };
  return incidents[threatType] || [
    { date: "Recent", description: "A similar threat was detected and resolved successfully.", outcome: "Handled by the security team with no data loss.", resolved: true },
  ];
}
