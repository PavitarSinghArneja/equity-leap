import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/NewAuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { PropertyNotesAIAnalysis } from '@/components/admin/PropertyNotesAIAnalysis';
import {
  BarChart3,
  Users,
  Building2,
  FileCheck,
  MessageSquare,
  TrendingUp,
  TrendingDown,
  Plus,
  RefreshCw,
  StickyNote,
  LineChart,
  Calendar,
  User,
  Eye,
  Brain,
  DollarSign
} from 'lucide-react';

interface PropertyNote {
  id: string;
  user_id: string;
  property_id: string;
  notes: string;
  added_at: string;
  user_profiles: {
    full_name: string;
    email: string;
    tier: string;
  };
  properties: {
    title: string;
    city: string;
    country: string;
  };
}

interface UserAnalytic {
  user_id: string;
  full_name: string;
  email: string;
  tier: string;
  watchlist_count: number;
  notes_count: number;
  engagement_score: number;
  last_activity: string;
}

const AdminPanel = () => {
  const { user, profile, addNotification } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  // Format currency for display
  const formatCurrency = (amount: number): string => {
    if (amount >= 1e7) {
      return (amount / 1e7).toFixed(1) + 'Cr';
    } else if (amount >= 1e5) {
      return (amount / 1e5).toFixed(1) + 'L';
    } else if (amount >= 1e3) {
      return (amount / 1e3).toFixed(1) + 'K';
    }
    return amount.toLocaleString('en-IN');
  };

  // Overview state
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeSubscribers: 0,
    pendingKYC: 0,
    activeProperties: 0,
    totalInvestments: 0,
    totalInvestmentValue: 0,
    pendingTickets: 0
  });

  // Property Notes state
  const [propertyNotes, setPropertyNotes] = useState<PropertyNote[]>([]);

  // User Analytics state
  const [userAnalytics, setUserAnalytics] = useState<UserAnalytic[]>([]);

  // Check admin access
  useEffect(() => {
    if (profile && !profile.is_admin) {
      navigate('/dashboard');
    }
  }, [profile, navigate]);

  // Fetch all data
  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch stats for overview
      const { count: totalUsers } = await supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true });

      const { count: activeSubscribers } = await supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true })
        .eq('subscription_active', true);

      // Count pending KYC documents (could be multiple docs per user)
      const { count: pendingKYC } = await supabase
        .from('kyc_documents')
        .select('*', { count: 'exact', head: true })
        .in('verification_status', ['pending', 'under_review']);

      // Count active properties using correct enum values
      const { count: activeProperties } = await supabase
        .from('properties')
        .select('*', { count: 'exact', head: true })
        .in('property_status', ['upcoming', 'open', 'funded']);

      // Get investment counts and totals
      const { count: totalInvestments } = await supabase
        .from('investments')
        .select('*', { count: 'exact', head: true });

      // Get total investment value (sum of all investment amounts)
      const { data: investmentSums } = await supabase
        .from('investments')
        .select('total_investment');

      const totalInvestmentValue = (investmentSums || []).reduce(
        (sum, investment) => sum + (investment.total_investment || 0),
        0
      );

      // Support tickets table doesn't exist, so set to 0
      const pendingTickets = 0;

      setStats({
        totalUsers: totalUsers || 0,
        activeSubscribers: activeSubscribers || 0,
        pendingKYC: pendingKYC || 0,
        activeProperties: activeProperties || 0,
        totalInvestments: totalInvestments || 0,
        totalInvestmentValue: totalInvestmentValue || 0,
        pendingTickets: pendingTickets
      });

      // Fetch property notes
      const { data: notesData } = await supabase
        .from('watchlist')
        .select(`
          id,
          user_id,
          property_id,
          notes,
          added_at,
          user_profiles:user_id (
            full_name,
            email,
            tier
          ),
          properties:property_id (
            title,
            city,
            country
          )
        `)
        .not('notes', 'is', null)
        .neq('notes', '')
        .order('added_at', { ascending: false })
        .limit(20);

      setPropertyNotes(notesData || []);

      // Fetch user analytics
      const { data: usersData } = await supabase
        .from('user_profiles')
        .select('user_id, full_name, email, tier, updated_at')
        .order('updated_at', { ascending: false })
        .limit(20);

      const { data: watchlistData } = await supabase
        .from('watchlist')
        .select('user_id, notes');

      // Process analytics
      const analytics = (usersData || []).map(user => {
        const userWatchlist = (watchlistData || []).filter(w => w.user_id === user.user_id);
        const notesCount = userWatchlist.filter(w => w.notes && w.notes.trim() !== '').length;
        const watchlistCount = userWatchlist.length;
        const engagementScore = Math.min((watchlistCount * 10) + (notesCount * 20), 100);

        return {
          user_id: user.user_id,
          full_name: user.full_name || 'Unknown',
          email: user.email,
          tier: user.tier,
          watchlist_count: watchlistCount,
          notes_count: notesCount,
          engagement_score: engagementScore,
          last_activity: user.updated_at
        };
      });

      setUserAnalytics(analytics);

    } catch (error) {
      console.error('Error fetching data:', error);
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to load admin data'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (profile?.is_admin) {
      fetchData();
    }
  }, [profile]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getEngagementBadge = (score: number) => {
    if (score >= 50) return <Badge className="bg-green-100 text-green-800">High</Badge>;
    if (score >= 20) return <Badge className="bg-yellow-100 text-yellow-800">Medium</Badge>;
    return <Badge className="bg-gray-100 text-gray-800">Low</Badge>;
  };

  if (!profile?.is_admin) {
    return null;
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Admin Panel</h1>
        <p className="text-muted-foreground">Comprehensive admin dashboard with analytics</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="notes">Property Notes</TabsTrigger>
          <TabsTrigger value="analytics">User Analytics</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/admin/users')}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <Users className="w-8 h-8 text-blue-600" />
                  <span className="text-2xl font-bold">{stats.totalUsers}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-2">Total Users</p>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/admin/users?subscription=active')}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <TrendingUp className="w-8 h-8 text-green-600" />
                  <span className="text-2xl font-bold">{stats.activeSubscribers}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-2">Active Subscribers</p>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/admin/kyc')}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <FileCheck className="w-8 h-8 text-orange-600" />
                  <span className="text-2xl font-bold">{stats.pendingKYC}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-2">Pending KYC</p>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/admin/properties')}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <Building2 className="w-8 h-8 text-purple-600" />
                  <span className="text-2xl font-bold">{stats.activeProperties}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-2">Active Properties</p>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/admin/investments')}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <BarChart3 className="w-8 h-8 text-indigo-600" />
                  <span className="text-2xl font-bold">{stats.totalInvestments}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-2">Total Investments</p>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/admin/investments')}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <DollarSign className="w-8 h-8 text-green-600" />
                  <span className="text-lg font-bold">₹{formatCurrency(stats.totalInvestmentValue)}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-2">Investment Value</p>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/admin/support')}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <MessageSquare className="w-8 h-8 text-red-600" />
                  <span className="text-2xl font-bold">{stats.pendingTickets}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-2">Pending Tickets</p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common administrative tasks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* First Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                </div>

                {/* Second Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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

                  <Button
                    variant="outline"
                    className="h-auto p-4 flex flex-col items-center space-y-2 border-blue-200 text-blue-700 hover:bg-blue-50"
                    onClick={() => setActiveTab('notes')}
                  >
                    <StickyNote className="w-6 h-6" />
                    <span>Property Notes</span>
                  </Button>

                  <Button
                    variant="outline"
                    className="h-auto p-4 flex flex-col items-center space-y-2 border-purple-200 text-purple-700 hover:bg-purple-50"
                    onClick={() => setActiveTab('analytics')}
                  >
                    <LineChart className="w-6 h-6" />
                    <span>User Analytics</span>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Property Notes Tab */}
        <TabsContent value="notes" className="space-y-6">
          {/* AI Analysis Section */}
          <PropertyNotesAIAnalysis />

          {/* All Property Notes Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <StickyNote className="w-6 h-6 mr-2 text-blue-600" />
                All Property Notes
              </CardTitle>
              <CardDescription>
                View all user notes on properties ({propertyNotes.length} total)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {propertyNotes.length === 0 ? (
                  <div className="text-center py-8">
                    <StickyNote className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Notes Found</h3>
                    <p className="text-muted-foreground">
                      Users haven't added any notes to properties yet.
                    </p>
                  </div>
                ) : (
                  propertyNotes.map((note) => (
                    <div key={note.id} className="border rounded-lg p-4 hover:shadow-sm transition-shadow">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center space-x-3">
                          <User className="w-5 h-5 text-muted-foreground" />
                          <div>
                            <p className="font-semibold">{note.user_profiles?.full_name || 'Unknown'}</p>
                            <p className="text-sm text-muted-foreground">{note.user_profiles?.email}</p>
                          </div>
                          <Badge variant="outline">{note.user_profiles?.tier || 'explorer'}</Badge>
                        </div>
                        <div className="flex items-center text-xs text-muted-foreground">
                          <Calendar className="w-3 h-3 mr-1" />
                          {formatDate(note.added_at)}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 mb-2">
                        <Building2 className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">{note.properties?.title || 'Unknown'}</span>
                        <span className="text-sm text-muted-foreground">
                          • {note.properties?.city}, {note.properties?.country}
                        </span>
                      </div>
                      <div className="bg-muted/30 rounded-lg p-3">
                        <p className="text-sm whitespace-pre-wrap">{note.notes}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* User Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <LineChart className="w-6 h-6 mr-2 text-purple-600" />
                User Analytics
              </CardTitle>
              <CardDescription>
                User engagement and behavioral insights
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {userAnalytics.length === 0 ? (
                  <div className="text-center py-8">
                    <LineChart className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Analytics Data</h3>
                    <p className="text-muted-foreground">
                      No user engagement data available yet.
                    </p>
                  </div>
                ) : (
                  userAnalytics.map((user) => (
                    <div key={user.user_id} className="border rounded-lg p-4 hover:shadow-sm transition-shadow">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-3">
                            <h4 className="font-semibold">{user.full_name}</h4>
                            <Badge variant="outline">{user.tier}</Badge>
                            {getEngagementBadge(user.engagement_score)}
                          </div>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                        <div className="text-right space-y-1">
                          <p className="text-sm text-muted-foreground">Score</p>
                          <p className="text-lg font-bold">{user.engagement_score}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4 mt-3 pt-3 border-t">
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground">Watchlist</p>
                          <p className="font-semibold">{user.watchlist_count}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground">Notes</p>
                          <p className="font-semibold">{user.notes_count}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground">Last Activity</p>
                          <p className="text-xs">{formatDate(user.last_activity)}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminPanel;