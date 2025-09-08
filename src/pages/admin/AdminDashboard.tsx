import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { 
  BarChart3, 
  Users, 
  Building2, 
  Wallet, 
  FileCheck, 
  MessageSquare, 
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle2,
  Clock,
  Settings,
  LogOut,
  Home,
  Plus,
  RefreshCw
} from 'lucide-react';

interface AdminStats {
  totalUsers: number;
  activeSubscribers: number;
  pendingKYC: number;
  activeProperties: number;
  totalInvestments: number;
  pendingTickets: number;
  monthlyRevenue: number;
}

const AdminDashboard = () => {
  const { user, signOut, addNotification } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    activeSubscribers: 0,
    pendingKYC: 0,
    activeProperties: 0,
    totalInvestments: 0,
    pendingTickets: 0,
    monthlyRevenue: 0
  });
  const [recentKYC, setRecentKYC] = useState<any[]>([]);
  const [recentTickets, setRecentTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    fetchAdminStats();
    
    // Set up auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchAdminStats();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // Also refresh when window gains focus
  useEffect(() => {
    const handleFocus = () => {
      fetchAdminStats();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  const fetchAdminStats = async (forceRefresh: boolean = false) => {
    try {
      if (forceRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      // Force fresh data by adding cache-busting timestamp
      const timestamp = Date.now();
      console.log('Force refreshing admin data at:', new Date().toISOString());

      // Fetch total users with debug logging
      console.log('Fetching users with current user:', user?.id);
      
      // Use the admin API endpoint for fetching all users
      // This bypasses RLS by using service role permissions
      let allUserData, userDataError, totalUsers, userError;
      
      try {
        // For now, let's use a simple approach that works with basic RLS
        const { data, error: dataErr } = await supabase
          .from('user_profiles')
          .select('user_id, email, full_name, subscription_active, tier, is_admin')
          .order('created_at', { ascending: false });
        
        allUserData = data || [];
        userDataError = dataErr;
        
        // Get count
        const { count, error: countErr } = await supabase
          .from('user_profiles')
          .select('*', { count: 'exact', head: true });
          
        totalUsers = count || 0;
        userError = countErr;
        
      } catch (error) {
        console.error('Exception in user queries:', error);
        allUserData = [];
        userDataError = error;
        totalUsers = 0;
        userError = error;
      }
      
      console.log('Raw user data:', allUserData);
      console.log('User data error:', userDataError);
      console.log('Total users count:', totalUsers);
      console.log('Actual users found:', allUserData?.length);

      // Check if there's a mismatch between count and actual data
      if (totalUsers !== allUserData?.length) {
        console.warn(`COUNT MISMATCH: Count query returned ${totalUsers} but actual data has ${allUserData?.length} records`);
        console.warn('This suggests RLS policy issues or data inconsistency');
      }

      // Fetch pending KYC
      const { count: pendingKYC } = await supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true })
        .in('kyc_status', ['pending', 'under_review']);

      // Fetch active properties
      let activeProperties = 0;
      try {
        const { count, error: propError } = await supabase
          .from('properties')
          .select('*', { count: 'exact', head: true })
          .eq('property_status', 'open');
        if (propError) throw propError;
        activeProperties = count || 0;
      } catch (error) {
        // Properties table not available yet - silently fail
        activeProperties = 0;
      }

      // Fetch total investments
      let totalInvestments = 0;
      try {
        const { count, error: invError } = await supabase
          .from('investments')
          .select('*', { count: 'exact', head: true });
        if (invError) throw invError;
        totalInvestments = count || 0;
      } catch (error) {
        // Investments table not available yet - silently fail
        totalInvestments = 0;
      }

      // Fetch pending support tickets
      let pendingTickets = 0;
      try {
        const { count, error: ticketError } = await supabase
          .from('support_tickets')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'open');
        if (ticketError) throw ticketError;
        pendingTickets = count || 0;
      } catch (error) {
        // Support tickets table not available yet - silently fail
        pendingTickets = 0;
      }

      // Fetch active subscribers count (only paid tiers) with debug logging
      let activeSubscribers = 0;
      try {
        const { count, error: subsError } = await supabase
          .from('user_profiles')
          .select('*', { count: 'exact', head: true })
          .eq('subscription_active', true)
          .in('tier', ['waitlist_player', 'small_investor', 'large_investor']);
        
        if (subsError) {
          console.error('Error fetching active subscribers:', subsError);
        }
        console.log('Active subscribers (paid tiers only) found:', count);
        activeSubscribers = count || 0;
      } catch (error) {
        console.error('Exception fetching active subscribers:', error);
        activeSubscribers = 0;
      }

      // Calculate monthly revenue from active subscriptions (platform fee = ₹5000 per subscriber)
      const monthlyRevenue = activeSubscribers * 5000;

      setStats({
        totalUsers: totalUsers || 0,
        activeSubscribers,
        pendingKYC: pendingKYC || 0,
        activeProperties,
        totalInvestments,
        pendingTickets,
        monthlyRevenue
      });

      // Fetch recent KYC submissions
      const { data: kycData } = await supabase
        .from('user_profiles')
        .select('full_name, email, kyc_status, kyc_submitted_at')
        .in('kyc_status', ['pending', 'under_review'])
        .order('kyc_submitted_at', { ascending: false })
        .limit(3);
      
      setRecentKYC(kycData || []);

      // Fetch recent support tickets
      try {
        const { data: ticketData, error: ticketError } = await supabase
          .from('support_tickets')
          .select('id, subject, status, created_at, user_id')
          .eq('status', 'open')
          .order('created_at', { ascending: false })
          .limit(3);
        
        if (!ticketError && ticketData) {
          // Get user details separately to avoid join issues
          const ticketsWithUsers = await Promise.all(
            ticketData.map(async (ticket) => {
              const { data: userData } = await supabase
                .from('user_profiles')
                .select('full_name, email')
                .eq('user_id', ticket.user_id)
                .single();
              
              return {
                ...ticket,
                user_profiles: userData
              };
            })
          );
          setRecentTickets(ticketsWithUsers);
        } else {
          setRecentTickets([]);
        }
      } catch (error) {
        // Support tickets table not available yet - silently fail
        setRecentTickets([]);
      }

    } catch (error) {
      console.error('Error fetching admin stats:', error);
      addNotification({
        name: "Failed to Load Stats",
        description: "Unable to load admin dashboard statistics",
        icon: "ALERT_TRIANGLE",
        color: "#DC2626",
        isLogo: true
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLastUpdated(new Date());
    }
  };

  const StatCard = ({ 
    title, 
    value, 
    icon: Icon, 
    description, 
    color = "text-foreground",
    action
  }: {
    title: string;
    value: number | string;
    icon: any;
    description: string;
    color?: string;
    action?: () => void;
  }) => (
    <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={action}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${color}`}>
          {typeof value === 'number' ? value.toLocaleString() : value}
        </div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );

  const formatCurrency = (value: number) => {
    return value.toLocaleString('en-IN', { 
      style: 'currency', 
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0 
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 hero-gradient rounded-xl flex items-center justify-center mx-auto mb-4">
            <BarChart3 className="w-7 h-7 text-white animate-pulse" />
          </div>
          <p className="text-muted-foreground">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 hero-gradient rounded-lg flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-foreground">EquityLeap Admin</span>
            <Badge variant="secondary" className="ml-2">Admin Panel</Badge>
          </div>
          
          <div className="flex items-center space-x-4">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => fetchAdminStats(true)}
              disabled={refreshing}
              className="text-muted-foreground hover:text-foreground"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate('/welcome')}
              className="text-muted-foreground hover:text-foreground"
            >
              <Home className="w-4 h-4 mr-2" />
              Home
            </Button>
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
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="space-y-8">
          {/* Welcome Section */}
          <div>
            <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
            <div className="flex items-center justify-between">
              <p className="text-muted-foreground">
                Manage users, properties, and platform operations
              </p>
              {lastUpdated && (
                <p className="text-xs text-muted-foreground">
                  Last updated: {lastUpdated.toLocaleTimeString()}
                </p>
              )}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <StatCard
              title="Total Users"
              value={stats.totalUsers}
              icon={Users}
              description="Registered platform users"
              action={() => navigate('/admin/users')}
            />
            <StatCard
              title="Active Subscribers"
              value={stats.activeSubscribers}
              icon={Users}
              description="Paid users (waitlist, investors)"
              color="text-green-600"
              action={() => navigate('/admin/users')}
            />
            <StatCard
              title="Pending KYC"
              value={stats.pendingKYC}
              icon={FileCheck}
              description="Awaiting verification"
              color="text-orange-600"
              action={() => navigate('/admin/kyc')}
            />
            <StatCard
              title="Active Properties"
              value={stats.activeProperties}
              icon={Building2}
              description="Available for investment"
              action={() => navigate('/admin/properties')}
            />
            <StatCard
              title="Total Investments"
              value={stats.totalInvestments}
              icon={TrendingUp}
              description="Completed transactions"
              color="text-green-600"
              action={() => navigate('/admin/investments')}
            />
            <StatCard
              title="Support Tickets"
              value={stats.pendingTickets}
              icon={MessageSquare}
              description="Open support requests"
              color="text-blue-600"
              action={() => navigate('/admin/support')}
            />
            <StatCard
              title="Monthly Revenue"
              value={formatCurrency(stats.monthlyRevenue)}
              icon={Wallet}
              description="Current month earnings"
              color="text-green-600"
            />
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common administrative tasks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
                <Button
                  variant="outline"
                  className="h-auto p-4 flex flex-col items-center space-y-2"
                  onClick={() => navigate('/admin/properties/new')}
                >
                  <Plus className="w-6 h-6" />
                  <span>Add Property</span>
                </Button>
                
                <Button
                  variant="outline"
                  className="h-auto p-4 flex flex-col items-center space-y-2"
                  onClick={() => navigate('/admin/properties')}
                >
                  <Building2 className="w-6 h-6" />
                  <span>Manage Properties</span>
                </Button>
                
                <Button
                  variant="outline"
                  className="h-auto p-4 flex flex-col items-center space-y-2 border-orange-200 text-orange-700 hover:bg-orange-50"
                  onClick={() => navigate('/admin/share-trading')}
                >
                  <TrendingDown className="w-6 h-6" />
                  <span>Share Trading</span>
                </Button>
                
                <Button
                  variant="outline"
                  className="h-auto p-4 flex flex-col items-center space-y-2"
                  onClick={() => navigate('/admin/kyc')}
                >
                  <FileCheck className="w-6 h-6" />
                  <span>Review KYC</span>
                </Button>
                
                <Button
                  variant="outline"
                  className="h-auto p-4 flex flex-col items-center space-y-2"
                  onClick={() => navigate('/admin/support')}
                >
                  <MessageSquare className="w-6 h-6" />
                  <span>Support Tickets</span>
                </Button>
                
                <Button
                  variant="outline"
                  className="h-auto p-4 flex flex-col items-center space-y-2"
                  onClick={() => navigate('/admin/users')}
                >
                  <Users className="w-6 h-6" />
                  <span>Manage Users</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent KYC Submissions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileCheck className="w-5 h-5 mr-2" />
                  Recent KYC Submissions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentKYC.length > 0 ? (
                    recentKYC.map((kyc) => (
                      <div key={kyc.email} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div>
                          <p className="font-medium">{kyc.full_name || kyc.email}</p>
                          <p className="text-sm text-muted-foreground">
                            {kyc.kyc_submitted_at 
                              ? new Date(kyc.kyc_submitted_at).toLocaleDateString()
                              : 'Recently submitted'
                            }
                          </p>
                        </div>
                        <Badge variant="secondary">
                          <Clock className="w-3 h-3 mr-1" />
                          {kyc.kyc_status === 'under_review' ? 'Under Review' : 'Pending'}
                        </Badge>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4 text-muted-foreground">
                      No pending KYC submissions
                    </div>
                  )}
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full mt-3"
                  onClick={() => navigate('/admin/kyc')}
                >
                  View All KYC Submissions
                </Button>
              </CardContent>
            </Card>

            {/* Recent Support Tickets */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <MessageSquare className="w-5 h-5 mr-2" />
                  Recent Support Tickets
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentTickets.length > 0 ? (
                    recentTickets.map((ticket) => (
                      <div key={ticket.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div>
                          <p className="font-medium">{ticket.subject}</p>
                          <p className="text-sm text-muted-foreground">
                            {ticket.user_profiles?.full_name || ticket.user_profiles?.email || 'Unknown User'} • {' '}
                            {new Date(ticket.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge variant="outline">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          {ticket.status}
                        </Badge>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4 text-muted-foreground">
                      No open support tickets
                    </div>
                  )}
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full mt-3"
                  onClick={() => navigate('/admin/support')}
                >
                  View All Support Tickets
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;