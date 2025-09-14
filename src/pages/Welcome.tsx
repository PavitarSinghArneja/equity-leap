import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAdmin } from '@/hooks/useAdmin';
import { 
  BarChart3, 
  TrendingUp, 
  Building2, 
  GraduationCap, 
  Scale, 
  Mail,
  Crown,
  Bell,
  LogOut,
  Clock
} from 'lucide-react';

const Welcome = () => {
  const { user, profile, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const { isAdmin } = useAdmin();

  useEffect(() => {
    // Wait for auth to finish loading
    if (loading) return;

    // Redirect unauthenticated users to auth page
    if (!user) {
      navigate('/auth');
      return;
    }

    if (!profile) return;

    // Check if trial has expired for unpaid users
    if (!profile.subscription_active) {
      const trialExpires = new Date(profile.trial_expires_at);
      const now = new Date();

      if (now > trialExpires) {
        navigate('/trial-expired');
        return;
      }
    }
  }, [user, profile, navigate]);

  const getTrialDaysLeft = () => {
    if (!profile || profile.subscription_active) return null;
    const trialExpires = new Date(profile.trial_expires_at);
    const now = new Date();
    const diffTime = trialExpires.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  const handleDashboardClick = () => {
    // Route to different dashboards based on user tier
    if (profile?.tier === 'waitlist_player' && profile?.subscription_active) {
      navigate('/waitlist-dashboard/overview');
    } else {
      navigate('/dashboard/overview');
    }
  };

  // Show loading state while authentication is being checked
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render anything if user is not authenticated (will redirect)
  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* TopNav is global; remove page header */}

      {/* Main Content */}
      <div className="container mx-auto px-4 py-12 max-w-6xl">
        {/* Welcome Section */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-foreground mb-4">
            Welcome, {profile?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'Investor'}!
          </h1>
          
          {profile?.subscription_active ? (
            <p className="text-lg text-muted-foreground mb-6">
              Welcome back to your premium Retreat Slice account. Your exclusive features are now unlocked.
            </p>
          ) : (
            <>
              <p className="text-lg text-muted-foreground mb-6">
                Your complimentary 14-day trial is active. Explore our features and upgrade to unlock your full investment potential.
              </p>
              
              {getTrialDaysLeft() !== null && (
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span>{getTrialDaysLeft()} Days Left</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {/* Wealth Projector */}
          <Card className="investment-card hover:shadow-lg transition-all duration-200">
            <CardHeader className="pb-4">
              <div className="w-12 h-12 hero-gradient rounded-xl flex items-center justify-center mb-4">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <CardTitle className="text-xl">Wealth Projector</CardTitle>
              <CardDescription className="text-sm">
                Estimate your potential returns and project your investment growth over time.
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Browse Properties */}
          <Card className="investment-card hover:shadow-lg transition-all duration-200">
            <CardHeader className="pb-4">
              <div className="w-12 h-12 hero-gradient rounded-xl flex items-center justify-center mb-4">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <CardTitle className="text-xl">Browse Properties</CardTitle>
              <CardDescription className="text-sm">
                View our portfolio of available properties. Full details are available upon upgrade.
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Educational Seminars */}
          <Card className="investment-card hover:shadow-lg transition-all duration-200">
            <CardHeader className="pb-4">
              <div className="w-12 h-12 hero-gradient rounded-xl flex items-center justify-center mb-4">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              <CardTitle className="text-xl">Educational Seminars</CardTitle>
              <CardDescription className="text-sm">
                Access our library of webinars and articles to sharpen your investment knowledge.
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Legal Assistance */}
          <Card className="investment-card hover:shadow-lg transition-all duration-200">
            <CardHeader className="pb-4">
              <div className="w-12 h-12 hero-gradient rounded-xl flex items-center justify-center mb-4">
                <Scale className="w-6 h-6 text-white" />
              </div>
              <CardTitle className="text-xl">Legal Assistance</CardTitle>
              <CardDescription className="text-sm">
                Get guidance on the legal aspects of fractional property investment.
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Email Support */}
          <Card className="investment-card hover:shadow-lg transition-all duration-200">
            <CardHeader className="pb-4">
              <div className="w-12 h-12 hero-gradient rounded-xl flex items-center justify-center mb-4">
                <Mail className="w-6 h-6 text-white" />
              </div>
              <CardTitle className="text-xl">Email Support</CardTitle>
              <CardDescription className="text-sm">
                Have questions? Our dedicated support team is here to assist you via email.
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Upgrade Account - Only show for unpaid users */}
          {!profile?.subscription_active && (
            <Card className="investment-card hover:shadow-lg transition-all duration-200 border-primary/20 bg-primary/5">
              <CardHeader className="pb-4">
                <div className="w-12 h-12 hero-gradient rounded-xl flex items-center justify-center mb-4">
                  <Crown className="w-6 h-6 text-white" />
                </div>
                <CardTitle className="text-xl">Upgrade Account</CardTitle>
                <CardDescription className="text-sm">
                  Unlock full access to property investments, advanced tools, and premium support.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <Button 
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                  onClick={() => {
                    // TODO: Implement Razorpay integration
                  }}
                >
                  Upgrade to Premium
                </Button>
              </CardContent>
            </Card>
          )}
          
          {/* Premium Dashboard Access - Only show for paid users */}
          {profile?.subscription_active && (
            <Card className="investment-card hover:shadow-lg transition-all duration-200 border-success/20 bg-success/5">
              <CardHeader className="pb-4">
                <div className="w-12 h-12 hero-gradient rounded-xl flex items-center justify-center mb-4">
                  <BarChart3 className="w-6 h-6 text-white" />
                </div>
                <CardTitle className="text-xl">Premium Dashboard</CardTitle>
                <CardDescription className="text-sm">
                  Access your investment dashboard with advanced analytics and portfolio management.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <Button 
                  className="w-full bg-success text-success-foreground hover:bg-success/90"
                  onClick={handleDashboardClick}
                >
                  Open Dashboard
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

      </div>
    </div>
  );
};

export default Welcome;
