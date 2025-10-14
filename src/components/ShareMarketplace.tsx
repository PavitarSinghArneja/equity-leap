import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/NewAuthContext';
import { TradingServiceFactory } from '@/services/trading/TradingServiceFactory';
import { isFeatureEnabled } from '@/config/featureFlags';
import { useInvestments, useInvestmentMutations } from '@/hooks/useInvestmentService';
import { NotificationService } from '@/services/NotificationService';
import { toast } from 'sonner';
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

type UserTier = 'explorer' | 'waitlist_player' | 'small_investor' | 'large_investor';

interface ShareSellRequest {
  id: string;
  seller_id: string;
  property_id: string;
  shares_to_sell: number;
  remaining_shares?: number;
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

interface UserProfile {
  tier: UserTier;
}

interface WalletBalance {
  available_balance: number | null;
}

interface Investment {
  id: string;
  shares_owned: number;
  total_investment: number;
}

interface ShareMarketplaceProps {
  propertyId?: string;
}

const ShareMarketplace: React.FC<ShareMarketplaceProps> = ({ propertyId }) => {
  console.log('🔥 ShareMarketplace component rendered!', { propertyId });
  const { user } = useAuth();
  const [sellRequests, setSellRequests] = useState<ShareSellRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [walletAvailable, setWalletAvailable] = useState<number | null>(null);
  const [desiredShares, setDesiredShares] = useState<Record<string, number>>({});

  const tradingEnabled = isFeatureEnabled('secondary_market_enabled');
  const tradingService = TradingServiceFactory.create();

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
    console.log('🔥 ShareMarketplace mounted!', { propertyId });
    fetchSellRequests();
    const channel = supabase
      .channel(`market_${propertyId || 'all'}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'share_sell_requests' },
        () => fetchSellRequests()
      )
      .subscribe();
    // Load wallet available for user (for trading flow UX)
    const loadWallet = async () => {
      if (!user || !tradingEnabled) return;
      const { data } = await supabase
        .from('escrow_balances')
        .select('available_balance')
        .eq('user_id', user.id)
        .maybeSingle();
      setWalletAvailable(data?.available_balance ?? 0);
    };
    loadWallet();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [propertyId]);


  const handlePurchaseShares = async (sellRequest: ShareSellRequest) => {
    if (!user || sellRequest.seller_id === user.id) return;

    try {
      setPurchasing(sellRequest.id);

      // 1. Get current user profile to check tier
      const { data: userProfile, error: profileError } = await supabase
        .from('user_profiles')
        .select('tier')
        .eq('user_id', user.id)
        .single<UserProfile>();

      if (profileError) {
        throw new Error(`Failed to fetch user profile: ${profileError.message}`);
      }

      // 2. Validate user tier - must be waitlist_player or higher
      const validTiers: UserTier[] = ['waitlist_player', 'small_investor', 'large_investor'];
      if (!userProfile || !validTiers.includes(userProfile.tier)) {
        const errorMsg = "You must be a waitlist player or higher to purchase shares. Please upgrade your account.";
        toast.error(errorMsg);
        NotificationService.error("Access Denied", errorMsg);
        return;
      }

      // 3. Calculate total cost
      const totalCost = sellRequest.price_per_share * sellRequest.shares_to_sell;

      // 4. Check wallet balance
      const { data: walletData, error: walletError } = await supabase
        .from('escrow_balances')
        .select('available_balance')
        .eq('user_id', user.id)
        .maybeSingle<WalletBalance>();

      if (walletError) {
        throw new Error(`Failed to fetch wallet balance: ${walletError.message}`);
      }

      const currentBalance: number = walletData?.available_balance ?? 0;

      // 5. Validate sufficient funds
      if (currentBalance < totalCost) {
        const errorMsg = `Your wallet balance (${formatCurrency(currentBalance)}) is insufficient to purchase these shares. Required: ${formatCurrency(totalCost)}`;
        toast.error(errorMsg);
        NotificationService.error("Insufficient Funds", errorMsg);
        return;
      }

      if (tradingEnabled) {
        // Instant purchase - immediate settlement (no holds)
        const result = await tradingService.instantBuyShares(sellRequest.id, sellRequest.shares_to_sell);
        if (!result.success) {
          throw new Error(result.error?.message || 'Failed to purchase shares');
        }
        // Track analytics
        try {
          await import('@/services/AnalyticsService').then(m =>
            m.AnalyticsService.tradingInstantPurchase(sellRequest.id, sellRequest.shares_to_sell)
          );
        } catch {}
      } else {
        // Legacy direct-settle flow (kept for backward compatibility)
        // Note: retained as-is to avoid regressions; will be removed once new flow is fully rolled out.

        // 6. Deduct wallet balance (atomic operation)
        const { error: walletUpdateError } = await supabase
          .from('escrow_balances')
          .update({
            available_balance: currentBalance - totalCost,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id)
          .eq('available_balance', currentBalance); // Optimistic locking

        if (walletUpdateError) {
          throw new Error(`Failed to deduct wallet balance: ${walletUpdateError.message}`);
        }

        // 7. Check if buyer already has an investment in this property
        const { data: existingInvestment, error: investmentCheckError } = await supabase
          .from('investments')
          .select('id, shares_owned, total_investment')
          .eq('user_id', user.id)
          .eq('property_id', sellRequest.property_id)
          .maybeSingle<Investment>();

        if (investmentCheckError) {
          // Rollback wallet deduction
          await supabase
            .from('escrow_balances')
            .update({
              available_balance: currentBalance,
              updated_at: new Date().toISOString()
            })
            .eq('user_id', user.id);

          throw new Error(`Failed to check existing investments: ${investmentCheckError.message}`);
        }

        // 8. Update or create investment record
        if (existingInvestment) {
          // Update existing investment
          const { error: investmentUpdateError } = await supabase
            .from('investments')
            .update({
              shares_owned: existingInvestment.shares_owned + sellRequest.shares_to_sell,
              total_investment: existingInvestment.total_investment + totalCost,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingInvestment.id);

          if (investmentUpdateError) {
            // Rollback wallet deduction
            await supabase
              .from('escrow_balances')
              .update({
                available_balance: currentBalance,
                updated_at: new Date().toISOString()
              })
              .eq('user_id', user.id);

            throw new Error(`Failed to update investment: ${investmentUpdateError.message}`);
          }
        } else {
          // Create new investment
          const { error: investmentCreateError } = await supabase
            .from('investments')
            .insert({
              user_id: user.id,
              property_id: sellRequest.property_id,
              shares_owned: sellRequest.shares_to_sell,
              price_per_share: sellRequest.price_per_share,
              total_investment: totalCost,
              investment_status: 'active',
              investment_date: new Date().toISOString()
            });

          if (investmentCreateError) {
            // Rollback wallet deduction
            await supabase
              .from('escrow_balances')
              .update({
                available_balance: currentBalance,
                updated_at: new Date().toISOString()
              })
              .eq('user_id', user.id);

            throw new Error(`Failed to create investment: ${investmentCreateError.message}`);
          }
        }

        // 9. Update sell request status
        const { error: updateError } = await supabase
          .from('share_sell_requests')
          .update({
            status: 'completed',
            buyer_id: user.id,
            sold_at: new Date().toISOString()
          })
          .eq('id', sellRequest.id)
          .eq('status', 'active');

        if (updateError) {
          // Note: At this point, we've already updated wallet and investments
          // Log error but don't rollback as the purchase is effectively complete
          console.error('Failed to update sell request status:', updateError);
          NotificationService.warning(
            "Partial Success",
            "Shares purchased but listing status not updated. Contact support if needed."
          );
        }
      }

      const successMsg = `Successfully purchased ${sellRequest.shares_to_sell} shares of ${sellRequest.properties.title}. Shares added to your portfolio.`;
      toast.success(successMsg);
      NotificationService.success('Purchase Complete!', successMsg);

      // Refresh the list and wallet balance
      fetchSellRequests();
      const { data: updatedWallet } = await supabase
        .from('escrow_balances')
        .select('available_balance')
        .eq('user_id', user.id)
        .maybeSingle();
      if (updatedWallet) {
        setWalletAvailable(updatedWallet.available_balance ?? 0);
      }

    } catch (error) {
      console.error('Error purchasing shares:', error);
      const errorMessage = error instanceof Error ? error.message : "Failed to purchase shares. Please try again.";
      toast.error(errorMessage);
      NotificationService.error("Purchase Failed", errorMessage);
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
              const remaining = request.remaining_shares ?? request.shares_to_sell;
              const desired = desiredShares[request.id] ?? Math.min(remaining, request.shares_to_sell);
              const totalSelected = request.price_per_share * desired;
              const canAfford = walletAvailable == null || walletAvailable >= totalSelected;

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
                        {tradingEnabled && (
                          <div className="flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-muted-foreground" />
                            <span className={`${(request as any).remaining_shares && (request as any).remaining_shares <= 5 ? 'text-red-600 font-medium' : ''}`}>
                              {(request as any).remaining_shares ?? request.shares_to_sell} remaining
                            </span>
                          </div>
                        )}
                        {tradingEnabled && (
                          <div className="flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-muted-foreground" />
                            <span className={`${remaining <= 5 ? 'text-red-600 font-medium' : ''}`}>{remaining} remaining</span>
                          </div>
                        )}
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
                                {tradingEnabled ? 'Create Hold' : 'Confirm Purchase'}
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
                                {tradingEnabled ? (
                                  <div className="flex items-center justify-between gap-2">
                                    <span>Shares to hold:</span>
                                    <input
                                      type="number"
                                      min={1}
                                      max={remaining}
                                      value={desired}
                                      onChange={(e) => {
                                        const v = Math.max(1, Math.min(remaining, parseInt(e.target.value || '1')));
                                        setDesiredShares(prev => ({ ...prev, [request.id]: v }));
                                      }}
                                      className="w-24 border rounded px-2 py-1"
                                    />
                                  </div>
                                ) : (
                                  <div className="flex justify-between">
                                    <span>Shares:</span>
                                    <span className="font-medium">{request.shares_to_sell}</span>
                                  </div>
                                )}
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
                                  <span>{formatCurrency(tradingEnabled ? totalSelected : request.total_amount)}</span>
                                </div>
                                {tradingEnabled && walletAvailable != null && (
                                  <div className="flex justify-between text-xs">
                                    <span>Wallet available:</span>
                                    <span className={canAfford ? 'text-green-600' : 'text-red-600'}>{formatCurrency(walletAvailable)}</span>
                                  </div>
                                )}
                                {discount > 0 && (
                                  <div className="flex justify-between text-primary font-medium">
                                    <span>You save:</span>
                                    <span>{discount.toFixed(1)}%</span>
                                  </div>
                                )}
                              </div>

                              {tradingEnabled ? (
                                <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                  <AlertTriangle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                                  <div className="text-xs text-blue-800">
                                    <p className="font-medium mb-1">About Holds:</p>
                                    <p>We will place a hold for selected shares and lock funds in your wallet. Seller must confirm within 60 minutes. After both confirm, a reservation is created and admin completes the offline settlement.</p>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                  <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                                  <div className="text-xs text-yellow-800">
                                    <p className="font-medium mb-1">Confirm Purchase:</p>
                                    <p>This transaction cannot be undone. You will own these shares immediately after purchase.</p>
                                  </div>
                                </div>
                              )}

                              <div className="flex gap-3">
                                <DialogTrigger asChild>
                                  <Button variant="outline" className="flex-1">Cancel</Button>
                                </DialogTrigger>
                                <Button 
                                  onClick={() => handlePurchaseShares({ ...request, shares_to_sell: tradingEnabled ? desired : request.shares_to_sell })}
                                  className="flex-1"
                                  disabled={purchasing === request.id || (tradingEnabled && !canAfford)}
                                >
                                  {purchasing === request.id ? 'Processing...' : (tradingEnabled ? 'Create Hold' : 'Confirm Purchase')}
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
