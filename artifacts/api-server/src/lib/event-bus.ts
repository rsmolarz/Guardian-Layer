import { db, systemEventsTable } from "@workspace/db";

type EventHandler = (event: { type: string; payload: any; source: string; timestamp: string }) => void;

const subscribers = new Map<string, Set<EventHandler>>();
const wildcardSubscribers = new Set<EventHandler>();

let totalPublished = 0;
let totalDelivered = 0;
const recentEvents: Array<{ type: string; payload: any; source: string; timestamp: string }> = [];
const MAX_RECENT = 100;

export async function publishEvent(type: string, payload: any, source: string): Promise<void> {
  const timestamp = new Date().toISOString();
  const event = { type, payload, source, timestamp };

  totalPublished++;
  recentEvents.unshift(event);
  if (recentEvents.length > MAX_RECENT) recentEvents.pop();

  try {
    await db.insert(systemEventsTable).values({
      eventType: type,
      payload,
      sourceService: source,
    });
  } catch (err: any) {
    console.error("[event-bus] Failed to persist event:", err.message);
  }

  const handlers = subscribers.get(type);
  if (handlers) {
    for (const handler of handlers) {
      try { handler(event); totalDelivered++; } catch (e: any) {
        console.error(`[event-bus] Handler error for ${type}:`, e.message);
      }
    }
  }
  for (const handler of wildcardSubscribers) {
    try { handler(event); totalDelivered++; } catch (e: any) {
      console.error("[event-bus] Wildcard handler error:", e.message);
    }
  }
}

export function subscribeEvent(type: string, handler: EventHandler): () => void {
  if (!subscribers.has(type)) subscribers.set(type, new Set());
  subscribers.get(type)!.add(handler);
  return () => { subscribers.get(type)?.delete(handler); };
}

export function subscribeAll(handler: EventHandler): () => void {
  wildcardSubscribers.add(handler);
  return () => { wildcardSubscribers.delete(handler); };
}

export function getEventBusStats() {
  return {
    totalPublished,
    totalDelivered,
    subscriberCount: Array.from(subscribers.values()).reduce((sum, s) => sum + s.size, 0) + wildcardSubscribers.size,
    recentEventsCount: recentEvents.length,
    subscribedTypes: Array.from(subscribers.keys()),
  };
}

export function getRecentEvents(limit = 50) {
  return recentEvents.slice(0, limit);
}

export function initEventListeners(): void {
  subscribeEvent("task_failed", (evt) => {
    console.warn(`[event-bus] Task failed: ${evt.payload?.taskName || "unknown"} — ${evt.payload?.error || "no details"}`);
  });

  subscribeEvent("agent_offline", (evt) => {
    console.warn(`[event-bus] Agent offline: ${evt.payload?.agentId || "unknown"}`);
  });

  subscribeEvent("backup_failed", (evt) => {
    console.warn(`[event-bus] Backup failed: ${evt.payload?.error || "unknown"}`);
  });

  subscribeEvent("deployment_finished", (evt) => {
    console.log(`[event-bus] Deployment finished: ${evt.payload?.status || "unknown"}`);
  });

  console.log("[Event Bus] Initialized with 4 built-in listeners");
}
