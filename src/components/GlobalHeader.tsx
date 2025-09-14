import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAdmin } from '@/hooks/useAdmin';
import { 
  BarChart3, 
  Home,
  LogOut,
  Settings,
  Crown,
  RefreshCw
} from 'lucide-react';

interface GlobalHeaderProps {
  title?: string;
  subtitle?: string;
  showBackButton?: boolean;
  backTo?: string;
  children?: React.ReactNode;
}

const GlobalHeader = ({ 
  title = "Retreat Slice", 
  subtitle,
  showBackButton = false,
  backTo = "/welcome",
  children 
}: GlobalHeaderProps) => {
  const { user, profile, signOut, refreshProfile } = useAuth();
  const { isAdmin } = useAdmin();
  const navigate = useNavigate();
  const location = useLocation();

  const isAdminPage = location.pathname.startsWith('/admin');

  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        {/* Left side - Logo and title */}
        <div className="flex items-center space-x-3">
          {showBackButton && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(backTo)}
              className="text-muted-foreground hover:text-foreground mr-2"
            >
              ←
            </Button>
          )}
          
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="w-8 h-8 hero-gradient rounded-lg flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-xl font-bold text-foreground group-hover:text-primary transition-colors">{title}</span>
              {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
            </div>
          </Link>
          
          {isAdminPage && (
            <Badge variant="secondary" className="ml-2">Admin Panel</Badge>
          )}
        </div>

        {/* Center - Custom content */}
        <div className="flex-1 flex justify-center">
          {children}
        </div>

        {/* Right side - Navigation and user menu */}
        <div className="flex items-center space-x-4">
          {/* Main navigation - only show if not on admin pages */}
          {!isAdminPage && (
            <nav className="hidden md:flex items-center space-x-4 text-sm">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/welcome')}
                className="text-muted-foreground hover:text-foreground"
              >
                <Home className="w-4 h-4 mr-1" />
                Home
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/properties')}
                className="text-muted-foreground hover:text-foreground"
              >
                Properties
              </Button>
              
              {isAdmin && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/admin/support')}
                  className="text-muted-foreground hover:text-foreground"
                >
                  Support
                </Button>
              )}
              
              {profile?.subscription_active && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (profile?.tier === 'waitlist_player' && profile?.subscription_active) {
                      navigate('/waitlist-dashboard/overview');
                    } else {
                      navigate('/dashboard/overview');
                    }
                  }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  Dashboard
                </Button>
              )}
            </nav>
          )}


          {/* Admin Panel Access - Show globally for admins */}
          {isAdmin && !isAdminPage && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/admin')}
              className="border-orange-200 text-orange-700 hover:bg-orange-50 hover:text-orange-800 hover:border-orange-300"
            >
              <Crown className="w-4 h-4 mr-2" />
              Admin Panel
            </Button>
          )}


          {/* User Profile */}
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-white text-sm font-medium">
                {profile?.full_name?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}
              </span>
            </div>
            
            <Button 
              variant="ghost" 
              size="sm"
              onClick={signOut}
              className="text-muted-foreground hover:text-foreground"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default GlobalHeader;
