import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import WalletActions from '@/components/WalletActions';
import { useAdmin } from '@/hooks/useAdmin';
import { useWatchlist } from '@/hooks/useWatchlist';
import GlobalHeader from '@/components/GlobalHeader';
import { supabase } from '@/integrations/supabase/client';
import { 
  BarChart3, 
  Plus,
  Home,
  LogOut,
  Building2,
  Users,
  MessageCircle,
  User,
  Settings,
  HelpCircle,
  Wallet,
  Crown,
  Heart,
  Eye,
  MapPin,
  TrendingUp
} from 'lucide-react';

interface EscrowBalance {
  available_balance: number;
  pending_balance: number;
  total_invested: number;
  total_returns: number;
}

const WaitlistDashboard = () => {
  const { user, profile, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const { isAdmin } = useAdmin();
  const [escrowBalance, setEscrowBalance] = useState<EscrowBalance | null>(null);
  const { watchlist, removeFromWatchlist, watchlistCount } = useWatchlist();
  const [watchlistAlerts, setWatchlistAlerts] = useState<any[]>([]);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
      return;
    }
    
    if (!user || !profile) {
      return;
    }

    // Check trial expiration first
    if (!profile.subscription_active) {
      if (profile.trial_expires_at) {
        const trialExpires = new Date(profile.trial_expires_at);
        const now = new Date();
        
        if (now > trialExpires) {
          navigate('/trial-expired');
          return;
        }
      }
    }

    // Simple routing logic: Only allow waitlist players
    if (profile.tier !== 'waitlist_player') {
      if (profile.subscription_active && (profile.tier === 'investor' || profile.tier === 'explorer')) {
        navigate('/dashboard');
      } else {
        navigate('/welcome');
      }
      return;
    }

    // If we reach here, user should be on waitlist dashboard
  }, [user, profile, loading, navigate]);

  const fetchEscrowBalance = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('escrow_balances')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      setEscrowBalance(data);
    } catch (error) {
      console.error('Error fetching escrow balance:', error);
    }
  }, [user]);

  const fetchWatchlistAlerts = useCallback(async () => {
    if (!user) {
      setWatchlistAlerts([]);
      return;
    }
    
    try {
      console.log('Fetching watchlist alerts for user:', user.id);
      console.log('Current watchlist:', watchlist);
      
      // If no watchlist items, still try to fetch all share sell requests to debug
      let query = supabase
        .from('share_sell_requests')
        .select(`
          *,
          properties!property_id(id, title, city, country, share_price, images),
          user_profiles!seller_id(full_name, email)
        `);
      
      // If user has watchlist items, filter by them, otherwise get all for debugging
      if (watchlist.length > 0) {
        const watchedPropertyIds = watchlist.map(item => item.property_id);
        console.log('Filtering by watchlisted properties:', watchedPropertyIds);
        query = query.in('property_id', watchedPropertyIds);
      }
      
      // Get all available requests (handle multiple possible status values)
      query = query
        .in('status', ['active', 'approved', 'pending'])
        .gt('shares_to_sell', 0)
        .order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching watchlist alerts:', error);
        setWatchlistAlerts([]);
        return;
      }

      console.log('Found share sell requests:', data?.length || 0, data);
      setWatchlistAlerts(data || []);
    } catch (error) {
      console.error('Error fetching watchlist alerts:', error);
      setWatchlistAlerts([]);
    }
  }, [user, watchlist]);

  useEffect(() => {
    if (user) {
      fetchEscrowBalance();
    }
  }, [user, fetchEscrowBalance]);

  useEffect(() => {
    fetchWatchlistAlerts();
  }, [fetchWatchlistAlerts]);

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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <GlobalHeader 
        title="EquityLeap" 
        subtitle="Waitlist Dashboard"
      >
        <Button 
          className="bg-primary text-primary-foreground hover:bg-primary/90"
          size="sm"
          onClick={() => navigate('/properties')}
        >
          <Plus className="w-4 h-4 mr-2" />
          New Investment
        </Button>
      </GlobalHeader>

      <div className="flex h-screen">
        {/* Sidebar */}
        <div className="w-64 bg-card border-r border-border p-4">
          <div className="flex items-center space-x-3 mb-8">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-white text-sm font-medium">
                {profile?.full_name?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}
              </span>
            </div>
            <div>
              <p className="font-medium text-foreground">
                {profile?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'User'}
              </p>
              <p className="text-xs text-muted-foreground">Investor</p>
            </div>
          </div>

          <nav className="space-y-2">
            <Button variant="default" className="w-full justify-start bg-primary text-primary-foreground">
              <BarChart3 className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
            <Button variant="ghost" className="w-full justify-start">
              <Building2 className="w-4 h-4 mr-2" />
              Reports
            </Button>
            <Button variant="ghost" className="w-full justify-start">
              <User className="w-4 h-4 mr-2" />
              Account
            </Button>
            <Button variant="ghost" className="w-full justify-start">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </Button>
            <Button variant="ghost" className="w-full justify-start">
              <HelpCircle className="w-4 h-4 mr-2" />
              Help
            </Button>
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-8">
          {/* Dashboard Title */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-foreground mb-6">Dashboard</h1>
            
            {/* Dashboard Cards Row - Grid Layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {/* Wallet Balance Card - Takes 2 columns like project tables */}
              <Card className="hero-gradient p-6 lg:col-span-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-white/80 mb-1">Wallet Balance</p>
                    <p className="text-3xl font-bold text-white">
                      ₹{escrowBalance?.available_balance?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                    </p>
                  </div>
                  <div className="w-16 h-16 bg-white/20 rounded-lg flex items-center justify-center">
                    <Wallet className="w-8 h-8 text-white" />
                  </div>
                </div>
                <div className="mt-4">
                  <WalletActions 
                    escrowBalance={escrowBalance} 
                    onRequestSubmitted={fetchEscrowBalance}
                  />
                </div>
              </Card>

              {/* KYC Status Card - Takes 2 columns like project tables */}
              <Card className="p-6 lg:col-span-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">KYC Status</p>
                    {(() => {
                      const status = profile?.kyc_status;
                      switch (status) {
                        case 'approved':
                          return (
                            <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-green-200">
                              Verified
                            </Badge>
                          );
                        case 'under_review':
                          return (
                            <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 border-blue-200">
                              Under Review
                            </Badge>
                          );
                        case 'rejected':
                          return (
                            <Badge className="bg-red-100 text-red-800 hover:bg-red-100 border-red-200">
                              Rejected
                            </Badge>
                          );
                        case 'pending':
                          return (
                            <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100 border-yellow-200">
                              Pending
                            </Badge>
                          );
                        case null:
                        case undefined:
                        default:
                          return (
                            <Badge className="bg-red-100 text-red-800 hover:bg-red-100 border-red-200">
                              Not Verified
                            </Badge>
                          );
                      }
                    })()}
                  </div>
                  {profile?.kyc_status !== 'approved' && (
                    <Button 
                      size="sm" 
                      className="hero-gradient text-white hover:opacity-90"
                      onClick={() => navigate('/kyc')}
                    >
                      Complete KYC
                    </Button>
                  )}
                </div>
              </Card>

              {/* Watchlist Section - Full width */}
              <Card className="lg:col-span-4 md:col-span-2 border-0 bg-card/50 backdrop-blur-sm">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-lg hero-gradient flex items-center justify-center">
                        <Heart className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-xl text-foreground">My Watchlist</CardTitle>
                        <CardDescription className="text-sm">
                          {watchlistAlerts.length > 0 
                            ? `${watchlistAlerts.length} available investment${watchlistAlerts.length > 1 ? 's' : ''}`
                            : 'Track your favorite properties'
                          }
                        </CardDescription>
                      </div>
                    </div>
                    {watchlistCount > 0 && (
                      <Badge variant="secondary" className="text-xs font-medium">
                        {watchlistCount} tracked
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-6">
                  {watchlistAlerts.length > 0 ? (
                    <>
                      {/* Available Opportunities */}
                      <div className="space-y-4">
                        {watchlistAlerts.map((alert) => (
                          <div key={alert.id} className="group relative bg-card border border-border rounded-xl p-5 hover:shadow-sm transition-all duration-200">
                            {/* Property Header */}
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <h3 className="font-semibold text-foreground truncate">
                                    {alert.properties?.title}
                                  </h3>
                                  <Badge 
                                    variant="secondary" 
                                    className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs"
                                  >
                                    Available
                                  </Badge>
                                </div>
                                <div className="flex items-center text-sm text-muted-foreground">
                                  <MapPin className="w-3 h-3 mr-1" />
                                  {alert.properties?.city}, {alert.properties?.country}
                                </div>
                              </div>
                            </div>

                            {/* Investment Details Grid */}
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                              <div className="text-center p-3 bg-muted/30 rounded-lg">
                                <p className="text-xs text-muted-foreground mb-1">Shares</p>
                                <p className="font-semibold text-foreground">{alert.shares_to_sell}</p>
                              </div>
                              <div className="text-center p-3 bg-muted/30 rounded-lg">
                                <p className="text-xs text-muted-foreground mb-1">Price per Share</p>
                                <p className="font-semibold text-foreground">₹{alert.price_per_share.toLocaleString('en-IN')}</p>
                              </div>
                              <div className="text-center p-3 bg-muted/30 rounded-lg">
                                <p className="text-xs text-muted-foreground mb-1">Total Value</p>
                                <p className="font-semibold text-foreground">₹{(alert.shares_to_sell * alert.price_per_share).toLocaleString('en-IN')}</p>
                              </div>
                              <div className="text-center p-3 bg-muted/30 rounded-lg">
                                <p className="text-xs text-muted-foreground mb-1">Seller</p>
                                <p className="font-semibold text-foreground text-xs">{alert.user_profiles?.full_name || 'Anonymous'}</p>
                              </div>
                            </div>

                            {/* Action Button */}
                            <div className="flex items-center justify-between">
                              <p className="text-xs text-muted-foreground">
                                Secondary market opportunity
                              </p>
                              <Button
                                onClick={() => navigate(`/invest/${alert.property_id}`)}
                                className="hero-gradient text-white hover:opacity-90 transition-opacity"
                              >
                                <Eye className="w-4 h-4 mr-2" />
                                View Details
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Quick Action */}
                      <div className="flex justify-center pt-2 border-t border-border/50">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate('/properties')}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add more to watchlist
                        </Button>
                      </div>
                    </>
                  ) : (
                    /* Empty State */
                    <div className="text-center py-12">
                      <div className="w-16 h-16 rounded-2xl hero-gradient flex items-center justify-center mx-auto mb-4 opacity-80">
                        <Heart className="w-8 h-8 text-white" />
                      </div>
                      <h3 className="text-lg font-semibold text-foreground mb-2">No watchlist yet</h3>
                      <p className="text-muted-foreground mb-6 max-w-sm mx-auto leading-relaxed">
                        Save properties you're interested in and get notified when investment opportunities become available.
                      </p>
                      <Button
                        onClick={() => navigate('/properties')}
                        className="hero-gradient text-white hover:opacity-90"
                      >
                        <Building2 className="w-4 h-4 mr-2" />
                        Browse Properties
                      </Button>
                      
                      {/* Benefits */}
                      <div className="grid grid-cols-3 gap-6 mt-8 pt-6 border-t border-border/30">
                        <div className="text-center">
                          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-2">
                            <TrendingUp className="w-4 h-4 text-primary" />
                          </div>
                          <p className="text-xs text-muted-foreground">Price Alerts</p>
                        </div>
                        <div className="text-center">
                          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-2">
                            <Eye className="w-4 h-4 text-primary" />
                          </div>
                          <p className="text-xs text-muted-foreground">Market Updates</p>
                        </div>
                        <div className="text-center">
                          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-2">
                            <Heart className="w-4 h-4 text-primary" />
                          </div>
                          <p className="text-xs text-muted-foreground">Priority Access</p>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Feature Access */}
          <div>
            <h2 className="text-2xl font-semibold mb-4">Feature Access</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Board Meetings */}
              <Card className="p-6 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20 hover:shadow-lg transition-all cursor-pointer group">
                <div className="flex items-center justify-center w-full h-32 mb-4 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                  <Users className="w-12 h-12 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2 text-foreground">Board Meetings</h3>
                <p className="text-sm text-muted-foreground">
                  Participate in board meetings
                </p>
              </Card>

              {/* Project Tables */}
              <Card className="p-6 bg-gradient-to-br from-secondary/5 to-secondary/10 border-secondary/20 hover:shadow-lg transition-all cursor-pointer group">
                <div className="flex items-center justify-center w-full h-32 mb-4 bg-secondary/10 rounded-lg group-hover:bg-secondary/20 transition-colors">
                  <Building2 className="w-12 h-12 text-secondary" />
                </div>
                <h3 className="font-semibold text-lg mb-2 text-foreground">Project Tables</h3>
                <p className="text-sm text-muted-foreground">
                  View and manage project details
                </p>
              </Card>

              {/* AI Assistant */}
              <Card className="p-6 bg-gradient-to-br from-accent/5 to-accent/10 border-accent/20 hover:shadow-lg transition-all cursor-pointer group">
                <div className="flex items-center justify-center w-full h-32 mb-4 bg-accent/10 rounded-lg group-hover:bg-accent/20 transition-colors">
                  <MessageCircle className="w-12 h-12 text-accent" />
                </div>
                <h3 className="font-semibold text-lg mb-2 text-foreground">AI Assistant</h3>
                <p className="text-sm text-muted-foreground">
                  Get instant support from our AI
                </p>
              </Card>

              {/* Human Manager */}
              <Card className="p-6 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20 hover:shadow-lg transition-all cursor-pointer group">
                <div className="flex items-center justify-center w-full h-32 mb-4 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                  <User className="w-12 h-12 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2 text-foreground">Human Manager</h3>
                <p className="text-sm text-muted-foreground">
                  Connect with a dedicated manager
                </p>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WaitlistDashboard;