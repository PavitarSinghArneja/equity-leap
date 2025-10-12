import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/NewAuthContext';
import { ShoppingCart, TrendingDown, Clock, User } from 'lucide-react';
import { RealtimeChannel } from '@supabase/supabase-js';

interface SellListing {
  id: string;
  seller_id: string;
  property_id: string;
  shares_to_sell: number;
  remaining_shares: number | null;
  price_per_share: number;
  total_amount: number;
  status: string;
  expires_at: string;
  created_at: string;
  seller_name?: string;
}

interface AvailableSharesProps {
  propertyId: string;
  onBuyClick: (listing: SellListing) => void;
}

const AvailableShares: React.FC<AvailableSharesProps> = ({ propertyId, onBuyClick }) => {
  const { user } = useAuth();
  const [listings, setListings] = useState<SellListing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchListings();

    // Realtime subscription for live updates
    const channel: RealtimeChannel = supabase
      .channel(`available_shares_${propertyId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'share_sell_requests',
          filter: `property_id=eq.${propertyId}`
        },
        () => {
          fetchListings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [propertyId]);

  const fetchListings = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('share_sell_requests')
        .select('*')
        .eq('property_id', propertyId)
        .eq('status', 'active')
        .gt('expires_at', new Date().toISOString())
        .gt('remaining_shares', 0)
        .order('price_per_share', { ascending: true }); // Best price first

      if (error) throw error;

      setListings(data || []);
    } catch (error) {
      console.error('Error fetching listings:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
  };

  const getTimeAgo = (dateString: string) => {
    const now = new Date().getTime();
    const created = new Date(dateString).getTime();
    const diff = now - created;

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            Available Shares for Sale
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-sm text-muted-foreground">Loading available shares...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (listings.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            Available Shares for Sale
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <TrendingDown className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
            <h3 className="text-lg font-semibold mb-2">No Shares Available</h3>
            <p className="text-sm text-muted-foreground">
              There are currently no shares for sale for this property.
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Be the first to list your shares!
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-green-200 dark:border-green-900">
      <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-xl">
            <div className="bg-green-600 p-2 rounded-lg">
              <ShoppingCart className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-gray-900 dark:text-gray-100">Available Shares for Sale</span>
              <p className="text-sm font-normal text-muted-foreground mt-0.5">
                Click "Buy These Shares" for instant purchase • Shares transfer immediately
              </p>
            </div>
          </CardTitle>
          <Badge className="bg-green-600 text-white text-sm px-3 py-1">
            {listings.length} {listings.length === 1 ? 'listing' : 'listings'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="space-y-4">
          {listings.map((listing) => {
            const remainingShares = listing.remaining_shares ?? listing.shares_to_sell;
            const isOwnListing = user?.id === listing.seller_id;
            const totalCost = remainingShares * listing.price_per_share;

            return (
              <div
                key={listing.id}
                className={`border-2 rounded-xl p-5 shadow-sm hover:shadow-md transition-all ${
                  isOwnListing
                    ? 'border-blue-300 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800'
                    : 'border-gray-200 dark:border-gray-700 hover:border-green-300 dark:hover:border-green-700'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  {/* Left side: Details */}
                  <div className="flex-1 space-y-3">
                    {/* Seller info */}
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <span>
                        {isOwnListing ? (
                          <Badge className="text-xs bg-blue-600 text-white">
                            Your Listing
                          </Badge>
                        ) : (
                          <span className="text-sm text-muted-foreground">Seller #{listing.seller_id.slice(0, 8)}</span>
                        )}
                      </span>
                      <span className="text-xs text-muted-foreground">•</span>
                      <Clock className="w-3 h-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{getTimeAgo(listing.created_at)}</span>
                    </div>

                    {/* Share details */}
                    <div className="grid grid-cols-3 gap-4 bg-white dark:bg-gray-900/50 rounded-lg p-4 border border-gray-100 dark:border-gray-800">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Shares Available</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                          {remainingShares.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Price per Share</p>
                        <p className="text-2xl font-bold text-green-600">
                          {formatCurrency(listing.price_per_share)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Total Cost</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                          {formatCurrency(totalCost)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Right side: Buy button */}
                  <div className="flex-shrink-0 flex items-center">
                    {isOwnListing ? (
                      <Button
                        variant="outline"
                        disabled
                        className="whitespace-nowrap h-12 px-6"
                      >
                        Your Listing
                      </Button>
                    ) : (
                      <Button
                        onClick={() => onBuyClick(listing)}
                        size="lg"
                        className="bg-green-600 hover:bg-green-700 text-white whitespace-nowrap h-12 px-6 text-base font-semibold shadow-lg hover:shadow-xl transition-all"
                      >
                        <ShoppingCart className="w-5 h-5 mr-2" />
                        Buy These Shares
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default AvailableShares;
