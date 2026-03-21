Please implement all of these fixes from a comprehensive security and bug audit:

**BUG FIX #1 - YubiKey page blank (React crash)**
  The /yubikey page renders completely blank. The component crashes because it destructures `fleet.devices` without null-guards when `/api/yubikey/fleet` returns an empty array. Fix: (a) add null-checks/default values when destructuring fleet data in the YubiKey component, (b) wrap the YubiKey page in a React error boundary so crashes don't blank the whole page, (c) fix the `/api/yubikey/fleet` endpoint to return actual device data aligned with `/api/yubikey/stats` (which says 8 total devices).
  
  **BUG FIX #2 - Router redirect: /lockdown → /emergency-lockdown**
  Navigating to /lockdown shows a 404. Add a redirect in the React router from /lockdown to /emergency-lockdown.
  
  **BUG FIX #3 - Router redirect: /threats → /threat-intel**
  Navigating to /threats shows a 404. Add a redirect in the React router from /threats to /threat-intel.
  
  **SECURITY FIX #1 - Add HTTP security headers using helmet**
  Install and configure the `helmet` npm package in the Express API server. Add it as the first middleware so all responses include: Content-Security-Policy, X-Frame-Options, X-Content-Type-Options, Strict-Transport-Security, Referrer-Policy, and Permissions-Policy headers.
  
  **SECURITY FIX #2 - Add authentication middleware**
  The entire API is publicly accessible with no auth. Implement JWT-based authentication:
- Install `jsonwebtoken` and `express-session` packages
  - Create a login endpoint: POST /api/auth/login (accepts username/password, returns JWT token)
  - Create a /api/auth/me endpoint to check current user
  - Create auth middleware that validates the JWT Bearer token on ALL /api/* routes (except /api/auth/login and /api/health)
  - Use demo credentials: username "admin" password "admin123" for now (we can change later)
  - Store the secret in an environment variable JWT_SECRET
  
  **SECURITY FIX #3 - Add a Login page and protect the frontend**
  - Create a /login page in the React app with a username/password form
  - Store the JWT token in localStorage after successful login
  - Add an auth context/hook that checks if user is logged in
  - Wrap the entire app router with an auth guard that redirects to /login if not authenticated
  - Add a logout button in the sidebar/header
  
  **SECURITY FIX #4 - Add rate limiting**
  Install `express-rate-limit` and apply rate limiting middleware to all API routes: max 100 requests per 15 minutes per IP. Apply a stricter limit of 10 requests per 15 minutes to the login endpoint to prevent brute force.
  
  **SECURITY FIX #5 - Add CSRF protection**
  For state-changing POST/PUT/DELETE endpoints, validate requests using the SameSite=Strict cookie attribute. Since we're using JWT in localStorage (not cookies), add an X-Requested-With header check as CSRF mitigation: the auth middleware should also verify that the request has `X-Requested-With: XMLHttpRequest` or a valid Origin header for non-GET requests.
  
  **SECURITY FIX #6 - Input validation**
  Install `zod` for input validation. Add validation to at minimum: the login endpoint (validate username and password are strings, non-empty), the alert creation endpoint, and any endpoint that accepts query params like `limit` (validate it's a number between 1-1000).
  
  Please implement all of these fixes. Start with the security fixes as they are highest priority, then the bug fixes.import { Switch, Route, Router as WouterRouter } from "wouter";
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
