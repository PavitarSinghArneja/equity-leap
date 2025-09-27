import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/NewAuthContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, LineChart, Users, Building2, TrendingUp, Eye } from 'lucide-react';

interface UserAnalytics {
  user_id: string;
  full_name: string;
  email: string;
  tier: string;
  properties_viewed: number;
  notes_count: number;
  watchlist_count: number;
  last_activity: string;
  engagement_score: number;
}

const SalesAnalytics = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState<UserAnalytics[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalNotes: 0,
    totalWatchlists: 0
  });

  // Check admin access
  useEffect(() => {
    if (profile && !profile.is_admin) {
      navigate('/dashboard');
    }
  }, [profile, navigate]);

  // Fetch analytics data
  const fetchAnalytics = async () => {
    try {
      // Get user analytics
      const { data: usersData, error: usersError } = await supabase
        .from('user_profiles')
        .select(`
          user_id,
          full_name,
          email,
          tier,
          updated_at
        `)
        .order('updated_at', { ascending: false });

      if (usersError) throw usersError;

      // Get watchlist data with notes
      const { data: watchlistData, error: watchlistError } = await supabase
        .from('watchlist')
        .select('user_id, notes, property_id, added_at');

      if (watchlistError) throw watchlistError;

      // Process analytics
      const userAnalytics = (usersData || []).map(user => {
        const userWatchlist = (watchlistData || []).filter(w => w.user_id === user.user_id);
        const notesCount = userWatchlist.filter(w => w.notes && w.notes.trim() !== '').length;
        const watchlistCount = userWatchlist.length;

        // Simple engagement score calculation
        let engagementScore = 0;
        engagementScore += watchlistCount * 10; // 10 points per watchlist item
        engagementScore += notesCount * 20; // 20 points per note

        const lastActivity = userWatchlist.length > 0
          ? Math.max(...userWatchlist.map(w => new Date(w.added_at).getTime()))
          : new Date(user.updated_at).getTime();

        return {
          user_id: user.user_id,
          full_name: user.full_name || 'Unknown',
          email: user.email,
          tier: user.tier,
          properties_viewed: watchlistCount, // Simplified for now
          notes_count: notesCount,
          watchlist_count: watchlistCount,
          last_activity: new Date(lastActivity).toISOString(),
          engagement_score: Math.min(engagementScore, 100) // Cap at 100
        };
      });

      setAnalytics(userAnalytics);

      // Calculate stats
      setStats({
        totalUsers: usersData?.length || 0,
        activeUsers: userAnalytics.filter(u => u.engagement_score > 0).length,
        totalNotes: userAnalytics.reduce((sum, u) => sum + u.notes_count, 0),
        totalWatchlists: userAnalytics.reduce((sum, u) => sum + u.watchlist_count, 0)
      });

    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (profile?.is_admin) {
      fetchAnalytics();
    }
  }, [profile]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getEngagementLevel = (score: number) => {
    if (score >= 50) return { label: 'High', color: 'bg-green-100 text-green-800' };
    if (score >= 20) return { label: 'Medium', color: 'bg-yellow-100 text-yellow-800' };
    return { label: 'Low', color: 'bg-gray-100 text-gray-800' };
  };

  if (!profile?.is_admin) {
    return null;
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center">
          <div className="text-center">Loading sales analytics...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/admin')}
          className="mr-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Admin
        </Button>
        <div>
          <h1 className="text-3xl font-bold flex items-center">
            <LineChart className="w-8 h-8 mr-3 text-purple-600" />
            Sales Analytics
          </h1>
          <p className="text-muted-foreground">User engagement and behavioral insights</p>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Users</p>
                <p className="text-2xl font-bold">{stats.totalUsers}</p>
              </div>
              <Users className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Users</p>
                <p className="text-2xl font-bold">{stats.activeUsers}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Notes</p>
                <p className="text-2xl font-bold">{stats.totalNotes}</p>
              </div>
              <Eye className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Watchlists</p>
                <p className="text-2xl font-bold">{stats.totalWatchlists}</p>
              </div>
              <Building2 className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* User Analytics Table */}
      <Card>
        <CardHeader>
          <CardTitle>User Engagement Analytics</CardTitle>
          <CardDescription>
            User behavior and engagement metrics for sales team insights
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analytics.length === 0 ? (
              <div className="text-center py-8">
                <LineChart className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Analytics Data</h3>
                <p className="text-muted-foreground">No user engagement data available yet.</p>
              </div>
            ) : (
              analytics.slice(0, 20).map((user) => {
                const engagement = getEngagementLevel(user.engagement_score);
                return (
                  <div key={user.user_id} className="border rounded-lg p-4 hover:shadow-sm transition-shadow">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-3">
                          <h4 className="font-semibold">{user.full_name}</h4>
                          <Badge variant="outline">{user.tier}</Badge>
                          <Badge className={engagement.color}>{engagement.label}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                      <div className="text-right space-y-1">
                        <p className="text-sm text-muted-foreground">Engagement Score</p>
                        <p className="text-lg font-bold">{user.engagement_score}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 mt-3 pt-3 border-t">
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">Properties</p>
                        <p className="font-semibold">{user.properties_viewed}</p>
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
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SalesAnalytics;