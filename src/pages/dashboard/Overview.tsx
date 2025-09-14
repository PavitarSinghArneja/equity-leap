import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import InvestmentPerformanceChart from '@/components/InvestmentPerformanceChart';

interface InvestmentRow {
  id: string;
  property_id: string;
  shares_owned: number;
  total_investment: number;
  created_at: string;
  investment_date: string;
  properties: {
    id: string;
    title: string;
    property_type?: string | null;
    share_price: number;
  };
}

interface TransactionRow {
  id: string;
  transaction_type: string;
  amount: number;
  created_at: string;
}

const Overview: React.FC = () => {
  const { user } = useAuth();
  const [investments, setInvestments] = useState<InvestmentRow[]>([]);
  const [positions, setPositions] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const [{ data: inv }, { data: tx }, { data: pos }] = await Promise.all([
        supabase
          .from('investments')
          .select(`
            id,
            property_id,
            shares_owned,
            total_investment,
            created_at,
            investment_date,
            properties!property_id(id, title, property_type, share_price)
          `)
          .eq('user_id', user.id)
          .eq('investment_status', 'confirmed'),
        supabase
          .from('transactions')
          .select('id, transaction_type, amount, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('user_property_positions')
          .select('property_id, shares, avg_price, cost_basis, properties!property_id(property_type, share_price)')
          .eq('user_id', user.id)
      ]);
      setInvestments((inv || []) as any);
      setTransactions((tx || []) as any);
      setPositions(pos || []);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const metrics = useMemo(() => {
    if (!positions.length) {
      return { totalInvestmentValue: 0, currentMarketValue: 0, lifetimeReturns: 0 };
    }
    const totalInvestmentValue = positions.reduce((sum, p) => sum + (p.cost_basis || 0), 0);
    const currentMarketValue = positions.reduce((sum, p) => sum + (p.shares || 0) * (p.properties?.share_price || 0), 0);
    const lifetimeReturns = currentMarketValue - totalInvestmentValue;
    return { totalInvestmentValue, currentMarketValue, lifetimeReturns };
  }, [positions]);

  const distribution = useMemo(() => {
    const map = { residential: 0, commercial: 0, mixed: 0 };
    const seen = new Set<string>();
    positions.forEach((p) => {
      if (seen.has(p.property_id)) return;
      seen.add(p.property_id);
      const type = (p.properties?.property_type || '').toLowerCase();
      if (type.includes('residential') || type.includes('villa') || type.includes('apartment')) map.residential += 1;
      else if (type.includes('commercial') || type.includes('office') || type.includes('retail')) map.commercial += 1;
      else map.mixed += 1;
    });
    return map;
  }, [positions]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center text-muted-foreground">Loading…</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-4 rounded-lg border bg-card/40">
          <div className="text-xs text-muted-foreground">Total Investment Value</div>
          <div className="text-3xl font-bold">₹{metrics.totalInvestmentValue.toLocaleString('en-IN')}</div>
        </div>
        <div className="p-4 rounded-lg border bg-card/40">
          <div className="text-xs text-muted-foreground">Current Value</div>
          <div className="text-3xl font-bold">₹{metrics.currentMarketValue.toLocaleString('en-IN')}</div>
          <div className={`text-xs mt-1 ${metrics.currentMarketValue - metrics.totalInvestmentValue >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {metrics.totalInvestmentValue > 0 ? `${((metrics.currentMarketValue - metrics.totalInvestmentValue) / Math.max(metrics.totalInvestmentValue,1) * 100).toFixed(1)}%` : '—'}
          </div>
        </div>
        <div className="p-4 rounded-lg border bg-card/40">
          <div className="text-xs text-muted-foreground">Lifetime Returns</div>
          <div className={`text-3xl font-bold ${metrics.currentMarketValue - metrics.totalInvestmentValue >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {(metrics.currentMarketValue - metrics.totalInvestmentValue) >= 0 ? '+' : ''}₹{(metrics.currentMarketValue - metrics.totalInvestmentValue).toLocaleString('en-IN')}
          </div>
        </div>
      </div>

      {/* Chart */}
      <Card>
        <CardContent className="pt-6">
          <InvestmentPerformanceChart investments={investments as any} transactions={transactions as any} />
        </CardContent>
      </Card>

      {/* Property Distribution below chart */}
      <Card>
        <CardHeader>
          <CardTitle>Property Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">RESIDENTIAL</span>
              <div className="flex items-center space-x-2">
                <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-2 bg-primary" style={{ width: `${Math.min(100, distribution.residential * 25)}%` }} />
                </div>
                <span className="text-sm font-medium">{distribution.residential}</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">COMMERCIAL</span>
              <div className="flex items-center space-x-2">
                <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-2 bg-secondary" style={{ width: `${Math.min(100, distribution.commercial * 25)}%` }} />
                </div>
                <span className="text-sm font-medium">{distribution.commercial}</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">MIXED</span>
              <div className="flex items-center space-x-2">
                <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-2 bg-accent" style={{ width: `${Math.min(100, distribution.mixed * 25)}%` }} />
                </div>
                <span className="text-sm font-medium">{distribution.mixed}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Overview;
