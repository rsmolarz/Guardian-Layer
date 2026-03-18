import { motion } from "framer-motion";
import { Clock, ShieldCheck, ShieldAlert, Ban, Mail, AlertTriangle } from "lucide-react";

interface DailyEvent {
  time: string;
  description: string;
  type: "blocked" | "alert" | "resolved" | "info";
}

interface WhatHappenedTodayProps {
  events: DailyEvent[];
}

const EVENT_ICONS = {
  blocked: Ban,
  alert: AlertTriangle,
  resolved: ShieldCheck,
  info: Mail,
};

const EVENT_COLORS = {
  blocked: "text-rose-400",
  alert: "text-amber-400",
  resolved: "text-emerald-400",
  info: "text-blue-400",
};

export function WhatHappenedToday({ events }: WhatHappenedTodayProps) {
  if (events.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="glass-panel p-6 rounded-2xl"
    >
      <h3 className="text-sm font-display uppercase tracking-widest text-primary mb-4 flex items-center gap-2">
        <Clock className="w-4 h-4" />
        What Happened Today
      </h3>
      <ul className="space-y-3">
        {events.map((event, i) => {
          const Icon = EVENT_ICONS[event.type];
          const color = EVENT_COLORS[event.type];
          return (
            <motion.li
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + i * 0.05 }}
              className="flex items-start gap-3"
            >
              <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${color}`} />
              <div className="flex-1">
                <span className="text-sm text-gray-300">{event.description}</span>
              </div>
              <span className="text-[10px] font-mono text-muted-foreground shrink-0">{event.time}</span>
            </motion.li>
          );
        })}
      </ul>
    </motion.div>
  );
}

export function generateDailyEvents(): DailyEvent[] {
  return [
    { time: "2:15 PM", description: "We blocked a suspicious email pretending to be from PayPal that contained a dangerous attachment.", type: "blocked" },
    { time: "1:48 PM", description: "Someone tried to break into our systems from an unfamiliar location — they were stopped at the firewall.", type: "blocked" },
    { time: "12:30 PM", description: "A workstation in HR was flagged for missing security updates. The team has been notified.", type: "alert" },
    { time: "11:15 AM", description: "3 failed login attempts detected for an employee account — the account was temporarily locked for safety.", type: "alert" },
    { time: "10:00 AM", description: "Routine security scan completed. 8 out of 10 devices are fully up to date.", type: "info" },
    { time: "9:22 AM", description: "A previously detected threat was fully neutralized. No data was compromised.", type: "resolved" },
    { time: "8:45 AM", description: "An unusually large money transfer was held for manual review before processing.", type: "alert" },
    { time: "7:00 AM", description: "All overnight monitoring systems reported normal activity. No incidents detected.", type: "resolved" },
  ];
}
