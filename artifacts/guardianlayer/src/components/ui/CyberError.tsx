import { AlertTriangle } from "lucide-react";

const PLAIN_TITLES: Record<string, string> = {
  "SYSTEM FAULT": "Something Went Wrong",
  "TELEMETRY FAULT": "Couldn't Load Dashboard",
  "THREAT SCAN FAILED": "Couldn't Load Threats",
  "RECOVERY FAULT": "Couldn't Load Recovery Data",
  "LOG FAULT": "Couldn't Load Alerts",
  "SCAN FAILURE": "Couldn't Load Scan Results",
  "DATA CORRUPTION": "Couldn't Load Data",
  "QUEUE FAULT": "Couldn't Load Review Queue",
  "LINK FAULT": "Couldn't Load Connections",
  "HEALTH CHECK FAILED": "Couldn't Check System Health",
  "LOG RETRIEVAL FAILED": "Couldn't Load Activity History",
  "METRICS UNAVAILABLE": "Couldn't Load Traffic Data",
  "NETWORK FAULT": "Couldn't Load Network Data",
  "ENDPOINT FAULT": "Couldn't Load Device Data",
  "EMAIL FAULT": "Couldn't Load Email Data",
};

const PLAIN_MESSAGES: Record<string, string> = {
  "Unable to establish secure connection to the mainframe.": "We're having trouble connecting to the server. Please try refreshing the page.",
  "Failed to retrieve dashboard statistics from the core.": "We couldn't load your security overview. Please try again in a moment.",
  "Unable to retrieve threat data from the neutralization system.": "We couldn't load threat information. The system may be temporarily unavailable.",
  "Unable to retrieve recovery data from the core.": "We couldn't load recovery information. Please try refreshing.",
  "Alert repository inaccessible.": "We couldn't load your security alerts. Please try again.",
  "Unable to retrieve dark web exposure data.": "We couldn't check for exposed data right now. Please try again.",
  "Unable to read transaction stream.": "We couldn't load your transaction history. Please try refreshing.",
  "Unable to load approval queue.": "We couldn't load items waiting for review. Please try again.",
  "Cannot retrieve integration telemetry.": "We couldn't check the status of your connected services. Please try refreshing.",
  "Unable to reach system health endpoint.": "We couldn't check system health right now. Please try again.",
  "Unable to fetch activity logs.": "We couldn't load the activity history. Please try refreshing.",
  "Failed to retrieve throughput data.": "We couldn't load traffic data right now. Please try again.",
};

export function CyberError({ title = "SYSTEM FAULT", message = "Unable to establish secure connection to the mainframe." }: { title?: string, message?: string }) {
  const plainTitle = PLAIN_TITLES[title] || title;
  const plainMessage = PLAIN_MESSAGES[message] || message;

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] w-full p-8">
      <div className="glass-panel p-8 rounded-2xl border-rose-500/30 max-w-md w-full text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-rose-500 shadow-[0_0_15px_rgba(244,63,94,1)]" />
        <AlertTriangle className="w-16 h-16 text-rose-500 mx-auto mb-6 animate-pulse-glow" />
        <h3 className="text-xl font-display text-rose-400 mb-2">{plainTitle}</h3>
        <p className="text-muted-foreground text-sm">{plainMessage}</p>
        <p className="mt-4 text-xs text-muted-foreground/60">
          If this keeps happening, please contact your administrator.
        </p>
      </div>
    </div>
  );
}
