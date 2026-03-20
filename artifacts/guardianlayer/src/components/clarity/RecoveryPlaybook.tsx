import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Phone,
  Clock,
  CheckCircle2,
  Circle,
  Lock,
  Unlock,
  Shield,
  AlertTriangle,
  FileText,
  Globe,
  CreditCard,
  Fingerprint,
  Mail,
  Key,
  Smartphone,
} from "lucide-react";

interface PlaybookStep {
  instruction: string;
  url?: string;
  phone?: string;
  detail?: string;
}

interface UnlockCriterion {
  condition: string;
  timeframe: string;
}

interface PlaybookAction {
  id: string;
  title: string;
  urgency: "immediate" | "within-24h" | "within-week" | "ongoing";
  estimatedTime: string;
  steps: PlaybookStep[];
  unlockCriteria: UnlockCriterion[];
  unlockSummary: string;
  automatable: boolean;
}

interface PlaybookSection {
  category: string;
  icon: typeof Shield;
  actions: PlaybookAction[];
}

const URGENCY_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  immediate: { bg: "bg-rose-500/10 border-rose-500/30", text: "text-rose-400", label: "DO NOW" },
  "within-24h": { bg: "bg-orange-500/10 border-orange-500/30", text: "text-orange-400", label: "WITHIN 24H" },
  "within-week": { bg: "bg-amber-400/10 border-amber-400/30", text: "text-amber-400", label: "THIS WEEK" },
  ongoing: { bg: "bg-blue-400/10 border-blue-400/30", text: "text-blue-400", label: "ONGOING" },
};

