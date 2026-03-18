import { motion } from "framer-motion";
import { Shield } from "lucide-react";

export function CyberLoading({ text = "INITIALIZING SECURE UPLINK..." }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] w-full p-8">
      <div className="relative">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
          className="absolute -inset-4 border-2 border-dashed border-primary/30 rounded-full"
        />
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          className="absolute -inset-8 border border-secondary/20 rounded-full"
        />
        <Shield className="w-12 h-12 text-primary animate-pulse-glow" />
      </div>
      <motion.p 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ repeat: Infinity, duration: 1, repeatType: "reverse" }}
        className="mt-8 font-mono text-sm tracking-widest text-primary"
      >
        {text}
      </motion.p>
    </div>
  );
}
