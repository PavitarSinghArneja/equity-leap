import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/NewAuthContext';
import {
  TrendingDown,
  Calculator,
  AlertTriangle,
  DollarSign,
  PieChart,
  Clock
} from 'lucide-react';

interface ShareSellDialogProps {
  property: {
    id: string;
    title: string;
    share_price: number;
    city?: string;
    country?: string;
  };
  userShares: number;
  userInvestment: {
    price_per_share: number;
    total_investment: number;
  };
  buttonSize?: 'sm' | 'default' | 'lg';
  buttonVariant?: 'default' | 'outline' | 'secondary' | 'ghost';
  buttonClassName?: string;
}

const ShareSellDialog: React.FC<ShareSellDialogProps> = ({
  property,
  userShares,
  userInvestment,
  buttonSize = 'sm',
  buttonVariant = 'outline',
  buttonClassName
}) => {
  const { user, addNotification } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    shares_to_sell: '',
    price_per_share: property.share_price.toString(),
    notes: ''
  });

  const sharesToSell = parseInt(formData.shares_to_sell) || 0;
  const pricePerShare = parseFloat(formData.price_per_share) || 0;
  const totalAmount = sharesToSell * pricePerShare;
  const originalValue = sharesToSell * userInvestment.price_per_share;
  const profitLoss = totalAmount - originalValue;
  const profitLossPercentage = originalValue > 0 ? ((profitLoss / originalValue) * 100) : 0;

  const handleSubmit = React.useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || sharesToSell <= 0 || sharesToSell > userShares) return;

    try {
      setLoading(true);

      // First, verify the user actually owns enough shares
      const { data: userInvestments, error: investmentError } = await supabase
        .from('investments')
        .select('shares_owned')
        .eq('user_id', user.id)
        .eq('property_id', property.id)
        .eq('investment_status', 'confirmed');

      if (investmentError) {
        console.error('Error checking user investments:', investmentError);
        throw new Error('Failed to verify share ownership');
      }

      const totalOwned = userInvestments?.reduce((sum, inv) => sum + inv.shares_owned, 0) || 0;
      if (totalOwned < sharesToSell) {
        throw new Error(`You only own ${totalOwned} shares, cannot sell ${sharesToSell} shares`);
      }

      // Calculate expiry date (30 days from now)
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 30);

      const insertData = {
        seller_id: user.id,
        property_id: property.id,
        shares_to_sell: sharesToSell,
        remaining_shares: sharesToSell,
        price_per_share: pricePerShare,
        // total_amount: removed - it's a GENERATED column (calculated by DB)
        status: 'active',
        expires_at: expiryDate.toISOString(),
        notes: formData.notes.trim() || null
      };

      console.log('Attempting to create sell request with data:', insertData);
      console.log('User owns', totalOwned, 'shares, attempting to sell', sharesToSell);

      const { data, error } = await supabase
        .from('share_sell_requests')
        .insert([insertData])
        .select()
        .single();

      if (error) {
        console.error('Database error:', error);
        throw error;
      }

      if (addNotification) {
        addNotification({
          name: "Sell Request Created",
          description: `Your request to sell ${sharesToSell} shares has been submitted`,
          icon: "CHECK_CIRCLE",
          color: "#059669",
          time: new Date().toLocaleTimeString()
        });
      }

      // Skip audit trail creation for now to avoid RLS issues
      console.log('Sell request created successfully, skipping audit trail for now');

      setFormData({
        shares_to_sell: '',
        price_per_share: property.share_price.toString(),
        notes: ''
      });
      setIsOpen(false);

    } catch (error: any) {
      console.error('Error creating sell request:', error);

      let errorMessage = "Failed to create sell request. Please try again.";

      // Provide more specific error messages
      if (error?.message) {
        if (error.message.includes('shares_to_sell_check')) {
          errorMessage = "Invalid number of shares. Please enter a valid amount.";
        } else if (error.message.includes('foreign key')) {
          errorMessage = "Property or user not found. Please refresh and try again.";
        } else if (error.message.includes('permission') || error.message.includes('row-level security')) {
          errorMessage = "Permission denied. Please contact support if this persists.";
        } else if (error.code === '42501') {
          errorMessage = "Database permission error. Please contact support.";
        } else {
          errorMessage = `Error: ${error.message}`;
        }
      }

      if (addNotification) {
        addNotification({
          name: "Request Failed",
          description: errorMessage,
          icon: "ALERT_TRIANGLE",
          color: "#DC2626",
          time: new Date().toLocaleTimeString()
        });
      }
    } finally {
      setLoading(false);
    }
  }, [user, sharesToSell, userShares, property.id, property.share_price, pricePerShare, totalAmount, formData.notes, addNotification]);

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant={buttonVariant}
          size={buttonSize}
          className={`text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 ${buttonClassName || ''}`}
        >
          <TrendingDown className="w-4 h-4 mr-2" />
          Sell Shares
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-red-600" />
            Sell Property Shares
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Property Info */}
          <div className="bg-muted/50 rounded-lg p-3">
            <h4 className="font-medium text-sm">{property.title}</h4>
            {property.city && (
              <p className="text-xs text-muted-foreground">{property.city}, {property.country}</p>
            )}
            <div className="flex items-center gap-4 mt-2 text-xs">
              <span>You own: <strong>{userShares} shares</strong></span>
              <span>Current price: <strong>{formatCurrency(property.share_price)}</strong></span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="shares_to_sell">Shares to Sell</Label>
                <Input
                  id="shares_to_sell"
                  type="number"
                  min="1"
                  max={userShares}
                  value={formData.shares_to_sell}
                  onChange={(e) => setFormData(prev => ({ ...prev, shares_to_sell: e.target.value }))}
                  placeholder="0"
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Max: {userShares} shares
                </p>
              </div>

              <div>
                <Label htmlFor="price_per_share">Price per Share</Label>
                <Input
                  id="price_per_share"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={formData.price_per_share}
                  onChange={(e) => setFormData(prev => ({ ...prev, price_per_share: e.target.value }))}
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Current: {formatCurrency(property.share_price)}
                </p>
              </div>
            </div>

            <div>
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Any additional information for buyers..."
                rows={2}
              />
            </div>

            {/* Transaction Summary */}
            {sharesToSell > 0 && (
              <div className="border rounded-lg p-3 bg-muted/30">
                <h5 className="font-medium text-sm mb-2 flex items-center gap-2">
                  <Calculator className="w-4 h-4" />
                  Transaction Summary
                </h5>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Shares selling:</span>
                    <span>{sharesToSell}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Price per share:</span>
                    <span>{formatCurrency(pricePerShare)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-medium">
                    <span>Total amount:</span>
                    <span>{formatCurrency(totalAmount)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span>Original investment:</span>
                    <span>{formatCurrency(originalValue)}</span>
                  </div>
                  <div className={`flex justify-between text-xs font-medium ${
                    profitLoss >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    <span>{profitLoss >= 0 ? 'Profit:' : 'Loss:'}</span>
                    <span>
                      {formatCurrency(Math.abs(profitLoss))} 
                      ({profitLossPercentage >= 0 ? '+' : ''}{profitLossPercentage.toFixed(2)}%)
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Warning */}
            <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-yellow-800">
                <p className="font-medium mb-1">Important:</p>
                <ul className="space-y-1">
                  <li>• Your sell request will be active for 30 days</li>
                  <li>• Other investors can buy your shares at your listed price</li>
                  <li>• You can cancel the request anytime before it's purchased</li>
                  <li>• Transaction fees may apply</li>
                </ul>
              </div>
            </div>

            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)} className="flex-1">
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={loading || sharesToSell <= 0 || sharesToSell > userShares}
                className="flex-1"
              >
                {loading ? 'Creating...' : 'Create Sell Request'}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ShareSellDialog;
