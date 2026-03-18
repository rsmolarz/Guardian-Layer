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
    *   **YubiKey & Hardware MFA:** Fleet Manager (10 devices with serial numbers, models, form factors, firmware versions, FIPS certification, attestation tracking, warranty expiry, last used app/location, interfaces/protocols), Audit Log (12-event comprehensive auth audit with user/device/timestamp/success-failure/location/protocol/application/session IDs/user agents/relay parties/auth methods/response times/risk flags/failure reasons), Enrollment lifecycle, Failed Auth analysis, Policy enforcement, and Lost/Stolen Key Response (4 incidents — stolen/lost/damaged types with full incident timelines, security alerts via SOC/email/Slack/PagerDuty, re-enrollment workflows, post-incident actions, severity levels, status filtering) for hardware security keys.
*   **OpenClaw Monitor:** AI contract monitoring for risk analysis and compliance.
*   **External Linkages:** Manages integration statuses with third-party services.
*   **System Monitoring:** Comprehensive monitoring of System Health, Activity Logs, Threat Intelligence, Throughput, and multi-framework Compliance Reporting (SOC 2, GDPR, PCI DSS, ISO 27001, HIPAA).
*   **Dark Web Monitor:** Tracks compromised data and offers recovery actions.

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