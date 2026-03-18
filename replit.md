# GuardianLayer Enterprise

## Overview

GuardianLayer Enterprise is a security platform providing real-time transaction risk scoring, fraud detection, and comprehensive security management for applications. It offers a unified dashboard for monitoring various security aspects including email, endpoint, network, and hardware security, alongside AI-powered threat intelligence and compliance reporting. The platform aims to enhance application security, streamline threat response, and ensure regulatory adherence for enterprises.

## User Preferences

I prefer detailed explanations and iterative development. Ask before making major architectural changes or introducing new dependencies.

## System Architecture

The project is structured as a pnpm monorepo using TypeScript. The frontend is built with React, Vite, Tailwind CSS, and Recharts, providing a modern and responsive user interface. The backend API is developed using Express 5, connecting to a PostgreSQL database via Drizzle ORM. Zod is used for schema validation, and Orval generates API client code from an OpenAPI specification, ensuring type safety and consistency between frontend and backend.

**Core Features & Design Patterns:**

*   **Dashboard (Command Center):** Centralized overview with real-time stats, an AI Risk Assistant for contextual security insights, a Threat Correlation Engine, and a Real-Time Threat Intel Feed. Visualizations include a 7-Day Risk & Volume Topology chart.
*   **Transaction Management:** Features a Transaction Ledger with filtering, a "Scan Payload" function for ML risk analysis, and a Manual Override Queue for approving/rejecting held transactions. ML risk scoring considers transaction amount, country of origin, and category.
*   **Security Advisories:** Provides alerts with severity levels, dismiss functionality, and auto-remediate buttons that trigger predefined actions.
*   **Domain-Specific Security Modules:**
    *   **Email Security:** AI-powered threat detection (phishing, attachments), Auth Monitor (SPF/DKIM/DMARC), Compromise Detector (unusual login patterns), and Phishing Campaign tracking.
    *   **Endpoint Security:** Device Fleet management, AI-driven Malware Detection, Patch Compliance tracking, Behavioral Analytics for anomaly detection, and USB Monitor for device activity.
    *   **Network Security:** Events Monitor, AI-powered Intrusion Detection, DNS Security (malicious domains), VPN & Zero-Trust management, and Firewall Analyzer for rule optimization.
    *   **YubiKey & Hardware MFA:** Fleet Manager (10 devices with serial numbers, models, form factors, firmware versions, FIPS certification, attestation tracking, warranty expiry, last used app/location, interfaces/protocols), Audit Log (12-event comprehensive auth audit with user/device/timestamp/success-failure/location/protocol/application/session IDs/user agents/relay parties/auth methods/response times/risk flags/failure reasons), Enrollment lifecycle, Failed Auth analysis, Policy enforcement, Lost/Stolen Key Response (4 incidents — stolen/lost/damaged types with full incident timelines, security alerts via SOC/email/Slack/PagerDuty, re-enrollment workflows, post-incident actions, severity levels, status filtering), MFA Compliance Dashboard (15 users with hardware key/TOTP/SMS/none methods, compliance scores, risk levels, non-compliance reasons, method/compliance filtering), and Anomaly Detector (7 anomalies across 6 types — impossible travel, brute force, unusual hours, concurrent sessions, protocol mismatch, rapid auth — with AI analysis, risk scores, recommended actions, related alerts, location details, type/status filtering) for hardware security keys.
*   **OpenClaw Monitor:** AI contract monitoring for risk analysis and compliance, UI Health Monitor (6 services with uptime/response time/error rate/health checks/P95/P99 metrics and recent incidents), API Security Scanner (8 endpoints with 9 vulnerabilities across injection/IDOR/auth bypass/privilege escalation/SSRF/template injection types, CVSS scores, CWE IDs, OWASP categories, proof-of-concept details, remediation guidance, severity filtering), User Session Monitor (10 sessions with concurrent login detection, session hijacking attempts, geo-anomaly detection, data exfiltration alerts, privilege escalation flags, MFA method tracking, activity metrics, status filtering), and Configuration Drift Detector (10 config files monitoring auth/database/network/security/secrets/observability categories with 17 field-level changes, baseline vs current hash comparison, severity ratings, approval status tracking, drift/baseline filtering).
*   **External Linkages:** Manages integration statuses with third-party services. Includes status of connected services (Stripe, Plaid, Cloudflare, Gmail, Twilio, Google Workspace Protection) plus pending integrations (Google Workspace Admin, AVG, Incognito, DeleteMe, IdentityForce) with configuration UI. Each integration shows category badge, description, and status. Google Workspace Protection includes a live status panel showing connection state for Gmail, Drive, Calendar, Docs, and Sheets via OAuth.
*   **System Monitoring:** Comprehensive monitoring of System Health (req/min, avg response, error rate, connections, memory, CPU), Activity Logs (audit trail by category and severity), Threat Intelligence (geographic map, risk distribution, category analysis), Throughput (volume summary and time-series charts), and multi-framework Compliance Reporting (SOC 2, GDPR, PCI DSS, ISO 27001, HIPAA).
*   **Dark Web Monitor:** Tracks compromised data (SSN, email, credentials, financial accounts, phone numbers) and offers recovery actions (Credit Protection, Account Security, Legal & Reporting).
*   **Recovery Center:** Full asset & data recovery system for compromised assets (passport, email, credit card, SSN). Features recovery dashboard with stats/progress bar, expandable case cards with step-by-step workflows, step status tracking with notes, verification checks, and chronological timeline view.

