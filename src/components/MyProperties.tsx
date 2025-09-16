import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/NewAuthContext';
import { useNavigate } from 'react-router-dom';
import ShareSellDialog from '@/components/ShareSellDialog';
import {
  Building2,
  TrendingUp,
  MapPin,
  DollarSign,
  Eye,
  TrendingDown
} from 'lucide-react';

interface UserProperty {
  id: string;
  shares_owned: number;
  price_per_share: number;
  total_investment: number;
  investment_date: string;
  properties: {
    id: string;
    title: string;
    city: string;
    country: string;
    property_type: string;
    share_price: number;
    property_status: string;
    shares_sellable: boolean;
    images?: string[];
  };
}

const MyProperties: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [userProperties, setUserProperties] = useState<UserProperty[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUserProperties = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('investments')
        .select(`
          *,
          properties (
            id,
            title,
            city,
            country,
            property_type,
            share_price,
            property_status,
            shares_sellable,
            images
          )
        `)
        .eq('user_id', user.id)
        .eq('investment_status', 'confirmed')
        .order('investment_date', { ascending: false });

      if (error) throw error;

      // Consolidate investments by property
      const consolidatedProperties: UserProperty[] = [];
      const propertyMap = new Map();

      (data || []).forEach(investment => {
        const propertyId = investment.property_id;
        
        if (propertyMap.has(propertyId)) {
          // Add to existing property
          const existing = propertyMap.get(propertyId);
          existing.shares_owned += investment.shares_owned;
          existing.total_investment += investment.total_investment;
          // Use the latest investment date
          if (new Date(investment.investment_date) > new Date(existing.investment_date)) {
            existing.investment_date = investment.investment_date;
          }
        } else {
          // Create new consolidated entry
          propertyMap.set(propertyId, {
            id: investment.id, // Use the most recent investment ID
            shares_owned: investment.shares_owned,
            price_per_share: investment.price_per_share,
            total_investment: investment.total_investment,
            investment_date: investment.investment_date,
            properties: investment.properties
          });
        }
      });

      setUserProperties(Array.from(propertyMap.values()));
    } catch (error) {
      console.error('Error fetching user properties:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserProperties();
  }, [user]);

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusBadge = (status: string) => {
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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Building2 className="w-5 h-5 mr-2" />
            My Properties
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-sm text-muted-foreground">Loading your properties...</p>
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
          <Building2 className="w-5 h-5 mr-2" />
          My Properties
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Properties you own shares in ({userProperties.length})
        </p>
      </CardHeader>
      <CardContent>
        {userProperties.length === 0 ? (
          <div className="text-center py-8">
            <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No properties owned yet</p>
            <p className="text-xs text-muted-foreground">Your property investments will appear here</p>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-3"
              onClick={() => navigate('/properties')}
            >
              Browse Properties
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {userProperties.map((investment) => {
              const currentValue = investment.shares_owned * investment.properties.share_price;
              const pnl = currentValue - investment.total_investment;
              const pnlPercent = (pnl / investment.total_investment) * 100;
              const isProfit = pnl >= 0;

              return (
                <div key={investment.id} className="border rounded-lg overflow-hidden hover:shadow-sm transition-shadow">
                  <div className="flex">
                    {/* Property Image */}
                    <div className="relative w-24 h-20 bg-muted flex-shrink-0">
                      {investment.properties.images && investment.properties.images.length > 0 ? (
                        <img
                          src={investment.properties.images[0]}
                          alt={investment.properties.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.src = '/village-aerial.jpg';
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
                          <Building2 className="w-6 h-6 text-primary/40" />
                        </div>
                      )}
                    </div>

                    {/* Property Details */}
                    <div className="flex-1 p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-sm">{investment.properties.title}</h4>
                            {getStatusBadge(investment.properties.property_status)}
                            {investment.properties.shares_sellable && (
                              <Badge className="bg-orange-100 text-orange-800 text-xs">
                                <TrendingDown className="w-3 h-3 mr-1" />
                                Sellable
                              </Badge>
                            )}
                          </div>
                          
                          <div className="flex items-center text-xs text-muted-foreground mb-2">
                            <MapPin className="w-3 h-3 mr-1" />
                            {investment.properties.city}, {investment.properties.country}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 ml-4">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigate(`/invest/${investment.properties.id}`)}
                          >
                            <Eye className="w-3 h-3 mr-1" />
                            View
                          </Button>
                          
                          {investment.properties.shares_sellable && (
                            <ShareSellDialog 
                              property={{
                                id: investment.properties.id,
                                title: investment.properties.title,
                                share_price: investment.properties.share_price,
                                city: investment.properties.city,
                                country: investment.properties.country
                              }}
                              userShares={investment.shares_owned}
                              userInvestment={{
                                price_per_share: currentValue / investment.shares_owned, // Average price per share
                                total_investment: investment.total_investment
                              }}
                            />
                          )}
                        </div>
                      </div>
                      
                      {/* Investment Metrics */}
                      <div className="grid grid-cols-4 gap-3 text-xs">
                        <div>
                          <p className="text-muted-foreground">Shares</p>
                          <p className="font-medium">{investment.shares_owned}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Investment</p>
                          <p className="font-medium">{formatCurrency(investment.total_investment)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Current Value</p>
                          <p className="font-medium">{formatCurrency(currentValue)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">P&L</p>
                          <div className={`font-medium ${isProfit ? 'text-green-600' : 'text-red-600'}`}>
                            <p>{isProfit ? '+' : ''}{formatCurrency(pnl)}</p>
                            <p className="text-xs">({isProfit ? '+' : ''}{pnlPercent.toFixed(1)}%)</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-between items-center mt-2 pt-2 border-t border-muted text-xs text-muted-foreground">
                        <span>Invested: {formatDate(investment.investment_date)}</span>
                        <span>{investment.properties.property_type}</span>
                      </div>
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

export default MyProperties;