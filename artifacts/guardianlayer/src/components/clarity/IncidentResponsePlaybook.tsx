import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, ChevronDown, ChevronUp, Users, CheckCircle2 } from "lucide-react";

interface PlaybookStep {
  step: number;
  title: string;
  description: string;
  responsible: string;
}

interface IncidentResponsePlaybookProps {
  threatType: string;
  steps: PlaybookStep[];
}

export function IncidentResponsePlaybook({ threatType, steps }: IncidentResponsePlaybookProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-violet-500/[0.05] transition-colors"
      >
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-violet-400" />
          <span className="text-sm font-display uppercase tracking-wider text-violet-400">
            Response Playbook — {threatType}
          </span>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-violet-400/60" /> : <ChevronDown className="w-4 h-4 text-violet-400/60" />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-2">
              {steps.map((s) => (
                <div key={s.step} className="flex items-start gap-3 p-3 rounded-lg bg-black/20 border border-white/5">
                  <div className="w-6 h-6 rounded-full bg-violet-500/20 text-violet-400 flex items-center justify-center text-xs font-mono shrink-0">
                    {s.step}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-medium">{s.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{s.description}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Users className="w-3 h-3 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground">{s.responsible}</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function getPlaybookForThreatType(type: string): PlaybookStep[] {
  const playbooks: Record<string, PlaybookStep[]> = {
    phishing: [
      { step: 1, title: "Isolate the email", description: "Move the suspicious email to quarantine so no one else can click on it.", responsible: "Security Team" },
      { step: 2, title: "Alert affected users", description: "Notify anyone who received or opened the email. Ask them not to click any links.", responsible: "IT Support" },
      { step: 3, title: "Check for clicks", description: "Review logs to see if anyone clicked the malicious link or downloaded attachments.", responsible: "Security Team" },
      { step: 4, title: "Reset compromised credentials", description: "If anyone interacted with the phishing email, immediately reset their passwords.", responsible: "IT Support" },
      { step: 5, title: "Block the sender", description: "Add the sender domain to the block list to prevent future emails.", responsible: "Security Team" },
      { step: 6, title: "Document and report", description: "Record the incident details for compliance and future reference.", responsible: "Compliance" },
    ],
    malware: [
      { step: 1, title: "Disconnect the device", description: "Take the infected device off the network immediately to prevent spread.", responsible: "IT Support" },
      { step: 2, title: "Identify the malware", description: "Run a full scan to determine what type of malware is present.", responsible: "Security Team" },
      { step: 3, title: "Contain the threat", description: "Check if the malware has spread to other devices on the network.", responsible: "Security Team" },
      { step: 4, title: "Remove the malware", description: "Clean the infected device or restore from a known-good backup.", responsible: "IT Support" },
      { step: 5, title: "Patch the vulnerability", description: "Update the software that allowed the malware in to prevent reinfection.", responsible: "IT Support" },
    ],
    default: [
      { step: 1, title: "Assess the situation", description: "Determine the scope and severity of the incident.", responsible: "Security Team" },
      { step: 2, title: "Contain the threat", description: "Take immediate steps to prevent the threat from spreading.", responsible: "Security Team" },
      { step: 3, title: "Notify stakeholders", description: "Inform relevant team members and management about the incident.", responsible: "Security Lead" },
      { step: 4, title: "Remediate", description: "Fix the underlying issue and restore normal operations.", responsible: "IT Support" },
      { step: 5, title: "Review and improve", description: "Document lessons learned and update security measures.", responsible: "Compliance" },
    ],
  };
  return playbooks[type.toLowerCase()] || playbooks.default;
}
