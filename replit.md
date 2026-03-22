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
*   **JWT Authentication & User Management:** Database-backed authentication with role-based access control (superadmin/admin/user), enforced by middleware. Superadmin manages user CRUD operations, and self-registration is disabled.
*   **Remote System Maintenance:** SSH-over-Tailscale remote machine management page (`/remote-maintenance`) for running cleanup, optimization, and security tasks on registered machines. Features: machine registration with AES-256-GCM encrypted SSH credentials (password or key auth), connection testing with OS auto-detection (Linux/macOS/Windows), 12 maintenance tasks across 6 categories (Disk Cleanup: temp files, browser caches, old logs, trash; Network: DNS flush; Diagnostics: disk usage, system info; Updates: check/install; Performance: top processes, startup programs; Security: ports, firewall, SSH config audit). Commands are OS-specific and run remotely via ssh2. Results stream back with copyable output. Job history tracked per machine. DB tables: `remote_machines`, `maintenance_jobs`. Backend: `remote-maintenance.ts`. Frontend: `RemoteMaintenance.tsx`.

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