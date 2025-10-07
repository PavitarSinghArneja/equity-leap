import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/NewAuthContext';
import { TrendingUp, TrendingDown, Wallet, AlertCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface TradingFormProps {
  propertyId: string;
  currentPrice: number;
}

const TradingForm: React.FC<TradingFormProps> = ({ propertyId, currentPrice }) => {
  const { user } = useAuth();
  const [orderType, setOrderType] = useState<'buy' | 'sell'>('buy');
  const [quantity, setQuantity] = useState<string>('');
  const [price, setPrice] = useState<string>(currentPrice.toString());
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [userShares, setUserShares] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [orderMode, setOrderMode] = useState<'market' | 'limit'>('limit');

  useEffect(() => {
    if (user) {
      fetchWalletBalance();
      fetchUserShares();
    }
  }, [user, propertyId]);

  useEffect(() => {
    setPrice(currentPrice.toString());
  }, [currentPrice]);

  const fetchWalletBalance = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('escrow_balances')
        .select('available_balance')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      setWalletBalance(data?.available_balance || 0);
    } catch (error) {
      console.error('Error fetching wallet balance:', error);
    }
  };

  const fetchUserShares = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('investments')
        .select('shares_owned')
        .eq('user_id', user.id)
        .eq('property_id', propertyId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      setUserShares(data?.shares_owned || 0);
    } catch (error) {
      console.error('Error fetching user shares:', error);
    }
  };

  const handleSubmitOrder = async () => {
    if (!user || !quantity || !price) {
      toast.error('Please fill in all fields');
      return;
    }

    const qty = parseInt(quantity);
    const priceValue = parseFloat(price);
    const total = qty * priceValue;

    if (qty <= 0 || priceValue <= 0) {
      toast.error('Quantity and price must be greater than 0');
      return;
    }

    if (orderType === 'buy' && total > walletBalance) {
      toast.error('Insufficient wallet balance');
      return;
    }

    if (orderType === 'sell' && qty > userShares) {
      toast.error('Insufficient shares to sell');
      return;
    }

    try {
      setLoading(true);

      if (orderType === 'sell') {
        // Create a sell request
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30); // 30 days expiry

        const { error } = await supabase
          .from('share_sell_requests')
          .insert({
            seller_id: user.id,
            property_id: propertyId,
            shares_to_sell: qty,
            remaining_shares: qty,
            price_per_share: priceValue,
            total_amount: total,
            status: 'active',
            expires_at: expiresAt.toISOString(),
            notes: `Listed via trading platform`
          });

        if (error) throw error;

        toast.success('Sell Order Created', {
          description: `Successfully listed ${qty} shares at ${formatCurrency(priceValue)} each`
        });

        // Refresh user shares
        fetchUserShares();
      } else {
        // For buy orders, we could create a bid in a separate table
        // For now, we'll show a message that market buy is not yet supported
        toast.info('Market Buy Coming Soon', {
          description: 'Please use the marketplace to buy available shares for now'
        });
      }

      // Reset form
      setQuantity('');
      setPrice(currentPrice.toString());

    } catch (error) {
      console.error('Error submitting order:', error);
      toast.error('Order Failed', {
        description: 'Failed to submit order. Please try again.'
      });
    } finally {
      setLoading(false);
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

  const calculateTotal = () => {
    const qty = parseInt(quantity) || 0;
    const priceValue = parseFloat(price) || 0;
    return qty * priceValue;
  };

  const total = calculateTotal();
  const canAfford = orderType === 'buy' ? total <= walletBalance : true;
  const hasShares = orderType === 'sell' ? parseInt(quantity || '0') <= userShares : true;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Place Order</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Wallet Info */}
        <div className="bg-muted/50 rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 text-muted-foreground">
              <Wallet className="w-4 h-4" />
              Wallet Balance
            </span>
            <span className="font-semibold">{formatCurrency(walletBalance)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Your Shares</span>
            <span className="font-semibold">{userShares.toLocaleString()}</span>
          </div>
        </div>

        {/* Buy/Sell Tabs */}
        <Tabs
          value={orderType}
          onValueChange={(value) => setOrderType(value as 'buy' | 'sell')}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="buy" className="data-[state=active]:bg-green-600 data-[state=active]:text-white">
              <TrendingUp className="w-4 h-4 mr-2" />
              Buy
            </TabsTrigger>
            <TabsTrigger value="sell" className="data-[state=active]:bg-red-600 data-[state=active]:text-white">
              <TrendingDown className="w-4 h-4 mr-2" />
              Sell
            </TabsTrigger>
          </TabsList>

          <TabsContent value="buy" className="space-y-4">
            <div className="space-y-4 mt-4">
              {/* Order Type */}
              <div className="space-y-2">
                <Label>Order Type</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant={orderMode === 'market' ? 'default' : 'outline'}
                    onClick={() => setOrderMode('market')}
                    className="w-full"
                    disabled
                  >
                    Market
                  </Button>
                  <Button
                    variant={orderMode === 'limit' ? 'default' : 'outline'}
                    onClick={() => setOrderMode('limit')}
                    className="w-full"
                  >
                    Limit
                  </Button>
                </div>
              </div>

              {/* Price */}
              <div className="space-y-2">
                <Label htmlFor="buy-price">Price per Share (INR)</Label>
                <Input
                  id="buy-price"
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
                <p className="text-xs text-muted-foreground">
                  Market Price: {formatCurrency(currentPrice)}
                </p>
              </div>

              {/* Quantity */}
              <div className="space-y-2">
                <Label htmlFor="buy-quantity">Quantity</Label>
                <Input
                  id="buy-quantity"
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="0"
                  min="1"
                  step="1"
                />
              </div>

              {/* Total */}
              <div className="space-y-2">
                <Label>Total Amount</Label>
                <div className="bg-muted rounded-lg p-3">
                  <div className="text-2xl font-bold">{formatCurrency(total)}</div>
                  {!canAfford && total > 0 && (
                    <div className="flex items-center gap-2 mt-2 text-sm text-red-600">
                      <AlertCircle className="w-4 h-4" />
                      Insufficient balance
                    </div>
                  )}
                </div>
              </div>

              <Button
                onClick={handleSubmitOrder}
                disabled={loading || !canAfford || !quantity || !price}
                className="w-full bg-green-600 hover:bg-green-700 text-white"
                size="lg"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Processing...
                  </>
                ) : (
                  <>
                    <TrendingUp className="w-4 h-4 mr-2" />
                    Place Buy Order
                  </>
                )}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="sell" className="space-y-4">
            <div className="space-y-4 mt-4">
              {/* Order Type */}
              <div className="space-y-2">
                <Label>Order Type</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant={orderMode === 'market' ? 'default' : 'outline'}
                    onClick={() => setOrderMode('market')}
                    className="w-full"
                    disabled
                  >
                    Market
                  </Button>
                  <Button
                    variant={orderMode === 'limit' ? 'default' : 'outline'}
                    onClick={() => setOrderMode('limit')}
                    className="w-full"
                  >
                    Limit
                  </Button>
                </div>
              </div>

              {/* Price */}
              <div className="space-y-2">
                <Label htmlFor="sell-price">Price per Share (INR)</Label>
                <Input
                  id="sell-price"
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
                <p className="text-xs text-muted-foreground">
                  Market Price: {formatCurrency(currentPrice)}
                </p>
              </div>

              {/* Quantity */}
              <div className="space-y-2">
                <Label htmlFor="sell-quantity">Quantity</Label>
                <Input
                  id="sell-quantity"
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="0"
                  min="1"
                  max={userShares}
                  step="1"
                />
                <p className="text-xs text-muted-foreground">
                  Available: {userShares.toLocaleString()} shares
                </p>
              </div>

              {/* Total */}
              <div className="space-y-2">
                <Label>Total Amount</Label>
                <div className="bg-muted rounded-lg p-3">
                  <div className="text-2xl font-bold">{formatCurrency(total)}</div>
                  {!hasShares && total > 0 && (
                    <div className="flex items-center gap-2 mt-2 text-sm text-red-600">
                      <AlertCircle className="w-4 h-4" />
                      Insufficient shares
                    </div>
                  )}
                </div>
              </div>

              {userShares === 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5" />
                    <div className="text-xs text-yellow-800">
                      You don't own any shares of this property yet.
                    </div>
                  </div>
                </div>
              )}

              <Button
                onClick={handleSubmitOrder}
                disabled={loading || !hasShares || !quantity || !price || userShares === 0}
                className="w-full bg-red-600 hover:bg-red-700 text-white"
                size="lg"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Processing...
                  </>
                ) : (
                  <>
                    <TrendingDown className="w-4 h-4 mr-2" />
                    Place Sell Order
                  </>
                )}
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        {/* Quick Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-blue-800">
              <p className="font-medium mb-1">Trading Tips:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Limit orders may take time to execute</li>
                <li>Sell orders are valid for 30 days</li>
                <li>Ensure sufficient wallet balance for buys</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TradingForm;
