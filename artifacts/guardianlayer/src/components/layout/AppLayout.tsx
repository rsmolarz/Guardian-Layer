import { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { GlobalJargonProvider } from "@/components/clarity/JargonTranslator";
import { LockdownBanner } from "./LockdownBanner";

export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground flex relative">
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-[-1]">
        <div className="absolute w-[800px] h-[800px] rounded-full bg-primary/5 blur-[120px] -top-96 -left-96" />
        <div className="absolute w-[600px] h-[600px] rounded-full bg-secondary/5 blur-[100px] top-1/2 right-0 translate-x-1/2" />
        <div className="w-full h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent absolute top-0 animate-[scanline_8s_linear_infinite]" />
      </div>
      
      <Sidebar />
      <main className="flex-1 ml-64 min-h-screen">
        <LockdownBanner />
        <div className="p-8">
          <div className="max-w-7xl mx-auto">
            <GlobalJargonProvider>
              {children}
            </GlobalJargonProvider>
          </div>
        </div>
      </main>
    </div>
  );
}
