import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Newspaper, ChevronDown, ChevronUp } from "lucide-react";

interface ThreatExplainerProps {
  narrative: string;
}

export function ThreatExplainer({ narrative }: ThreatExplainerProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-primary/[0.05] transition-colors"
      >
        <div className="flex items-center gap-2">
          <Newspaper className="w-4 h-4 text-primary" />
          <span className="text-sm font-display uppercase tracking-wider text-primary">Threat Explainer — In Plain English</span>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-primary/60" /> : <ChevronDown className="w-4 h-4 text-primary/60" />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4">
              <p className="text-sm text-gray-300 leading-relaxed italic border-l-2 border-primary/30 pl-3">
                {narrative}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
