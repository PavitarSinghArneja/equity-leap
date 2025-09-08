import { useMemo } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface Investment {
  id: string;
  property_id: string;
  shares_owned: number;
  price_per_share: number;
  total_investment: number;
  investment_date: string;
  created_at: string;
  properties: {
    id: string;
    title: string;
    share_price: number;
  };
}

interface Transaction {
  id: string;
  transaction_type: string;
  amount: number;
  created_at: string;
}

interface InvestmentPerformanceChartProps {
  investments: Investment[];
  transactions: Transaction[];
}

interface ChartDataPoint {
  month: string;
  value: number;
  displayValue: number;
}

const InvestmentPerformanceChart = ({ investments, transactions }: InvestmentPerformanceChartProps) => {
  const chartData = useMemo(() => {
    if (!investments.length) {
      return {
        data: [],
        totalInvested: 0,
        currentValue: 0,
        totalReturn: 0,
        percentageReturn: 0,
        trend: 'neutral' as const
      };
    }

    // Find the earliest investment date
    const earliestInvestment = investments.reduce((earliest, inv) => {
      const invDate = new Date(inv.investment_date || inv.created_at);
      const earliestDate = new Date(earliest.investment_date || earliest.created_at);
      return invDate < earliestDate ? inv : earliest;
    });

    const firstInvestmentDate = new Date(earliestInvestment.investment_date || earliestInvestment.created_at);
    
    // Generate months from first investment to now
    const months = [];
    const now = new Date();
    const startMonth = new Date(firstInvestmentDate.getFullYear(), firstInvestmentDate.getMonth(), 1);
    
    let currentMonth = new Date(startMonth);
    while (currentMonth <= now) {
      months.push({
        date: new Date(currentMonth),
        month: currentMonth.toLocaleDateString('en-US', { month: 'short' }),
        fullMonth: currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      });
      currentMonth.setMonth(currentMonth.getMonth() + 1);
    }

    // Calculate cumulative investment value and current market value over time
    const data: ChartDataPoint[] = [];
    const investmentsByMonth: Investment[] = [];

    months.forEach(({ month, date }) => {
      const monthStart = new Date(date);
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);

      // Add investments made up to this month
      const investmentsMadeByThisMonth = investments.filter(inv => {
        const invDate = new Date(inv.investment_date || inv.created_at);
        return invDate <= monthEnd;
      });

      // Calculate total invested amount up to this month
      const totalInvestedByMonth = investmentsMadeByThisMonth.reduce((sum, inv) => sum + inv.total_investment, 0);

      // Calculate current market value based on current share prices
      const currentMarketValue = investmentsMadeByThisMonth.reduce((sum, inv) => {
        const currentSharePrice = inv.properties?.share_price || inv.price_per_share || 0;
        const sharesOwned = inv.shares_owned || 0;
        const value = currentSharePrice * sharesOwned;
        return sum + (isFinite(value) ? value : 0);
      }, 0);

      // Add returns (dividends) received up to this month
      const dividendsReceivedByMonth = transactions.filter(txn => {
        const txnDate = new Date(txn.created_at);
        return txn.transaction_type === 'dividend' && txnDate <= monthEnd;
      });

      const totalDividends = dividendsReceivedByMonth.reduce((sum, txn) => sum + txn.amount, 0);

      // Total value = current market value + dividends received
      const totalPortfolioValue = currentMarketValue + totalDividends;

      // Ensure values are finite numbers
      const safePortfolioValue = isFinite(totalPortfolioValue) ? totalPortfolioValue : 0;
      
      data.push({
        month,
        value: safePortfolioValue,
        displayValue: safePortfolioValue
      });
    });

    // Calculate overall performance metrics
    const totalInvested = investments.reduce((sum, inv) => sum + inv.total_investment, 0);
    const currentMarketValue = investments.reduce((sum, inv) => {
      return sum + (inv.properties.share_price * inv.shares_owned);
    }, 0);
    const totalDividends = transactions
      .filter(txn => txn.transaction_type === 'dividend')
      .reduce((sum, txn) => sum + txn.amount, 0);
    
    const currentTotalValue = currentMarketValue + totalDividends;
    const totalReturn = currentTotalValue - totalInvested;
    const percentageReturn = totalInvested > 0 ? (totalReturn / totalInvested) * 100 : 0;
    
    // Determine trend based on last 3 months
    const lastThreeMonths = data.slice(-3);
    const trend = lastThreeMonths.length >= 2 && 
      lastThreeMonths[lastThreeMonths.length - 1].value > lastThreeMonths[0].value 
      ? 'up' : lastThreeMonths.length >= 2 && 
        lastThreeMonths[lastThreeMonths.length - 1].value < lastThreeMonths[0].value 
        ? 'down' : 'neutral';

    // Ensure we have at least one data point to prevent empty chart errors
    const safeData = data.length > 0 ? data : [{
      month: 'Current',
      value: 0,
      displayValue: 0
    }];

    return {
      data: safeData,
      totalInvested: isFinite(totalInvested) ? totalInvested : 0,
      currentValue: isFinite(currentTotalValue) ? currentTotalValue : 0,
      totalReturn: isFinite(totalReturn) ? Math.round(totalReturn * 100) / 100 : 0,
      percentageReturn: isFinite(percentageReturn) ? Math.round(percentageReturn * 10) / 10 : 0,
      trend
    };
  }, [investments, transactions]);

  if (!investments.length) {
    return (
      <div className="h-64 flex items-center justify-center bg-muted/10 rounded-lg">
        <div className="text-center">
          <TrendingUp className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No investments yet</p>
          <p className="text-xs text-muted-foreground">Your performance chart will appear here after your first investment</p>
        </div>
      </div>
    );
  }

  // Get the maximum value for scaling
  const maxValue = Math.max(...chartData.data.map(d => d.value), 1);
  const minValue = Math.min(...chartData.data.map(d => d.value), 0);
  const valueRange = maxValue - minValue || 1;

  // Generate SVG path for the line chart
  const chartWidth = 100;
  const chartHeight = 60;
  const padding = 5;

  // Ensure we have valid data points for calculation
  const dataLength = Math.max(chartData.data.length, 1);
  
  const pathData = chartData.data.map((point, index) => {
    // Prevent division by zero
    const normalizedIndex = dataLength === 1 ? 0 : index / (dataLength - 1);
    const x = normalizedIndex * (chartWidth - 2 * padding) + padding;
    const y = chartHeight - padding - ((point.value - minValue) / valueRange) * (chartHeight - 2 * padding);
    
    // Ensure coordinates are valid numbers
    const validX = isFinite(x) ? x : padding;
    const validY = isFinite(y) ? y : chartHeight - padding;
    
    return `${index === 0 ? 'M' : 'L'} ${validX} ${validY}`;
  }).join(' ');

  // Create area fill path only if we have valid path data
  const areaPath = pathData && chartData.data.length > 0 ? 
    pathData + 
    ` L ${chartWidth - padding} ${chartHeight - padding}` +
    ` L ${padding} ${chartHeight - padding} Z` : 
    `M ${padding} ${chartHeight - padding} L ${chartWidth - padding} ${chartHeight - padding} L ${padding} ${chartHeight - padding} Z`;

  const getTrendColor = () => {
    switch (chartData.trend) {
      case 'up': return 'text-green-600';
      case 'down': return 'text-red-600';
      default: return 'text-muted-foreground';
    }
  };

  const getTrendIcon = () => {
    switch (chartData.trend) {
      case 'up': return <TrendingUp className="w-4 h-4" />;
      case 'down': return <TrendingDown className="w-4 h-4" />;
      default: return <TrendingUp className="w-4 h-4" />;
    }
  };

  return (
    <div className="h-64">
      {/* Chart Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-foreground">Investment Performance</h3>
          <p className="text-sm text-muted-foreground">Last 12 Months</p>
        </div>
        <div className={`flex items-center space-x-2 ${getTrendColor()}`}>
          {getTrendIcon()}
          <span className="text-sm font-medium">
            {chartData.percentageReturn > 0 ? '+' : ''}{chartData.percentageReturn}%
          </span>
        </div>
      </div>

      {/* Chart */}
      <div className="relative h-40 bg-gradient-to-b from-background to-muted/20 rounded-lg p-4">
        <svg 
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="w-full h-full"
          preserveAspectRatio="none"
        >
          {/* Grid lines */}
          <defs>
            <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
              <path d="M 10 0 L 0 0 0 10" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-muted-foreground/20"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />

          {/* Area fill */}
          <path 
            d={areaPath}
            className="fill-primary/10"
          />

          {/* Line */}
          <path 
            d={pathData}
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-primary"
          />

          {/* Data points */}
          {chartData.data.map((point, index) => {
            // Use the same logic as for the path data
            const normalizedIndex = dataLength === 1 ? 0 : index / (dataLength - 1);
            const x = normalizedIndex * (chartWidth - 2 * padding) + padding;
            const y = chartHeight - padding - ((point.value - minValue) / valueRange) * (chartHeight - 2 * padding);
            
            // Ensure coordinates are valid numbers
            const validX = isFinite(x) ? x : padding;
            const validY = isFinite(y) ? y : chartHeight - padding;
            
            return (
              <circle
                key={index}
                cx={validX}
                cy={validY}
                r="1.5"
                className="fill-primary"
              />
            );
          })}
        </svg>

        {/* Hover tooltip area */}
        <div className="absolute inset-0 flex items-end justify-between px-4 pb-2">
          {chartData.data.map((point, index) => (
            <div key={index} className="flex flex-col items-center group cursor-pointer">
              <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-popover text-popover-foreground text-xs px-2 py-1 rounded shadow-md mb-2">
                ₹{point.displayValue.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Month labels */}
      <div className="flex justify-between text-xs text-muted-foreground mt-2 px-4">
        {chartData.data.map((point, index) => (
          <span key={index} className={index % 2 === 0 ? '' : 'opacity-50'}>
            {point.month}
          </span>
        ))}
      </div>
    </div>
  );
};

export default InvestmentPerformanceChart;