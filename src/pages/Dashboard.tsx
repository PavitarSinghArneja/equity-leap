import { useEffect, useState, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import WalletActions from '@/components/WalletActions';
import { useAdmin } from '@/hooks/useAdmin';
import InvestmentPerformanceChart from '@/components/InvestmentPerformanceChart';
import GlobalHeader from '@/components/GlobalHeader';
import TransactionDetailsModal from '@/components/TransactionDetailsModal';
import MyShareSellRequests from '@/components/MyShareSellRequests';
import MyWatchlistEnhanced from '@/components/MyWatchlistEnhanced';
import MyProperties from '@/components/MyProperties';
import { supabase } from '@/integrations/supabase/client';
import { 
  BarChart3, 
  TrendingUp, 
  Building2,
  Plus,
  Activity,
  Settings,
  HelpCircle,
  CheckCircle,
  Calendar,
  DollarSign,
  CreditCard,
  Clock,
  Home,
  LogOut,
  Crown,
  Wallet,
  X,
  Filter
} from 'lucide-react';

interface EscrowBalance {
  available_balance: number;
  pending_balance: number;
  total_invested: number;
  total_returns: number;
}

interface Investment {
  id: string;
  property_id: string;
  shares_owned: number;
  price_per_share: number;
  total_investment: number;
  investment_date: string;
  investment_status: string;
  created_at: string;
  properties: {
    id: string;
    title: string;
    property_type: string;
    share_price: number;
  };
}

interface DashboardMetrics {
  totalInvestmentValue: number;
  currentMarketValue: number;
  lifetimeReturns: number;
  activeProperties: number;
  monthOverMonthChanges: {
    investment: number;
    returns: number;
    properties: number;
  };
  propertyDistribution: {
    residential: number;
    commercial: number;
    mixed: number;
  };
}

interface RecentActivity {
  id: string;
  type: 'investment' | 'return' | 'meeting';
  title: string;
  subtitle?: string;
  amount?: number;
  date: string;
  icon: 'check' | 'dollar' | 'calendar';
}

const Dashboard = () => {
  const { user, profile, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const { isAdmin } = useAdmin();
  const [escrowBalance, setEscrowBalance] = useState<EscrowBalance | null>(null);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [featuredProperties, setFeaturedProperties] = useState<any[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [showAllTransactions, setShowAllTransactions] = useState(false);
  const [allTransactions, setAllTransactions] = useState<any[]>([]);
  const [transactionFilter, setTransactionFilter] = useState('all');
  const [loadingAllTransactions, setLoadingAllTransactions] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);

  // All hooks must be declared before any conditional logic
  const fetchEscrowBalance = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('escrow_balances')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      setEscrowBalance(data);
    } catch (error) {
      console.error('Error fetching escrow balance:', error);
    }
  }, [user]);

  const fetchInvestments = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('investments')
        .select(`
          *,
          properties (
            id,
            title,
            property_type,
            share_price
          )
        `)
        .eq('user_id', user.id)
        .eq('investment_status', 'confirmed');

      if (error) throw error;
      setInvestments(data || []);
    } catch (error) {
      console.error('Error fetching investments:', error);
    }
  }, [user]);

  const fetchTransactions = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          properties!property_id(id, title, share_price)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
  }, [user]);

  const fetchFeaturedProperties = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('featured', true)
        .eq('property_status', 'open')
        .order('created_at', { ascending: false })
        .limit(3);

      if (error) throw error;
      setFeaturedProperties(data || []);
    } catch (error) {
      console.error('Error fetching featured properties:', error);
      setFeaturedProperties([]);
    }
  }, []);

  const fetchAllTransactions = useCallback(async () => {
    if (!user) return;
    setLoadingAllTransactions(true);
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          properties!property_id(id, title, share_price)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAllTransactions(data || []);
    } catch (error) {
      console.error('Error fetching all transactions:', error);
    } finally {
      setLoadingAllTransactions(false);
    }
  }, [user]);

  const fetchAllData = useCallback(async () => {
    setDataLoading(true);
    await Promise.all([
      fetchEscrowBalance(),
      fetchInvestments(),
      fetchTransactions(),
      fetchFeaturedProperties()
    ]);
    setDataLoading(false);
  }, [fetchEscrowBalance, fetchInvestments, fetchTransactions, fetchFeaturedProperties]);

  const formatPercentageChange = useCallback((value: number) => {
    const isPositive = value >= 0;
    const sign = isPositive ? '+' : '';
    return {
      text: `${sign}${value.toFixed(1)}% vs last month`,
      className: isPositive ? 'text-success' : 'text-destructive',
      icon: isPositive ? TrendingUp : TrendingUp // Could use TrendingDown for negative
    };
  }, []);

  const dashboardMetrics = useMemo(() => {
    if (!investments.length && !escrowBalance && !transactions.length) {
      return {
        totalInvestmentValue: 0,
        currentMarketValue: 0,
        lifetimeReturns: 0,
        activeProperties: 0,
        monthOverMonthChanges: {
          investment: 0,
          returns: 0,
          properties: 0
        },
        propertyDistribution: {
          residential: 0,
          commercial: 0,
          mixed: 0
        }
      };
    }

    // Calculate total investment value (actual money invested)
    const totalInvestmentValue = investments.reduce((sum, investment) => {
      return sum + investment.total_investment;
    }, 0);

    // Calculate current market value based on current share prices
    const currentMarketValue = investments.reduce((sum, investment) => {
      const currentSharePrice = investment.properties.share_price;
      const sharesOwned = investment.shares_owned;
      return sum + (currentSharePrice * sharesOwned);
    }, 0);

    // Calculate lifetime returns as capital gains/losses (current value - total invested)
    const lifetimeReturns = currentMarketValue - totalInvestmentValue;

    // Count unique properties
    const uniqueProperties = new Set(investments.map(inv => inv.property_id));
    const activeProperties = uniqueProperties.size;

    // Calculate month-over-month changes
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    
    const thisMonthTransactions = transactions.filter(t => 
      t.created_at && new Date(t.created_at) >= lastMonth
    );
    
    const lastMonthTransactions = transactions.filter(t => 
      t.created_at && 
      new Date(t.created_at) >= twoMonthsAgo && 
      new Date(t.created_at) < lastMonth
    );

    // Calculate investment changes
    const thisMonthInvestment = thisMonthTransactions
      .filter(t => t.transaction_type === 'investment')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const lastMonthInvestment = lastMonthTransactions
      .filter(t => t.transaction_type === 'investment')
      .reduce((sum, t) => sum + t.amount, 0);

    const investmentChange = lastMonthInvestment > 0 
      ? ((thisMonthInvestment - lastMonthInvestment) / lastMonthInvestment) * 100 
      : 0;

    // Calculate returns changes
    const thisMonthReturns = thisMonthTransactions
      .filter(t => t.transaction_type === 'dividend')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const lastMonthReturns = lastMonthTransactions
      .filter(t => t.transaction_type === 'dividend')
      .reduce((sum, t) => sum + t.amount, 0);

    const returnsChange = lastMonthReturns > 0 
      ? ((thisMonthReturns - lastMonthReturns) / lastMonthReturns) * 100 
      : 0;

    // Calculate property changes (simplified - based on new investments)
    const thisMonthProperties = new Set(
      thisMonthTransactions
        .filter(t => t.transaction_type === 'investment')
        .map(t => t.property_id)
        .filter(Boolean)
    ).size;

    const lastMonthProperties = new Set(
      lastMonthTransactions
        .filter(t => t.transaction_type === 'investment')
        .map(t => t.property_id)
        .filter(Boolean)
    ).size;

    const propertiesChange = thisMonthProperties - lastMonthProperties;

    // Calculate property distribution (count unique properties only)
    const uniquePropertiesWithTypes = new Map();
    investments.forEach(investment => {
      const propertyId = investment.property_id;
      const type = investment.properties.property_type?.toLowerCase() || 'other';
      if (!uniquePropertiesWithTypes.has(propertyId)) {
        uniquePropertiesWithTypes.set(propertyId, type);
      }
    });

    const propertyTypes = Array.from(uniquePropertiesWithTypes.values()).reduce((acc, type) => {
      if (type.includes('residential') || type.includes('villa') || type.includes('apartment')) {
        acc.residential += 1;
      } else if (type.includes('commercial') || type.includes('office') || type.includes('retail')) {
        acc.commercial += 1;
      } else {
        acc.mixed += 1;
      }
      return acc;
    }, { residential: 0, commercial: 0, mixed: 0 });

    return {
      totalInvestmentValue,
      currentMarketValue,
      lifetimeReturns,
      activeProperties,
      monthOverMonthChanges: {
        investment: investmentChange,
        returns: returnsChange,
        properties: propertiesChange
      },
      propertyDistribution: propertyTypes
    };
  }, [investments, escrowBalance, transactions]);

  // Generate recent activity from transactions
  const recentActivity: RecentActivity[] = useMemo(() => transactions.slice(0, 5).map(transaction => {
    const date = new Date(transaction.created_at);
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    let dateString = '';
    if (diffDays === 0) {
      dateString = 'Today';
    } else if (diffDays === 1) {
      dateString = '1 day ago';
    } else if (diffDays < 7) {
      dateString = `${diffDays} days ago`;
    } else if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      dateString = weeks === 1 ? '1 week ago' : `${weeks} weeks ago`;
    } else {
      const months = Math.floor(diffDays / 30);
      dateString = months === 1 ? '1 month ago' : `${months} months ago`;
    }

    let title = '';
    let subtitle = '';
    let type: 'investment' | 'return' | 'meeting' = 'investment';
    let icon: 'check' | 'dollar' | 'calendar' = 'check';

    // Get property information if available
    const property = transaction.properties;
    const propertyName = property?.title || 'Unknown Property';
    const sharePrice = property?.share_price;

    switch (transaction.transaction_type) {
      case 'investment':
        title = `Investment of ₹${transaction.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} confirmed`;
        if (property && sharePrice) {
          subtitle = `${propertyName} • Share price: ₹${sharePrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        } else if (property) {
          subtitle = propertyName;
        }
        type = 'investment';
        icon = 'check';
        break;
      case 'dividend':
        title = `Received dividend of ₹${transaction.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        if (property) {
          subtitle = `From ${propertyName}`;
        }
        type = 'return';
        icon = 'dollar';
        break;
      case 'deposit':
        title = `Deposited ₹${transaction.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} to wallet`;
        type = 'investment';
        icon = 'check';
        break;
      case 'withdrawal':
        title = `Withdrew ₹${transaction.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} from wallet`;
        type = 'return';
        icon = 'dollar';
        break;
      case 'fee':
        title = `Platform fee of ₹${transaction.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} charged`;
        if (property) {
          subtitle = `For ${propertyName}`;
        }
        type = 'investment';
        icon = 'check';
        break;
      default:
        title = `Transaction of ₹${transaction.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        type = 'investment';
        icon = 'check';
    }

    return {
      id: transaction.id,
      type,
      title,
      subtitle: subtitle || undefined,
      date: dateString,
      icon
    };
  }), [transactions]);

  // Filter all transactions based on selected filter
  const filteredAllTransactions = useMemo(() => {
    if (transactionFilter === 'all') {
      return allTransactions;
    }
    return allTransactions.filter(txn => txn.transaction_type === transactionFilter);
  }, [allTransactions, transactionFilter]);

  // Generate activity data for all transactions (similar to recent activity)
  const generateActivityData = useCallback((transactions: any[]) => {
    return transactions.map(transaction => {
      const date = new Date(transaction.created_at);
      const now = new Date();
      const diffTime = now.getTime() - date.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      let dateString = '';
      if (diffDays === 0) {
        dateString = 'Today';
      } else if (diffDays === 1) {
        dateString = '1 day ago';
      } else if (diffDays < 7) {
        dateString = `${diffDays} days ago`;
      } else if (diffDays < 30) {
        const weeks = Math.floor(diffDays / 7);
        dateString = weeks === 1 ? '1 week ago' : `${weeks} weeks ago`;
      } else {
        const months = Math.floor(diffDays / 30);
        dateString = months === 1 ? '1 month ago' : `${months} months ago`;
      }

      let title = '';
      let subtitle = '';
      let icon: 'check' | 'dollar' | 'calendar' = 'check';

      // Get property information if available
      const property = transaction.properties;
      const propertyName = property?.title || 'Unknown Property';
      const sharePrice = property?.share_price;

      switch (transaction.transaction_type) {
        case 'investment':
          title = `Investment of ₹${transaction.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} confirmed`;
          if (property && sharePrice) {
            subtitle = `${propertyName} • Share price: ₹${sharePrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
          } else if (property) {
            subtitle = propertyName;
          }
          icon = 'check';
          break;
        case 'dividend':
          title = `Received dividend of ₹${transaction.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
          if (property) {
            subtitle = `From ${propertyName}`;
          }
          icon = 'dollar';
          break;
        case 'deposit':
          title = `Deposited ₹${transaction.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} to wallet`;
          icon = 'check';
          break;
        case 'withdrawal':
          title = `Withdrew ₹${transaction.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} from wallet`;
          icon = 'dollar';
          break;
        case 'fee':
          title = `Platform fee of ₹${transaction.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} charged`;
          if (property) {
            subtitle = `For ${propertyName}`;
          }
          icon = 'check';
          break;
        default:
          title = `Transaction of ₹${transaction.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
          icon = 'check';
      }

      return {
        id: transaction.id,
        title,
        subtitle: subtitle || undefined,
        date: dateString,
        fullDate: date.toLocaleDateString('en-IN', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }),
        amount: transaction.amount,
        type: transaction.transaction_type,
        status: transaction.status,
        icon
      };
    });
  }, []);

  const allTransactionActivity = useMemo(() => generateActivityData(filteredAllTransactions), [generateActivityData, filteredAllTransactions]);

  const getActivityIcon = useCallback((icon: string) => {
    switch (icon) {
      case 'check':
        return <CheckCircle className="w-4 h-4 text-primary" />;
      case 'dollar':
        return <DollarSign className="w-4 h-4 text-success" />;
      case 'calendar':
        return <Calendar className="w-4 h-4 text-secondary" />;
      default:
        return <Activity className="w-4 h-4 text-muted-foreground" />;
    }
  }, []);

  const handleTransactionClick = useCallback((transactionId: string) => {
    const transaction = transactions.find(t => t.id === transactionId) || 
                      allTransactions.find(t => t.id === transactionId);
    if (transaction) {
      setSelectedTransaction(transaction);
      setIsTransactionModalOpen(true);
    }
  }, [transactions, allTransactions]);

  // All useEffect hooks
  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
      return;
    }
    
    if (!user || !profile) {
      return;
    }

    // Admin users can always access dashboard regardless of tier/subscription
    if (isAdmin) {
      return;
    }

    // Simple routing logic based on user tier
    if (profile.tier === 'waitlist_player' && profile.subscription_active) {
      navigate('/waitlist-dashboard');
      return;
    }
    
    // Explorer tier users
    if (profile.tier === 'explorer') {
      if (!profile.subscription_active) {
        // Check if trial has expired for unpaid explorer users
        if (profile.trial_expires_at) {
          const trialExpires = new Date(profile.trial_expires_at);
          const now = new Date();
          
          if (now > trialExpires) {
            navigate('/trial-expired');
            return;
          }
        }
        navigate('/welcome');
        return;
      }
      // Paid explorer users can access dashboard
    }
    
    // Investor tier users (both small and large investors) can always access dashboard
    if (profile.tier === 'small_investor' || profile.tier === 'large_investor') {
      return;
    }

    // If we reach here, user should be on dashboard (paid explorer, waitlist player, or investor)
  }, [user, profile, loading, navigate, isAdmin]);

  useEffect(() => {
    if (user) {
      fetchAllData();
    }
  }, [user, fetchAllData]);

  // Early return for loading - after all hooks are declared
  if (loading || dataLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 hero-gradient rounded-xl flex items-center justify-center mx-auto mb-4">
            <BarChart3 className="w-7 h-7 text-white animate-pulse" />
          </div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <GlobalHeader 
        title="EquityLeap" 
        subtitle="Premium Dashboard"
      >
        <Button 
          className="bg-primary text-primary-foreground hover:bg-primary/90"
          size="sm"
          onClick={() => navigate('/properties')}
        >
          <Plus className="w-4 h-4 mr-2" />
          New Investment
        </Button>
      </GlobalHeader>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Premium Dashboard
          </h1>
          <p className="text-muted-foreground">
            Welcome back, {profile?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'User'}. Your exclusive features are now unlocked.
          </p>
        </div>

        {/* Stats Cards - Row 1: Investment Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Investment Value</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">₹{dashboardMetrics.totalInvestmentValue.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
              <div className="text-xs text-muted-foreground mt-1">Original amount invested</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Current Value</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">₹{dashboardMetrics.currentMarketValue.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
              <div className={`flex items-center text-xs mt-1 ${dashboardMetrics.currentMarketValue >= dashboardMetrics.totalInvestmentValue ? 'text-green-600' : 'text-red-600'}`}>
                <TrendingUp className="w-3 h-3 mr-1" />
                {dashboardMetrics.totalInvestmentValue > 0 
                  ? `${dashboardMetrics.currentMarketValue >= dashboardMetrics.totalInvestmentValue ? '+' : ''}${(((dashboardMetrics.currentMarketValue - dashboardMetrics.totalInvestmentValue) / dashboardMetrics.totalInvestmentValue) * 100).toFixed(1)}%`
                  : 'Current market value'
                }
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Lifetime Returns</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${dashboardMetrics.lifetimeReturns >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {dashboardMetrics.lifetimeReturns >= 0 ? '+' : ''}₹{dashboardMetrics.lifetimeReturns.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </div>
              <div className="text-xs text-muted-foreground mt-1">Capital gains/losses</div>
            </CardContent>
          </Card>
        </div>

        {/* Stats Cards - Row 2: Wallet & Properties */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card className="hero-gradient p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/80 mb-1">Wallet Balance</p>
                <p className="text-3xl font-bold text-white">
                  ₹{escrowBalance?.available_balance?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                </p>
              </div>
              <div className="w-16 h-16 bg-white/20 rounded-lg flex items-center justify-center">
                <Wallet className="w-8 h-8 text-white" />
              </div>
            </div>
            <div className="mt-4">
              <WalletActions 
                escrowBalance={escrowBalance} 
                onRequestSubmitted={fetchEscrowBalance}
              />
            </div>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Properties</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{dashboardMetrics.activeProperties}</div>
              <div className={`flex items-center text-sm mt-1 ${dashboardMetrics.monthOverMonthChanges.properties > 0 ? 'text-success' : dashboardMetrics.monthOverMonthChanges.properties < 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                <Building2 className="w-4 h-4 mr-1" />
                {dashboardMetrics.monthOverMonthChanges.properties !== 0 
                  ? `${dashboardMetrics.monthOverMonthChanges.properties > 0 ? '+' : ''}${dashboardMetrics.monthOverMonthChanges.properties} new this month`
                  : 'Properties invested in'}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts and Property Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
          {/* Investment Performance Chart */}
          <Card className="lg:col-span-3">
            <CardContent className="pt-6">
              <InvestmentPerformanceChart 
                investments={investments}
                transactions={transactions}
              />
            </CardContent>
          </Card>

          {/* Property Distribution */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Property Distribution</CardTitle>
              <CardDescription>{dashboardMetrics.activeProperties} Properties by Type</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">RESIDENTIAL</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary" 
                        style={{ 
                          width: `${dashboardMetrics.activeProperties > 0 ? (dashboardMetrics.propertyDistribution.residential / dashboardMetrics.activeProperties) * 100 : 0}%` 
                        }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium">{dashboardMetrics.propertyDistribution.residential}</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">COMMERCIAL</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-secondary" 
                        style={{ 
                          width: `${dashboardMetrics.activeProperties > 0 ? (dashboardMetrics.propertyDistribution.commercial / dashboardMetrics.activeProperties) * 100 : 0}%` 
                        }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium">{dashboardMetrics.propertyDistribution.commercial}</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">MIXED-USE</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-accent" 
                        style={{ 
                          width: `${dashboardMetrics.activeProperties > 0 ? (dashboardMetrics.propertyDistribution.mixed / dashboardMetrics.activeProperties) * 100 : 0}%` 
                        }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium">{dashboardMetrics.propertyDistribution.mixed}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* My Properties - Full Width Row */}
        <div className="mb-8">
          <MyProperties />
        </div>

        {/* Featured Properties & Recent Activity - Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Featured Properties */}
          <Card>
            <CardHeader>
              <CardTitle>Featured Properties</CardTitle>
            </CardHeader>
            <CardContent>
              {featuredProperties.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {featuredProperties.map((property) => (
                    <div key={property.id} className="space-y-2">
                      <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                        {property.images?.[0] ? (
                          <img 
                            src={property.images[0]} 
                            alt={property.title}
                            className="w-full h-full object-cover rounded-lg"
                          />
                        ) : (
                          <Building2 className="w-8 h-8 text-muted-foreground" />
                        )}
                      </div>
                      <div>
                        <h4 className="font-medium text-sm">{property.title}</h4>
                        <p className="text-xs text-muted-foreground">
                          Starting at ₹{(property.minimum_investment || property.share_price)?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No featured properties available</p>
                  <p className="text-xs text-muted-foreground">Check back later for new opportunities</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle>Recent Activity</CardTitle>
              {transactions.length > 5 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowAllTransactions(true);
                    fetchAllTransactions();
                  }}
                  className="text-xs"
                >
                  View All
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivity.length > 0 ? (
                  recentActivity.map((activity) => (
                    <div 
                      key={activity.id} 
                      className="flex items-center space-x-3 hover:bg-muted/50 p-2 rounded-lg cursor-pointer transition-colors"
                      onClick={() => handleTransactionClick(activity.id)}
                    >
                      <div className="w-8 h-8 bg-muted/50 rounded-lg flex items-center justify-center">
                        {getActivityIcon(activity.icon)}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{activity.title}</p>
                        {activity.subtitle && (
                          <p className="text-xs text-muted-foreground">{activity.subtitle}</p>
                        )}
                        <p className="text-xs text-muted-foreground">{activity.date}</p>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Click for details →
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">No recent activity</p>
                    <p className="text-xs text-muted-foreground">Your transactions will appear here</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Share Sell Requests & Watchlist - Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* My Share Sell Requests */}
          <MyShareSellRequests />

          {/* My Watchlist */}
          <MyWatchlistEnhanced />
        </div>

        {/* Transaction History Modal */}
        {showAllTransactions && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-background rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
              <div className="p-6 border-b border-border">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold">Transaction History</h2>
                    <p className="text-sm text-muted-foreground">All your investment transactions</p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <select
                      value={transactionFilter}
                      onChange={(e) => setTransactionFilter(e.target.value as any)}
                      className="px-3 py-1.5 border border-border rounded-md text-sm bg-background"
                    >
                      <option value="all">All Types</option>
                      <option value="investment">Investments</option>
                      <option value="dividend">Dividends</option>
                      <option value="deposit">Deposits</option>
                      <option value="withdrawal">Withdrawals</option>
                    </select>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowAllTransactions(false)}
                    >
                      ✕
                    </Button>
                  </div>
                </div>
              </div>
              
              <div className="p-6 max-h-[60vh] overflow-y-auto">
                {loadingAllTransactions ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                      <p className="text-sm text-muted-foreground">Loading transactions...</p>
                    </div>
                  </div>
                ) : allTransactionActivity.length > 0 ? (
                  <div className="space-y-4">
                    {allTransactionActivity.map((activity) => (
                      <div 
                        key={activity.id} 
                        className="flex items-center space-x-4 p-4 bg-muted/30 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => handleTransactionClick(activity.id)}
                      >
                        <div className="w-10 h-10 bg-background rounded-lg flex items-center justify-center border border-border">
                          {getActivityIcon(activity.icon)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">{activity.title}</p>
                              {activity.subtitle && (
                                <p className="text-sm text-muted-foreground">{activity.subtitle}</p>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="font-medium text-sm">
                                {activity.type === 'return' ? '+' : ''}₹{activity.amount?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </p>
                              <p className="text-xs text-muted-foreground">{activity.date}</p>
                            </div>
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          →
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">No transactions found</p>
                    <p className="text-xs text-muted-foreground">
                      {transactionFilter === 'all' 
                        ? "Your transactions will appear here" 
                        : `No ${transactionFilter} transactions found`}
                    </p>
                  </div>
                )}
              </div>
              
              {allTransactionActivity.length > 0 && (
                <div className="p-6 border-t border-border bg-muted/10">
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>Showing {allTransactionActivity.length} transaction{allTransactionActivity.length !== 1 ? 's' : ''}</span>
                    <span>Total: ₹{allTransactionActivity.reduce((sum, t) => sum + (t.amount || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Transaction Details Modal */}
        <TransactionDetailsModal
          transaction={selectedTransaction}
          isOpen={isTransactionModalOpen}
          onClose={() => {
            setIsTransactionModalOpen(false);
            setSelectedTransaction(null);
          }}
        />
      </div>
    </div>
  );
};

export default Dashboard;