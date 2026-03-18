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
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    }
  }
});

function Router() {
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
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
