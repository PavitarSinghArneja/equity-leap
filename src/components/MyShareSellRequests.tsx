import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/NewAuthContext';
import {
  TrendingDown,
  Clock,
  Building2,
  DollarSign,
  X,
  AlertTriangle,
  CheckCircle,
  Calendar
} from 'lucide-react';

interface ShareSellRequest {
  id: string;
  property_id: string;
  shares_to_sell: number;
  price_per_share: number;
  total_amount: number;
  status: string;
  created_at: string;
  expires_at: string;
  notes?: string;
  properties: {
    id: string;
    title: string;
    city: string;
    country: string;
    share_price: number;
  };
}

const MyShareSellRequests: React.FC = () => {
  const { user, addNotification } = useAuth();
  const [sellRequests, setSellRequests] = useState<ShareSellRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState<string | null>(null);

  const fetchSellRequests = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      const { data, error } = await supabase
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
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false });

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
  }, [user]);

  const cancelSellRequest = async (requestId: string) => {
    try {
      setCancelling(requestId);

      const { error } = await supabase
        .from('share_sell_requests')
        .update({ 
          status: 'cancelled'
        })
        .eq('id', requestId)
        .eq('seller_id', user?.id); // Ensure user can only cancel their own requests

      if (error) throw error;

      addNotification({
        name: "Request Cancelled",
        description: "Your share sell request has been cancelled",
        icon: "CHECK_CIRCLE",
        color: "#059669",
        time: new Date().toLocaleTimeString()
      });

      fetchSellRequests(); // Refresh the list

    } catch (error) {
      console.error('Error cancelling sell request:', error);
      addNotification({
        name: "Cancellation Failed",
        description: "Failed to cancel your sell request. Please try again.",
        icon: "ALERT_TRIANGLE",
        color: "#DC2626",
        time: new Date().toLocaleTimeString()
      });
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
    return Math.max(0, days);
  };

  const getStatusBadge = (status: string, expiresAt: string) => {
    const daysLeft = getDaysUntilExpiry(expiresAt);
    
    const statusConfig = {
      active: { 
        label: daysLeft <= 7 ? `${daysLeft} days left` : 'Active', 
        color: daysLeft <= 7 ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800' 
      },
      completed: { label: 'Sold', color: 'bg-blue-100 text-blue-800' },
      cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-800' },
      expired: { label: 'Expired', color: 'bg-gray-100 text-gray-800' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.active;
    
    return (
      <Badge className={config.color}>
        {status === 'completed' && <CheckCircle className="w-3 h-3 mr-1" />}
        {status === 'active' && daysLeft <= 7 && <Clock className="w-3 h-3 mr-1" />}
        {config.label}
      </Badge>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <TrendingDown className="w-5 h-5 mr-2" />
            My Share Sell Requests
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-sm text-muted-foreground">Loading your sell requests...</p>
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
          <TrendingDown className="w-5 h-5 mr-2" />
          My Share Sell Requests
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Manage your active and past share sell requests
        </p>
      </CardHeader>
      <CardContent>
        {sellRequests.length === 0 ? (
          <div className="text-center py-8">
            <TrendingDown className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No sell requests yet</p>
            <p className="text-xs text-muted-foreground">Your share sell requests will appear here</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sellRequests.map((request) => {
              const daysLeft = getDaysUntilExpiry(request.expires_at);
              const canCancel = request.status === 'active' && daysLeft > 0;
              const marketDiscount = ((request.properties.share_price - request.price_per_share) / request.properties.share_price) * 100;

              return (
                <div key={request.id} className="border rounded-lg p-4 hover:bg-muted/30 transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div>
                        <h4 className="font-medium">{request.properties.title}</h4>
                        <p className="text-sm text-muted-foreground">
                          {request.properties.city}, {request.properties.country}
                        </p>
                      </div>
                      {getStatusBadge(request.status, request.expires_at)}
                    </div>
                    
                    {canCancel && (
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <X className="w-4 h-4 mr-1" />
                            Cancel
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                          <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                              <AlertTriangle className="w-5 h-5 text-yellow-600" />
                              Cancel Sell Request
                            </DialogTitle>
                          </DialogHeader>
                          
                          <div className="space-y-4">
                            <div className="bg-muted/50 rounded-lg p-3">
                              <h4 className="font-medium text-sm">{request.properties.title}</h4>
                              <p className="text-xs text-muted-foreground">
                                {request.shares_to_sell} shares at {formatCurrency(request.price_per_share)} each
                              </p>
                            </div>
                            
                            <p className="text-sm text-muted-foreground">
                              Are you sure you want to cancel this sell request? You can create a new one later if needed.
                            </p>

                            <div className="flex gap-3">
                              <DialogTrigger asChild>
                                <Button variant="outline" className="flex-1">Keep Request</Button>
                              </DialogTrigger>
                              <Button 
                                onClick={() => cancelSellRequest(request.id)}
                                disabled={cancelling === request.id}
                                className="flex-1 bg-red-600 hover:bg-red-700"
                              >
                                {cancelling === request.id ? 'Cancelling...' : 'Cancel Request'}
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Shares</p>
                      <p className="font-medium">{request.shares_to_sell}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Price per Share</p>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{formatCurrency(request.price_per_share)}</span>
                        {marketDiscount > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            -{marketDiscount.toFixed(1)}%
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Total Amount</p>
                      <p className="font-medium">{formatCurrency(request.total_amount)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">
                        {request.status === 'active' ? 'Expires' : 
                         request.status === 'completed' ? 'Sold' : 'Created'}
                      </p>
                      <p className="font-medium">
                        {request.status === 'active' ? formatDate(request.expires_at) :
                         request.status === 'completed' ? 'Recently' :
                         formatDate(request.created_at)}
                      </p>
                    </div>
                  </div>

                  {request.notes && (
                    <div className="mt-3 p-2 bg-muted/30 rounded text-xs">
                      <p className="text-muted-foreground">Notes: {request.notes}</p>
                    </div>
                  )}

                  {/* Status-specific information */}
                  {request.status === 'active' && daysLeft <= 3 && (
                    <div className="mt-3 flex items-center gap-2 text-xs text-yellow-600">
                      <AlertTriangle className="w-3 h-3" />
                      <span>Request expires in {daysLeft} day{daysLeft === 1 ? '' : 's'}</span>
                    </div>
                  )}
                  
                  {request.status === 'completed' && (
                    <div className="mt-3 flex items-center gap-2 text-xs text-green-600">
                      <CheckCircle className="w-3 h-3" />
                      <span>Successfully sold to another investor</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MyShareSellRequests;