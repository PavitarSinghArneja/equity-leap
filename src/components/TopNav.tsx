import React, { useState } from 'react';
import { NavLink, useNavigate, Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/NewAuthContext';
import { useAdmin } from '@/hooks/useNewAdmin';
import { Hotel, Menu, X, Bell } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useUserAlerts } from '@/hooks/useUserAlerts';

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
  const { alerts, unreadCount, markRead, markAllRead } = useUserAlerts();

  const close = () => setOpen(false);

  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-lg border-b border-border shadow-sm">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
          >
            <div className="w-10 h-10 bg-gradient-to-br from-primary via-primary-light to-secondary rounded-lg flex items-center justify-center shadow-lg shadow-primary/20">
              <Hotel className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-foreground">Retreat Slice</span>
          </Link>
          {!isMinimal && (
            <button className="md:hidden" onClick={() => setOpen((v) => !v)} aria-label="Toggle menu">
              {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          )}
        </div>

        {!isMinimal && (
        <nav className="hidden md:flex items-center gap-8">
          <NavLink to="/welcome" className={({ isActive }) => `text-foreground hover:text-primary transition-colors font-medium ${isActive ? 'text-primary' : ''}`}>Home</NavLink>
          <NavLink to="/properties" className={({ isActive }) => `text-foreground hover:text-primary transition-colors font-medium ${isActive ? 'text-primary' : ''}`}>Properties</NavLink>
          {profile?.tier && ['waitlist_player', 'small_investor', 'large_investor'].includes(profile.tier) && (
            <NavLink to="/trading" className={({ isActive }) => `text-foreground hover:text-primary transition-colors font-medium ${isActive ? 'text-primary' : ''}`}>Trading</NavLink>
          )}
          {isAdmin && (
            <NavLink to="/admin/support" className={({ isActive }) => `text-foreground hover:text-primary transition-colors font-medium ${isActive ? 'text-primary' : ''}`}>Support</NavLink>
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
          {user && (
            <Popover>
              <PopoverTrigger asChild>
                <button className="relative p-2 rounded-md hover:bg-muted" aria-label="Notifications">
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                      {unreadCount}
                    </span>
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0" align="end">
                <div className="p-3 border-b font-medium flex items-center justify-between">
                  <span>Notifications</span>
                  {alerts.length > 0 && (
                    <button onClick={markAllRead} className="text-xs text-primary hover:underline">Mark all read</button>
                  )}
                </div>
                <div className="max-h-80 overflow-auto">
                  {alerts.length === 0 ? (
                    <div className="p-4 text-sm text-muted-foreground">No notifications</div>
                  ) : (
                    alerts.map(a => (
                      <button key={a.id} onClick={() => markRead(a.id)} className={`w-full text-left p-3 border-b hover:bg-muted ${a.is_read ? 'opacity-70' : ''}`}>
                        <div className="text-sm font-medium">{a.title}</div>
                        <div className="text-xs text-muted-foreground">{a.message}</div>
                      </button>
                    ))
                  )}
                </div>
              </PopoverContent>
            </Popover>
          )}
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
            <Button size="sm" onClick={() => navigate('/auth')} className="bg-gradient-to-r from-primary to-primary-light hover:from-primary-light hover:to-primary shadow-lg shadow-primary/30">
              Get Started
            </Button>
          )}
        </div>
      </div>

      {/* Mobile menu */}
      {!isLanding && open && (
        <div className="md:hidden border-t border-border bg-background">
          <div className="container mx-auto px-4 py-3 grid grid-cols-2 gap-2">
            <LinkItem to="/welcome" label="Home" onClick={close} />
            <LinkItem to="/properties" label="Properties" onClick={close} />
            {profile?.tier && ['waitlist_player', 'small_investor', 'large_investor'].includes(profile.tier) && (
              <LinkItem to="/trading" label="Trading" onClick={close} />
            )}
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
              <Button size="sm" className="bg-gradient-to-r from-primary to-primary-light hover:from-primary-light hover:to-primary shadow-lg shadow-primary/30" onClick={() => { close(); navigate('/auth'); }}>Get Started</Button>
            )}
          </div>
      </div>
      )}
    </header>
  );
};

export default TopNav;