const SSN_PLAYBOOK: PlaybookSection[] = [
  {
    category: "Credit Freeze — All Three Bureaus",
    icon: Lock,
    actions: [
      {
        id: "freeze-equifax",
        title: "Freeze Your Equifax Credit Report",
        urgency: "immediate",
        estimatedTime: "10 minutes",
        steps: [
          { instruction: "Go to the Equifax Security Freeze page", url: "https://www.equifax.com/personal/credit-report-services/credit-freeze/" },
          { instruction: "Click 'Place a Security Freeze' and create an account (or log in)", detail: "You'll need your name, SSN, date of birth, and current address." },
          { instruction: "Answer the identity verification questions (about past addresses, loans, etc.)" },
          { instruction: "Save the PIN they give you — you'll need this PIN to unfreeze later", detail: "Write it down and store it somewhere safe, NOT on your computer." },
          { instruction: "Screenshot or save the confirmation page as proof" },
        ],
        unlockCriteria: [
          { condition: "No new fraudulent accounts opened for 6+ months", timeframe: "6 months minimum" },
          { condition: "FTC recovery plan marked as complete", timeframe: "After FTC case closed" },
          { condition: "Credit monitoring shows no suspicious activity", timeframe: "12 months recommended" },
        ],
        unlockSummary: "Temporarily unfreeze (not permanently lift) when you need to apply for credit. Use your PIN to unfreeze for a specific creditor or date range, then it re-freezes automatically.",
        automatable: true,
      },
      {
        id: "freeze-experian",
        title: "Freeze Your Experian Credit Report",
        urgency: "immediate",
        estimatedTime: "10 minutes",
        steps: [
          { instruction: "Go to the Experian Security Freeze Center", url: "https://www.experian.com/freeze/center.html" },
          { instruction: "Click 'Add a Security Freeze' and create an account", detail: "You'll need your name, address, SSN, and date of birth." },
          { instruction: "Complete the online identity verification" },
          { instruction: "Save your PIN and confirmation number", detail: "Experian may use a PIN or allow you to manage freezes via your online account." },
          { instruction: "Confirm the freeze is active by checking your account dashboard" },
        ],
        unlockCriteria: [
          { condition: "No new fraudulent accounts opened for 6+ months", timeframe: "6 months minimum" },
          { condition: "All disputes resolved and fraud alerts expired", timeframe: "After 90-day initial alert period" },
          { condition: "Identity theft report (FTC) marked resolved", timeframe: "After FTC case closure" },
        ],
        unlockSummary: "Use Experian's online portal to temporarily lift the freeze for a specific lender or date range. Never permanently remove the freeze until you've been fraud-free for 12+ months.",
        automatable: true,
      },
      {
        id: "freeze-transunion",
        title: "Freeze Your TransUnion Credit Report",
        urgency: "immediate",
        estimatedTime: "10 minutes",
        steps: [
          { instruction: "Go to TransUnion Credit Freeze page", url: "https://www.transunion.com/credit-freeze" },
          { instruction: "Click 'Add a Freeze' and create a TrueIdentity account", detail: "You'll need your name, SSN, date of birth, address, and email." },
          { instruction: "Complete identity verification (questions about your credit history)" },
          { instruction: "Save your TransUnion account credentials and any PIN provided" },
          { instruction: "Verify the freeze is active in your TrueIdentity dashboard" },
        ],
        unlockCriteria: [
          { condition: "No unauthorized credit inquiries for 6+ months", timeframe: "6 months minimum" },
          { condition: "No new fraudulent accounts or loans detected", timeframe: "12 months recommended" },
          { condition: "Police report and FTC case both resolved", timeframe: "After case closure" },
        ],
        unlockSummary: "TransUnion lets you temporarily lift via your TrueIdentity account. Set a specific date range so it re-freezes automatically. Keep the freeze indefinitely — it's free and doesn't affect your credit score.",
        automatable: true,
      },
    ],
  },
  {
    category: "Government Reporting & Legal Protection",
    icon: FileText,
    actions: [
      {
        id: "ftc-report",
        title: "File Identity Theft Report with FTC",
        urgency: "immediate",
        estimatedTime: "20 minutes",
        steps: [
          { instruction: "Go to IdentityTheft.gov — the FTC's official identity theft recovery site", url: "https://www.identitytheft.gov/" },
          { instruction: "Click 'Get Started' and describe what happened", detail: "Select 'Someone used my Social Security Number' and provide details about where it was found ({source})." },
          { instruction: "The site will generate a personalized recovery plan and an Identity Theft Report" },
          { instruction: "Print or save your Identity Theft Report — it's an official document", detail: "This report has the same legal power as a police report. You'll use it to dispute fraudulent accounts, get extended fraud alerts, and clear your records." },
          { instruction: "Follow each step in the FTC's personalized recovery plan", detail: "They'll tell you exactly which agencies to contact based on your specific situation." },
          { instruction: "Save your case number — you can return to IdentityTheft.gov to update your plan" },
        ],
        unlockCriteria: [
          { condition: "All fraudulent accounts identified and reported", timeframe: "Within 30 days" },
          { condition: "All disputes with creditors resolved", timeframe: "30-90 days per dispute" },
          { condition: "FTC recovery plan checklist fully completed", timeframe: "Typically 3-6 months" },
        ],
        unlockSummary: "Your FTC case stays on file permanently — that's a good thing. It protects your rights under federal law. Mark it 'resolved' when all fraudulent accounts are closed and disputes settled.",
        automatable: true,
      },
      {
        id: "police-report",
        title: "File a Police Report",
        urgency: "within-24h",
        estimatedTime: "30-60 minutes",
        steps: [
          { instruction: "Call your local police department's non-emergency number", detail: "Find your local police department's number. Most cities allow online reports for identity theft." },
          { instruction: "Tell them you need to file an identity theft report", detail: "Say: 'I need to file a report for identity theft. My Social Security Number was found for sale on {source}.'" },
          { instruction: "Bring your FTC Identity Theft Report (from step above) — this helps establish the crime" },
          { instruction: "Provide the details: what data was stolen, where it was found ({source}), and the date discovered" },
          { instruction: "Get the police report number and a copy of the report", detail: "Some creditors and banks require a police report number before they'll remove fraudulent charges." },
        ],
        unlockCriteria: [
          { condition: "Police report filed and case number received", timeframe: "Immediate upon filing" },
          { condition: "All creditors notified using the police report number", timeframe: "Within 30 days" },
        ],
        unlockSummary: "The police report is a one-time filing. Keep the case number permanently — you may need it years later if the stolen SSN is used again.",
        automatable: false,
      },
      {
        id: "irs-pin",
        title: "Get an IRS Identity Protection PIN",
        urgency: "within-24h",
        estimatedTime: "15 minutes",
        steps: [
          { instruction: "Go to the IRS IP PIN request page", url: "https://www.irs.gov/identity-theft-fraud-scams/get-an-identity-protection-pin" },
          { instruction: "Click 'Get an IP PIN' and verify your identity through ID.me" },
          { instruction: "The IRS will assign you a 6-digit IP PIN", detail: "This PIN is required to file your tax return. Without it, no one else can file a return using your SSN." },
          { instruction: "Store the PIN securely — you'll get a new one each year in January" },
          { instruction: "If someone already filed a fraudulent tax return, file Form 14039 (Identity Theft Affidavit)", url: "https://www.irs.gov/pub/irs-pdf/f14039.pdf" },
        ],
        unlockCriteria: [
          { condition: "IP PIN successfully received and stored", timeframe: "Immediate" },
          { condition: "No fraudulent tax returns filed", timeframe: "Check during tax season" },
        ],
        unlockSummary: "Keep the IP PIN program active permanently — it's free and renews automatically each year. There's no reason to disable it.",
        automatable: true,
      },
    ],
  },
  {
    category: "Fraud Alerts & Active Monitoring",
    icon: Shield,
    actions: [
      {
        id: "fraud-alert",
        title: "Set Up Initial Fraud Alert (90 Days)",
        urgency: "immediate",
        estimatedTime: "5 minutes",
        steps: [
          { instruction: "Contact any ONE of the three credit bureaus — they're required to notify the other two", detail: "Calling Equifax is usually fastest." },
          { instruction: "Equifax fraud alert line", phone: "1-800-525-6285", url: "https://www.equifax.com/personal/credit-report-services/credit-fraud-alerts/" },
          { instruction: "Tell them you want to place an initial fraud alert due to identity theft" },
          { instruction: "The alert lasts 90 days — creditors must verify your identity before opening new accounts" },
          { instruction: "After 90 days, renew it OR upgrade to an Extended Fraud Alert (7 years) using your FTC Identity Theft Report" },
        ],
        unlockCriteria: [
          { condition: "Alert expires automatically after 90 days", timeframe: "90 days" },
          { condition: "Decide whether to renew, extend (7 years), or let expire", timeframe: "Before 90-day expiry" },
          { condition: "Criteria to let expire: no fraudulent activity for 6+ months AND credit freeze still active", timeframe: "6 months minimum" },
        ],
        unlockSummary: "The initial alert auto-expires after 90 days. If the freeze is still active (recommended), you may not need to renew the alert. If you remove the credit freeze, keep the fraud alert active as a backup.",
        automatable: true,
      },
      {
        id: "credit-monitoring",
        title: "Set Up Free Credit Monitoring",
        urgency: "within-24h",
        estimatedTime: "10 minutes",
        steps: [
          { instruction: "Sign up for free weekly credit reports at AnnualCreditReport.com", url: "https://www.annualcreditreport.com/" },
          { instruction: "Request reports from all three bureaus and review them for unfamiliar accounts" },
          { instruction: "Set up free credit monitoring through Credit Karma (covers TransUnion & Equifax)", url: "https://www.creditkarma.com/" },
          { instruction: "For Experian monitoring, sign up for Experian's free tier", url: "https://www.experian.com/consumer-products/free-credit-monitoring.html" },
          { instruction: "Enable email/push alerts for any new accounts, inquiries, or score changes" },
          { instruction: "Check reports monthly for at least 12 months — stolen SSNs can be used years later" },
        ],
        unlockCriteria: [
          { condition: "No suspicious activity detected for 12+ months", timeframe: "12 months minimum" },
          { condition: "All three bureau reports reviewed and clean", timeframe: "Quarterly reviews for 1 year" },
        ],
        unlockSummary: "Never fully stop monitoring. Credit Karma and the free bureaus services cost nothing. Reduce frequency from monthly checks to quarterly after 12 clean months, but keep alerts enabled permanently.",
        automatable: true,
      },
      {
        id: "ssa-account",
        title: "Create a my Social Security Account",
        urgency: "within-24h",
        estimatedTime: "15 minutes",
        steps: [
          { instruction: "Go to the Social Security Administration website", url: "https://www.ssa.gov/myaccount/" },
          { instruction: "Click 'Create an Account' and verify your identity" },
          { instruction: "Once logged in, review your earnings history for any unfamiliar employers", detail: "If someone used your SSN for employment, their wages will show up on your record." },
          { instruction: "Enable account alerts so you're notified of any changes" },
          { instruction: "If you find unauthorized employment, call the SSA fraud hotline", phone: "1-800-269-0271" },
        ],
        unlockCriteria: [
          { condition: "Account created and earnings history reviewed", timeframe: "Immediate" },
          { condition: "No unauthorized employment entries found", timeframe: "Check annually" },
        ],
        unlockSummary: "Keep your my Social Security account active permanently. Check your earnings history during each tax season. There's no 'unlock' — this is ongoing protection.",
        automatable: true,
      },
    ],
  },
];

