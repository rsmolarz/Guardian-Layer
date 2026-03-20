# API Gateway & Event Bus (v1.0)

**Brand:** OC

**Published:** 2026-03-09

**Status:** complete

## Summary
Centralized API Gateway routes all platform requests through a single interface with consistent authentication. In-process Event Bus publishes standardized events (task_requested, task_started, task_completed, task_failed, agent_online, agent_offline, deployment_started, deployment_finished, backup_completed, etc.) and logs all events to PostgreSQL for full observability.

## API Gateway
Centralized request routing at /api/gateway/*. Endpoints: POST /task (submit tasks via event bus), POST /agent/register (agent registration events), GET /status (gateway health + event bus stats + recent events), GET /events (paginated event stream with optional type filter), POST /event (publish arbitrary events), POST /deploy (deployment events), POST /backup (backup trigger with event lifecycle). Authentication: session-based or Bearer token (GATEWAY_API_TOKEN).

## Event Bus
In-process pub/sub event system with publishEvent(type, payload, source) and subscribeEvent(type, handler). Supports wildcard subscribers via subscribeAll(). All events are persisted to the system_events PostgreSQL table with event_type, payload (JSONB), source_service, and timestamp. Event types: task_requested, task_started, task_progress, task_completed, task_failed, agent_online, agent_offline, deployment_started, deployment_finished, backup_started, backup_completed, backup_failed, system_alert, tool_invoked, plan_created, plan_completed.

## Event Listeners
Six built-in listeners initialized on startup: task_completed (Telegram notification), task_failed (Telegram alert), agent_offline (Telegram alert), backup_completed (Telegram notification), backup_failed (Telegram alert), deployment_finished (Telegram notification). Additional listeners can be registered via subscribeEvent().

## Agent System Integration
Agent task execution publishes task_completed and task_failed events via the event bus. Plan creation publishes plan_created events. All events include taskId, taskName, agentId, and error details where applicable. Events are published from agent-system.ts using dynamic imports.

## Event Stream UI
Real-time event monitoring in Agent Admin > Events tab. Auto-refreshes every 5 seconds. Shows event type (color-coded badges), source service, payload preview, and timestamp. Event types are color-coded: completed/online = green, failed/offline = red, started/requested = secondary.

## API Routes
- `POST /api/gateway/task`
- `POST /api/gateway/agent/register`
- `GET /api/gateway/status`
- `GET /api/gateway/events`
- `POST /api/gateway/event`
- `POST /api/gateway/deploy`
- `POST /api/gateway/backup`

## Files
- `server/event-bus.ts`
- `server/api-gateway.ts`
- `server/storage.ts`
- `shared/schema.ts`
- `server/agent-system.ts`
- `client/src/pages/agent-admin.tsx`

## Dependencies
- Drizzle ORM
- PostgreSQL
