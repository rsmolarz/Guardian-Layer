import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HelpCircle, X, MousePointerClick } from "lucide-react";

const PAGE_HELP: Record<string, { title: string; sections: { name: string; explanation: string; selector?: string }[] }> = {
  "/": {
    title: "Dashboard — Your Security Overview",
    sections: [
      { name: "Security Health Score", explanation: "A simple letter grade (A through F) showing your overall security status. A means everything is well-protected.", selector: ".glass-panel:has(.text-6xl), .glass-panel:has(.text-5xl)" },
      { name: "Protection Status", explanation: "Shows at a glance which parts of your organization are protected and which need attention.", selector: "[class*='grid-cols']:has([class*='emerald']):has([class*='amber'])" },
      { name: "What Happened Today", explanation: "A timeline of today's security events written in plain English — what was blocked, what needs attention, and what was resolved." },
      { name: "Recommended Actions", explanation: "The most important things you should do right now, ranked by urgency." },
      { name: "Threat Trend", explanation: "Compares this week's threats to last week so you can see if things are getting better or worse." },
      { name: "Connected Threats", explanation: "Shows when multiple security events might be related — helping you see the bigger picture." },
      { name: "Live Security Feed", explanation: "Real-time updates of security events as they happen across your organization." },
    ],
  },
  "/transactions": {
    title: "Transactions — Money Movement Monitoring",
    sections: [
      { name: "Why This Matters", explanation: "The blue banner explains what this page monitors and why it's important for your organization.", selector: "[class*='why-this-matters'], .glass-panel:has(.text-primary):first-of-type" },
      { name: "Transaction List", explanation: "Every financial transaction is automatically scanned for suspicious activity. You can filter by status to find specific types.", selector: "table, .overflow-x-auto" },
      { name: "Risk Score", explanation: "Each transaction gets a risk score from 0% (safe) to 100% (very suspicious). High-risk transactions are flagged for review." },
      { name: "Urgency Labels", explanation: "Colored badges next to risk scores: 'Act Now' (red), 'Needs Attention' (orange), 'Monitor' (yellow), and 'All Clear' (green)." },
      { name: "Scan New Transaction", explanation: "Manually submit a transaction for security scanning before processing it.", selector: ".cyber-button" },
    ],
  },
  "/alerts": {
    title: "Security Alerts — Issues That Need Your Attention",
    sections: [
      { name: "Alert Cards", explanation: "Each card represents a security issue that was detected. The colored border shows how urgent it is.", selector: ".glass-panel:has(.border-l-4), [class*='border-l-4']" },
      { name: "Plain English Breakdown", explanation: "Click 'What happened in plain English' on any alert to see a detailed explanation without technical jargon." },
      { name: "Auto-Remediate", explanation: "For some alerts, the system can automatically fix the issue. Click this button to let it handle things." },
      { name: "Dismiss", explanation: "If you've reviewed an alert and no action is needed, dismiss it to keep your list clean." },
    ],
  },
  "/threat-neutralization": {
    title: "Threat Neutralization — Stopping Active Threats",
    sections: [
      { name: "Threat Cards", explanation: "Each card represents an active threat that has been detected. Click to expand and see a plain English explanation." },
      { name: "Quick Actions", explanation: "Immediate steps you can take to contain a threat — like freezing credit or locking cards." },
      { name: "Neutralization Steps", explanation: "A step-by-step workflow showing the process of eliminating each threat." },
    ],
  },
  "/recovery": {
    title: "Recovery Center — Getting Back to Normal",
    sections: [
      { name: "Recovery Cases", explanation: "Each case represents something that was compromised and needs to be restored — like a password, credit card, or document." },
      { name: "Progress Bar", explanation: "Shows how far along the recovery process is for each item." },
      { name: "Recovery Steps", explanation: "The specific actions being taken to restore each compromised asset." },
    ],
  },
  "/approvals": {
    title: "Approvals — Transactions Needing Your Review",
    sections: [
      { name: "Why This Matters", explanation: "The blue banner at the top explains why these transactions were flagged and what you should do about them." },
      { name: "Pending Transactions", explanation: "These transactions were flagged as potentially risky and need your approval before they go through.", selector: ".glass-panel:has(.border-amber-500)" },
      { name: "Plain English Breakdown", explanation: "Each held transaction includes a detailed explanation of why it was flagged, the potential impact, and recommended steps." },
      { name: "Approve / Block", explanation: "After reviewing a transaction, 'Allow' lets it proceed and 'Block' stops it permanently." },
      { name: "Risk Score", explanation: "A percentage showing how suspicious the transaction looks — higher means more likely to be fraudulent." },
    ],
  },
  "/email-security": {
    title: "Email Security — Protecting Your Inbox",
    sections: [
      { name: "Suspicious Emails", explanation: "Emails that were flagged as potentially dangerous — phishing attempts, scam messages, or messages with harmful attachments." },
      { name: "Email Verification", explanation: "Checks whether incoming emails are actually from who they claim to be, using industry-standard verification methods." },
      { name: "Attachment Safety", explanation: "Scans email attachments for viruses, malware, or other dangerous content before anyone opens them." },
      { name: "Account Safety", explanation: "Monitors for signs that an email account has been taken over by an attacker." },
      { name: "Fake Email Campaigns", explanation: "Tracks organized phishing campaigns targeting your organization — multiple fake emails from the same source." },
    ],
  },
  "/endpoints": {
    title: "Device Security — Your Company's Computers & Servers",
    sections: [
      { name: "All Devices", explanation: "A list of every computer, laptop, and server in your organization, with their current security status." },
      { name: "Harmful Software", explanation: "Detected malware, viruses, or other malicious programs found on your devices." },
      { name: "Update Status", explanation: "Shows which devices have the latest security updates and which are missing critical patches." },
      { name: "Unusual Activity", explanation: "Devices behaving in unexpected ways — like accessing unusual files or communicating with suspicious servers." },
      { name: "USB Devices", explanation: "Tracks USB drives and external devices connected to company computers, which can be a security risk." },
    ],
  },
  "/network": {
    title: "Network Security — Internet & Traffic Protection",
    sections: [
      { name: "Security Events", explanation: "A log of network security events — connection attempts, blocked traffic, and suspicious patterns." },
      { name: "Break-in Detection", explanation: "Monitors for unauthorized attempts to access your network — like someone trying to break in." },
      { name: "Website Safety", explanation: "Checks the websites your employees visit and blocks access to known dangerous sites." },
      { name: "Secure Access", explanation: "Manages VPN and secure remote access, ensuring only authorized users connect to your network." },
      { name: "Firewall Activity", explanation: "Shows what your firewall is blocking and allowing — your network's first line of defense." },
    ],
  },
  "/yubikey": {
    title: "Security Keys — Physical Authentication Devices",
    sections: [
      { name: "All Keys", explanation: "Every YubiKey security key issued to employees, with their current status." },
      { name: "Login History", explanation: "A log of all login attempts using security keys — both successful and failed." },
      { name: "Key Requests", explanation: "Employees who have requested new security keys or replacements." },
      { name: "Failed Logins", explanation: "Login attempts that failed — could indicate a stolen or malfunctioning key. Expand any incident for a plain English explanation." },
      { name: "Lost/Stolen", explanation: "Keys reported as lost or stolen that need to be deactivated immediately. Each incident includes a full breakdown of what happened and next steps." },
      { name: "Security Policies", explanation: "Rules governing how security keys must be used — like requiring them for admin access." },
    ],
  },
  "/openclaw": {
    title: "Contract Monitor — Legal Document Review",
    sections: [
      { name: "Contracts", explanation: "All contracts being monitored for risky clauses, compliance issues, and upcoming expirations." },
      { name: "App Health", explanation: "The health status of the contract monitoring system itself." },
      { name: "API Safety Check", explanation: "Checks that all system connections are secure and working properly." },
      { name: "Active Users", explanation: "Who is currently logged in and using the system." },
      { name: "Config Changes", explanation: "Tracks changes to system settings that could affect security." },
    ],
  },
  "/integrations": {
    title: "Connected Services — External Systems",
    sections: [
      { name: "Service Cards", explanation: "Each card represents an external service connected to your security platform — like payment processors or identity verification services." },
      { name: "Status", explanation: "Shows whether each connected service is working properly or experiencing issues." },
      { name: "Configuration", explanation: "Settings for how each service connects to your security platform." },
    ],
  },
  "/monitoring": {
    title: "System Health — Platform Status",
    sections: [
      { name: "Overview", explanation: "A bird's-eye view of whether all parts of your security platform are running smoothly." },
      { name: "Activity Log", explanation: "A chronological record of everything happening across your security systems." },
      { name: "Threat Sources", explanation: "Where attacks and threats are coming from, mapped geographically and by type." },
      { name: "Performance", explanation: "How fast your security systems are processing events and responding to threats." },
      { name: "Compliance", explanation: "Whether your organization meets required security standards and regulations." },
    ],
  },
  "/dark-web": {
    title: "Data Exposure — Stolen Data Monitoring",
    sections: [
      { name: "Exposures", explanation: "Personal data (SSNs, credit cards, passwords) found for sale on hidden parts of the internet." },
      { name: "Recovery Center", explanation: "Steps you can take to protect yourself after your data has been exposed." },
      { name: "Severity", explanation: "How serious each exposure is — 'Act Now' items need immediate attention." },
    ],
  },
  "/glossary": {
    title: "Glossary — Security Terms Explained",
    sections: [
      { name: "Search", explanation: "Type any term to find its plain English definition.", selector: "input[type='text']" },
      { name: "Term Cards", explanation: "Each card explains a security term in everyday language, with a real-world example and where you'll encounter it in the platform.", selector: ".grid:has(.glass-panel)" },
    ],
  },
};

