import { useGetDashboardStats, useGetRiskTimeline } from "@workspace/api-client-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { CyberLoading } from "@/components/ui/CyberLoading";
import { CyberError } from "@/components/ui/CyberError";
import { motion } from "framer-motion";
import { Activity, ShieldAlert, ShieldCheck, Zap, Ban, Database } from "lucide-react";
import { ResponsiveContainer, AreaChart, CartesianGrid, XAxis, YAxis, Tooltip, Area } from "recharts";

export default function Dashboard() {
  const { data: stats, isLoading: isStatsLoading, isError: isStatsError } = useGetDashboardStats();
  const { data: timeline, isLoading: isTimelineLoading } = useGetRiskTimeline({ days: 7 });

  if (isStatsLoading || isTimelineLoading) return <CyberLoading text="AGGREGATING TELEMETRY..." />;
  if (isStatsError || !stats) return <CyberError title="TELEMETRY FAULT" message="Failed to retrieve dashboard statistics from the core." />;

  const statCards = [
    { label: "Total Monitored", value: stats.totalTransactions, icon: Activity, color: "text-primary" },
    { label: "Threats Blocked", value: stats.totalBlocked, icon: Ban, color: "text-rose-500" },
    { label: "Held For Review", value: stats.totalHeld, icon: ShieldAlert, color: "text-amber-400" },
    { label: "Safe Transfers", value: stats.totalAllowed, icon: ShieldCheck, color: "text-emerald-400" },
    { label: "Avg Network Risk", value: stats.averageRiskScore.toFixed(2), icon: Zap, color: "text-secondary" },
    { label: "Active Integrations", value: stats.integrationsOnline, icon: Database, color: "text-primary" },
  ];

  return (
    <div className="pb-12">
      <PageHeader 
        title="Command Center" 
        description="Real-time overview of network transaction security, threat vectors, and mitigation actions." 
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
        {statCards.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass-panel p-6 rounded-2xl relative overflow-hidden group hover:border-primary/30 transition-colors"
          >
            <div className={`absolute top-0 right-0 p-4 opacity-10 ${stat.color} group-hover:scale-150 transition-transform duration-700 ease-out`}>
              <stat.icon className="w-24 h-24" />
            </div>
            <div className="relative z-10 flex flex-col h-full justify-between">
              <span className="font-display uppercase text-xs tracking-widest text-muted-foreground mb-4 block">
                {stat.label}
              </span>
              <div className="flex items-end justify-between">
                <span className="text-4xl font-mono font-bold text-foreground drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">
                  {stat.value}
                </span>
                <stat.icon className={`w-6 h-6 ${stat.color} drop-shadow-[0_0_8px_currentColor]`} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="glass-panel p-6 rounded-2xl"
      >
        <h3 className="font-display text-lg uppercase tracking-widest text-primary mb-8 border-b border-white/5 pb-4 flex items-center">
          <Activity className="w-5 h-5 mr-3" />
          7-Day Risk & Volume Topology
        </h3>
        
        <div className="h-[400px] w-full cyber-grid rounded-xl p-4">
          {timeline?.dataPoints ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timeline.dataPoints} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRisk" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis 
                  dataKey="date" 
                  stroke="hsl(var(--muted-foreground))" 
                  fontSize={12} 
                  fontFamily="JetBrains Mono" 
                  tickLine={false}
                  axisLine={false}
                  dy={10}
                />
                <YAxis 
                  yAxisId="left"
                  stroke="hsl(var(--muted-foreground))" 
                  fontSize={12} 
                  fontFamily="JetBrains Mono"
                  tickLine={false}
                  axisLine={false}
                  dx={-10}
                />
                <YAxis 
                  yAxisId="right" 
                  orientation="right" 
                  stroke="hsl(var(--muted-foreground))" 
                  fontSize={12} 
                  fontFamily="JetBrains Mono"
                  tickLine={false}
                  axisLine={false}
                  dx={10}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '0.5rem',
                    fontFamily: 'JetBrains Mono',
                    boxShadow: '0 0 20px rgba(0,0,0,0.5)'
                  }}
                  itemStyle={{ color: 'hsl(var(--foreground))' }}
                />
                <Area 
                  yAxisId="left"
                  type="monotone" 
                  dataKey="avgRisk" 
                  stroke="hsl(var(--destructive))" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorRisk)" 
                  name="Avg Risk Score"
                />
                <Area 
                  yAxisId="right"
                  type="monotone" 
                  dataKey="transactionCount" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorCount)" 
                  name="Total Volume"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center font-mono text-muted-foreground">
              INSUFFICIENT DATA FOR VISUALIZATION
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
