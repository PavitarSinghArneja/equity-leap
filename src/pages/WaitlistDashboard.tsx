import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/NewAuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import WalletActions from '@/components/WalletActions';
import { useAdmin } from '@/hooks/useNewAdmin';
import { useWatchlist } from '@/hooks/useWatchlist';
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
        navigate('/dashboard/overview');
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
      // If no watchlist items, still fetch recent share sell requests
      let query = supabase
        .from('share_sell_requests')
        .select(`
          *,
          properties!property_id(id, title, city, country, share_price, images),
          user_profiles!seller_id(full_name, email)
        `);
      
      // If user has watchlist items, filter by them
      if (watchlist.length > 0) {
        const watchedPropertyIds = watchlist.map(item => item.property_id);
        query = query.in('property_id', watchedPropertyIds);
      }
      
      // Get all available requests (handle multiple possible status values)
      query = query
        .in('status', ['active', 'approved', 'pending'])
        .gt('shares_to_sell', 0)
        .order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;
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
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Waitlist Dashboard</h1>
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90" size="sm" onClick={() => navigate('/properties')}>
            <Plus className="w-4 h-4 mr-2" /> New Investment
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card className="hero-gradient p-6">
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
              <WalletActions escrowBalance={escrowBalance} onRequestSubmitted={fetchEscrowBalance} />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-base md:text-lg text-muted-foreground font-medium">KYC Status</span>
                <div className="mt-1">
                  {( () => { const status = profile?.kyc_status; switch(status){
                    case 'approved': return (<Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-green-200 text-base md:text-lg px-3 py-1">Verified</Badge>);
                    case 'under_review': return (<Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 border-blue-200 text-base md:text-lg px-3 py-1">Under Review</Badge>);
                    case 'rejected': return (<Badge className="bg-red-100 text-red-800 hover:bg-red-100 border-red-200 text-base md:text-lg px-3 py-1">Rejected</Badge>);
                    case 'pending': return (<Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100 border-yellow-200 text-base md:text-lg px-3 py-1">Pending</Badge>);
                    default: return (<Badge className="bg-red-100 text-red-800 hover:bg-red-100 border-red-200 text-base md:text-lg px-3 py-1">Not Verified</Badge>);
                  } })()}
                </div>
              </div>
              {profile?.kyc_status !== 'approved' && (
                <Button size="default" className="hero-gradient text-white hover:opacity-90" onClick={() => navigate('/kyc')}>
                  Complete KYC
                </Button>
              )}
            </div>
          </Card>
        </div>

        <div>
          <h2 className="text-2xl font-semibold mb-4">Feature Access</h2>
          <div>
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
