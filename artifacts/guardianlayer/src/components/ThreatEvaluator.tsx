import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import DOMPurify from "dompurify";
import {
  X,
  Shield,
  Crosshair,
  Landmark,
  Loader2,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Send,
  FileText,
  Printer,
} from "lucide-react";

interface ThreatData {
  title: string;
  detail: string;
  severity: string;
  sources?: string[];
  confidence?: number;
  timeline?: Array<{ time: string; title: string; description: string; status: string }>;
}

interface ThreatEvaluatorProps {
  threat: ThreatData;
  onClose: () => void;
}

export function ThreatEvaluator({ threat, onClose }: ThreatEvaluatorProps) {
  const [analysis, setAnalysis] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [followUp, setFollowUp] = useState("");
  const [followUpStreaming, setFollowUpStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const baseUrl = import.meta.env.BASE_URL || "/";

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [analysis, scrollToBottom]);

  useEffect(() => {
    evaluateThreat();
  }, []);

  async function evaluateThreat() {
    setIsStreaming(true);
    setError(null);
    setAnalysis("");

    try {
      const response = await fetch(`${baseUrl}api/ai/evaluate-threat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          threatTitle: threat.title,
          threatDetail: threat.detail,
          severity: threat.severity,
          sources: threat.sources,
          confidence: threat.confidence,
          timeline: threat.timeline,
        }),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value);
        const lines = text.split("\n");

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const payload = JSON.parse(line.slice(6));
            if (payload.conversationId && !conversationId) {
              setConversationId(payload.conversationId);
            }
            if (payload.content) {
              setAnalysis((prev) => prev + payload.content);
            }
            if (payload.done) {
              setIsStreaming(false);
            }
            if (payload.error) {
              setError(payload.error);
              setIsStreaming(false);
            }
          } catch {}
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to evaluate threat");
      setIsStreaming(false);
    }
  }

  async function sendFollowUp() {
    if (!followUp.trim() || !conversationId || followUpStreaming) return;
    const question = followUp.trim();
    setFollowUp("");
    setFollowUpStreaming(true);
    setAnalysis((prev) => prev + `\n\n---\n\n**Your question:** ${question}\n\n`);

    try {
      const response = await fetch(`${baseUrl}api/ai/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: question }),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value);
        const lines = text.split("\n");

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const payload = JSON.parse(line.slice(6));
            if (payload.content) {
              setAnalysis((prev) => prev + payload.content);
            }
          } catch {}
        }
      }
    } catch (err) {
      setAnalysis((prev) => prev + "\n\n*Error getting follow-up response. Please try again.*");
    } finally {
      setFollowUpStreaming(false);
    }
  }

  function handlePrint() {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <html><head><title>Threat Evaluation Report — ${threat.title}</title>
      <style>body{font-family:system-ui,sans-serif;padding:40px;max-width:900px;margin:0 auto;color:#1a1a1a;line-height:1.6}
      h1{font-size:20px;border-bottom:2px solid #333;padding-bottom:8px}h2{font-size:16px;margin-top:24px}
      pre{background:#f5f5f5;padding:12px;border-radius:4px;overflow-x:auto;font-size:13px}
      strong{color:#111}.header{background:#f8f8f8;padding:16px;border-radius:8px;margin-bottom:24px}
      .meta{color:#666;font-size:13px}</style></head><body>
      <div class="header"><h1>GuardianLayer — Threat Evaluation Report</h1>
      <p class="meta">Generated: ${new Date().toLocaleString()}</p>
      <p class="meta">Threat: ${threat.title} | Severity: ${threat.severity.toUpperCase()} | Confidence: ${threat.confidence || "N/A"}%</p>
      <p class="meta">Sources: ${(threat.sources || []).join(", ")}</p></div>
      <div>${DOMPurify.sanitize(formatMarkdownToHtml(analysis))}</div></body></html>
    `);
    printWindow.document.close();
    printWindow.print();
  }

  const severityColors: Record<string, string> = {
    critical: "border-rose-500 bg-rose-500/10",
    high: "border-orange-400 bg-orange-400/10",
    medium: "border-amber-400 bg-amber-400/10",
    low: "border-blue-400 bg-blue-400/10",
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex"
      >
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

        <motion.div
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", damping: 30, stiffness: 300 }}
          className="absolute right-0 top-0 bottom-0 w-full max-w-[720px] bg-[#0a0e1a] border-l border-white/10 flex flex-col"
        >
          <div className={`p-5 border-b border-white/10 border-l-4 ${severityColors[threat.severity] || severityColors.medium}`}>
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Crosshair className="w-5 h-5 text-primary" />
                  <h2 className="font-display text-sm uppercase tracking-widest text-primary">Threat Evaluation & Elimination</h2>
                </div>
                <h3 className="text-lg font-display text-white mb-1">{threat.title}</h3>
                <p className="text-xs text-muted-foreground">{threat.detail}</p>
                <div className="flex items-center gap-3 mt-2">
                  <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border ${
                    threat.severity === "critical" ? "text-rose-400 bg-rose-500/20 border-rose-500/30" :
                    threat.severity === "high" ? "text-orange-400 bg-orange-500/20 border-orange-500/30" :
                    "text-amber-400 bg-amber-500/20 border-amber-500/30"
                  }`}>{threat.severity}</span>
                  {threat.confidence && (
                    <span className="text-[10px] font-mono text-muted-foreground">{threat.confidence}% confidence</span>
                  )}
                  {threat.sources?.map((s) => (
                    <span key={s} className="text-[9px] font-mono px-2 py-0.5 rounded bg-white/5 text-muted-foreground border border-white/10">{s}</span>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2 ml-3">
                {analysis && !isStreaming && (
                  <button
                    onClick={handlePrint}
                    className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-white transition-colors"
                    title="Print / Save as PDF"
                  >
                    <Printer className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={onClose}
                  aria-label="Close threat evaluation"
                  className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 px-5 py-3 border-b border-white/5 bg-white/[0.02]">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Shield className="w-3.5 h-3.5 text-primary" />
              <span>AI Analysis</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Crosshair className="w-3.5 h-3.5 text-rose-400" />
              <span>Elimination Steps</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Landmark className="w-3.5 h-3.5 text-amber-400" />
              <span>Gov. Reporting</span>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-4">
            {error && (
              <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-400 text-sm">
                <AlertTriangle className="w-4 h-4 inline mr-2" />
                {error}
              </div>
            )}

            {isStreaming && !analysis && (
              <div className="flex items-center gap-3 text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
                <span className="text-sm">Analyzing threat, building elimination plan, and identifying reporting agencies...</span>
              </div>
            )}

            {analysis && (
              <div className="prose prose-invert prose-sm max-w-none">
                <div
                  className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap"
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(formatMarkdownToHtml(analysis)) }}
                />
              </div>
            )}

            {isStreaming && analysis && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>Generating...</span>
              </div>
            )}
          </div>

          {!isStreaming && analysis && conversationId && (
            <div className="p-4 border-t border-white/10 bg-white/[0.02]">
              <div className="flex gap-2">
                <input
                  value={followUp}
                  onChange={(e) => setFollowUp(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendFollowUp()}
                  placeholder="Ask a follow-up question about this threat..."
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
                  disabled={followUpStreaming}
                />
                <button
                  onClick={sendFollowUp}
                  disabled={!followUp.trim() || followUpStreaming}
                  className="px-4 py-2.5 rounded-lg bg-primary/20 border border-primary/30 text-primary text-sm hover:bg-primary/30 transition-colors disabled:opacity-50"
                >
                  {followUpStreaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground mt-2">
                Ask for more detail about specific steps, alternative approaches, or clarification on any recommendation.
              </p>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function formatMarkdownToHtml(md: string): string {
  return md
    .replace(/### (.*?)$/gm, '<h3 class="text-primary font-display text-sm uppercase tracking-wider mt-6 mb-2">$1</h3>')
    .replace(/## (.*?)$/gm, '<h2 class="text-white font-display text-base uppercase tracking-wider mt-8 mb-3 pb-2 border-b border-white/10">$1</h2>')
    .replace(/# (.*?)$/gm, '<h1 class="text-white font-display text-lg uppercase tracking-wider mt-6 mb-3">$1</h1>')
    .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em class="text-gray-400">$1</em>')
    .replace(/`(.*?)`/g, '<code class="text-primary bg-primary/10 px-1.5 py-0.5 rounded text-xs font-mono">$1</code>')
    .replace(/^- (.*?)$/gm, '<li class="ml-4 text-gray-300 mb-1">$1</li>')
    .replace(/^(\d+)\. (.*?)$/gm, '<li class="ml-4 text-gray-300 mb-1"><span class="text-primary font-mono mr-1">$1.</span>$2</li>')
    .replace(/---/g, '<hr class="border-white/10 my-4" />')
    .replace(/\n\n/g, '<br/><br/>');
}