let activeHighlight: HTMLElement | null = null;

function highlightSection(selector: string | undefined) {
  clearHighlight();
  if (!selector) return;

  try {
    const el = document.querySelector(selector);
    if (el instanceof HTMLElement) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });

      const overlay = document.createElement("div");
      overlay.className = "quickhelp-highlight-overlay";
      const rect = el.getBoundingClientRect();
      overlay.style.cssText = `
        position: fixed;
        left: ${rect.left - 4}px;
        top: ${rect.top - 4}px;
        width: ${rect.width + 8}px;
        height: ${rect.height + 8}px;
        border: 2px solid rgba(6, 182, 212, 0.6);
        border-radius: 12px;
        background: rgba(6, 182, 212, 0.05);
        box-shadow: 0 0 20px rgba(6, 182, 212, 0.2), inset 0 0 20px rgba(6, 182, 212, 0.05);
        pointer-events: none;
        z-index: 45;
        animation: quickhelpPulse 2s ease-in-out infinite;
        transition: all 0.3s ease;
      `;
      document.body.appendChild(overlay);
      activeHighlight = overlay;

      if (!document.getElementById("quickhelp-highlight-style")) {
        const style = document.createElement("style");
        style.id = "quickhelp-highlight-style";
        style.textContent = `
          @keyframes quickhelpPulse {
            0%, 100% { border-color: rgba(6, 182, 212, 0.6); box-shadow: 0 0 20px rgba(6, 182, 212, 0.2); }
            50% { border-color: rgba(6, 182, 212, 0.9); box-shadow: 0 0 30px rgba(6, 182, 212, 0.4); }
          }
        `;
        document.head.appendChild(style);
      }
    }
  } catch {}
}

