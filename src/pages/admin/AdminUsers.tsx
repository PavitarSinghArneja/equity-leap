import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/NewAuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { setUserTierByAdmin, removeUserTierOverride } from '@/utils/tierManagement';
import { 
  BarChart3, 
  Users, 
  Search,
  Filter,
  ArrowLeft,
  Edit,
  MoreVertical,
  Crown,
  Shield,
  CheckCircle2,
  AlertTriangle,
  Clock,
  X,
  Lock,
  Unlock
} from 'lucide-react';

interface User {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  tier: 'explorer' | 'waitlist_player' | 'small_investor' | 'large_investor';
  kyc_status: 'pending' | 'under_review' | 'approved' | 'rejected';
  subscription_active: boolean;
  trial_expires_at: string;
  created_at: string;
  is_admin: boolean | null;
  tier_override_by_admin: boolean | null;
  tier_override_at: string | null;
  tier_override_by: string | null;
}

const AdminUsers = () => {
  const { user, addNotification, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [tierFilter, setTierFilter] = useState('all');
  const [kycFilter, setKycFilter] = useState('all');
  const [subscriptionFilter, setSubscriptionFilter] = useState<'all'|'active'|'inactive'>('all');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userTransactions, setUserTransactions] = useState<any[]>([]);
  const [userInvestments, setUserInvestments] = useState<any[]>([]);
  const [userSellRequests, setUserSellRequests] = useState<any[]>([]);
  const [consolidatedInvestments, setConsolidatedInvestments] = useState<any[]>([]);
  const [expandedInvestment, setExpandedInvestment] = useState<string | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const location = useLocation();

  useEffect(() => {
    fetchUsers();
  }, []);

  // Initialize filters from query params (e.g., subscription=active)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const sub = params.get('subscription');
    if (sub === 'active') setSubscriptionFilter('active');
    if (sub === 'inactive') setSubscriptionFilter('inactive');
  }, [location.search]);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      // Set default values for override fields if they don't exist
      const usersWithDefaults = (data || []).map(user => ({
        ...user,
        tier_override_by_admin: user.tier_override_by_admin ?? false,
        tier_override_at: user.tier_override_at ?? null,
        tier_override_by: user.tier_override_by ?? null
      }));
      setUsers(usersWithDefaults);
    } catch (error) {
      console.error('Error fetching users:', error);
      addNotification({
        name: "Failed to Load Users",
        description: "Unable to fetch user data",
        icon: "ALERT_TRIANGLE",
        color: "#DC2626",
        isLogo: true
      });
    } finally {
      setLoading(false);
    }
  }, [addNotification]);

  const updateUserTier = async (userId: string, newTier: User['tier']) => {
    if (!user) return;
    
    try {
      const result = await setUserTierByAdmin(userId, newTier, user.id);

      if (!result.success) {
        throw new Error(result.error || 'Failed to update tier');
      }

      // Update local state with override info
      setUsers(prev => prev.map(u => 
        u.user_id === userId ? { 
          ...u, 
          tier: newTier,
          tier_override_by_admin: true,
          tier_override_at: new Date().toISOString(),
          tier_override_by: user.id
        } : u
      ));

      // If the updated user is the current session user, refresh their profile
      if (user && user.id === userId) {
        await refreshProfile();
      }

      addNotification({
        name: "User Tier Updated",
        description: `User tier manually set to ${newTier.replace('_', ' ')}. This will override automatic calculations.`,
        icon: "CHECK_CIRCLE",
        color: "#059669",
        isLogo: true
      });
    } catch (error) {
      console.error('Error updating user tier:', error);
      addNotification({
        name: "Update Failed",
        description: "Failed to update user tier",
        icon: "ALERT_TRIANGLE",
        color: "#DC2626",
        isLogo: true
      });
    }
  };

  const removeUserOverride = async (userId: string) => {
    try {
      const result = await removeUserTierOverride(userId);

      if (!result.success) {
        throw new Error(result.error || 'Failed to remove override');
      }

      // Update local state
      setUsers(prev => prev.map(u => 
        u.user_id === userId ? { 
          ...u, 
          tier: result.newTier!,
          tier_override_by_admin: false,
          tier_override_at: null,
          tier_override_by: null
        } : u
      ));

      // If the updated user is the current session user, refresh their profile
      if (user && user.id === userId) {
        await refreshProfile();
      }

      addNotification({
        name: "Override Removed",
        description: `Tier override removed. User tier automatically calculated as ${result.newTier?.replace('_', ' ')}.`,
        icon: "CHECK_CIRCLE",
        color: "#059669",
        isLogo: true
      });
    } catch (error) {
      console.error('Error removing tier override:', error);
      addNotification({
        name: "Remove Override Failed",
        description: "Failed to remove tier override",
        icon: "ALERT_TRIANGLE",
        color: "#DC2626",
        isLogo: true
      });
    }
  };

  const toggleAdminStatus = async (userId: string, isAdmin: boolean) => {
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ is_admin: !isAdmin })
        .eq('user_id', userId);

      if (error) throw error;

      // Update local state
      setUsers(prev => prev.map(u => 
        u.user_id === userId ? { ...u, is_admin: !isAdmin } : u
      ));

      addNotification({
        name: "Admin Status Updated",
        description: `User ${!isAdmin ? 'granted' : 'removed'} admin access`,
        icon: "CHECK_CIRCLE",
        color: "#059669",
        isLogo: true
      });
    } catch (error) {
      console.error('Error updating admin status:', error);
      addNotification({
        name: "Update Failed",
        description: "Failed to update admin status",
        icon: "ALERT_TRIANGLE",
        color: "#DC2626",
        isLogo: true
      });
    }
  };

  const toggleSubscriptionStatus = async (userId: string, current: boolean) => {
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ subscription_active: !current })
        .eq('user_id', userId);

      if (error) throw error;

      setUsers(prev => prev.map(u => u.user_id === userId ? { ...u, subscription_active: !current } : u));

      addNotification({
        name: 'Subscription Updated',
        description: `Subscription ${!current ? 'activated' : 'deactivated'} for user`,
        icon: 'CHECK_CIRCLE',
        color: '#059669',
        isLogo: true
      });
    } catch (error) {
      console.error('Error updating subscription status:', error);
      addNotification({
        name: 'Update Failed',
        description: 'Failed to update subscription status',
        icon: 'ALERT_TRIANGLE',
        color: '#DC2626',
        isLogo: true
      });
    }
  };

  const fetchUserDetails = async (userId: string) => {
    setLoadingDetails(true);
    try {
      console.log('Fetching user details for:', userId);
      
      // Fetch transactions with property information
      const { data: transactions, error: transactionError } = await supabase
        .from('transactions')
        .select(`
          *,
          properties!property_id(id, title, share_price)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (transactionError) {
        console.error('Transaction error:', transactionError);
      }

      // Fetch investments with property information
      const { data: investments, error: investmentError } = await supabase
        .from('investments')
        .select(`
          *,
          properties!property_id(id, title, share_price, city, country)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (investmentError) {
        console.error('Investment error:', investmentError);
      }

      // Fetch share sell requests - now enabled since data exists in Supabase
      let sellRequests: any[] = [];
      try {
        console.log('Fetching share sell requests for seller_id:', userId);
        
        // Try direct query first
        const { data, error: sellRequestError } = await supabase
          .from('share_sell_requests')
          .select(`
            *,
            properties!property_id(id, title, share_price, city, country)
          `)
          .eq('seller_id', userId)
          .order('created_at', { ascending: false });

        // If that fails, try with RPC call or raw query as admin
        if (sellRequestError && sellRequestError.code === '42501') {
          console.log('RLS blocking query, trying admin bypass...');
          // You might need to create an RPC function for admin access
          // For now, let's try without the join
          const { data: rawData, error: rawError } = await supabase
            .from('share_sell_requests')
            .select('*')
            .eq('seller_id', userId)
            .order('created_at', { ascending: false });
          
          if (!rawError) {
            // Manually fetch property data for each request
            for (const request of rawData || []) {
              const { data: propData } = await supabase
                .from('properties')
                .select('id, title, share_price, city, country')
                .eq('id', request.property_id)
                .single();
              
              if (propData) {
                request.properties = propData;
              }
            }
            sellRequests = rawData || [];
          }
        }

        if (sellRequestError) {
          console.error('Share sell request error:', sellRequestError);
          // Don't throw - just set empty array and continue
          if (!sellRequests.length) sellRequests = [];
        } else {
          console.log('Found share sell requests for user:', data?.length || 0, data);
          sellRequests = data || [];
        }
      } catch (sellError) {
        console.error('Error fetching share sell requests:', sellError);
        sellRequests = [];
      }

      // Consolidate investments by property
      const investmentMap = new Map();
      (investments || []).forEach((investment) => {
        if (investment.properties) {
          const propertyId = investment.property_id;
          if (!investmentMap.has(propertyId)) {
            investmentMap.set(propertyId, {
              property: investment.properties,
              investments: [],
              totalShares: 0,
              totalInvestment: 0,
              averageSharePrice: 0
            });
          }
          
          const consolidated = investmentMap.get(propertyId);
          consolidated.investments.push(investment);
          consolidated.totalShares += investment.shares_owned || 0;
          consolidated.totalInvestment += investment.total_investment;
          consolidated.averageSharePrice = consolidated.totalShares > 0 ? consolidated.totalInvestment / consolidated.totalShares : 0;
        }
      });

      const consolidatedArray = Array.from(investmentMap.values());

      console.log('Fetched data:', {
        transactions: transactions?.length || 0,
        investments: investments?.length || 0,
        sellRequests: sellRequests?.length || 0,
        consolidated: consolidatedArray?.length || 0
      });

      setUserTransactions(transactions || []);
      setUserInvestments(investments || []);
      setUserSellRequests(sellRequests);
      setConsolidatedInvestments(consolidatedArray);

      // Only throw if both transactions and investments failed
      if (transactionError && investmentError) {
        throw new Error('Failed to fetch core user data');
      }
    } catch (error) {
      console.error('Error fetching user details:', error);
      addNotification({
        name: "Failed to Load User Details",
        description: "Unable to fetch user transaction and investment data",
        icon: "ALERT_TRIANGLE",
        color: "#DC2626",
        isLogo: true
      });
    } finally {
      setLoadingDetails(false);
    }
  };

  // Fetch details when user is selected
  useEffect(() => {
    if (selectedUser) {
      fetchUserDetails(selectedUser.user_id);
    }
  }, [selectedUser]);

  const filteredUsers = users.filter(user => {
    const matchesSearch = !searchQuery || 
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.full_name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesTier = tierFilter === 'all' || user.tier === tierFilter;
    const matchesKyc = kycFilter === 'all' || user.kyc_status === kycFilter;
    const matchesSubscription =
      subscriptionFilter === 'all' ||
      (subscriptionFilter === 'active' && user.subscription_active) ||
      (subscriptionFilter === 'inactive' && !user.subscription_active);

    return matchesSearch && matchesTier && matchesKyc && matchesSubscription;
  });

  const getTierBadge = (user: User) => {
    const config = {
      explorer: { label: 'Explorer', color: 'bg-muted text-muted-foreground border-border' },
      waitlist_player: { label: 'Waitlist Player', color: 'bg-blue/10 text-blue border-blue/20' },
      small_investor: { label: 'Small Investor', color: 'bg-green/10 text-green border-green/20' },
      large_investor: { label: 'Large Investor', color: 'bg-purple/10 text-purple border-purple/20' }
    };

    // Handle null/undefined tier or unknown tier values
    const safeTier = user.tier || 'explorer';
    const tierConfig = config[safeTier] || config.explorer;
    const { label, color } = tierConfig;
    
    const isOverridden = user.tier_override_by_admin;
    
    return (
      <div className="flex items-center gap-1">
        <Badge className={`${color} hover:opacity-80 flex items-center gap-1 w-fit`}>
          {isOverridden && <Lock className="w-3 h-3" />}
          {label}
        </Badge>
        {isOverridden && (
          <span className="text-xs text-muted-foreground" title="Admin Override Active">
            (Override)
          </span>
        )}
      </div>
    );
  };

  const getKycBadge = (status: User['kyc_status']) => {
    const config = {
      pending: { icon: Clock, color: 'bg-warning/10 text-warning border-warning/20' },
      under_review: { icon: AlertTriangle, color: 'bg-accent/10 text-accent border-accent/20' },
      approved: { icon: CheckCircle2, color: 'bg-primary/10 text-primary border-primary/20' },
      rejected: { icon: X, color: 'bg-destructive/10 text-destructive border-destructive/20' }
    };

    // Handle null/undefined status
    const safeStatus = status || 'pending';
    const statusConfig = config[safeStatus] || config.pending;
    const { icon: Icon, color } = statusConfig;
    
    return (
      <Badge className={`${color} hover:opacity-80 flex items-center gap-1 w-fit`}>
        <Icon className="w-3 h-3" />
        {safeStatus.replace('_', ' ')}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 hero-gradient rounded-xl flex items-center justify-center mx-auto mb-4">
            <Users className="w-7 h-7 text-white animate-pulse" />
          </div>
          <p className="text-muted-foreground">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 hero-gradient rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold">User Management</h1>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/admin')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Admin
          </Button>
        </div>
        <div className="space-y-6">
          {/* Search and Filters */}
          <Card>
            <CardHeader>
              <CardTitle>Search & Filter Users</CardTitle>
              <CardDescription>Find and manage platform users</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by email or name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                <Select value={tierFilter} onValueChange={setTierFilter}>
                  <SelectTrigger className="w-full md:w-[180px]">
                    <SelectValue placeholder="Filter by tier" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Tiers</SelectItem>
                    <SelectItem value="explorer">Explorer</SelectItem>
                    <SelectItem value="waitlist_player">Waitlist Player</SelectItem>
                    <SelectItem value="small_investor">Small Investor</SelectItem>
                    <SelectItem value="large_investor">Large Investor</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={kycFilter} onValueChange={setKycFilter}>
                  <SelectTrigger className="w-full md:w-[180px]">
                    <SelectValue placeholder="Filter by KYC" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All KYC Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="under_review">Under Review</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={subscriptionFilter} onValueChange={(v) => setSubscriptionFilter(v as any)}>
                  <SelectTrigger className="w-full md:w-[200px]">
                    <SelectValue placeholder="Subscription" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Subscriptions</SelectItem>
                    <SelectItem value="active">Active Subscriptions</SelectItem>
                    <SelectItem value="inactive">Inactive / Trial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Users List */}
          <Card>
            <CardHeader>
              <CardTitle>Users ({filteredUsers.length})</CardTitle>
              <CardDescription>Manage user accounts and permissions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredUsers.map((user) => (
                  <div
                    key={user.user_id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                        <span className="text-white text-sm font-medium">
                          {user.full_name?.[0] || user.email[0].toUpperCase()}
                        </span>
                      </div>
                      
                      <div>
                        <div className="flex items-center space-x-2">
                          <p className="font-medium">{user.full_name || 'No Name'}</p>
                          {user.is_admin && (
                            <Crown className="w-4 h-4 text-yellow-600" title="Admin" />
                          )}
                          {user.subscription_active && (
                            <Shield className="w-4 h-4 text-green-600" title="Active Subscription" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                        <p className="text-xs text-muted-foreground">
                          Joined {new Date(user.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4">
                      <div className="text-right space-y-1">
                        {getTierBadge(user)}
                        {getKycBadge(user.kyc_status)}
                      </div>

                      <div className="flex items-center space-x-2">
                        <Select
                          value={user.tier}
                          onValueChange={(value) => updateUserTier(user.user_id, value as User['tier'])}
                        >
                          <SelectTrigger className="w-[180px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="explorer">Explorer</SelectItem>
                            <SelectItem value="waitlist_player">Waitlist Player</SelectItem>
                            <SelectItem value="small_investor">Small Investor</SelectItem>
                            <SelectItem value="large_investor">Large Investor</SelectItem>
                          </SelectContent>
                        </Select>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedUser(user)}
                        >
                          View Details
                        </Button>

                        <Button
                          variant={user.is_admin ? "destructive" : "outline"}
                          size="sm"
                          onClick={() => toggleAdminStatus(user.user_id, user.is_admin || false)}
                        >
                          {user.is_admin ? 'Remove Admin' : 'Make Admin'}
                        </Button>

                        <Button
                          variant={user.subscription_active ? 'destructive' : 'outline'}
                          size="sm"
                          onClick={() => toggleSubscriptionStatus(user.user_id, user.subscription_active)}
                        >
                          {user.subscription_active ? 'Deactivate Sub' : 'Activate Sub'}
                        </Button>

                        {user.tier_override_by_admin && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removeUserOverride(user.user_id)}
                            className="flex items-center gap-1"
                          >
                            <Unlock className="w-3 h-3" />
                            Auto Calc
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {filteredUsers.length === 0 && (
                  <div className="text-center py-12">
                    <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-lg font-semibold mb-2">No Users Found</p>
                    <p className="text-muted-foreground">
                      No users match your current search and filter criteria.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* User Details Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-background rounded-lg w-full max-w-4xl max-h-[90vh] overflow-auto">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">User Details</h2>
                <p className="text-muted-foreground">{selectedUser.email}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedUser(null)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="p-6 space-y-6">
              {/* User Info */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex flex-col">
                  <p className="text-sm text-muted-foreground mb-2">Full Name</p>
                  <p className="font-medium">{selectedUser.full_name || 'Not provided'}</p>
                </div>
                <div className="flex flex-col">
                  <p className="text-sm text-muted-foreground mb-2">Tier</p>
                  <div className="flex">{getTierBadge(selectedUser)}</div>
                </div>
                <div className="flex flex-col">
                  <p className="text-sm text-muted-foreground mb-2">KYC Status</p>
                  <div className="flex">{getKycBadge(selectedUser.kyc_status)}</div>
                </div>
              </div>

              {/* Consolidated Investments */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Investments ({consolidatedInvestments.length} properties)</h3>
                {loadingDetails ? (
                  <div className="text-center py-4">Loading...</div>
                ) : consolidatedInvestments.length > 0 ? (
                  <div className="space-y-3">
                    {consolidatedInvestments.map((consolidated, index) => (
                      <div key={index} className="border border-border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h4 className="font-medium">{consolidated.property.title}</h4>
                            <p className="text-sm text-muted-foreground">
                              {consolidated.property.city}, {consolidated.property.country}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">₹{consolidated.totalInvestment.toLocaleString('en-IN')}</p>
                            <p className="text-sm text-muted-foreground">
                              {consolidated.totalShares} shares @ avg ₹{consolidated.averageSharePrice.toFixed(2)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {consolidated.investments.length} investment{consolidated.investments.length > 1 ? 's' : ''}
                            </p>
                          </div>
                        </div>
                        
                        {/* Expandable breakdown */}
                        <div className="mt-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setExpandedInvestment(
                              expandedInvestment === consolidated.property.id ? null : consolidated.property.id
                            )}
                            className="text-xs text-primary hover:text-white hover:bg-primary"
                          >
                            {expandedInvestment === consolidated.property.id ? 'Hide' : 'Show'} Investment Breakdown
                          </Button>
                          
                          {expandedInvestment === consolidated.property.id && (
                            <div className="mt-3 pl-4 border-l-2 border-border space-y-2">
                              {consolidated.investments.map((investment) => (
                                <div key={investment.id} className="text-sm">
                                  <div className="flex justify-between items-center">
                                    <span className="text-muted-foreground">
                                      {new Date(investment.created_at).toLocaleDateString('en-IN')}
                                    </span>
                                    <span>
                                      {investment.shares_owned} shares × ₹{investment.price_per_share} = 
                                      ₹{investment.total_investment.toLocaleString('en-IN')}
                                    </span>
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    Status: {investment.investment_status}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No investments found</p>
                )}
              </div>

              {/* Share Sell Requests */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Share Sell Requests ({userSellRequests.length})</h3>
                {loadingDetails ? (
                  <div className="text-center py-4">Loading...</div>
                ) : userSellRequests.length > 0 ? (
                  <div className="space-y-3">
                    {userSellRequests.map((sellRequest) => (
                      <div key={sellRequest.id} className="border border-border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h4 className="font-medium">{sellRequest.properties?.title || 'Unknown Property'}</h4>
                            <p className="text-sm text-muted-foreground">
                              {sellRequest.properties?.city}, {sellRequest.properties?.country}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">₹{(sellRequest.shares_to_sell * sellRequest.price_per_share).toLocaleString('en-IN')}</p>
                            <p className="text-sm text-muted-foreground">
                              {sellRequest.shares_to_sell} shares @ ₹{sellRequest.price_per_share.toLocaleString('en-IN')}
                            </p>
                          </div>
                        </div>
                        <div className="flex justify-between items-center">
                          <div className="text-xs text-muted-foreground">
                            Requested on {new Date(sellRequest.created_at).toLocaleDateString('en-IN')}
                          </div>
                          <Badge 
                            className={
                              sellRequest.status === 'active' ? 'bg-success/10 text-success border-success/20' :
                              sellRequest.status === 'pending' ? 'bg-warning/10 text-warning border-warning/20' :
                              sellRequest.status === 'expired' ? 'bg-destructive/10 text-destructive border-destructive/20' :
                              sellRequest.status === 'sold' ? 'bg-blue/10 text-blue border-blue/20' :
                              'bg-muted text-muted-foreground border-border'
                            }
                          >
                            {sellRequest.status ? sellRequest.status.toUpperCase() : 'UNKNOWN'}
                          </Badge>
                        </div>
                        {sellRequest.admin_notes && (
                          <div className="mt-2 p-2 bg-muted/50 rounded text-sm">
                            <strong>Admin Notes:</strong> {sellRequest.admin_notes}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No share sell requests found</p>
                )}
              </div>

              {/* Transactions */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Recent Transactions ({userTransactions.length})</h3>
                {loadingDetails ? (
                  <div className="text-center py-4">Loading...</div>
                ) : userTransactions.length > 0 ? (
                  <div className="space-y-3">
                    {userTransactions.slice(0, 10).map((transaction) => (
                      <div key={transaction.id} className="border border-border rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-medium">
                              {transaction.transaction_type.charAt(0).toUpperCase() + 
                               transaction.transaction_type.slice(1).replace('_', ' ')}
                            </h4>
                            {transaction.properties && (
                              <p className="text-sm text-muted-foreground">
                                {transaction.properties.title}
                                {transaction.properties.share_price && (
                                  <span> • Share price: ₹{transaction.properties.share_price.toLocaleString('en-IN')}</span>
                                )}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(transaction.created_at).toLocaleDateString('en-IN')}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">₹{transaction.amount.toLocaleString('en-IN')}</p>
                            <p className="text-sm text-muted-foreground">{transaction.status}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No transactions found</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsers;
