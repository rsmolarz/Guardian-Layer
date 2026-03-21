import { Router, type IRouter } from "express";

const router: IRouter = Router();

interface ChecklistItem {
  id: string;
  category: string;
  title: string;
  description: string;
  priority: "critical" | "high" | "medium" | "low";
  when: "before" | "during" | "after";
}

const TRAVEL_CHECKLIST: ChecklistItem[] = [
  {
    id: "vpn-active",
    category: "Network",
    title: "Activate Tailscale VPN",
    description: "Enable Tailscale on all devices before connecting to any public or hotel Wi-Fi. This encrypts all traffic through WireGuard tunnels regardless of the local network's security.",
    priority: "critical",
    when: "before",
  },
  {
    id: "mfa-verify",
    category: "Authentication",
    title: "Verify MFA on all accounts",
    description: "Confirm multi-factor authentication is enabled on email, cloud services, banking, and any admin accounts. Use hardware keys (YubiKey) or authenticator apps — never SMS-based 2FA while traveling.",
    priority: "critical",
    when: "before",
  },
  {
    id: "device-encryption",
    category: "Device",
    title: "Enable full-disk encryption",
    description: "Verify BitLocker (Windows), FileVault (macOS), or LUKS (Linux) is enabled on all laptops and drives. If your device is lost or stolen, encrypted data stays protected.",
    priority: "critical",
    when: "before",
  },
  {
    id: "firmware-update",
    category: "Device",
    title: "Update firmware and OS",
    description: "Install all pending OS, firmware, and browser updates before departing. Known vulnerabilities are frequently exploited on public networks.",
    priority: "high",
    when: "before",
  },
  {
    id: "backup-data",
    category: "Recovery",
    title: "Backup critical data",
    description: "Create encrypted backups of critical files and store them in a secure cloud location or separate encrypted drive that stays separate from your travel devices.",
    priority: "high",
    when: "before",
  },
  {
    id: "remove-sensitive",
    category: "Data",
    title: "Remove unnecessary sensitive data",
    description: "Delete or offload sensitive files, credentials, and databases that aren't needed during travel. Use the Secure Vault for anything you must carry.",
    priority: "high",
    when: "before",
  },
  {
    id: "travel-device",
    category: "Device",
    title: "Consider a travel-only device",
    description: "Use a clean laptop or phone with minimal data for travel instead of your primary workstation. This limits exposure if the device is compromised.",
    priority: "medium",
    when: "before",
  },
  {
    id: "disable-auto-connect",
    category: "Network",
    title: "Disable auto-connect Wi-Fi",
    description: "Turn off automatic Wi-Fi connections on all devices. Manually select networks and never connect to open/unencrypted networks without Tailscale active.",
    priority: "critical",
    when: "during",
  },
  {
    id: "disable-bluetooth",
    category: "Network",
    title: "Disable Bluetooth when not in use",
    description: "Turn off Bluetooth and AirDrop/Nearby Share in public spaces. These can be exploited for device tracking, data harvesting, or unauthorized pairing.",
    priority: "high",
    when: "during",
  },
  {
    id: "no-public-charging",
    category: "Device",
    title: "Avoid public USB charging stations",
    description: "Use your own charger and power outlet, or a USB data blocker. Public USB ports can inject malware ('juice jacking') into your device.",
    priority: "high",
    when: "during",
  },
  {
    id: "lock-screens",
    category: "Device",
    title: "Keep devices locked and supervised",
    description: "Set short auto-lock timers (30 seconds), use strong PINs/biometrics, and never leave devices unattended — even in hotel rooms (use the safe).",
    priority: "critical",
    when: "during",
  },
  {
    id: "verify-networks",
    category: "Network",
    title: "Verify network names with staff",
    description: "Confirm the exact Wi-Fi network name (SSID) with hotel/venue staff. Attackers create fake networks with similar names ('Evil Twin' attacks) to intercept traffic.",
    priority: "high",
    when: "during",
  },
  {
    id: "https-only",
    category: "Network",
    title: "Use HTTPS-only browsing",
    description: "Enable HTTPS-Only mode in your browser. Avoid entering credentials or sensitive data on any non-HTTPS site, especially on unfamiliar networks.",
    priority: "high",
    when: "during",
  },
  {
    id: "monitor-sessions",
    category: "Authentication",
    title: "Monitor active sessions",
    description: "Check active sessions on critical accounts (email, cloud, banking) daily while traveling. Revoke any sessions you don't recognize immediately.",
    priority: "high",
    when: "during",
  },
  {
    id: "privacy-screen",
    category: "Device",
    title: "Use a privacy screen filter",
    description: "Apply a privacy screen filter on your laptop to prevent 'shoulder surfing' — someone watching your screen in airports, cafes, or public transit.",
    priority: "medium",
    when: "during",
  },
  {
    id: "change-passwords",
    category: "Authentication",
    title: "Rotate passwords after return",
    description: "Change passwords for any accounts accessed during travel, especially if you used any network without Tailscale active at any point.",
    priority: "high",
    when: "after",
  },
  {
    id: "scan-devices",
    category: "Device",
    title: "Run full malware scan on all devices",
    description: "Perform a comprehensive antivirus/malware scan on all devices used during travel. Check for new software, unauthorized certificates, or unknown profiles.",
    priority: "critical",
    when: "after",
  },
  {
    id: "review-access-logs",
    category: "Authentication",
    title: "Review access logs and alerts",
    description: "Check GuardianLayer alerts, login histories, and access logs for any suspicious activity that occurred during your travel period.",
    priority: "high",
    when: "after",
  },
  {
    id: "revoke-temp-access",
    category: "Authentication",
    title: "Revoke temporary access grants",
    description: "If you granted any temporary access or shared credentials during travel, revoke them now. Rotate any API keys that were used on travel devices.",
    priority: "high",
    when: "after",
  },
  {
    id: "deauth-travel-device",
    category: "Device",
    title: "Wipe travel device if applicable",
    description: "If you used a travel-only device, factory reset it. If you used your primary device, clear browser data, remove any temporary VPN profiles, and check installed apps.",
    priority: "medium",
    when: "after",
  },
];

