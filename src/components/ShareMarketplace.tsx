import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  ShoppingCart,
  User,
  Clock,
  TrendingUp,
  Building2,
  PieChart,
  DollarSign,
  Calendar,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';

interface ShareSellRequest {
  id: string;
  seller_id: string;
  property_id: string;
  shares_to_sell: number;
  price_per_share: number;
  total_amount: number;
  status: string;
  expires_at: string;
  notes?: string;
  created_at: string;
  properties: {
    id: string;
    title: string;
    city: string;
    country: string;
    share_price: number;
  };
}

interface ShareMarketplaceProps {
  propertyId?: string;
}

const ShareMarketplace: React.FC<ShareMarketplaceProps> = ({ propertyId }) => {
  const { user, addNotification } = useAuth();
  const [sellRequests, setSellRequests] = useState<ShareSellRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);

  const fetchSellRequests = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('share_sell_requests')
        .select(`
          *,
          properties (
            id,
            title,
            city,
            country,
            share_price
          )
        `)
        .eq('status', 'active')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (propertyId) {
        query = query.eq('property_id', propertyId);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      setSellRequests(data || []);
    } catch (error) {
      console.error('Error fetching sell requests:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSellRequests();
  }, [propertyId]);

  const handlePurchaseShares = async (sellRequest: ShareSellRequest) => {
    if (!user || sellRequest.seller_id === user.id) return;

    try {
      setPurchasing(sellRequest.id);

      // Start a transaction
      const { data: updatedRequest, error: updateError } = await supabase
        .from('share_sell_requests')
        .update({
          status: 'completed',
          buyer_id: user.id,
          sold_at: new Date().toISOString()
        })
        .eq('id', sellRequest.id)
        .eq('status', 'active') // Ensure it's still active
        .select()
        .single();

      if (updateError) throw updateError;

      // Create transaction record for buyer
      const { error: buyerTransactionError } = await supabase
        .from('transactions')
        .insert([{
          user_id: user.id,
          property_id: sellRequest.property_id,
          transaction_type: 'share_purchase',
          amount: sellRequest.total_amount,
          status: 'completed',
          description: `Purchased ${sellRequest.shares_to_sell} shares from another investor`,
          reference_id: sellRequest.id
        }]);

      if (buyerTransactionError) throw buyerTransactionError;

      // Create transaction record for seller
      const { error: sellerTransactionError } = await supabase
        .from('transactions')
        .insert([{
          user_id: sellRequest.seller_id,
          property_id: sellRequest.property_id,
          transaction_type: 'share_sale',
          amount: sellRequest.total_amount,
          status: 'completed',
          description: `Sold ${sellRequest.shares_to_sell} shares to another investor`,
          reference_id: sellRequest.id
        }]);

      if (sellerTransactionError) throw sellerTransactionError;

      // Update buyer's investment record
      const { data: existingInvestment } = await supabase
        .from('investments')
        .select('*')
        .eq('user_id', user.id)
        .eq('property_id', sellRequest.property_id)
        .single();

      if (existingInvestment) {
        // Update existing investment
        const newShares = existingInvestment.shares_owned + sellRequest.shares_to_sell;
        const newTotalInvestment = existingInvestment.total_investment + sellRequest.total_amount;
        const newPricePerShare = newTotalInvestment / newShares;

        await supabase
          .from('investments')
          .update({
            shares_owned: newShares,
            total_investment: newTotalInvestment,
            price_per_share: newPricePerShare
          })
          .eq('id', existingInvestment.id);
      } else {
        // Create new investment record
        await supabase
          .from('investments')
          .insert([{
            user_id: user.id,
            property_id: sellRequest.property_id,
            shares_owned: sellRequest.shares_to_sell,
            total_investment: sellRequest.total_amount,
            price_per_share: sellRequest.price_per_share,
            investment_status: 'confirmed'
          }]);
      }

      // Update seller's investment record
      const { data: sellerInvestment } = await supabase
        .from('investments')
        .select('*')
        .eq('user_id', sellRequest.seller_id)
        .eq('property_id', sellRequest.property_id)
        .single();

      if (sellerInvestment) {
        const newShares = sellerInvestment.shares_owned - sellRequest.shares_to_sell;
        const newTotalInvestment = sellerInvestment.total_investment - 
          (sellRequest.shares_to_sell * sellerInvestment.price_per_share);

        if (newShares > 0) {
          await supabase
            .from('investments')
            .update({
              shares_owned: newShares,
              total_investment: newTotalInvestment
            })
            .eq('id', sellerInvestment.id);
        } else {
          // Remove investment record if no shares left
          await supabase
            .from('investments')
            .delete()
            .eq('id', sellerInvestment.id);
        }
      }

      // Recalculate positions for buyer and seller (best-effort)
      try {
        await Promise.all([
          supabase.rpc('recalc_user_property_position', { p_user_id: user.id, p_property_id: sellRequest.property_id }),
          supabase.rpc('recalc_user_property_position', { p_user_id: sellRequest.seller_id, p_property_id: sellRequest.property_id })
        ]);
      } catch (e) {
        console.warn('Position snapshot recalc failed (non-fatal):', e);
      }

      // Create audit trail entries
      await Promise.all([
        supabase.from('user_audit_trail').insert([{
          user_id: user.id,
          action_type: 'share_purchase',
          description: `Purchased ${sellRequest.shares_to_sell} shares of ${sellRequest.properties.title}`,
          related_entity_type: 'property',
          related_entity_id: sellRequest.property_id,
          metadata: {
            shares_purchased: sellRequest.shares_to_sell,
            price_per_share: sellRequest.price_per_share,
            total_amount: sellRequest.total_amount,
            seller_id: sellRequest.seller_id,
            sell_request_id: sellRequest.id
          }
        }]),
        supabase.from('user_audit_trail').insert([{
          user_id: sellRequest.seller_id,
          action_type: 'share_sale',
          description: `Sold ${sellRequest.shares_to_sell} shares of ${sellRequest.properties.title}`,
          related_entity_type: 'property',
          related_entity_id: sellRequest.property_id,
          metadata: {
            shares_sold: sellRequest.shares_to_sell,
            price_per_share: sellRequest.price_per_share,
            total_amount: sellRequest.total_amount,
            buyer_id: user.id,
            sell_request_id: sellRequest.id
          }
        }])
      ]);

      addNotification({
        name: "Shares Purchased",
        description: `Successfully purchased ${sellRequest.shares_to_sell} shares of ${sellRequest.properties.title}`,
        icon: "CHECK_CIRCLE",
        color: "#059669",
        time: new Date().toLocaleTimeString()
      });

      // Refresh the list
      fetchSellRequests();

    } catch (error) {
      console.error('Error purchasing shares:', error);
      addNotification({
        name: "Purchase Failed",
        description: "Failed to purchase shares. Please try again.",
        icon: "ALERT_TRIANGLE",
        color: "#DC2626",
        time: new Date().toLocaleTimeString()
      });
    } finally {
      setPurchasing(null);
    }
  };

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getDaysUntilExpiry = (expiresAt: string) => {
    const days = Math.ceil((new Date(expiresAt).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    return days;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <ShoppingCart className="w-5 h-5 mr-2" />
            Available Shares
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-sm text-muted-foreground">Loading available shares...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="flex items-center text-foreground">
          <ShoppingCart className="w-5 h-5 mr-2 text-primary" />
          Available Shares {!propertyId && 'Marketplace'}
        </CardTitle>
        {sellRequests.length > 0 && (
          <p className="text-sm text-muted-foreground">
            {sellRequests.length} share{sellRequests.length === 1 ? '' : 's'} available for purchase
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {sellRequests.length === 0 ? (
          <div className="text-center py-8">
            <ShoppingCart className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No shares available for purchase</p>
            <p className="text-xs text-muted-foreground">Check back later for new listings</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sellRequests.map((request) => {
              const isOwnRequest = request.seller_id === user?.id;
              const daysLeft = getDaysUntilExpiry(request.expires_at);
              const discount = ((request.properties.share_price - request.price_per_share) / request.properties.share_price) * 100;

              return (
                <div key={request.id} className={`border rounded-lg p-4 transition-colors ${
                  isOwnRequest ? 'bg-primary/5 border-primary/20' : 'hover:bg-muted/40 border-border'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {!propertyId && (
                          <div className="flex items-center gap-1 text-sm">
                            <Building2 className="w-4 h-4" />
                            <span className="font-medium">{request.properties.title}</span>
                            <span className="text-muted-foreground">
                              • {request.properties.city}, {request.properties.country}
                            </span>
                          </div>
                        )}
                        {isOwnRequest && (
                          <Badge className="text-xs bg-primary/15 text-primary border border-primary/30">Your Listing</Badge>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <PieChart className="w-4 h-4 text-muted-foreground" />
                          <span>{request.shares_to_sell} shares</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <DollarSign className="w-4 h-4 text-muted-foreground" />
                          <span>{formatCurrency(request.price_per_share)} per share</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium">{formatCurrency(request.total_amount)} total</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-muted-foreground" />
                          <span className={daysLeft <= 7 ? 'text-red-600 font-medium' : ''}>
                            {daysLeft} days left
                          </span>
                        </div>
                      </div>

                      {discount > 0 && (
                        <div className="mt-2">
                          <Badge className="bg-success/15 text-success border border-success/30">
                            {discount.toFixed(1)}% below market price
                          </Badge>
                        </div>
                      )}

                      {request.notes && (
                        <p className="text-xs text-muted-foreground mt-2 italic">
                          "{request.notes}"
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                      {!isOwnRequest && (
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90" disabled={purchasing === request.id}>
                              {purchasing === request.id ? (
                                <>
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                  Purchasing...
                                </>
                              ) : (
                                <>
                                  <ShoppingCart className="w-4 h-4 mr-2" />
                                  Buy Shares
                                </>
                              )}
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                              <DialogTitle className="flex items-center gap-2">
                                <CheckCircle className="w-5 h-5 text-primary" />
                                Confirm Purchase
                              </DialogTitle>
                            </DialogHeader>
                            
                            <div className="space-y-4">
                              <div className="bg-muted/50 rounded-lg p-3">
                                <h4 className="font-medium text-sm">{request.properties.title}</h4>
                                <p className="text-xs text-muted-foreground">
                                  {request.properties.city}, {request.properties.country}
                                </p>
                              </div>

                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span>Shares:</span>
                                  <span className="font-medium">{request.shares_to_sell}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Price per share:</span>
                                  <span className="font-medium">{formatCurrency(request.price_per_share)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Market price:</span>
                                  <span>{formatCurrency(request.properties.share_price)}</span>
                                </div>
                                <div className="flex justify-between font-semibold text-base border-t pt-2">
                                  <span>Total:</span>
                                  <span>{formatCurrency(request.total_amount)}</span>
                                </div>
                                {discount > 0 && (
                                  <div className="flex justify-between text-primary font-medium">
                                    <span>You save:</span>
                                    <span>{discount.toFixed(1)}%</span>
                                  </div>
                                )}
                              </div>

                              <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                                <div className="text-xs text-yellow-800">
                                  <p className="font-medium mb-1">Confirm Purchase:</p>
                                  <p>This transaction cannot be undone. You will own these shares immediately after purchase.</p>
                                </div>
                              </div>

                              <div className="flex gap-3">
                                <DialogTrigger asChild>
                                  <Button variant="outline" className="flex-1">Cancel</Button>
                                </DialogTrigger>
                                <Button 
                                  onClick={() => handlePurchaseShares(request)}
                                  className="flex-1"
                                  disabled={purchasing === request.id}
                                >
                                  {purchasing === request.id ? 'Processing...' : 'Confirm Purchase'}
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ShareMarketplace;
