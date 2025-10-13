import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/NewAuthContext';
import { ListOrdered, Clock, X, CheckCircle, AlertCircle, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { RealtimeChannel } from '@supabase/supabase-js';

interface Order {
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
  sold_at?: string;
  properties: {
    title: string;
    city: string;
    country: string;
  };
}

interface MyOrdersProps {
  propertyId?: string;
  status: 'active' | 'completed';
}

const MyOrders: React.FC<MyOrdersProps> = ({ propertyId, status }) => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchOrders();

      // Set up real-time subscription
      const channel: RealtimeChannel = supabase
        .channel(`my_orders_${user.id}_${propertyId || 'all'}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'share_sell_requests',
            filter: `seller_id=eq.${user.id}`
          },
          () => {
            fetchOrders();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user, propertyId, status]);

  const fetchOrders = async () => {
    if (!user) return;

    try {
      setLoading(true);

      let query = supabase
        .from('share_sell_requests')
        .select(`
          *,
          properties (
            title,
            city,
            country
          )
        `)
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false });

      if (propertyId) {
        query = query.eq('property_id', propertyId);
      }

      if (status === 'active') {
        query = query.eq('status', 'active').gt('expires_at', new Date().toISOString());
      } else {
        query = query.in('status', ['completed', 'cancelled', 'expired']);
      }

      const { data, error } = await query;

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    try {
      setCancelling(orderId);

      const { error } = await supabase
        .from('share_sell_requests')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId)
        .eq('seller_id', user?.id); // Security check

      if (error) throw error;

      toast.success('Order Cancelled', {
        description: 'Your sell order has been cancelled successfully'
      });

      fetchOrders();
    } catch (error) {
      console.error('Error cancelling order:', error);
      toast.error('Failed to cancel order');
    } finally {
      setCancelling(null);
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
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getDaysUntilExpiry = (expiresAt: string) => {
    const days = Math.ceil((new Date(expiresAt).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    return days;
  };

  const getStatusBadge = (order: Order) => {
    switch (order.status) {
      case 'active':
        const daysLeft = getDaysUntilExpiry(order.expires_at);
        return (
          <Badge className="bg-green-100 text-green-800 border-green-300">
            <Clock className="w-3 h-3 mr-1" />
            Active ({daysLeft}d left)
          </Badge>
        );
      case 'completed':
        return (
          <Badge className="bg-blue-100 text-blue-800 border-blue-300">
            <CheckCircle className="w-3 h-3 mr-1" />
            Completed
          </Badge>
        );
      case 'cancelled':
        return (
          <Badge className="bg-gray-100 text-gray-800 border-gray-300">
            <X className="w-3 h-3 mr-1" />
            Cancelled
          </Badge>
        );
      case 'expired':
        return (
          <Badge className="bg-orange-100 text-orange-800 border-orange-300">
            <AlertCircle className="w-3 h-3 mr-1" />
            Expired
          </Badge>
        );
      default:
        return <Badge variant="outline">{order.status}</Badge>;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-sm text-muted-foreground">Loading orders...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (orders.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center">
            <ListOrdered className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <h3 className="text-lg font-semibold mb-2">No {status} orders</h3>
            <p className="text-sm text-muted-foreground">
              {status === 'active'
                ? "You don't have any active sell orders"
                : "You don't have any completed or cancelled orders"}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ListOrdered className="w-4 h-4" />
          My Active Orders
          <Badge variant="secondary">{orders.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Table Header - Hidden on mobile, visible on desktop */}
          <div className="hidden md:grid md:grid-cols-7 gap-4 text-xs font-medium text-muted-foreground pb-2 border-b">
            <div className="col-span-2">Property</div>
            <div className="text-right">Quantity</div>
            <div className="text-right">Price</div>
            <div className="text-right">Total</div>
            <div>Status</div>
            <div className="text-right">Actions</div>
          </div>

          {/* Orders List */}
          {orders.map((order) => {
            const remaining = order.remaining_shares ?? order.shares_to_sell;
            const filled = order.shares_to_sell - remaining;
            const fillPercent = (filled / order.shares_to_sell) * 100;

            return (
              <div
                key={order.id}
                className="border rounded-lg p-4 hover:bg-muted/30 transition-colors"
              >
                {/* Mobile Layout */}
                <div className="md:hidden space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium">{order.properties.title}</h4>
                      <p className="text-xs text-muted-foreground">
                        {order.properties.city}, {order.properties.country}
                      </p>
                    </div>
                    {getStatusBadge(order)}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Quantity:</span>
                      <span className="ml-2 font-medium">{order.shares_to_sell}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Price:</span>
                      <span className="ml-2 font-medium">{formatCurrency(order.price_per_share)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Total:</span>
                      <span className="ml-2 font-medium">{formatCurrency(order.total_amount)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Date:</span>
                      <span className="ml-2 text-xs">{formatDate(order.created_at)}</span>
                    </div>
                  </div>

                  {status === 'active' && remaining < order.shares_to_sell && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Progress</span>
                        <span>{filled} / {order.shares_to_sell} sold</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-1.5">
                        <div
                          className="bg-green-600 h-1.5 rounded-full transition-all"
                          style={{ width: `${fillPercent}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {status === 'active' && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="w-full"
                          disabled={cancelling === order.id}
                        >
                          {cancelling === order.id ? (
                            <>
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2" />
                              Cancelling...
                            </>
                          ) : (
                            <>
                              <X className="w-3 h-3 mr-2" />
                              Cancel Order
                            </>
                          )}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Cancel Order?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to cancel this sell order? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>No, keep it</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleCancelOrder(order.id)}>
                            Yes, cancel order
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>

                {/* Desktop Layout */}
                <div className="hidden md:grid md:grid-cols-7 gap-4 items-center">
                  <div className="col-span-2">
                    <h4 className="font-medium text-sm">{order.properties.title}</h4>
                    <p className="text-xs text-muted-foreground">
                      {order.properties.city}, {order.properties.country}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      <Calendar className="w-3 h-3 inline mr-1" />
                      {formatDate(order.created_at)}
                    </p>
                  </div>

                  <div className="text-right">
                    <div className="font-mono text-sm">{order.shares_to_sell}</div>
                    {status === 'active' && remaining < order.shares_to_sell && (
                      <div className="text-xs text-muted-foreground">{remaining} left</div>
                    )}
                  </div>

                  <div className="text-right font-mono text-sm">
                    {formatCurrency(order.price_per_share)}
                  </div>

                  <div className="text-right font-mono text-sm font-medium">
                    {formatCurrency(order.total_amount)}
                  </div>

                  <div>{getStatusBadge(order)}</div>

                  <div className="text-right">
                    {status === 'active' && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={cancelling === order.id}
                          >
                            {cancelling === order.id ? (
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current" />
                            ) : (
                              <X className="w-4 h-4" />
                            )}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Cancel Order?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to cancel this sell order? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>No, keep it</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleCancelOrder(order.id)}>
                              Yes, cancel order
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
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

export default MyOrders;
