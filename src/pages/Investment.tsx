import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useAdmin } from '@/hooks/useAdmin';
import { supabase } from '@/integrations/supabase/client';
import { 
  ArrowLeft,
  Building2,
  MapPin,
  TrendingUp,
  Wallet,
  Calculator,
  CheckCircle2,
  AlertTriangle,
  Info
} from 'lucide-react';
import { recalculateUserTierAfterInvestment } from '@/utils/tierManagement';
import WatchlistButton from '@/components/WatchlistButton';
import ShareSellDialog from '@/components/ShareSellDialog';
import ShareMarketplace from '@/components/ShareMarketplace';
import PropertyDocuments from '@/components/PropertyDocuments';

interface Property {
  id: string;
  title: string;
  description: string;
  city: string;
  country: string;
  property_type: string;
  total_value: number;
  share_price: number;
  minimum_investment: number;
  maximum_investment: number;
  expected_annual_return: number;
  funded_amount: number;
  funding_goal: number;
  available_shares: number;
  images: string[];
  property_status: string;
  shares_sellable?: boolean;
  actual_roi_percentage?: number;
}

interface UserInvestment {
  id: string;
  shares_owned: number;
  price_per_share: number;
  total_investment: number;
  investment_date: string;
}

interface EscrowBalance {
  available_balance: number;
  pending_balance: number;
}