const FINANCIAL_PLAYBOOK: PlaybookSection[] = [
  {
    category: "Bank & Card Protection",
    icon: CreditCard,
    actions: [
      {
        id: "contact-bank",
        title: "Contact Your Bank's Fraud Department",
        urgency: "immediate",
        estimatedTime: "15-30 minutes",
        steps: [
          { instruction: "Call the fraud number on the back of your card (NOT a number from any email or text)", detail: "If you don't have the card, find the fraud number on your bank's official website." },
          { instruction: "Tell them: 'My card details were found on {source}. I need to report potential fraud and get new card numbers.'" },
          { instruction: "Ask them to: 1) Flag your account for monitoring, 2) Review last 90 days for unauthorized charges, 3) Issue new card numbers" },
          { instruction: "Ask about their zero-liability fraud protection policy — most major banks cover unauthorized charges" },
          { instruction: "Get a reference number for your fraud report and the name of the agent" },
          { instruction: "Ask them to set up real-time transaction alerts (text/email for every purchase)" },
        ],
        unlockCriteria: [
          { condition: "New cards received and activated", timeframe: "5-10 business days" },
          { condition: "All unauthorized charges identified and disputed", timeframe: "Within 60 days of statement" },
          { condition: "Fraud investigation closed by bank", timeframe: "30-90 days typical" },
        ],
        unlockSummary: "Once new cards are issued and all disputes resolved, normal banking resumes. Keep transaction alerts enabled permanently — they're your early warning system.",
        automatable: false,
      },
      {
        id: "review-statements",
        title: "Review Last 90 Days of Statements",
        urgency: "immediate",
        estimatedTime: "30-60 minutes",
        steps: [
          { instruction: "Log into your online banking and download statements for the last 90 days" },
          { instruction: "Go through every transaction — look for charges you don't recognize, even small ones", detail: "Thieves often test with small charges ($1-5) before making large purchases." },
          { instruction: "Check for recurring subscriptions you didn't set up" },
          { instruction: "Mark any suspicious transaction and report it to your bank as unauthorized" },
          { instruction: "Under federal law (Regulation E / Fair Credit Billing Act), you have 60 days to dispute unauthorized charges" },
        ],
        unlockCriteria: [
          { condition: "All 90 days of statements reviewed", timeframe: "Immediate" },
          { condition: "All unauthorized charges reported and dispute filed", timeframe: "Within 60 days" },
          { condition: "Provisional credits received for disputed amounts", timeframe: "10 business days after dispute" },
        ],
        unlockSummary: "After the initial review, continue checking statements weekly for 3 months, then monthly. Set up automated alerts so you don't have to manually check every transaction.",
        automatable: true,
      },
    ],
  },
];

