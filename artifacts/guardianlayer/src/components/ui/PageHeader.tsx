import { motion } from "framer-motion";
import { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description: string;
  action?: ReactNode;
}

export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10 pb-6 border-b border-border/50 relative"
    >
      <div className="absolute bottom-0 left-0 w-32 h-px bg-gradient-to-r from-primary to-transparent shadow-[0_0_10px_rgba(6,182,212,0.5)]" />
      <div>
        <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground tracking-tight drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]">
          {title}
        </h1>
        <p className="mt-2 text-muted-foreground font-mono text-sm max-w-2xl">
          {description}
        </p>
      </div>
      {action && (
        <div className="shrink-0">
          {action}
        </div>
      )}
    </motion.div>
  );
}
