import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/NewAuthContext';
import { ShoppingCart, TrendingDown } from 'lucide-react';
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
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-green-600" />
            Available Shares
            <Badge variant="secondary">{listings.length}</Badge>
          </CardTitle>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Instant settlement • Shares transfer immediately
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {listings.map((listing) => {
            const remainingShares = listing.remaining_shares ?? listing.shares_to_sell;
            const isOwnListing = user?.id === listing.seller_id;
            const totalCost = remainingShares * listing.price_per_share;

            return (
              <div
                key={listing.id}
                className={`border rounded-lg p-4 hover:shadow-md transition-all ${
                  isOwnListing
                    ? 'border-blue-300 bg-blue-50 dark:bg-blue-950/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-green-300'
                }`}
              >
                <div className="flex items-center justify-between gap-4">
                  {/* Share details */}
                  <div className="flex items-center gap-6">
                    {isOwnListing && (
                      <Badge className="bg-blue-600 text-white">Your Listing</Badge>
                    )}
                    <div>
                      <p className="text-xs text-muted-foreground">Shares</p>
                      <p className="text-xl font-bold">{remainingShares.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Price</p>
                      <p className="text-xl font-bold text-green-600">{formatCurrency(listing.price_per_share)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Total</p>
                      <p className="text-xl font-bold">{formatCurrency(totalCost)}</p>
                    </div>
                  </div>

                  {/* Buy button */}
                  {!isOwnListing && (
                    <Button
                      onClick={() => onBuyClick(listing)}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      <ShoppingCart className="w-4 h-4 mr-2" />
                      Buy Now
                    </Button>
                  )}
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