const EMAIL_PLAYBOOK: PlaybookSection[] = [
  {
    category: "Account Security",
    icon: Key,
    actions: [
      {
        id: "change-password",
        title: "Change Your Email Password Immediately",
        urgency: "immediate",
        estimatedTime: "5 minutes",
        steps: [
          { instruction: "Log into your email account and go to Security Settings" },
          { instruction: "Change your password to a strong, unique password (at least 16 characters)", detail: "Use a mix of uppercase, lowercase, numbers, and symbols. Do NOT reuse a password from any other site." },
          { instruction: "If you use a password manager (recommended), generate a random password and save it there" },
          { instruction: "If you DON'T have a password manager, create one now", url: "https://bitwarden.com/", detail: "Bitwarden is free and open-source. 1Password and Dashlane are also good paid options." },
          { instruction: "Change the password on every other site where you used the same password" },
        ],
        unlockCriteria: [
          { condition: "New unique password set and stored securely", timeframe: "Immediate" },
          { condition: "All sites using the old password updated", timeframe: "Within 24 hours" },
        ],
        unlockSummary: "There's no 'unlock' — the new password is your permanent replacement. Enable a password manager so you never reuse passwords again.",
        automatable: true,
      },
      {
        id: "enable-2fa",
        title: "Enable Two-Factor Authentication",
        urgency: "immediate",
        estimatedTime: "10 minutes",
        steps: [
          { instruction: "Go to your email account's Security Settings → Two-Factor Authentication" },
          { instruction: "Choose an authenticator app (NOT SMS — SMS can be intercepted via SIM swapping)", detail: "Recommended apps: Google Authenticator, Authy, or Microsoft Authenticator." },
          { instruction: "Scan the QR code with your authenticator app" },
          { instruction: "Save the backup recovery codes in a safe place (print them or store in password manager)", detail: "If you lose your phone, these codes are the only way back into your account." },
          { instruction: "Test by logging out and logging back in — make sure 2FA prompts you" },
        ],
        unlockCriteria: [
          { condition: "2FA successfully enabled and tested", timeframe: "Immediate" },
          { condition: "Backup recovery codes saved securely", timeframe: "Immediate" },
        ],
        unlockSummary: "Never disable 2FA. It should stay on permanently. If you switch phones, use the backup codes to re-enroll the new device.",
        automatable: true,
      },
      {
        id: "review-sessions",
        title: "Review Active Sessions & Connected Apps",
        urgency: "immediate",
        estimatedTime: "10 minutes",
        steps: [
          { instruction: "Go to your email's Security Settings → Active Sessions / Recent Activity" },
          { instruction: "Sign out of all other sessions ('Sign out of all other devices')" },
          { instruction: "Review the list of connected/authorized apps and revoke access for anything you don't recognize" },
          { instruction: "Check forwarding rules — attackers sometimes add auto-forwarding to steal future emails", detail: "Look in Settings → Forwarding. If there's an unfamiliar forwarding address, remove it immediately." },
          { instruction: "Review account recovery options (backup email, phone number) — make sure they're yours" },
        ],
        unlockCriteria: [
          { condition: "All unrecognized sessions terminated", timeframe: "Immediate" },
          { condition: "No unauthorized forwarding rules found", timeframe: "Immediate" },
          { condition: "Recovery email/phone verified as yours", timeframe: "Immediate" },
        ],
        unlockSummary: "Re-authorize only the apps you actually use. After cleanup, check active sessions weekly for the first month, then monthly.",
        automatable: true,
      },
    ],
  },
];

