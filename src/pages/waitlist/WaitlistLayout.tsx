import React, { useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/NewAuthContext';
import { Building2, Heart } from 'lucide-react';

const LinkItem = ({ to, icon: Icon, label }: { to: string; icon: any; label: string }) => (
  <NavLink
    to={to}
    className={({ isActive }) => `flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
      isActive ? 'bg-primary text-primary-foreground' : 'text-foreground/80 hover:bg-muted'
    }`}
  >
    <Icon className="w-4 h-4" />
    <span className="truncate">{label}</span>
  </NavLink>
);

const WaitlistLayout: React.FC = () => {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading) {
      if (!user) return navigate('/auth');
      if (profile?.tier !== 'waitlist_player') return navigate('/dashboard/overview');
    }
  }, [user, profile, loading, navigate]);

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      <aside className="w-64 border-r border-border bg-card/60 backdrop-blur-sm flex flex-col custom-scrollbar">
        <nav className="flex-1 overflow-y-auto px-3 py-6 space-y-2">
          <LinkItem to="/waitlist-dashboard/overview" icon={Building2} label="Overview" />
          <LinkItem to="/waitlist-dashboard/watchlist" icon={Heart} label="Watchlist" />
        </nav>
      </aside>
      <main className="flex-1 min-w-0">
        <Outlet />
      </main>
    </div>
  );
};

export default WaitlistLayout;
