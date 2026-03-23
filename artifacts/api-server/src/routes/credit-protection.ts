import { Router, type IRouter } from "express";

const router: IRouter = Router();

interface ChecklistItem {
  id: string;
  category: string;
  title: string;
  description: string;
  priority: "critical" | "high" | "medium" | "low";
  phase: "immediate" | "ongoing" | "recovery";
  actionUrl?: string;
  actionLabel?: string;
}

const CREDIT_CHECKLIST: ChecklistItem[] = [
  {
    id: "freeze-equifax",
    category: "Credit Freezes",
    title: "Freeze credit at Equifax",
    description: "Place a security freeze on your Equifax credit file. This prevents anyone (including you) from opening new credit accounts until you temporarily lift the freeze. It's free, instant online, and the single most effective step against identity theft.",
    priority: "critical",
    phase: "immediate",
    actionUrl: "https://www.equifax.com/personal/credit-report-services/credit-freeze/",
    actionLabel: "Equifax Freeze Portal",
  },
  {
    id: "freeze-experian",
    category: "Credit Freezes",
    title: "Freeze credit at Experian",
    description: "Place a security freeze on your Experian credit file. Each bureau maintains separate records, so you must freeze at all three. Save your PIN/password — you'll need it to temporarily lift the freeze when applying for credit.",
    priority: "critical",
    phase: "immediate",
    actionUrl: "https://www.experian.com/freeze/center.html",
    actionLabel: "Experian Freeze Portal",
  },
  {
    id: "freeze-transunion",
    category: "Credit Freezes",
    title: "Freeze credit at TransUnion",
    description: "Place a security freeze on your TransUnion credit file. With all three bureaus frozen, no one can run a credit check in your name without your explicit authorization.",
    priority: "critical",
    phase: "immediate",
    actionUrl: "https://www.transunion.com/credit-freeze",
    actionLabel: "TransUnion Freeze Portal",
  },
  {
    id: "freeze-innovis",
    category: "Credit Freezes",
    title: "Freeze credit at Innovis",
    description: "Innovis is the lesser-known fourth credit bureau. Some lenders use it, so freezing here closes a gap that most people miss. It's free and can be done online.",
    priority: "high",
    phase: "immediate",
    actionUrl: "https://www.innovis.com/securityFreeze",
    actionLabel: "Innovis Freeze Portal",
  },
  {
    id: "freeze-nctue",
    category: "Credit Freezes",
    title: "Freeze NCTUE (utility/telecom report)",
    description: "The National Consumer Telecom & Utilities Exchange tracks your payment history with phone, cable, and utility companies. Freezing this prevents someone from opening utility accounts in your name.",
    priority: "medium",
    phase: "immediate",
    actionUrl: "https://www.nctue.com/consumers",
    actionLabel: "NCTUE Portal",
  },
  {
    id: "freeze-chexsystems",
    category: "Credit Freezes",
    title: "Freeze ChexSystems (banking report)",
    description: "ChexSystems tracks your banking history and is used when opening new bank accounts. Freezing it prevents fraudulent bank accounts from being opened in your name.",
    priority: "high",
    phase: "immediate",
    actionUrl: "https://www.chexsystems.com/security-freeze",
    actionLabel: "ChexSystems Freeze Portal",
  },
  {
    id: "store-freeze-pins",
    category: "Credential Security",
    title: "Store all freeze PINs in Secure Vault",
    description: "Each bureau gives you a PIN or password when you freeze. Store these in GuardianLayer's Secure Vault so you can quickly unfreeze when needed. Without these PINs, lifting a freeze requires identity verification by mail.",
    priority: "critical",
    phase: "immediate",
  },
  {
    id: "fraud-alert",
    category: "Fraud Alerts",
    title: "Place initial fraud alert (optional with freeze)",
    description: "A fraud alert requires creditors to verify your identity before extending credit. Filing with one bureau propagates to all three. Less protective than a freeze but useful as an extra layer. Lasts one year and can be renewed.",
    priority: "medium",
    phase: "immediate",
    actionUrl: "https://www.equifax.com/personal/credit-report-services/credit-fraud-alerts/",
    actionLabel: "Place Fraud Alert",
  },
  {
    id: "annualcreditreport",
    category: "Monitoring",
    title: "Pull free credit reports from all 3 bureaus",
    description: "Visit AnnualCreditReport.com (the only federally authorized source) to review your credit reports for free. Check for unfamiliar accounts, addresses, or inquiries. You're entitled to one free report from each bureau per year.",
    priority: "high",
    phase: "immediate",
    actionUrl: "https://www.annualcreditreport.com",
    actionLabel: "Get Free Reports",
  },
  {
    id: "review-accounts",
    category: "Monitoring",
    title: "Review all open accounts for unauthorized activity",
    description: "Go through your credit reports line by line. Flag any accounts you don't recognize, addresses you haven't lived at, or hard inquiries you didn't authorize. Dispute anything inaccurate directly with the bureau.",
    priority: "high",
    phase: "immediate",
  },
  {
    id: "opt-out-prescreened",
    category: "Fraud Prevention",
    title: "Opt out of prescreened credit offers",
    description: "Call 1-888-5-OPT-OUT or visit OptOutPrescreen.com to stop prescreened credit card and insurance offers. These mailers can be intercepted from your mailbox and used for fraud.",
    priority: "medium",
    phase: "immediate",
    actionUrl: "https://www.optoutprescreen.com",
    actionLabel: "Opt Out Now",
  },
  {
    id: "irs-ip-pin",
    category: "Tax Protection",
    title: "Get an IRS Identity Protection PIN",
    description: "An IP PIN is a 6-digit number that prevents someone from filing a tax return using your Social Security number. Apply through the IRS website — this stops tax refund fraud, which is one of the most common identity theft schemes.",
    priority: "high",
    phase: "immediate",
    actionUrl: "https://www.irs.gov/identity-theft-fraud-scams/get-an-identity-protection-pin",
    actionLabel: "Get IRS IP PIN",
  },
  {
    id: "ssa-account",
    category: "Tax Protection",
    title: "Create a my Social Security account",
    description: "Create an account at ssa.gov to monitor your Social Security statement and earnings record. This also prevents someone else from creating an account in your name to redirect your benefits.",
    priority: "medium",
    phase: "immediate",
    actionUrl: "https://www.ssa.gov/myaccount/",
    actionLabel: "Create SSA Account",
  },
  {
    id: "bank-alerts",
    category: "Account Monitoring",
    title: "Enable transaction alerts on all bank accounts",
    description: "Set up real-time notifications for all transactions, balance changes, and login attempts on your bank and credit card accounts. Most banks offer SMS, email, and push notification options. Set the threshold to $0 or $1 to catch everything.",
    priority: "high",
    phase: "ongoing",
  },
  {
    id: "credit-card-alerts",
    category: "Account Monitoring",
    title: "Enable alerts on all credit cards",
    description: "Turn on transaction notifications for every credit card. Many card issuers let you set alerts for any purchase, international transactions, online purchases, and purchases over a custom amount.",
    priority: "high",
    phase: "ongoing",
  },
  {
    id: "quarterly-report-check",
    category: "Monitoring",
    title: "Schedule quarterly credit report reviews",
    description: "Set a calendar reminder to pull one free credit report every 4 months, rotating between bureaus (e.g., Equifax in January, Experian in May, TransUnion in September). This gives you year-round monitoring without paying for a service.",
    priority: "medium",
    phase: "ongoing",
  },
  {
    id: "breached-passwords",
    category: "Credential Security",
    title: "Check and rotate breached passwords",
    description: "Use GuardianLayer's Domain Breach Monitor to check if your email addresses appear in known data breaches. Change passwords for any compromised accounts immediately and never reuse passwords across services.",
    priority: "high",
    phase: "ongoing",
  },
  {
    id: "mail-security",
    category: "Fraud Prevention",
    title: "Secure physical mail delivery",
    description: "Consider USPS Informed Delivery to see images of incoming mail. Use a locking mailbox or P.O. Box if possible. Mail theft is a common source of identity theft — stolen bank statements, tax documents, and credit card offers can all be exploited.",
    priority: "medium",
    phase: "ongoing",
    actionUrl: "https://informeddelivery.usps.com/",
    actionLabel: "Set Up Informed Delivery",
  },
  {
    id: "dispute-unauthorized",
    category: "Recovery Steps",
    title: "Dispute unauthorized accounts or inquiries",
    description: "If you find anything unfamiliar on your credit reports, file disputes with each bureau online. Include any supporting documentation. Bureaus have 30 days to investigate and respond.",
    priority: "critical",
    phase: "recovery",
  },
  {
    id: "ftc-report",
    category: "Recovery Steps",
    title: "File an FTC identity theft report",
    description: "If you're a victim of identity theft, file a report at IdentityTheft.gov. This creates an official Identity Theft Report that you can use with creditors, bureaus, and law enforcement to dispute fraudulent accounts.",
    priority: "critical",
    phase: "recovery",
    actionUrl: "https://www.identitytheft.gov/",
    actionLabel: "File FTC Report",
  },
  {
    id: "police-report",
    category: "Recovery Steps",
    title: "File a local police report",
    description: "File an identity theft report with your local police department. While they may not investigate, the report number is useful when dealing with creditors and financial institutions to prove the crime occurred.",
    priority: "high",
    phase: "recovery",
  },
  {
    id: "extended-fraud-alert",
    category: "Recovery Steps",
    title: "Place extended fraud alert (7 years)",
    description: "If you've been a victim of identity theft with an FTC report, you can place an extended fraud alert that lasts 7 years (vs. 1 year for initial alerts). This requires creditors to contact you directly before opening accounts.",
    priority: "high",
    phase: "recovery",
  },
];

