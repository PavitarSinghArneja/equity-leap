import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/NewAuthContext';
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
  has_available_shares?: boolean; // Will be calculated
}

const MyWatchlist: React.FC = () => {
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
          
          // If property is sold out but shares are sellable, check for active sell requests
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
      
      // Refresh the list
      fetchWatchlist();
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
          <div className="space-y-4">
            {/* Alert for properties with available shares */}
            {watchlistItems.some(item => item.has_available_shares) && (
              <div className="bg-gradient-to-r from-orange-50 to-red-50 border-l-4 border-orange-500 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-5 h-5 text-orange-600" />
                  <h4 className="font-semibold text-orange-800">Watchlist Alert!</h4>
                </div>
                <p className="text-sm text-orange-700 mb-3">
                  Some of your watchlist properties now have shares available for purchase. Act fast!
                </p>
                <div className="flex gap-2">
                  {watchlistItems.filter(item => item.has_available_shares).map(item => (
                    <Badge key={item.id} className="bg-orange-100 text-orange-800">
                      {item.properties.title}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {watchlistItems.map((item) => (
              <div 
                key={item.id} 
                className={`border rounded-lg p-4 transition-colors hover:bg-muted/30 ${
                  item.has_available_shares ? 'border-orange-300 bg-orange-50/30' : ''
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium">{item.properties.title}</h4>
                      {getStatusBadge(item.properties.property_status)}
                      {item.has_available_shares && (
                        <Badge className="bg-orange-100 text-orange-800 animate-pulse">
                          <ShoppingCart className="w-3 h-3 mr-1" />
                          Available Now!
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center text-sm text-muted-foreground mb-2">
                      <MapPin className="w-4 h-4 mr-1" />
                      {item.properties.city}, {item.properties.country}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Share Price</p>
                        <p className="font-medium">{formatCurrency(item.properties.share_price)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Expected ROI</p>
                        <div className="flex items-center">
                          <span className="font-medium text-green-600">
                            {item.properties.expected_annual_return}%
                          </span>
                          <TrendingUp className="w-3 h-3 ml-1 text-green-600" />
                        </div>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Type</p>
                        <p className="font-medium">{item.properties.property_type}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Min. Investment</p>
                        <p className="font-medium">{formatCurrency(item.properties.minimum_investment)}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => navigate(`/invest/${item.property_id}`)}
                    className={item.has_available_shares ? 'bg-orange-600 hover:bg-orange-700' : ''}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    {item.has_available_shares ? 'Buy Shares Now!' : 'View Property'}
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => removeFromWatchlist(item.id)}
                  >
                    <Heart className="w-4 h-4 mr-1 fill-current" />
                    Remove
                  </Button>
                </div>
                
                {item.has_available_shares && (
                  <div className="mt-3 p-2 bg-orange-100 rounded text-xs text-orange-800">
                    💡 <strong>Tip:</strong> Other investors are selling their shares in this sold-out property. This is your chance to invest!
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MyWatchlist;