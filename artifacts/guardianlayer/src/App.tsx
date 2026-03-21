import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import { AppLayout } from "@/components/layout/AppLayout";
import Dashboard from "@/pages/Dashboard";
import Transactions from "@/pages/Transactions";
import Approvals from "@/pages/Approvals";
import Alerts from "@/pages/Alerts";
import EmailSecurity from "@/pages/EmailSecurity";
import EndpointSecurity from "@/pages/EndpointSecurity";
import NetworkSecurity from "@/pages/NetworkSecurity";
import YubikeySecurity from "@/pages/YubikeySecurity";
import OpenclawMonitor from "@/pages/OpenclawMonitor";
import Integrations from "@/pages/Integrations";
import Monitoring from "@/pages/Monitoring";
import DarkWebMonitor from "@/pages/DarkWebMonitor";
import Recovery from "@/pages/Recovery";
import DisasterRecovery from "@/pages/DisasterRecovery";
import ThreatNeutralization from "@/pages/ThreatNeutralization";
import Glossary from "@/pages/Glossary";
import Backups from "@/pages/Backups";
import EmergencyLockdown from "@/pages/EmergencyLockdown";
import WorkspaceMonitor from "@/pages/WorkspaceMonitor";
import ThreatIntel from "@/pages/ThreatIntel";
import BreachResponse from "@/pages/BreachResponse";
import ApiDeck from "@/pages/ApiDeck";
import AlertCenter from "@/pages/AlertCenter";
import SecuritySettings from "@/pages/SecuritySettings";
import SelfScanner from "@/pages/SelfScanner";
import DomainMonitor from "@/pages/DomainMonitor";
import SecureVault from "@/pages/SecureVault";
import ThreatDetection from "@/pages/ThreatDetection";
import NotFound from "@/pages/not-found";
import { QuickHelp } from "@/components/clarity/QuickHelp";
import { ThreatChat, ThreatChatButton } from "@/components/ThreatChat";
import { AlertProvider } from "@/components/AlertSystem";
import { SecurityAgent } from "@/components/SecurityAgent";
import { useLocation } from "wouter";
import { useState } from "react";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    }
  }
});

function QuickHelpWrapper() {
  const [location] = useLocation();
  return <QuickHelp currentPath={location} />;
}

function Router() {
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/transactions" component={Transactions} />
        <Route path="/approvals" component={Approvals} />
        <Route path="/alerts" component={Alerts} />
        <Route path="/email-security" component={EmailSecurity} />
        <Route path="/endpoints" component={EndpointSecurity} />
        <Route path="/network" component={NetworkSecurity} />
        <Route path="/yubikey" component={YubikeySecurity} />
        <Route path="/openclaw" component={OpenclawMonitor} />
        <Route path="/integrations" component={Integrations} />
        <Route path="/monitoring" component={Monitoring} />
        <Route path="/dark-web" component={DarkWebMonitor} />
        <Route path="/recovery" component={Recovery} />
        <Route path="/disaster-recovery" component={DisasterRecovery} />
        <Route path="/threat-neutralization" component={ThreatNeutralization} />
        <Route path="/glossary" component={Glossary} />
        <Route path="/backups" component={Backups} />
        <Route path="/emergency-lockdown" component={EmergencyLockdown} />
        <Route path="/workspace-monitor" component={WorkspaceMonitor} />
        <Route path="/threat-intel" component={ThreatIntel} />
        <Route path="/breach-response" component={BreachResponse} />
        <Route path="/api-gateway" component={ApiDeck} />
        <Route path="/alert-center" component={AlertCenter} />
        <Route path="/security-settings" component={SecuritySettings} />
        <Route path="/self-scanner" component={SelfScanner} />
        <Route path="/domain-monitor" component={DomainMonitor} />
        <Route path="/secure-vault" component={SecureVault} />
        <Route path="/threat-detection" component={ThreatDetection} />
        <Route component={NotFound} />
      </Switch>
      <QuickHelpWrapper />
      <SecurityAgent />
      <ThreatChatButton onClick={() => setChatOpen(true)} />
      <ThreatChat isOpen={chatOpen} onClose={() => setChatOpen(false)} />
    </AppLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AlertProvider>
            <Router />
          </AlertProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