router.get("/travel-security/checklist", (_req, res) => {
  const before = TRAVEL_CHECKLIST.filter(i => i.when === "before");
  const during = TRAVEL_CHECKLIST.filter(i => i.when === "during");
  const after = TRAVEL_CHECKLIST.filter(i => i.when === "after");

  return res.json({
    totalItems: TRAVEL_CHECKLIST.length,
    phases: {
      before: { label: "Before You Leave", items: before },
      during: { label: "While Traveling", items: during },
      after: { label: "After You Return", items: after },
    },
  });
});

router.get("/travel-security/network-tips", (_req, res) => {
  return res.json({
    tips: [
      {
        title: "Hotel Wi-Fi",
        risk: "high",
        detail: "Hotel networks are shared among hundreds of guests and rarely segmented. MITM attacks are common. Always use Tailscale.",
        mitigation: "Connect Tailscale immediately. Verify SSID with front desk. Use HTTPS-only mode.",
      },
      {
        title: "Airport / Airline Wi-Fi",
        risk: "critical",
        detail: "Airports are prime targets for Evil Twin attacks. Free Wi-Fi may be a honeypot capturing credentials.",
        mitigation: "Use mobile hotspot if possible. If using airport Wi-Fi, activate Tailscale before opening any browser.",
      },
      {
        title: "Coffee Shop / Coworking",
        risk: "high",
        detail: "Open networks with no WPA encryption. ARP spoofing and packet sniffing are trivial on these networks.",
        mitigation: "Use Tailscale. Avoid financial transactions. Enable firewall. Disable file sharing.",
      },
      {
        title: "Mobile Hotspot (Your Phone)",
        risk: "low",
        detail: "Your own cellular data is encrypted between your device and the tower. This is the safest public option.",
        mitigation: "Set a strong hotspot password. Use WPA3 if available. Monitor connected devices.",
      },
      {
        title: "Conference / Event Wi-Fi",
        risk: "medium",
        detail: "Large events attract attackers. Networks may be better secured than hotels but are still shared with hundreds of unknown users.",
        mitigation: "Use Tailscale. Limit activity to non-sensitive browsing. Use a separate browser profile.",
      },
      {
        title: "International Networks",
        risk: "high",
        detail: "Some countries perform deep packet inspection (DPI) and may intercept or log traffic. DNS may be tampered with.",
        mitigation: "Use Tailscale with MagicDNS. Consider using DNS-over-HTTPS. Be aware of local surveillance laws.",
      },
    ],
  });
});

export default router;
