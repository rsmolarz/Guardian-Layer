# GuardianLayer Enterprise

## Overview

GuardianLayer Enterprise is a comprehensive security platform designed to provide real-time transaction risk scoring, fraud detection, and robust security management for enterprise applications. It offers a unified dashboard for monitoring various security domains including email, endpoint, network, and hardware security, augmented by AI-powered threat intelligence and compliance reporting. The platform's core purpose is to enhance application security postures, streamline threat response mechanisms, and ensure continuous adherence to regulatory standards, ultimately protecting business operations and data integrity.

## User Preferences

I prefer detailed explanations and iterative development. Ask before making major architectural changes or introducing new dependencies.

## System Architecture

The project is built as a pnpm monorepo utilizing TypeScript, ensuring a scalable and maintainable codebase. The frontend, designed for a modern and responsive user experience, is developed with React, Vite, Tailwind CSS for styling, and Recharts for data visualization. The backend API is constructed using Express 5 and interfaces with a PostgreSQL database via Drizzle ORM. Zod is employed for robust schema validation, and Orval automates the generation of type-safe API client code from an OpenAPI specification, maintaining consistency across the stack.

**Core Architectural Decisions and Features:**

*   **User Interface & Experience (UI/UX):** A primary focus is on simplifying complex security concepts for non-technical executives. This involves a "Plain English Overhaul" across all UI text, replacing jargon with accessible language. Key UI components include severity labels like "Act Now" and "Monitor," Executive Summary panels, a searchable Glossary, QuickHelp buttons for contextual guidance, and JargonTooltips for technical terms.
*   **Centralized Monitoring & Management:**
    *   **Dashboard (Command Center):** Provides a high-level overview of security posture, including a Security Health Score, Protection Status, and actionable recommendations.
    *   **Transaction Management:** Features a Transaction Ledger with filtering, an ML-driven "Scan Payload" for risk analysis considering amount, country, and category, and a Manual Override Queue for held transactions.
    *   **Security Advisories:** Delivers actionable alerts with severity levels, dismissal options, and auto-remediation capabilities.
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
*   **Threat Neutralization:** Active threat containment system with summary stats (active/contained/neutralized/avg containment time), threats grouped by severity, expandable threat cards with isolation actions (freeze credit, lock cards, secure email, invalidate credentials, flag passport), multi-step neutralization workflows with progress tracking, and threat timeline view.
*   **Disaster Recovery:** Enterprise-grade DR planning with 6 sub-sections: Overview dashboard (readiness score gauge, RTO/RPO tracking, quick stats, failover status grid), Recovery Procedures (7 scenario runbooks — database failure, app server failure, network outage, security breach, data corruption, ransomware attack, infrastructure loss — each with step-by-step checklists, personnel, dependencies), Business Impact Analysis (sortable table of 8 systems by criticality/financial impact/max downtime), DR Testing & Drills (test result history with gap tracking and remediation status), Compliance & Audit (SOC 2, ISO 27001, NIST CSF controls with interactive status updates and gap analysis), and Communication & Escalation (tiered escalation contacts and notification templates per scenario).
*   **Backup Center:** Automated iDrive-style backup system with dual-redundancy storage (Google Drive + local VPS). Features manual and scheduled backups of database (pg_dump), source code archives, and package manifests. SHA-256 checksum verification, backup history with size/status/integrity indicators, storage usage tracking, configurable intervals/retention/max backups, download capability, and Google Drive organized folder structure (GuardianLayer-Backups/YYYY-MM-DD/).
*   **Emergency Lockdown:** Global "big red button" for coordinated containment across all security domains. Activates all containment actions simultaneously (freeze credit, lock cards, secure email, invalidate credentials, isolate endpoints). Features lockdown dashboard with status/duration/action counts, containment action checklist with individual lift/reactivate controls, lift-lockdown flow with summary report, activity log, global lockdown banner on all pages, and sidebar status indicator change from "SYSTEM SECURE" to "LOCKDOWN ACTIVE".

## External Dependencies

