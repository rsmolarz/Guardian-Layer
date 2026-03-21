import { useState } from "react";
import { motion } from "framer-motion";
import { BookOpen, Search, Lightbulb, Eye } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { JARGON_DICTIONARY } from "@/components/clarity/JargonTranslator";

const TERM_EXAMPLES: Record<string, { example: string; whereYouSeeIt: string }> = {
  "IDS": { example: "\"IDS detected 3 suspicious connection attempts from an unknown IP address.\"", whereYouSeeIt: "Network Security page — security events list" },
  "IPS": { example: "\"IPS blocked a malicious request targeting your web server.\"", whereYouSeeIt: "Network Security page — firewall activity" },
  "DDoS": { example: "\"A DDoS attack flooded your website with 50,000 fake requests per second.\"", whereYouSeeIt: "Network Security page — attack detection" },
  "APT": { example: "\"An APT group has been accessing your file server for 3 months without detection.\"", whereYouSeeIt: "Threat Neutralization page — advanced threats" },
  "C2": { example: "\"Malware on this laptop is communicating with a C2 server in Eastern Europe.\"", whereYouSeeIt: "Endpoint Security — device threat details" },
  "SQL injection": { example: "\"An attacker tried SQL injection on your login page to steal user passwords.\"", whereYouSeeIt: "Network Security — web application attacks" },
  "SYN flood": { example: "\"A SYN flood attack is overwhelming your server with 10,000 fake connection requests.\"", whereYouSeeIt: "Network Security — DDoS-type events" },
  "phishing": { example: "\"An email pretending to be from your bank asked you to 'verify your account.'\"", whereYouSeeIt: "Email Security page — suspicious email list" },
  "malware": { example: "\"Malware was found on John's laptop — it was recording keystrokes and sending them to an attacker.\"", whereYouSeeIt: "Endpoint Security — harmful software tab" },
  "ransomware": { example: "\"Ransomware encrypted all files on the accounting server and demands $50,000 in Bitcoin.\"", whereYouSeeIt: "Alerts page — critical severity alerts" },
  "brute force": { example: "\"Someone tried 5,000 different passwords on the admin account in 10 minutes.\"", whereYouSeeIt: "YubiKey Security — failed authentication panel" },
  "zero-day": { example: "\"A zero-day vulnerability in your email software was exploited before a fix was available.\"", whereYouSeeIt: "Alerts page — high-severity vulnerability alerts" },
  "EDR": { example: "\"EDR on Sarah's workstation detected and quarantined a suspicious file.\"", whereYouSeeIt: "Endpoint Security page — device protection status" },
  "SIEM": { example: "\"The SIEM correlated login failures across 5 servers and identified a coordinated attack.\"", whereYouSeeIt: "Monitoring page — system health overview" },
  "MFA": { example: "\"MFA prevented an attacker who had stolen a password from logging in — they didn't have the phone code.\"", whereYouSeeIt: "YubiKey Security page — authentication policies" },
  "VPN": { example: "\"Remote employees connect through VPN so their internet traffic is encrypted and private.\"", whereYouSeeIt: "Network Security — secure access section" },
  "Tailscale": { example: "\"All 5 team members are connected via Tailscale — their devices form an encrypted mesh network.\"", whereYouSeeIt: "Network Security — secure access tab, showing Tailscale node status and DERP relays" },
  "DERP relay": { example: "\"Traffic is routed through DERP nyc because the two devices couldn't establish a direct connection.\"", whereYouSeeIt: "Network Security — secure access tab, Tailscale relay column" },
  "firewall": { example: "\"The firewall blocked 150 connection attempts from a known malicious IP address today.\"", whereYouSeeIt: "Network Security — firewall activity tab" },
  "endpoint": { example: "\"3 out of 50 endpoints are missing the latest security update.\"", whereYouSeeIt: "Endpoint Security page — device overview" },
  "vulnerability": { example: "\"A vulnerability in the web server software could let attackers view private files.\"", whereYouSeeIt: "Alerts page — vulnerability alerts" },
  "encryption": { example: "\"All customer data is encrypted — even if stolen, it appears as scrambled nonsense without the key.\"", whereYouSeeIt: "Dark Web Monitor — data exposure details" },
  "SPF": { example: "\"SPF check failed — this email claims to be from your CEO but was sent from an unrecognized server.\"", whereYouSeeIt: "Email Security — email verification section" },
  "DKIM": { example: "\"DKIM signature invalid — this email may have been tampered with in transit.\"", whereYouSeeIt: "Email Security — email verification section" },
  "DMARC": { example: "\"DMARC policy rejected 12 emails today that failed authentication checks.\"", whereYouSeeIt: "Email Security — email verification section" },
  "spoofing": { example: "\"An attacker spoofed the CFO's email address to request a wire transfer.\"", whereYouSeeIt: "Email Security — suspicious emails" },
  "BEC": { example: "\"A BEC scam impersonated the CEO and tricked accounting into wiring $25,000.\"", whereYouSeeIt: "Email Security — fake email campaigns" },
  "exfiltration": { example: "\"10GB of customer records were exfiltrated to an external server over 2 weeks.\"", whereYouSeeIt: "Dark Web Monitor / Threat Neutralization" },
  "quarantine": { example: "\"A suspicious attachment was quarantined — it won't open until security reviews it.\"", whereYouSeeIt: "Email Security — attachment safety" },
  "dark web": { example: "\"Your company email addresses were found for sale on a dark web marketplace.\"", whereYouSeeIt: "Dark Web Monitor page" },
  "YubiKey": { example: "\"Insert your YubiKey and tap it to verify your identity when logging in.\"", whereYouSeeIt: "YubiKey Security page" },
  "risk score": { example: "\"This transaction scored 0.85 (85% risk) — flagged as potentially fraudulent.\"", whereYouSeeIt: "Transactions & Approvals pages" },
  "compliance": { example: "\"Your organization is 92% compliant with required security standards.\"", whereYouSeeIt: "Monitoring page — compliance section" },
  "remediation": { example: "\"Auto-remediation patched 5 servers that were missing a critical security update.\"", whereYouSeeIt: "Alerts page — auto-remediate button" },
  "anomaly": { example: "\"Anomaly detected: Mike's account accessed payroll files at 2 AM from a new country.\"", whereYouSeeIt: "Endpoint Security — unusual activity" },
};

