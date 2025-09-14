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
    // Build day-wise cumulative value using events (buys/sells/dividends)
    const earliestDate = new Date(
      investments.reduce((min, inv) => {
        const d = new Date(inv.investment_date || inv.created_at).getTime();
        return Math.min(min, d);
      }, Date.now())
    );

    const today = new Date();
    const deltasByDay = new Map<string, number>();

    const toKey = (d: Date) => d.toISOString().slice(0, 10);

    // Investment buys (use cash invested)
    for (const inv of investments) {
      const d = new Date(inv.investment_date || inv.created_at);
      const k = toKey(d);
      deltasByDay.set(k, (deltasByDay.get(k) || 0) + (inv.total_investment || 0));
    }

    // Transactions: treat share_purchase as cash in, share_sale as cash out, dividends as income (add)
    for (const tx of transactions) {
      const k = toKey(new Date(tx.created_at));
      if (tx.transaction_type === 'share_purchase' || tx.transaction_type === 'investment' || tx.transaction_type === 'deposit') {
        deltasByDay.set(k, (deltasByDay.get(k) || 0) + (tx.amount || 0));
      } else if (tx.transaction_type === 'share_sale' || tx.transaction_type === 'withdrawal' || tx.transaction_type === 'fee') {
        deltasByDay.set(k, (deltasByDay.get(k) || 0) - (tx.amount || 0));
      } else if (tx.transaction_type === 'dividend') {
        deltasByDay.set(k, (deltasByDay.get(k) || 0) + (tx.amount || 0));
      }
    }

    // Build daily cumulative series
    const data: ChartDataPoint[] = [];
    const cursor = new Date(earliestDate.getFullYear(), earliestDate.getMonth(), earliestDate.getDate());
    let cumulative = 0;
    while (cursor <= today) {
      const key = toKey(cursor);
      if (deltasByDay.has(key)) cumulative += deltasByDay.get(key)!;
      data.push({ month: key, value: cumulative, displayValue: cumulative });
      cursor.setDate(cursor.getDate() + 1);
    }

    // Trend: last 7 days
    const last = data.slice(-7);
    const trend = last.length >= 2 && last[last.length - 1].value > last[0].value ? 'up' :
                  last.length >= 2 && last[last.length - 1].value < last[0].value ? 'down' : 'neutral';

    const totalInvested = data.length ? data[data.length - 1].value : 0;
    const currentValue = totalInvested; // In this proxy series, cumulative value equals net value over time
    const totalReturn = 0; // Not computed here; tiles above show accurate P&L using snapshots
    const percentageReturn = 0;

    return {
      data,
      totalInvested,
      currentValue,
      totalReturn,
      percentageReturn,
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

  // Generate SVG path for the line chart (line only)
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

  // We intentionally remove the area fill for a clean line-only chart

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
    <div className="h-72">
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
      <div className="relative h-48 bg-gradient-to-b from-muted/10 to-muted/30 rounded-lg p-4 border border-border">
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
          <rect width="100%" height="100%" fill="url(#grid)" opacity="0.6" />

          {/* Line */}
          <path 
            d={pathData}
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-primary"
          />
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
