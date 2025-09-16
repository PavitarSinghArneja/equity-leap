import React, { useEffect, useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/NewAuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  LayoutGrid,
  Wallet,
  ListOrdered,
  Heart,
  Store,
  LogOut,
  Building2,
  ChevronDown,
  Menu,
  X,
} from 'lucide-react';

interface InvestmentWithProperty {
  id: string;
  property_id: string;
  shares_owned: number;
  properties: {
    id: string;
    title: string;
    city: string | null;
    country: string | null;
    shares_sellable?: boolean | null;
  } | null;
}

const SidebarLink: React.FC<{ to: string; icon: React.ReactNode; label: string }> = ({ to, icon, label }) => {
  return (
    <NavLink
      to={to}
      className={({ isActive }) => `flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
        isActive ? 'bg-primary text-primary-foreground' : 'text-foreground/80 hover:bg-muted'
      }`}
    >
      {icon}
      <span className="truncate">{label}</span>
    </NavLink>
  );
};

const DashboardLayout: React.FC = () => {
  const { user, profile, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [investments, setInvestments] = useState<InvestmentWithProperty[]>([]);
  const [loading, setLoading] = useState(false);
  const [openMyProps, setOpenMyProps] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    // Basic access control similar to legacy Dashboard routing
    if (profile) {
      const tier = profile.tier as string | undefined;
      if (tier === 'waitlist_player') {
        navigate('/waitlist-dashboard');
        return;
      }
      if (tier === 'explorer') {
        // If admin override is active, always send explorer to welcome
        if (profile.tier_override_by_admin) {
          navigate('/welcome');
          return;
        }
        // Otherwise apply trial gating
        if (!profile.subscription_active && profile.trial_expires_at) {
          const now = new Date();
          const trial = new Date(profile.trial_expires_at);
          if (now > trial) {
            navigate('/trial-expired');
            return;
          }
        }
        navigate('/welcome');
        return;
      }
    }
    const fetch = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('investments')
          .select(`
            id,
            property_id,
            shares_owned,
            properties:properties(id, title, city, country, shares_sellable)
          `)
          .eq('user_id', user.id)
          .eq('investment_status', 'confirmed');
        if (error) throw error;
        setInvestments((data || []) as unknown as InvestmentWithProperty[]);
      } catch (e) {
        console.error('Failed to load user investments', e);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [user, navigate]);

  const propertyLinks = useMemo(() => {
    // De-duplicate by property_id (user may have multiple records over time)
    const map = new Map<string, InvestmentWithProperty>();
    investments.forEach((inv) => {
      if (!map.has(inv.property_id)) map.set(inv.property_id, inv);
    });
    return Array.from(map.values());
  }, [investments]);

  const SidebarContent = () => (
    <div className="space-y-6">
      {/* Navigation */}
      <nav className="space-y-2">
        <SidebarLink
          to="/dashboard/overview"
          icon={<LayoutGrid className="w-4 h-4" />}
          label="Overview"
        />
        <SidebarLink
          to="/dashboard/wallet"
          icon={<Wallet className="w-4 h-4" />}
          label="Wallet"
        />
        <SidebarLink
          to="/dashboard/transactions"
          icon={<ListOrdered className="w-4 h-4" />}
          label="Transactions"
        />
        <SidebarLink
          to="/dashboard/sell-requests"
          icon={<Store className="w-4 h-4" />}
          label="Sell Requests"
        />
        <SidebarLink
          to="/dashboard/watchlist"
          icon={<Heart className="w-4 h-4" />}
          label="Watchlist"
        />
      </nav>

      {/* My Properties */}
      {propertyLinks.length > 0 && (
        <div>
          <button
            onClick={() => setOpenMyProps(!openMyProps)}
            className="flex items-center justify-between w-full text-sm font-medium text-foreground/80 hover:text-foreground mb-2"
          >
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              My Properties
            </div>
            <ChevronDown
              className={`w-4 h-4 transition-transform ${
                openMyProps ? 'rotate-180' : ''
              }`}
            />
          </button>
          {openMyProps && (
            <div className="space-y-1 ml-6">
              {propertyLinks.map((investment) => (
                <SidebarLink
                  key={investment.property_id}
                  to={`/dashboard/p/${investment.property_id}`}
                  icon={<Building2 className="w-3 h-3" />}
                  label={
                    investment.properties?.title
                      ? `${investment.properties.title.slice(0, 20)}${
                          investment.properties.title.length > 20 ? '...' : ''
                        }`
                      : 'Unknown Property'
                  }
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Sign Out */}
      <button
        onClick={signOut}
        className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-foreground/80 hover:bg-muted hover:text-foreground transition-colors w-full"
      >
        <LogOut className="w-4 h-4" />
        <span>Sign Out</span>
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      {/* Mobile Menu Button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-md bg-card border border-border"
      >
        {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 border-r border-border bg-card/50 backdrop-blur-sm flex-shrink-0">
        <div className="p-6 w-full">
          <SidebarContent />
        </div>
      </aside>

      {/* Mobile Sidebar */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="relative w-64 bg-card border-r border-border">
            <div className="p-6">
              <SidebarContent />
            </div>
          </aside>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 overflow-hidden lg:ml-0">
        <div className="lg:hidden h-16" /> {/* Spacer for mobile menu button */}
        <Outlet />
      </main>
    </div>
  );
};

export default DashboardLayout;