export default function Glossary() {
  const [search, setSearch] = useState("");

  const entries = Object.entries(JARGON_DICTIONARY)
    .sort(([a], [b]) => a.localeCompare(b))
    .filter(([term, definition]) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return term.toLowerCase().includes(q) || definition.toLowerCase().includes(q);
    });

  return (
    <div className="pb-12">
      <PageHeader
        title="Glossary & Learning Center"
        description="Browse security terms explained in plain English. Hover over any highlighted term on other pages to see its definition."
      />

      <div className="mb-6 glass-panel p-4 rounded-xl border border-primary/10">
        <div className="flex items-start gap-3">
          <Lightbulb className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm text-gray-300 leading-relaxed">
              <span className="text-white font-semibold">How to use this glossary:</span> Each card below explains a security term in everyday language. 
              Look for the <span className="text-primary">real-world example</span> to see how the term appears in actual alerts, 
              and <span className="text-blue-400">"Where you'll see this"</span> to know which page uses it. 
              On any page, hover over <span className="border-b border-dotted border-primary/40 text-primary/80">highlighted terms</span> to see their definition instantly.
            </p>
          </div>
        </div>
      </div>

      <div className="mb-8 glass-panel p-2 rounded-xl inline-flex items-center gap-2 w-full max-w-md">
        <Search className="w-4 h-4 text-muted-foreground ml-3" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search for a term..."
          className="flex-1 bg-transparent border-none text-sm text-white placeholder:text-muted-foreground/50 focus:outline-none py-2"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {entries.map(([term, definition], idx) => {
          const example = TERM_EXAMPLES[term];
          return (
            <motion.div
              key={term}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(idx * 0.02, 0.5) }}
              className="glass-panel p-5 rounded-xl border border-white/5 hover:border-primary/20 transition-colors"
            >
              <div className="flex items-center gap-2 mb-2">
                <BookOpen className="w-4 h-4 text-primary" />
                <h3 className="text-base font-display text-white uppercase tracking-wider">{term}</h3>
              </div>
              <p className="text-sm text-gray-300 leading-relaxed mb-3">{definition}</p>
              
              {example && (
                <div className="space-y-2">
                  <div className="p-2.5 rounded-lg bg-primary/5 border border-primary/10">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Lightbulb className="w-3 h-3 text-primary" />
                      <span className="text-[10px] font-display uppercase tracking-widest text-primary">Real-World Example</span>
                    </div>
                    <p className="text-xs text-gray-400 italic leading-relaxed">{example.example}</p>
                  </div>
                  <div className="flex items-center gap-1.5 px-1">
                    <Eye className="w-3 h-3 text-blue-400" />
                    <span className="text-[10px] text-blue-400">Where you'll see this:</span>
                    <span className="text-[10px] text-muted-foreground">{example.whereYouSeeIt}</span>
                  </div>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {entries.length === 0 && (
        <div className="py-16 text-center glass-panel rounded-2xl border-dashed border-2 border-white/5">
          <BookOpen className="w-12 h-12 text-primary mx-auto mb-4 opacity-50" />
          <p className="text-muted-foreground">No terms found matching "{search}"</p>
        </div>
      )}
    </div>
  );
}
