import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { 
  Search,
  MapPin,
  TrendingUp,
  DollarSign,
  Users,
  ArrowLeft,
  Building,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

interface Property {
  id: string;
  title: string;
  description: string;
  address: string;
  city: string;
  country: string;
  property_type: string;
  total_value: number;
  available_shares: number;
  share_price: number;
  minimum_investment: number;
  funded_amount: number;
  funding_goal: number;
  expected_annual_return: number;
  property_status: string;
  images: string[];
  featured: boolean;
}

const Properties = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchProperties();
  }, [user, navigate]);

  const fetchProperties = async () => {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('property_status', 'open')
        .order('featured', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProperties(data || []);
    } catch (error) {
      console.error('Error fetching properties:', error);
      toast.error('Failed to load properties');
    }
    setLoading(false);
  };

  const filteredProperties = properties.filter(property =>
    property.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    property.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
    property.country.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-success text-success-foreground';
      case 'funded':
        return 'bg-primary text-primary-foreground';
      case 'upcoming':
        return 'bg-warning text-warning-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getFundingProgress = (funded: number, goal: number) => {
    return Math.min((funded / goal) * 100, 100);
  };

  const canInvest = (property: Property) => {
    if (!profile) return false;
    if (profile.kyc_status !== 'approved') return false;
    if (profile.tier === 'explorer') return false;
    return property.property_status === 'open';
  };

  const handleInvestClick = (property: Property) => {
    if (profile?.tier === 'explorer') {
      toast.info('Contact our team to start investing');
      return;
    }
    
    if (profile?.kyc_status !== 'approved') {
      toast.error('Please complete KYC verification first');
      navigate('/kyc');
      return;
    }

    // TODO: Implement investment flow
    toast.info('Investment flow coming soon');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Building className="w-12 h-12 text-primary mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">Loading properties...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button 
              variant="ghost" 
              onClick={() => navigate('/dashboard')}
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>
          <div className="flex items-center space-x-3">
            <Building className="w-6 h-6 text-primary" />
            <span className="text-xl font-semibold">Property Marketplace</span>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Search and Filters */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">Investment Properties</h1>
              <p className="text-muted-foreground">
                Discover premium real estate investment opportunities
              </p>
            </div>
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search properties..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </div>

        {/* KYC Warning */}
        {profile?.kyc_status !== 'approved' && (
          <Card className="mb-6 border-warning/20 bg-warning/5">
            <CardContent className="pt-6">
              <div className="flex items-center space-x-3">
                <AlertCircle className="w-5 h-5 text-warning flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="font-semibold text-warning">Complete KYC to Invest</h3>
                  <p className="text-sm text-muted-foreground">
                    You can browse properties, but investments require KYC verification.
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  onClick={() => navigate('/kyc')}
                  className="border-warning text-warning hover:bg-warning/10"
                >
                  Complete KYC
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Properties Grid */}
        {filteredProperties.length === 0 ? (
          <Card className="investment-card text-center py-12">
            <CardContent>
              <Building className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Properties Found</h3>
              <p className="text-muted-foreground">
                {searchTerm ? 'Try adjusting your search terms' : 'New properties coming soon!'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProperties.map((property) => (
              <Card key={property.id} className="investment-card group cursor-pointer">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg mb-2 group-hover:text-primary transition-colors">
                        {property.title}
                      </CardTitle>
                      <div className="flex items-center text-muted-foreground text-sm mb-2">
                        <MapPin className="w-4 h-4 mr-1" />
                        {property.city}, {property.country}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      {property.featured && (
                        <Badge className="bg-primary text-primary-foreground">Featured</Badge>
                      )}
                      <Badge className={getStatusColor(property.property_status)}>
                        {property.property_status}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="mb-4 line-clamp-2">
                    {property.description}
                  </CardDescription>
                  
                  {/* Property Stats */}
                  <div className="space-y-3 mb-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center text-sm text-muted-foreground">
                        <DollarSign className="w-4 h-4 mr-1" />
                        Share Price
                      </div>
                      <span className="font-semibold">${property.share_price.toLocaleString()}</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center text-sm text-muted-foreground">
                        <TrendingUp className="w-4 h-4 mr-1" />
                        Expected Return
                      </div>
                      <span className="font-semibold text-success">
                        {property.expected_annual_return}%
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Users className="w-4 h-4 mr-1" />
                        Min Investment
                      </div>
                      <span className="font-semibold">
                        {property.minimum_investment} shares
                      </span>
                    </div>
                  </div>

                  {/* Funding Progress */}
                  <div className="mb-4">
                    <div className="flex justify-between items-center text-sm mb-2">
                      <span className="text-muted-foreground">Funding Progress</span>
                      <span className="font-medium">
                        {getFundingProgress(property.funded_amount, property.funding_goal).toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div 
                        className="bg-primary h-2 rounded-full transition-all duration-300"
                        style={{ 
                          width: `${getFundingProgress(property.funded_amount, property.funding_goal)}%` 
                        }}
                      />
                    </div>
                    <div className="flex justify-between items-center text-xs text-muted-foreground mt-1">
                      <span>${property.funded_amount.toLocaleString()} raised</span>
                      <span>Goal: ${property.funding_goal.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Action Button */}
                  <Button 
                    className="w-full" 
                    variant={canInvest(property) ? "hero" : "outline"}
                    onClick={() => handleInvestClick(property)}
                    disabled={property.property_status !== 'open'}
                  >
                    {profile?.tier === 'explorer' ? (
                      'Contact Team'
                    ) : profile?.kyc_status !== 'approved' ? (
                      'Complete KYC First'
                    ) : property.property_status === 'funded' ? (
                      'Fully Funded'
                    ) : (
                      'Invest Now'
                    )}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Properties;