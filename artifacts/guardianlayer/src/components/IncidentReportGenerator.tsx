import { useState } from "react";
import { FileDown, FileText, Loader2, Building2, Shield, Scale } from "lucide-react";

interface TimelineEvent {
  timestamp: string;
  type: string;
  severity: string;
  title: string;
  detail: string;
  source: string;
}

interface BreachData {
  breachStatus: string;
  timeWindow: { hours: number; since: string };
  summary: {
    totalAnomalies: number;
    criticalCount: number;
    highCount: number;
    affectedIps: number;
    affectedEndpoints: number;
    networkEvents: number;
    lockdownsTriggered: number;
    activeLockdown: boolean;
  };
  typeBreakdown: Record<string, number>;
  timeline: TimelineEvent[];
  affectedIps: string[];
  affectedEndpoints: string[];
  anomalies: any[];
  lockdownSessions: any[];
}

interface IncidentReportGeneratorProps {
  data: BreachData | null;
  hours: number;
}

function formatDateTime(ts: string): string {
  const d = new Date(ts);
  return d.toLocaleString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZoneName: "short",
  });
}

function formatDateShort(ts: string): string {
  const d = new Date(ts);
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

function todayFormatted(): string {
  return new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

function severityLabel(sev: string): string {
  const labels: Record<string, string> = {
    critical: "CRITICAL",
    high: "HIGH",
    medium: "MEDIUM",
    low: "LOW",
  };
  return labels[sev] || sev.toUpperCase();
}

function generateIncidentReport(data: BreachData, hours: number): string {
  const today = todayFormatted();
  const sinceDate = formatDateTime(data.timeWindow.since);
  const statusLabels: Record<string, string> = {
    active: "ACTIVE BREACH",
    contained: "CONTAINED",
    monitoring: "UNDER MONITORING",
    clear: "ALL CLEAR",
  };

  const criticalEvents = data.timeline.filter(e => e.severity === "critical");
  const highEvents = data.timeline.filter(e => e.severity === "high");

  let report = "";

  report += "═".repeat(72) + "\n";
  report += "         GUARDIANLAYER ENTERPRISE — SECURITY INCIDENT REPORT\n";
  report += "═".repeat(72) + "\n\n";
  report += `Report Generated:    ${today}\n`;
  report += `Report ID:           IR-${Date.now().toString(36).toUpperCase()}\n`;
  report += `Monitoring Period:   Last ${hours} hours (since ${sinceDate})\n`;
  report += `Incident Status:     ${statusLabels[data.breachStatus] || data.breachStatus.toUpperCase()}\n`;
  report += `Classification:      CONFIDENTIAL — FOR AUTHORIZED PERSONNEL ONLY\n`;
  report += "\n" + "─".repeat(72) + "\n";

  report += "\n1. EXECUTIVE SUMMARY\n";
  report += "─".repeat(72) + "\n\n";
  report += `During the monitoring period of ${hours} hours, GuardianLayer detected\n`;
  report += `${data.summary.totalAnomalies} anomalies, including ${data.summary.criticalCount} critical and\n`;
  report += `${data.summary.highCount} high-severity events. The system identified activity from\n`;
  report += `${data.summary.affectedIps} unique IP address(es) targeting ${data.summary.affectedEndpoints}\n`;
  report += `endpoint(s). ${data.summary.networkEvents} network events with elevated risk scores\n`;
  report += `were recorded. ${data.summary.lockdownsTriggered} emergency lockdown(s) were triggered.\n\n`;

  if (data.summary.activeLockdown) {
    report += `⚠  AN EMERGENCY LOCKDOWN IS CURRENTLY ACTIVE.\n`;
    report += `   All containment actions are in effect.\n\n`;
  }

  report += "\n2. INCIDENT STATISTICS\n";
  report += "─".repeat(72) + "\n\n";
  report += `  Total Anomalies Detected:     ${data.summary.totalAnomalies}\n`;
  report += `  Critical Severity Events:     ${data.summary.criticalCount}\n`;
  report += `  High Severity Events:         ${data.summary.highCount}\n`;
  report += `  Affected IP Addresses:        ${data.summary.affectedIps}\n`;
  report += `  Affected Endpoints:           ${data.summary.affectedEndpoints}\n`;
  report += `  Network Events (Risk ≥ 60):   ${data.summary.networkEvents}\n`;
  report += `  Lockdowns Triggered:          ${data.summary.lockdownsTriggered}\n`;
  report += `  Active Lockdown:              ${data.summary.activeLockdown ? "YES" : "No"}\n`;

  if (Object.keys(data.typeBreakdown).length > 0) {
    report += "\n\n3. ATTACK TYPE BREAKDOWN\n";
    report += "─".repeat(72) + "\n\n";
    for (const [type, count] of Object.entries(data.typeBreakdown)) {
      report += `  ${type.replace(/_/g, " ").padEnd(35)} ${count} occurrence(s)\n`;
    }
  }

  if (data.affectedIps.length > 0) {
    report += "\n\n4. AFFECTED IP ADDRESSES\n";
    report += "─".repeat(72) + "\n\n";
    data.affectedIps.forEach((ip, i) => {
      report += `  ${i + 1}. ${ip}\n`;
    });
  }

  if (data.affectedEndpoints.length > 0) {
    report += "\n\n5. AFFECTED SYSTEMS & ENDPOINTS\n";
    report += "─".repeat(72) + "\n\n";
    data.affectedEndpoints.forEach((ep, i) => {
      report += `  ${i + 1}. ${ep}\n`;
    });
  }

  report += "\n\n6. INCIDENT TIMELINE (CHRONOLOGICAL)\n";
  report += "─".repeat(72) + "\n\n";

  if (data.timeline.length === 0) {
    report += "  No events recorded during this monitoring period.\n";
  } else {
    const sorted = [...data.timeline].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    sorted.forEach((event) => {
      report += `  [${formatDateTime(event.timestamp)}]\n`;
      report += `  Severity: ${severityLabel(event.severity)}  |  Type: ${event.type}  |  Source: ${event.source}\n`;
      report += `  Event:    ${event.title}\n`;
      if (event.detail) {
        report += `  Detail:   ${event.detail}\n`;
      }
      report += "\n";
    });
  }

  if (data.lockdownSessions.length > 0) {
    report += "\n7. LOCKDOWN SESSIONS\n";
    report += "─".repeat(72) + "\n\n";
    data.lockdownSessions.forEach((session, i) => {
      report += `  Session ${i + 1}:\n`;
      report += `    Status:      ${session.status.toUpperCase()}\n`;
      report += `    Activated:   ${formatDateTime(session.activatedAt)}\n`;
      if (session.deactivatedAt) {
        report += `    Deactivated: ${formatDateTime(session.deactivatedAt)}\n`;
      }
      report += `    Reason:      ${session.reason || "Emergency lockdown"}\n\n`;
    });
  }

  report += "\n8. RECOMMENDED IMMEDIATE ACTIONS\n";
  report += "─".repeat(72) + "\n\n";
  report += "  1. Contact your financial institution(s) immediately to freeze\n";
  report += "     accounts and dispute unauthorized transactions.\n\n";
  report += "  2. File a complaint with the FBI Internet Crime Complaint Center\n";
  report += "     (IC3) at https://www.ic3.gov\n\n";
  report += "  3. Report to the Federal Trade Commission (FTC) at\n";
  report += "     https://reportfraud.ftc.gov\n\n";
  report += "  4. File a police report with your local law enforcement agency.\n";
  report += "     Bring a copy of this incident report.\n\n";
  report += "  5. Contact all three credit bureaus to place fraud alerts:\n";
  report += "     - Equifax:    1-800-525-6285 | https://www.equifax.com/personal/credit-report-services/credit-fraud-alerts/\n";
  report += "     - Experian:   1-888-397-3742 | https://www.experian.com/fraud/center.html\n";
  report += "     - TransUnion: 1-800-680-7289 | https://www.transunion.com/fraud-alerts\n\n";
  report += "  6. Change all passwords from a known-clean device.\n";
  report += "     Start with email, then banking, then all other accounts.\n\n";
  report += "  7. Enable multi-factor authentication on all accounts.\n\n";
  report += "  8. Check https://haveibeenpwned.com for additional breaches.\n\n";
  report += "  9. Monitor bank and credit card statements for 90 days minimum.\n\n";
  report += "  10. Consider an identity theft protection service.\n";

  report += "\n\n" + "═".repeat(72) + "\n";
  report += "  This report was generated by GuardianLayer Enterprise.\n";
  report += "  Report ID: IR-" + Date.now().toString(36).toUpperCase() + "\n";
  report += "  Generated: " + today + "\n";
  report += "═".repeat(72) + "\n";

  return report;
}

function generateFBILetter(data: BreachData): string {
  const today = todayFormatted();

  let letter = "";
  letter += "TO: Federal Bureau of Investigation\n";
  letter += "    Internet Crime Complaint Center (IC3)\n";
  letter += "    Online: https://www.ic3.gov\n\n";
  letter += `DATE: ${today}\n\n`;
  letter += "RE: Internet Crime Complaint — Cybersecurity Incident Report\n\n";
  letter += "─".repeat(60) + "\n\n";
  letter += "Dear IC3 Investigator,\n\n";
  letter += "I am writing to report a cybersecurity incident that resulted in\n";
  letter += "unauthorized access to my systems and/or financial accounts.\n\n";

  letter += "INCIDENT SUMMARY:\n\n";
  letter += `  Date of Discovery:   ${today}\n`;
  letter += `  Incident Status:     ${data.breachStatus.toUpperCase()}\n`;
  letter += `  Anomalies Detected:  ${data.summary.totalAnomalies}\n`;
  letter += `  Critical Events:     ${data.summary.criticalCount}\n`;
  letter += `  IP Addresses Involved: ${data.summary.affectedIps}\n`;
  letter += `  Systems Affected:    ${data.summary.affectedEndpoints}\n`;
  letter += `  Lockdowns Triggered: ${data.summary.lockdownsTriggered}\n\n`;

  letter += "DESCRIPTION OF INCIDENT:\n\n";
  letter += "[YOUR NAME] discovered unauthorized activity on [DATE]. The\n";
  letter += "GuardianLayer Enterprise security monitoring system detected the\n";
  letter += "following suspicious activity:\n\n";

  const critEvents = data.timeline.filter(e => e.severity === "critical").slice(0, 5);
  if (critEvents.length > 0) {
    critEvents.forEach(e => {
      letter += `  - ${e.title} (${formatDateTime(e.timestamp)})\n`;
      if (e.detail) letter += `    Detail: ${e.detail}\n`;
    });
    letter += "\n";
  }

  if (data.affectedIps.length > 0) {
    letter += "SUSPICIOUS IP ADDRESSES:\n\n";
    data.affectedIps.forEach(ip => {
      letter += `  - ${ip}\n`;
    });
    letter += "\n";
  }

  letter += "FINANCIAL IMPACT:\n\n";
  letter += "  Estimated Loss: $[ENTER AMOUNT]\n";
  letter += "  Payment Method: [ENTER: wire transfer / credit card / crypto / other]\n";
  letter += "  Financial Institution: [ENTER BANK NAME]\n\n";

  letter += "ACTIONS ALREADY TAKEN:\n\n";
  letter += "  [ ] Contacted financial institution to freeze accounts\n";
  letter += "  [ ] Changed all passwords\n";
  letter += "  [ ] Enabled multi-factor authentication\n";
  letter += "  [ ] Filed police report (Case #: ________________)\n";
  letter += "  [ ] Contacted credit bureaus\n";
  letter += "  [ ] Activated emergency system lockdown\n\n";

  letter += "I have attached a detailed security incident report generated by\n";
  letter += "GuardianLayer Enterprise, which includes a full timeline of events,\n";
  letter += "affected systems, and IP addresses involved.\n\n";

  letter += "I request that this matter be investigated. I am available to\n";
  letter += "provide additional information as needed.\n\n";

  letter += "Respectfully,\n\n";
  letter += "[YOUR FULL NAME]\n";
  letter += "[YOUR ADDRESS]\n";
  letter += "[YOUR PHONE NUMBER]\n";
  letter += "[YOUR EMAIL ADDRESS]\n";

  return letter;
}

function generateFTCLetter(data: BreachData): string {
  const today = todayFormatted();

  let letter = "";
  letter += "TO: Federal Trade Commission\n";
  letter += "    Online: https://reportfraud.ftc.gov\n";
  letter += "    Identity Theft: https://www.identitytheft.gov\n";
  letter += "    Phone: 1-877-FTC-HELP (1-877-382-4357)\n\n";
  letter += `DATE: ${today}\n\n`;
  letter += "RE: Identity Theft / Fraud Report — Cybersecurity Incident\n\n";
  letter += "─".repeat(60) + "\n\n";
  letter += "Dear FTC,\n\n";
  letter += "I am writing to report identity theft and/or fraud resulting from\n";
  letter += "a cybersecurity incident. My personal information and/or financial\n";
  letter += "accounts have been compromised.\n\n";

  letter += "VICTIM INFORMATION:\n\n";
  letter += "  Name:            [YOUR FULL NAME]\n";
  letter += "  Address:         [YOUR ADDRESS]\n";
  letter += "  Phone:           [YOUR PHONE NUMBER]\n";
  letter += "  Email:           [YOUR EMAIL ADDRESS]\n";
  letter += "  Date of Birth:   [YOUR DOB]\n";
  letter += "  SSN (last 4):    [XXXX]\n\n";

  letter += "INCIDENT DETAILS:\n\n";
  letter += `  Date Discovered:      ${today}\n`;
  letter += `  System Anomalies:     ${data.summary.totalAnomalies}\n`;
  letter += `  Critical Alerts:      ${data.summary.criticalCount}\n`;
  letter += "  Estimated Loss:       $[ENTER AMOUNT]\n\n";

  letter += "TYPE OF FRAUD (check all that apply):\n\n";
  letter += "  [ ] Unauthorized credit card charges\n";
  letter += "  [ ] Unauthorized bank withdrawals or transfers\n";
  letter += "  [ ] New accounts opened in my name\n";
  letter += "  [ ] Tax fraud filed using my information\n";
  letter += "  [ ] Government benefits fraud\n";
  letter += "  [ ] Unauthorized use of personal information\n";
  letter += "  [ ] Other: ______________________________\n\n";

  letter += "DESCRIPTION:\n\n";
  letter += "[Describe in your own words what happened, when you discovered\n";
  letter += "the fraud, and what unauthorized activity occurred.]\n\n";

  letter += "STEPS TAKEN:\n\n";
  letter += "  [ ] Filed FBI IC3 complaint\n";
  letter += "  [ ] Filed local police report (Case #: ________________)\n";
  letter += "  [ ] Contacted financial institution(s)\n";
  letter += "  [ ] Placed fraud alerts with credit bureaus\n";
  letter += "  [ ] Froze credit reports\n\n";

  letter += "I have attached a detailed security incident report from\n";
  letter += "GuardianLayer Enterprise documenting the technical evidence.\n\n";

  letter += "Respectfully,\n\n";
  letter += "[YOUR FULL NAME]\n";
  letter += "[YOUR SIGNATURE]\n";
  letter += `[DATE: ${today}]\n`;

  return letter;
}

function generatePoliceLetter(data: BreachData): string {
  const today = todayFormatted();

  let letter = "";
  letter += "TO: [YOUR LOCAL POLICE DEPARTMENT]\n";
  letter += "    [DEPARTMENT ADDRESS]\n\n";
  letter += `DATE: ${today}\n\n`;
  letter += "RE: Cybercrime / Financial Fraud — Request for Police Report\n\n";
  letter += "─".repeat(60) + "\n\n";
  letter += "Dear Officer / Detective,\n\n";
  letter += "I am writing to report that I have been the victim of a cybercrime\n";
  letter += "involving unauthorized access to my digital systems and/or financial\n";
  letter += "accounts. I am requesting that a formal police report be filed.\n\n";

  letter += "INCIDENT SUMMARY:\n\n";
  letter += `  Date of Discovery:       ${today}\n`;
  letter += "  Estimated Financial Loss: $[ENTER AMOUNT]\n";
  letter += `  Security Alerts Detected: ${data.summary.totalAnomalies}\n`;
  letter += `  Critical Alerts:          ${data.summary.criticalCount}\n\n`;

  letter += "DESCRIPTION:\n\n";
  letter += "[Describe what happened in plain language. Include:\n";
  letter += "  - When you first noticed something was wrong\n";
  letter += "  - What accounts or systems were affected\n";
  letter += "  - How much money was taken\n";
  letter += "  - Any suspicious communications you received]\n\n";

  letter += "EVIDENCE ATTACHED:\n\n";
  letter += "  1. GuardianLayer Enterprise Security Incident Report\n";
  letter += "     (contains full timeline, IP addresses, and system logs)\n";
  letter += "  2. [Bank statements showing unauthorized transactions]\n";
  letter += "  3. [Screenshots of suspicious emails or messages]\n\n";

  letter += "OTHER REPORTS FILED:\n\n";
  letter += "  [ ] FBI IC3 (Complaint #: ________________)\n";
  letter += "  [ ] FTC Identity Theft Report (Report #: ________________)\n";
  letter += "  [ ] Financial institution fraud department\n";
  letter += "  [ ] Credit bureau fraud alerts\n\n";

  letter += "I need this police report for:\n";
  letter += "  - Filing disputes with my financial institution\n";
  letter += "  - Supporting my FTC identity theft report\n";
  letter += "  - Insurance claims\n";
  letter += "  - Credit bureau dispute documentation\n\n";

  letter += "I am available to provide additional information and cooperate\n";
  letter += "fully with any investigation.\n\n";

  letter += "Respectfully,\n\n";
  letter += "[YOUR FULL NAME]\n";
  letter += "[YOUR ADDRESS]\n";
  letter += "[YOUR PHONE NUMBER]\n";
  letter += "[YOUR EMAIL ADDRESS]\n";

  return letter;
}

function generateBankLetter(data: BreachData): string {
  const today = todayFormatted();

  let letter = "";
  letter += "TO: [YOUR BANK / FINANCIAL INSTITUTION]\n";
  letter += "    Fraud Department\n";
  letter += "    [BANK ADDRESS]\n\n";
  letter += `DATE: ${today}\n\n`;
  letter += "RE: Unauthorized Transaction(s) — Fraud Dispute\n";
  letter += "    Account #: [YOUR ACCOUNT NUMBER (last 4)]\n\n";
  letter += "─".repeat(60) + "\n\n";
  letter += "Dear Fraud Department,\n\n";
  letter += "I am writing to formally dispute unauthorized transaction(s) on\n";
  letter += "my account. I did not authorize, participate in, or benefit from\n";
  letter += "these transaction(s).\n\n";

  letter += "UNAUTHORIZED TRANSACTIONS:\n\n";
  letter += "  Date          Amount        Description\n";
  letter += "  ──────────    ──────────    ─────────────────────────\n";
  letter += "  [DATE]        $[AMOUNT]     [DESCRIPTION]\n";
  letter += "  [DATE]        $[AMOUNT]     [DESCRIPTION]\n";
  letter += "  [DATE]        $[AMOUNT]     [DESCRIPTION]\n\n";
  letter += "  TOTAL DISPUTED: $[TOTAL AMOUNT]\n\n";

  letter += "CIRCUMSTANCES:\n\n";
  letter += "My security monitoring system (GuardianLayer Enterprise) detected\n";
  letter += `${data.summary.totalAnomalies} security anomalies including ${data.summary.criticalCount} critical alerts,\n`;
  letter += "indicating my account credentials and/or payment information were\n";
  letter += "compromised. I am reporting this fraud immediately upon discovery.\n\n";

  letter += "I REQUEST THE FOLLOWING:\n\n";
  letter += "  1. Full reversal of all unauthorized transactions listed above\n";
  letter += "  2. Immediate freeze on the affected account(s)\n";
  letter += "  3. Issuance of new account number(s) and card(s)\n";
  letter += "  4. Written confirmation of this dispute within 10 business days\n";
  letter += "  5. Provisional credit while the investigation is pending\n\n";

  letter += "SUPPORTING DOCUMENTATION:\n\n";
  letter += "  [ ] Security incident report (attached)\n";
  letter += "  [ ] Police report (Case #: ________________)\n";
  letter += "  [ ] FTC identity theft report (Report #: ________________)\n";
  letter += "  [ ] FBI IC3 complaint (Complaint #: ________________)\n\n";

  letter += "Under Regulation E (Electronic Fund Transfer Act) and/or the\n";
  letter += "Fair Credit Billing Act, I am entitled to dispute these\n";
  letter += "unauthorized charges. I am reporting them within the required\n";
  letter += "timeframe and request full investigation.\n\n";

  letter += "Please contact me at the information below if you require\n";
  letter += "any additional details.\n\n";

  letter += "Respectfully,\n\n";
  letter += "[YOUR FULL NAME]\n";
  letter += "[YOUR ADDRESS]\n";
  letter += "[YOUR PHONE NUMBER]\n";
  letter += "[YOUR EMAIL ADDRESS]\n";

  return letter;
}

function generateCreditBureauLetter(): string {
  const today = todayFormatted();

  let letter = "";
  letter += "TO: [CREDIT BUREAU NAME]\n";
  letter += "    (Send this letter to each bureau separately)\n\n";
  letter += "    Equifax:    P.O. Box 105069, Atlanta, GA 30348\n";
  letter += "                1-800-525-6285\n\n";
  letter += "    Experian:   P.O. Box 4500, Allen, TX 75013\n";
  letter += "                1-888-397-3742\n\n";
  letter += "    TransUnion: P.O. Box 2000, Chester, PA 19016\n";
  letter += "                1-800-680-7289\n\n";
  letter += `DATE: ${today}\n\n`;
  letter += "RE: Request for Fraud Alert and Credit Freeze\n\n";
  letter += "─".repeat(60) + "\n\n";
  letter += "Dear Credit Bureau,\n\n";
  letter += "I am a victim of identity theft / fraud. I am writing to request:\n\n";
  letter += "  1. An EXTENDED FRAUD ALERT be placed on my credit file\n";
  letter += "     (valid for 7 years under the Fair Credit Reporting Act)\n\n";
  letter += "  2. A CREDIT FREEZE (security freeze) on my credit file,\n";
  letter += "     preventing new accounts from being opened in my name\n\n";
  letter += "  3. A FREE COPY of my credit report, as I am entitled to one\n";
  letter += "     as a fraud victim\n\n";
  letter += "  4. Removal of any fraudulent inquiries or accounts that\n";
  letter += "     have been opened without my authorization\n\n";

  letter += "MY INFORMATION:\n\n";
  letter += "  Full Name:         [YOUR FULL LEGAL NAME]\n";
  letter += "  Current Address:   [YOUR CURRENT ADDRESS]\n";
  letter += "  Previous Address:  [IF APPLICABLE]\n";
  letter += "  Date of Birth:     [YOUR DOB]\n";
  letter += "  SSN:               [YOUR SSN]\n";
  letter += "  Phone:             [YOUR PHONE NUMBER]\n\n";

  letter += "ENCLOSED DOCUMENTATION:\n\n";
  letter += "  [ ] Copy of government-issued photo ID\n";
  letter += "  [ ] Proof of current address (utility bill or bank statement)\n";
  letter += "  [ ] FTC Identity Theft Report (Report #: ________________)\n";
  letter += "  [ ] Police report (Case #: ________________)\n";
  letter += "  [ ] Security incident report from GuardianLayer Enterprise\n\n";

  letter += "Under the Fair Credit Reporting Act (FCRA), I am entitled to\n";
  letter += "these protections as a victim of identity theft. Please process\n";
  letter += "this request promptly and send written confirmation.\n\n";

  letter += "Respectfully,\n\n";
  letter += "[YOUR FULL NAME]\n";
  letter += "[YOUR SIGNATURE]\n";
  letter += `[DATE: ${today}]\n`;

  return letter;
}

function downloadTextFile(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function IncidentReportGenerator({ data, hours }: IncidentReportGeneratorProps) {
  const [generating, setGenerating] = useState<string | null>(null);

  const handleDownload = (type: string) => {
    if (!data) return;
    setGenerating(type);

    setTimeout(() => {
      const timestamp = new Date().toISOString().split("T")[0];
      switch (type) {
        case "full-report":
          downloadTextFile(
            generateIncidentReport(data, hours),
            `GuardianLayer_Incident_Report_${timestamp}.txt`
          );
          break;
        case "fbi-letter":
          downloadTextFile(
            generateFBILetter(data),
            `FBI_IC3_Complaint_Letter_${timestamp}.txt`
          );
          break;
        case "ftc-letter":
          downloadTextFile(
            generateFTCLetter(data),
            `FTC_Identity_Theft_Report_Letter_${timestamp}.txt`
          );
          break;
        case "police-letter":
          downloadTextFile(
            generatePoliceLetter(data),
            `Police_Report_Request_Letter_${timestamp}.txt`
          );
          break;
        case "bank-letter":
          downloadTextFile(
            generateBankLetter(data),
            `Bank_Fraud_Dispute_Letter_${timestamp}.txt`
          );
          break;
        case "credit-bureau-letter":
          downloadTextFile(
            generateCreditBureauLetter(),
            `Credit_Bureau_Fraud_Alert_Letter_${timestamp}.txt`
          );
          break;
        case "all":
          downloadTextFile(
            generateIncidentReport(data, hours),
            `GuardianLayer_Incident_Report_${timestamp}.txt`
          );
          setTimeout(() => downloadTextFile(
            generateFBILetter(data),
            `FBI_IC3_Complaint_Letter_${timestamp}.txt`
          ), 300);
          setTimeout(() => downloadTextFile(
            generateFTCLetter(data),
            `FTC_Identity_Theft_Report_Letter_${timestamp}.txt`
          ), 600);
          setTimeout(() => downloadTextFile(
            generatePoliceLetter(data),
            `Police_Report_Request_Letter_${timestamp}.txt`
          ), 900);
          setTimeout(() => downloadTextFile(
            generateBankLetter(data),
            `Bank_Fraud_Dispute_Letter_${timestamp}.txt`
          ), 1200);
          setTimeout(() => downloadTextFile(
            generateCreditBureauLetter(),
            `Credit_Bureau_Fraud_Alert_Letter_${timestamp}.txt`
          ), 1500);
          break;
      }
      setGenerating(null);
    }, 200);
  };

  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <FileText className="h-4 w-4 text-cyan-400" />
            Incident Report & Agency Letters
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            Download a detailed security report and pre-written letters for the agencies you need to contact.
            Fill in the bracketed fields with your personal information before submitting.
          </p>
        </div>
        <button
          onClick={() => handleDownload("all")}
          disabled={!data || generating !== null}
          className="flex items-center gap-2 bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-cyan-500/30 transition-colors disabled:opacity-40"
        >
          {generating === "all" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <FileDown className="h-4 w-4" />
          )}
          Download All
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        <DownloadCard
          icon={<Shield className="h-5 w-5 text-purple-400" />}
          title="Full Incident Report"
          description="Complete security report with timeline, affected systems, IP addresses, and recommended actions."
          buttonLabel="Download Report"
          onClick={() => handleDownload("full-report")}
          loading={generating === "full-report"}
          disabled={!data}
          color="purple"
        />
        <DownloadCard
          icon={<Scale className="h-5 w-5 text-red-400" />}
          title="FBI / IC3 Complaint Letter"
          description="Pre-written complaint for the Internet Crime Complaint Center. For losses over $10,000."
          buttonLabel="Download Letter"
          onClick={() => handleDownload("fbi-letter")}
          loading={generating === "fbi-letter"}
          disabled={!data}
          color="red"
        />
        <DownloadCard
          icon={<Building2 className="h-5 w-5 text-amber-400" />}
          title="FTC Identity Theft Report"
          description="Letter for the Federal Trade Commission if personal information was compromised."
          buttonLabel="Download Letter"
          onClick={() => handleDownload("ftc-letter")}
          loading={generating === "ftc-letter"}
          disabled={!data}
          color="amber"
        />
        <DownloadCard
          icon={<Shield className="h-5 w-5 text-blue-400" />}
          title="Police Report Request"
          description="Letter for local law enforcement. Needed for bank disputes and insurance claims."
          buttonLabel="Download Letter"
          onClick={() => handleDownload("police-letter")}
          loading={generating === "police-letter"}
          disabled={!data}
          color="blue"
        />
        <DownloadCard
          icon={<Building2 className="h-5 w-5 text-emerald-400" />}
          title="Bank Fraud Dispute Letter"
          description="Formal dispute letter citing Regulation E and the Fair Credit Billing Act."
          buttonLabel="Download Letter"
          onClick={() => handleDownload("bank-letter")}
          loading={generating === "bank-letter"}
          disabled={!data}
          color="emerald"
        />
        <DownloadCard
          icon={<FileText className="h-5 w-5 text-orange-400" />}
          title="Credit Bureau Letter"
          description="Request fraud alerts, credit freeze, and fraudulent account removal from all 3 bureaus."
          buttonLabel="Download Letter"
          onClick={() => handleDownload("credit-bureau-letter")}
          loading={generating === "credit-bureau-letter"}
          disabled={!data}
          color="orange"
        />
      </div>

      <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-lg p-3">
        <p className="text-xs text-yellow-400/80">
          <strong>Important:</strong> These letters contain placeholder fields marked with [BRACKETS] that you must fill in with your personal information before sending. 
          Keep copies of all submitted documents. Send physical letters via certified mail with return receipt requested when possible.
        </p>
      </div>
    </div>
  );
}

function DownloadCard({
  icon,
  title,
  description,
  buttonLabel,
  onClick,
  loading,
  disabled,
  color,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  buttonLabel: string;
  onClick: () => void;
  loading: boolean;
  disabled: boolean;
  color: string;
}) {
  const colorStyles: Record<string, string> = {
    purple: "bg-purple-500/10 border-purple-500/20 hover:bg-purple-500/20",
    red: "bg-red-500/10 border-red-500/20 hover:bg-red-500/20",
    amber: "bg-amber-500/10 border-amber-500/20 hover:bg-amber-500/20",
    blue: "bg-blue-500/10 border-blue-500/20 hover:bg-blue-500/20",
    emerald: "bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/20",
    orange: "bg-orange-500/10 border-orange-500/20 hover:bg-orange-500/20",
  };

  const btnStyles: Record<string, string> = {
    purple: "text-purple-400 bg-purple-500/20 border-purple-500/30 hover:bg-purple-500/30",
    red: "text-red-400 bg-red-500/20 border-red-500/30 hover:bg-red-500/30",
    amber: "text-amber-400 bg-amber-500/20 border-amber-500/30 hover:bg-amber-500/30",
    blue: "text-blue-400 bg-blue-500/20 border-blue-500/30 hover:bg-blue-500/30",
    emerald: "text-emerald-400 bg-emerald-500/20 border-emerald-500/30 hover:bg-emerald-500/30",
    orange: "text-orange-400 bg-orange-500/20 border-orange-500/30 hover:bg-orange-500/30",
  };

  return (
    <div className={`rounded-lg border p-4 transition-colors ${colorStyles[color]}`}>
      <div className="flex items-start gap-3 mb-3">
        {icon}
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-white">{title}</h4>
          <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">{description}</p>
        </div>
      </div>
      <button
        onClick={onClick}
        disabled={disabled || loading}
        className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-40 ${btnStyles[color]}`}
      >
        {loading ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <FileDown className="h-3 w-3" />
        )}
        {loading ? "Generating..." : buttonLabel}
      </button>
    </div>
  );
}
