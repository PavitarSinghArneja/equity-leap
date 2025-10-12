import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/NewAuthContext';
import { Clock, CheckCircle, XCircle, User, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { TradingService } from '@/services/trading/TradingService';
import { RealtimeChannel } from '@supabase/supabase-js';

interface PendingHold {
  id: string;
  buyer_id: string;
  seller_id: string;
  sell_request_id: string;
  shares_requested: number;
  total_price: number;
  status: string;
  buyer_confirmed: boolean;
  seller_confirmed: boolean;
  created_at: string;
  property_name?: string;
  buyer_name?: string;
}

interface PendingHoldsProps {
  propertyId?: string;
}

const PendingHolds: React.FC<PendingHoldsProps> = ({ propertyId }) => {
  const { user } = useAuth();
  const [holds, setHolds] = useState<PendingHold[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingHold, setProcessingHold] = useState<string | null>(null);

  const tradingService = new TradingService();

  useEffect(() => {
    fetchPendingHolds();

    // Realtime subscription for live updates
    // Note: We can't filter by seller_id since it's not in share_buyer_holds
    // So we subscribe to all changes and refetch (filtering happens in fetchPendingHolds)
    const channel: RealtimeChannel = supabase
      .channel('pending_holds_updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'share_buyer_holds'
        },
        () => {
          fetchPendingHolds();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, propertyId]);

  const fetchPendingHolds = async () => {
    if (!user) return;

    try {
      setLoading(true);

      let query = supabase
        .from('share_buyer_holds')
        .select(`
          *,
          share_sell_requests!inner(
            seller_id,
            property_id,
            price_per_share,
            properties(title)
          )
        `)
        .eq('share_sell_requests.seller_id', user.id)
        .eq('hold_status', 'buyer_confirmed')
        .eq('buyer_confirmed', true)
        .eq('seller_confirmed', false)
        .order('created_at', { ascending: false });

      if (propertyId) {
        query = query.eq('share_sell_requests.property_id', propertyId);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Transform data to include property name and flatten structure
      const transformedData = data?.map((hold: any) => ({
        ...hold,
        seller_id: hold.share_sell_requests?.seller_id,
        property_id: hold.share_sell_requests?.property_id,
        price_per_share: hold.share_sell_requests?.price_per_share,
        property_name: hold.share_sell_requests?.properties?.title,
        // Calculate total_price from shares and price_per_share
        total_price: hold.shares * (hold.share_sell_requests?.price_per_share || 0),
        shares_requested: hold.shares,
        sell_request_id: hold.order_id
      })) || [];

      setHolds(transformedData);
    } catch (error) {
      console.error('Error fetching pending holds:', error);
      toast.error('Failed to load pending holds');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (holdId: string) => {
    try {
      setProcessingHold(holdId);

      const result = await tradingService.sellerConfirmHold(holdId);

      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to approve sale');
      }

      toast.success('Sale Approved!', {
        description: 'Shares have been transferred and payment added to your wallet.'
      });

      fetchPendingHolds();
    } catch (error) {
      console.error('Approval error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to approve sale';
      toast.error('Approval Failed', {
        description: errorMessage
      });
    } finally {
      setProcessingHold(null);
    }
  };

  const handleReject = async (holdId: string) => {
    try {
      setProcessingHold(holdId);

      const result = await tradingService.cancelHold(holdId);

      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to reject sale');
      }

      toast.success('Sale Rejected', {
        description: 'The purchase request has been cancelled.'
      });

      fetchPendingHolds();
    } catch (error) {
      console.error('Rejection error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to reject sale';
      toast.error('Rejection Failed', {
        description: errorMessage
      });
    } finally {
      setProcessingHold(null);
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
            <Clock className="w-5 h-5" />
            Pending Sales (Awaiting Your Approval)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-sm text-muted-foreground">Loading pending sales...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (holds.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Pending Sales (Awaiting Your Approval)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <CheckCircle className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
            <h3 className="text-lg font-semibold mb-2">No Pending Sales</h3>
            <p className="text-sm text-muted-foreground">
              You don't have any purchase requests waiting for approval.
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
            <Clock className="w-5 h-5 text-orange-600" />
            Pending Sales (Awaiting Your Approval)
          </CardTitle>
          <Badge variant="destructive" className="animate-pulse">
            {holds.length} {holds.length === 1 ? 'request' : 'requests'}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Review and approve purchase requests from buyers
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {holds.map((hold) => {
            const isProcessing = processingHold === hold.id;

            return (
              <div
                key={hold.id}
                className="border rounded-lg p-4 bg-orange-50/50 dark:bg-orange-950/20 hover:bg-orange-50 dark:hover:bg-orange-950/30 transition-colors"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex-1">
                    {hold.property_name && (
                      <p className="font-semibold text-lg mb-1">{hold.property_name}</p>
                    )}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <User className="w-4 h-4" />
                      <span>Buyer #{hold.buyer_id.slice(0, 8)}</span>
                      <span>•</span>
                      <Clock className="w-3 h-3" />
                      <span className="text-xs">{getTimeAgo(hold.created_at)}</span>
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200">
                    Awaiting Approval
                  </Badge>
                </div>

                {/* Details */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Shares Requested</p>
                    <p className="text-lg font-bold">{hold.shares_requested.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total Amount</p>
                    <p className="text-lg font-bold text-green-600">{formatCurrency(hold.total_price)}</p>
                  </div>
                </div>

                {/* Info Alert */}
                <Alert className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    Approving this sale will transfer {hold.shares_requested} shares to the buyer and add {formatCurrency(hold.total_price)} to your wallet.
                  </AlertDescription>
                </Alert>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => handleReject(hold.id)}
                    disabled={isProcessing}
                    className="flex-1"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Reject
                  </Button>
                  <Button
                    onClick={() => handleApprove(hold.id)}
                    disabled={isProcessing}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    {isProcessing ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Processing...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Approve Sale
                      </>
                    )}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default PendingHolds;
