import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { 
  BarChart3, 
  TrendingUp, 
  Wallet, 
  Clock, 
  AlertCircle,
  LogOut,
  FileCheck,
  CreditCard 
} from 'lucide-react';
import { toast } from 'sonner';

interface EscrowBalance {
  available_balance: number;
  pending_balance: number;
  total_invested: number;
  total_returns: number;
}

const Dashboard = () => {
  const { user, profile, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const [escrowBalance, setEscrowBalance] = useState<EscrowBalance | null>(null);
  const [trialExpired, setTrialExpired] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
      return;
    }

    if (profile) {
      // Check if trial has expired and subscription is not active
      const trialExpires = new Date(profile.trial_expires_at);
      const now = new Date();
      
      if (now > trialExpires && !profile.subscription_active) {
        setTrialExpired(true);
      }
    }
  }, [user, profile, loading, navigate]);

  // Separate effect for KYC redirection to avoid conflicts
  useEffect(() => {
    if (profile && profile.kyc_status !== 'approved') {
      navigate('/kyc');
    }
  }, [profile, navigate]);

  useEffect(() => {
    if (user) {
      fetchEscrowBalance();
    }
  }, [user]);

  const fetchEscrowBalance = async () => {
    try {
      const { data, error } = await supabase
        .from('escrow_balances')
        .select('*')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (error) throw error;
      setEscrowBalance(data);
    } catch (error) {
      console.error('Error fetching escrow balance:', error);
    }
  };

  const getTrialDaysLeft = () => {
    if (!profile) return 0;
    const trialExpires = new Date(profile.trial_expires_at);
    const now = new Date();
    const diffTime = trialExpires.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  const getTierDisplayName = (tier: string) => {
    const tierMap = {
      explorer: 'Explorer',
      waitlist_player: 'Waitlist Player',
      small_investor: 'Small Investor',
      large_investor: 'Large Investor'
    };
    return tierMap[tier as keyof typeof tierMap] || tier;
  };

  const getTierColor = (tier: string) => {
    const colorMap = {
      explorer: 'bg-muted text-muted-foreground',
      waitlist_player: 'bg-accent text-accent-foreground',
      small_investor: 'bg-secondary text-secondary-foreground',
      large_investor: 'bg-primary text-primary-foreground'
    };
    return colorMap[tier as keyof typeof colorMap] || 'bg-muted';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 hero-gradient rounded-xl flex items-center justify-center mx-auto mb-4">
            <BarChart3 className="w-7 h-7 text-white animate-pulse" />
          </div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (trialExpired) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="investment-card max-w-md w-full text-center">
          <CardHeader>
            <div className="w-16 h-16 bg-warning/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock className="w-8 h-8 text-warning" />
            </div>
            <CardTitle className="text-2xl">Trial Expired</CardTitle>
            <CardDescription>
              Your 14-day trial has expired. Please subscribe to continue using EquityLeap.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button className="w-full" variant="hero">
              <CreditCard className="w-4 h-4 mr-2" />
              Subscribe Now
            </Button>
            <Button variant="ghost" onClick={signOut} className="w-full">
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-bold text-foreground">EquityLeap</span>
          </div>
          <div className="flex items-center space-x-4">
            <Badge className={getTierColor(profile?.tier || 'explorer')}>
              {getTierDisplayName(profile?.tier || 'explorer')}
            </Badge>
            <Button variant="ghost" onClick={signOut}>
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            Welcome back{profile?.full_name ? `, ${profile.full_name}` : ''}!
          </h1>
          <p className="text-muted-foreground">
            {getTrialDaysLeft()} days left in your free trial
          </p>
        </div>

        {/* KYC Status Alert */}
        {profile?.kyc_status !== 'approved' && (
          <Card className="mb-6 border-warning/20 bg-warning/5">
            <CardContent className="pt-6">
              <div className="flex items-center space-x-3">
                <AlertCircle className="w-5 h-5 text-warning" />
                <div className="flex-1">
                  <h3 className="font-semibold text-warning">KYC Verification Required</h3>
                  <p className="text-sm text-muted-foreground">
                    Complete your KYC verification to unlock all platform features.
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  onClick={() => navigate('/kyc')}
                  className="border-warning text-warning hover:bg-warning/10"
                >
                  <FileCheck className="w-4 h-4 mr-2" />
                  Complete KYC
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="investment-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Available Balance</CardTitle>
              <Wallet className="h-4 w-4 text-escrow" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-escrow">
                ${escrowBalance?.available_balance?.toLocaleString() || '0'}
              </div>
              <p className="text-xs text-muted-foreground">
                Ready to invest
              </p>
            </CardContent>
          </Card>

          <Card className="investment-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Invested</CardTitle>
              <TrendingUp className="h-4 w-4 text-secondary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-secondary">
                ${escrowBalance?.total_invested?.toLocaleString() || '0'}
              </div>
              <p className="text-xs text-muted-foreground">
                Across all properties
              </p>
            </CardContent>
          </Card>

          <Card className="investment-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Investments</CardTitle>
              <Clock className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-warning">
                ${escrowBalance?.pending_balance?.toLocaleString() || '0'}
              </div>
              <p className="text-xs text-muted-foreground">
                Processing
              </p>
            </CardContent>
          </Card>

          <Card className="investment-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Returns</CardTitle>
              <TrendingUp className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">
                ${escrowBalance?.total_returns?.toLocaleString() || '0'}
              </div>
              <p className="text-xs text-muted-foreground">
                All-time earnings
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tier-specific Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="investment-card">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Get started with your investments</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                className="w-full justify-start" 
                variant="outline"
                onClick={() => navigate('/properties')}
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                Browse Properties
              </Button>
              
              {profile?.tier === 'explorer' ? (
                <Button className="w-full justify-start" variant="outline" disabled>
                  <AlertCircle className="w-4 h-4 mr-2" />
                  Contact Team to Invest
                </Button>
              ) : (
                <Button className="w-full justify-start" variant="hero">
                  <Wallet className="w-4 h-4 mr-2" />
                  Make Investment
                </Button>
              )}
            </CardContent>
          </Card>

          <Card className="investment-card">
            <CardHeader>
              <CardTitle>Account Status</CardTitle>
              <CardDescription>Your account information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">Account Tier</span>
                <Badge className={getTierColor(profile?.tier || 'explorer')}>
                  {getTierDisplayName(profile?.tier || 'explorer')}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">KYC Status</span>
                <Badge variant={profile?.kyc_status === 'approved' ? 'default' : 'outline'}>
                  {profile?.kyc_status || 'pending'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Trial Days Left</span>
                <Badge variant="outline">
                  {getTrialDaysLeft()} days
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;