import { useState } from 'react';
import { useAuth } from '@/contexts/NewAuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Minus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { WEBHOOK_CONFIG } from '@/config/webhook';

interface WalletDialogProps {
  type: 'add' | 'withdraw';
  escrowBalance?: { available_balance: number } | null;
  onSuccess?: () => void;
  children: React.ReactNode;
}

const WalletDialog = ({ type, escrowBalance, onSuccess, children }: WalletDialogProps) => {
  const { user, profile, addNotification } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');

  const checkKYC = () => {
    if (!profile || profile.kyc_status !== 'approved') {
      addNotification({
        name: "KYC Required",
        description: "Please complete your KYC verification before managing funds",
        icon: "ALERT_TRIANGLE",
        color: "#F59E0B",
        isLogo: true
      });
      setTimeout(() => navigate('/kyc'), 1000);
      return false;
    }
    return true;
  };

  const handleOpen = () => {
    if (checkKYC()) {
      setIsOpen(true);
    }
  };

  const handleSubmit = async () => {
    if (!user || !profile || !amount) return;

    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount < 1000) {
      addNotification({
        name: "Invalid Amount",
        description: "Please enter a valid amount (minimum ₹1,000)",
        icon: "ALERT_TRIANGLE",
        color: "#DC2626",
        isLogo: true
      });
      return;
    }

    if (type === 'withdraw' && escrowBalance && numAmount > escrowBalance.available_balance) {
      addNotification({
        name: "Insufficient Balance",
        description: `Available balance: ₹${escrowBalance.available_balance.toLocaleString()}`,
        icon: "ALERT_TRIANGLE",
        color: "#DC2626",
        isLogo: true
      });
      return;
    }

    setLoading(true);

    try {
      const ticketData = {
        user_id: user.id,
        ticket_type: type === 'add' ? 'add_funds' : 'withdraw_funds',
        subject: `${type === 'add' ? 'Add Funds' : 'Withdraw Funds'} Request - ₹${numAmount.toLocaleString()}`,
        description: description || `User requested to ${type === 'add' ? 'add funds to' : 'withdraw funds from'} their wallet.`,
        amount: numAmount,
        user_contact_info: {
          name: profile.full_name || user.email?.split('@')[0] || 'User',
          phone: profile.phone || 'Not provided',
          email: profile.email || user.email,
          request_type: type === 'add' ? 'add funds' : 'withdraw funds',
          requested_amount: numAmount,
          current_balance: escrowBalance?.available_balance || 0
        },
        priority: priority,
        status: 'open'
      };

      const { data: ticketResult, error } = await supabase
        .from('support_tickets')
        .insert([ticketData])
        .select()
        .single();

      if (error) throw error;

      // Send webhook notification
      try {
        const webhookData = {
          ticket_id: ticketResult.id,
          type: type === 'add' ? 'fund_deposit' : 'fund_withdrawal',
          user_info: {
            name: profile.full_name || user.email?.split('@')[0] || 'User',
            email: profile.email || user.email,
            phone: profile.phone || 'Not provided'
          },
          amount: numAmount,
          currency: 'INR',
          priority: priority,
          description: description,
          current_balance: escrowBalance?.available_balance || 0,
          created_at: new Date().toISOString()
        };

        const WEBHOOK_URL = WEBHOOK_CONFIG.WALLET_OPERATIONS_WEBHOOK;
        
        // Only send webhook if URL is configured
        if (WEBHOOK_URL && WEBHOOK_URL !== "YOUR_WEBHOOK_URL_HERE") {
          const webhookResponse = await fetch(WEBHOOK_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(webhookData),
            signal: AbortSignal.timeout(WEBHOOK_CONFIG.TIMEOUT)
          });

          if (!webhookResponse.ok) {
            console.error('Webhook failed:', webhookResponse.status);
          }
        }
      } catch (webhookError) {
        console.error('Webhook error:', webhookError);
        // Don't fail the whole operation if webhook fails
      }

      addNotification({
        name: "Request Submitted Successfully",
        description: "A customer support person will contact you soon",
        icon: "CHECK_CIRCLE",
        color: "#059669",
        isLogo: true
      });

      // Reset and close
      setAmount('');
      setDescription('');
      setPriority('medium');
      setIsOpen(false);

      // Notify parent after delay
      setTimeout(() => {
        onSuccess?.();
      }, 500);

    } catch (error) {
      console.error('Error creating support ticket:', error);
      addNotification({
        name: "Request Failed",
        description: "Unable to submit your request. Please try again.",
        icon: "ALERT_TRIANGLE",
        color: "#DC2626",
        isLogo: true
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild onClick={handleOpen}>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {type === 'add' ? <Plus className="w-5 h-5 text-green-600" /> : <Minus className="w-5 h-5 text-orange-600" />}
            {type === 'add' ? 'Add Funds to Wallet' : 'Withdraw Funds from Wallet'}
          </DialogTitle>
          <DialogDescription>
            Submit a request to {type === 'add' ? 'add funds to' : 'withdraw funds from'} your investment wallet. Our team will contact you to complete the process securely.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {escrowBalance && (
            <div className="p-3 bg-muted rounded-lg">
              <div className="text-sm text-muted-foreground">Current Available Balance</div>
              <div className="text-lg font-semibold text-foreground">
                ₹{escrowBalance.available_balance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="amount">Amount (₹)</Label>
            <Input
              id="amount"
              type="text"
              inputMode="numeric"
              placeholder="Enter amount"
              value={amount}
              onChange={(e) => {
                const value = e.target.value;
                if (value === '' || /^\d*\.?\d*$/.test(value)) {
                  setAmount(value);
                }
              }}
              className="text-base"
            />
            <p className="text-xs text-muted-foreground">
              Minimum amount: ₹1,000
              {type === 'withdraw' && escrowBalance && (
                <span> • Maximum: ₹{escrowBalance.available_balance.toLocaleString()}</span>
              )}
            </p>
          </div>

          <div className="space-y-2">
            <Label>Priority Level</Label>
            <Select value={priority} onValueChange={(value) => setPriority(value as 'low' | 'medium' | 'high')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low - Within 5-7 business days</SelectItem>
                <SelectItem value="medium">Medium - Within 2-3 business days</SelectItem>
                <SelectItem value="high">High - Within 24 hours</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Additional Details (Optional)</Label>
            <Textarea
              id="description"
              placeholder="Any specific instructions or details..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button 
              variant="outline" 
              onClick={() => setIsOpen(false)}
              className="flex-1"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              className="flex-1 bg-primary text-primary-foreground"
              disabled={loading || !amount}
            >
              {loading ? 'Submitting...' : 'Submit Request'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WalletDialog;