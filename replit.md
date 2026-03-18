# GuardianLayer Enterprise

## Overview

GuardianLayer Enterprise is a comprehensive security platform designed for real-time transaction risk scoring, fraud detection, and robust security management across enterprise applications. Its primary purpose is to enhance application security postures, streamline threat response, and ensure continuous compliance with regulatory standards. The platform offers a unified dashboard for monitoring security domains, augmented by AI-powered threat intelligence and compliance reporting, ultimately protecting business operations and data integrity.

## User Preferences

I prefer detailed explanations and iterative development. Ask before making major architectural changes or introducing new dependencies.

## System Architecture

The project is built as a pnpm monorepo using TypeScript for scalability and maintainability. The frontend, designed for a modern and responsive user experience, is developed with React, Vite, Tailwind CSS for styling, and Recharts for data visualization. The backend API uses Express 5, connecting to a PostgreSQL database via Drizzle ORM. Zod provides robust schema validation, and Orval automates type-safe API client code generation from an OpenAPI specification.

**Core Architectural Decisions and Features:**

*   **User Interface & Experience (UI/UX):** Focuses on simplifying complex security concepts for non-technical users through a "Plain English Overhaul" of UI text, severity labels ("Act Now," "Monitor"), Executive Summary panels, a searchable Glossary, QuickHelp buttons, and JargonTooltips.
*   **Centralized Monitoring & Management:**
    *   **Dashboard (Command Center):** High-level security posture overview, Security Health Score, Protection Status, and actionable recommendations.
    *   **Transaction Management:** Transaction Ledger with filtering, ML-driven "Scan Payload" for risk analysis, and a Manual Override Queue.
    *   **Security Advisories:** Actionable alerts with severity levels, dismissal, and auto-remediation.
*   **Domain-Specific Security Modules:**
    *   **Email Security:** AI-powered threat detection (phishing, attachments), Auth Monitor (SPF/DKIM/DMARC), Compromise Detector, and Phishing Campaign tracking.
    *   **Endpoint Security:** Device Fleet management, AI-driven Malware Detection, Patch Compliance, Behavioral Analytics, and USB Monitor.
    *   **Network Security:** Events Monitor, AI-powered Intrusion Detection, DNS Security, VPN & Zero-Trust management, and Firewall Analyzer.
    *   **YubiKey & Hardware MFA:** Fleet Manager (device details, attestation), Audit Log (comprehensive auth audit), Enrollment lifecycle, Failed Auth analysis, Policy enforcement, Lost/Stolen Key Response (incident management), MFA Compliance Dashboard, and Anomaly Detector (AI analysis for impossible travel, brute force, etc.).
*   **OpenClaw Monitor:** AI contract monitoring, UI Health Monitor (uptime, response time, error rate), API Security Scanner (vulnerability detection), User Session Monitor (concurrent login, session hijacking, geo-anomaly detection), Configuration Drift Detector (baseline vs. current hash comparison for configuration files), and URL Bookmarks tab for monitoring financial platform URLs (CRUD via `monitored_urls` DB table).
*   **External Linkages:** Manages integration statuses with third-party services (Stripe, Plaid, Cloudflare, Gmail, Twilio, Google Workspace Protection) and pending integrations, displaying status and configuration UI.
*   **System Monitoring:** Comprehensive monitoring of System Health (requests, response, errors, resources), Activity Logs, Threat Intelligence (geographic map, risk distribution), Throughput, and multi-framework Compliance Reporting (SOC 2, GDPR, PCI DSS, ISO 27001, HIPAA).
*   **Dark Web Monitor:** Tracks compromised data (SSN, email, credentials) and offers recovery actions.
*   **Recovery Center:** Full asset & data recovery system with a dashboard, expandable case cards, step-by-step workflows, and chronological timelines.
*   **Threat Neutralization:** Active threat containment system with summary stats, threats grouped by severity, expandable threat cards with isolation actions (freeze credit, lock cards), and multi-step neutralization workflows.
*   **Disaster Recovery:** Enterprise-grade DR planning with a dashboard (readiness score, RTO/RPO), Recovery Procedures (scenario runbooks), Business Impact Analysis, DR Testing & Drills, Compliance & Audit, and Communication & Escalation plans.
*   **Backup Center:** Automated iDrive-style backup system with dual-redundancy storage (Google Drive + local VPS). Features manual/scheduled backups of database, source code, and package manifests, SHA-256 verification, backup history, and configurable settings.
*   **Emergency Lockdown:** Global "big red button" for coordinated containment across all security domains, activating simultaneous containment actions. Includes a lockdown dashboard, action checklist, lift-lockdown flow, activity log, and visual status indicators.
*   **AI Threat Analyzer:** LLM-powered threat analysis chat accessible from any page via a floating action button. Uses OpenAI (gpt-4o-mini) with streaming SSE responses for real-time analysis of threats, consequences, attribution, and remediation steps. Supports multi-turn conversations stored in `conversations` and `messages` DB tables. API routes: `POST /api/ai/analyze-threat`, `POST /api/ai/conversations/:id/messages`, `GET /api/ai/conversations`.
*   **Google Workspace Monitor:** Scans Gmail and Google Drive for security threats (phishing, SPF/DKIM failures, suspicious attachments, shared files). Uses Google API integrations (google-mail, google-drive). Auto-analyzes high/critical findings with AI. Sidebar page at `/workspace-monitor` with scan controls and streaming results.

## Data Strategy

All static/mock data has been removed from API routes. Pages that previously showed hardcoded demo data (network IDS, DNS security, VPN, firewall, monitoring health, activity log, endpoint behavioral analytics, USB monitor, email auth monitor, attachment analysis, account compromise, phishing campaigns, openclaw health/sessions/api-security/config-drift, yubikey routes) now return empty arrays/objects. Only DB-backed routes (contracts, recovery, threats, transactions, network events, endpoints) return real data.

## External Dependencies

*   **Monorepo Tool:** pnpm workspaces
*   **Frontend Framework:** React
*   **UI Libraries:** Tailwind CSS, Recharts
*   **Backend Framework:** Express 5
*   **Database:** PostgreSQL
*   **ORM:** Drizzle ORM
*   **Validation:** Zod
*   **API Code Generation:** Orval (from OpenAPI specification)
*   **AI Integration:** OpenAI (gpt-4o-mini) via Replit AI Integrations proxy (`@workspace/integrations-openai-ai-server`)
*   **Google Workspace:** google-mail, google-drive integrations for Gmail/Drive scanning
*   **Third-Party Integrations:** Stripe, Plaid, Cloudflare, Gmail, Twilio, Google Workspace Protection (via API linkages).