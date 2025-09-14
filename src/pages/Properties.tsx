import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useAdmin } from '@/hooks/useAdmin';
import { useWatchlist } from '@/hooks/useWatchlist';
import { supabase } from '@/integrations/supabase/client';
import { 
  BarChart3, 
  MapPin,
  TrendingUp,
  Building2,
  Home,
  Building,
  Users,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Crown,
  RefreshCw,
  Heart
} from 'lucide-react';

interface Property {
  id: string;
  title: string;
  location: string;
  totalValue: number;
  minInvestment: number;
  expectedROI: number;
  fundingProgress: number;
  type: 'residential' | 'commercial' | 'mixed-use';
  image: string;
  status: string;
  availableShares: number;
}

const Properties = () => {
  const { user, profile, signOut, addNotification } = useAuth();
  const navigate = useNavigate();
  const { isAdmin } = useAdmin();
  const { isInWatchlist, toggleWatchlist } = useWatchlist();

  // Require authentication to view properties; KYC not required
  useEffect(() => {
    if (!user) {
      navigate('/auth');
    }
  }, [user, navigate]);

  const handleDashboardClick = () => {
    // Route to different dashboards based on user tier
    if (profile?.tier === 'waitlist_player') {
      navigate('/waitlist-dashboard/overview');
    } else {
      navigate('/dashboard/overview');
    }
  };
  const [priceFilter, setPriceFilter] = useState('');
  const [roiFilter, setRoiFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchProperties = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .in('property_status', ['open', 'funded'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Fetch actual investment totals for each property
      const { data: investmentData, error: investmentError } = await supabase
        .from('investments')
        .select('property_id, total_investment')
        .eq('investment_status', 'confirmed');

      if (investmentError) throw investmentError;

      // Aggregate investments by property
      const investmentTotals = investmentData?.reduce((acc: Record<string, number>, investment) => {
        const propertyId = investment.property_id;
        if (propertyId) {
          acc[propertyId] = (acc[propertyId] || 0) + investment.total_investment;
        }
        return acc;
      }, {}) || {};

      const transformedProperties: Property[] = (data || []).map(property => {
        const actualInvested = investmentTotals[property.id] || 0;
        let fundingProgress = 0;
        
        // Calculate funding progress
        if (property.property_status === 'funded') {
          fundingProgress = 100; // Always 100% for sold out properties
        } else if (property.total_value > 0) {
          fundingProgress = Math.round((actualInvested / property.total_value) * 100);
          fundingProgress = Math.min(fundingProgress, 100); // Cap at 100%
        }

        // Calculate available shares based on total shares and actual investments
        let availableShares = property.available_shares || 0;
        
        // If status is 'open' but available_shares is 0, recalculate based on funding progress
        if (property.property_status === 'open' && availableShares <= 0) {
          const totalShares = Math.floor(property.total_value / (property.share_price || 1));
          const investedShares = Math.floor(actualInvested / (property.share_price || 1));
          availableShares = Math.max(0, totalShares - investedShares);
        }

        return {
          id: property.id,
          title: property.title,
          location: `${property.city}, ${property.country}`,
          totalValue: property.total_value,
          minInvestment: property.minimum_investment || property.share_price,
          expectedROI: property.expected_annual_return || 0,
          fundingProgress,
          type: (property.property_type?.toLowerCase().includes('residential') ? 'residential' : 
                 property.property_type?.toLowerCase().includes('commercial') ? 'commercial' : 'mixed-use') as 'residential' | 'commercial' | 'mixed-use',
          image: property.images?.[0] || null,
          status: property.property_status || 'open',
          availableShares
        };
      });

      setProperties(transformedProperties);
    } catch (error) {
      console.error('Error fetching properties:', error);
      setProperties([]);
      addNotification({
        name: "Failed to Load Properties",
        description: "Unable to load property listings. Please try again later.",
        icon: "ALERT_TRIANGLE",
        color: "#DC2626",
        isLogo: true
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProperties();
  }, [fetchProperties]);

  // Refresh data when window gains focus (e.g., coming back from admin panel)
  useEffect(() => {
    const handleFocus = () => {
      fetchProperties();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [fetchProperties]);

  const getPropertyTypeIcon = (type: string) => {
    switch (type) {
      case 'residential':
        return <Home className="w-4 h-4" />;
      case 'commercial':
        return <Building className="w-4 h-4" />;
      case 'mixed-use':
        return <Building2 className="w-4 h-4" />;
      default:
        return <Building2 className="w-4 h-4" />;
    }
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return 'bg-success';
    if (progress >= 60) return 'bg-primary';
    if (progress >= 40) return 'bg-warning';
    return 'bg-muted-foreground';
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Properties</h1>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchProperties}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
        {/* Search Section */}
        <div className="mb-8">

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-4 mb-4">
            <span className="text-sm font-medium text-foreground">Filters:</span>
            
            <Select value={priceFilter} onValueChange={setPriceFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Price" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Prices</SelectItem>
                <SelectItem value="0-500k">₹0 - ₹41.5L</SelectItem>
                <SelectItem value="500k-1m">₹41.5L - ₹83L</SelectItem>
                <SelectItem value="1m+">₹83L+</SelectItem>
              </SelectContent>
            </Select>

            <Select value={roiFilter} onValueChange={setRoiFilter}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="ROI" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All ROI</SelectItem>
                <SelectItem value="5-7">5% - 7%</SelectItem>
                <SelectItem value="7-9">7% - 9%</SelectItem>
                <SelectItem value="9+">9%+</SelectItem>
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Property type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="residential">Residential</SelectItem>
                <SelectItem value="commercial">Commercial</SelectItem>
                <SelectItem value="mixed-use">Mixed-Use</SelectItem>
              </SelectContent>
            </Select>

            {(priceFilter || roiFilter || typeFilter) && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => {
                  setPriceFilter('');
                  setRoiFilter('');
                  setTypeFilter('');
                }}
                className="text-primary hover:text-primary/80"
              >
                Clear all
              </Button>
            )}
          </div>
        </div>

        {/* Properties Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {loading ? (
            // Loading state
            Array.from({ length: 6 }).map((_, index) => (
              <Card key={index} className="investment-card overflow-hidden">
                <div className="aspect-video bg-muted animate-pulse"></div>
                <CardContent className="p-6">
                  <div className="space-y-3">
                    <div className="h-4 bg-muted rounded animate-pulse"></div>
                    <div className="h-3 bg-muted rounded animate-pulse w-2/3"></div>
                    <div className="h-3 bg-muted rounded animate-pulse w-1/2"></div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : properties.length > 0 ? (
            properties.map((property) => (
            <Card key={property.id} className="investment-card hover:shadow-xl transition-all duration-300 overflow-hidden">
              <div className="aspect-video bg-muted flex items-center justify-center overflow-hidden">
                {property.image ? (
                  <img 
                    src={property.image} 
                    alt={property.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Building2 className="w-12 h-12 text-muted-foreground" />
                )}
              </div>
              
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg text-foreground mb-1">
                      {property.title}
                    </h3>
                    <div className="flex items-center text-sm text-muted-foreground mb-2">
                      <MapPin className="w-4 h-4 mr-1" />
                      {property.location}
                    </div>
                  </div>
                  <div className="flex flex-col items-end space-y-1">
                    <Badge variant="outline" className="text-xs">
                      {property.type.toUpperCase()}
                    </Badge>
                    {property.status === 'funded' && (
                      <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-700">
                        SOLD OUT
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Total Value</p>
                    <p className="font-semibold text-foreground">
                      ₹{property.totalValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Min. Investment</p>
                    <p className="font-semibold text-foreground">
                      ₹{property.minInvestment.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Expected ROI</p>
                    <div className="flex items-center">
                      <span className="font-semibold text-success">
                        {property.expectedROI}%
                      </span>
                      <TrendingUp className="w-3 h-3 ml-1 text-success" />
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground mb-1">Funding Progress</p>
                    <div className="flex items-center space-x-2">
                      <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${getProgressColor(property.fundingProgress)} transition-all duration-300`}
                          style={{ width: `${property.fundingProgress}%` }}
                        ></div>
                      </div>
                      <span className="text-xs font-medium">{property.fundingProgress}%</span>
                    </div>
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div className="mt-4 pt-4 border-t border-border">
                  {property.status !== 'open' || property.availableShares <= 0 ? (
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <Button 
                          className="flex-1 bg-gray-500 text-white cursor-not-allowed"
                          disabled
                        >
                          Sold Out
                        </Button>
                        <Button 
                          variant="outline"
                          className="flex-1"
                          onClick={() => navigate(`/invest/${property.id}`)}
                        >
                          View Details
                        </Button>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full flex items-center gap-2 text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                        onClick={async () => {
                          const result = await toggleWatchlist(property.id);
                          if (result.success) {
                            addNotification({
                              name: isInWatchlist(property.id) ? "Removed from Watchlist" : "Added to Watchlist",
                              description: isInWatchlist(property.id) 
                                ? "Property removed from your watchlist" 
                                : "Property added to your watchlist",
                              icon: "HEART",
                              color: "#EA580C",
                              isLogo: true
                            });
                          }
                        }}
                      >
                        <Heart className={`w-4 h-4 ${isInWatchlist(property.id) ? 'fill-current' : ''}`} />
                        {isInWatchlist(property.id) ? 'Remove from Watchlist' : 'Add to Watchlist'}
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Button 
                        className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                        onClick={() => {
                          // If admin override + investor tier => allow invest without KYC
                          const isInvestorTier = profile?.tier === 'small_investor' || profile?.tier === 'large_investor';
                          if (!(profile?.tier_override_by_admin && isInvestorTier) && profile?.kyc_status !== 'approved') {
                            addNotification({
                              name: "KYC Required",
                              description: "Please complete your KYC verification to start investing",
                              icon: "SHIELD_ALERT",
                              color: "#DC2626",
                              isLogo: true
                            });
                            navigate('/kyc');
                            return;
                          }
                          // Navigate to investment flow
                          navigate(`/invest/${property.id}`);
                        }}
                      >
                        Invest Now
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full flex items-center gap-2 text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                        onClick={async () => {
                          const result = await toggleWatchlist(property.id);
                          if (result.success) {
                            addNotification({
                              name: isInWatchlist(property.id) ? "Removed from Watchlist" : "Added to Watchlist",
                              description: isInWatchlist(property.id) 
                                ? "Property removed from your watchlist" 
                                : "Property added to your watchlist",
                              icon: "HEART",
                              color: "#EA580C",
                              isLogo: true
                            });
                          }
                        }}
                      >
                        <Heart className={`w-4 h-4 ${isInWatchlist(property.id) ? 'fill-current' : ''}`} />
                        {isInWatchlist(property.id) ? 'Remove from Watchlist' : 'Add to Watchlist'}
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
          ) : (
            // Empty state
            <div className="col-span-full text-center py-12">
              <Building2 className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Properties Available</h3>
              <p className="text-muted-foreground">
                There are currently no properties available for investment. Please check back later.
              </p>
            </div>
          )}
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-center space-x-2">
          <Button variant="outline" size="icon" disabled>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          
          <Button variant="default" size="sm">1</Button>
          <Button variant="outline" size="sm">2</Button>
          <Button variant="outline" size="sm">3</Button>
          <span className="text-muted-foreground">...</span>
          <Button variant="outline" size="sm">8</Button>
          
          <Button variant="outline" size="icon">
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Properties;
