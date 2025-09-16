import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/NewAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExternalLink, TrendingDown } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import ShareSellDialog from '@/components/ShareSellDialog';
import ShareMarketplace from '@/components/ShareMarketplace';

interface Property {
  id: string;
  title: string;
  city: string;
  country: string;
  share_price: number;
  property_status: string | null;
  shares_sellable?: boolean | null;
  images?: string[] | null;
}

interface UserInvestment {
  id: string;
  shares_owned: number;
  price_per_share: number;
  total_investment: number;
  lots?: Array<{
    shares_owned: number;
    price_per_share: number;
    total_investment: number;
  }>;
}

interface SnapshotPosition {
  shares: number;
  avg_price: number;
  cost_basis: number;
}

const PropertyDetailPage: React.FC = () => {
  const { propertyId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [property, setProperty] = useState<Property | null>(null);
  const [investment, setInvestment] = useState<UserInvestment | null>(null);
  const [snapshot, setSnapshot] = useState<SnapshotPosition | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user || !propertyId) return;
    try {
      setLoading(true);
      const { data: p } = await supabase
        .from('properties')
        .select('id, title, city, country, share_price, property_status, shares_sellable, images')
        .eq('id', propertyId)
        .single();
      setProperty(p as any);

      // Debug: Check current session and token
      const session = await supabase.auth.getSession();
      console.log('🔍 Debug - Current session:', {
        user_id: user.id,
        property_id: propertyId,
        session_exists: !!session.data.session,
        access_token_length: session.data.session?.access_token?.length || 'no token',
        token_preview: session.data.session?.access_token?.substring(0, 50) + '...'
      });

      const { data: invRows, error: invError } = await supabase
        .from('investments')
        .select('id, shares_owned, price_per_share, total_investment, investment_date')
        .eq('user_id', user.id)
        .eq('property_id', propertyId)
        .eq('investment_status', 'confirmed')
        .order('investment_date', { ascending: true }); // FIFO: oldest first

      if (invError) {
        console.error('🚨 Investment query error:', invError);
      }
      if (invRows && invRows.length) {
        const totals = invRows.reduce((acc, r) => {
          acc.shares += r.shares_owned || 0;
          acc.total += r.total_investment || 0;
          return acc;
        }, { shares: 0, total: 0 });
        const avg = totals.shares > 0 ? totals.total / totals.shares : 0;
        setInvestment({ id: invRows[0].id, shares_owned: totals.shares, total_investment: totals.total, price_per_share: avg, lots: invRows });
      } else {
        setInvestment(null);
      }

      const { data: tx } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .eq('property_id', propertyId)
        .order('created_at', { ascending: false });
      setTransactions(tx || []);

      // Snapshot from user_property_positions table
      try {
        const { data: snap } = await supabase
          .from('user_property_positions')
          .select('shares, avg_price, cost_basis')
          .eq('user_id', user.id)
          .eq('property_id', propertyId)
          .maybeSingle();
        if (snap) {
          setSnapshot({
            shares: Number(snap.shares) || 0,
            avg_price: Number(snap.avg_price) || 0,
            cost_basis: Number(snap.cost_basis) || 0,
          });
        } else {
          setSnapshot(null);
        }
      } catch (e) {
        console.error('Error fetching position snapshot:', e);
        setSnapshot(null);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [user, propertyId]);

  useEffect(() => { load(); }, [load]);

  const pnl = useMemo(() => {
    if (!property) return null;
    const shares = investment?.shares_owned || 0;
    const totalInv = investment?.total_investment || 0;
    const currentValue = shares * property.share_price;
    const diff = currentValue - totalInv;
    const pct = totalInv > 0 ? (diff / totalInv) * 100 : 0;
    return { diff, pct, currentValue };
  }, [investment, property]);

  const txAnalysis = useMemo(() => {
    // Compute running average and shares for this property's user transactions
    const asc = [...transactions].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    let avg = 0; // start from zero and derive fully from transactions
    let shares = 0; // running shares after each transaction
    let cost = 0; // running cost basis = avg * shares

    const withCalc = asc.map((t) => {
      const type = t.transaction_type as string;
      const desc: string = t.description || '';
      const match = desc.match(/(\d+)\s+shares/i);
      const qty = match ? parseInt(match[1]) : 0;
      const amount: number = t.amount || 0;
      const pricePerShare = qty > 0 ? amount / qty : 0;
      const prevAvg = avg;
      const prevShares = shares;

      if (type === 'investment' || type === 'share_purchase') {
        // Buy
        const totalCost = cost + pricePerShare * qty;
        const newShares = shares + qty;
        const newAvg = newShares > 0 ? totalCost / newShares : 0;
        shares = newShares;
        avg = newAvg;
        cost = totalCost;
        const unrealized = ((property?.share_price || 0) - avg) * shares; // P&L on current position after this trade
        return { ...t, _qty: qty, _pps: pricePerShare, _avg: avg, _verb: 'Bought', _unrealized: unrealized, _realized: 0 };
      } else if (type === 'share_sale') {
        // Sell (average stays the same)
        const sellQty = Math.min(qty, shares);
        shares = Math.max(0, shares - sellQty);
        const realized = (pricePerShare - prevAvg) * sellQty; // realized on this sale
        cost = avg * shares; // reduce cost basis by prevAvg * sellQty
        const unrealized = ((property?.share_price || 0) - avg) * shares; // remaining position
        return { ...t, _qty: sellQty, _pps: pricePerShare, _avg: avg, _verb: 'Sold', _unrealized: unrealized, _realized: realized };
      }
      // Other types
      const unrealized = (property?.share_price || 0 - avg) * shares;
      return { ...t, _qty: qty, _pps: pricePerShare, _avg: avg, _verb: null, _unrealized: unrealized, _realized: 0 };
    });

    // Return in original (desc) order
    const byIdToCalc = new Map(withCalc.map((x) => [x.id, x]));
    const lines = transactions.map((t) => byIdToCalc.get(t.id) || t);
    const final = {
      avg,
      shares,
      cost,
      currentValue: shares * (property?.share_price || 0),
      pnl: (shares * (property?.share_price || 0)) - cost,
    };
    return { lines, final };
  }, [transactions, property?.share_price]);

  // Position used across the card with FIFO-based P&L calculation
  const position = useMemo(() => {
    // Prefer persisted snapshot if available
    if (snapshot && (snapshot.shares || 0) >= 0) {
      const shares = snapshot.shares || 0;
      const avg = snapshot.avg_price || 0;
      const cost = snapshot.cost_basis || (shares * avg);
      const currentValue = shares * (property?.share_price || 0);
      const pnl = currentValue - cost;
      return { shares, avg, cost, currentValue, pnl };
    }
    // Else use transaction-derived analysis
    if (txAnalysis.final.shares >= 0) {
      return txAnalysis.final;
    }
    // FIFO-based calculation for investments
    if (investment) {
      const shares = investment.shares_owned || 0;
      const cost = investment.total_investment || 0;
      const avg = shares > 0 ? cost / shares : 0;
      const currentValue = shares * (property?.share_price || 0);

      // FIFO P&L Calculation
      // For unrealized P&L, we calculate based on all held shares at their purchase prices
      let pnl = 0;
      if (investment.lots && investment.lots.length > 0) {
        // Sort lots by purchase date (assuming they're in chronological order from DB)
        // In FIFO, we keep the oldest lots and their cost basis
        pnl = investment.lots.reduce((total, lot) => {
          const lotShares = lot.shares_owned || 0;
          const lotPricePerShare = lot.price_per_share || 0;
          const lotCurrentValue = lotShares * (property?.share_price || 0);
          const lotCost = lotShares * lotPricePerShare;
          return total + (lotCurrentValue - lotCost);
        }, 0);
      } else {
        // Fallback to simple calculation
        pnl = currentValue - cost;
      }

      return { shares, avg, cost, currentValue, pnl };
    }
    return { shares: 0, avg: 0, cost: 0, currentValue: 0, pnl: 0 };
  }, [snapshot, txAnalysis.final, investment, property?.share_price]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-muted-foreground">Loading property...</div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-muted-foreground">Property not found</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{property.title}</h1>
          <p className="text-sm text-muted-foreground">{property.city}, {property.country}</p>
        </div>
        {/* Top-right sell button removed; actions live in the main card */}
      </div>

      <Card className="overflow-hidden">
          <div className="flex flex-col md:flex-row">
            {/* Left: Enlarged image */}
            <div className="w-full md:w-1/2 md:flex-[0_0_50%] md:shrink-0 relative overflow-hidden">
              <div className="aspect-[16/10] md:aspect-auto h-full w-full bg-muted flex items-center justify-center overflow-hidden">
                {property.images?.[0] ? (
                  <img
                    src={property.images[0]}
                    alt={property.title}
                    className="block w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full hero-gradient" />
                )}
              </div>
            </div>

            {/* Right: Stats + Actions */}
            <div className="md:w-1/2 w-full md:border-l border-border p-6 bg-card">
              <div className="space-y-6">
                <h3 className="text-lg font-semibold">Your Investment</h3>

                <div className="grid grid-cols-2 gap-6">
                  <div className="p-3 rounded-lg border bg-card/40">
                    <div className="text-xs text-muted-foreground">Shares Owned</div>
                    <div className="text-3xl font-bold">{position.shares || 0}</div>
                  </div>
                  <div className="p-3 rounded-lg border bg-card/40">
                    <div className="text-xs text-muted-foreground">Total Investment</div>
                    <div className="text-3xl font-bold">₹{(position.cost || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div>
                  </div>
                  <div className="p-3 rounded-lg border bg-card/40">
                    <div className="text-xs text-muted-foreground">Avg Share Price</div>
                    <div className="text-3xl font-bold">{`₹${(position.avg || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`}</div>
                  </div>
                  <div className="p-3 rounded-lg border bg-card/40">
                    <div className="text-xs text-muted-foreground">Current Share Price</div>
                    <div className="text-3xl font-bold">₹{(property.share_price || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div>
                  </div>
                  <div className="p-3 rounded-lg border bg-card/40">
                    <div className="text-xs text-muted-foreground">Current Value</div>
                    <div className="text-3xl font-bold">₹{(position.currentValue || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div>
                  </div>
                  <div className="p-3 rounded-lg border bg-card/40">
                    <div className="text-xs text-muted-foreground">P&L</div>
                    <div className={`text-3xl font-bold ${position.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {position.pnl >= 0 ? '+' : ''}₹{(position.pnl || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                      <span className="text-sm ml-1">
                        ({position.cost > 0 ? (((position.currentValue - position.cost) / position.cost) * 100).toFixed(1) : '0.0'}%)
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6 pt-1">
                  <div>
                    <Button
                      onClick={() => navigate(`/invest/${property.id}`)}
                      className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-bold"
                      size="lg"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      View Property Details
                    </Button>
                  </div>

                  {(() => {
                    const ownsShares = (position.shares || 0) > 0;
                    const sellingEnabled = !!property.shares_sellable;

                    if (ownsShares && sellingEnabled) {
                      return (
                        <div>
                          <ShareSellDialog
                            property={{ id: property.id, title: property.title, share_price: property.share_price, city: property.city, country: property.country }}
                            userShares={position.shares}
                            userInvestment={{ price_per_share: position.avg, total_investment: position.cost }}
                            buttonSize="lg"
                            buttonVariant="outline"
                            buttonClassName="w-full font-bold"
                          />
                        </div>
                      );
                    }

                    const tooltipMsg = !ownsShares
                      ? 'You do not own any shares in this property to sell.'
                      : 'Share selling is currently disabled by admin for this property.';

                    return (
                      <div>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="w-full inline-block">
                              <Button
                                variant="outline"
                                size="lg"
                                aria-disabled
                                className="w-full text-red-600 border-red-200 hover:bg-white hover:text-red-600 hover:border-red-200 opacity-70 cursor-not-allowed font-bold focus-visible:ring-0"
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                              >
                                <TrendingDown className="w-4 h-4 mr-2" />
                                Sell Shares
                              </Button>
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>{tooltipMsg}</TooltipContent>
                        </Tooltip>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Available Shares for Purchase (This Property)</CardTitle>
        </CardHeader>
        <CardContent>
          <ShareMarketplace propertyId={property.id} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your Transactions for this Property</CardTitle>
        </CardHeader>
        <CardContent>
          {txAnalysis.lines.length === 0 ? (
            <div className="text-muted-foreground py-6">No transactions for this property yet.</div>
          ) : (
            <div className="divide-y">
              {txAnalysis.lines.map((t: any) => {
                const verb = t._verb;
                const qty = t._qty as number;
                const pps = t._pps as number;
                const line = verb && qty > 0
                  ? `${verb} ${qty} shares @ ₹${pps.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
                  : t.transaction_type.replace('_', ' ');
                const avgText = `Avg price now: ₹${(t._avg || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
                const realized = t._realized || 0;
                const realizedText = t._verb === 'Sold' ? ` • Realized: ₹${realized.toLocaleString('en-IN', { maximumFractionDigits: 2 })}` : '';
                return (
                  <div key={t.id} className="py-3 flex items-center justify-between">
                    <div>
                      <div className="font-medium">{line}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(t.created_at).toLocaleString('en-IN')} • {avgText}{realizedText}
                      </div>
                    </div>
                    <div className="font-semibold">₹{(t.amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PropertyDetailPage;
