import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import TransactionDetailsModal from '@/components/TransactionDetailsModal';

const TransactionsPage: React.FC = () => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState<any | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const { data: transactionData, error: txError } = await supabase
        .from('transactions')
        .select('*, properties!property_id(id, title, share_price)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (txError) throw txError;

      // For investment transactions, fetch the corresponding investment record to get shares
      const enrichedTransactions = await Promise.all((transactionData || []).map(async (tx) => {
        if ((tx.transaction_type === 'investment' || tx.transaction_type === 'share_purchase') && tx.property_id) {
          // Try to find matching investment record
          const { data: investmentData } = await supabase
            .from('investments')
            .select('shares_owned')
            .eq('user_id', user.id)
            .eq('property_id', tx.property_id)
            .eq('total_investment', tx.amount)
            .single();

          if (investmentData) {
            // Add shares info to description
            tx.description = `${investmentData.shares_owned} shares`;
          }
        }
        return tx;
      }));

      setTransactions(enrichedTransactions || []);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    if (filter === 'all') return transactions;
    return transactions.filter(t => t.transaction_type === filter);
  }, [transactions, filter]);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Transactions</h1>
        <select
          className="px-3 py-2 border rounded-md bg-background"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="all">All Types</option>
          <option value="investment">Investments</option>
          <option value="dividend">Dividends</option>
          <option value="deposit">Deposits</option>
          <option value="withdrawal">Withdrawals</option>
          <option value="share_purchase">Share Purchases</option>
          <option value="share_sale">Share Sales</option>
          <option value="fee">Fees</option>
        </select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-muted-foreground">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">No transactions found</div>
          ) : (
            <div className="divide-y">
              {filtered.map((t) => {
                // Format the transaction title based on type
                let title = '';
                const property = t.properties;
                const propertyName = property?.title || 'Unknown Property';
                const description = t.description || '';
                const sharesMatch = description.match(/(\d+)\s+shares/i);
                const shares = sharesMatch ? parseInt(sharesMatch[1]) : null;

                switch (t.transaction_type) {
                  case 'investment':
                  case 'share_purchase':
                    if (shares && property) {
                      const pricePerShare = t.amount / shares;
                      title = `Bought ${shares} shares of ${propertyName} @ ₹${pricePerShare.toFixed(2)}`;
                    } else {
                      title = `Investment • ${propertyName}`;
                    }
                    break;
                  case 'share_sale':
                    if (shares && property) {
                      const pricePerShare = t.amount / shares;
                      title = `Sold ${shares} shares of ${propertyName} @ ₹${pricePerShare.toFixed(2)}`;
                    } else {
                      title = `Share Sale • ${propertyName}`;
                    }
                    break;
                  case 'dividend':
                    title = `Dividend from ${propertyName}`;
                    break;
                  case 'deposit':
                    title = 'Wallet Deposit';
                    break;
                  case 'withdrawal':
                    title = 'Wallet Withdrawal';
                    break;
                  case 'fee':
                    title = `Platform Fee • ${propertyName}`;
                    break;
                  default:
                    title = `${t.transaction_type.replace('_', ' ')} • ${propertyName}`;
                }

                return (
                  <button
                    key={t.id}
                    className="w-full text-left py-3 hover:bg-muted/40 px-2 rounded"
                    onClick={() => setSelected(t)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{title}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(t.created_at).toLocaleString('en-IN')}
                        </div>
                      </div>
                      <div className="font-semibold">
                        ₹{t.amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <TransactionDetailsModal
        transaction={selected}
        isOpen={!!selected}
        onClose={() => setSelected(null)}
      />
    </div>
  );
};

export default TransactionsPage;

