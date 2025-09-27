import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/NewAuthContext";
import { DevProvider } from "@/contexts/DevContext";
import { AnimatedNotifications } from "@/components/ui/notification";
import ErrorBoundary from "@/components/ErrorBoundary";
import LandingPage from "@/components/LandingPage";
import TopNav from "@/components/TopNav";
import Auth from "@/pages/Auth";
import Welcome from "@/pages/Welcome";
import Dashboard from "@/pages/Dashboard";
import DashboardLayout from "@/pages/dashboard/DashboardLayout";
import Overview from "@/pages/dashboard/Overview";
import WalletPage from "@/pages/dashboard/Wallet";
import TransactionsPage from "@/pages/dashboard/Transactions";
import WatchlistPage from "@/pages/dashboard/Watchlist";
import SellRequestsPage from "@/pages/dashboard/SellRequests";
import PropertyDetailPage from "@/pages/dashboard/PropertyDetail";
import { Navigate } from "react-router-dom";
import WaitlistDashboard from "@/pages/WaitlistDashboard";
import WaitlistLayout from "@/pages/waitlist/WaitlistLayout";
import WaitlistOverview from "@/pages/waitlist/Overview";
import WaitlistWallet from "@/pages/waitlist/Wallet";
import WaitlistWatchlist from "@/pages/waitlist/Watchlist";
import WaitlistLearn from "@/pages/waitlist/Learn";
import WaitlistSupport from "@/pages/waitlist/Support";
import TrialExpired from "@/pages/TrialExpired";
import KYC from "@/pages/KYC";
import Properties from "@/pages/Properties";
import Investment from "@/pages/Investment";
import AdminRoute from "@/components/AdminRoute";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminUsers from "@/pages/admin/AdminUsers";
import AdminKYC from "@/pages/admin/AdminKYC";
import AdminProperties from "@/pages/admin/AdminProperties";
import AdminSupport from "@/pages/admin/AdminSupport";
import AdminInvestments from "@/pages/admin/AdminInvestments";
import AdminAddProperty from "@/pages/admin/AdminAddProperty";
import AdminShareTrading from "@/pages/admin/AdminShareTrading";
import AdminPropertyNotes from "@/pages/admin/AdminPropertyNotes";
import SalesAnalyticsDashboard from "@/pages/admin/SalesAnalyticsDashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();


const PageTitleManager = () => {
  const location = useLocation();
  const path = location.pathname;

  const computeTitle = () => {
    if (path === "/") return "Retreat Slice";
    if (path.startsWith("/auth")) return "Sign In · Retreat Slice";
    if (path.startsWith("/welcome")) return "Welcome · Retreat Slice";
    if (path.startsWith("/properties")) return "Properties · Retreat Slice";
    if (path.startsWith("/invest/")) return "Invest · Retreat Slice";
    if (path.startsWith("/dashboard")) return "Dashboard · Retreat Slice";
    if (path.startsWith("/waitlist-dashboard")) return "Waitlist · Retreat Slice";
    if (path.startsWith("/admin")) return "Admin · Retreat Slice";
    if (path.startsWith("/kyc")) return "KYC · Retreat Slice";
    if (path.startsWith("/trial-expired")) return "Trial Expired · Retreat Slice";
    return "Retreat Slice";
  };

  const title = computeTitle();
  if (typeof document !== 'undefined' && document.title !== title) {
    document.title = title;
  }
  return null;
};


const AppContent = () => {
  const { notifications } = useAuth();
  
  return (
    <>
      <Toaster />
      <Sonner />
      
      {/* Global Notifications */}
      <div className="fixed top-4 right-4 z-50 max-w-sm">
        <AnimatedNotifications 
          notifications={notifications} 
          className="h-auto max-h-[80vh] overflow-hidden"
        />
      </div>
      
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true
        }}
      >
        <PageTitleManager />
        <TopNav />
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/welcome" element={<Welcome />} />
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<Navigate to="overview" replace />} />
            <Route path="overview" element={<Overview />} />
            <Route path="wallet" element={<WalletPage />} />
            <Route path="transactions" element={<TransactionsPage />} />
            <Route path="sell-requests" element={<SellRequestsPage />} />
            <Route path="watchlist" element={<WatchlistPage />} />
            <Route path="p/:propertyId" element={<PropertyDetailPage />} />
          </Route>
          <Route path="/waitlist-dashboard" element={<WaitlistLayout />}>
            <Route index element={<Navigate to="overview" replace />} />
            <Route path="overview" element={<WaitlistOverview />} />
            <Route path="wallet" element={<WaitlistWallet />} />
            <Route path="watchlist" element={<WaitlistWatchlist />} />
            <Route path="learn" element={<WaitlistLearn />} />
            <Route path="support" element={<WaitlistSupport />} />
          </Route>
          <Route path="/trial-expired" element={<TrialExpired />} />
          <Route path="/kyc" element={<KYC />} />
          <Route path="/properties" element={<Properties />} />
          <Route path="/invest/:propertyId" element={<Investment />} />
          
          {/* Admin Routes */}
          <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
          <Route path="/admin/users" element={<AdminRoute><AdminUsers /></AdminRoute>} />
          <Route path="/admin/kyc" element={<AdminRoute><AdminKYC /></AdminRoute>} />
          <Route path="/admin/properties" element={<AdminRoute><AdminProperties /></AdminRoute>} />
          <Route path="/admin/properties/new" element={<AdminRoute><AdminAddProperty /></AdminRoute>} />
          <Route path="/admin/share-trading" element={<AdminRoute><AdminShareTrading /></AdminRoute>} />
          <Route path="/admin/support" element={<AdminRoute><AdminSupport /></AdminRoute>} />
          <Route path="/admin/investments" element={<AdminRoute><AdminInvestments /></AdminRoute>} />
          <Route path="/admin/property-notes" element={<AdminRoute><AdminPropertyNotes /></AdminRoute>} />
          <Route path="/admin/sales-analytics" element={<AdminRoute><SalesAnalyticsDashboard /></AdminRoute>} />
          
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </>
  );
};

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={0}>
        <DevProvider>
          <AuthProvider>
            <AppContent />
          </AuthProvider>
        </DevProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