const Investment = () => {
  const { user, profile, addNotification } = useAuth();
  const navigate = useNavigate();
  const { propertyId } = useParams();
  const { isAdmin } = useAdmin();
  
  const [property, setProperty] = useState<Property | null>(null);
  const [escrowBalance, setEscrowBalance] = useState<EscrowBalance | null>(null);
  const [loading, setLoading] = useState(true);
  const [investing, setInvesting] = useState(false);
  const [shares, setShares] = useState<number>(1);
  const [actualInvested, setActualInvested] = useState<number>(0);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(0);
  const [userInvestment, setUserInvestment] = useState<UserInvestment | null>(null);
  
  // Calculate investment amount
  const investmentAmount = shares * (property?.share_price || 0);
  const remainingBalance = (escrowBalance?.available_balance || 0) - investmentAmount;

  useEffect(() => {
    // Removed authentication and KYC requirements for viewing property details
    // These checks are now moved to the investment action buttons

    fetchData();
  }, [user, profile, propertyId]);

  const fetchData = useCallback(async () => {
    if (!user || !propertyId) return;

    try {
      setLoading(true);
      
      // Fetch property details or use dummy data
      if (propertyId === 'dummy-1') {
        // Use dummy data
        setProperty({
          id: 'dummy-1',
          title: 'Luxury Residential Complex - Phase 1',
          description: 'Premium residential development in the heart of Gurgaon with world-class amenities including clubhouse, swimming pool, gym, and 24/7 security. This property offers excellent rental yields and capital appreciation potential.',
          city: 'Gurgaon',
          country: 'India',
          property_type: 'Residential',
          total_value: 25000000, // ₹2.5 Crores
          share_price: 10000, // ₹10,000 per share
          minimum_investment: 100000, // ₹1 Lakh
          maximum_investment: 1000000, // ₹10 Lakhs
          expected_annual_return: 12.5,
          funded_amount: 18750000, // 75% funded
          funding_goal: 25000000,
          available_shares: 625, // (25% of 2500 total shares)
          images: [
            '/village-aerial.jpg', // Using the existing village aerial image
            'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&q=80', // Modern apartment building
            'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=800&q=80', // Luxury home interior
            'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&q=80', // Modern kitchen
            'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80', // Living room
          ],
          property_status: 'open',
          shares_sellable: true // Demo property allows share selling
        });
        setActualInvested(18750000); // 75% of 25M
      } else {
        // Fetch from database
        const { data, error } = await supabase
          .from('properties')
          .select('*')
          .eq('id', propertyId)
          .single();

        if (error) throw error;
        setProperty(data);
        
        // Check if user has existing investment in this property
        const { data: investmentData, error: investmentError } = await supabase
          .from('investments')
          .select('*')
          .eq('user_id', user.id)
          .eq('property_id', propertyId)
          .single();

        if (!investmentError && investmentData) {
          setUserInvestment(investmentData);
        }
      }
      
      // Reset image index when property loads
      setSelectedImageIndex(0);

      // Fetch actual investment totals for this property
      if (propertyId !== 'dummy-1') {
        const { data: investmentData, error: investmentError } = await supabase
          .from('investments')
          .select('total_investment')
          .eq('property_id', propertyId)
          .eq('investment_status', 'confirmed');

        if (investmentError) throw investmentError;
        
        const totalInvested = investmentData?.reduce((sum, inv) => sum + inv.total_investment, 0) || 0;
        setActualInvested(totalInvested);
      }

      // Fetch user's wallet balance
      const { data: balanceData, error: balanceError } = await supabase
        .from('escrow_balances')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (balanceError) throw balanceError;
      setEscrowBalance(balanceData);
      
      // For non-dummy properties, also check user's investment
      if (propertyId !== 'dummy-1') {
        const { data: investmentData, error: investmentError } = await supabase
          .from('investments')
          .select('*')
          .eq('user_id', user.id)
          .eq('property_id', propertyId)
          .single();

        if (!investmentError && investmentData) {
          setUserInvestment(investmentData);
        }
      }

    } catch (error) {
      console.error('Error fetching data:', error);
      addNotification({
        name: "Failed to Load Property",
        description: "Unable to load property details. Please try again.",
        icon: "ALERT_TRIANGLE",
        color: "#DC2626",
        isLogo: true
      });
      navigate('/properties');
    } finally {
      setLoading(false);
    }
  }, [user, propertyId, addNotification, navigate]);

  const handleSharesChange = (value: string) => {
    const numShares = parseInt(value) || 0;
    if (numShares >= 0) {
      setShares(numShares);
    }
  };

  const validateInvestment = (): boolean => {
    if (!property || !escrowBalance) return false;

    if (shares <= 0) {
      addNotification({
        name: "Invalid Shares",
        description: "Please enter a valid number of shares",
        icon: "ALERT_TRIANGLE",
        color: "#DC2626",
        isLogo: true
      });
      return false;
    }

    if (investmentAmount < property.minimum_investment) {
      addNotification({
        name: "Below Minimum Investment",
        description: `Minimum investment is ${formatCurrency(property.minimum_investment)}`,
        icon: "ALERT_TRIANGLE",
        color: "#DC2626",
        isLogo: true
      });
      return false;
    }

    if (investmentAmount > property.maximum_investment) {
      addNotification({
        name: "Exceeds Maximum Investment",
        description: `Maximum investment is ${formatCurrency(property.maximum_investment)}`,
        icon: "ALERT_TRIANGLE",
        color: "#DC2626",
        isLogo: true
      });
      return false;
    }

    if (investmentAmount > escrowBalance.available_balance) {
      addNotification({
        name: "Insufficient Balance",
        description: "You don't have enough balance in your wallet",
        icon: "ALERT_TRIANGLE",
        color: "#DC2626",
        isLogo: true
      });
      return false;
    }

    if (shares > property.available_shares) {
      addNotification({
        name: "Shares Not Available",
        description: `Only ${property.available_shares} shares are available`,
        icon: "ALERT_TRIANGLE",
        color: "#DC2626",
        isLogo: true
      });
      return false;
    }

    return true;
  };

  const executeInvestment = async () => {
    // Check if user is authenticated first
    if (!user) {
      addNotification({
        name: "Sign In Required",
        description: "Please sign in to start investing",
        icon: "SHIELD_ALERT",
        color: "#DC2626",
        isLogo: true
      });
      navigate('/auth');
      return;
    }

    // Check KYC status before allowing investment
    const isInvestorTier = profile?.tier === 'small_investor' || profile?.tier === 'large_investor';
    if (!(profile?.tier_override_by_admin && isInvestorTier) && profile?.kyc_status !== 'approved') {
      addNotification({
        name: "KYC Required",
        description: "Please complete your KYC verification to start investing",
        icon: "SHIELD_ALERT",
        color: "#DC2626",
        isLogo: true
      });
      navigate('/kyc');
      return;
    }

    if (!property || !validateInvestment()) return;

    setInvesting(true);
    try {
      // Create investment record
      const { data: investmentData, error: investmentError } = await supabase
        .from('investments')
        .insert([{
          user_id: user.id,
          property_id: property.id,
          shares_owned: shares,
          price_per_share: property.share_price,
          total_investment: investmentAmount,
          investment_status: 'confirmed'
        }])
        .select()
        .single();

      if (investmentError) throw investmentError;

      // Update user's wallet balance
      const newBalance = (escrowBalance?.available_balance || 0) - investmentAmount;
      const { error: balanceError } = await supabase
        .from('escrow_balances')
        .update({
          available_balance: newBalance,
          total_invested: ((escrowBalance?.total_invested || 0) + investmentAmount)
        })
        .eq('user_id', user.id);

      if (balanceError) throw balanceError;

      // Create transaction record
      const { error: transactionError } = await supabase
        .from('transactions')
        .insert([{
          user_id: user.id,
          transaction_type: 'investment',
          amount: investmentAmount,
          status: 'completed',
          reference_id: investmentData.id,
          description: `Investment in ${property.title} - ${shares} shares`,
          property_id: property.id
        }]);

      if (transactionError) throw transactionError;

      // Update property shares and status if not dummy data
      if (property.id !== 'dummy-1') {
        const newAvailableShares = property.available_shares - shares;
        const updates: any = {
          available_shares: newAvailableShares,
          funded_amount: (property.funded_amount || 0) + investmentAmount
        };

        // Auto-update to 'funded' (sold out) if all shares are taken
        if (newAvailableShares <= 0) {
          updates.property_status = 'funded';
        }

        const { error: propertyError } = await supabase
          .from('properties')
          .update(updates)
          .eq('id', property.id);

        if (propertyError) throw propertyError;
      }

      // Automatically update user tier based on their investment portfolio
      await recalculateUserTierAfterInvestment(user.id);

      // Recalculate consolidated position snapshot in Supabase (best-effort)
      try {
        await supabase.rpc('recalc_user_property_position', {
          p_user_id: user.id,
          p_property_id: property.id
        });
      } catch (e) {
        console.warn('Position snapshot recalc failed (non-fatal):', e);
      }

      addNotification({
        name: "Investment Successful",
        description: `You've successfully invested ${formatCurrency(investmentAmount)} in ${property.title}`,
        icon: "CHECK_CIRCLE",
        color: "#059669",
        isLogo: true
      });

      // Navigate to portfolio/dashboard
      setTimeout(() => {
        navigate('/dashboard/overview');
      }, 2000);

    } catch (error) {
      console.error('Investment error:', error);
      addNotification({
        name: "Investment Failed",
        description: "Unable to complete your investment. Please try again.",
        icon: "ALERT_TRIANGLE",
        color: "#DC2626",
        isLogo: true
      });
    } finally {
      setInvesting(false);
    }
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString('en-IN', { 
      style: 'currency', 
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0 
    });
  };

  const formatPercent = (value: number) => {
    return `${value}%`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 hero-gradient rounded-xl flex items-center justify-center mx-auto mb-4">
            <BarChart3 className="w-7 h-7 text-white animate-pulse" />
          </div>
          <p className="text-muted-foreground">Loading property details...</p>
        </div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Building2 className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Property Not Found</h2>
          <p className="text-muted-foreground mb-4">The property you're looking for doesn't exist.</p>
          <Button onClick={() => navigate('/properties')}>
            Back to Properties
          </Button>
        </div>
      </div>
    );
  }

  // Calculate funding progress based on actual investments
  let fundingProgress = 0;
  if (property) {
    if (property.property_status === 'funded') {
      fundingProgress = 100; // Always 100% for sold out properties
    } else if (property.total_value > 0) {
      fundingProgress = Math.round((actualInvested / property.total_value) * 100);
      fundingProgress = Math.min(fundingProgress, 100); // Cap at 100%
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Property Header */}
          <div className="mb-8">
            <div className="flex items-center mb-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/properties')}
                className="text-muted-foreground hover:text-foreground mr-4"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Properties
              </Button>
            </div>
            
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h1 className="text-3xl font-bold mb-2">{property.title}</h1>
                <div className="flex items-center text-muted-foreground mb-4">
                  <MapPin className="w-4 h-4 mr-1" />
                  {property.city}, {property.country}
                </div>
                <Badge variant="outline" className="text-sm">
                  {property.property_type}
                </Badge>
              </div>
              
              {/* Watchlist Button */}
              <div className="flex items-center gap-2 ml-4">
                <WatchlistButton 
                  propertyId={property.id} 
                  variant="outline"
                  size="md"
                  showText={true}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Property Details */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* User's Share Information - Show if user has shares */}
              {userInvestment && (
                <Card className="border-primary/20 bg-primary/5">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center text-primary">
                        <TrendingUp className="w-5 h-5 mr-2" />
                        You Own Shares in This Property
                      </CardTitle>
                      {property.shares_sellable && (
                        <ShareSellDialog 
                          property={{
                            id: property.id,
                            title: property.title,
                            share_price: property.share_price,
                            city: property.city,
                            country: property.country
                          }}
                          userShares={userInvestment.shares_owned}
                          userInvestment={{
                            price_per_share: userInvestment.price_per_share,
                            total_investment: userInvestment.total_investment
                          }}
                        />
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center p-3 bg-white/60 rounded-lg">
                        <p className="text-sm text-muted-foreground">Shares Owned</p>
                        <p className="text-2xl font-bold text-primary">{userInvestment.shares_owned}</p>
                      </div>
                      <div className="text-center p-3 bg-white/60 rounded-lg">
                        <p className="text-sm text-muted-foreground">Total Investment</p>
                        <p className="text-lg font-semibold">{formatCurrency(userInvestment.total_investment)}</p>
                      </div>
                      <div className="text-center p-3 bg-white/60 rounded-lg">
                        <p className="text-sm text-muted-foreground">Current Value</p>
                        <p className="text-lg font-semibold">{formatCurrency(userInvestment.shares_owned * property.share_price)}</p>
                      </div>
                      <div className="text-center p-3 bg-white/60 rounded-lg">
                        <p className="text-sm text-muted-foreground">P&L</p>
                        {(() => {
                          const currentValue = userInvestment.shares_owned * property.share_price;
                          const pnl = currentValue - userInvestment.total_investment;
                          const isProfit = pnl >= 0;
                          return (
                            <div className={`${isProfit ? 'text-green-600' : 'text-red-600'}`}>
                              <p className="text-lg font-semibold">
                                {isProfit ? '+' : ''}{formatCurrency(pnl)}
                              </p>
                              <p className="text-xs">
                                ({isProfit ? '+' : ''}{((pnl / userInvestment.total_investment) * 100).toFixed(1)}%)
                              </p>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                    
                    {!property.shares_sellable && (
                      <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="text-sm text-yellow-800">
                          💡 Share selling is not yet enabled for this property. Contact admin if you wish to sell your shares.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
              {/* Property Images Gallery */}
              <Card>
                <CardContent className="p-0">
                  {property.images && property.images.length > 0 ? (
                    <div className="relative">
                      {/* Main Image */}
                      <div className="aspect-video rounded-t-lg overflow-hidden relative group">
                        <img
                          src={property.images[selectedImageIndex]}
                          alt={`${property.title} - View ${selectedImageIndex + 1}`}
                          className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                          onError={(e) => {
                            e.currentTarget.src = '/village-aerial.jpg'; // Fallback to existing village image
                          }}
                        />
                        
                        {/* Navigation Arrows */}
                        {property.images.length > 1 && (
                          <>
                            <button
                              className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/60 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
                              onClick={() => setSelectedImageIndex(selectedImageIndex > 0 ? selectedImageIndex - 1 : property.images.length - 1)}
                            >
                              ←
                            </button>
                            <button
                              className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/60 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
                              onClick={() => setSelectedImageIndex(selectedImageIndex < property.images.length - 1 ? selectedImageIndex + 1 : 0)}
                            >
                              →
                            </button>
                          </>
                        )}
                      </div>
                      
                      {/* Image Gallery Thumbnails */}
                      {property.images.length > 1 && (
                        <div className="p-4">
                          <div className="flex gap-2 overflow-x-auto">
                            {property.images.slice(0, 5).map((image, index) => (
                              <div
                                key={index}
                                className={`flex-shrink-0 w-20 h-16 rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-all duration-200 ${
                                  selectedImageIndex === index ? 'ring-2 ring-primary ring-offset-2' : ''
                                }`}
                                onClick={() => setSelectedImageIndex(index)}
                              >
                                <img
                                  src={image}
                                  alt={`${property.title} - View ${index + 1}`}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    e.currentTarget.src = '/village-aerial.jpg';
                                  }}
                                />
                              </div>
                            ))}
                            {property.images.length > 5 && (
                              <div className="flex-shrink-0 w-20 h-16 bg-muted rounded-lg flex items-center justify-center text-xs font-medium text-muted-foreground cursor-pointer hover:bg-muted/80">
                                +{property.images.length - 5}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {/* View All Photos Button */}
                      {property.images.length > 1 && (
                        <button className="absolute top-4 right-4 bg-black/60 text-white px-3 py-1 rounded-lg text-sm hover:bg-black/80 transition-colors">
                          📸 {property.images.length} Photos
                        </button>
                      )}
                    </div>
                  ) : (
                    /* Fallback when no images available */
                    <div className="aspect-video bg-gradient-to-br from-primary/20 to-primary/5 flex flex-col items-center justify-center rounded-t-lg">
                      <Building2 className="w-16 h-16 text-primary/60 mb-4" />
                      <p className="text-primary/80 font-medium">Property Images</p>
                      <p className="text-sm text-muted-foreground">Coming Soon</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Description */}
              <Card>
                <CardHeader>
                  <CardTitle>About This Property</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">
                    {property.description}
                  </p>
                </CardContent>
              </Card>

              {/* Share Marketplace - show if shares are sellable */}
              {property.shares_sellable && (
                <ShareMarketplace propertyId={property.id} />
              )}

              {/* Property Documents */}
              <PropertyDocuments propertyId={property.id} isAdmin={isAdmin} />

              {/* Property Stats */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Investment Details</CardTitle>
                    {/* Show ROI only for sold out properties */}
                    {property.property_status === 'funded' && property.actual_roi_percentage && (
                      <Badge className="bg-green-100 text-green-800">
                        Actual ROI: {property.actual_roi_percentage}%
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Total Value</p>
                      <p className="font-semibold">{formatCurrency(property.total_value)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Share Price</p>
                      <p className="font-semibold">{formatCurrency(property.share_price)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Expected ROI</p>
                      <div className="flex items-center">
                        <span className="font-semibold text-success">{formatPercent(property.expected_annual_return)}</span>
                        <TrendingUp className="w-3 h-3 ml-1 text-success" />
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Available Shares</p>
                      <p className="font-semibold">{property.available_shares.toLocaleString()}</p>
                    </div>
                  </div>

                  <Separator className="my-4" />

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-muted-foreground">Funding Progress</span>
                      <span className="text-sm font-medium">{fundingProgress}%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div 
                        className="bg-primary h-2 rounded-full transition-all duration-300"
                        style={{ width: `${fundingProgress}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>{formatCurrency(actualInvested)} raised</span>
                      <span>{formatCurrency(property.total_value)} goal</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Investment Panel */}
            <div className="space-y-6">
              {/* Wallet Balance */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Your Wallet Balance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-bold">{formatCurrency(escrowBalance?.available_balance || 0)}</p>
                      <p className="text-xs text-muted-foreground">Available to invest</p>
                    </div>
                    <Wallet className="w-8 h-8 text-primary" />
                  </div>
                </CardContent>
              </Card>

              {/* User's Investment Summary */}
              {userInvestment && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center">
                        <TrendingUp className="w-5 h-5 mr-2" />
                        Your Investment
                      </CardTitle>
                      {/* Show sell button only if shares are sellable */}
                      {property.shares_sellable && (
                        <ShareSellDialog 
                          property={{
                            id: property.id,
                            title: property.title,
                            share_price: property.share_price,
                            city: property.city,
                            country: property.country
                          }}
                          userShares={userInvestment.shares_owned}
                          userInvestment={{
                            price_per_share: userInvestment.price_per_share,
                            total_investment: userInvestment.total_investment
                          }}
                        />
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Shares Owned</p>
                        <p className="font-semibold text-lg">{userInvestment.shares_owned}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Total Investment</p>
                        <p className="font-semibold text-lg">{formatCurrency(userInvestment.total_investment)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Avg. Price per Share</p>
                        <p className="font-medium">{formatCurrency(userInvestment.price_per_share)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Current Value</p>
                        <p className="font-medium">{formatCurrency(userInvestment.shares_owned * property.share_price)}</p>
                      </div>
                    </div>
                    
                    {/* P&L Calculation */}
                    <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Unrealized P&L:</span>
                        {(() => {
                          const currentValue = userInvestment.shares_owned * property.share_price;
                          const originalValue = userInvestment.total_investment;
                          const pnl = currentValue - originalValue;
                          const pnlPercent = ((pnl / originalValue) * 100);
                          return (
                            <div className={`text-right ${pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              <span className="font-semibold">
                                {pnl >= 0 ? '+' : ''}{formatCurrency(pnl)}
                              </span>
                              <span className="text-xs block">
                                ({pnl >= 0 ? '+' : ''}{pnlPercent.toFixed(2)}%)
                              </span>
                            </div>
                          );
                        })()} 
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Investment Calculator */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Calculator className="w-5 h-5 mr-2" />
                    {userInvestment ? 'Buy More Shares' : 'Investment Calculator'}
                  </CardTitle>
                  <CardDescription>
                    {userInvestment ? 'Add more shares to your portfolio' : 'Calculate your investment amount'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="shares">Number of Shares</Label>
                    <Input
                      id="shares"
                      type="number"
                      value={shares}
                      onChange={(e) => handleSharesChange(e.target.value)}
                      min="1"
                      max={property.available_shares}
                      className="text-base"
                    />
                    <p className="text-xs text-muted-foreground">
                      Max: {property.available_shares.toLocaleString()} shares available
                    </p>
                  </div>

                  <div className="bg-muted p-4 rounded-lg space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Share Price:</span>
                      <span className="font-medium">{formatCurrency(property.share_price)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Shares:</span>
                      <span className="font-medium">{shares.toLocaleString()}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between">
                      <span className="font-medium">Total Investment:</span>
                      <span className="font-bold text-lg">{formatCurrency(investmentAmount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Remaining Balance:</span>
                      <span className={`text-sm ${remainingBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(remainingBalance)}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                      <Info className="w-3 h-3" />
                      <span>Min: {formatCurrency(property.minimum_investment)}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                      <Info className="w-3 h-3" />
                      <span>Max: {formatCurrency(property.maximum_investment)}</span>
                    </div>
                  </div>

                  <Button
                    onClick={executeInvestment}
                    disabled={investing || investmentAmount <= 0 || remainingBalance < 0}
                    className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-11"
                  >
                    {investing ? (
                      'Processing Investment...'
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Invest {formatCurrency(investmentAmount)}
                      </>
                    )}
                  </Button>

                  <p className="text-xs text-muted-foreground text-center">
                    By investing, you agree to our terms and conditions.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Investment;
