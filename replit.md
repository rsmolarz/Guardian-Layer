# GuardianLayer Enterprise

## Overview

GuardianLayer Enterprise is a security platform for apps that provides real-time transaction risk scoring and fraud detection. Built as a pnpm workspace monorepo using TypeScript.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite + Tailwind CSS + Recharts
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   ├── api-server/         # Express API server
│   └── guardianlayer/      # React frontend (GuardianLayer dashboard)
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts
├── pnpm-workspace.yaml     # pnpm workspace config
├── tsconfig.base.json      # Shared TS options
├── tsconfig.json           # Root TS project references
└── package.json            # Root package
```

## Features

1. **Dashboard (Command Center)** - Real-time overview with stats (total transactions, blocked, held, allowed, avg risk score, active integrations). Includes:
   - **AI Risk Assistant** - Floating chat widget with contextual responses about threats, risk trends, compliance, phishing, endpoints, and network security
   - **Threat Correlation Engine** - Multi-source attack pattern correlations with confidence scores, linking events across Email Gateway, Network IDS, Endpoint EDR, Auth Monitor
   - **Real-Time Threat Intel Feed** - Live scrolling feed of security events with severity indicators, timestamps, and source labels
   - **7-Day Risk & Volume Topology** - Area chart showing risk scores and transaction volume over time
2. **Transaction Ledger** - Lists all transactions with filtering by status (ALLOWED, HELD, BLOCKED, APPROVED, REJECTED). Includes "Scan Payload" button for submitting new transactions for ML risk analysis
3. **Manual Override Queue (Approvals)** - Shows HELD transactions for manual review with Approve/Reject actions
4. **Security Advisories (Alerts)** - Security alerts with severity levels (low, medium, high, critical), dismiss functionality, and **auto-remediate buttons** that execute predefined remediation actions per alert type with animated status transitions
5. **Email Security** - Five-tab page:
   - **Threat Scanner** - AI-powered email threat detection with phishing detection dashboard, suspicious email list, sender reputation scoring, attachment scanning results, quarantine/release actions, and email stats overview
   - **Auth Monitor** - SPF, DKIM, DMARC record monitoring for connected domains with pass/fail/warning status, DNS record display, key length analysis, policy enforcement tracking, and actionable recommendations
   - **Attachment Analyzer** - AI-powered analysis of email attachments with threat scoring, sandbox execution results (malware family detection, network connections, files dropped, registry changes), file hash display, and status filtering (blocked/quarantined/clean)
   - **Compromise Detector** - Email account compromise detection monitoring unusual login patterns (impossible travel, new devices, unusual hours), forwarding rule changes, mass deletion events, OAuth grants, bulk downloads, and delegate access changes with per-account risk scoring and event timelines
   - **Phishing Campaigns** - Active phishing campaign tracker with lookalike domain detection, spoofed sender address tracking, attack technique classification, sample subject lines, campaign status filtering (active/monitoring/neutralized), and click rate metrics
6. **Endpoint Security** - Five-tab page:
   - **Device Fleet** - Device inventory with compliance status, vulnerability scanning, patch management, EDR alerts, device risk scoring, encryption/firewall/antivirus flags
   - **Malware Detection** - Real-time AI scan results per device with quarantined files, detected malware signatures, behavior anomaly detection (process injection, crypto mining, data exfiltration, webshell activity, privilege escalation), file hashes, and risk scoring
   - **Patch Compliance** - Track missing OS and software patches per device with CVE IDs, CVSS scores, severity levels, days overdue, auto-update status, last reboot dates, and compliance filtering
   - **Behavioral Analytics** - AI behavioral baseline per device tracking deviations: unusual process execution, privilege escalation, lateral movement, data staging/exfiltration, off-hours activity, persistence; shows confidence scores, baseline vs current frequency, and per-device deviation percentages
   - **USB Monitor** - Track all USB device insertions across fleet with vendor/product IDs, serial numbers, authorization status, data transfer tracking, files accessed counts, policy violation detection (NO_REMOVABLE_MEDIA, DATA_EXFILTRATION, BADUSB_ATTACK, SERVER_USB_PROHIBITED, UNAUTHORIZED_NETWORK), and status filtering (blocked/exfiltration/flagged/allowed)
7. **Network Security** - Five-tab page:
   - **Events Monitor** - Real-time network monitoring with firewall events, IDS/IPS alerts, traffic anomaly detection, port scanning detection, DDoS monitoring, and attack source country mapping
   - **Intrusion Detection** - AI-powered IDS showing 8 detected intrusion attempts across 6 attack categories (web attack, brute force, malware C2, exfiltration, reconnaissance, zero-day) with attack signatures, signature IDs, source/destination IPs, payload inspection, matched OWASP/ET rules, confidence scores, packets inspected, sessions affected, related CVEs, and severity filtering
   - **DNS Security** - Monitor DNS queries for malicious domains, DNS tunneling, fast-flux domains, C2 beacons, DGA domains, suspicious nameservers with resolved IPs, TTL analysis, query counts, threat intel sources, IOC tags, confidence scores, and threat type filtering
   - **VPN & Zero-Trust** - Active VPN sessions with WireGuard/OpenVPN/IPSec protocols, zero-trust policy compliance per user (device posture, MFA, OS patches, geo-location, DLP), trust scores, geo-anomaly detection (impossible travel with distance/time analysis), bandwidth tracking, session risk levels, and compliance filtering
   - **Firewall Analyzer** - AI analysis of 8 firewall rules across 7 categories (web services, misconfiguration, access control, shadow IT, baseline, malicious, legacy) with per-rule risk levels, detected issues (overly permissive, stale rules, insecure protocols, shadow IT, crypto mining, brute force risk, lateral movement), AI analysis descriptions, actionable recommendations, hit counts, creation dates, and risk-level filtering
8. **YubiKey & Hardware MFA** - Five-tab hardware security key management page:
   - **Key Inventory** - Device fleet with serial numbers, models, firmware versions, assigned users, departments, auth success/fail counts, protocol support, status filtering (active/suspended/revoked/unassigned)
   - **Auth Events** - Real-time authentication event stream with success/failure/enrollment/revocation tracking, user details, key serials, locations, IP addresses, protocol info, and event type filtering
   - **Enrollment** - Key provisioning lifecycle with 6 enrollment requests across 5 statuses (pending/approved/shipped/completed/rejected), justifications, approvers, shipping addresses, tracking numbers, activation dates, rejection reasons, and priority levels
   - **Failed Auth** - 5 failure incidents with risk analysis: brute force detection (47 automated OTP attempts from Moscow), HMAC mismatch/counter desync patterns, rate limiting on CI pipelines, protocol mismatches, account lockout tracking, source IP/geo analysis, failure breakdowns with counts, and remediation recommendations
   - **Policies** - 5 MFA policies with compliance tracking: Hardware MFA Required (org-wide), Account Lockout (10 fails/24h, 5 fails/1h), Privileged Access Dual Key (admin users), Key Lifecycle Management (annual re-attestation), Contractor Temporary Keys (90-day expiry); overall 83.1% compliance rate, enforcement levels, rule listings, compliance progress bars
9. **OpenClaw Monitor** - AI contract monitoring with clause risk analysis, compliance tracking, anomaly detection, document scanning, and regulatory alerts
10. **External Linkages (Integrations)** - Shows status of connected services (Stripe, Plaid, Cloudflare, Gmail, Twilio, Google Workspace Protection) plus pending integrations with configuration UI
11. **System Monitoring** - Five-tab monitoring page:
    - **System Health** - Overall status, 6 metrics, service health matrix
    - **Activity Log** - Filterable audit trail by category and severity
    - **Threat Intel** - Geographic threat map, risk score distribution, threat categories
    - **Throughput** - Transaction volume summary and time-series chart
    - **Compliance Report** - Multi-framework compliance tracking (SOC 2 Type II, GDPR, PCI DSS v4.0, ISO 27001, HIPAA) with control counts, scores, audit dates, progress bars, and expandable findings
12. **Dark Web Monitor** - Two-tab page tracking compromised personal data with exposures list and recovery center

## Database Schema

- **transactions** - Stores all transactions with source, destination, amount, currency, risk_score, status, category, ip_address, country
- **alerts** - Security alerts with title, message, severity, dismissed status
- **activity_logs** - Audit trail of system activity
- **dark_web_exposures** - Dark web exposure records
- **recovery_actions** - Recovery action checklists linked to exposures
- **email_threats** - Email threat detection records with sender, recipient, threat type, risk score, attachment scanning, quarantine status
- **endpoints** - Endpoint device inventory with hostname, OS, compliance status, vulnerabilities, risk scores
- **network_events** - Network security events with firewall, IDS/IPS, anomaly detection data
- **yubikey_devices** - YubiKey hardware key inventory and status
- **yubikey_auth_events** - YubiKey authentication event logs
- **openclaw_contracts** - Contract monitoring with clause risk analysis and compliance tracking

## ML Risk Scoring

The risk scoring engine evaluates transactions based on:
- Transaction amount (>$10k = high risk, >$5k = elevated)
- Country of origin (known high-risk regions: NG, RU, CN, IR, KP)
- Transaction category (crypto, gambling, wire_transfer = higher risk)
- Status assignment: BLOCKED (>0.7), HELD (>0.4), ALLOWED (<=0.4)

## API Endpoints

- `GET /api/healthz` - Health check
- `GET /api/transactions` - List transactions (filterable by status)
- `POST /api/transactions/scan` - Scan new transaction for risk
- `GET /api/transactions/:id` - Get transaction details
- `POST /api/approvals/:id/approve` - Approve held transaction
- `POST /api/approvals/:id/reject` - Reject held transaction
- `GET /api/dashboard/stats` - Dashboard statistics
- `GET /api/dashboard/risk-timeline` - Risk timeline data
- `GET /api/alerts` - List alerts (filterable by severity)
- `POST /api/alerts/:id/dismiss` - Dismiss an alert
- `GET /api/integrations` - List integration statuses
- `GET /api/integrations/google-workspace/status` - Live Google Workspace service connection status
- `GET /api/monitoring/system-health` - Infrastructure health status
- `GET /api/monitoring/activity-log` - Activity audit trail
- `GET /api/monitoring/threat-map` - Geographic threat distribution
- `GET /api/monitoring/throughput` - Transaction throughput over time
- `GET /api/monitoring/risk-distribution` - Risk score distribution buckets
- `GET /api/monitoring/top-threats` - Top threat categories and sources
- `GET /api/dark-web/exposures` - List dark web exposures
- `GET /api/dark-web/exposures/:id` - Get exposure detail
- `GET /api/dark-web/recovery-actions` - List recovery actions
- `POST /api/dark-web/recovery-actions/:id/toggle` - Toggle recovery action completion
- `GET /api/dark-web/summary` - Dark web monitoring summary stats
- `GET /api/email-security` - List email threats
- `GET /api/email-security/stats` - Email security statistics
- `GET /api/email-security/auth-monitor` - SPF/DKIM/DMARC domain authentication status
- `GET /api/email-security/attachment-analysis` - AI attachment analysis with sandbox results
- `GET /api/email-security/account-compromise` - Account compromise detection with event timelines
- `GET /api/email-security/phishing-campaigns` - Phishing campaign tracker with lookalike domains
- `POST /api/email-security/:id/quarantine` - Quarantine email
- `POST /api/email-security/:id/release` - Release email
- `GET /api/endpoints` - List endpoints
- `GET /api/endpoints/stats` - Endpoint security statistics
- `GET /api/endpoints/malware-scans` - Malware detection scan results with quarantined files and anomalies
- `GET /api/endpoints/patch-compliance` - Patch compliance tracking with CVE scores and missing patches
- `GET /api/endpoints/behavioral-analytics` - AI behavioral analytics with deviation tracking per device
- `GET /api/endpoints/usb-monitor` - USB/removable media monitoring with policy violations and exfiltration tracking
- `GET /api/network` - List network events
- `GET /api/network/stats` - Network security statistics
- `GET /api/network/ids` - AI-powered intrusion detection with attack signatures and payload inspection
- `GET /api/network/dns-security` - DNS security monitoring with malicious domain detection and IOC tagging
- `GET /api/network/vpn-zerotrust` - VPN sessions and zero-trust policy compliance with geo-anomaly detection
- `GET /api/network/firewall-rules` - AI-powered firewall rule analysis with misconfigurations, shadow IT, and malicious rule detection
- `GET /api/yubikey/devices` - List YubiKey devices
- `GET /api/yubikey/auth-events` - List YubiKey auth events
- `GET /api/yubikey/stats` - YubiKey statistics
- `GET /api/yubikey/enrollment` - Key enrollment lifecycle with provisioning requests and approval tracking
- `GET /api/yubikey/failed-auth` - Failed authentication incidents with brute force detection and risk analysis
- `GET /api/yubikey/policies` - MFA policy configurations with compliance tracking and enforcement rules
- `GET /api/openclaw` - List OpenClaw contracts
- `GET /api/openclaw/stats` - OpenClaw statistics

## Key Commands

- `pnpm run typecheck` - Full typecheck
- `pnpm --filter @workspace/api-spec run codegen` - Generate API types
- `pnpm --filter @workspace/db run push` - Push DB schema changes
- `pnpm --filter @workspace/api-server run dev` - Start API server
- `pnpm --filter @workspace/guardianlayer run dev` - Start frontend
