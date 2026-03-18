import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, ChevronDown, ChevronUp, Download } from "lucide-react";

interface ExecutiveSummaryProps {
  title: string;
  sections: { heading: string; content: string }[];
}

export function ExecutiveSummary({ title, sections }: ExecutiveSummaryProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-primary/[0.05] transition-colors"
      >
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-primary" />
          <span className="text-sm font-display uppercase tracking-wider text-primary">Executive Summary — {title}</span>
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
            <div className="px-4 pb-4 space-y-4">
              <p className="text-xs text-muted-foreground italic">
                This summary is written for non-technical leadership. It provides a high-level overview of the current security status.
              </p>
              {sections.map((section, i) => (
                <div key={i}>
                  <h5 className="text-xs font-display uppercase tracking-widest text-white mb-1">{section.heading}</h5>
                  <p className="text-sm text-gray-300 leading-relaxed">{section.content}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
