import { useState, useEffect } from "react";
import { Download, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches;

    if (isStandalone) {
      setInstalled(true);
      return;
    }

    localStorage.removeItem("gl_pwa_dismissed");

    if (localStorage.getItem("gl_pwa_dismissed") === "true") {
      setDismissed(true);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const installedHandler = () => setInstalled(true);

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", installedHandler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installedHandler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setInstalled(true);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem("gl_pwa_dismissed", "true");
  };

  if (installed || dismissed || !deferredPrompt) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="fixed bottom-6 right-6 z-50 max-w-sm"
      >
        <div className="glass-panel p-4 border border-cyan-500/30 shadow-[0_0_20px_rgba(0,240,255,0.15)]">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-violet-600 flex items-center justify-center shrink-0">
              <Download className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-display text-sm text-white mb-1">Install GuardianLayer</div>
              <p className="text-xs text-muted-foreground mb-3">
                Add to your taskbar for quick access. Works like a desktop app.
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleInstall}
                  className="px-3 py-1.5 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-xs font-display uppercase tracking-wider hover:bg-cyan-500/30 transition-colors"
                >
                  Install
                </button>
                <button
                  onClick={handleDismiss}
                  className="px-3 py-1.5 rounded-lg text-muted-foreground text-xs hover:text-white transition-colors"
                >
                  Not now
                </button>
              </div>
            </div>
            <button onClick={handleDismiss} className="text-muted-foreground hover:text-white transition-colors p-1">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