*   **Monorepo Tool:** pnpm workspaces
*   **Frontend Framework:** React
*   **UI Libraries:** Tailwind CSS, Recharts
*   **Backend Framework:** Express 5
*   **Database:** PostgreSQL
*   **ORM:** Drizzle ORM
*   **Validation:** Zod, drizzle-zod
*   **API Code Generation:** Orval (from OpenAPI specification)
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
*   **threats** - Active threats with type, severity, status (detected/isolating/contained/neutralized), affected_assets, detection_source, description, detected_at, contained_at, neutralized_at
*   **neutralization_steps** - Multi-step neutralization workflows per threat with threat_id, step_order, title, description, category, status (pending/in_progress/completed), started_at, completed_at
*   **backups** - Backup records with name, status (pending/in_progress/completed/failed), type (manual/scheduled), size_bytes, checksum (SHA-256), checksum_verified, local_path, drive_file_id, drive_folder_id, includes_database, includes_source_code, includes_packages, error_message, completed_at
*   **backup_settings** - Backup configuration with interval_hours, retention_days, max_backups, auto_backup_enabled, last_auto_backup_at
*   **lockdown_sessions** - Emergency lockdown sessions with status (active/lifted), reason, activated_at, deactivated_at, summary_report
*   **lockdown_actions** - Individual containment actions per lockdown session with session_id (FK), action_type, label, description, status (active/lifted/pending), activated_at, lifted_at
*   **dr_procedures** - DR recovery procedures with scenario, title, description, priority, rto_minutes, rpo_minutes, estimated_recovery_minutes, required_personnel, dependencies, last_tested_at, last_test_result, status
*   **dr_procedure_steps** - Step-by-step runbook entries per procedure with procedure_id (FK), step_order, title, description, estimated_minutes, responsible
*   **dr_test_results** - DR test results with procedure_id (FK), test_date, outcome (pass/partial/fail), actual_recovery_minutes, notes, gaps_found, remediation_status, conducted_by
*   **dr_business_impact** - Business impact analysis with system_name, description, criticality, max_downtime_minutes, financial_impact_per_hour, dependencies, current_status
*   **dr_failover_config** - Failover configurations with component, primary_status, secondary_status, failover_mode, last_failover_at, last_health_check_at, rto_seconds, is_active
*   **dr_communication_plan** - Communication plan entries with scenario, escalation_level, contact_name, contact_role, contact_email, contact_phone, notification_template, response_time_minutes
*   **dr_compliance_checklist** - Compliance checklist items with framework (SOC 2/ISO 27001/NIST CSF), control_id, control_title, description, status, evidence, last_reviewed_at, assigned_to

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
- `GET /api/threats` - List threats (filterable by status, severity)
- `GET /api/threats/summary` - Threat neutralization summary stats
- `GET /api/threats/:id` - Get threat detail with neutralization steps and timeline
- `POST /api/threats/:id/status` - Update threat status
- `POST /api/threats/:id/isolate` - Execute isolation action (freeze_credit, lock_cards, secure_email, invalidate_credentials, flag_passport)
- `POST /api/threats/:threatId/steps/:stepId/complete` - Complete a neutralization step
- `GET /api/disaster-recovery/dashboard` - DR readiness dashboard (score, RTO/RPO, component health, stats)
- `GET /api/disaster-recovery/procedures` - List DR procedures
- `GET /api/disaster-recovery/procedures/:id` - Procedure detail with step-by-step runbook
- `GET /api/disaster-recovery/test-results` - List DR test results
- `POST /api/disaster-recovery/test-results` - Record new DR test result
- `GET /api/disaster-recovery/business-impact` - Business impact analysis
- `GET /api/disaster-recovery/failover` - Failover configuration status
- `GET /api/disaster-recovery/communication-plan` - Communication plan entries
- `GET /api/disaster-recovery/compliance` - Compliance checklist by framework
- `PATCH /api/disaster-recovery/compliance/:id/status` - Update compliance item status
- `GET /api/backups` - List backups (filterable by limit, offset)
- `POST /api/backups/trigger` - Trigger manual backup (auth required: Bearer BACKUP_ADMIN_KEY)
- `GET /api/backups/summary` - Backup summary and storage usage
- `GET /api/backups/settings` - Get backup configuration
- `PATCH /api/backups/settings` - Update backup configuration (auth required)
- `POST /api/backups/:id/verify` - Verify backup integrity via SHA-256 (auth required)
- `POST /api/backups/:id/restore` - Restore from backup (auth + X-Confirm-Restore header required)
- `GET /api/backups/:id/download` - Download backup archive (auth required)
- Auth: Set BACKUP_ADMIN_KEY env var for persistent key; ephemeral key generated if unset
- `GET /api/lockdown/status` - Get current lockdown status (active/inactive with session details)
- `POST /api/lockdown/activate` - Activate emergency lockdown (requires reason)
- `POST /api/lockdown/lift` - Lift active lockdown (generates summary report)
- `POST /api/lockdown/actions/:actionId/toggle` - Toggle individual containment action (lift/reactivate)
- `GET /api/lockdown/history` - Get lockdown activity log

## Key Commands

- `pnpm run typecheck` - Full typecheck
- `pnpm --filter @workspace/api-spec run codegen` - Generate API types
- `pnpm --filter @workspace/db run push` - Push DB schema changes
- `pnpm --filter @workspace/api-server run dev` - Start API server
- `pnpm --filter @workspace/guardianlayer run dev` - Start frontend
