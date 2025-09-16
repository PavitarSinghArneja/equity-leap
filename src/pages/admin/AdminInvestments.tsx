import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/NewAuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { 
  TrendingUp, 
  ArrowLeft,
  Search,
  Building2,
  User,
  Calendar,
  DollarSign,
  Filter
} from 'lucide-react';

interface Investment {
  id: string;
  user_id: string;
  property_id: string;
  shares_owned: number;
  price_per_share: number;
  total_investment: number;
  investment_date: string;
  investment_status: string;
  created_at: string;
  user_profiles: {
    full_name: string | null;
    email: string;
  } | null;
  properties: {
    title: string;
    city: string;
    country: string;
    property_type: string;
  } | null;
}

const AdminInvestments = () => {
  const { addNotification } = useAuth();
  const navigate = useNavigate();
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchInvestments();
  }, []);

  const fetchInvestments = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('investments')
        .select(`
          *,
          user_profiles (
            full_name,
            email
          ),
          properties (
            title,
            city,
            country,
            property_type
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvestments(data || []);
    } catch (error) {
      console.error('Error fetching investments:', error);
      addNotification({
        name: "Failed to Load Investments",
        description: "Unable to load investments data",
        icon: "ALERT_TRIANGLE",
        color: "#DC2626",
        isLogo: true
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-primary/10 text-primary border-primary/20';
      case 'pending':
        return 'bg-warning/10 text-warning border-warning/20';
      case 'failed':
        return 'bg-destructive/10 text-destructive border-destructive/20';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  const filteredInvestments = investments.filter(investment => {
    const searchTerm = searchQuery.toLowerCase();
    return (
      investment.user_profiles?.full_name?.toLowerCase().includes(searchTerm) ||
      investment.user_profiles?.email?.toLowerCase().includes(searchTerm) ||
      investment.properties?.title?.toLowerCase().includes(searchTerm) ||
      investment.properties?.city?.toLowerCase().includes(searchTerm)
    );
  });

  const totalInvestmentValue = investments.reduce((sum, inv) => sum + inv.total_investment, 0);
  const completedInvestments = investments.filter(inv => inv.investment_status === 'completed').length;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 hero-gradient rounded-xl flex items-center justify-center mx-auto mb-4">
            <TrendingUp className="w-7 h-7 text-white animate-pulse" />
          </div>
          <p className="text-muted-foreground">Loading investments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Investments</h1>
            <p className="text-muted-foreground">Monitor and manage all investment transactions</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/admin')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Admin
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Investments</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{investments.length}</div>
              <p className="text-xs text-muted-foreground">All investment transactions</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Value</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{totalInvestmentValue.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Total invested amount</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{completedInvestments}</div>
              <p className="text-xs text-muted-foreground">Successful investments</p>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search investments..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Investments List */}
        {filteredInvestments.length > 0 ? (
          <div className="space-y-4">
            {filteredInvestments.map((investment) => (
              <Card key={investment.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                          <TrendingUp className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h3 className="font-semibold">{investment.properties?.title || 'Unknown Property'}</h3>
                          <p className="text-sm text-muted-foreground">
                            {investment.properties?.city}, {investment.properties?.country}
                          </p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                        <div>
                          <p className="text-xs text-muted-foreground">Investor</p>
                          <p className="font-medium">
                            {investment.user_profiles?.full_name || investment.user_profiles?.email || 'Unknown User'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Shares</p>
                          <p className="font-medium">{investment.shares_owned} shares</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Price per Share</p>
                          <p className="font-medium">₹{investment.price_per_share.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Total Investment</p>
                          <p className="font-medium text-green-600">₹{investment.total_investment.toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end space-y-2">
                      <Badge className={getStatusColor(investment.investment_status)}>
                        {investment.investment_status}
                      </Badge>
                      <div className="text-xs text-muted-foreground flex items-center">
                        <Calendar className="w-3 h-3 mr-1" />
                        {new Date(investment.investment_date || investment.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="text-center py-12">
              <TrendingUp className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {searchQuery ? 'No Matching Investments' : 'No Investments'}
              </h3>
              <p className="text-muted-foreground">
                {searchQuery 
                  ? 'No investments match your search criteria.' 
                  : 'No investments have been made yet.'
                }
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default AdminInvestments;
