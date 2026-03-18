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

1. **Dashboard** - Real-time overview with stats (total transactions, blocked, held, allowed, avg risk score, block rate, active alerts, integrations online)
2. **Transaction Ledger** - Lists all transactions with filtering by status (ALLOWED, HELD, BLOCKED, APPROVED, REJECTED). Includes "Scan Payload" button for submitting new transactions for ML risk analysis
3. **Manual Override Queue (Approvals)** - Shows HELD transactions for manual review with Approve/Reject actions
4. **Security Advisories (Alerts)** - Security alerts with severity levels (low, medium, high, critical) and dismiss functionality
5. **External Linkages (Integrations)** - Shows status of connected services (Stripe, Plaid, Cloudflare, Gmail, Twilio, Google Workspace Protection) plus pending integrations (Google Workspace Admin, AVG, Incognito, DeleteMe, IdentityForce) with configuration UI. Each integration shows category badge, description, and status. Google Workspace Protection includes a live status panel showing connection state for Gmail, Drive, Calendar, Docs, and Sheets via OAuth
6. **System Monitoring** - Four-tab monitoring page:
   - **System Health** - Overall status, 6 metrics (req/min, avg response, error rate, connections, memory, CPU), service health matrix with 5 services
   - **Activity Log** - Filterable audit trail by category and severity, with pagination
   - **Threat Intel** - Geographic threat map, risk score distribution chart, threat category pie chart, recent high-risk transactions
   - **Throughput** - Transaction volume summary cards and time-series area chart
7. **Dark Web Monitor** - Two-tab page tracking compromised personal data:
   - **Exposures** - Lists detected dark web exposures (SSN, email, credentials, financial accounts, phone numbers) with severity badges, status indicators, source marketplace, and expandable detail cards with recommended actions. Filterable by severity.
   - **Recovery Center** - Interactive checklist of recovery actions grouped by category (Credit Protection, Account Security, Legal & Reporting) with progress tracking, priority badges, and completion toggle. Exposure events auto-generate alerts in the existing alerts system.

## Database Schema

- **transactions** - Stores all transactions with source, destination, amount, currency, risk_score, status, category, ip_address, country
- **alerts** - Security alerts with title, message, severity, dismissed status
- **activity_logs** - Audit trail of system activity with action, category, source, detail, severity, ip_address, response_time_ms
- **dark_web_exposures** - Dark web exposure records with data_type, source_marketplace, severity, status, discovery_date, description, recommended_actions
- **recovery_actions** - Recovery action checklists linked to exposures (FK to dark_web_exposures) with title, description, category, completed, priority

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

## Key Commands

- `pnpm run typecheck` - Full typecheck
- `pnpm --filter @workspace/api-spec run codegen` - Generate API types
- `pnpm --filter @workspace/db run push` - Push DB schema changes
- `pnpm --filter @workspace/api-server run dev` - Start API server
- `pnpm --filter @workspace/guardianlayer run dev` - Start frontend
