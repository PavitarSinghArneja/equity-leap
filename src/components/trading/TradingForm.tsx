import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/NewAuthContext';
import { TrendingDown, Wallet, AlertCircle, Tag } from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@/utils/logger';

interface TradingFormProps {
  propertyId: string;
  currentPrice: number;
}

const TradingForm: React.FC<TradingFormProps> = ({ propertyId, currentPrice }) => {
  const { user } = useAuth();
  const [quantity, setQuantity] = useState<string>('');
  const [price, setPrice] = useState<string>(currentPrice.toString());
  const [userShares, setUserShares] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchUserShares();
    }
  }, [user, propertyId]);

  useEffect(() => {
    setPrice(currentPrice.toString());
  }, [currentPrice]);

  const fetchUserShares = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('investments')
        .select('shares_owned')
        .eq('user_id', user.id)
        .eq('property_id', propertyId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      setUserShares(data?.shares_owned || 0);
    } catch (error) {
      logger.error('Error fetching user shares:', error);
    }
  };

  const handleSubmitSellOrder = async () => {
    if (!user || !quantity || !price) {
      toast.error('Please fill in all fields');
      return;
    }

    const qty = parseInt(quantity);
    const priceValue = parseFloat(price);
    const total = qty * priceValue;

    if (qty <= 0 || priceValue <= 0) {
      toast.error('Quantity and price must be greater than 0');
      return;
    }

    if (qty > userShares) {
      toast.error('Insufficient shares to sell');
      return;
    }

    try {
      setLoading(true);

      // Create a sell request
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30); // 30 days expiry

      const { error } = await supabase
        .from('share_sell_requests')
        .insert({
          seller_id: user.id,
          property_id: propertyId,
          shares_to_sell: qty,
          remaining_shares: qty,
          price_per_share: priceValue,
          total_amount: total,
          status: 'active',
          expires_at: expiresAt.toISOString(),
          notes: `Listed via trading platform`
        });

      if (error) throw error;

      toast.success('Shares Listed for Sale!', {
        description: `${qty} shares listed at ${formatCurrency(priceValue)} each. Valid for 30 days.`
      });

      // Reset form
      setQuantity('');
      setPrice(currentPrice.toString());

      // Refresh user shares
      fetchUserShares();

    } catch (error) {
      logger.error('Error submitting order:', error);
      toast.error('Listing Failed', {
        description: 'Failed to list shares. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
  };

  const calculateTotal = () => {
    const qty = parseInt(quantity) || 0;
    const priceValue = parseFloat(price) || 0;
    return qty * priceValue;
  };

  const total = calculateTotal();
  const hasShares = parseInt(quantity || '0') <= userShares;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Tag className="w-5 h-5 text-orange-600" />
          List Shares for Sale
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Create a sell order and wait for buyers
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* User shares info */}
        <div className="bg-muted/50 rounded-lg p-3">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 text-muted-foreground">
              <Wallet className="w-4 h-4" />
              Your Shares
            </span>
            <span className="font-bold text-lg">{userShares.toLocaleString()}</span>
          </div>
        </div>

        {userShares === 0 && (
          <div className="bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5" />
              <div className="text-xs text-yellow-800 dark:text-yellow-200">
                You don't own any shares of this property yet. Buy shares first before listing them for sale.
              </div>
            </div>
          </div>
        )}

        {/* Quantity */}
        <div className="space-y-2">
          <Label htmlFor="sell-quantity">How many shares to sell?</Label>
          <Input
            id="sell-quantity"
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="0"
            min="1"
            max={userShares}
            step="1"
            disabled={userShares === 0}
          />
          <p className="text-xs text-muted-foreground">
            You own {userShares.toLocaleString()} shares
          </p>
        </div>

        {/* Price */}
        <div className="space-y-2">
          <Label htmlFor="sell-price">Price per share?</Label>
          <Input
            id="sell-price"
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="0.00"
            min="0"
            step="0.01"
            disabled={userShares === 0}
          />
          <p className="text-xs text-muted-foreground">
            Market Price: {formatCurrency(currentPrice)}
          </p>
        </div>

        {/* Total */}
        <div className="space-y-2">
          <Label>Total you'll receive</Label>
          <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <div className="text-3xl font-bold text-green-700 dark:text-green-400">
              {formatCurrency(total)}
            </div>
            {!hasShares && total > 0 && (
              <div className="flex items-center gap-2 mt-2 text-sm text-red-600">
                <AlertCircle className="w-4 h-4" />
                You only have {userShares.toLocaleString()} shares
              </div>
            )}
          </div>
        </div>

        {/* Submit Button */}
        <Button
          onClick={handleSubmitSellOrder}
          disabled={loading || !hasShares || !quantity || !price || userShares === 0}
          className="w-full bg-orange-600 hover:bg-orange-700 text-white"
          size="lg"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              Listing...
            </>
          ) : (
            <>
              <TrendingDown className="w-4 h-4 mr-2" />
              List for Sale
            </>
          )}
        </Button>

        {/* Info */}
        <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
          <div className="text-xs text-blue-800 dark:text-blue-200">
            <p className="font-medium mb-1">Instant Settlement:</p>
            <p>List your shares • Buyers purchase instantly • You get paid immediately</p>
            <p className="text-xs text-muted-foreground mt-2">
              Listings expire in 30 days • Cancel anytime
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TradingForm;
