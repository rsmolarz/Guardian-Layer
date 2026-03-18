import { AlertTriangle } from "lucide-react";

export function CyberError({ title = "SYSTEM FAULT", message = "Unable to establish secure connection to the mainframe." }: { title?: string, message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] w-full p-8">
      <div className="glass-panel p-8 rounded-2xl border-rose-500/30 max-w-md w-full text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-rose-500 shadow-[0_0_15px_rgba(244,63,94,1)]" />
        <AlertTriangle className="w-16 h-16 text-rose-500 mx-auto mb-6 animate-pulse-glow" />
        <h3 className="text-xl font-display text-rose-400 mb-2">{title}</h3>
        <p className="text-muted-foreground font-mono text-sm">{message}</p>
        <div className="mt-6 p-3 bg-black/50 rounded font-mono text-xs text-rose-500/70 border border-rose-500/10 text-left overflow-x-auto">
          ERR_CONNECTION_REFUSED<br/>
          NODE: GL_ENTERPRISE_API<br/>
          STATUS: OFFLINE
        </div>
      </div>
    </div>
  );
}
