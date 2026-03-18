import { motion } from "framer-motion";
import { Shield, ShieldCheck, ShieldAlert, Mail, Network, Laptop, Key, Eye, CreditCard, Scale } from "lucide-react";

interface ProtectionArea {
  name: string;
  status: "protected" | "issue" | "offline";
  detail: string;
  icon: typeof Shield;
}

interface ProtectionStatusProps {
  areas: ProtectionArea[];
}

const STATUS_STYLES = {
  protected: { color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20", label: "Protected" },
  issue: { color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20", label: "Issue" },
  offline: { color: "text-rose-400", bg: "bg-rose-500/10 border-rose-500/20", label: "Offline" },
};

export function ProtectionStatus({ areas }: ProtectionStatusProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="glass-panel p-6 rounded-2xl"
    >
      <h3 className="text-sm font-display uppercase tracking-widest text-primary mb-4 flex items-center gap-2">
        <Shield className="w-4 h-4" />
        Protection Status — At a Glance
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {areas.map((area, i) => {
          const style = STATUS_STYLES[area.status];
          const Icon = area.icon;
          return (
            <motion.div
              key={area.name}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 + i * 0.05 }}
              className={`p-3 rounded-xl border ${style.bg} text-center`}
            >
              <Icon className={`w-5 h-5 mx-auto mb-2 ${style.color}`} />
              <p className="text-xs font-display uppercase tracking-wider text-white mb-0.5">{area.name}</p>
              <p className={`text-[10px] ${style.color}`}>{area.detail}</p>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}

export function generateProtectionAreas(): ProtectionArea[] {
  return [
    { name: "Email", status: "protected", detail: "All clear", icon: Mail },
    { name: "Network", status: "issue", detail: "1 issue needs fixing", icon: Network },
    { name: "Devices", status: "issue", detail: "2 need updates", icon: Laptop },
    { name: "Authentication", status: "protected", detail: "MFA active", icon: Key },
    { name: "Dark Web", status: "protected", detail: "Monitoring active", icon: Eye },
    { name: "Payments", status: "protected", detail: "All transactions scanned", icon: CreditCard },
    { name: "Contracts", status: "issue", detail: "1 expiring soon", icon: Scale },
  ];
}
