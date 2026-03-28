# GuardianLayer Enterprise

## Overview

GuardianLayer Enterprise is a comprehensive security platform designed for real-time transaction risk scoring, fraud detection, and robust security management across enterprise applications. Its primary purpose is to enhance application security postures, streamline threat response, and ensure continuous compliance with regulatory standards. The platform offers a unified dashboard for monitoring security domains, augmented by AI-powered threat intelligence and compliance reporting, ultimately protecting business operations and data integrity.

## User Preferences

I prefer detailed explanations and iterative development. Ask before making major architectural changes or introducing new dependencies.

## System Architecture

The project is built as a pnpm monorepo using TypeScript. The frontend uses React, Vite, Tailwind CSS, and Recharts. The backend API uses Express 5, connecting to a PostgreSQL database via Drizzle ORM. Zod provides schema validation, and Orval automates type-safe API client code generation from an OpenAPI specification.

**Core Architectural Decisions and Features:**

*   **User Interface & Experience (UI/UX):** Focuses on simplifying complex security concepts through "Plain English Overhaul" of UI text, severity labels, Executive Summary panels, a searchable Glossary, QuickHelp buttons, and JargonTooltips. All pages include plain-language explanations. ThreatIntel tabs are renamed to plain English.
*   **Centralized Monitoring & Management:** Includes a Command Center Dashboard for security posture, a Transaction Ledger with ML-driven risk analysis, and Security Advisories for actionable alerts.
*   **Domain-Specific Security Modules:** Covers Email, Endpoint, Network, and YubiKey & Hardware MFA security with AI-powered detection and management features.
*   **OpenClaw Monitor:** Provides AI contract monitoring, UI Health Monitor, API Security Scanner, User Session Monitor, Configuration Drift Detector, URL Bookmarks, and Breach Alerts.
*   **Breach Incident Dashboard:** A dedicated page `/breach-response` for real-time breach status, anomaly stats, IP activity tracking, incident timelines, and an Incident Report Generator with pre-written letters for various authorities.
*   **Automated Lockdown Triggers:** An anomaly engine activates emergency lockdown based on configurable thresholds.
*   **API Gateway & Event Bus:** A centralized API gateway at `/api-gateway` with a 5-tab UI and an in-process event bus for inter-service communication, persisting events to PostgreSQL. Includes API key management.
*   **Sidebar Navigation:** Collapsible dropdown groups for Security, Threats & Response, Recovery, Operations, and Developer sections, with auto-expansion.
*   **Security Settings Monitor:** A PIN-protected page (`/security-settings`) for tracking security settings baselines across accounts, with quick-add presets, inline editing, change history, and verification timestamps.
*   **DAST Self-Scanner:** A dynamic application security testing page (`/self-scanner`) that probes GuardianLayer's own API for security vulnerabilities across 7 categories, providing a letter grade and score.
*   **Domain Breach Monitor:** A page (`/domain-monitor`) for tracking domain-level breaches, scanning emails against Have I Been Pwned, with automated background scanning, NameSilo integration for domain import, and monitoring of standalone emails.
*   **Secure Vault:** A PIN-protected encrypted storage page (`/secure-vault`) for sensitive financial data and credentials, supporting 5 entry types with AES-256-GCM encryption at rest, audit logging, and breach response instructions.
*   **Security Agent:** An AI-powered floating security posture monitor providing real-time audits and a scored report.
*   **Multi-Channel Alert System:** Enterprise alert management at `/alert-center` with configurable preferences and delivery via various channels.
*   **System Monitoring:** Comprehensive monitoring of system health, activity logs, threat intelligence, throughput, and multi-framework compliance reporting.
*   **Dark Web Monitor:** Tracks compromised data with a Recovery Playbook offering detailed, step-by-step recovery workflows for each exposure type.
*   **Recovery Center:** A full asset & data recovery system with a dashboard and step-by-step workflows.
*   **Threat Neutralization:** An active threat containment system with summary stats and expandable threat cards offering isolation actions.
*   **Virus & Malware Scanner:** A VirusTotal-powered scanning page (`/virus-scanner`) for checking URLs, file hashes, IP addresses, and domains against 70+ antivirus engines, providing verdicts and contextual metadata.
*   **Travel Security:** An interactive travel security checklist page (`/travel-security`) with items covering network safety, device security, authentication, and data protection across travel phases.
*   **Disaster Recovery:** Enterprise-grade DR planning with a dashboard, recovery procedures, and audit capabilities.
*   **Backup Center:** Automated iDrive-style backup system with dual-redundancy storage.
*   **Emergency Lockdown:** A global "big red button" for coordinated containment across all security domains.
*   **AI Threat Analyzer:** An LLM-powered threat analysis chat using OpenAI for real-time analysis and remediation steps.
*   **AI Threat Evaluator:** A context-aware threat evaluation system integrated into the Dashboard, offering AI analysis for threats, elimination plans, and government agency reporting guides.
*   **Google Workspace Monitor:** Scans Gmail and Google Drive for security threats.
*   **Threat Intelligence Hub:** Integrates 5 external security intelligence APIs.
*   **Threat Detection Engine:** A unified threat detection dashboard (`/threat-detection`) with real-time threat correlation, failed login auto-lockout, network traffic anomaly detection, and IP reputation checking.
*   **Security Hardening Middleware:** A three-layer request protection stack including Helmet, rate limiting, and IP Guard. Anomaly Detection Engine and Prometheus Metrics for monitoring. All external API calls use timeouts and validation.
*   **JWT Authentication & User Management:** Database-backed authentication with role-based access control (superadmin/admin/user), enforced by middleware. Superadmin manages user CRUD operations, and self-registration is disabled. Supports FIDO2/WebAuthn YubiKey authentication as a passwordless login alternative. Backend: `webauthn.ts` with registration/verification flows using `@simplewebauthn/server`. Frontend: Login page has "Sign In with YubiKey" button. DB table: `webauthn_credentials`. Challenge store is in-memory with 5-minute expiry.
*   **DID Login (OAuth Integration):** Decentralized Identity login via the external DID Login service at `did-login.replit.app`. Implements a standard OAuth 2.0 authorization code flow with a secure one-time code exchange pattern (JWT never exposed in URL query params). Backend: `did-auth.ts` with `/api/auth/did/initiate` (redirect to DID authorization), `/api/auth/did/callback` (code exchange with DID provider, user creation/lookup, JWT generation), `/api/auth/did/exchange` (one-time code-to-JWT exchange for frontend). Frontend: Login page has "Sign In with DID" button (purple, fingerprint icon). Uses `DID_CLIENT_ID` and `DID_CLIENT_SECRET` env vars. Auto-creates new user accounts on first DID login, linking by email.
*   **VIENT Workflow Monitor:** A dedicated security posture and uptime monitoring page (`/vient-monitor`) for the VIENT Workflow AI platform at `ent-workflow-ai.replit.app`. Runs comprehensive scans checking: uptime/status code/response time, SSL/TLS validity, 12 security headers (HSTS, CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, COOP/CORP/COEP, etc.), content analysis (SRI, CSP inline, server fingerprinting), and generates a security score (0-100) with letter grade (A-F). Produces actionable recommendations prioritized by severity (critical/high/medium/low). Backend: `vient-monitor.ts` with `/api/vient-monitor/status` (full scan), `/api/vient-monitor/headers` (raw header dump), `/api/vient-monitor/quick-check` (fast uptime ping). Frontend: `VientMonitor.tsx`. Sidebar: under Operations as "VIENT Workflow".
*   **Node Diagnostics:** A comprehensive remote system health analysis and optimization page (`/node-diagnostics`). Connects to registered machines (from Remote Maintenance) via SSH and runs 12 diagnostic checks across 5 categories: Compute (CPU, memory, swap), Storage (disk usage, I/O wait), Processes (top CPU consumers, zombie processes, open file descriptors), Network (connections, DNS resolution), and System (uptime, system info). Produces a health score (0-100) with overall status (healthy/warning/critical). Includes 10 one-click optimization actions: clear caches, temp files, journal logs, package cache, kill zombies, restart failed services, flush DNS, sync time, show memory hogs, disk I/O stats. Optimization actions require superadmin role. Error messages are sanitized to prevent internal detail leakage. Backend: `node-diagnostics.ts`. Frontend: `NodeDiagnostics.tsx`. Reuses SSH infrastructure and machine registry from Remote Maintenance.
*   **YubiKey App Coverage Tracker:** Tracks which apps/services across the portfolio have hardware key protection enabled. Seeded with 12 key services (Google Advanced Protection, GitHub, AWS, Cloudflare, Stripe, etc.). Backend: `yubikey-coverage.ts`. DB table: `yubikey_app_coverage`.
*   **Remote System Maintenance:** SSH-over-Tailscale remote machine management page (`/remote-maintenance`) for running cleanup, optimization, and security tasks on registered machines. Features: machine registration with AES-256-GCM encrypted SSH credentials (password or key auth), connection testing with OS auto-detection (Linux/macOS/Windows), 12 maintenance tasks across 6 categories (Disk Cleanup: temp files, browser caches, old logs, trash; Network: DNS flush; Diagnostics: disk usage, system info; Updates: check/install; Performance: top processes, startup programs; Security: ports, firewall, SSH config audit). Commands are OS-specific and run remotely via ssh2. Results stream back with copyable output. Job history tracked per machine. DB tables: `remote_machines`, `maintenance_jobs`. Backend: `remote-maintenance.ts`. Frontend: `RemoteMaintenance.tsx`.
*   **Credit Protection:** An interactive credit protection checklist page (`/credit-protection`) with 22 actionable steps across 3 phases (Set Up Now, Ongoing Protection, If You're Compromised). Covers credit freezes at all 5 bureaus (Equifax, Experian, TransUnion, Innovis, ChexSystems), NCTUE utility freeze, fraud alerts, IRS IP PIN, SSA account creation, prescreened offer opt-out, and bank/card alert setup. Features: letter grade scoring, progress tracking per phase, critical step warnings, direct action links to bureau portals, FAQ section, localStorage persistence. Backend: `credit-protection.ts`. Frontend: `CreditProtection.tsx`.
*   **App Fleet Monitor:** A portfolio-wide uptime and health monitoring page (`/app-fleet`) tracking 40+ apps across multiple categories. Features: bulk/individual health checks with response time and SSL status, HEAD→GET fallback for servers rejecting HEAD, SSRF protection blocking internal/private IPs, search and category/status filters, add/remove apps, summary cards showing online/offline/error counts. Color-coded category badges for 35+ categories. DB table: `monitored_urls`. Backend: `app-fleet.ts`. Frontend: `AppFleetMonitor.tsx`.
*   **Aperture AI Gateway Monitor:** A management page (`/aperture`) for Tailscale Aperture — centralizes AI API keys (OpenAI, Anthropic, Google Gemini, Groq, etc.) across the 28-app fleet. Tracks per-app AI provider usage, migration status (Not Started → In Progress → Routed), and coverage percentage. Features: provider distribution visualization, search/filter by status or provider, expandable app details with migration controls, link to Tailscale Aperture dashboard. DB table: `aperture_apps`. Backend: `aperture.ts`. Frontend: `ApertureMonitor.tsx`.
*   **DevOps Control Plane:** A full app lifecycle management page (`/devops`) translated from the user's Python FastAPI source. 5-tab UI: Applications (register/deploy/rollback/backup/start-stop/remove apps with expandable detail panels showing image, port, VPS host, container, repo, deployment history), Agents (CodeGuardian, UpgradeAgent, HealthCheck Monitor, DB Agent, etc. with enable/disable/run-now), Backups (policies and schedules), Notifications (Telegram/Twilio/Slack/Email/Webhook channels), Incident Log (filterable by level: info/warning/error/critical). Stat cards for total apps, deployments, incidents, agents. Seed data button for 12 apps + 8 agents. DB tables: `devops_apps`, `deployment_records`, `devops_backup_policies`, `devops_backup_records`, `agent_definitions`, `devops_incident_logs`, `notification_channels`. Backend: `devops.ts`. Frontend: `DevOpsControlPlane.tsx`.

## External Dependencies

*   **Monorepo Tool:** pnpm workspaces
*   **Frontend Framework:** React
*   **UI Libraries:** Tailwind CSS, Recharts
*   **Backend Framework:** Express 5
*   **Database:** PostgreSQL
*   **ORM:** Drizzle ORM
*   **Validation:** Zod
*   **API Code Generation:** Orval
*   **AI Integration:** OpenAI (gpt-4o-mini) via Replit AI Integrations proxy
*   **Google Workspace:** Google API integrations (gmail, drive)
*   **Third-Party Integrations:** Stripe, Plaid, Cloudflare, Gmail, Twilio, Google Workspace Protection, NameSilo
*   **Threat Intelligence APIs:** VirusTotal, AbuseIPDB, Shodan, Have I Been Pwned, SSL Labs