import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { lazy, Suspense } from "react";

import { AppLayout } from "@/components/layout/AppLayout";
import { PWAInstallPrompt } from "@/components/ui/PWAInstallPrompt";
import { QuickHelp } from "@/components/clarity/QuickHelp";
import { ThreatChat, ThreatChatButton } from "@/components/ThreatChat";
import { AlertProvider } from "@/components/AlertSystem";
import { SecurityAgent } from "@/components/SecurityAgent";
import { AuthProvider, useAuth } from "@/lib/auth";
import Login from "@/pages/Login";
import { useLocation } from "wouter";
import { useState } from "react";

import Dashboard from "@/pages/Dashboard";

const Transactions = lazy(() => import("@/pages/Transactions"));
const Approvals = lazy(() => import("@/pages/Approvals"));
const Alerts = lazy(() => import("@/pages/Alerts"));
const EmailSecurity = lazy(() => import("@/pages/EmailSecurity"));
const EndpointSecurity = lazy(() => import("@/pages/EndpointSecurity"));
const NetworkSecurity = lazy(() => import("@/pages/NetworkSecurity"));
const YubikeySecurity = lazy(() => import("@/pages/YubikeySecurity"));
const OpenclawMonitor = lazy(() => import("@/pages/OpenclawMonitor"));
const Integrations = lazy(() => import("@/pages/Integrations"));
const Monitoring = lazy(() => import("@/pages/Monitoring"));
const DarkWebMonitor = lazy(() => import("@/pages/DarkWebMonitor"));
const Recovery = lazy(() => import("@/pages/Recovery"));
const DisasterRecovery = lazy(() => import("@/pages/DisasterRecovery"));
const ThreatNeutralization = lazy(() => import("@/pages/ThreatNeutralization"));
const Glossary = lazy(() => import("@/pages/Glossary"));
const Backups = lazy(() => import("@/pages/Backups"));
const EmergencyLockdown = lazy(() => import("@/pages/EmergencyLockdown"));
const WorkspaceMonitor = lazy(() => import("@/pages/WorkspaceMonitor"));
const ThreatIntel = lazy(() => import("@/pages/ThreatIntel"));
const BreachResponse = lazy(() => import("@/pages/BreachResponse"));
const ApiDeck = lazy(() => import("@/pages/ApiDeck"));
const AlertCenter = lazy(() => import("@/pages/AlertCenter"));
const SecuritySettings = lazy(() => import("@/pages/SecuritySettings"));
const SelfScanner = lazy(() => import("@/pages/SelfScanner"));
const DomainMonitor = lazy(() => import("@/pages/DomainMonitor"));
const SecureVault = lazy(() => import("@/pages/SecureVault"));
const ThreatDetection = lazy(() => import("@/pages/ThreatDetection"));
const UserManagement = lazy(() => import("@/pages/UserManagement"));
const VirusMalwareScanner = lazy(() => import("@/pages/VirusMalwareScanner"));
const TravelSecurity = lazy(() => import("@/pages/TravelSecurity"));
const RemoteMaintenance = lazy(() => import("@/pages/RemoteMaintenance"));
const AppFleetMonitor = lazy(() => import("@/pages/AppFleetMonitor"));
const CreditProtection = lazy(() => import("@/pages/CreditProtection"));
const ApertureMonitor = lazy(() => import("@/pages/ApertureMonitor"));
const DevOpsControlPlane = lazy(() => import("@/pages/DevOpsControlPlane"));
const NodeDiagnostics = lazy(() => import("@/pages/NodeDiagnostics"));
const VientMonitor = lazy(() => import("@/pages/VientMonitor"));
const EDRDashboard = lazy(() => import("@/pages/EDRDashboard"));
const SIEMDashboard = lazy(() => import("@/pages/SIEMDashboard"));
const VulnerabilityScanner = lazy(() => import("@/pages/VulnerabilityScanner"));
const PasswordManager = lazy(() => import("@/pages/PasswordManager"));
const DNSFiltering = lazy(() => import("@/pages/DNSFiltering"));
const EmailGateway = lazy(() => import("@/pages/EmailGateway"));
const BackupSolution = lazy(() => import("@/pages/BackupSolution"));
const MDMDashboard = lazy(() => import("@/pages/MDMDashboard"));
const NotFound = lazy(() => import("@/pages/not-found"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 3,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
      staleTime: 30000,
    }
  }
});

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[40vh]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin" />
        <span className="text-sm text-gray-500 font-mono">Loading module...</span>
      </div>
    </div>
  );
}

function QuickHelpWrapper() {
  const [location] = useLocation();
  return <QuickHelp currentPath={location} />;
}

function ProtectedRouter() {
  const [chatOpen, setChatOpen] = useState(false);
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-cyan-400 text-lg animate-pulse">Initializing GuardianLayer...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  return (
    <AppLayout>
      <Suspense fallback={<PageLoader />}>
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
          <Route path="/virus-scanner" component={VirusMalwareScanner} />
          <Route path="/travel-security" component={TravelSecurity} />
          <Route path="/remote-maintenance" component={RemoteMaintenance} />
          <Route path="/app-fleet" component={AppFleetMonitor} />
          <Route path="/credit-protection" component={CreditProtection} />
          <Route path="/aperture" component={ApertureMonitor} />
          <Route path="/devops" component={DevOpsControlPlane} />
          <Route path="/node-diagnostics" component={NodeDiagnostics} />
          <Route path="/vient-monitor" component={VientMonitor} />
          <Route path="/edr" component={EDRDashboard} />
          <Route path="/siem" component={SIEMDashboard} />
          <Route path="/vulnerability-scanner" component={VulnerabilityScanner} />
          <Route path="/password-manager" component={PasswordManager} />
          <Route path="/dns-filtering" component={DNSFiltering} />
          <Route path="/email-gateway" component={EmailGateway} />
          <Route path="/backup-solution" component={BackupSolution} />
          <Route path="/mdm" component={MDMDashboard} />
          <Route path="/user-management">{() =>
            user?.role === "superadmin" ? <UserManagement /> : <Redirect to="/" />
          }</Route>
          <Route path="/login">{() => <Redirect to="/" />}</Route>
          <Route path="/lockdown">{() => <Redirect to="/emergency-lockdown" />}</Route>
          <Route component={NotFound} />
        </Switch>
      </Suspense>
      <QuickHelpWrapper />
      <SecurityAgent />
      <PWAInstallPrompt />
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
          <AuthProvider>
            <AlertProvider>
              <ProtectedRouter />
            </AlertProvider>
          </AuthProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
