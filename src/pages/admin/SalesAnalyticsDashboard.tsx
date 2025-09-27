import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/NewAuthContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarInitials } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { isAdmin } from '@/utils/permissions';
import {
  TrendingUp,
  TrendingDown,
  Users,
  Target,
  Clock,
  DollarSign,
  Eye,
  MessageSquare,
  Activity,
  Brain,
  Zap,
  AlertTriangle,
  Calendar,
  Search,
  Filter,
  Download,
  RefreshCw,
  BarChart3,
  PieChart,
  LineChart,
  User,
  Building2,
  Heart,
  FileText,
  Star,
  Flame,
  Snowflake,
  TrendingDown as TrendingDownIcon
} from 'lucide-react';

interface UserInsight {
  id: string;
  user_id: string;
  lead_score: number;
  lead_temperature: 'hot' | 'warm' | 'cold';
  preferred_investment_range: string;
  favorite_property_types: string[];
  favorite_locations: string[];
  investment_timeline: string;
  risk_tolerance: string;
  engagement_frequency: string;
  last_activity: string;
  next_follow_up_date: string;
  sales_notes: string;
  assigned_sales_rep: string;
  lead_source: string;
  is_research_heavy: boolean;
  is_price_sensitive: boolean;
  is_location_focused: boolean;
  prefers_new_properties: boolean;
  likely_to_invest_soon: boolean;
  needs_nurturing: boolean;
  user_profiles: {
    full_name: string;
    email: string;
    tier: string;
    created_at: string;
  };
  recent_activity: any[];
  property_interests: any[];
  engagement_score: number;
  intent_score: number;
  risk_score: number;
}

interface SalesMetrics {
  totalLeads: number;
  hotLeads: number;
  warmLeads: number;
  coldLeads: number;
  avgEngagementScore: number;
  avgIntentScore: number;
  conversionRate: number;
  totalPropertyViews: number;
  activeInvestors: number;
  recentSignups: number;
}