## External Dependencies

*   **Monorepo Tool:** pnpm workspaces
*   **Frontend Framework:** React
*   **UI Library:** Tailwind CSS, Recharts
*   **API Framework:** Express 5
*   **Database:** PostgreSQL
*   **ORM:** Drizzle ORM
*   **Validation:** Zod, drizzle-zod
*   **API Codegen:** Orval (from OpenAPI spec)
*   **Build Tool:** esbuild
*   **Third-Party Integrations:** Stripe, Plaid, Cloudflare, Gmail, Twilio, Google Workspace Protection (via API linkages).

## Database Schema

*   **transactions** - Stores all transactions with source, destination, amount, currency, risk_score, status, category, ip_address, country
*   **alerts** - Security alerts with title, message, severity, dismissed status
*   **activity_logs** - Audit trail of system activity with action, category, source, detail, severity, ip_address, response_time_ms
*   **dark_web_exposures** - Dark web exposure records with data_type, source_marketplace, severity, status, discovery_date, description, recommended_actions
*   **recovery_actions** - Recovery action checklists linked to exposures (FK to dark_web_exposures) with title, description, category, completed, priority
*   **recovery_cases** - Compromised asset recovery tracking with asset_type, asset_identifier, compromise_details, status (pending/in_progress/verified/recovered), recovery_percentage
*   **recovery_steps** - Individual recovery steps per case with step_order, title, description, category, status (not_started/in_progress/completed/verified), notes, timestamps (started_at, completed_at, verified_at). FK to recovery_cases

## ML Risk Scoring

The risk scoring engine evaluates transactions based on:
- Transaction amount (>$10k = high risk, >$5k = elevated)
- Country of origin (known high-risk regions)
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
- `GET /api/monitoring/activity-log` - Activity audit trail (filterable by category, severity)
- `GET /api/monitoring/threat-map` - Geographic threat distribution
- `GET /api/monitoring/throughput` - Transaction throughput over time
- `GET /api/monitoring/risk-distribution` - Risk score distribution buckets
- `GET /api/monitoring/top-threats` - Top threat categories, sources, and recent high-risk transactions
- `GET /api/dark-web/exposures` - List dark web exposures (filterable by severity, status)
- `GET /api/dark-web/exposures/:id` - Get exposure detail
- `GET /api/dark-web/recovery-actions` - List recovery actions (filterable by exposureId, category)
- `POST /api/dark-web/recovery-actions/:id/toggle` - Toggle recovery action completion
- `GET /api/dark-web/summary` - Dark web monitoring summary stats
- `GET /api/recovery/cases` - List recovery cases
- `GET /api/recovery/summary` - Recovery summary stats
- `GET /api/recovery/cases/:id` - Case detail with steps
- `PATCH /api/recovery/cases/:id/status` - Update case status
- `PATCH /api/recovery/steps/:id/status` - Update step status/notes
- `POST /api/recovery/cases/:id/verify` - Mark case as fully recovered (requires all steps completed)
- `GET /api/recovery/timeline` - Chronological recovery timeline

## Key Commands

- `pnpm run typecheck` - Full typecheck
- `pnpm --filter @workspace/api-spec run codegen` - Generate API types
- `pnpm --filter @workspace/db run push` - Push DB schema changes
- `pnpm --filter @workspace/api-server run dev` - Start API server
- `pnpm --filter @workspace/guardianlayer run dev` - Start frontend
