# GuardianLayer Enterprise

## Overview

GuardianLayer Enterprise is a comprehensive security platform designed for real-time transaction risk scoring, fraud detection, and robust security management across enterprise applications. Its primary purpose is to enhance application security postures, streamline threat response, and ensure continuous compliance with regulatory standards. The platform offers a unified dashboard for monitoring security domains, augmented by AI-powered threat intelligence and compliance reporting, ultimately protecting business operations and data integrity.

## User Preferences

I prefer detailed explanations and iterative development. Ask before making major architectural changes or introducing new dependencies.

## System Architecture

The project is built as a pnpm monorepo using TypeScript. The frontend uses React, Vite, Tailwind CSS, and Recharts. The backend API uses Express 5, connecting to a PostgreSQL database via Drizzle ORM. Zod provides schema validation, and Orval automates type-safe API client code generation from an OpenAPI specification.

**Core Architectural Decisions and Features:**

*   **User Interface & Experience (UI/UX):** Focuses on simplifying complex security concepts through "Plain English Overhaul" of UI text, severity labels, Executive Summary panels, a searchable Glossary, QuickHelp buttons, and JargonTooltips. All pages include plain-language explanations (WhyThisMatters, ExecutiveSummary, or inline explainers). ThreatIntel tabs are renamed to plain English (Malware Scanner, IP Reputation, Port Scanner, Data Breach Check, SSL Certificate Check).
*   **Centralized Monitoring & Management:** Includes a Command Center Dashboard for security posture, a Transaction Ledger with ML-driven risk analysis, and Security Advisories for actionable alerts.
*   **Domain-Specific Security Modules:**
    *   **Email Security:** AI-powered threat detection, Auth Monitor (SPF/DKIM/DMARC), Compromise Detector, and Phishing Campaign tracking.
    *   **Endpoint Security:** Device Fleet management, AI-driven Malware Detection, Patch Compliance, Behavioral Analytics, and USB Monitor.
    *   **Network Security:** Events Monitor, AI-powered Intrusion Detection, DNS Security, VPN & Zero-Trust management, and Firewall Analyzer.
    *   **YubiKey & Hardware MFA:** Fleet Manager, Audit Log, Enrollment lifecycle, Failed Auth analysis, Policy enforcement, Lost/Stolen Key Response, MFA Compliance Dashboard, and Anomaly Detector.
*   **OpenClaw Monitor:** Provides AI contract monitoring, UI Health Monitor, API Security Scanner, User Session Monitor, Configuration Drift Detector, URL Bookmarks, and Breach Alerts for post-breach monitoring.
*   **Breach Incident Dashboard:** A dedicated page `/breach-response` for real-time breach status, anomaly stats, IP activity tracking, and incident timelines. Includes **Incident Report Generator** with downloadable security incident report and pre-written letters for FBI/IC3, FTC, local police, bank fraud department, and credit bureaus. Component: `IncidentReportGenerator.tsx`.
*   **Automated Lockdown Triggers:** An anomaly engine (`artifacts/api-server/src/lib/anomaly-engine.ts`) activates emergency lockdown based on configurable thresholds.
*   **API Gateway & Event Bus:** A centralized API gateway at `/api-gateway` with a 5-tab UI (Endpoints, API Keys, Gateway Status, Event Stream, Publish Event) and an in-process event bus for inter-service communication, persisting events to PostgreSQL. Includes API key management (create, list, revoke) with SHA-256 hashed key storage in `api_keys` table, masked prefix display, scope/expiry controls, and usage examples.
*   **Sidebar Navigation:** Collapsible dropdown groups (Security, Threats & Response, Recovery, Operations, Developer) with auto-expansion of active route's parent group. Lockdown and Dashboard always visible at top.
*   **Security Agent:** An AI-powered floating security posture monitor accessible from any page, providing real-time audits and a scored report.
*   **Multi-Channel Alert System:** Enterprise alert management at `/alert-center` with configurable preferences and delivery via In-App, Browser Push, Email (Gmail), and Alert Sounds.
*   **External Linkages:** Manages integration statuses with third-party services.
*   **System Monitoring:** Comprehensive monitoring of system health, activity logs, threat intelligence, throughput, and multi-framework compliance reporting (SOC 2, GDPR, PCI DSS, ISO 27001, HIPAA).
*   **Dark Web Monitor:** Tracks compromised data with Recovery Playbook — detailed step-by-step recovery workflows for each exposure type (SSN, Financial, Email, Credentials, Phone). Each action has numbered instructions with real URLs/phone numbers, estimated times, urgency badges, progress tracking, and **unlock/unfreeze criteria** showing when it's safe to reverse protective actions. Dynamic marketplace name injection. Component: `RecoveryPlaybook.tsx`.
*   **Recovery Center:** A full asset & data recovery system with a dashboard and step-by-step workflows.
*   **Threat Neutralization:** An active threat containment system with summary stats and expandable threat cards offering isolation actions.
*   **Disaster Recovery:** Enterprise-grade DR planning with a dashboard, recovery procedures, and audit capabilities.
*   **Backup Center:** Automated iDrive-style backup system with dual-redundancy storage for database, source code, and package manifests.
*   **Emergency Lockdown:** A global "big red button" for coordinated containment across all security domains, including session controls and auto-lockdown configuration.
*   **AI Threat Analyzer:** An LLM-powered threat analysis chat using OpenAI (gpt-4o-mini) for real-time analysis and remediation steps.
*   **AI Threat Evaluator:** A context-aware threat evaluation system integrated into the Dashboard, offering AI analysis for threats, elimination plans, and government agency reporting guides.
*   **Google Workspace Monitor:** Scans Gmail and Google Drive for security threats using Google API integrations.
*   **Threat Intelligence Hub:** Integrates 5 external security intelligence APIs: VirusTotal, AbuseIPDB, Shodan, Have I Been Pwned, and SSL Labs.
*   **Security Hardening Middleware:** A three-layer request protection stack including Helmet for security headers, rate limiting (global, auth, threat-intel, AI analysis), and IP Guard for automatic IP blocking based on request patterns. Anomaly Detection Engine for real-time threat detection and Prometheus Metrics for system monitoring. All external API calls use 15-second abort timeouts, response status validation, and payload field validation.

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
*   **Google Workspace:** google-mail, google-drive integrations
*   **Third-Party Integrations:** Stripe, Plaid, Cloudflare, Gmail, Twilio, Google Workspace Protection
*   **Threat Intelligence APIs:** VirusTotal, AbuseIPDB, Shodan, Have I Been Pwned, SSL Labs