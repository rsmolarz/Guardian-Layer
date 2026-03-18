import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { clsx } from "clsx";
import {
  Brain,
  Send,
  X,
  AlertTriangle,
  ShieldAlert,
  Loader2,
  MessageCircle,
  Sparkles,
} from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ThreatChatProps {
  isOpen: boolean;
  onClose: () => void;
  initialThreat?: string;
}

export function ThreatChat({ isOpen, onClose, initialThreat }: ThreatChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [threatInput, setThreatInput] = useState(initialThreat || "");
  const [hasAnalyzed, setHasAnalyzed] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialThreat) {
      setThreatInput(initialThreat);
    }
  }, [initialThreat]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const analyzeThreats = async () => {
    if (!threatInput.trim() || isStreaming) return;

    setIsStreaming(true);
    setHasAnalyzed(true);
    setMessages((prev) => [...prev, { role: "user", content: threatInput }]);
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    try {
      const response = await fetch("/api/ai/analyze-threat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threatDescription: threatInput, conversationId }),
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullContent = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.substring(6));
                if (data.conversationId && !conversationId) {
                  setConversationId(data.conversationId);
                }
                if (data.content) {
                  fullContent += data.content;
                  setMessages((prev) => {
                    const updated = [...prev];
                    updated[updated.length - 1] = { role: "assistant", content: fullContent };
                    return updated;
                  });
                }
                if (data.error) {
                  fullContent += `\n\nError: ${data.error}`;
                  setMessages((prev) => {
                    const updated = [...prev];
                    updated[updated.length - 1] = { role: "assistant", content: fullContent };
                    return updated;
                  });
                }
              } catch {
                // skip malformed JSON
              }
            }
          }
        }
      }
    } catch (err) {
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "assistant",
          content: "Failed to analyze threat. Please try again.",
        };
        return updated;
      });
    } finally {
      setIsStreaming(false);
      setThreatInput("");
    }
  };

  const sendFollowUp = async () => {
    if (!input.trim() || isStreaming || !conversationId) return;

    const userMsg = input.trim();
    setInput("");
    setIsStreaming(true);
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    try {
      const response = await fetch(`/api/ai/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: userMsg }),
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullContent = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.substring(6));
                if (data.content) {
                  fullContent += data.content;
                  setMessages((prev) => {
                    const updated = [...prev];
                    updated[updated.length - 1] = { role: "assistant", content: fullContent };
                    return updated;
                  });
                }
              } catch {
                // skip
              }
            }
          }
        }
      }
    } catch {
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "assistant",
          content: "Failed to send message. Please try again.",
        };
        return updated;
      });
    } finally {
      setIsStreaming(false);
    }
  };

  const startNewAnalysis = () => {
    setMessages([]);
    setConversationId(null);
    setHasAnalyzed(false);
    setThreatInput("");
    setInput("");
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: 400 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 400 }}
        className="fixed right-0 top-0 h-full w-full sm:w-[480px] z-50 flex flex-col bg-[#0a0f1a] border-l border-primary/20 shadow-2xl shadow-primary/10"
      >
        <div className="flex items-center justify-between p-4 border-b border-white/10 bg-black/40">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
              <Brain className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-display uppercase tracking-widest text-white">GuardianLayer AI</h2>
              <p className="text-[10px] text-muted-foreground">Threat Analysis & Remediation</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {hasAnalyzed && (
              <button
                onClick={startNewAnalysis}
                className="px-3 py-1.5 rounded-lg text-[10px] font-display uppercase tracking-wider border border-white/10 text-muted-foreground hover:border-primary/30 hover:text-primary transition-colors"
              >
                New Analysis
              </button>
            )}
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/5 transition-colors">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {!hasAnalyzed && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-primary/5 border border-primary/15">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span className="text-xs font-display uppercase tracking-widest text-primary">AI Threat Analyzer</span>
                </div>
                <p className="text-sm text-gray-300 mb-4">
                  Describe a security threat, alert, or breach and I'll analyze it using real-time threat intelligence. I'll tell you exactly what it is, who might be behind it, the consequences, and the exact steps to neutralize it and recover your assets.
                </p>
                <textarea
                  value={threatInput}
                  onChange={(e) => setThreatInput(e.target.value)}
                  placeholder="Describe the threat, alert, or suspicious activity..."
                  className="w-full p-3 rounded-lg bg-black/40 border border-white/10 text-sm text-white placeholder-gray-500 focus:border-primary/40 focus:outline-none resize-none"
                  rows={5}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      analyzeThreats();
                    }
                  }}
                />
                <button
                  onClick={analyzeThreats}
                  disabled={!threatInput.trim() || isStreaming}
                  className={clsx(
                    "mt-3 w-full px-4 py-2.5 rounded-lg text-xs font-display uppercase tracking-wider flex items-center justify-center gap-2 transition-colors",
                    threatInput.trim() && !isStreaming
                      ? "bg-primary/20 border border-primary/40 text-primary hover:bg-primary/30"
                      : "bg-white/5 border border-white/10 text-gray-500 cursor-not-allowed"
                  )}
                >
                  {isStreaming ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing...</>
                  ) : (
                    <><ShieldAlert className="w-4 h-4" /> Analyze Threat</>
                  )}
                </button>
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              className={clsx(
                "rounded-xl p-4",
                msg.role === "user"
                  ? "bg-primary/10 border border-primary/20 ml-8"
                  : "bg-white/[0.03] border border-white/5 mr-4"
              )}
            >
              <div className="flex items-center gap-2 mb-2">
                {msg.role === "user" ? (
                  <AlertTriangle className="w-3 h-3 text-primary" />
                ) : (
                  <Brain className="w-3 h-3 text-cyan-400" />
                )}
                <span className="text-[10px] font-display uppercase tracking-widest text-muted-foreground">
                  {msg.role === "user" ? "You" : "GuardianLayer AI"}
                </span>
              </div>
              <div className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed prose prose-invert prose-sm max-w-none">
                {msg.content || (
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="w-3 h-3 animate-spin" /> Thinking...
                  </span>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {hasAnalyzed && (
          <div className="p-4 border-t border-white/10 bg-black/40">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask a follow-up question..."
                className="flex-1 px-4 py-2.5 rounded-lg bg-black/40 border border-white/10 text-sm text-white placeholder-gray-500 focus:border-primary/40 focus:outline-none"
                onKeyDown={(e) => {
                  if (e.key === "Enter") sendFollowUp();
                }}
                disabled={isStreaming}
              />
              <button
                onClick={sendFollowUp}
                disabled={!input.trim() || isStreaming}
                className={clsx(
                  "p-2.5 rounded-lg transition-colors",
                  input.trim() && !isStreaming
                    ? "bg-primary/20 border border-primary/40 text-primary hover:bg-primary/30"
                    : "bg-white/5 border border-white/10 text-gray-500 cursor-not-allowed"
                )}
              >
                {isStreaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

export function ThreatChatButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-6 right-6 z-40 p-4 rounded-full bg-primary/20 border border-primary/40 text-primary hover:bg-primary/30 shadow-lg shadow-primary/20 transition-all hover:scale-105"
      title="AI Threat Analyzer"
    >
      <MessageCircle className="w-6 h-6" />
    </button>
  );
}
