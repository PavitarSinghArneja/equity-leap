import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/NewAuthContext';
import { Wallet, ShoppingCart, AlertCircle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { TradingService } from '@/services/trading/TradingService';

interface SellListing {
  id: string;
  seller_id: string;
  property_id: string;
  shares_to_sell: number;
  remaining_shares: number | null;
  price_per_share: number;
  total_amount: number;
}

interface BuyConfirmModalProps {
  listing: SellListing | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  propertyName?: string;
}

const BuyConfirmModal: React.FC<BuyConfirmModalProps> = ({
  listing,
  isOpen,
  onClose,
  onSuccess,
  propertyName
}) => {
  const { user } = useAuth();
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [purchasing, setPurchasing] = useState(false);

  const tradingService = new TradingService();

  useEffect(() => {
    if (isOpen && user) {
      fetchWalletBalance();
    }
  }, [isOpen, user]);

  const fetchWalletBalance = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('escrow_balances')
        .select('available_balance')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      setWalletBalance(data?.available_balance || 0);
    } catch (error) {
      console.error('Error fetching wallet:', error);
      toast.error('Failed to fetch wallet balance');
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async () => {
    if (!listing || !user) return;

    const remainingShares = listing.remaining_shares ?? listing.shares_to_sell;
    const totalCost = remainingShares * listing.price_per_share;

    if (walletBalance < totalCost) {
      toast.error('Insufficient wallet balance');
      return;
    }

    try {
      setPurchasing(true);

      // Instant purchase - immediate settlement
      const result = await tradingService.instantBuyShares(listing.id, remainingShares);
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to purchase shares');
      }

      toast.success('Purchase Complete!', {
        description: `Successfully purchased ${remainingShares} shares. Shares added to your portfolio.`
      });

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Purchase error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to purchase shares';
      toast.error('Purchase Failed', {
        description: errorMessage
      });
    } finally {
      setPurchasing(false);
    }
  };

  if (!listing) return null;

  const remainingShares = listing.remaining_shares ?? listing.shares_to_sell;
  const totalCost = remainingShares * listing.price_per_share;
  const canAfford = walletBalance >= totalCost;
  const balanceAfter = walletBalance - totalCost;

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-green-600" />
            Confirm Purchase
          </DialogTitle>
          <DialogDescription>
            Review your purchase details before confirming
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Property details */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            {propertyName && (
              <div>
                <p className="text-xs text-muted-foreground">Property</p>
                <p className="font-medium">{propertyName}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-muted-foreground">Shares</p>
                <p className="text-lg font-bold">{remainingShares.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Price per Share</p>
                <p className="text-lg font-bold text-green-600">{formatCurrency(listing.price_per_share)}</p>
              </div>
            </div>

            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground">Total Cost</p>
              <p className="text-2xl font-bold">{formatCurrency(totalCost)}</p>
            </div>
          </div>

          {/* Wallet balance */}
          <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Wallet className="w-4 h-4" />
                Your Wallet
              </div>
              {loading ? (
                <div className="text-sm text-muted-foreground">Loading...</div>
              ) : (
                <div className="text-sm font-bold">{formatCurrency(walletBalance)}</div>
              )}
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">After purchase:</span>
              <span className={`font-bold ${canAfford ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(balanceAfter)}
              </span>
            </div>
          </div>

          {/* Warnings/Info */}
          {!canAfford && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Insufficient wallet balance. Please add funds to your wallet.
              </AlertDescription>
            </Alert>
          )}

          {canAfford && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Seller must approve before shares are transferred. You'll be notified when complete.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={purchasing}
          >
            Cancel
          </Button>
          <Button
            onClick={handlePurchase}
            disabled={!canAfford || purchasing || loading}
            className="bg-green-600 hover:bg-green-700"
          >
            {purchasing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Processing...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Confirm Purchase
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BuyConfirmModal;
