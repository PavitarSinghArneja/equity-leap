import React, { useState } from 'react';
import { NavLink, useNavigate, Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useAdmin } from '@/hooks/useAdmin';
import { BarChart3, Menu, X } from 'lucide-react';

const LinkItem = ({ to, label, onClick }: { to: string; label: string; onClick?: () => void }) => (
  <NavLink
    to={to}
    onClick={onClick}
    className={({ isActive }) => `px-3 py-2 rounded-md text-sm font-medium transition-colors ${
      isActive ? 'bg-primary text-primary-foreground' : 'text-foreground/80 hover:bg-muted'
    }`}
  >
    {label}
  </NavLink>
);

const TopNav: React.FC = () => {
  const { user, profile, signOut } = useAuth();
  const { isAdmin } = useAdmin();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const isLanding = location.pathname === '/';
  const isAuth = location.pathname.startsWith('/auth');
  const isMinimal = isLanding || isAuth;
  const firstNameRaw = (profile?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || '').trim();
  const firstName = firstNameRaw ? firstNameRaw.charAt(0).toUpperCase() + firstNameRaw.slice(1) : '';

  const close = () => setOpen(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card/70 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <div className="container mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
          >
            <div className="w-8 h-8 hero-gradient rounded-lg flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-foreground">Retreat Slice</span>
          </Link>
          {!isMinimal && (
            <button className="md:hidden" onClick={() => setOpen((v) => !v)} aria-label="Toggle menu">
              {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          )}
        </div>

        {!isMinimal && (
        <nav className="hidden md:flex items-center gap-6 text-sm">
          <NavLink to="/welcome" className="text-foreground font-medium">Home</NavLink>
          <NavLink to="/properties" className="text-muted-foreground hover:text-foreground">Properties</NavLink>
          {isAdmin && (
            <NavLink to="/admin/support" className="text-muted-foreground hover:text-foreground">Support</NavLink>
          )}
          {profile?.subscription_active && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => navigate(profile?.tier === 'waitlist_player' ? '/waitlist-dashboard/overview' : '/dashboard/overview')} 
              className="ml-2"
            >
              Dashboard
            </Button>
          )}
        </nav>
        )}

        <div className="hidden md:flex items-center gap-3">
          {!isMinimal && isAdmin && user && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/admin')}
              className="border-orange-200 text-orange-700 hover:bg-orange-50 hover:text-orange-800 hover:border-orange-300"
            >
              Admin Panel
            </Button>
          )}
          {user ? (
            <>
              {firstName && (
                <span className="hidden sm:inline text-foreground font-medium">Welcome {firstName}</span>
              )}
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-white text-sm font-medium">
                  {profile?.full_name?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}
                </span>
              </div>
              <Button variant="ghost" size="sm" onClick={signOut} className="text-muted-foreground hover:text-foreground">
                Sign Out
              </Button>
            </>
          ) : (
            <Button size="sm" onClick={() => navigate('/auth')} className="bg-green-600 text-white hover:bg-green-700">
              Get Started
            </Button>
          )}
        </div>
      </div>

      {/* Mobile menu */}
      {!isLanding && open && (
        <div className="md:hidden border-t border-border bg-card">
          <div className="container mx-auto px-4 py-3 grid grid-cols-2 gap-2">
            <LinkItem to="/welcome" label="Home" onClick={close} />
            <LinkItem to="/properties" label="Properties" onClick={close} />
            {isAdmin && user && (
              <LinkItem to="/admin/support" label="Support" onClick={close} />
            )}
            {profile?.subscription_active && user && (
              <Button variant="outline" size="sm" onClick={() => { close(); navigate(profile?.tier === 'waitlist_player' ? '/waitlist-dashboard/overview' : '/dashboard/overview'); }}>
                Dashboard
              </Button>
            )}
            {isAdmin && user && (
              <Button variant="outline" size="sm" onClick={() => { close(); navigate('/admin'); }}>
                Admin Panel
              </Button>
            )}
            {user ? (
              <Button variant="ghost" size="sm" onClick={() => { close(); signOut(); }}>Sign Out</Button>
            ) : (
              <Button size="sm" className="bg-green-600 text-white hover:bg-green-700" onClick={() => { close(); navigate('/auth'); }}>Get Started</Button>
            )}
          </div>
      </div>
      )}
    </header>
  );
};

export default TopNav;
