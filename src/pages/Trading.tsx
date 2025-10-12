import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/NewAuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AvailableShares from '@/components/trading/AvailableShares';
import BuyConfirmModal from '@/components/trading/BuyConfirmModal';
import TradingForm from '@/components/trading/TradingForm';
import MyOrders from '@/components/trading/MyOrders';
import { supabase } from '@/integrations/supabase/client';
import { TrendingUp, BarChart3, Activity } from 'lucide-react';

interface Property {
  id: string;
  title: string;
  city: string;
  country: string;
  share_price: number;
  available_shares: number;
}

interface SellListing {
  id: string;
  seller_id: string;
  property_id: string;
  shares_to_sell: number;
  remaining_shares: number | null;
  price_per_share: number;
  total_amount: number;
}

const Trading: React.FC = () => {
  const { user } = useAuth();
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('');
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [buyModalOpen, setBuyModalOpen] = useState(false);
  const [selectedListing, setSelectedListing] = useState<SellListing | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    fetchProperties();
  }, []);

  useEffect(() => {
    if (selectedPropertyId && properties.length > 0) {
      const property = properties.find(p => p.id === selectedPropertyId);
      setSelectedProperty(property || null);
    }
  }, [selectedPropertyId, properties]);

  const fetchProperties = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('properties')
        .select('id, title, city, country, share_price, available_shares')
        .in('property_status', ['open', 'funded'])
        .order('title');

      if (error) throw error;

      const propertiesList = data || [];
      setProperties(propertiesList);

      // Auto-select first property
      if (propertiesList.length > 0 && !selectedPropertyId) {
        setSelectedPropertyId(propertiesList[0].id);
      }
    } catch (error) {
      console.error('Error fetching properties:', error);
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

  const handleBuyClick = (listing: SellListing) => {
    setSelectedListing(listing);
    setBuyModalOpen(true);
  };

  const handleBuySuccess = () => {
    setRefreshKey(prev => prev + 1);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading trading platform...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Please log in to access the trading platform.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 p-2 rounded-lg">
                <TrendingUp className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Share Trading</h1>
                <p className="text-sm text-muted-foreground">Buy and sell property shares in real-time</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Welcome back</p>
                <p className="font-medium">{user.email?.split('@')[0]}</p>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 bg-primary/10 rounded-lg">
                <Activity className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-primary">Live</span>
              </div>
            </div>
          </div>

          {/* Property Selector */}
          <div className="mt-4">
            <Select value={selectedPropertyId} onValueChange={setSelectedPropertyId}>
              <SelectTrigger className="w-full max-w-md bg-background">
                <SelectValue placeholder="Select a property to trade" />
              </SelectTrigger>
              <SelectContent>
                {properties.map((property) => (
                  <SelectItem key={property.id} value={property.id}>
                    <div className="flex items-center justify-between gap-4">
                      <span className="font-medium">{property.title}</span>
                      <span className="text-xs text-muted-foreground">
                        {property.city}, {property.country}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Property Stats */}
          {selectedProperty && (
            <div className="mt-4 grid grid-cols-3 gap-4">
              <div className="bg-background rounded-lg p-3">
                <p className="text-xs text-muted-foreground">Current Price</p>
                <p className="text-lg font-bold text-primary">{formatCurrency(selectedProperty.share_price)}</p>
              </div>
              <div className="bg-background rounded-lg p-3">
                <p className="text-xs text-muted-foreground">Available Shares</p>
                <p className="text-lg font-bold">{selectedProperty.available_shares.toLocaleString()}</p>
              </div>
              <div className="bg-background rounded-lg p-3">
                <p className="text-xs text-muted-foreground">Location</p>
                <p className="text-lg font-bold">{selectedProperty.city}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Trading Interface */}
      <div className="container mx-auto px-4 py-6">
        {!selectedPropertyId ? (
          <Card>
            <CardContent className="py-12 text-center">
              <BarChart3 className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Select a Property to Start Trading</h3>
              <p className="text-sm text-muted-foreground">Choose a property from the dropdown above to view the order book and place trades.</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Available Shares - Takes 2 columns on large screens */}
              <div className="lg:col-span-2">
                <AvailableShares
                  key={`available-${refreshKey}`}
                  propertyId={selectedPropertyId}
                  onBuyClick={handleBuyClick}
                />
              </div>

              {/* Sell Form - Takes 1 column */}
              <div>
                <TradingForm
                  propertyId={selectedPropertyId}
                  currentPrice={selectedProperty?.share_price || 0}
                />
              </div>

              {/* My Orders - Full width below */}
              <div className="lg:col-span-3">
                <Tabs defaultValue="active" className="w-full">
                  <TabsList className="w-full">
                    <TabsTrigger value="active" className="flex-1">Active Orders</TabsTrigger>
                    <TabsTrigger value="history" className="flex-1">Order History</TabsTrigger>
                  </TabsList>
                  <TabsContent value="active">
                    <MyOrders propertyId={selectedPropertyId} status="active" />
                  </TabsContent>
                  <TabsContent value="history">
                    <MyOrders propertyId={selectedPropertyId} status="completed" />
                  </TabsContent>
                </Tabs>
              </div>
            </div>

            {/* Buy Confirmation Modal */}
            <BuyConfirmModal
              listing={selectedListing}
              isOpen={buyModalOpen}
              onClose={() => setBuyModalOpen(false)}
              onSuccess={handleBuySuccess}
              propertyName={selectedProperty?.title}
            />
          </>
        )}
      </div>
    </div>
  );
};

export default Trading;
