import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { TradingServiceFactory } from '@/services/trading/TradingServiceFactory';
import { isFeatureEnabled } from '@/config/featureFlags';
import { useAuth } from '@/contexts/NewAuthContext';
import {
  Settings,
  TrendingUp,
  TrendingDown,
  Building2,
  Users,
  DollarSign,
  BarChart3,
  AlertTriangle,
  CheckCircle,
  Edit,
  Save
} from 'lucide-react';
import { Countdown } from '@/components/ui/countdown';
import { logger } from '@/utils/logger';

interface Property {
  id: string;
  title: string;
  city: string;
  country: string;
  property_status: string;
  shares_sellable: boolean;
  actual_roi_percentage: number | null;
  share_price: number;
  total_value: number;
  available_shares: number;
}

interface ShareSellRequest {
  id: string;
  seller_id: string;
  shares_to_sell: number;
  price_per_share: number;
  total_amount: number;
  status: string;
  created_at: string;
  expires_at: string;
  properties: {
    title: string;
  };
  user_profiles: {
    full_name: string;
    email: string;
  };
}

const AdminShareControls: React.FC = () => {
  const { addNotification } = useAuth();
  const [properties, setProperties] = useState<Property[]>([]);
  const [sellRequests, setSellRequests] = useState<ShareSellRequest[]>([]);
  const [reservations, setReservations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [roiForm, setRoiForm] = useState({ actual_roi_percentage: '' });

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch properties
      const { data: propertiesData, error: propertiesError } = await supabase
        .from('properties')
        .select('id, title, city, country, property_status, shares_sellable, actual_roi_percentage, share_price, total_value, available_shares')
        .order('title');

      if (propertiesError) throw propertiesError;
      setProperties(propertiesData || []);

      // Fetch pending sell requests
      const { data: requestsData, error: requestsError } = await supabase
        .from('share_sell_requests')
        .select(`
          *,
          properties (title),
          user_profiles!share_sell_requests_seller_id_fkey (full_name, email)
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (requestsError) throw requestsError;
      setSellRequests(requestsData || []);

      // Load active reservations (flagged)
      if (isFeatureEnabled('secondary_market_enabled')) {
        const { data: resv, error: resvErr } = await supabase
          .from('share_reservations')
          .select(`
            id, order_id, buyer_id, seller_id, property_id, shares, price_per_share, status, created_at, expires_at,
            properties(title),
            share_sell_requests(price_per_share),
            buyer:user_profiles!inner(full_name, email),
            seller:user_profiles!inner(full_name, email)
          `)
          .eq('status', 'active')
          .order('created_at', { ascending: false });
        if (!resvErr) setReservations(resv || []);
      }
      
    } catch (error) {
      logger.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Realtime refresh for reservations and holds
    const ch1 = supabase
      .channel('admin_reservations')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'share_reservations' }, () => fetchData())
      .subscribe();
    const ch2 = supabase
      .channel('admin_holds')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'share_buyer_holds' }, () => fetchData())
      .subscribe();
    const ch3 = supabase
      .channel('admin_orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'share_sell_requests' }, () => fetchData())
      .subscribe();
    return () => {
      supabase.removeChannel(ch1);
      supabase.removeChannel(ch2);
      supabase.removeChannel(ch3);
    };
  }, []);

  const toggleShareSelling = React.useCallback(async (property: Property, enabled: boolean) => {
    try {
      setUpdating(property.id);

      // When enabling share selling, also mark property as funded
      const updateData: any = { shares_sellable: enabled };
      if (enabled) {
        updateData.property_status = 'funded';
        updateData.available_shares = 0; // No more shares available for new investment
      }

      const { error } = await supabase
        .from('properties')
        .update(updateData)
        .eq('id', property.id);

      if (error) throw error;

      // Create alert for waitlist users if enabling share selling
      if (enabled) {
        const { error: alertError } = await supabase.rpc('create_property_alert', {
          p_property_id: property.id,
          p_alert_type: 'shares_sellable',
          p_title: `${property.title} - Shares Now Sellable`,
          p_message: `You can now sell your shares in ${property.title}. Visit the property page to create a sell request.`
        });

        if (alertError) {
          logger.warn('Failed to create alerts:', alertError);
        }
      }

      if (addNotification) {
        addNotification({
          name: "Settings Updated",
          description: `Share selling ${enabled ? 'enabled' : 'disabled'} for ${property.title}`,
          icon: "CHECK_CIRCLE",
          color: "#059669",
          time: new Date().toLocaleTimeString()
        });
      }

      await fetchData(); // Refresh data

    } catch (error) {
      logger.error('Error updating share selling:', error);
      if (addNotification) {
        addNotification({
          name: "Update Failed",
          description: "Failed to update share selling settings",
          icon: "ALERT_TRIANGLE",
          color: "#DC2626",
          time: new Date().toLocaleTimeString()
        });
      }
    } finally {
      setUpdating(null);
    }
  }, [addNotification]);

  const updateROI = async () => {
    if (!selectedProperty) return;

    try {
      setUpdating(selectedProperty.id);

      const roiValue = parseFloat(roiForm.actual_roi_percentage) || null;
      
      const { error } = await supabase
        .from('properties')
        .update({ actual_roi_percentage: roiValue })
        .eq('id', selectedProperty.id);

      if (error) throw error;

      addNotification({
        name: "ROI Updated",
        description: `Actual ROI updated for ${selectedProperty.title}`,
        icon: "CHECK_CIRCLE",
        color: "#059669",
        time: new Date().toLocaleTimeString()
      });

      setSelectedProperty(null);
      setRoiForm({ actual_roi_percentage: '' });
      fetchData(); // Refresh data

    } catch (error) {
      logger.error('Error updating ROI:', error);
      addNotification({
        name: "Update Failed",
        description: "Failed to update ROI",
        icon: "ALERT_TRIANGLE",
        color: "#DC2626",
        time: new Date().toLocaleTimeString()
      });
    } finally {
      setUpdating(null);
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

  const getPropertyStatusBadge = (status: string) => {
    const statusConfig = {
      upcoming: { label: 'Upcoming', color: 'bg-blue-100 text-blue-800' },
      open: { label: 'Open', color: 'bg-green-100 text-green-800' },
      funded: { label: 'Funded', color: 'bg-purple-100 text-purple-800' },
      closed: { label: 'Closed', color: 'bg-gray-100 text-gray-800' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.open;
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            <p className="text-sm text-muted-foreground">Loading share controls...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Properties Share Selling Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Settings className="w-5 h-5 mr-2" />
            Property Share Selling Controls
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Control which properties allow investors to sell their shares
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {properties.map((property) => (
              <div key={property.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="font-medium">{property.title}</h4>
                    {getPropertyStatusBadge(property.property_status)}
                    {property.shares_sellable && (
                      <Badge className="bg-green-100 text-green-800">
                        <TrendingDown className="w-3 h-3 mr-1" />
                        Sellable
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>📍 {property.city}, {property.country}</span>
                    <span>💰 {formatCurrency(property.share_price)}/share</span>
                    <span>📊 {property.available_shares} shares left</span>
                    {property.actual_roi_percentage && (
                      <span className="text-green-600 font-medium">
                        🎯 ROI: {property.actual_roi_percentage}%
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {/* ROI Update Button for funded properties */}
                  {property.property_status === 'funded' && (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedProperty(property);
                            setRoiForm({ 
                              actual_roi_percentage: property.actual_roi_percentage?.toString() || '' 
                            });
                          }}
                        >
                          <BarChart3 className="w-4 h-4 mr-1" />
                          Set ROI
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                          <DialogTitle>Update Actual ROI</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="bg-muted/50 rounded-lg p-3">
                            <h4 className="font-medium text-sm">{property.title}</h4>
                            <p className="text-xs text-muted-foreground">
                              This ROI will be shown to all investors for this sold-out property
                            </p>
                          </div>
                          
                          <div>
                            <Label htmlFor="roi_percentage">Actual ROI Percentage</Label>
                            <Input
                              id="roi_percentage"
                              type="number"
                              step="0.1"
                              min="0"
                              max="100"
                              value={roiForm.actual_roi_percentage}
                              onChange={(e) => setRoiForm({ actual_roi_percentage: e.target.value })}
                              placeholder="e.g. 15.5"
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                              Leave empty to hide ROI information
                            </p>
                          </div>

                          <div className="flex gap-3">
                            <Button 
                              variant="outline" 
                              onClick={() => setSelectedProperty(null)}
                              className="flex-1"
                            >
                              Cancel
                            </Button>
                            <Button 
                              onClick={updateROI}
                              disabled={updating === property.id}
                              className="flex-1"
                            >
                              {updating === property.id ? 'Updating...' : 'Update ROI'}
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}

                  {/* Share Selling Toggle */}
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`shares-sellable-${property.id}`} className="text-sm">
                      Allow Share Selling
                    </Label>
                    <Switch
                      id={`shares-sellable-${property.id}`}
                      checked={property.shares_sellable || false}
                      onCheckedChange={(checked) => toggleShareSelling(property, checked)}
                      disabled={updating === property.id}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Active Sell Requests */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <TrendingDown className="w-5 h-5 mr-2" />
            Active Share Sell Requests
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Monitor and manage investor share selling requests
          </p>
        </CardHeader>
        <CardContent>
          {sellRequests.length === 0 ? (
            <div className="text-center py-8">
              <TrendingDown className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No active sell requests</p>
              <p className="text-xs text-muted-foreground">Investor sell requests will appear here</p>
            </div>
          ) : (
            <div className="space-y-4">
              {sellRequests.map((request) => {
                const daysLeft = Math.ceil(
                  (new Date(request.expires_at).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
                );
                
                return (
                  <div key={request.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="font-medium">{request.properties.title}</h4>
                        <p className="text-sm text-muted-foreground">
                          By {request.user_profiles.full_name} ({request.user_profiles.email})
                        </p>
                      </div>
                      <Badge className={daysLeft <= 7 ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}>
                        {daysLeft} days left
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Shares</p>
                        <p className="font-medium">{request.shares_to_sell}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Price per Share</p>
                        <p className="font-medium">{formatCurrency(request.price_per_share)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Total Amount</p>
                        <p className="font-medium">{formatCurrency(request.total_amount)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Created</p>
                        <p className="font-medium">{formatDate(request.created_at)}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Active Reservations (Admin Settlement) */}
      {isFeatureEnabled('secondary_market_enabled') && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <CheckCircle className="w-5 h-5 mr-2" />
              Reservations Awaiting Offline Settlement
            </CardTitle>
            <p className="text-sm text-muted-foreground">Confirm settlement success/failure after offline process.</p>
          </CardHeader>
          <CardContent>
            {reservations.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">No active reservations</div>
            ) : (
              <div className="space-y-3">
                {reservations.map((r) => (
                  <div key={r.id} className="border rounded p-3 flex items-center justify-between">
                    <div>
                      <div className="font-medium">{r.properties?.title || 'Property'}</div>
                      <div className="text-xs text-muted-foreground">
                        {r.shares} shares @ {Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(r.price_per_share)} · Buyer: {r.buyer?.full_name || r.buyer_id} · Seller: {r.seller?.full_name || r.seller_id}
                      </div>
                      <div className="text-xs text-muted-foreground">Expires {new Date(r.expires_at).toLocaleString()}</div>
                    </div>
                    <div className="flex gap-2 items-center">
                      <span className="text-xs text-muted-foreground mr-1">Time left:</span>
                      <Countdown to={r.expires_at} className="text-xs" />
                      <Button size="sm" variant="outline" onClick={async () => {
                        const ts = TradingServiceFactory.create();
                        const res = await ts.adminSettleReservation(r.id, true);
                        if (res.success) {
                          addNotification({ name: 'Reservation Settled', description: 'Positions updated.', icon: 'CHECK_CIRCLE', color: '#059669', time: new Date().toLocaleTimeString() });
                          try { await import('@/services/AnalyticsService').then(m => m.AnalyticsService.tradingReservationSettled(r.id, true)); } catch {}
                          fetchData();
                        } else {
                          addNotification({ name: 'Settle Failed', description: res.error?.message || 'Try again.', icon: 'ALERT_TRIANGLE', color: '#DC2626', time: new Date().toLocaleTimeString() });
                        }
                      }}>Mark Settled</Button>
                      <Button size="sm" variant="destructive" onClick={async () => {
                        const ts = TradingServiceFactory.create();
                        const res = await ts.adminSettleReservation(r.id, false);
                        if (res.success) {
                          addNotification({ name: 'Reservation Cancelled', description: 'Reservation cancelled and released.', icon: 'CHECK_CIRCLE', color: '#059669', time: new Date().toLocaleTimeString() });
                          try { await import('@/services/AnalyticsService').then(m => m.AnalyticsService.tradingReservationSettled(r.id, false)); } catch {}
                          fetchData();
                        } else {
                          addNotification({ name: 'Cancel Failed', description: res.error?.message || 'Try again.', icon: 'ALERT_TRIANGLE', color: '#DC2626', time: new Date().toLocaleTimeString() });
                        }
                      }}>Cancel</Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Properties with Share Selling</p>
                <p className="text-2xl font-bold">
                  {properties.filter(p => p.shares_sellable).length}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Sell Requests</p>
                <p className="text-2xl font-bold">{sellRequests.length}</p>
              </div>
              <TrendingDown className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Share Value Listed</p>
                <p className="text-lg font-bold">
                  {formatCurrency(sellRequests.reduce((sum, req) => sum + req.total_amount, 0))}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminShareControls;
