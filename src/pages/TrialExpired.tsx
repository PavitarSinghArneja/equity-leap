import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAdmin } from '@/hooks/useAdmin';
import { Clock, CreditCard, LogOut, BarChart3 } from 'lucide-react';

const TrialExpired = () => {
  const { signOut, profile, user } = useAuth();
  const navigate = useNavigate();
  const { isAdmin } = useAdmin();

  // Check if users shouldn't be on this page
  useEffect(() => {
    if (!user || !profile) return;

    // Check if non-admin users somehow got here but shouldn't be
    if (profile.subscription_active) {
      if (profile.tier === 'waitlist_player') {
        navigate('/waitlist-dashboard');
      } else {
        navigate('/dashboard');
      }
    }
  }, [navigate, user, profile]);

  const handleUpgradeToPremium = () => {
    // TODO: Implement Razorpay integration
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 hero-gradient rounded-lg flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-foreground">EquityLeap</span>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-4">
            </div>
            
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

      <div className="flex items-center justify-center p-4 mt-16">
      <Card className="investment-card max-w-md w-full text-center">
        <CardHeader>
          <div className="w-16 h-16 bg-warning/20 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Clock className="w-8 h-8 text-warning" />
          </div>
          <CardTitle className="text-2xl">Trial Expired</CardTitle>
          <CardDescription className="text-lg">
            Your 14-day trial has ended. Please pay to continue using the platform.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground mb-6">
            Hi {profile?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'there'}, 
            your free trial period has ended. Upgrade to continue accessing EquityLeap's investment platform.
          </div>
          
          <Button 
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-12 text-base"
            onClick={handleUpgradeToPremium}
          >
            <CreditCard className="w-4 h-4 mr-2" />
            Upgrade to Premium
          </Button>
          
          <div className="text-xs text-muted-foreground mt-4">
            Questions? Contact our support team for assistance.
          </div>
          
          <Button 
            variant="ghost" 
            onClick={signOut} 
            className="w-full mt-2"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </CardContent>
      </Card>
      </div>
    </div>
  );
};

export default TrialExpired;