router.get("/credit-protection/checklist", (_req, res): void => {
  const immediate = CREDIT_CHECKLIST.filter(i => i.phase === "immediate");
  const ongoing = CREDIT_CHECKLIST.filter(i => i.phase === "ongoing");
  const recovery = CREDIT_CHECKLIST.filter(i => i.phase === "recovery");

  res.json({
    phases: {
      immediate: { label: "Set Up Now", items: immediate },
      ongoing: { label: "Ongoing Protection", items: ongoing },
      recovery: { label: "If You're Compromised", items: recovery },
    },
    stats: {
      total: CREDIT_CHECKLIST.length,
      critical: CREDIT_CHECKLIST.filter(i => i.priority === "critical").length,
      high: CREDIT_CHECKLIST.filter(i => i.priority === "high").length,
    },
  });
});

router.get("/credit-protection/resources", (_req, res): void => {
  res.json({
    resources: [
      {
        title: "Freeze vs. Lock — What's the Difference?",
        content: "A credit freeze is a legal right under federal law (free since 2018). A credit lock is a product offered by bureaus, sometimes with a fee. Freezes are enforced by law; locks are governed by the bureau's terms of service. Always prefer the freeze.",
      },
      {
        title: "How Long Does a Freeze Last?",
        content: "A credit freeze stays in place until you remove it. You can temporarily lift ('thaw') it for a specific time period or permanently remove it. Each bureau has its own process, which is why saving your PINs is critical.",
      },
      {
        title: "What About Credit Monitoring Services?",
        content: "Paid services like IdentityGuard, LifeLock, or Aura monitor your credit and alert you to changes. They're convenient but not necessary if you have freezes in place and do quarterly manual checks. Many banks and credit cards now offer free credit score monitoring.",
      },
      {
        title: "Does a Freeze Hurt My Credit Score?",
        content: "No. A credit freeze has zero impact on your credit score. Your existing accounts continue reporting normally. The only impact is that new credit applications will be denied until you temporarily lift the freeze.",
      },
      {
        title: "What About My Kids?",
        content: "Children are common targets for identity theft because nobody checks their credit for years. You can freeze a minor's credit at all three bureaus. The process typically requires mailing in documentation (birth certificate, your ID) since minors can't do it online.",
      },
    ],
  });
});

export default router;