const SalesAnalyticsDashboard: React.FC = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [insights, setInsights] = useState<UserInsight[]>([]);
  const [metrics, setMetrics] = useState<SalesMetrics>({
    totalLeads: 0,
    hotLeads: 0,
    warmLeads: 0,
    coldLeads: 0,
    avgEngagementScore: 0,
    avgIntentScore: 0,
    conversionRate: 0,
    totalPropertyViews: 0,
    activeInvestors: 0,
    recentSignups: 0
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [temperatureFilter, setTemperatureFilter] = useState('all');
  const [tierFilter, setTierFilter] = useState('all');
  const [timelineFilter, setTimelineFilter] = useState('all');
  const [sortBy, setSortBy] = useState('lead_score');

  // Redirect non-admin users
  useEffect(() => {
    if (profile && !isAdmin(profile)) {
      navigate('/dashboard');
    }
  }, [profile, navigate]);

  const fetchSalesInsights = async () => {
    setLoading(true);
    try {
      // Fetch sales insights with user profiles and recent activity
      const { data: insightsData, error: insightsError } = await supabase
        .from('sales_insights')
        .select(`
          *,
          user_profiles (
            full_name,
            email,
            tier,
            created_at
          )
        `)
        .order(sortBy, { ascending: false });

      if (insightsError) throw insightsError;

      // Fetch recent activity for each user
      const enrichedInsights = await Promise.all(
        (insightsData || []).map(async (insight) => {
          // Get recent events
          const { data: recentActivity } = await supabase
            .from('user_events')
            .select('event_type, event_action, property_id, timestamp, metadata')
            .eq('user_id', insight.user_id)
            .order('timestamp', { ascending: false })
            .limit(10);

          // Get property interests (most viewed properties)
          const { data: propertyInterests } = await supabase
            .from('property_engagements')
            .select(`
              property_id,
              total_views,
              total_time_spent,
              watchlist_added_at,
              notes_count,
              investment_started_at,
              properties (title, city, country, property_type, share_price)
            `)
            .eq('user_id', insight.user_id)
            .order('total_views', { ascending: false })
            .limit(5);

          // Get engagement metrics
          const { data: analytics } = await supabase
            .from('user_analytics')
            .select('engagement_score, intent_score, risk_score')
            .eq('user_id', insight.user_id)
            .order('date', { ascending: false })
            .limit(1)
            .single();

          return {
            ...insight,
            recent_activity: recentActivity || [],
            property_interests: propertyInterests || [],
            engagement_score: analytics?.engagement_score || 0,
            intent_score: analytics?.intent_score || 0,
            risk_score: analytics?.risk_score || 0
          };
        })
      );

      setInsights(enrichedInsights);

      // Calculate metrics
      const totalLeads = enrichedInsights.length;
      const hotLeads = enrichedInsights.filter(i => i.lead_temperature === 'hot').length;
      const warmLeads = enrichedInsights.filter(i => i.lead_temperature === 'warm').length;
      const coldLeads = enrichedInsights.filter(i => i.lead_temperature === 'cold').length;
      const avgEngagementScore = enrichedInsights.reduce((sum, i) => sum + (i.engagement_score || 0), 0) / totalLeads;
      const avgIntentScore = enrichedInsights.reduce((sum, i) => sum + (i.intent_score || 0), 0) / totalLeads;

      setMetrics({
        totalLeads,
        hotLeads,
        warmLeads,
        coldLeads,
        avgEngagementScore: Math.round(avgEngagementScore),
        avgIntentScore: Math.round(avgIntentScore),
        conversionRate: 0, // TODO: Calculate from investments
        totalPropertyViews: 0, // TODO: Calculate from events
        activeInvestors: 0, // TODO: Calculate from investments
        recentSignups: 0 // TODO: Calculate from recent registrations
      });

    } catch (error) {
      console.error('Error fetching sales insights:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin(profile)) {
      fetchSalesInsights();
    }
  }, [profile, sortBy]);

  const filteredInsights = insights.filter(insight => {
    const matchesSearch =
      insight.user_profiles.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      insight.user_profiles.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      insight.sales_notes?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesTemperature = temperatureFilter === 'all' || insight.lead_temperature === temperatureFilter;
    const matchesTier = tierFilter === 'all' || insight.user_profiles.tier === tierFilter;
    const matchesTimeline = timelineFilter === 'all' || insight.investment_timeline === timelineFilter;

    return matchesSearch && matchesTemperature && matchesTier && matchesTimeline;
  });

  const getTemperatureIcon = (temperature: string) => {
    switch (temperature) {
      case 'hot': return <Flame className="w-4 h-4 text-red-500" />;
      case 'warm': return <Star className="w-4 h-4 text-yellow-500" />;
      case 'cold': return <Snowflake className="w-4 h-4 text-blue-500" />;
      default: return <TrendingDownIcon className="w-4 h-4 text-gray-500" />;
    }
  };

  const getTemperatureColor = (temperature: string) => {
    switch (temperature) {
      case 'hot': return 'bg-red-100 text-red-800 border-red-200';
      case 'warm': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'cold': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatCurrency = (amount: number) => {
    if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)}Cr`;
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
    if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
    return `₹${amount}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  if (!isAdmin(profile)) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center">
          <Brain className="w-8 h-8 mr-3 text-primary" />
          Sales Analytics Dashboard
        </h1>
        <p className="text-muted-foreground mt-2">
          Understand user psychology and behavior to nurture leads effectively
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Leads</p>
                <p className="text-2xl font-bold">{metrics.totalLeads}</p>
              </div>
              <Users className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Hot Leads</p>
                <p className="text-2xl font-bold text-red-600">{metrics.hotLeads}</p>
              </div>
              <Flame className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Warm Leads</p>
                <p className="text-2xl font-bold text-yellow-600">{metrics.warmLeads}</p>
              </div>
              <Star className="w-8 h-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Engagement</p>
                <p className="text-2xl font-bold text-green-600">{metrics.avgEngagementScore}%</p>
              </div>
              <Activity className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Intent Score</p>
                <p className="text-2xl font-bold text-purple-600">{metrics.avgIntentScore}%</p>
              </div>
              <Target className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="insights" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="insights">Lead Insights</TabsTrigger>
          <TabsTrigger value="analytics">Behavioral Analytics</TabsTrigger>
          <TabsTrigger value="journey">User Journey</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="insights" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle>Filters & Search</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Search leads..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <Select value={temperatureFilter} onValueChange={setTemperatureFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Temperature" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Temperatures</SelectItem>
                    <SelectItem value="hot">Hot</SelectItem>
                    <SelectItem value="warm">Warm</SelectItem>
                    <SelectItem value="cold">Cold</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={tierFilter} onValueChange={setTierFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="User Tier" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Tiers</SelectItem>
                    <SelectItem value="explorer">Explorer</SelectItem>
                    <SelectItem value="waitlist_player">Waitlist Player</SelectItem>
                    <SelectItem value="small_investor">Small Investor</SelectItem>
                    <SelectItem value="large_investor">Large Investor</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lead_score">Lead Score</SelectItem>
                    <SelectItem value="last_activity">Last Activity</SelectItem>
                    <SelectItem value="engagement_score">Engagement</SelectItem>
                    <SelectItem value="intent_score">Intent</SelectItem>
                  </SelectContent>
                </Select>

                <Button variant="outline" onClick={fetchSalesInsights} disabled={loading}>
                  <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Lead Insights Grid */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                <p className="text-sm text-muted-foreground">Loading insights...</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredInsights.map((insight) => (
                <Card key={insight.id} className="overflow-hidden">
                  <CardContent className="p-6">
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                      {/* User Profile */}
                      <div className="space-y-4">
                        <div className="flex items-start space-x-3">
                          <Avatar className="w-12 h-12">
                            <AvatarFallback>
                              {insight.user_profiles.full_name?.split(' ').map(n => n[0]).join('') || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold truncate">
                              {insight.user_profiles.full_name || 'Anonymous User'}
                            </h3>
                            <p className="text-sm text-muted-foreground truncate">
                              {insight.user_profiles.email}
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant="secondary" className="text-xs">
                                {insight.user_profiles.tier?.replace('_', ' ')}
                              </Badge>
                              <Badge className={`text-xs ${getTemperatureColor(insight.lead_temperature)}`}>
                                {getTemperatureIcon(insight.lead_temperature)}
                                {insight.lead_temperature}
                              </Badge>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Lead Score</span>
                            <span className={`font-semibold ${getScoreColor(insight.lead_score)}`}>
                              {insight.lead_score}/100
                            </span>
                          </div>
                          <Progress value={insight.lead_score} className="h-2" />
                        </div>
                      </div>

                      {/* Behavioral Insights */}
                      <div className="space-y-4">
                        <h4 className="font-medium flex items-center">
                          <Brain className="w-4 h-4 mr-2" />
                          Psychology Profile
                        </h4>
                        <div className="space-y-2 text-sm">
                          <div className="grid grid-cols-3 gap-2">
                            <div className="text-center">
                              <div className={`font-semibold ${getScoreColor(insight.engagement_score)}`}>
                                {insight.engagement_score}%
                              </div>
                              <div className="text-xs text-muted-foreground">Engagement</div>
                            </div>
                            <div className="text-center">
                              <div className={`font-semibold ${getScoreColor(insight.intent_score)}`}>
                                {insight.intent_score}%
                              </div>
                              <div className="text-xs text-muted-foreground">Intent</div>
                            </div>
                            <div className="text-center">
                              <div className={`font-semibold ${getScoreColor(100 - insight.risk_score)}`}>
                                {100 - insight.risk_score}%
                              </div>
                              <div className="text-xs text-muted-foreground">Stability</div>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-1 text-xs">
                          {insight.is_research_heavy && (
                            <Badge variant="outline" className="text-xs">Research Heavy</Badge>
                          )}
                          {insight.is_price_sensitive && (
                            <Badge variant="outline" className="text-xs">Price Sensitive</Badge>
                          )}
                          {insight.is_location_focused && (
                            <Badge variant="outline" className="text-xs">Location Focused</Badge>
                          )}
                          {insight.likely_to_invest_soon && (
                            <Badge variant="outline" className="text-xs text-green-700 border-green-200">
                              Ready to Invest
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Property Interests */}
                      <div className="space-y-4">
                        <h4 className="font-medium flex items-center">
                          <Building2 className="w-4 h-4 mr-2" />
                          Property Interests
                        </h4>
                        <div className="space-y-2">
                          {insight.property_interests.slice(0, 3).map((property, index) => (
                            <div key={index} className="p-2 bg-muted/30 rounded text-xs">
                              <div className="font-medium truncate">
                                {property.properties?.title || 'Unknown Property'}
                              </div>
                              <div className="text-muted-foreground">
                                {property.total_views} views • {Math.floor(property.total_time_spent / 60)}min
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="text-xs space-y-1">
                          <div>Timeline: <span className="font-medium">{insight.investment_timeline}</span></div>
                          <div>Range: <span className="font-medium">{insight.preferred_investment_range}</span></div>
                        </div>
                      </div>

                      {/* Actions & Notes */}
                      <div className="space-y-4">
                        <h4 className="font-medium flex items-center">
                          <MessageSquare className="w-4 h-4 mr-2" />
                          Sales Actions
                        </h4>

                        <div className="text-xs space-y-2">
                          <div>
                            <span className="text-muted-foreground">Last Activity:</span>
                            <div className="font-medium">{formatDate(insight.last_activity)}</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Next Follow-up:</span>
                            <div className="font-medium">{formatDate(insight.next_follow_up_date)}</div>
                          </div>
                        </div>

                        {insight.sales_notes && (
                          <div className="p-2 bg-blue-50 rounded text-xs">
                            <div className="font-medium text-blue-800">Sales Notes:</div>
                            <div className="text-blue-700 mt-1">{insight.sales_notes}</div>
                          </div>
                        )}

                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" className="text-xs">
                            <MessageSquare className="w-3 h-3 mr-1" />
                            Contact
                          </Button>
                          <Button size="sm" variant="outline" className="text-xs">
                            <Calendar className="w-3 h-3 mr-1" />
                            Schedule
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Behavioral Analytics Dashboard</CardTitle>
              <CardDescription>
                Deep insights into user behavior patterns and psychological profiles
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-lg font-medium">Advanced Analytics Coming Soon</p>
                <p className="text-sm text-muted-foreground">
                  This section will contain detailed behavioral analytics, heat maps, and conversion funnels
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="journey" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>User Journey Visualization</CardTitle>
              <CardDescription>
                Track user progression through the sales funnel
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <LineChart className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-lg font-medium">Journey Mapping Coming Soon</p>
                <p className="text-sm text-muted-foreground">
                  Visualize user paths, drop-off points, and conversion triggers
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Sales Reports & Exports</CardTitle>
              <CardDescription>
                Generate detailed reports for sales team analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button variant="outline" className="h-24 flex flex-col">
                  <Download className="w-6 h-6 mb-2" />
                  <span>Lead Export</span>
                  <span className="text-xs text-muted-foreground">CSV/Excel</span>
                </Button>
                <Button variant="outline" className="h-24 flex flex-col">
                  <PieChart className="w-6 h-6 mb-2" />
                  <span>Conversion Report</span>
                  <span className="text-xs text-muted-foreground">PDF</span>
                </Button>
                <Button variant="outline" className="h-24 flex flex-col">
                  <Activity className="w-6 h-6 mb-2" />
                  <span>Activity Summary</span>
                  <span className="text-xs text-muted-foreground">Weekly/Monthly</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SalesAnalyticsDashboard;