const CREDENTIALS_PLAYBOOK: PlaybookSection[] = [
  {
    category: "Password Reset & Account Hardening",
    icon: Key,
    actions: [
      {
        id: "password-audit",
        title: "Full Password Audit & Reset",
        urgency: "immediate",
        estimatedTime: "30-60 minutes",
        steps: [
          { instruction: "If you have a password manager, run its security audit/breach check feature" },
          { instruction: "If you don't have one, set up Bitwarden (free) or 1Password now", url: "https://bitwarden.com/" },
          { instruction: "Change passwords on ALL accounts that used the compromised credentials, starting with: banking, email, social media" },
          { instruction: "Every new password must be unique — never reuse passwords across sites" },
          { instruction: "Enable 2FA on every account that supports it (especially financial accounts)" },
          { instruction: "Check HaveIBeenPwned to see which breaches your email appears in", url: "https://haveibeenpwned.com/" },
        ],
        unlockCriteria: [
          { condition: "All accounts using the compromised password have been changed", timeframe: "Within 24 hours" },
          { condition: "2FA enabled on all critical accounts", timeframe: "Within 48 hours" },
          { condition: "Password manager set up with unique passwords", timeframe: "Within 1 week" },
        ],
        unlockSummary: "Password resets are permanent — there's nothing to 'unlock.' The key ongoing action is to never reuse passwords and to use your password manager for everything.",
        automatable: true,
      },
    ],
  },
];

