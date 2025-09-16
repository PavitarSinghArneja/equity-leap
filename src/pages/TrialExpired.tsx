import { useAuth } from '@/contexts/NewAuthContext';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, CreditCard, LogOut } from 'lucide-react';

const TrialExpired = () => {
  const { signOut, profile, user } = useAuth();
  const navigate = useNavigate();

  // Check if users shouldn't be on this page
  useEffect(() => {
    if (!user || !profile) return;

    // Check if non-admin users somehow got here but shouldn't be
    if (profile.subscription_active) {
      if (profile.tier === 'waitlist_player') {
        navigate('/waitlist-dashboard');
      } else {
        navigate('/dashboard/overview');
      }
    }
  }, [navigate, user, profile]);

  const handleUpgradeToPremium = () => {
    // TODO: Implement Razorpay integration
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="flex items-center justify-center p-4">
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
            your free trial period has ended. Upgrade to continue accessing Retreat Slice's investment platform.
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
