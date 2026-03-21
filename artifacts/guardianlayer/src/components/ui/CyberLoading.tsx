import { motion } from "framer-motion";
import { Shield } from "lucide-react";

const PLAIN_TEXT: Record<string, string> = {
  "AGGREGATING TELEMETRY...": "Loading your security overview...",
  "SCANNING THREAT MATRIX...": "Checking for active threats...",
  "SCANNING RECOVERY STATUS...": "Loading recovery progress...",
  "SCANNING ALERT LOGS...": "Loading security alerts...",
  "SCANNING DARK WEB FEEDS...": "Checking for exposed data...",
  "RETRIEVING EXPOSURE DATA...": "Loading exposure details...",
  "LOADING RECOVERY ACTIONS...": "Loading your recovery steps...",
  "SCANNING EMAIL GATEWAY...": "Checking your email security...",
  "QUERYING DNS RECORDS...": "Checking email authentication...",
  "ANALYZING THREATS...": "Loading threat details...",
  "SCANNING ENDPOINT FLEET...": "Checking your devices...",
  "LOADING DEVICES...": "Loading device list...",
  "SCANNING FOR MALWARE...": "Checking for harmful software...",
  "SCANNING NETWORK PERIMETER...": "Checking network security...",
  "LOADING EVENTS...": "Loading security events...",
  "SCANNING FOR INTRUSIONS...": "Checking for break-in attempts...",
  "SCANNING YUBIKEY FLEET...": "Checking your security keys...",
  "LOADING ENROLLMENT REQUESTS...": "Loading key requests...",
  "ANALYZING FAILED AUTHENTICATIONS...": "Reviewing failed login attempts...",
  "SCANNING CONTRACTS...": "Loading contract analysis...",
  "LOADING CONTRACTS...": "Loading contract details...",
  "SCANNING SUBSYSTEMS...": "Checking system health...",
  "PINGING EXTERNAL NODES...": "Checking connected services...",
  "FETCHING HELD PAYLOADS...": "Loading items awaiting your review...",
  "QUERYING LEDGER DATABASE...": "Loading transaction history...",
  "INITIALIZING SECURE UPLINK...": "Getting everything ready...",
  "LOADING AUDIT TRAIL...": "Loading activity history...",
  "ANALYZING THREAT VECTORS...": "Analyzing threat patterns...",
  "COMPUTING THROUGHPUT METRICS...": "Calculating traffic volume...",
  "ANALYZING DNS QUERIES...": "Checking website safety...",
  "VERIFYING ZERO-TRUST POLICIES...": "Checking Tailscale ACL policies...",
  "ANALYZING FIREWALL RULES...": "Reviewing firewall settings...",
  "CHECKING SYSTEM HEALTH...": "Checking system health...",
  "SCANNING API ENDPOINTS...": "Checking application security...",
  "MONITORING USER SESSIONS...": "Reviewing active sessions...",
  "SCANNING CONFIGURATION DRIFT...": "Checking for configuration changes...",
  "LOADING MFA POLICIES...": "Loading login security policies...",
  "LOADING AUDIT LOG...": "Loading security key activity...",
  "LOADING INCIDENT DATA...": "Loading incident reports...",
  "LOADING MFA COMPLIANCE...": "Checking login security compliance...",
  "SCANNING FOR ANOMALIES...": "Checking for unusual activity...",
  "CHECKING PATCH STATUS...": "Checking for software updates...",
  "ANALYZING BEHAVIOR PATTERNS...": "Reviewing device behavior...",
  "SCANNING USB DEVICES...": "Checking connected USB devices...",
};

export function CyberLoading({ text = "INITIALIZING SECURE UPLINK..." }: { text?: string }) {
  const plainText = PLAIN_TEXT[text] || text;

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] w-full p-8">
      <div className="relative">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
          className="absolute -inset-4 border-2 border-dashed border-primary/30 rounded-full"
        />
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          className="absolute -inset-8 border border-secondary/20 rounded-full"
        />
        <Shield className="w-12 h-12 text-primary animate-pulse-glow" />
      </div>
      <motion.p 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ repeat: Infinity, duration: 1, repeatType: "reverse" }}
        className="mt-8 font-mono text-sm tracking-widest text-primary"
      >
        {plainText}
      </motion.p>
    </div>
  );
}