const PHONE_PLAYBOOK: PlaybookSection[] = [
  {
    category: "SIM Protection & Carrier Security",
    icon: Smartphone,
    actions: [
      {
        id: "sim-lock",
        title: "Set Up SIM Lock & Port-Out Protection",
        urgency: "immediate",
        estimatedTime: "15 minutes",
        steps: [
          { instruction: "Call your mobile carrier's customer service line" },
          { instruction: "Tell them: 'I need to set up a SIM lock and port-out protection. My phone number was found on {source}.'" },
          { instruction: "Ask them to: 1) Add a SIM lock PIN, 2) Enable port-out protection, 3) Add a note that no changes should be made without in-person ID verification" },
          { instruction: "Set a strong account PIN (NOT your birthday or last 4 of SSN)" },
          { instruction: "Ask if they offer 'number lock' or 'number transfer freeze' — an extra layer that prevents porting" },
        ],
        unlockCriteria: [
          { condition: "SIM lock and port-out protection confirmed active", timeframe: "Immediate" },
          { condition: "Account PIN set and memorized", timeframe: "Immediate" },
          { condition: "No unauthorized port-out attempts detected for 6+ months", timeframe: "6 months" },
        ],
        unlockSummary: "Never remove SIM lock or port-out protection. These should stay active permanently. If you need to legitimately port your number to a new carrier, temporarily remove port-out protection yourself using your PIN.",
        automatable: false,
      },
    ],
  },
];

function getPlaybookForDataType(dataType: string, source: string): PlaybookSection[] {
  let playbook: PlaybookSection[];
  switch (dataType) {
    case "SSN": playbook = SSN_PLAYBOOK; break;
    case "Financial Account": playbook = FINANCIAL_PLAYBOOK; break;
    case "Email": playbook = EMAIL_PLAYBOOK; break;
    case "Credentials": playbook = CREDENTIALS_PLAYBOOK; break;
    case "Phone Number": playbook = PHONE_PLAYBOOK; break;
    default: playbook = EMAIL_PLAYBOOK;
  }
  return playbook.map(section => ({
    ...section,
    actions: section.actions.map(action => ({
      ...action,
      steps: action.steps.map(step => ({
        ...step,
        instruction: step.instruction.replace(/\{source\}/g, source),
        detail: step.detail?.replace(/\{source\}/g, source),
      })),
    })),
  }));
}

interface RecoveryPlaybookProps {
  dataType: string;
  sourceMarketplace: string;
  completedSteps: Set<string>;
  onToggleStep: (stepId: string) => void;
}

