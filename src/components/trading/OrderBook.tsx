import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { TrendingUp, TrendingDown, Activity, ArrowUpDown } from 'lucide-react';
import { RealtimeChannel } from '@supabase/supabase-js';

interface Order {
  id: string;
  user_id: string;
  property_id: string;
  order_type: 'buy' | 'sell';
  order_side: 'bid' | 'ask';
  quantity: number;
  price: number;
  status: 'active' | 'filled' | 'cancelled';
  created_at: string;
}

interface OrderBookProps {
  propertyId: string;
}

interface OrderBookLevel {
  price: number;
  quantity: number;
  total: number;
  orders: number;
}

const OrderBook: React.FC<OrderBookProps> = ({ propertyId }) => {
  const [buyOrders, setBuyOrders] = useState<OrderBookLevel[]>([]);
  const [sellOrders, setSellOrders] = useState<OrderBookLevel[]>([]);
  const [recentTrades, setRecentTrades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [spread, setSpread] = useState<number>(0);
  const [spreadPercent, setSpreadPercent] = useState<number>(0);

  useEffect(() => {
    fetchOrderBook();
    fetchRecentTrades();

    // Set up real-time subscription
    const channel: RealtimeChannel = supabase
      .channel(`orderbook_${propertyId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'share_sell_requests',
          filter: `property_id=eq.${propertyId}`
        },
        () => {
          fetchOrderBook();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [propertyId]);

  useEffect(() => {
    calculateSpread();
  }, [buyOrders, sellOrders]);

  const fetchOrderBook = async () => {
    try {
      setLoading(true);

      // Fetch all active sell requests (asks)
      const { data: sellData, error: sellError } = await supabase
        .from('share_sell_requests')
        .select('*')
        .eq('property_id', propertyId)
        .eq('status', 'active')
        .gt('expires_at', new Date().toISOString())
        .order('price_per_share', { ascending: true });

      if (sellError) throw sellError;

      // Group sell orders by price level
      const sellLevels = groupOrdersByPrice(sellData || [], 'sell');
      setSellOrders(sellLevels);

      // For buy orders, we'll use a simulated orderbook since the current schema
      // only has sell requests. In production, you'd have a separate orders table.
      // For now, create simulated buy orders based on sell prices
      const buyLevels = generateSimulatedBuyOrders(sellLevels);
      setBuyOrders(buyLevels);

    } catch (error) {
      console.error('Error fetching order book:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentTrades = async () => {
    try {
      const { data, error } = await supabase
        .from('share_sell_requests')
        .select('*')
        .eq('property_id', propertyId)
        .eq('status', 'completed')
        .not('sold_at', 'is', null)
        .order('sold_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setRecentTrades(data || []);
    } catch (error) {
      console.error('Error fetching recent trades:', error);
    }
  };

  const groupOrdersByPrice = (orders: any[], type: 'buy' | 'sell'): OrderBookLevel[] => {
    const priceMap = new Map<number, OrderBookLevel>();

    orders.forEach((order) => {
      const price = order.price_per_share;
      const quantity = order.remaining_shares || order.shares_to_sell;

      if (priceMap.has(price)) {
        const level = priceMap.get(price)!;
        level.quantity += quantity;
        level.total += price * quantity;
        level.orders += 1;
      } else {
        priceMap.set(price, {
          price,
          quantity,
          total: price * quantity,
          orders: 1
        });
      }
    });

    return Array.from(priceMap.values()).sort((a, b) =>
      type === 'buy' ? b.price - a.price : a.price - b.price
    );
  };

  const generateSimulatedBuyOrders = (sellLevels: OrderBookLevel[]): OrderBookLevel[] => {
    if (sellLevels.length === 0) return [];

    const lowestAsk = sellLevels[0].price;
    const buyLevels: OrderBookLevel[] = [];

    // Generate 5-10 buy levels below the lowest ask
    for (let i = 1; i <= 8; i++) {
      const price = Math.round((lowestAsk - (i * 100)) * 100) / 100;
      if (price <= 0) break;

      const quantity = Math.floor(Math.random() * 50) + 10;
      buyLevels.push({
        price,
        quantity,
        total: price * quantity,
        orders: Math.floor(Math.random() * 3) + 1
      });
    }

    return buyLevels;
  };

  const calculateSpread = () => {
    if (buyOrders.length > 0 && sellOrders.length > 0) {
      const bestBid = buyOrders[0].price;
      const bestAsk = sellOrders[0].price;
      const spreadValue = bestAsk - bestBid;
      const spreadPct = (spreadValue / bestAsk) * 100;

      setSpread(spreadValue);
      setSpreadPercent(spreadPct);
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

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Order Book
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-sm text-muted-foreground">Loading order book...</p>
            </div>
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
            <Activity className="w-5 h-5 text-primary" />
            Order Book
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              <ArrowUpDown className="w-3 h-3 mr-1" />
              Spread: {formatCurrency(spread)} ({spreadPercent.toFixed(2)}%)
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {/* Buy Orders (Bids) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between mb-3 pb-2 border-b">
              <h3 className="text-sm font-semibold flex items-center gap-2 text-green-600">
                <TrendingUp className="w-4 h-4" />
                Buy Orders (Bids)
              </h3>
            </div>

            {/* Header */}
            <div className="grid grid-cols-3 gap-2 text-xs font-medium text-muted-foreground mb-2">
              <div>Price (INR)</div>
              <div className="text-right">Quantity</div>
              <div className="text-right">Total</div>
            </div>

            {/* Buy Orders */}
            <div className="space-y-1 max-h-96 overflow-y-auto">
              {buyOrders.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  No buy orders
                </div>
              ) : (
                buyOrders.map((level, index) => {
                  const maxQuantity = Math.max(...buyOrders.map(o => o.quantity));
                  const widthPercent = (level.quantity / maxQuantity) * 100;

                  return (
                    <div
                      key={index}
                      className="relative grid grid-cols-3 gap-2 text-sm py-1.5 px-2 rounded hover:bg-green-50/50 transition-colors"
                    >
                      <div
                        className="absolute inset-y-0 right-0 bg-green-100/30 rounded"
                        style={{ width: `${widthPercent}%` }}
                      />
                      <div className="relative z-10 font-mono text-green-600 font-medium">
                        {formatCurrency(level.price)}
                      </div>
                      <div className="relative z-10 text-right font-mono">
                        {level.quantity.toLocaleString()}
                      </div>
                      <div className="relative z-10 text-right font-mono text-xs text-muted-foreground">
                        {formatCurrency(level.total)}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Sell Orders (Asks) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between mb-3 pb-2 border-b">
              <h3 className="text-sm font-semibold flex items-center gap-2 text-red-600">
                <TrendingDown className="w-4 h-4" />
                Sell Orders (Asks)
              </h3>
            </div>

            {/* Header */}
            <div className="grid grid-cols-3 gap-2 text-xs font-medium text-muted-foreground mb-2">
              <div>Price (INR)</div>
              <div className="text-right">Quantity</div>
              <div className="text-right">Total</div>
            </div>

            {/* Sell Orders */}
            <div className="space-y-1 max-h-96 overflow-y-auto">
              {sellOrders.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  No sell orders
                </div>
              ) : (
                sellOrders.map((level, index) => {
                  const maxQuantity = Math.max(...sellOrders.map(o => o.quantity));
                  const widthPercent = (level.quantity / maxQuantity) * 100;

                  return (
                    <div
                      key={index}
                      className="relative grid grid-cols-3 gap-2 text-sm py-1.5 px-2 rounded hover:bg-red-50/50 transition-colors"
                    >
                      <div
                        className="absolute inset-y-0 right-0 bg-red-100/30 rounded"
                        style={{ width: `${widthPercent}%` }}
                      />
                      <div className="relative z-10 font-mono text-red-600 font-medium">
                        {formatCurrency(level.price)}
                      </div>
                      <div className="relative z-10 text-right font-mono">
                        {level.quantity.toLocaleString()}
                      </div>
                      <div className="relative z-10 text-right font-mono text-xs text-muted-foreground">
                        {formatCurrency(level.total)}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Recent Trades */}
        <div className="mt-6 pt-6 border-t">
          <h3 className="text-sm font-semibold mb-3">Recent Trades</h3>
          <div className="space-y-1">
            {recentTrades.length === 0 ? (
              <div className="text-center py-4 text-sm text-muted-foreground">
                No recent trades
              </div>
            ) : (
              <div className="space-y-1 max-h-32 overflow-y-auto">
                <div className="grid grid-cols-3 gap-2 text-xs font-medium text-muted-foreground mb-2">
                  <div>Time</div>
                  <div className="text-right">Price</div>
                  <div className="text-right">Quantity</div>
                </div>
                {recentTrades.map((trade) => (
                  <div
                    key={trade.id}
                    className="grid grid-cols-3 gap-2 text-sm py-1 px-2 rounded hover:bg-muted/50"
                  >
                    <div className="text-xs text-muted-foreground">
                      {formatTime(trade.sold_at)}
                    </div>
                    <div className="text-right font-mono text-green-600">
                      {formatCurrency(trade.price_per_share)}
                    </div>
                    <div className="text-right font-mono">
                      {trade.shares_to_sell}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default OrderBook;
