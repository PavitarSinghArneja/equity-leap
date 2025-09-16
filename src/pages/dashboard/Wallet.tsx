import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/NewAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Wallet as WalletIcon } from 'lucide-react';
import WalletActions from '@/components/WalletActions';

interface EscrowBalance {
  available_balance: number;
  pending_balance: number;
  total_invested: number;
  total_returns: number;
}

const WalletPage: React.FC = () => {
  const { user } = useAuth();
  const [balance, setBalance] = useState<EscrowBalance | null>(null);
  const [positions, setPositions] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('escrow_balances')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      setBalance(data as any);

      // Fetch consolidated positions from Supabase snapshot for accuracy
      const { data: pos } = await supabase
        .from('user_property_positions')
        .select(`
          property_id,
          shares,
          avg_price,
          cost_basis,
          properties!property_id(share_price)
        `)
        .eq('user_id', user.id);
      setPositions(pos || []);
    };
    load();
  }, [user]);

  const metrics = useMemo(() => {
    if (!positions || positions.length === 0) {
      return {
        totalInvestmentValue: 0,
        currentMarketValue: 0,
        lifetimeReturns: 0,
        activeProperties: 0,
      };
    }
    const totalInvestmentValue = positions.reduce((sum, p) => sum + (p.cost_basis || 0), 0);
    const currentMarketValue = positions.reduce((sum, p) => sum + (p.shares || 0) * (p.properties?.share_price || 0), 0);
    const lifetimeReturns = currentMarketValue - totalInvestmentValue;
    const activeProperties = new Set(positions.map(i => i.property_id)).size;
    return { totalInvestmentValue, currentMarketValue, lifetimeReturns, activeProperties };
  }, [positions]);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">Wallet</h1>
      <div className="grid grid-cols-1 gap-6">
        <Card className="hero-gradient p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/80 mb-1">Wallet Balance</p>
              <p className="text-3xl font-bold text-white">
                ₹{(balance?.available_balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="w-16 h-16 bg-white/20 rounded-lg flex items-center justify-center">
              <WalletIcon className="w-8 h-8 text-white" />
            </div>
          </div>
          <div className="mt-4">
            <WalletActions escrowBalance={balance} onRequestSubmitted={() => {
              // reload balance after action
              (async () => {
                if (!user) return;
                const { data } = await supabase
                  .from('escrow_balances')
                  .select('*')
                  .eq('user_id', user.id)
                  .maybeSingle();
                setBalance(data as any);
              })();
            }} />
          </div>
        </Card>
      </div>

      {/* Summary metrics styled like property page tiles */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
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
          <div className="text-xs text-muted-foreground">P&L</div>
          <div className={`text-3xl font-bold ${metrics.lifetimeReturns >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {metrics.lifetimeReturns >= 0 ? '+' : ''}₹{metrics.lifetimeReturns.toLocaleString('en-IN')}
          </div>
        </div>
        <div className="p-4 rounded-lg border bg-card/40">
          <div className="text-xs text-muted-foreground">Active Properties</div>
          <div className="text-3xl font-bold">{metrics.activeProperties}</div>
        </div>
      </div>
    </div>
  );
};

export default WalletPage;