export function RecoveryPlaybook({ dataType, sourceMarketplace, completedSteps, onToggleStep }: RecoveryPlaybookProps) {
  const playbook = getPlaybookForDataType(dataType, sourceMarketplace);
  const [expandedAction, setExpandedAction] = useState<string | null>(null);
  const [showUnlock, setShowUnlock] = useState<string | null>(null);

  const totalActions = playbook.reduce((sum, s) => sum + s.actions.length, 0);
  const completedActions = playbook.reduce((sum, s) =>
    sum + s.actions.filter(a => completedSteps.has(a.id)).length, 0
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-display uppercase tracking-widest text-primary flex items-center gap-2">
          <Shield className="w-4 h-4" />
          Recovery Playbook — Step-by-Step
        </h4>
        <span className="text-[10px] font-mono text-muted-foreground">
          {completedActions}/{totalActions} actions complete
        </span>
      </div>

      <div className="w-full h-2 bg-black/40 rounded-full overflow-hidden mb-4">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${totalActions > 0 ? (completedActions / totalActions) * 100 : 0}%` }}
          transition={{ duration: 0.6 }}
          className={`h-full rounded-full ${
            completedActions === 0 ? "bg-rose-500" :
            completedActions < totalActions ? "bg-amber-400" :
            "bg-emerald-500"
          }`}
        />
      </div>

      {playbook.map((section) => {
        const SectionIcon = section.icon;
        return (
          <div key={section.category} className="space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <SectionIcon className="w-4 h-4 text-primary" />
              <span className="text-[11px] font-display uppercase tracking-widest text-white">{section.category}</span>
            </div>

            {section.actions.map((action) => {
              const isExpanded = expandedAction === action.id;
              const isCompleted = completedSteps.has(action.id);
              const urgStyle = URGENCY_STYLES[action.urgency];
              const isUnlockShown = showUnlock === action.id;

              return (
                <div key={action.id} className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
                  <div
                    role="button"
                    tabIndex={0}
                    aria-expanded={isExpanded}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setExpandedAction(isExpanded ? null : action.id); } }}
                    className="p-4 cursor-pointer flex items-center gap-3 hover:bg-white/[0.03] transition-colors"
                    onClick={() => setExpandedAction(isExpanded ? null : action.id)}
                  >
                    <button
                      onClick={(e) => { e.stopPropagation(); onToggleStep(action.id); }}
                      role="checkbox"
                      aria-checked={isCompleted}
                      aria-label={`Mark "${action.title}" as ${isCompleted ? "incomplete" : "complete"}`}
                      className="shrink-0"
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      ) : (
                        <Circle className="w-5 h-5 text-muted-foreground hover:text-primary transition-colors" />
                      )}
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-sm font-display ${isCompleted ? "line-through text-muted-foreground" : "text-white"}`}>
                          {action.title}
                        </span>
                        <span className={`text-[9px] font-mono uppercase tracking-widest px-2 py-0.5 rounded border ${urgStyle.bg} ${urgStyle.text}`}>
                          {urgStyle.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-[10px] font-mono text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {action.estimatedTime}
                        </span>
                        {action.automatable && (
                          <span className="text-[9px] font-mono text-emerald-400/70 px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                            CAN BE AUTOMATED
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="shrink-0 text-muted-foreground">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-4 border-t border-white/5 pt-3 space-y-3">
                          <ol className="space-y-3">
                            {action.steps.map((step, i) => (
                              <li key={i} className="flex gap-3">
                                <span className="shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary text-[10px] font-mono flex items-center justify-center mt-0.5">
                                  {i + 1}
                                </span>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm text-gray-200">{step.instruction}</p>
                                  {step.detail && (
                                    <p className="text-xs text-muted-foreground mt-1 pl-2 border-l-2 border-white/10">{step.detail}</p>
                                  )}
                                  {step.url && (
                                    <a
                                      href={step.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80 mt-1 transition-colors"
                                    >
                                      <ExternalLink className="w-3 h-3" />
                                      {new URL(step.url).hostname}
                                    </a>
                                  )}
                                  {step.phone && (
                                    <a
                                      href={`tel:${step.phone}`}
                                      className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80 mt-1 transition-colors"
                                    >
                                      <Phone className="w-3 h-3" />
                                      {step.phone}
                                    </a>
                                  )}
                                </div>
                              </li>
                            ))}
                          </ol>

                          <div className="mt-4">
                            <button
                              onClick={() => setShowUnlock(isUnlockShown ? null : action.id)}
                              aria-expanded={isUnlockShown}
                              aria-label={isUnlockShown ? "Hide unlock criteria" : "Show when you can undo this action"}
                              className="flex items-center gap-2 text-[11px] font-display uppercase tracking-widest text-amber-400 hover:text-amber-300 transition-colors"
                            >
                              {isUnlockShown ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                              {isUnlockShown ? "Hide Unlock Criteria" : "When Can I Undo This?"}
                            </button>

                            <AnimatePresence>
                              {isUnlockShown && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  className="overflow-hidden"
                                >
                                  <div className="mt-3 p-3 rounded-lg bg-amber-500/5 border border-amber-500/20 space-y-3">
                                    <p className="text-xs font-display uppercase tracking-widest text-amber-400 flex items-center gap-1.5">
                                      <Unlock className="w-3.5 h-3.5" />
                                      Unlock / Reversal Criteria
                                    </p>
                                    <ul className="space-y-2">
                                      {action.unlockCriteria.map((criterion, i) => (
                                        <li key={i} className="flex items-start gap-2">
                                          <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                                          <div>
                                            <p className="text-xs text-gray-300">{criterion.condition}</p>
                                            <span className="text-[10px] font-mono text-muted-foreground">{criterion.timeframe}</span>
                                          </div>
                                        </li>
                                      ))}
                                    </ul>
                                    <div className="pt-2 border-t border-amber-500/10">
                                      <p className="text-xs text-amber-200/80 italic">{action.unlockSummary}</p>
                                    </div>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
