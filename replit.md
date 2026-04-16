# GuardianLayer Enterprise

## Overview

GuardianLayer Enterprise is a comprehensive security platform designed for real-time transaction risk scoring, fraud detection, and robust security management across enterprise applications. Its primary purpose is to enhance application security postures, streamline threat response, and ensure continuous compliance with regulatory standards. The platform offers a unified dashboard for monitoring security domains, augmented by AI-powered threat intelligence and compliance reporting, ultimately protecting business operations and data integrity.

## User Preferences

I prefer detailed explanations and iterative development. Ask before making major architectural changes or introducing new dependencies.

## System Architecture

The project is built as a pnpm monorepo using TypeScript. The frontend uses React, Vite, Tailwind CSS, and Recharts. The backend API uses Express 5, connecting to a PostgreSQL database via Drizzle ORM. Zod provides schema validation, and Orval automates type-safe API client code generation from an OpenAPI specification.

**Core Architectural Decisions and Features:**

*   **User Interface & Experience (UI/UX):** Focuses on simplifying complex security concepts through "Plain English Overhaul" of UI text, severity labels, Executive Summary panels, a searchable Glossary, QuickHelp buttons, and JargonTooltips.
*   **Centralized Monitoring & Management:** Includes a Command Center Dashboard, Transaction Ledger with ML-driven risk analysis, and Security Advisories.
*   **Domain-Specific Security Modules:** Covers Email, Endpoint, Network, and YubiKey & Hardware MFA security.
*   **OpenClaw Monitor:** Provides AI contract monitoring, UI Health Monitor, API Security Scanner, User Session Monitor, Configuration Drift Detector, URL Bookmarks, and Breach Alerts.
*   **Breach Incident Dashboard:** A dedicated page `/breach-response` for real-time breach status, anomaly stats, IP activity tracking, incident timelines, and report generation.
*   **Automated Lockdown Triggers:** Anomaly engine activates emergency lockdown based on configurable thresholds.
*   **API Gateway & Event Bus:** A centralized API gateway at `/api-gateway` with a 5-tab UI and an in-process event bus for inter-service communication, persisting events to PostgreSQL.
*   **Security Settings Monitor:** A PIN-protected page (`/security-settings`) for tracking security settings baselines, with quick-add presets, inline editing, and change history.
*   **DAST Self-Scanner:** A dynamic application security testing page (`/self-scanner`) that probes GuardianLayer's own API for security vulnerabilities.
*   **Domain Breach Monitor:** A page (`/domain-monitor`) for tracking domain-level breaches, scanning emails against Have I Been Pwned, with automated background scanning and NameSilo integration.
*   **Secure Vault:** A PIN-protected encrypted storage page (`/secure-vault`) for sensitive data, supporting 5 entry types with AES-256-GCM encryption, audit logging, and breach response instructions.
*   **Security Agent:** An AI-powered floating security posture monitor providing real-time audits and a scored report.
*   **Multi-Channel Alert System:** Enterprise alert management at `/alert-center` with configurable preferences.
*   **System Monitoring:** Comprehensive monitoring of system health, activity logs, threat intelligence, throughput, and multi-framework compliance reporting.
*   **Dark Web Monitor:** Tracks compromised data with a Recovery Playbook.
*   **Recovery Center:** A full asset & data recovery system with a dashboard and step-by-step workflows.
*   **Threat Neutralization:** An active threat containment system with summary stats and expandable threat cards offering isolation actions.
*   **Virus & Malware Scanner:** A VirusTotal-powered scanning page (`/virus-scanner`) for URLs, file hashes, IP addresses, and domains.
*   **Travel Security:** An interactive travel security checklist page (`/travel-security`).
*   **Disaster Recovery:** Enterprise-grade DR planning with a dashboard and audit capabilities.
*   **Backup Center:** Automated iDrive-style backup system with dual-redundancy storage.
*   **Emergency Lockdown:** A global "big red button" for coordinated containment across all security domains.
*   **AI Threat Analyzer:** An LLM-powered threat analysis chat using OpenAI for real-time analysis and remediation.
*   **AI Threat Evaluator:** A context-aware threat evaluation system integrated into the Dashboard.
*   **Google Workspace Monitor:** Scans Gmail and Google Drive for security threats.
*   **Threat Intelligence Hub:** Integrates 5 external security intelligence APIs.
*   **Threat Detection Engine:** A unified threat detection dashboard (`/threat-detection`) with real-time threat correlation, failed login auto-lockout, network traffic anomaly detection, and IP reputation checking.
*   **Security Hardening Middleware:** A three-layer request protection stack including Helmet, rate limiting, and IP Guard.
*   **JWT Authentication & User Management:** Database-backed authentication with role-based access control (superadmin/admin/user) and FIDO2/WebAuthn YubiKey authentication.
*   **MedInvest Login (OAuth Integration):** MedInvest identity verification login via the external service at `did-login.replit.app` using OAuth 2.0. Uses `MEDINVEST_CLIENT_ID`, `MEDINVEST_CLIENT_SECRET`, `MEDINVEST_BASE_URL`, `MEDINVEST_REDIRECT_URI` env vars. Routes at `/api/auth/medinvest/initiate` and `/api/auth/medinvest/callback` with legacy `/api/auth/did/*` redirects.
*   **Firebase Authentication:** Social sign-in via Firebase with Google, GitHub, Facebook, and Apple providers. Frontend uses `firebase` SDK with popup-based auth; backend uses `firebase-admin` to verify ID tokens and auto-provisions user accounts. Requires `VITE_FIREBASE_*` env vars (frontend) and `FIREBASE_PROJECT_ID`/`FIREBASE_CLIENT_EMAIL`/`FIREBASE_PRIVATE_KEY` (backend). Social buttons only appear when configured.
*   **VIENT Workflow Monitor:** A dedicated security posture and uptime monitoring page (`/vient-monitor`) for `ent-workflow-ai.replit.app`, including comprehensive scans and security scoring.
*   **Node Diagnostics:** A comprehensive remote system health analysis and optimization page (`/node-diagnostics`) via SSH.
*   **YubiKey App Coverage Tracker:** Tracks hardware key protection enablement across applications.
*   **Remote System Maintenance:** SSH-over-Tailscale remote machine management page (`/remote-maintenance`) for cleanup, optimization, and security tasks. Includes "Run All Machines" panel to execute any maintenance task across all registered machines in parallel batches of 5, with aggregated results, expand/collapse per-machine output, and copy-all functionality. Run All requires superadmin role.
*   **Credit Protection:** An interactive credit protection checklist page (`/credit-protection`) covering freezes, fraud alerts, and account security.
*   **App Fleet Monitor:** A portfolio-wide uptime and health monitoring page (`/app-fleet`) tracking 40+ apps.
*   **Aperture AI Gateway Monitor:** A management page (`/aperture`) for Tailscale Aperture, centralizing AI API keys and tracking usage.
*   **DevOps Control Plane:** A full app lifecycle management page (`/devops`) with application, agent, backup, notification, and incident management.
*   **EDR (Endpoint Detection & Response):** Real-time endpoint threat monitoring page (`/edr`) with agent status, threat investigation, and automated responses (frontend-only).
*   **SIEM (Log & Event Management):** Centralized security event correlation page (`/siem`) with live streaming, filtering, and search (frontend-only).
*   **Vulnerability Scanner:** Infrastructure vulnerability assessment page (`/vulnerability-scanner`) with CVE tracking and CVSS scoring (frontend-only).
*   **Password Manager:** 1Password-integrated credential management page (`/password-manager`) with strength auditing and MFA compliance tracking (frontend-only).
*   **DNS Filtering:** Network-level domain filtering page (`/dns-filtering`) with block/allow rules and query statistics (frontend-only).
*   **Email Security Gateway:** Advanced email filtering page (`/email-gateway`) with phishing/malware/spam detection and threat scoring (frontend-only).
*   **Backup Solution:** Automated offsite backup management page (`/backup-solution`) with Backblaze B2 and Veeam integration (frontend-only).
*   **MDM (Mobile Device Management):** Company device enrollment and compliance page (`/mdm`) with device inventory and remote management (frontend-only).

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
*   **Google Workspace:** Google API integrations (Gmail, Drive)
*   **Authentication SDKs:** Firebase (firebase, firebase-admin)
*   **Third-Party Integrations:** Stripe, Plaid, Cloudflare, Twilio, Google Workspace Protection, NameSilo, VirusTotal, AbuseIPDB, Shodan, Have I Been Pwned, SSL Labs, Tailscale Aperture, 1Password, Backblaze B2, Veeam, CrowdStrike, SentinelOne.