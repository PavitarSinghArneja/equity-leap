import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  Heart,
  Building2,
  TrendingUp,
  MapPin,
  DollarSign,
  Eye,
  ShoppingCart,
  AlertTriangle,
  Zap
} from 'lucide-react';

interface WatchlistProperty {
  id: string;
  property_id: string;
  added_at: string;
  properties: {
    id: string;
    title: string;
    city: string;
    country: string;
    property_type: string;
    share_price: number;
    minimum_investment: number;
    property_status: string;
    expected_annual_return: number;
    shares_sellable: boolean;
    available_shares: number;
    images?: string[];
  };
  has_available_shares?: boolean;
}

const MyWatchlistEnhanced: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [watchlistItems, setWatchlistItems] = useState<WatchlistProperty[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchWatchlist = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('watchlist')
        .select(`
          *,
          properties (
            id,
            title,
            city,
            country,
            property_type,
            share_price,
            minimum_investment,
            property_status,
            expected_annual_return,
            shares_sellable,
            available_shares,
            images
          )
        `)
        .eq('user_id', user.id)
        .order('added_at', { ascending: false });

      if (error) throw error;

      // Check for available shares for sold-out watchlist properties
      const enrichedData = await Promise.all(
        (data || []).map(async (item) => {
          let hasAvailableShares = false;
          
          if (item.properties.property_status === 'funded' && item.properties.shares_sellable) {
            const { data: sellRequests, error: sellError } = await supabase
              .from('share_sell_requests')
              .select('id')
              .eq('property_id', item.property_id)
              .eq('status', 'active')
              .limit(1);

            if (!sellError && sellRequests && sellRequests.length > 0) {
              hasAvailableShares = true;
            }
          }

          return {
            ...item,
            has_available_shares: hasAvailableShares
          };
        })
      );

      setWatchlistItems(enrichedData);
    } catch (error) {
      console.error('Error fetching watchlist:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWatchlist();
  }, [user]);

  const removeFromWatchlist = async (watchlistId: string) => {
    try {
      const { error } = await supabase
        .from('watchlist')
        .delete()
        .eq('id', watchlistId)
        .eq('user_id', user?.id);

      if (error) throw error;
      
      fetchWatchlist(); // Refresh the list
    } catch (error) {
      console.error('Error removing from watchlist:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      upcoming: { label: 'Upcoming', color: 'bg-blue-100 text-blue-800' },
      open: { label: 'Open', color: 'bg-green-100 text-green-800' },
      funded: { label: 'Funded', color: 'bg-purple-100 text-purple-800' },
      closed: { label: 'Closed', color: 'bg-gray-100 text-gray-800' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.open;
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Heart className="w-5 h-5 mr-2" />
            My Watchlist
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-sm text-muted-foreground">Loading watchlist...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Heart className="w-5 h-5 mr-2" />
          My Watchlist
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {watchlistItems.length} saved {watchlistItems.length === 1 ? 'property' : 'properties'}
        </p>
      </CardHeader>
      <CardContent>
        {watchlistItems.length === 0 ? (
          <div className="text-center py-8">
            <Heart className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No saved properties yet</p>
            <p className="text-xs text-muted-foreground">Save properties you're interested in to track them here</p>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-3"
              onClick={() => navigate('/properties')}
            >
              Browse Properties
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Alert for properties with available shares */}
            {watchlistItems.some(item => item.has_available_shares) && (
              <div className="bg-gradient-to-r from-orange-50 to-red-50 border-l-4 border-orange-500 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-5 h-5 text-orange-600" />
                  <h4 className="font-semibold text-orange-800">🚨 Watchlist Alert!</h4>
                </div>
                <p className="text-sm text-orange-700 mb-3">
                  Some of your watchlist properties now have shares available for purchase. Act fast!
                </p>
                <div className="flex gap-2 flex-wrap">
                  {watchlistItems.filter(item => item.has_available_shares).map(item => (
                    <Badge key={item.id} className="bg-orange-100 text-orange-800">
                      {item.properties.title}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Property Grid */}
            <div className="grid grid-cols-1 gap-4">
              {watchlistItems.map((item) => (
                <div 
                  key={item.id} 
                  className={`border rounded-lg overflow-hidden transition-all duration-300 hover:shadow-md ${
                    item.has_available_shares ? 'border-orange-300 bg-orange-50/30 shadow-sm' : 'hover:bg-muted/30'
                  }`}
                >
                  <div className="flex">
                    {/* Property Image */}
                    <div className="relative w-48 h-32 bg-muted flex-shrink-0">
                      {item.properties.images && item.properties.images.length > 0 ? (
                        <img
                          src={item.properties.images[0]}
                          alt={item.properties.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.src = '/village-aerial.jpg';
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
                          <Building2 className="w-8 h-8 text-primary/40" />
                        </div>
                      )}
                      
                      {/* Status Badge on Image */}
                      <div className="absolute top-2 left-2">
                        {getStatusBadge(item.properties.property_status)}
                      </div>

                      {/* Availability Badge */}
                      {item.has_available_shares && (
                        <div className="absolute bottom-2 left-2">
                          <Badge className="bg-orange-500 text-white animate-pulse shadow-lg text-xs">
                            <Zap className="w-3 h-3 mr-1" />
                            Available!
                          </Badge>
                        </div>
                      )}
                    </div>

                    {/* Property Details */}
                    <div className="flex-1 p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <h4 className="font-semibold text-lg mb-1">{item.properties.title}</h4>
                          <div className="flex items-center text-sm text-muted-foreground mb-2">
                            <MapPin className="w-4 h-4 mr-1" />
                            {item.properties.city}, {item.properties.country}
                          </div>
                          
                          <Badge variant="secondary" className="mb-3">
                            {item.properties.property_type}
                          </Badge>
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeFromWatchlist(item.id)}
                          className="ml-4"
                        >
                          <Heart className="w-4 h-4 fill-current text-red-500" />
                        </Button>
                      </div>
                      
                      {/* Key Metrics */}
                      <div className="grid grid-cols-3 gap-3 mb-4">
                        <div className="bg-muted/50 rounded-lg p-2 text-center">
                          <p className="text-xs text-muted-foreground">Share Price</p>
                          <p className="font-semibold text-sm">{formatCurrency(item.properties.share_price)}</p>
                        </div>
                        <div className="bg-muted/50 rounded-lg p-2 text-center">
                          <p className="text-xs text-muted-foreground">Expected ROI</p>
                          <div className="flex items-center justify-center">
                            <span className="font-semibold text-sm text-green-600">
                              {item.properties.expected_annual_return}%
                            </span>
                            <TrendingUp className="w-3 h-3 ml-1 text-green-600" />
                          </div>
                        </div>
                        <div className="bg-muted/50 rounded-lg p-2 text-center">
                          <p className="text-xs text-muted-foreground">Min. Investment</p>
                          <p className="font-semibold text-sm">{formatCurrency(item.properties.minimum_investment)}</p>
                        </div>
                      </div>

                      {/* Action Button and Date */}
                      <div className="flex justify-between items-center">
                        <Button
                          size="sm"
                          onClick={() => navigate(`/invest/${item.property_id}`)}
                          className={`${
                            item.has_available_shares 
                              ? 'bg-orange-600 hover:bg-orange-700 text-white' 
                              : ''
                          }`}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          {item.has_available_shares ? 'Buy Shares Now!' : 'View Property'}
                        </Button>
                        
                        <p className="text-xs text-muted-foreground">
                          Added {formatDate(item.added_at)}
                        </p>
                      </div>
                      
                      {/* Availability Alert */}
                      {item.has_available_shares && (
                        <div className="mt-3 p-2 bg-gradient-to-r from-orange-100 to-yellow-100 border border-orange-200 rounded-lg">
                          <p className="text-xs text-orange-700 font-medium">
                            💡 Investors are selling shares in this property. This is your chance to invest!
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MyWatchlistEnhanced;