function clearHighlight() {
  if (activeHighlight) {
    activeHighlight.remove();
    activeHighlight = null;
  }
}

export function QuickHelp({ currentPath }: { currentPath: string }) {
  const [open, setOpen] = useState(false);
  const [highlightedSection, setHighlightedSection] = useState<string | null>(null);
  const help = PAGE_HELP[currentPath];

  useEffect(() => {
    return () => clearHighlight();
  }, [currentPath, open]);

  const handleSectionHover = useCallback((sectionName: string | null, selector?: string) => {
    setHighlightedSection(sectionName);
    if (sectionName && selector) {
      highlightSection(selector);
    } else {
      clearHighlight();
    }
  }, []);

  if (!help) return null;

  return (
    <>
      <motion.button
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1.5 }}
        onClick={() => {
          setOpen(!open);
          if (open) clearHighlight();
        }}
        className={`fixed bottom-8 left-72 p-3 rounded-full z-50 transition-colors ${
          open
            ? "bg-primary text-white shadow-[0_0_20px_rgba(6,182,212,0.4)]"
            : "bg-white/10 text-muted-foreground border border-white/10 hover:bg-white/15 hover:text-white"
        }`}
        title="Quick Help"
      >
        {open ? <X className="w-5 h-5" /> : <HelpCircle className="w-5 h-5" />}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-20 left-72 w-80 max-h-[70vh] overflow-y-auto glass-panel rounded-2xl border border-primary/20 shadow-[0_0_40px_rgba(6,182,212,0.15)] z-50 p-4"
          >
            <h3 className="text-sm font-display uppercase tracking-widest text-primary mb-1">{help.title}</h3>
            <div className="flex items-center gap-1.5 mb-3 text-[10px] text-muted-foreground">
              <MousePointerClick className="w-3 h-3" />
              <span>Hover a section to highlight it on the page</span>
            </div>
            <div className="space-y-2">
              {help.sections.map((section) => (
                <motion.div
                  key={section.name}
                  onMouseEnter={() => handleSectionHover(section.name, section.selector)}
                  onMouseLeave={() => handleSectionHover(null)}
                  className={`p-3 rounded-lg border cursor-default transition-all duration-200 ${
                    highlightedSection === section.name
                      ? "bg-primary/10 border-primary/30 shadow-[0_0_10px_rgba(6,182,212,0.1)]"
                      : "bg-black/20 border-white/5 hover:border-white/15"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <h4 className={`text-xs font-display mb-1 flex-1 transition-colors ${
                      highlightedSection === section.name ? "text-primary" : "text-white"
                    }`}>
                      {section.name}
                    </h4>
                    {section.selector && (
                      <span className="text-[9px] text-primary/50 uppercase tracking-wider shrink-0">hover to find</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{section.explanation}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
